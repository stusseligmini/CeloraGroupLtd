/**
 * Auth Verification Endpoint
 * 
 * Debug endpoint to verify Firebase token validation
 * Returns decoded token info if valid, 401 if invalid
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/serverAuth';

export const runtime = 'nodejs';

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type, x-user-id',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * GET - Verify authentication token
 */
export async function GET(request: NextRequest) {
  try {
    // Extract user from request (verifies token)
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized',
          message: 'No valid authentication token found'
        },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Return decoded token info
    return NextResponse.json(
      {
        success: true,
        data: {
          authenticated: true,
          userId: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          roles: user.roles || [],
          authTime: user.authTime,
          currentTime: Math.floor(Date.now() / 1000)
        }
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  } catch (error) {
    console.error('[Auth Verify] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Token verification failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}
