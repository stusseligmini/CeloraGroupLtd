/**
 * Card Transaction Authorization Webhook
 * Real-time transaction authorization - validates against controls
 * This is called by the payment processor before approving transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ApiResponseHelper, HttpStatusCode } from '@/types/api';
import { logError } from '@/lib/logger';

const prisma = new PrismaClient();

interface AuthorizationRequest {
  cardId: string;
  amount: number;
  currency: string;
  merchantName: string;
  merchantCity?: string;
  merchantCountry: string;
  mcc: string; // Merchant Category Code
  latitude?: number;
  longitude?: number;
}

/**
 * POST /api/cards/authorize - Real-time transaction authorization
 * Called by payment processor before approving transactions
 */
export async function POST(request: NextRequest) {
  try {
    // Read body once for both signature verification and processing
    const bodyText = await request.text();
    const body: AuthorizationRequest = JSON.parse(bodyText);
    
    // Verify webhook signature in production
    const signature = request.headers.get('x-webhook-signature');
    const timestamp = request.headers.get('x-webhook-timestamp');
    
    if (process.env.NODE_ENV === 'production') {
      const webhookSecret = process.env.PAYMENT_PROCESSOR_WEBHOOK_SECRET;
      
      if (!signature || !timestamp || !webhookSecret) {
        return NextResponse.json({
          approved: false,
          declineReason: 'INVALID_SIGNATURE',
          message: 'Webhook signature verification failed',
        }, { status: HttpStatusCode.UNAUTHORIZED });
      }
      
      // Verify signature using HMAC-SHA256
      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(`${timestamp}.${bodyText}`)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return NextResponse.json({
          approved: false,
          declineReason: 'INVALID_SIGNATURE',
          message: 'Webhook signature mismatch',
        }, { status: HttpStatusCode.UNAUTHORIZED });
      }
      
      // Check timestamp to prevent replay attacks (allow 5 minute window)
      const requestTime = parseInt(timestamp);
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - requestTime) > 300) {
        return NextResponse.json({
          approved: false,
          declineReason: 'EXPIRED_SIGNATURE',
          message: 'Webhook timestamp expired',
        }, { status: HttpStatusCode.UNAUTHORIZED });
      }
    }
    const { cardId, amount, currency, merchantName, merchantCity, merchantCountry, mcc, latitude, longitude } = body;

    // Get card and validate
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        wallet: {
          select: {
            balanceCache: true,
            balanceFiat: true,
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json({
        approved: false,
        declineReason: 'CARD_NOT_FOUND',
        message: 'Card does not exist',
      }, { status: HttpStatusCode.NOT_FOUND });
    }

    // Check card status
    if (card.status !== 'active') {
      return NextResponse.json({
        approved: false,
        declineReason: 'CARD_INACTIVE',
        message: `Card is ${card.status}`,
      }, { status: HttpStatusCode.OK });
    }

    // Check if disposable card has been used
    if (card.isDisposable && card.lastUsedAt) {
      // Auto-cancel disposable card after first use
      await prisma.card.update({
        where: { id: cardId },
        data: { 
          status: 'cancelled',
          cancelledAt: new Date(),
        },
      });

      return NextResponse.json({
        approved: false,
        declineReason: 'DISPOSABLE_CARD_USED',
        message: 'Disposable card already used',
      }, { status: HttpStatusCode.OK });
    }

    // Check MCC restrictions
    if (card.blockedMCC.includes(mcc)) {
      return NextResponse.json({
        approved: false,
        declineReason: 'MERCHANT_CATEGORY_BLOCKED',
        message: `Merchant category ${mcc} is blocked`,
      }, { status: HttpStatusCode.OK });
    }

    if (card.allowedMCC.length > 0 && !card.allowedMCC.includes(mcc)) {
      return NextResponse.json({
        approved: false,
        declineReason: 'MERCHANT_CATEGORY_NOT_ALLOWED',
        message: `Merchant category ${mcc} not in whitelist`,
      }, { status: HttpStatusCode.OK });
    }

    // Check country restrictions
    if (card.blockedCountries.includes(merchantCountry)) {
      return NextResponse.json({
        approved: false,
        declineReason: 'COUNTRY_BLOCKED',
        message: `Transactions from ${merchantCountry} are blocked`,
      }, { status: HttpStatusCode.OK });
    }

    if (card.allowedCountries.length > 0 && !card.allowedCountries.includes(merchantCountry)) {
      return NextResponse.json({
        approved: false,
        declineReason: 'COUNTRY_NOT_ALLOWED',
        message: `Transactions from ${merchantCountry} not allowed`,
      }, { status: HttpStatusCode.OK });
    }

    // Check spending limits
    if (card.spendingLimit && Number(card.totalSpent) + amount > Number(card.spendingLimit)) {
      return NextResponse.json({
        approved: false,
        declineReason: 'SPENDING_LIMIT_EXCEEDED',
        message: 'Total spending limit exceeded',
      }, { status: HttpStatusCode.OK });
    }

    if (card.monthlyLimit && Number(card.monthlySpent) + amount > Number(card.monthlyLimit)) {
      return NextResponse.json({
        approved: false,
        declineReason: 'MONTHLY_LIMIT_EXCEEDED',
        message: 'Monthly spending limit exceeded',
      }, { status: HttpStatusCode.OK });
    }

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySpending = await prisma.cardTransaction.aggregate({
      where: {
        cardId,
        status: 'approved',
        transactionDate: {
          gte: today,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const todayTotal = Number(todaySpending._sum.amount || 0);
    if (card.dailyLimit && todayTotal + amount > Number(card.dailyLimit)) {
      return NextResponse.json({
        approved: false,
        declineReason: 'DAILY_LIMIT_EXCEEDED',
        message: 'Daily spending limit exceeded',
      }, { status: HttpStatusCode.OK });
    }

    // Check wallet balance (if linked to crypto wallet)
    if (card.wallet.balanceFiat && Number(card.wallet.balanceFiat) < amount) {
      return NextResponse.json({
        approved: false,
        declineReason: 'INSUFFICIENT_FUNDS',
        message: 'Insufficient wallet balance',
      }, { status: HttpStatusCode.OK });
    }

    // Calculate cashback
    const cashbackAmount = amount * Number(card.cashbackRate || 0.02);
    
    // Get cashback token from environment (default to CELO)
    const cashbackToken = process.env.CASHBACK_TOKEN || 
                          process.env.NEXT_PUBLIC_CASHBACK_TOKEN || 
                          'CELO';

    // Create transaction record
    const transaction = await prisma.cardTransaction.create({
      data: {
        cardId,
        userId: card.userId,
        amount,
        currency,
        merchantName,
        merchantCity,
        merchantCountry,
        mcc,
        latitude,
        longitude,
        status: 'approved',
        cashbackAmount,
        cashbackToken,
        transactionDate: new Date(),
      },
    });

    // Update card spending
    await prisma.card.update({
      where: { id: cardId },
      data: {
        totalSpent: {
          increment: amount,
        },
        monthlySpent: {
          increment: amount,
        },
        lastUsedAt: new Date(),
      },
    });

    // Send real-time notification
    await prisma.notification.create({
      data: {
        userId: card.userId,
        type: 'transaction',
        title: '💳 Card Transaction',
        body: `${merchantName}: ${currency} ${amount.toFixed(2)}`,
        channels: ['push', 'in-app'],
        priority: 'high',
        status: 'pending',
        metadata: {
          cardId,
          transactionId: transaction.id,
          merchantName,
          amount,
          cashback: cashbackAmount,
        },
      },
    });

    // APPROVED!
    return NextResponse.json({
      approved: true,
      transactionId: transaction.id,
      cashbackAmount,
      message: 'Transaction approved',
    }, { status: HttpStatusCode.OK });

  } catch (error) {
    logError('Transaction authorization failed', error);
    
    // On error, decline for safety
    return NextResponse.json({
      approved: false,
      declineReason: 'SYSTEM_ERROR',
      message: 'Unable to process authorization',
    }, { status: HttpStatusCode.INTERNAL_SERVER_ERROR });
  }
}
