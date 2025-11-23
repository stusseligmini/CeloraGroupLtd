/**
 * Server-side Authentication Helpers
 * 
 * Utilities for extracting and validating user information from requests
 * Uses Firebase Authentication
 */

import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';

const ID_TOKEN_COOKIE = 'firebase-id-token';
const AUTH_TOKEN_COOKIE = 'firebase-auth-token';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  emailVerified?: boolean;
  roles?: string[];
  authTime?: number;
}

/**
 * Extract authenticated user from request cookies
 * Returns null if no valid token is found
 */
export async function getUserFromRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Get Firebase ID token from cookies
    // Check multiple cookie names for compatibility
    const idToken = request.cookies.get(ID_TOKEN_COOKIE)?.value || 
                    request.cookies.get(AUTH_TOKEN_COOKIE)?.value ||
                    request.cookies.get('firebase-id-token')?.value ||
                    request.cookies.get('auth-token')?.value;
    
    if (!idToken) {
      // No token found - check if this is a development request
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Auth] No Firebase ID token found in cookies');
      }
      return null;
    }

    // Verify Firebase ID token
    const decodedToken = await verifyIdToken(idToken);

    // Extract user information from Firebase token
    return {
      id: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified || false,
      roles: (decodedToken.roles as string[]) || [],
      authTime: decodedToken.auth_time,
    };
  } catch (error) {
    // Token is invalid or expired
    if (process.env.NODE_ENV === 'development') {
      console.error('[Auth] Token verification failed:', error);
    }
    return null;
  }
}

/**
 * Extract user from request synchronously (for backward compatibility)
 * Note: This doesn't verify the token, use with caution
 */
export function getUserFromRequestSync(request: NextRequest): AuthenticatedUser | null {
  const idToken = request.cookies.get(ID_TOKEN_COOKIE)?.value || 
                  request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  
  if (!idToken) return null;

  // Basic JWT decode without verification (for non-critical paths)
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    // Check if token is expired
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: payload.user_id || payload.sub || payload.uid || '',
      email: payload.email,
      emailVerified: payload.email_verified || false,
      roles: payload.roles || [],
      authTime: payload.auth_time,
    };
  } catch {
    return null;
  }
}

/**
 * Extract user ID from request or authorization header
 * Returns null if no valid authentication is found
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const user = await getUserFromRequest(request);
  return user?.id || null;
}

/**
 * Extract user ID synchronously (for backward compatibility)
 */
export function getUserIdFromRequestSync(request: NextRequest): string | null {
  const user = getUserFromRequestSync(request);
  return user?.id || null;
}

/**
 * Require authentication - throws if no valid user found
 */
export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await getUserFromRequest(request);
  
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  
  return user;
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthenticatedUser, role: string): boolean {
  return user.roles?.includes(role) || false;
}

/**
 * Require specific role - throws if user doesn't have it
 */
export function requireRole(user: AuthenticatedUser, role: string): void {
  if (!hasRole(user, role)) {
    throw new Error('FORBIDDEN');
  }
}

