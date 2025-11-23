/**
 * Hidden Vault API - Status and Management
 * /api/wallet/vault
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ApiResponseHelper, HttpStatusCode } from '@/types/api';
import { SetVaultPinRequestSchema, UnlockVaultRequestSchema, UpdateVaultSettingsRequestSchema } from '@/lib/validation/schemas';
import { hashPin, verifyPin, isValidPinFormat, isWeakPin, checkPinRateLimit, resetPinAttempts, generateVaultToken, markVaultUnlocked, isVaultUnlocked } from '@/lib/security/pinProtection';
import { logError } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';

// Force Node.js runtime for crypto operations
export const runtime = 'nodejs';

const prisma = new PrismaClient();

/**
 * POST /api/wallet/vault/set-pin - Set or change vault PIN
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = SetVaultPinRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        ApiResponseHelper.error('Invalid request body', 'VALIDATION_ERROR', validation.error.flatten()),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }

    const { walletId, pin } = validation.data;

    // Check for weak PIN
    if (isWeakPin(pin)) {
      return NextResponse.json(
        ApiResponseHelper.error('PIN is too weak. Avoid sequential or repeating digits.', 'WEAK_PIN'),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }

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

    // Hash PIN and update wallet
    const pinHash = hashPin(pin);
    
    await prisma.wallet.update({
      where: { id: walletId },
      data: {
        isHidden: true,
        pinHash,
        vaultLevel: 1, // Set to hidden vault level
      },
    });

    return NextResponse.json(
      ApiResponseHelper.success({ success: true }, 'Vault PIN set successfully'),
      { status: HttpStatusCode.OK }
    );

  } catch (error) {
    logError('Failed to set vault PIN', error);
    return NextResponse.json(
      ApiResponseHelper.error('Internal server error', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * POST /api/wallet/vault/unlock - Unlock hidden vault with PIN
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = UnlockVaultRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        ApiResponseHelper.error('Invalid request body', 'VALIDATION_ERROR', validation.error.flatten()),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }

    const { walletId, pin } = validation.data;

    // Check rate limit
    const rateLimit = checkPinRateLimit(userId, walletId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        ApiResponseHelper.error('Too many failed attempts. Please try again later.', 'RATE_LIMIT_EXCEEDED'),
        { status: HttpStatusCode.TOO_MANY_REQUESTS }
      );
    }

    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId, isHidden: true },
    });

    if (!wallet) {
      return NextResponse.json(
        ApiResponseHelper.error('Vault not found', 'NOT_FOUND'),
        { status: HttpStatusCode.NOT_FOUND }
      );
    }

    if (!wallet.pinHash) {
      return NextResponse.json(
        ApiResponseHelper.error('Vault PIN not set', 'PIN_NOT_SET'),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }

    // Verify PIN
    const isValid = verifyPin(pin, wallet.pinHash);
    
    if (!isValid) {
      return NextResponse.json(
        ApiResponseHelper.error(
          `Incorrect PIN. ${rateLimit.remainingAttempts - 1} attempts remaining.`,
          'INVALID_PIN'
        ),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    // Reset rate limit on successful unlock
    resetPinAttempts(userId, walletId);

    // Mark vault as unlocked in session
    markVaultUnlocked(userId, walletId, 5 * 60 * 1000); // 5 minutes

    // Generate vault session token
    const token = generateVaultToken(userId, walletId);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    return NextResponse.json(
      ApiResponseHelper.success({
        token,
        expiresAt: expiresAt.toISOString(),
      }, 'Vault unlocked successfully'),
      { status: HttpStatusCode.OK }
    );

  } catch (error) {
    logError('Failed to unlock vault', error);
    return NextResponse.json(
      ApiResponseHelper.error('Internal server error', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * GET /api/wallet/vault/status - Get vault status for a wallet
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    const { searchParams } = new URL(request.url);
    const walletId = searchParams.get('walletId');

    if (!walletId) {
      return NextResponse.json(
        ApiResponseHelper.error('walletId is required', 'VALIDATION_ERROR'),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }

    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId },
      select: {
        id: true,
        isHidden: true,
        vaultLevel: true,
        pinHash: true,
      },
    });

    if (!wallet) {
      return NextResponse.json(
        ApiResponseHelper.error('Wallet not found', 'NOT_FOUND'),
        { status: HttpStatusCode.NOT_FOUND }
      );
    }

    // Check if vault is unlocked in current session
    const isUnlocked = isVaultUnlocked(userId, walletId);

    return NextResponse.json(
      ApiResponseHelper.success({
        isHidden: wallet.isHidden,
        vaultLevel: wallet.vaultLevel,
        hasPinSet: !!wallet.pinHash,
        isUnlocked,
      }),
      { status: HttpStatusCode.OK }
    );

  } catch (error) {
    logError('Failed to get vault status', error);
    return NextResponse.json(
      ApiResponseHelper.error('Internal server error', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * PATCH /api/wallet/vault/settings - Update vault settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    const walletId = body.walletId;

    if (!walletId) {
      return NextResponse.json(
        ApiResponseHelper.error('walletId is required', 'VALIDATION_ERROR'),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }

    // Validate request body
    const validation = UpdateVaultSettingsRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        ApiResponseHelper.error('Invalid request body', 'VALIDATION_ERROR', validation.error.flatten()),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }

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

    // Update vault settings
    const updatedWallet = await prisma.wallet.update({
      where: { id: walletId },
      data: {
        isHidden: validation.data.isHidden ?? wallet.isHidden,
        vaultLevel: validation.data.vaultLevel ?? wallet.vaultLevel,
      },
    });

    return NextResponse.json(
      ApiResponseHelper.success({
        isHidden: updatedWallet.isHidden,
        vaultLevel: updatedWallet.vaultLevel,
      }, 'Vault settings updated'),
      { status: HttpStatusCode.OK }
    );

  } catch (error) {
    logError('Failed to update vault settings', error);
    return NextResponse.json(
      ApiResponseHelper.error('Internal server error', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}
