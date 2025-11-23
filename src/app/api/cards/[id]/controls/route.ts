/**
 * Advanced Card Controls API
 * BETTER than Revolut: MCC filtering, location controls, disposable cards, cashback
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { logError } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { CardControlsUpdateSchema, CardControlsMCCActionSchema, CardControlsResponseSchema, IdParamSchema } from '@/lib/validation/schemas';
import { validateBody, validateParams, ValidationError, validationErrorResponse, errorResponse, successResponse } from '@/lib/validation/validate';

const prisma = new PrismaClient();

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/cards/[id]/controls - Update advanced card controls
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const requestId = crypto.randomUUID();
  
  try {
    const params = await context.params;
    const { id } = validateParams(params, IdParamSchema);
    
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Validate request body
    const body = await validateBody(request, CardControlsUpdateSchema);

    // Verify card ownership
    const card = await prisma.card.findFirst({
      where: { id, userId },
    });

    if (!card) {
      return NextResponse.json(
        ApiResponseHelper.error('Card not found', 'NOT_FOUND'),
        { status: HttpStatusCode.NOT_FOUND }
      );
    }

    // Update controls
    const updatedCard = await prisma.card.update({
      where: { id },
      data: body,
    });

    // Validate response
    const validatedResponse = CardControlsResponseSchema.parse({
      controls: {
        allowedMCC: updatedCard.allowedMCC,
        blockedMCC: updatedCard.blockedMCC,
        allowedCountries: updatedCard.allowedCountries,
        blockedCountries: updatedCard.blockedCountries,
        cashbackRate: updatedCard.cashbackRate ? Number(updatedCard.cashbackRate) : 0.02,
        isOnline: updatedCard.isOnline,
        isContactless: updatedCard.isContactless,
        isATM: updatedCard.isATM,
      },
    });

    return successResponse(validatedResponse, 200, requestId);

  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logError('Failed to update card controls', error);
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to update card controls', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}

/**
 * GET /api/cards/[id]/controls - Get current card controls
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const requestId = crypto.randomUUID();
  
  try {
    const params = await context.params;
    const { id } = validateParams(params, IdParamSchema);
    
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    const card = await prisma.card.findFirst({
      where: { id, userId },
      select: {
        allowedMCC: true,
        blockedMCC: true,
        allowedCountries: true,
        blockedCountries: true,
        cashbackRate: true,
        isOnline: true,
        isContactless: true,
        isATM: true,
        isDisposable: true,
        autoFreezeRules: true,
      },
    });

    if (!card) {
      return errorResponse('NOT_FOUND', 'Card not found', 404, undefined, requestId);
    }

    // Validate response
    const validatedResponse = CardControlsResponseSchema.parse({
      controls: {
        allowedMCC: card.allowedMCC,
        blockedMCC: card.blockedMCC,
        allowedCountries: card.allowedCountries,
        blockedCountries: card.blockedCountries,
        cashbackRate: card.cashbackRate ? Number(card.cashbackRate) : 0.02,
        isOnline: card.isOnline,
        isContactless: card.isContactless,
        isATM: card.isATM,
        isDisposable: card.isDisposable,
        autoFreezeRules: card.autoFreezeRules,
      },
    });

    return successResponse(validatedResponse, 200, requestId);

  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logError('Failed to get card controls', error);
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to get card controls', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}

/**
 * POST /api/cards/[id]/controls/block-mcc - Quick block merchant category
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = crypto.randomUUID();
  
  try {
    const params = await context.params;
    const { id } = validateParams(params, IdParamSchema);
    
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Validate request body
    const body = await validateBody(request, CardControlsMCCActionSchema);

    const card = await prisma.card.findFirst({
      where: { id, userId },
    });

    if (!card) {
      return errorResponse('NOT_FOUND', 'Card not found', 404, undefined, requestId);
    }

    // Update MCC lists
    const updateData: any = {};
    
    if (body.action === 'block') {
      const newBlockedMCC = [...new Set([...card.blockedMCC, ...body.mccCodes])];
      updateData.blockedMCC = newBlockedMCC;
    } else if (body.action === 'allow') {
      const newAllowedMCC = [...new Set([...card.allowedMCC, ...body.mccCodes])];
      updateData.allowedMCC = newAllowedMCC;
    }

    const updatedCard = await prisma.card.update({
      where: { id },
      data: updateData,
    });

    return successResponse({
      blockedMCC: updatedCard.blockedMCC,
      allowedMCC: updatedCard.allowedMCC,
    }, 200, requestId);

  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logError('Failed to update MCC controls', error);
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to update MCC controls', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}
