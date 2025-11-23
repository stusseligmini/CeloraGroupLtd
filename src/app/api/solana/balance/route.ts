import { NextRequest, NextResponse } from 'next/server';
import { getSolanaBalance, getSolanaConnection } from '@/lib/solana/solanaWallet';
import { errorResponse, successResponse } from '@/lib/validation/validate';

/**
 * GET /api/solana/balance - Get Solana balance
 * 
 * NON-CUSTODIAL: Only queries public blockchain data
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return errorResponse('VALIDATION_ERROR', 'Address is required', 400, undefined, requestId);
    }

    // Validate Solana address format
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid Solana address', 400, undefined, requestId);
    }

    // Get balance from blockchain
    const connection = getSolanaConnection();
    const balance = await getSolanaBalance(address, connection);

    const response = successResponse({
      address,
      balance: balance.toString(),
      balanceSOL: balance,
      balanceLamports: Math.floor(balance * 1e9),
      currency: 'SOL',
    }, 200, requestId);

    return response;
  } catch (error) {
    console.error('Error fetching Solana balance', error);
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to fetch balance',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
  }
}

