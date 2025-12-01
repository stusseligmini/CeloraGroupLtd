import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { SessionRequestSchema, SessionResponseSchema } from '@/lib/validation/schemas';
import {
  validateBody,
  ValidationError,
  validationErrorResponse,
  errorResponse,
  successResponse,
} from '@/lib/validation/validate';
import { logger } from '@/lib/logger';

const ID_TOKEN_COOKIE = 'firebase-id-token';
const AUTH_TOKEN_COOKIE = 'firebase-auth-token';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = /__session=([^;]+)/.exec(cookieHeader);
  if (!match) return NextResponse.json({ user: null });
  try {
    const decoded = await verifyIdToken(decodeURIComponent(match[1]));
    return NextResponse.json({ user: decoded });
  } catch {
    return NextResponse.json({ user: null });
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await validateBody(request, SessionRequestSchema);

    const idToken = body.idToken || body.accessToken;
    if (!idToken) {
      return errorResponse(
        'INVALID_TOKEN',
        'ID token is required',
        400,
        undefined,
        requestId
      );
    }

    let decodedToken;
    try {
      decodedToken = await verifyIdToken(idToken);
    } catch (error) {
      return errorResponse(
        'INVALID_TOKEN',
        'Failed to verify Firebase ID token',
        401,
        undefined,
        requestId
      );
    }

    const expiresAt = decodedToken.exp
      ? new Date(decodedToken.exp * 1000)
      : new Date(Date.now() + 3600 * 1000);

    const response = NextResponse.json(
      SessionResponseSchema.parse({
        success: true,
        sessionId: requestId,
        expiresAt: expiresAt.toISOString(),
        user: {
          id: decodedToken.uid,
          email: decodedToken.email || null,
          displayName: decodedToken.name || null,
        },
      })
    );

    response.cookies.set(ID_TOKEN_COOKIE, idToken, {
      ...cookieOptions,
      expires: expiresAt,
    });

    response.cookies.set(AUTH_TOKEN_COOKIE, idToken, {
      ...cookieOptions,
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }

    logger.error('Session POST error', error, { requestId });
    return errorResponse(
      'SESSION_CREATE_FAILED',
      'Failed to create session',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
  }
}

export async function DELETE() {
  const requestId = crypto.randomUUID();

  try {
    const response = successResponse(
      { success: true, message: 'Session cleared' },
      200,
      requestId
    );

    response.cookies.set(ID_TOKEN_COOKIE, '', {
      ...cookieOptions,
      maxAge: 0,
    });
    response.cookies.set(AUTH_TOKEN_COOKIE, '', {
      ...cookieOptions,
      maxAge: 0,
    });

    return response;
  } catch (error) {
    logger.error('Session DELETE error', error, { requestId });
    return errorResponse(
      'SESSION_DELETE_FAILED',
      'Failed to clear session',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
  }
}