import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { errorResponse, successResponse } from '@/lib/validation/validate';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { checkIdempotency, storeIdempotency } from '@/lib/validation/idempotency';

const prisma = new PrismaClient();

const UsernameSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-z0-9._]+$/, 'Username can only contain lowercase letters, numbers, dots, and underscores'),
});

/**
 * POST /api/username - Register username (@username.sol)
 * 
 * NON-CUSTODIAL: Maps username to Solana address for easy transfers
 * Creates the "feels custodial but isn't" magic
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Check idempotency
    const idempotencyCheck = await checkIdempotency(request, userId);
    if (idempotencyCheck?.cached && idempotencyCheck.response) {
      return idempotencyCheck.response;
    }

    const body = await request.json();
    const { username, solanaAddress } = body;

    // Validate username format
    const usernameValidation = UsernameSchema.safeParse({ username });
    if (!usernameValidation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid username format',
        400,
        usernameValidation.error.flatten(),
        requestId
      );
    }

    const validatedUsername = usernameValidation.data.username.toLowerCase();

    // Validate Solana address
    if (!solanaAddress || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(solanaAddress)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid Solana address', 400, undefined, requestId);
    }

    // Check if username is already taken
    const existing = await prisma.user.findFirst({
      where: {
        username: validatedUsername,
      },
    });

    if (existing && existing.id !== userId) {
      return errorResponse('CONFLICT', 'Username already taken', 409, undefined, requestId);
    }

    // Get user's Solana wallet
    const wallet = await prisma.wallet.findFirst({
      where: {
        userId,
        blockchain: 'solana',
        address: solanaAddress,
      },
    });

    if (!wallet) {
      return errorResponse('NOT_FOUND', 'Solana wallet not found', 404, undefined, requestId);
    }

    // Update user with username
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { username: validatedUsername },
    });

    // Store username mapping for easy lookup (cache in separate table if needed)
    // For now, username is in User table

    const response = successResponse({
      username: validatedUsername,
      address: solanaAddress,
      displayName: `@${validatedUsername}.sol`,
    }, 200, requestId);

    await storeIdempotency(request, response, userId);

    logger.info('Username registered', {
      userId,
      username: validatedUsername,
      address: solanaAddress,
      requestId,
    });

    return response;
  } catch (error) {
    logger.error('Error registering username', error, { requestId });
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to register username',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET /api/username?username=dexter - Lookup username
 * 
 * Resolves @username.sol to Solana address
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    let username = searchParams.get('username');

    if (!username) {
      return errorResponse('VALIDATION_ERROR', 'Username is required', 400, undefined, requestId);
    }

    // Remove @ and .sol suffix if present
    username = username.replace(/^@/, '').replace(/\.sol$/, '').toLowerCase();

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        wallets: {
          where: { blockchain: 'solana' },
          take: 1,
        },
      },
    });

    if (!user || !user.wallets || user.wallets.length === 0) {
      return errorResponse('NOT_FOUND', 'Username not found', 404, undefined, requestId);
    }

    const wallet = user.wallets[0];

    const response = successResponse({
      username: user.username!,
      displayName: `@${user.username}.sol`,
      address: wallet.address,
      publicKey: wallet.publicKey,
    }, 200, requestId);

    return response;
  } catch (error) {
    logger.error('Error looking up username', error, { requestId });
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to lookup username',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
  } finally {
    await prisma.$disconnect();
  }
}

