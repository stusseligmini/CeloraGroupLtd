/**
 * Link Telegram account to user
 * POST /api/telegram/link
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { errorResponse, successResponse } from '@/lib/validation/validate';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

/**
 * POST /api/telegram/link - Link Telegram account to user
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    const body = await request.json();
    const { telegramId, telegramUsername } = body;

    if (!telegramId) {
      return errorResponse('VALIDATION_ERROR', 'Telegram ID is required', 400, undefined, requestId);
    }

    // Check if Telegram ID is already linked to another user
    const existingLink = await prisma.user.findUnique({
      where: { telegramId: String(telegramId) },
    });

    if (existingLink && existingLink.id !== userId) {
      return errorResponse('CONFLICT', 'This Telegram account is already linked to another user', 409, undefined, requestId);
    }

    // Link Telegram account
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        telegramId: String(telegramId),
        telegramUsername: telegramUsername || null,
        telegramLinkedAt: new Date(),
      },
    });

    logger.info('Telegram account linked', {
      userId,
      telegramId: String(telegramId),
      telegramUsername,
      requestId,
    });

    return successResponse(
      {
        telegramId: updatedUser.telegramId,
        telegramUsername: updatedUser.telegramUsername,
        linkedAt: updatedUser.telegramLinkedAt,
      },
      200,
      requestId
    );
  } catch (error) {
    logger.error('Error linking Telegram account', error, { requestId });
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to link Telegram account',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
  } finally {
    await prisma.$disconnect();
  }
}

