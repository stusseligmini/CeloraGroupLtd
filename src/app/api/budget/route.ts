import { NextRequest, NextResponse } from 'next/server';
import budgetService from '@/server/services/budgetService';
import { logger } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { BudgetSummaryResponseSchema, CreateSpendingLimitRequestSchema } from '@/lib/validation/schemas';
import { validateBody, ValidationError, validationErrorResponse, errorResponse, successResponse } from '@/lib/validation/validate';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  let userId: string | null = null;
  
  try {
    userId = await getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    const summary = await budgetService.getSpendingSummary(userId);
    const limits = await budgetService.getSpendingLimits(userId);

    // Validate response
    const validatedResponse = BudgetSummaryResponseSchema.parse({ summary, limits });

    return successResponse(validatedResponse, 200, requestId);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error fetching budget', error, { userId: userId ?? 'unknown', requestId });
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to fetch budget', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Validate request body
    const body = await validateBody(request, CreateSpendingLimitRequestSchema);

    const limit = await budgetService.createSpendingLimit(
      userId,
      body.limitType,
      body.amount,
      body.walletId,
      body.cardId,
      body.category
    );

    return successResponse({ limit }, 201, requestId);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error creating spending limit', error, { requestId });
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to create spending limit', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}


