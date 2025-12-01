/**
 * Example: Server-side reCAPTCHA verification in API routes
 * 
 * This shows how to verify reCAPTCHA tokens in your existing API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/recaptcha/assessmentClient';

// Example: Add to existing /api/wallet/create route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recaptchaToken, ...walletData } = body;

    // Step 1: Verify reCAPTCHA token (if provided)
    if (recaptchaToken) {
      const userAgent = request.headers.get('user-agent') || undefined;
      const userIpAddress = 
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        undefined;

      const verification = await verifyToken(
        recaptchaToken,
        'wallet_create',
        {
          userAgent,
          userIpAddress,
          minScore: 0.7, // Higher threshold for sensitive operations
        }
      );

      if (!verification.verified) {
        return NextResponse.json(
          {
            error: 'Security verification failed',
            score: verification.score,
            reasons: verification.reasons,
          },
          { status: 403 }
        );
      }

      console.log('reCAPTCHA verified:', verification.score);
    }

    // Step 2: Proceed with wallet creation
    // ... your existing wallet creation logic ...

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Wallet creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create wallet' },
      { status: 500 }
    );
  }
}

// Example: Add to existing /api/solana/send route
export async function POST_Transaction(request: NextRequest) {
  try {
    const body = await request.json();
    const { recaptchaToken, to, amount, ...transactionData } = body;

    // Verify reCAPTCHA for transactions
    if (recaptchaToken) {
      const verification = await verifyToken(
        recaptchaToken,
        'transaction',
        { minScore: 0.5 } // Standard threshold
      );

      if (!verification.verified) {
        return NextResponse.json(
          {
            error: 'Security verification failed',
            message: 'Unusual activity detected. Please try again or contact support.',
          },
          { status: 403 }
        );
      }

      // Additional checks for high-value transactions
      if (amount > 10 && verification.score < 0.7) {
        return NextResponse.json(
          {
            error: 'Additional verification required',
            message: 'High-value transactions require enhanced security verification.',
          },
          { status: 403 }
        );
      }
    }

    // Proceed with transaction...
    // ... your existing transaction logic ...

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Transaction error:', error);
    return NextResponse.json(
      { error: 'Transaction failed' },
      { status: 500 }
    );
  }
}

// Example: Middleware for all API routes
export function withRecaptchaVerification(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    action: string;
    minScore?: number;
    required?: boolean;
  }
) {
  return async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { recaptchaToken } = body;

      // Check if reCAPTCHA is required
      if (!recaptchaToken && options.required) {
        return NextResponse.json(
          { error: 'reCAPTCHA token required' },
          { status: 400 }
        );
      }

      // Verify if token provided
      if (recaptchaToken) {
        const verification = await verifyToken(
          recaptchaToken,
          options.action,
          { minScore: options.minScore || 0.5 }
        );

        if (!verification.verified) {
          return NextResponse.json(
            { error: 'Security verification failed' },
            { status: 403 }
          );
        }
      }

      // Call original handler
      return handler(request);
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.json(
        { error: 'Request processing failed' },
        { status: 500 }
      );
    }
  };
}

// Usage:
// export const POST = withRecaptchaVerification(
//   actualPostHandler,
//   { action: 'wallet_create', minScore: 0.7, required: true }
// );
