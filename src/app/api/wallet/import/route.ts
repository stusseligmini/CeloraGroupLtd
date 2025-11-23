import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { logger } from '@/lib/logger';
import { hashMnemonic, deriveMultipleWallets } from '@/lib/wallet/nonCustodialWallet';
import { WalletCreateRequestSchema, WalletCreateResponseSchema } from '@/lib/validation/schemas';
import { validateBody, ValidationError, validationErrorResponse, errorResponse, successResponse } from '@/lib/validation/validate';
import { z } from 'zod';

const prisma = new PrismaClient();

const WalletImportRequestSchema = z.object({
  mnemonic: z.string().min(1),
  blockchain: z.enum(['ethereum', 'celo', 'polygon', 'arbitrum', 'optimism', 'bitcoin', 'solana']),
  label: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().default(false),
});

/**
 * POST /api/wallet/import - Import wallet from mnemonic phrase
 * 
 * NON-CUSTODIAL: This endpoint imports a wallet from a mnemonic phrase.
 * Only public keys and mnemonic hash are stored on the server.
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Validate request body
    const body = await validateBody(request, WalletImportRequestSchema);

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return errorResponse('NOT_FOUND', 'User not found', 404, undefined, requestId);
    }

    // Derive wallet from mnemonic (client should do this, but we verify)
    const wallets = deriveMultipleWallets(body.mnemonic, [body.blockchain]);
    if (wallets.length === 0) {
      return errorResponse('VALIDATION_ERROR', 'Failed to derive wallet from mnemonic', 400, undefined, requestId);
    }

    const walletData = wallets[0];

    // Hash mnemonic for verification
    const mnemonicHash = hashMnemonic(body.mnemonic);

    // Check if wallet with same address already exists
    const existingWallet = await prisma.wallet.findFirst({
      where: {
        userId,
        blockchain: body.blockchain,
        address: walletData.address,
      },
    });

    if (existingWallet) {
      // Verify mnemonic hash matches if wallet exists
      if (existingWallet.mnemonicHash && existingWallet.mnemonicHash !== mnemonicHash) {
        return errorResponse('CONFLICT', 'Wallet with this address exists but mnemonic does not match', 409, undefined, requestId);
      }
      
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
    const wallet = await prisma.wallet.create({
      data: {
        userId,
        blockchain: body.blockchain,
        address: walletData.address,
        publicKey: walletData.publicKey,
        mnemonicHash, // Store hash for verification
        label: body.label || null,
        isDefault: body.isDefault || false,
        derivationPath: walletData.derivationPath,
        balanceCache: '0',
        balanceFiat: 0,
        fiatCurrency: 'USD',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'wallet_imported',
        resource: 'wallet',
        resourceId: wallet.id,
        platform: 'web',
        severity: 'info',
        metadata: {
          blockchain: body.blockchain,
          address: wallet.address,
          isDefault: body.isDefault,
        },
      },
    }).catch(err => {
      logger.warn('Failed to create audit log', err);
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

    logger.info('Wallet imported successfully', {
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
    
    logger.error('Error importing wallet', error, { requestId });
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to import wallet',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
  } finally {
    await prisma.$disconnect();
  }
}

