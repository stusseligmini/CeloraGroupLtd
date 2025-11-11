/**
 * Next.js Middleware with Security Hardening
 * 
 * Features:
 * - Content Security Policy (CSP) with nonce
 * - CSRF protection (double-submit cookie)
 * - Rate limiting (Redis-backed)
 * - Auth validation
 * - Security headers
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { addCspHeaders, generateCspNonce } from './lib/security/contentSecurityPolicy';
import { csrfMiddleware, setCsrfTokenCookie } from './lib/security/csrfProtection';
import { rateLimitMiddleware, RateLimitPresets, rateLimit, addRateLimitHeaders } from './lib/security/rateLimit';
import { decodeJwt } from './lib/jwtUtils';

const ACCESS_TOKEN_COOKIE = 'auth-token';
const ID_TOKEN_COOKIE = 'auth-id-token';

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getUserFromRequest(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const idToken = request.cookies.get(ID_TOKEN_COOKIE)?.value;
  const token = accessToken || idToken;
  if (!token) return null;

  const payload = decodeJwt(token);
  if (!payload) return null;

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  const roles = Array.isArray(payload.roles)
    ? payload.roles
    : Array.isArray(payload['extension_Roles'])
    ? payload['extension_Roles']
    : [];

  const email = payload.email || payload.preferred_username || (Array.isArray(payload.emails) ? payload.emails[0] : undefined);

  return {
    id: payload.sub,
    email,
    roles,
    authTime: payload.auth_time ? Number(payload.auth_time) : undefined,
  };
}

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const correlationId = request.headers.get('x-correlation-id') || generateUUID();
  const path = request.nextUrl.pathname;
  const method = request.method;

  // === RATE LIMITING ===
  const isAuthRoute = path.startsWith('/signin') || path.startsWith('/signup') || path.startsWith('/api/auth');
  const isApiRoute = path.startsWith('/api/');
  const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  if (isAuthRoute) {
    const rateLimitResult = await rateLimitMiddleware(request, RateLimitPresets.auth);
    if (rateLimitResult) return rateLimitResult;
  } else if (isApiRoute) {
    const preset = isWriteOperation ? RateLimitPresets.write : RateLimitPresets.read;
    const rateLimitResult = await rateLimitMiddleware(request, preset);
    if (rateLimitResult) return rateLimitResult;
  }

  // === CSRF PROTECTION ===
  if (isApiRoute) {
    const csrfResult = csrfMiddleware(request);
    if (csrfResult) return csrfResult;
  }

  // === AUTH VALIDATION ===
  const user = getUserFromRequest(request);

  const protectedRoutes = ['/'];
  const authRoutes = ['/signin', '/signup', '/reset-password', '/update-password'];
  const currentPath = request.nextUrl.pathname;

  const publicPrefixes = ['/api/', '/offline', '/fresh', '/_next/', '/favicon.ico'];
  const isPublicPath = publicPrefixes.some((prefix) => currentPath.startsWith(prefix));

  if (!isPublicPath) {
    const isProtectedRoute = protectedRoutes.some((route) => currentPath.startsWith(route));
    const isAuthPage = authRoutes.includes(currentPath);

    if (user && isAuthPage) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (!user && isProtectedRoute && currentPath !== '/') {
      return NextResponse.redirect(new URL('/signin', request.url));
    }
  }

  // === BUILD RESPONSE ===
  const response = NextResponse.next();

  // Add correlation ID
  response.headers.set('x-correlation-id', correlationId);

  // === CSP + SECURITY HEADERS ===
  const nonce = generateCspNonce();
  const reportOnly = process.env.NODE_ENV === 'development';
  addCspHeaders(response, nonce, reportOnly);

  // === CSRF TOKEN COOKIE ===
  // Set/refresh CSRF token cookie on all non-API requests
  if (!isApiRoute) {
    setCsrfTokenCookie(response);
  }

  // === RATE LIMIT HEADERS ===
  // Add rate limit info to API responses
  if (isApiRoute) {
    const preset = isWriteOperation ? RateLimitPresets.write : RateLimitPresets.read;
    const rateLimitInfo = await rateLimit(request, preset);
    addRateLimitHeaders(response, rateLimitInfo);
  }

  // === PERFORMANCE METRICS ===
  const responseTime = Date.now() - startTime;
  response.headers.set('x-response-time', `${responseTime}ms`);

  // === CACHE CONTROL ===
  if (!response.headers.has('Cache-Control')) {
    // Default: no caching for sensitive pages
    const cacheableRoutes = ['/_next/static', '/public', '/icons', '/images'];
    const isCacheable = cacheableRoutes.some(route => path.startsWith(route));
    
    if (isCacheable) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt).*)'],
};
