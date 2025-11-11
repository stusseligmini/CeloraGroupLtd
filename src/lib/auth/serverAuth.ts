/**
 * Server-side Authentication Helpers
 * 
 * Utilities for extracting and validating user information from requests
 */

import { NextRequest } from 'next/server';
import { decodeJwt } from '@/lib/jwtUtils';

const ACCESS_TOKEN_COOKIE = 'auth-token';
const ID_TOKEN_COOKIE = 'auth-id-token';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  roles?: string[];
  authTime?: number;
}

/**
 * Extract authenticated user from request cookies
 * Returns null if no valid token is found
 */
export function getUserFromRequest(request: NextRequest): AuthenticatedUser | null {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const idToken = request.cookies.get(ID_TOKEN_COOKIE)?.value;
  const token = accessToken || idToken;
  
  if (!token) return null;

  const payload = decodeJwt(token);
  if (!payload) return null;

  // Check if token is expired
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  // Extract roles from various possible claim locations
  const roles = Array.isArray(payload.roles)
    ? payload.roles
    : Array.isArray(payload['extension_Roles'])
    ? payload['extension_Roles']
    : [];

  // Extract email from various possible claim locations
  const email = payload.email || 
    payload.preferred_username || 
    (Array.isArray(payload.emails) ? payload.emails[0] : undefined);

  return {
    id: payload.oid || payload.sub || '',
    email,
    roles,
    authTime: payload.auth_time ? Number(payload.auth_time) : undefined,
  };
}

/**
 * Extract user ID from request or authorization header
 * Returns null if no valid authentication is found
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  const user = getUserFromRequest(request);
  return user?.id || null;
}

/**
 * Require authentication - throws if no valid user found
 */
export function requireAuth(request: NextRequest): AuthenticatedUser {
  const user = getUserFromRequest(request);
  
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

