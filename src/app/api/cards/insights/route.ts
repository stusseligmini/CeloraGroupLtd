/**
 * Card Insights & Analytics API
 * AI-powered spending insights - BETTER than Revolut!
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ApiResponseHelper, HttpStatusCode } from '@/types/api';
import { logError } from '@/lib/logger';

const prisma = new PrismaClient();

/**
 * GET /api/cards/insights - Get AI-powered spending insights
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query
    const where: any = { userId };
    if (cardId) where.cardId = cardId;
    if (severity) where.severity = severity;
    where.isDismissed = false;

    const insights = await prisma.cardInsight.findMany({
      where,
      orderBy: [
        { severity: 'desc' }, // Critical first
        { insightDate: 'desc' },
      ],
      take: limit,
    });

    return NextResponse.json(
      ApiResponseHelper.success({ insights }),
      { status: HttpStatusCode.OK }
    );

  } catch (error) {
    logError('Failed to fetch insights', error);
    return NextResponse.json(
      ApiResponseHelper.error('Internal server error', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * POST /api/cards/insights - Create new insight (from AI analysis)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    const { cardId, type, severity, title, description, recommendation, amount, category, metadata } = body;

    const insight = await prisma.cardInsight.create({
      data: {
        userId,
        cardId: cardId || null,
        type,
        severity: severity || 'info',
        title,
        description,
        recommendation,
        amount,
        category,
        metadata,
        insightDate: new Date(),
      },
    });

    return NextResponse.json(
      ApiResponseHelper.success({ insight }, 'Insight created'),
      { status: HttpStatusCode.CREATED }
    );

  } catch (error) {
    logError('Failed to create insight', error);
    return NextResponse.json(
      ApiResponseHelper.error('Internal server error', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * PATCH /api/cards/insights/[id] - Mark insight as read or dismissed
 */
interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    const { isRead, isDismissed } = body;

    const insight = await prisma.cardInsight.findFirst({
      where: { id, userId },
    });

    if (!insight) {
      return NextResponse.json(
        ApiResponseHelper.error('Insight not found', 'NOT_FOUND'),
        { status: HttpStatusCode.NOT_FOUND }
      );
    }

    const updated = await prisma.cardInsight.update({
      where: { id },
      data: {
        isRead: isRead ?? insight.isRead,
        isDismissed: isDismissed ?? insight.isDismissed,
      },
    });

    return NextResponse.json(
      ApiResponseHelper.success({ insight: updated }),
      { status: HttpStatusCode.OK }
    );

  } catch (error) {
    logError('Failed to update insight', error);
    return NextResponse.json(
      ApiResponseHelper.error('Internal server error', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}
