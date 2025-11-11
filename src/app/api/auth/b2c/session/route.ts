/**
 * Azure B2C Session API
 * 
 * Manages session cookies for MSAL authentication.
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
import { extractUserInfo } from '@/lib/jwtUtils';

const ACCESS_TOKEN_COOKIE = 'auth-token';
const ID_TOKEN_COOKIE = 'auth-id-token';
const REFRESH_TOKEN_COOKIE = 'auth-refresh-token';

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

    // Calculate expiration
    const expiresAt = new Date(Date.now() + body.expiresIn * 1000);

    // Extract user info from ID token (preferred) or access token
    const tokenToExtract = body.idToken || body.accessToken;
    const userInfo = extractUserInfo(tokenToExtract);

    if (!userInfo) {
      return errorResponse(
        'INVALID_TOKEN',
        'Failed to extract user information from token',
        400,
        undefined,
        requestId
      );
    }

    // Set cookies
    const response = NextResponse.json(
      SessionResponseSchema.parse({
        success: true,
        sessionId: requestId,
        expiresAt: expiresAt.toISOString(),
        user: {
          id: userInfo.id,
          email: userInfo.email,
          displayName: userInfo.name || null,
        },
      })
    );

    response.cookies.set(ACCESS_TOKEN_COOKIE, body.accessToken, {
      ...cookieOptions,
      expires: expiresAt,
    });

    if (body.refreshToken) {
      response.cookies.set(REFRESH_TOKEN_COOKIE, body.refreshToken, {
        ...cookieOptions,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
    }

    if (body.idToken) {
      response.cookies.set(ID_TOKEN_COOKIE, body.idToken, {
        ...cookieOptions,
        expires: expiresAt,
      });
    }

    return response;
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }

    console.error('[Session POST Error]', error);
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

    // Clear all auth cookies
    response.cookies.set(ACCESS_TOKEN_COOKIE, '', {
      ...cookieOptions,
      maxAge: 0,
    });
    response.cookies.set(ID_TOKEN_COOKIE, '', {
      ...cookieOptions,
      maxAge: 0,
    });
    response.cookies.set(REFRESH_TOKEN_COOKIE, '', {
      ...cookieOptions,
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('[Session DELETE Error]', error);
    return errorResponse(
      'SESSION_DELETE_FAILED',
      'Failed to clear session',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
  }
}

