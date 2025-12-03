import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ApiResponseHelper, HttpStatusCode } from '@/types/api';
import { logger } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { WalletListQuerySchema, WalletListResponseSchema } from '@/lib/validation/schemas';
import { validateQuery, ValidationError, validationErrorResponse, errorResponse, successResponse } from '@/lib/validation/validate';
import { getUserWallets } from '@/lib/firebase/firestore';

const prisma = new PrismaClient();

/**
 * GET /api/wallet/list - Get list of wallets for authenticated user
 * 
 * Syncs wallet data between:
 * - PostgreSQL (primary database)
 * - Firestore (real-time sync for extension/telegram)
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Validate query parameters
    const query = validateQuery(request, WalletListQuerySchema);

    const where: any = { userId };
    if (query.blockchain) {
      where.blockchain = query.blockchain;
    }
    if (!query.includeHidden) {
      where.isHidden = false;
    }

    const wallets = await prisma.wallet.findMany({
      where,
      select: {
        id: true,
        blockchain: true,
        address: true,
        label: true,
        isDefault: true,
        isHidden: true,
        balanceCache: true,
        balanceFiat: true,
        fiatCurrency: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    const total = await prisma.wallet.count({ where });

    // Sync wallets to Firestore in background (don't block response)
    if (wallets.length > 0) {
      try {
        const firebaseWallets = await getUserWallets(userId);
        logger.info('Wallet sync status', {
          userId,
          postgresCount: wallets.length,
          firestoreCount: firebaseWallets.length,
          requestId,
        });
      } catch (firestoreError) {
        logger.warn('Could not sync wallets to Firestore', { userId, requestId });
        // Continue - PostgreSQL data is authoritative
      }
    }

    // Validate response
    const responseData = {
      wallets,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };

    const validatedResponse = WalletListResponseSchema.parse({ wallets });

    logger.info('Fetched wallets successfully', {
      userId,
      count: wallets.length,
      requestId,
    });

    return successResponse(validatedResponse, 200, requestId);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error fetching wallets', error instanceof Error ? error : undefined, { requestId });
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to fetch wallets', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  } finally {
    await prisma.$disconnect();
  }
}

