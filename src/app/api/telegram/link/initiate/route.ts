/**
 * Initiate Telegram Account Linking
 * POST /api/telegram/link/initiate
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { ApiResponseHelper, HttpStatusCode } from '@/types/api';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  let userId: string | null = null;
  try {
    userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }
    
    // Check if already linked
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    });
    
    if (existing?.telegramId) {
      return NextResponse.json(
        ApiResponseHelper.error('Telegram account already linked', 'ALREADY_LINKED'),
        { status: HttpStatusCode.CONFLICT }
      );
    }
    
    // Generate verification code (6 digits)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store verification code (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Create temporary telegram user entry
    await prisma.telegramUser.create({
      data: {
        userId,
        telegramId: BigInt(Date.now()), // Temporary placeholder, will be updated on verification
        chatId: '0', // Will be updated
        verificationCode,
        verificationExpiresAt: expiresAt,
        isActive: false,
      },
    });
    
    return NextResponse.json(
      ApiResponseHelper.success({
        verificationCode,
        expiresAt: expiresAt.toISOString(),
        expiresIn: 600, // seconds
      }),
      { status: HttpStatusCode.OK }
    );
    
  } catch (error) {
    logger.error('Error initiating Telegram link', error, { userId: userId ?? 'unknown' });
    return NextResponse.json(
      ApiResponseHelper.error('Failed to initiate linking', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}



