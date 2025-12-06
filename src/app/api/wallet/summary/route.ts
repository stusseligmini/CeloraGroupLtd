import { NextRequest, NextResponse } from 'next/server';
import { getWalletSummary } from '@/server/services/walletService';
import { WalletSummaryResponseSchema } from '@/lib/validation/schemas';
import { errorResponse, successResponse } from '@/lib/validation/validate';
import { logger } from '@/lib/logger';

const allowedOrigins = new Set(
  [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_EXTENSION_ORIGIN]
    .filter((value): value is string => Boolean(value))
);

function resolveAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  if (!origin) {
    return process.env.NEXT_PUBLIC_APP_URL ?? '*';
  }

  if (allowedOrigins.size === 0) {
    return origin;
  }

  if (allowedOrigins.has(origin)) {
    return origin;
  }

  return null;
}

function withCors(response: NextResponse, request: NextRequest): NextResponse {
  const origin = resolveAllowedOrigin(request);

  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
  } else {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }

  response.headers.set('Access-Control-Allow-Headers', 'authorization, content-type, x-user-id');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');

  return response;
}

function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return withCors(response, request);
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const token = extractBearerToken(request.headers.get('authorization'));
    const userIdHeader = request.headers.get('x-user-id');
    const userId = userIdHeader && userIdHeader !== 'undefined' ? userIdHeader : null;

    if (!userId) {
      const response = errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
      return withCors(response, request);
    }

    const summary = await getWalletSummary(userId, token);

    // Return in the shape expected by clients
    const payload = {
      totalBalance: summary.totalBalance ?? 0,
      currency: summary.currency ?? 'USD',
      holdings: Array.isArray(summary.holdings) ? summary.holdings : [],
      lastUpdated: summary.lastUpdated ?? new Date().toISOString(),
    };

    // Validate response against schema
    const validatedSummary = WalletSummaryResponseSchema.parse(payload);

    const response = successResponse(validatedSummary, 200, requestId);
    return withCors(response, request);
  } catch (error) {
    logger.error('Wallet summary error', error as Error);
    const response = errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to fetch wallet summary',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
    return withCors(response, request);
  }
}

