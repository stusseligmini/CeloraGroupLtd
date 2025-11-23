import { NextRequest, NextResponse } from 'next/server';
import swapService from '@/server/services/swapService';
import { logger } from '@/lib/logger';
import { SwapQuoteRequestSchema, SwapQuoteResponseSchema } from '@/lib/validation/schemas';
import { validateBody, ValidationError, validationErrorResponse, errorResponse, successResponse } from '@/lib/validation/validate';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    // Validate request body
    const body = await validateBody(request, SwapQuoteRequestSchema);

    let quote;

    if (body.blockchain === 'solana') {
      quote = await swapService.getJupiterQuote(body.fromToken, body.toToken, body.amount);
    } else {
      // EVM chains - use 1inch
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

      quote = await swapService.get1InchQuote(chainId, body.fromToken, body.toToken, body.amount);
    }

    // Validate response
    const validatedQuote = SwapQuoteResponseSchema.parse(quote);

    return successResponse({ quote: validatedQuote }, 200, requestId);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error getting swap quote', error, { requestId });
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to get quote', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}


