import { NextRequest, NextResponse } from 'next/server';
import nftService from '@/server/services/nftService';
import { logger } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { NFTListQuerySchema, NFTsResponseSchema, SyncNFTsRequestSchema } from '@/lib/validation/schemas';
import { validateQuery, validateBody, ValidationError, validationErrorResponse, errorResponse, successResponse } from '@/lib/validation/validate';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Validate query parameters
    const query = validateQuery(request, NFTListQuerySchema);

    const nfts = await nftService.getNFTsFromDatabase(
      userId,
      query.walletId
    );

    // Validate response
    const validatedResponse = NFTsResponseSchema.parse({ nfts });

    return successResponse(validatedResponse, 200, requestId);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error fetching NFTs', error, { requestId });
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to fetch NFTs', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
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
    const body = await validateBody(request, SyncNFTsRequestSchema);

    await nftService.syncNFTsToDatabase(userId, body.walletId, body.blockchain, body.address);

    return successResponse({ success: true }, 200, requestId);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error syncing NFTs', error, { requestId });
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to sync NFTs', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}

