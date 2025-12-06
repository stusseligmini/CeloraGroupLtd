/**
 * API Route: Create Stripe Crypto On-Ramp Session
 * Server-side only - protects secret key
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStripeOnRampSession } from '@/lib/fiat/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, destinationNetwork, destinationCurrency, sourceAmount, sourceCurrency } = body;

    if (!walletAddress || !destinationNetwork || !destinationCurrency) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, destinationNetwork, destinationCurrency' },
        { status: 400 }
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: 'Stripe not configured. Please add STRIPE_SECRET_KEY to environment variables.' },
        { status: 500 }
      );
    }

    const session = await createStripeOnRampSession(
      {
        walletAddress,
        destinationNetwork,
        destinationCurrency,
        sourceAmount,
        sourceCurrency: sourceCurrency || 'usd',
      },
      secretKey
    );

    return NextResponse.json(session);
  } catch (error) {
    console.error('[Stripe On-Ramp] Session creation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    );
  }
}
