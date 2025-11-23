/**
 * Check Telegram Link Status
 * GET /api/telegram/link/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { ApiResponseHelper, HttpStatusCode } from '@/types/api';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  let userId: string | null = null;
  try {
    userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramId: true,
        telegramUsername: true,
        telegramLinkedAt: true,
        telegramNotificationsEnabled: true,
      },
    });
    
    if (!user) {
      return NextResponse.json(
        ApiResponseHelper.error('User not found', 'NOT_FOUND'),
        { status: HttpStatusCode.NOT_FOUND }
      );
    }
    
    return NextResponse.json(
      ApiResponseHelper.success({
        linked: !!user.telegramId,
        telegramUsername: user.telegramUsername,
        linkedAt: user.telegramLinkedAt?.toISOString(),
        notificationsEnabled: user.telegramNotificationsEnabled,
      }),
      { status: HttpStatusCode.OK }
    );
    
  } catch (error) {
    logger.error('Error checking link status', error, { userId: userId ?? 'unknown' });
    return NextResponse.json(
      ApiResponseHelper.error('Failed to check status', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * Unlink Telegram Account
 * DELETE /api/telegram/link/status
 */
export async function DELETE(request: NextRequest) {
  let userId: string | null = null;
  try {
    userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }
    
    // Remove telegram link
    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramId: null,
        telegramUsername: null,
        telegramLinkedAt: null,
        telegramNotificationsEnabled: false,
      },
    });
    
    // Deactivate telegram user entries
    await prisma.telegramUser.updateMany({
      where: { userId },
      data: { isActive: false },
    });
    
    // Log the unlinking
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'telegram_unlinked',
        resource: 'telegram',
        platform: 'pwa',
        status: 'success',
      },
    });
    
    return NextResponse.json(
      ApiResponseHelper.success({ unlinked: true }),
      { status: HttpStatusCode.OK }
    );
    
  } catch (error) {
    logger.error('Error unlinking', error, { userId: userId ?? 'unknown' });
    return NextResponse.json(
      ApiResponseHelper.error('Failed to unlink', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}



