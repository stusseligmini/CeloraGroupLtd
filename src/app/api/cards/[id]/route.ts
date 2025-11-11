/**
 * Virtual Cards API - GET (details), PATCH (update), DELETE
 * /api/cards/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ApiResponseHelper, HttpStatusCode } from '@/types/api';
import { CardUpdateRequestSchema } from '@/lib/validation/schemas';
import { decrypt, getLastFourDigits } from '@/lib/security/encryption';
import { logError } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';

const prisma = new PrismaClient();

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/cards/[id] - Get card details (including full number for authorized request)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    // Check if full details requested (requires additional auth)
    const showFullDetails = request.nextUrl.searchParams.get('full') === 'true';

    const card = await prisma.card.findFirst({
      where: { id, userId },
    });

    if (!card) {
      return NextResponse.json(
        ApiResponseHelper.error('Card not found', 'NOT_FOUND'),
        { status: HttpStatusCode.NOT_FOUND }
      );
    }

    // Build response based on detail level
    let cardResponse: any = {
      id: card.id,
      userId: card.userId,
      walletId: card.walletId,
      nickname: card.nickname,
      brand: card.brand,
      type: card.type,
      lastFourDigits: getLastFourDigits(decrypt(card.encryptedNumber)),
      cardholderName: card.cardholderName,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      spendingLimit: card.spendingLimit ? Number(card.spendingLimit) : null,
      dailyLimit: card.dailyLimit ? Number(card.dailyLimit) : null,
      monthlyLimit: card.monthlyLimit ? Number(card.monthlyLimit) : null,
      totalSpent: Number(card.totalSpent),
      monthlySpent: Number(card.monthlySpent),
      status: card.status,
      isOnline: card.isOnline,
      isContactless: card.isContactless,
      isATM: card.isATM,
      lastUsedAt: card.lastUsedAt?.toISOString() || null,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
      activatedAt: card.activatedAt?.toISOString() || null,
    };

    // Add full details if requested and authorized
    if (showFullDetails) {
      // In production: verify additional security (2FA, recent auth, etc.)
      cardResponse.cardNumber = decrypt(card.encryptedNumber);
      cardResponse.cvv = decrypt(card.encryptedCVV);
    }

    return NextResponse.json(
      ApiResponseHelper.success({ card: cardResponse }),
      { status: HttpStatusCode.OK }
    );

  } catch (error) {
    logError('Failed to fetch card details', error);
    return NextResponse.json(
      ApiResponseHelper.error('Internal server error', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * PATCH /api/cards/[id] - Update card settings
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = CardUpdateRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        ApiResponseHelper.error('Invalid request body', 'VALIDATION_ERROR', validation.error.flatten()),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }

    // Verify card belongs to user
    const existingCard = await prisma.card.findFirst({
      where: { id, userId },
    });

    if (!existingCard) {
      return NextResponse.json(
        ApiResponseHelper.error('Card not found', 'NOT_FOUND'),
        { status: HttpStatusCode.NOT_FOUND }
      );
    }

    // Update card
    const updatedCard = await prisma.card.update({
      where: { id },
      data: {
        ...validation.data,
        cancelledAt: validation.data.status === 'cancelled' ? new Date() : existingCard.cancelledAt,
      },
    });

    return NextResponse.json(
      ApiResponseHelper.success({
        card: {
          id: updatedCard.id,
          userId: updatedCard.userId,
          walletId: updatedCard.walletId,
          nickname: updatedCard.nickname,
          brand: updatedCard.brand,
          type: updatedCard.type,
          lastFourDigits: getLastFourDigits(decrypt(updatedCard.encryptedNumber)),
          cardholderName: updatedCard.cardholderName,
          expiryMonth: updatedCard.expiryMonth,
          expiryYear: updatedCard.expiryYear,
          spendingLimit: updatedCard.spendingLimit ? Number(updatedCard.spendingLimit) : null,
          dailyLimit: updatedCard.dailyLimit ? Number(updatedCard.dailyLimit) : null,
          monthlyLimit: updatedCard.monthlyLimit ? Number(updatedCard.monthlyLimit) : null,
          totalSpent: Number(updatedCard.totalSpent),
          monthlySpent: Number(updatedCard.monthlySpent),
          status: updatedCard.status,
          isOnline: updatedCard.isOnline,
          isContactless: updatedCard.isContactless,
          isATM: updatedCard.isATM,
          lastUsedAt: updatedCard.lastUsedAt?.toISOString() || null,
          createdAt: updatedCard.createdAt.toISOString(),
          updatedAt: updatedCard.updatedAt.toISOString(),
          activatedAt: updatedCard.activatedAt?.toISOString() || null,
          cancelledAt: updatedCard.cancelledAt?.toISOString() || null,
        },
      }, 'Card updated successfully'),
      { status: HttpStatusCode.OK }
    );

  } catch (error) {
    logError('Failed to update card', error);
    return NextResponse.json(
      ApiResponseHelper.error('Internal server error', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * DELETE /api/cards/[id] - Cancel card permanently
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    // Verify card belongs to user
    const card = await prisma.card.findFirst({
      where: { id, userId },
    });

    if (!card) {
      return NextResponse.json(
        ApiResponseHelper.error('Card not found', 'NOT_FOUND'),
        { status: HttpStatusCode.NOT_FOUND }
      );
    }

    // Soft delete: set status to cancelled
    await prisma.card.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json(
      ApiResponseHelper.success(null, 'Card cancelled successfully'),
      { status: HttpStatusCode.OK }
    );

  } catch (error) {
    logError('Failed to delete card', error);
    return NextResponse.json(
      ApiResponseHelper.error('Internal server error', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}
