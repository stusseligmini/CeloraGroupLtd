/**
 * API Route: Stripe Crypto On-Ramp Webhook
 * Handles notifications when crypto purchase completes
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !secretKey) {
    console.error('[Stripe Webhook] Missing webhook secret or secret key');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret) as any;

    // Handle crypto.onramp_session events
    // Note: Crypto onramp events not yet in standard Stripe types
    if (event.type === 'crypto.onramp_session.updated') {
      const session = event.data.object;

      console.log('[Stripe Webhook] On-ramp session updated:', {
        sessionId: session.id,
        status: session.status,
      });

      // Log transaction to database if completed
      if (session.status === 'fulfillment_complete') {
        // Find user by wallet address
        const walletAddress = Object.values(session.wallet_addresses || {})[0] as string;
        
        if (walletAddress && typeof walletAddress === 'string') {
          const wallet = await prisma.wallet.findFirst({
            where: { address: walletAddress },
          });

          if (wallet) {
            // Log the fiat purchase (optional - for analytics)
            await prisma.transaction.create({
              data: {
                walletId: wallet.id,
                blockchain: wallet.blockchain,
                txHash: session.id, // Use session ID as reference
                type: 'receive',
                status: 'confirmed',
                amount: session.transaction_details?.destination_amount?.toString() || '0',
                fromAddress: 'stripe-onramp',
                toAddress: walletAddress,
                timestamp: new Date(),
                memo: 'Stripe crypto purchase',
              },
            });

            console.log('[Stripe Webhook] Logged fiat purchase for wallet:', wallet.id);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook failed' },
      { status: 400 }
    );
  }
}
