import { NextRequest, NextResponse } from 'next/server';
import swapService from '@/server/services/swapService';
import { logger } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { PrismaClient } from '@prisma/client';
import { SwapExecuteRequestSchema, SwapExecuteResponseSchema } from '@/lib/validation/schemas';
import { validateBody, ValidationError, validationErrorResponse, errorResponse, successResponse } from '@/lib/validation/validate';
import { checkIdempotency, storeIdempotency } from '@/lib/validation/idempotency';

const prisma = new PrismaClient();

/**
 * POST /api/swap - Execute a token swap
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

    // Check idempotency key (for POST requests)
    const idempotencyKey = request.headers.get('idempotency-key');
    if (idempotencyKey) {
      const idempotencyCheck = await checkIdempotency(idempotencyKey, userId);
      if (idempotencyCheck.isDuplicate && idempotencyCheck.previousResponse) {
        return NextResponse.json(idempotencyCheck.previousResponse);
      }
    }

    // Validate request body
    const body = await validateBody(request, SwapExecuteRequestSchema);

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

    // NON-CUSTODIAL: Accept signed transaction from client
    // Transaction must be signed client-side before submission
    if (!body.signedTransaction) {
      return errorResponse('VALIDATION_ERROR', 'Signed transaction is required. Transaction must be signed client-side.', 400, undefined, requestId);
    }

    let txHash: string;

    if (body.blockchain === 'solana') {
      if (!body.quoteResponse) {
        return errorResponse('VALIDATION_ERROR', 'Quote response required for Solana swaps', 400, undefined, requestId);
      }

      // Broadcast signed Solana transaction
      txHash = await swapService.broadcastSignedJupiterSwap(
        wallet.address,
        body.quoteResponse,
        body.signedTransaction // Base64 encoded signed transaction
      );
    } else {
      // EVM chains - broadcast signed transaction
      const chainIdMap: Record<string, number> = {
        ethereum: 1,
        polygon: 137,
        arbitrum: 42161,
        optimism: 10,
        celo: 42220,
      };

      const chainId = chainIdMap[body.blockchain];
      if (!chainId) {
        return errorResponse('VALIDATION_ERROR', 'Unsupported blockchain', 400, undefined, requestId);
      }

      // Broadcast signed EVM transaction
      txHash = await swapService.broadcastSigned1InchSwap(
        chainId,
        body.fromToken,
        body.toToken,
        body.amount,
        wallet.address,
        body.signedTransaction // Hex encoded signed transaction
      );
    }

    // Record transaction in database
    try {
      await prisma.transaction.create({
        data: {
          walletId: wallet.id,
          txHash,
          blockchain: body.blockchain,
          fromAddress: wallet.address,
          toAddress: wallet.address, // Swap is self-transaction
          amount: '0', // Amount handled by swap service
          status: 'pending',
          type: 'swap',
          timestamp: new Date(),
        },
      });
    } catch (dbError) {
      logger.error('Failed to record swap transaction', dbError, { walletId: body.walletId, txHash, requestId });
      // Don't fail the request if DB write fails
    }

    // Validate response
    const validatedResponse = SwapExecuteResponseSchema.parse({ txHash, blockchain: body.blockchain });

    const response = successResponse(validatedResponse, 200, requestId);
    
    // Store idempotency key for future requests
    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, userId, response);
    }

    return response;
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error executing swap', error, { requestId });
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to execute swap', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  } finally {
    await prisma.$disconnect();
  }
}

