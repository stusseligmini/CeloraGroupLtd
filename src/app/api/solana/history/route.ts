import { NextRequest, NextResponse } from 'next/server';
import { getHeliusTransactionHistory, parseGamblingTransaction } from '@/lib/solana/heliusApi';
import { errorResponse, successResponse } from '@/lib/validation/validate';

/**
 * GET /api/solana/history - Get enriched transaction history from Helius
 * 
 * NON-CUSTODIAL: Only queries public blockchain data via Helius Enhanced API
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const limit = parseInt(searchParams.get('limit') || '100');
    const before = searchParams.get('before') || undefined;
    const type = searchParams.get('type') || undefined;

    if (!address) {
      return errorResponse('VALIDATION_ERROR', 'Address is required', 400, undefined, requestId);
    }

    // Validate Solana address format
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid Solana address', 400, undefined, requestId);
    }

    // Get transaction history from Helius
    const transactions = await getHeliusTransactionHistory({
      address,
      limit: Math.min(limit, 1000), // Max 1000
      before,
      type,
      commitment: 'confirmed',
    });

    // Parse transactions for gambling context
    const parsedTransactions = transactions.map(tx => {
      const parsed = parseGamblingTransaction(tx, address);
      return {
        signature: tx.signature,
        timestamp: tx.timestamp * 1000, // Convert to milliseconds
        type: parsed.type,
        label: parsed.label,
        amount: parsed.amount,
        counterparty: parsed.counterparty,
        isCasinoTx: parsed.isCasinoTx,
        source: tx.source,
        fee: tx.fee / 1e9, // Convert lamports to SOL
        nativeTransfers: tx.nativeTransfers?.map(t => ({
          from: t.fromUserAccount,
          to: t.toUserAccount,
          amount: t.amount / 1e9,
        })),
        tokenTransfers: tx.tokenTransfers?.map(t => ({
          from: t.fromTokenAccount,
          to: t.toTokenAccount,
          amount: t.tokenAmount,
          mint: t.mint,
          symbol: t.tokenSymbol,
        })),
      };
    });

    const response = successResponse({
      address,
      transactions: parsedTransactions,
      count: parsedTransactions.length,
    }, 200, requestId);

    return response;
  } catch (error) {
    console.error('Error fetching Solana transaction history', error);
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to fetch transaction history',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
  }
}

