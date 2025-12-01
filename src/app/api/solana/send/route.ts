export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { broadcastSignedTransaction, getSolanaConnection } from '@/lib/solana/solanaWallet';
import { errorResponse, successResponse } from '@/lib/validation/validate';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { PrismaClient } from '@prisma/client';
import { checkIdempotency, storeIdempotency } from '@/lib/validation/idempotency';
import { Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { rateLimitMiddleware, RateLimitPresets, addRateLimitHeaders } from '@/lib/security/rateLimit';
import { csrfMiddleware } from '@/lib/security/csrfProtection';

const prisma = new PrismaClient();

const SolanaSendRequestSchema = z.object({
  walletId: z.string().uuid().optional(),
  toAddress: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana address'),
  amount: z.number().positive(),
  signedTransaction: z.string().min(1), // Base64 encoded signed transaction
  priorityLevel: z.enum(['low', 'normal', 'high', 'instant']).optional().default('instant'),
  memo: z.string().optional(),
  casinoId: z.string().optional(), // Optional: casino preset ID
});

/**
 * POST /api/solana/send - Send SOL transaction
 * 
 * NON-CUSTODIAL: Accepts signed transactions from client
 * Optimized for gambling with instant confirmation
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    // SECURITY: Rate limiting in production
    if (process.env.NODE_ENV === 'production') {
      const rateLimitResult = await rateLimitMiddleware(request, RateLimitPresets.write);
      if (rateLimitResult) return rateLimitResult;
    }

    // SECURITY: CSRF protection
    const csrfResult = csrfMiddleware(request);
    if (csrfResult) return csrfResult;

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Check idempotency key
    const idempotencyKey = request.headers.get('idempotency-key');
    if (idempotencyKey) {
      const idempotencyCheck = await checkIdempotency(idempotencyKey, userId);
      if (idempotencyCheck.isDuplicate && idempotencyCheck.previousResponse) {
        return NextResponse.json(idempotencyCheck.previousResponse);
      }
    }

    // Validate request body
    const body = await request.json();
    const validation = SolanaSendRequestSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        400,
        validation.error.flatten(),
        requestId
      );
    }

    const { walletId, toAddress, amount, signedTransaction, priorityLevel, memo, casinoId } = validation.data;

    // SECURITY: Rate limiting - check transaction count in last 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentTxCount = await prisma.transaction.count({
      where: {
        wallet: { userId },
        blockchain: 'solana',
        timestamp: { gte: oneMinuteAgo },
      },
    });

    if (recentTxCount >= 10) {
      return errorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Too many transactions. Please wait a moment before sending again.',
        429,
        { limit: 10, window: '60s', count: recentTxCount },
        requestId
      );
    }

    // If walletId provided, verify ownership
    let fromAddress = '';
    if (walletId) {
      const wallet = await prisma.wallet.findFirst({
        where: { id: walletId, userId, blockchain: 'solana' },
      });

      if (!wallet) {
        return errorResponse('NOT_FOUND', 'Wallet not found', 404, undefined, requestId);
      }
      
      fromAddress = wallet.address;
    }

    // SECURITY: Verify transaction signature and amount
    try {
      const txBuffer = Buffer.from(signedTransaction, 'base64');
      const transaction = Transaction.from(txBuffer);

      // Verify signatures
      if (!transaction.verifySignatures()) {
        return errorResponse(
          'INVALID_SIGNATURE',
          'Transaction signature verification failed',
          400,
          undefined,
          requestId
        );
      }

      // Extract and verify the transfer instruction
      const transferInstruction = transaction.instructions.find(
        (ix) => ix.programId.toString() === '11111111111111111111111111111111' // System Program
      );

      if (!transferInstruction) {
        return errorResponse(
          'INVALID_TRANSACTION',
          'Transaction does not contain a valid transfer instruction',
          400,
          undefined,
          requestId
        );
      }

      // Decode lamports from instruction data
      // System Program Transfer instruction format: [type (4 bytes), lamports (8 bytes)]
      const instructionData = transferInstruction.data;
      if (instructionData.length < 12) {
        return errorResponse(
          'INVALID_TRANSACTION',
          'Invalid transfer instruction data',
          400,
          undefined,
          requestId
        );
      }

      const lamports = instructionData.readBigUInt64LE(4);
      const actualAmount = Number(lamports) / LAMPORTS_PER_SOL;

      // Verify amount matches (with small tolerance for rounding)
      if (Math.abs(actualAmount - amount) > 0.000001) {
        return errorResponse(
          'AMOUNT_MISMATCH',
          'Transaction amount does not match claimed amount',
          400,
          { claimed: amount, actual: actualAmount },
          requestId
        );
      }

      // Verify fromAddress if provided
      if (fromAddress && transaction.signatures[0].publicKey.toString() !== fromAddress) {
        return errorResponse(
          'ADDRESS_MISMATCH',
          'Transaction signer does not match wallet address',
          400,
          { expected: fromAddress, actual: transaction.signatures[0].publicKey.toString() },
          requestId
        );
      }

      logger.info('Transaction validated successfully', {
        signature: transaction.signatures[0].signature?.toString('hex'),
        amount: actualAmount,
        from: transaction.signatures[0].publicKey.toString(),
        to: transferInstruction.keys[1]?.pubkey.toString(),
        requestId,
      });
    } catch (validationError) {
      logger.error('Transaction validation failed', validationError, { requestId });
      return errorResponse(
        'TRANSACTION_VALIDATION_ERROR',
        'Failed to validate transaction',
        400,
        process.env.NODE_ENV === 'development' ? validationError : undefined,
        requestId
      );
    }

    // Broadcast signed transaction
    const connection = getSolanaConnection();
    const result = await broadcastSignedTransaction(signedTransaction, connection);

    // Record transaction in database (if walletId provided)
    if (walletId) {
      try {
        await prisma.transaction.create({
          data: {
            walletId,
            txHash: result.signature,
            blockchain: 'solana',
            fromAddress: fromAddress,
            toAddress,
            amount: amount.toString(),
            status: 'pending',
            type: casinoId ? 'casino_deposit' : 'send',
            memo: memo || (casinoId ? `Casino deposit: ${casinoId}` : null),
            timestamp: new Date(),
          },
        });
      } catch (dbError) {
        logger.error('Failed to record transaction', dbError, { walletId, txHash: result.signature, requestId });
        // Don't fail the request if DB write fails
      }
    }

    const responseData = {
      signature: result.signature,
      slot: result.slot,
      amount: amount.toString(),
      toAddress,
      priorityLevel,
      casinoId: casinoId || null,
    };
    
    const response = successResponse(responseData, 200, requestId);

    // Store idempotency key
    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, userId, responseData);
    }

    logger.info('Solana transaction sent', {
      userId,
      txHash: result.signature,
      amount,
      toAddress,
      casinoId,
      requestId,
    });

    return response;
  } catch (error) {
    logger.error('Error sending Solana transaction', error, { requestId });
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to send transaction',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
  } finally {
    await prisma.$disconnect();
  }
}

