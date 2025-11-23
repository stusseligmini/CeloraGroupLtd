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
import { ensureProvidersInitialized, getProvider, isProviderAvailable } from '@/server/services/cardIssuing/factory';
import type { CardProvider, CardDetails as ProviderCardDetails } from '@/server/services/cardIssuing/types';

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
    
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    const card = await prisma.card.findFirst({
      where: { id, userId },
    });

    if (!card) {
      return NextResponse.json(
        ApiResponseHelper.error('Card not found', 'NOT_FOUND'),
        { status: HttpStatusCode.NOT_FOUND }
      );
    }

    await ensureProvidersInitialized();

    let providerCardData: ProviderCardDetails | null = null;
    if (
      card.provider &&
      card.providerCardId &&
      isProviderAvailable(card.provider as CardProvider)
    ) {
      try {
        const provider = getProvider(card.provider as CardProvider);
        const result = await provider.getCard(card.providerCardId, userId);
        if (result.success && result.data) {
          providerCardData = result.data as ProviderCardDetails;
        }
      } catch (error) {
        logError('Failed to sync card with provider', error);
      }
    }

    const decryptedNumber = providerCardData?.cardNumber || decrypt(card.encryptedNumber);

    // Build response based on detail level
    const cardResponse: any = {
      id: card.id,
      userId: card.userId,
      walletId: card.walletId,
      nickname: providerCardData?.nickname ?? card.nickname,
      brand: providerCardData?.brand ?? card.brand,
      type: providerCardData?.type ?? card.type,
      lastFourDigits: providerCardData?.lastFourDigits ?? getLastFourDigits(decryptedNumber),
      cardholderName: providerCardData?.cardholderName ?? card.cardholderName,
      expiryMonth: providerCardData?.expiryMonth ?? card.expiryMonth,
      expiryYear: providerCardData?.expiryYear ?? card.expiryYear,
      spendingLimit: card.spendingLimit ? Number(card.spendingLimit) : null,
      dailyLimit: card.dailyLimit ? Number(card.dailyLimit) : null,
      monthlyLimit: card.monthlyLimit ? Number(card.monthlyLimit) : null,
      totalSpent: Number(card.totalSpent),
      monthlySpent: Number(card.monthlySpent),
      status: providerCardData?.status ?? card.status,
      isOnline: providerCardData?.isOnline ?? card.isOnline,
      isContactless: providerCardData?.isContactless ?? card.isContactless,
      isATM: providerCardData?.isATM ?? card.isATM,
      lastUsedAt: card.lastUsedAt?.toISOString() || null,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
      activatedAt: card.activatedAt?.toISOString() || null,
      provider: card.provider,
      providerCardId: card.providerCardId,
    };

    // CVV is NEVER retrievable (PCI DSS compliance)
    // Card number can be decrypted for authorized requests if needed for display
    // Full card number should only be shown with additional security (2FA, biometric, etc.)

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
    
    const userId = await getUserIdFromRequest(request);
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

    await ensureProvidersInitialized();

    if (
      existingCard.provider &&
      existingCard.providerCardId &&
      isProviderAvailable(existingCard.provider as CardProvider)
    ) {
      const provider = getProvider(existingCard.provider as CardProvider);
      const providerResult = await provider.updateCard(
        existingCard.providerCardId,
        userId,
        validation.data
      );
      if (!providerResult.success) {
        return NextResponse.json(
          ApiResponseHelper.error(
            providerResult.error || 'Failed to update card via provider',
            'CARD_PROVIDER_ERROR'
          ),
          { status: HttpStatusCode.BAD_GATEWAY }
        );
      }
    }

    // Update card
    const updatedCard = await prisma.card.update({
      where: { id },
      data: {
        ...validation.data,
        cancelledAt: validation.data.status === 'cancelled' ? new Date() : existingCard.cancelledAt,
        providerStatus: validation.data.status ?? existingCard.providerStatus,
        lastUsedAt: new Date(),
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
          provider: updatedCard.provider,
          providerCardId: updatedCard.providerCardId,
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
    
    const userId = await getUserIdFromRequest(request);
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

    await ensureProvidersInitialized();

    if (
      card.provider &&
      card.providerCardId &&
      isProviderAvailable(card.provider as CardProvider)
    ) {
      const provider = getProvider(card.provider as CardProvider);
      const providerResult = await provider.cancelCard(card.providerCardId, userId);
      if (!providerResult.success) {
        return NextResponse.json(
          ApiResponseHelper.error(
            providerResult.error || 'Failed to cancel card via provider',
            'CARD_PROVIDER_ERROR'
          ),
          { status: HttpStatusCode.BAD_GATEWAY }
        );
      }
    }

    // Soft delete: set status to cancelled
    await prisma.card.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        providerStatus: 'cancelled',
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
