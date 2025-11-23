import { NextRequest, NextResponse } from 'next/server';
import { broadcastSignedTransaction, getSolanaConnection } from '@/lib/solana/solanaWallet';
import { errorResponse, successResponse } from '@/lib/validation/validate';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { PrismaClient } from '@prisma/client';
import { checkIdempotency, storeIdempotency } from '@/lib/validation/idempotency';

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
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Check idempotency key
    const idempotencyCheck = await checkIdempotency(request, userId);
    if (idempotencyCheck?.cached && idempotencyCheck.response) {
      return idempotencyCheck.response;
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

    // If walletId provided, verify ownership
    if (walletId) {
      const wallet = await prisma.wallet.findFirst({
        where: { id: walletId, userId, blockchain: 'solana' },
      });

      if (!wallet) {
        return errorResponse('NOT_FOUND', 'Wallet not found', 404, undefined, requestId);
      }
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
            fromAddress: '', // Extract from signed transaction if needed
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

    const response = successResponse({
      signature: result.signature,
      slot: result.slot,
      amount: amount.toString(),
      toAddress,
      priorityLevel,
      casinoId: casinoId || null,
    }, 200, requestId);

    // Store idempotency key
    await storeIdempotency(request, response, userId);

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

