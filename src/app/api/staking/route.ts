import { NextRequest, NextResponse } from 'next/server';
import stakingService from '@/server/services/stakingService';
import { logger } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { StakingPositionsResponseSchema, StakeRequestSchema, StakeResponseSchema } from '@/lib/validation/schemas';
import { validateBody, ValidationError, validationErrorResponse, errorResponse, successResponse } from '@/lib/validation/validate';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    const positions = await stakingService.getStakingPositions(userId);
    
    // Validate response
    const validatedResponse = StakingPositionsResponseSchema.parse({ positions });

    return successResponse(validatedResponse, 200, requestId);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error fetching staking positions', error, { requestId });
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to fetch staking positions', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Validate request body
    const body = await validateBody(request, StakeRequestSchema);

    let txHash: string;

    switch (body.blockchain) {
      case 'solana':
        // Convert hex private key to Uint8Array
        const solanaKey = new Uint8Array(Buffer.from(body.privateKey.replace('0x', ''), 'hex'));
        txHash = await stakingService.stakeSolana(userId, body.walletId, body.amount, body.validatorAddress || '', solanaKey);
        break;
      case 'ethereum':
        txHash = await stakingService.stakeEthereum(userId, body.walletId, body.amount, body.privateKey);
        break;
      case 'celo':
        txHash = await stakingService.stakeCelo(userId, body.walletId, body.amount, body.privateKey);
        break;
      default:
        return errorResponse('VALIDATION_ERROR', 'Unsupported blockchain', 400, undefined, requestId);
    }

    // Validate response
    const validatedResponse = StakeResponseSchema.parse({ success: true, txHash });

    return successResponse(validatedResponse, 200, requestId);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error staking', error, { requestId });
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to stake', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}

