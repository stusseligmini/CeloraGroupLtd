/**
 * Card Insights & Analytics API
 * AI-powered spending insights - BETTER than Revolut!
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { logError } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { CardInsightsQuerySchema, CardInsightsResponseSchema, CreateCardInsightRequestSchema, UpdateCardInsightRequestSchema, IdParamSchema } from '@/lib/validation/schemas';
import { validateQuery, validateBody, validateParams, ValidationError, validationErrorResponse, errorResponse, successResponse } from '@/lib/validation/validate';

const prisma = new PrismaClient();

/**
 * GET /api/cards/insights - Get AI-powered spending insights
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Validate query parameters
    const query = validateQuery(request, CardInsightsQuerySchema);

    // Build query
    const where: any = { userId, isDismissed: false };
    if (query.cardId) where.cardId = query.cardId;
    if (query.severity) where.severity = query.severity;

    const insights = await prisma.cardInsight.findMany({
      where,
      orderBy: [
        { severity: 'desc' }, // Critical first
        { insightDate: 'desc' },
      ],
      take: query.limit,
      skip: (query.page - 1) * query.limit,
    });

    // Map to response format
    const insightsResponse = insights.map(insight => ({
      ...insight,
      insightDate: insight.insightDate.toISOString(),
      createdAt: insight.createdAt.toISOString(),
    }));

    // Validate response
    const validatedResponse = CardInsightsResponseSchema.parse({ insights: insightsResponse });

    return successResponse(validatedResponse, 200, requestId);

  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logError('Failed to fetch insights', error);
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to fetch insights', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}

/**
 * POST /api/cards/insights - Create new insight (from AI analysis)
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Validate request body
    const body = await validateBody(request, CreateCardInsightRequestSchema);

    const insight = await prisma.cardInsight.create({
      data: {
        userId,
        cardId: body.cardId || null,
        type: body.type,
        severity: body.severity,
        title: body.title,
        description: body.description,
        recommendation: body.recommendation || null,
        amount: body.amount || null,
        category: body.category || null,
        metadata: body.metadata || null,
        insightDate: new Date(),
      },
    });

    return successResponse({ 
      insight: {
        ...insight,
        insightDate: insight.insightDate.toISOString(),
        createdAt: insight.createdAt.toISOString(),
      }
    }, 201, requestId);

  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logError('Failed to create insight', error);
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to create insight', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}

/**
 * PATCH /api/cards/insights/[id] - Mark insight as read or dismissed
 */
interface RouteContext {
  params: Promise<{ id: string }>;
}

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
    const body = await validateBody(request, UpdateCardInsightRequestSchema);

    const insight = await prisma.cardInsight.findFirst({
      where: { id, userId },
    });

    if (!insight) {
      return errorResponse('NOT_FOUND', 'Insight not found', 404, undefined, requestId);
    }

    const updated = await prisma.cardInsight.update({
      where: { id },
      data: {
        isRead: body.isRead ?? insight.isRead,
        isDismissed: body.isDismissed ?? insight.isDismissed,
      },
    });

    return successResponse({ 
      insight: {
        ...updated,
        insightDate: updated.insightDate.toISOString(),
        createdAt: updated.createdAt.toISOString(),
      }
    }, 200, requestId);

  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logError('Failed to update insight', error);
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to update insight', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}
