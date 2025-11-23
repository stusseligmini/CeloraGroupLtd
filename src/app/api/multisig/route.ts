import { NextRequest, NextResponse } from 'next/server';
import multisigService from '@/server/services/multisigService';
import { logger } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { CreateMultiSigWalletRequestSchema, MultiSigWalletResponseSchema } from '@/lib/validation/schemas';
import { validateBody, ValidationError, validationErrorResponse, errorResponse, successResponse } from '@/lib/validation/validate';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Validate request body
    const body = await validateBody(request, CreateMultiSigWalletRequestSchema);

    const wallet = await multisigService.createMultiSigWallet(
      userId,
      body.blockchain,
      body.requiredSignatures,
      body.signers
    );

    // Validate response
    const validatedResponse = MultiSigWalletResponseSchema.parse(wallet);

    return successResponse({ wallet: validatedResponse }, 201, requestId);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error creating multi-sig wallet', error, { requestId });
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to create multi-sig wallet', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}


