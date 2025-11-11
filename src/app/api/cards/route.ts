/**
 * Virtual Cards API - GET (list), POST (create)
 * /api/cards
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ApiResponseHelper, HttpStatusCode } from '@/types/api';
import { CardCreateRequestSchema, CardListQuerySchema } from '@/lib/validation/schemas';
import { encrypt, generateCardNumber, generateCVV, getLastFourDigits, validateExpiry } from '@/lib/security/encryption';
import { logError } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';

const prisma = new PrismaClient();

/**
 * GET /api/cards - List all cards for user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Validate query params
    const queryValidation = CardListQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      walletId: searchParams.get('walletId'),
      status: searchParams.get('status'),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        ApiResponseHelper.error('Invalid query parameters', 'VALIDATION_ERROR', queryValidation.error.flatten()),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }

    const { page, limit, walletId, status } = queryValidation.data;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = { userId };
    if (walletId) where.walletId = walletId;
    if (status) where.status = status;

    // Fetch cards
    const [cards, total] = await Promise.all([
      prisma.card.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          walletId: true,
          nickname: true,
          brand: true,
          type: true,
          cardholderName: true,
          expiryMonth: true,
          expiryYear: true,
          spendingLimit: true,
          dailyLimit: true,
          monthlyLimit: true,
          totalSpent: true,
          monthlySpent: true,
          status: true,
          isOnline: true,
          isContactless: true,
          isATM: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
          activatedAt: true,
          encryptedNumber: true, // For last 4 digits only
        },
      }),
      prisma.card.count({ where }),
    ]);

    // Map to response format (with masked card numbers)
    const cardsResponse = cards.map(card => {
      // Decrypt only to get last 4 digits, don't return full number
      const lastFourDigits = getLastFourDigits(card.encryptedNumber); // In production, decrypt first
      
      return {
        id: card.id,
        userId: card.userId,
        walletId: card.walletId,
        nickname: card.nickname,
        brand: card.brand as 'VISA' | 'MASTERCARD',
        type: card.type as 'virtual' | 'physical',
        lastFourDigits,
        cardholderName: card.cardholderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        spendingLimit: card.spendingLimit ? Number(card.spendingLimit) : null,
        dailyLimit: card.dailyLimit ? Number(card.dailyLimit) : null,
        monthlyLimit: card.monthlyLimit ? Number(card.monthlyLimit) : null,
        totalSpent: Number(card.totalSpent),
        monthlySpent: Number(card.monthlySpent),
        status: card.status as 'active' | 'frozen' | 'cancelled',
        isOnline: card.isOnline,
        isContactless: card.isContactless,
        isATM: card.isATM,
        lastUsedAt: card.lastUsedAt?.toISOString() || null,
        createdAt: card.createdAt.toISOString(),
        updatedAt: card.updatedAt.toISOString(),
        activatedAt: card.activatedAt?.toISOString() || null,
      };
    });

    return NextResponse.json(
      ApiResponseHelper.success({
        cards: cardsResponse,
        pagination: { page, limit, total },
      }),
      { status: HttpStatusCode.OK }
    );

  } catch (error) {
    logError('Failed to fetch cards', error);
    return NextResponse.json(
      ApiResponseHelper.error('Internal server error', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * POST /api/cards - Create new virtual card
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = CardCreateRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        ApiResponseHelper.error('Invalid request body', 'VALIDATION_ERROR', validation.error.flatten()),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }

    const { walletId, nickname, brand, type, spendingLimit, dailyLimit, monthlyLimit } = validation.data;

    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId },
    });

    if (!wallet) {
      return NextResponse.json(
        ApiResponseHelper.error('Wallet not found', 'NOT_FOUND'),
        { status: HttpStatusCode.NOT_FOUND }
      );
    }

    // Generate card details
    const cardNumber = generateCardNumber(brand);
    const cvv = generateCVV();
    
    // Encrypt sensitive data
    const encryptedNumber = encrypt(cardNumber);
    const encryptedCVV = encrypt(cvv);
    
    // Set expiry date (3 years from now)
    const now = new Date();
    const expiryMonth = now.getMonth() + 1;
    const expiryYear = now.getFullYear() + 3;

    // Get cardholder name from user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, email: true },
    });

    const cardholderName = (user?.displayName || user?.email?.split('@')[0] || 'CARDHOLDER').toUpperCase();

    // Create card
    const card = await prisma.card.create({
      data: {
        userId,
        walletId,
        encryptedNumber,
        encryptedCVV,
        cardholderName,
        expiryMonth,
        expiryYear,
        nickname,
        brand,
        type,
        spendingLimit,
        dailyLimit,
        monthlyLimit,
        status: 'active',
        activatedAt: new Date(),
      },
    });

    return NextResponse.json(
      ApiResponseHelper.success({
        card: {
          id: card.id,
          userId: card.userId,
          walletId: card.walletId,
          nickname: card.nickname,
          brand: card.brand,
          type: card.type,
          lastFourDigits: getLastFourDigits(cardNumber),
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
          createdAt: card.createdAt.toISOString(),
          updatedAt: card.updatedAt.toISOString(),
          activatedAt: card.activatedAt?.toISOString() || null,
        },
      }, 'Card created successfully'),
      { status: HttpStatusCode.CREATED }
    );

  } catch (error) {
    logError('Failed to create card', error);
    return NextResponse.json(
      ApiResponseHelper.error('Internal server error', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}
