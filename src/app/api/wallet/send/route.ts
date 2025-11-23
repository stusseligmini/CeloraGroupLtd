import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { logger } from '@/lib/logger';
import { broadcastSignedTransaction } from '@/server/services/transactionService';
import { validateBody, ValidationError, validationErrorResponse, errorResponse, successResponse } from '@/lib/validation/validate';
import { checkIdempotency, storeIdempotency } from '@/lib/validation/idempotency';
import { z } from 'zod';

const prisma = new PrismaClient();

const SendTransactionRequestSchema = z.object({
  walletId: z.string().uuid(),
  blockchain: z.enum(['ethereum', 'celo', 'polygon', 'arbitrum', 'optimism', 'bitcoin', 'solana']),
  toAddress: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a valid number'),
  signedTransaction: z.string().min(1), // Signed transaction (hex for EVM, base64 for Solana)
  tokenSymbol: z.string().optional(),
  tokenAddress: z.string().optional(),
  memo: z.string().optional(),
});

/**
 * POST /api/wallet/send - Send a transaction
 * 
 * NON-CUSTODIAL: This endpoint accepts signed transactions from the client.
 * Transactions must be signed client-side before submission.
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
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
    const body = await validateBody(request, SendTransactionRequestSchema);

    // Get wallet and verify ownership
    const wallet = await prisma.wallet.findFirst({
      where: { id: body.walletId, userId },
    });

    if (!wallet) {
      return errorResponse('NOT_FOUND', 'Wallet not found', 404, undefined, requestId);
    }

    if (wallet.blockchain !== body.blockchain) {
      return errorResponse('VALIDATION_ERROR', 'Wallet blockchain mismatch', 400, undefined, requestId);
    }

    // Verify from address matches wallet
    if (wallet.address.toLowerCase() !== body.toAddress.toLowerCase() && 
        !body.signedTransaction.includes(wallet.address.toLowerCase().replace('0x', ''))) {
      logger.warn('Address mismatch in signed transaction', {
        walletAddress: wallet.address,
        requestId,
      });
    }

    // Broadcast signed transaction
    const result = await broadcastSignedTransaction({
      userId,
      walletId: body.walletId,
      blockchain: body.blockchain,
      fromAddress: wallet.address,
      toAddress: body.toAddress,
      amount: body.amount,
      tokenSymbol: body.tokenSymbol,
      tokenAddress: body.tokenAddress,
      memo: body.memo,
      signedTransaction: body.signedTransaction,
    });

    if (!result.success) {
      return errorResponse('TRANSACTION_FAILED', result.error || 'Failed to broadcast transaction', 400, undefined, requestId);
    }

    // Record transaction in database
    try {
      await prisma.transaction.create({
        data: {
          walletId: body.walletId,
          txHash: result.txHash!,
          blockchain: body.blockchain,
          fromAddress: wallet.address,
          toAddress: body.toAddress,
          amount: body.amount,
          tokenSymbol: body.tokenSymbol,
          tokenAddress: body.tokenAddress,
          status: 'pending',
          type: 'send',
          memo: body.memo,
          timestamp: new Date(),
        },
      });
    } catch (dbError) {
      logger.error('Failed to record transaction', dbError, { walletId: body.walletId, txHash: result.txHash, requestId });
      // Don't fail the request if DB write fails
    }

    // Validate response
    const validatedResponse = {
      txHash: result.txHash!,
      blockchain: body.blockchain,
      status: 'pending',
    };

    const response = successResponse(validatedResponse, 200, requestId);
    
    // Store idempotency key
    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, userId, response);
    }

    logger.info('Transaction sent successfully', {
      userId,
      walletId: body.walletId,
      txHash: result.txHash,
      blockchain: body.blockchain,
      requestId,
    });

    return response;
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error sending transaction', error, { requestId });
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

