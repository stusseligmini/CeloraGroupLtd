import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { WalletCreateRequestSchema, WalletCreateResponseSchema } from '@/lib/validation/schemas';
import { validateBody, ValidationError, validationErrorResponse, errorResponse, successResponse } from '@/lib/validation/validate';
import { logger } from '@/lib/logger';
import { checkIdempotency, storeIdempotency } from '@/lib/validation/idempotency';

const prisma = new PrismaClient();

/**
 * POST /api/wallet/create - Create a new non-custodial wallet
 * 
 * NON-CUSTODIAL: This endpoint only stores public keys and addresses.
 * Private keys are NEVER sent to the server - they're encrypted client-side.
 * Only the mnemonic hash is stored for recovery verification.
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Check idempotency key
    const idempotencyKey = request.headers.get('idempotency-key');
    if (idempotencyKey) {
      const idempotencyCheck = await checkIdempotency(idempotencyKey, userId);
      if (idempotencyCheck.isDuplicate && idempotencyCheck.previousResponse) {
        return NextResponse.json(idempotencyCheck.previousResponse);
      }
    }

    // Validate request body
    const body = await validateBody(request, WalletCreateRequestSchema);

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return errorResponse('NOT_FOUND', 'User not found', 404, undefined, requestId);
    }

    // Check if wallet with same address and blockchain already exists
    const existingWallet = await prisma.wallet.findFirst({
      where: {
        userId,
        blockchain: body.blockchain,
        address: body.address,
      },
    });

    if (existingWallet) {
      return errorResponse('CONFLICT', 'Wallet with this address already exists', 409, undefined, requestId);
    }

    // If this is set as default, unset other default wallets for this user
    if (body.isDefault) {
      await prisma.wallet.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create wallet - ONLY store public information
    // Private keys are NEVER stored on the server
    const wallet = await prisma.wallet.create({
      data: {
        userId,
        blockchain: body.blockchain,
        address: body.address,
        publicKey: body.publicKey || null,
        mnemonicHash: body.mnemonicHash || null, // Only hash stored for recovery verification
        label: body.label || null,
        isDefault: body.isDefault || false,
        derivationPath: body.derivationPath || null,
        balanceCache: '0',
        balanceFiat: 0,
        fiatCurrency: 'USD',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'wallet_created',
        resource: 'wallet',
        resourceId: wallet.id,
        platform: 'web',
        severity: 'info',
        metadata: {
          blockchain: body.blockchain,
          address: body.address,
          isDefault: body.isDefault,
        },
      },
    }).catch(err => {
      logger.warn('Failed to create audit log', err);
      // Don't fail the request if audit log fails
    });

    // Validate response
    const validatedResponse = WalletCreateResponseSchema.parse({
      id: wallet.id,
      blockchain: wallet.blockchain,
      address: wallet.address,
      publicKey: wallet.publicKey,
      label: wallet.label,
      isDefault: wallet.isDefault,
      balanceCache: wallet.balanceCache,
      balanceFiat: wallet.balanceFiat?.toNumber() || null,
      fiatCurrency: wallet.fiatCurrency,
      createdAt: wallet.createdAt.toISOString(),
    });

    const response = successResponse(validatedResponse, 201, requestId);
    
    // Store idempotency key
    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, userId, response);
    }

    logger.info('Non-custodial wallet created', {
      userId,
      walletId: wallet.id,
      blockchain: wallet.blockchain,
      address: wallet.address,
      requestId,
    });

    return response;
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error creating wallet', error, { requestId });
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to create wallet',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
  } finally {
    await prisma.$disconnect();
  }
}

