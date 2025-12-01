import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, successResponse } from '@/lib/validation/validate';
import { logger } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/solana/transactions - Get transaction history for a wallet
 * Uses Helius Enhanced Transactions API
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // Transaction signature for pagination

    if (!address) {
      return errorResponse('VALIDATION_ERROR', 'Address is required', 400, undefined, requestId);
    }

    // Verify user owns this wallet
    const wallet = await prisma.wallet.findFirst({
      where: { 
        address, 
        userId, 
        blockchain: 'solana' 
      },
    });

    if (!wallet) {
      return errorResponse('NOT_FOUND', 'Wallet not found', 404, undefined, requestId);
    }

    // Fetch from Helius Enhanced API
    const heliusApiKey = process.env.HELIUS_API_KEY;
    const url = `https://api-devnet.helius-rpc.com/v0/addresses/${address}/transactions/?api-key=${heliusApiKey}`;
    
    const heliusResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!heliusResponse.ok) {
      throw new Error(`Helius API error: ${heliusResponse.statusText}`);
    }

    const heliusData = await heliusResponse.json();

    // Transform Helius data to our format
    const transactions = heliusData.map((tx: any) => {
      // Determine transaction type based on native transfers
      const nativeTransfers = tx.nativeTransfers || [];
      const isSent = nativeTransfers.some((t: any) => 
        t.fromUserAccount === address
      );
      const isReceived = nativeTransfers.some((t: any) => 
        t.toUserAccount === address
      );

      // Calculate amount (sum of all transfers involving this address)
      const amount = nativeTransfers
        .filter((t: any) => 
          t.fromUserAccount === address || t.toUserAccount === address
        )
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0) / 1e9; // Convert lamports to SOL

      // Get counterparty address
      const counterparty = isSent
        ? nativeTransfers.find((t: any) => t.fromUserAccount === address)?.toUserAccount
        : nativeTransfers.find((t: any) => t.toUserAccount === address)?.fromUserAccount;

      return {
        signature: tx.signature,
        timestamp: tx.timestamp,
        type: isSent ? 'sent' : isReceived ? 'received' : 'unknown',
        amount: amount.toString(),
        amountSOL: amount,
        status: tx.confirmationStatus === 'finalized' ? 'confirmed' : 'pending',
        fee: (tx.fee || 0) / 1e9, // Convert lamports to SOL
        from: isSent ? address : counterparty,
        to: isSent ? counterparty : address,
        slot: tx.slot,
        memo: tx.description || null,
        nativeTransfers: tx.nativeTransfers?.length || 0,
        tokenTransfers: tx.tokenTransfers?.length || 0,
        error: tx.err ? 'Failed' : null,
      };
    }).slice(0, limit);

    logger.info('Fetched transaction history', {
      userId,
      address,
      count: transactions.length,
      requestId,
    });

    return successResponse({ transactions, address }, 200, requestId);
  } catch (error) {
    logger.error('Error fetching transaction history', error, { requestId });
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to fetch transactions',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
  } finally {
    await prisma.$disconnect();
  }
}
