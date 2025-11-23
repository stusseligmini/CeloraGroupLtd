/**
 * Firebase Session API
 * 
 * Manages session cookies for Firebase authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SessionRequestSchema, SessionResponseSchema } from '@/lib/validation/schemas';
import {
  validateBody,
  ValidationError,
  validationErrorResponse,
  errorResponse,
  successResponse,
} from '@/lib/validation/validate';
import { verifyIdToken } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

const ID_TOKEN_COOKIE = 'firebase-id-token';
const AUTH_TOKEN_COOKIE = 'firebase-auth-token';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Validate request body
    const body = await validateBody(request, SessionRequestSchema);

    // Verify Firebase ID token
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

    // Verify Firebase ID token
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

    // Calculate expiration from token
    const expiresAt = decodedToken.exp 
      ? new Date(decodedToken.exp * 1000)
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour

    // Set cookies
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

    // Set Firebase ID token cookie
    response.cookies.set(ID_TOKEN_COOKIE, idToken, {
      ...cookieOptions,
      expires: expiresAt,
    });

    // Also set as auth-token for compatibility
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

    // Clear all Firebase auth cookies
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

