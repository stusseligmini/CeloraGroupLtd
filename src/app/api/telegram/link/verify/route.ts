/**
 * Verify Telegram Account Linking
 * POST /api/telegram/link/verify
 * 
 * Called from Telegram bot when user enters verification code
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ApiResponseHelper, HttpStatusCode } from '@/types/api';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

interface VerifyRequest {
  verificationCode: string;
  telegramId: string;
  chatId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json();
    
    if (!body.verificationCode || !body.telegramId || !body.chatId) {
      return NextResponse.json(
        ApiResponseHelper.error('Missing required fields', 'VALIDATION_ERROR'),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }
    
    // Find pending verification
    const pending = await prisma.telegramUser.findFirst({
      where: {
        verificationCode: body.verificationCode,
        isActive: false,
        verificationExpiresAt: {
          gte: new Date(),
        },
      },
    });
    
    if (!pending) {
      return NextResponse.json(
        ApiResponseHelper.error('Invalid or expired verification code', 'INVALID_CODE'),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }
    
    // Update telegram user with real data
    await prisma.telegramUser.update({
      where: { id: pending.id },
      data: {
        telegramId: BigInt(body.telegramId),
        chatId: body.chatId,
        username: body.username,
        firstName: body.firstName,
        lastName: body.lastName,
        isActive: true,
        linkedAt: new Date(),
        verificationCode: null,
        verificationExpiresAt: null,
      },
    });
    
    // Update user record
    await prisma.user.update({
      where: { id: pending.userId },
      data: {
        telegramId: body.telegramId, // User.telegramId is String
        telegramUsername: body.username,
        telegramLinkedAt: new Date(),
        telegramNotificationsEnabled: true,
      },
    });
    
    // Log the linking
    await prisma.auditLog.create({
      data: {
        userId: pending.userId,
        action: 'telegram_linked',
        resource: 'telegram',
        resourceId: body.telegramId,
        platform: 'telegram',
        status: 'success',
        metadata: {
          telegramId: body.telegramId,
          username: body.username,
        },
      },
    });
    
    return NextResponse.json(
      ApiResponseHelper.success({
        linked: true,
        userId: pending.userId,
      }),
      { status: HttpStatusCode.OK }
    );
    
  } catch (error) {
    const telegramId = (error as any).telegramId;
    logger.error('Error verifying link', error, { telegramId });
    return NextResponse.json(
      ApiResponseHelper.error('Failed to verify linking', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}



