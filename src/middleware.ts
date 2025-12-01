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
const SESSION_COOKIE = '__session';

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

async function getUserFromRequest(request: NextRequest) {
  // Firebase session cookie validation moved to API route (/api/auth/session)
  // Middleware only checks legacy tokens to avoid Node.js dependencies in Edge runtime
  
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    // Decode without verification (verification happens server-side in API routes)
    try {
      const payload = decodeJwt(sessionToken);
      if (payload && (!payload.exp || payload.exp > Math.floor(Date.now() / 1000))) {
        return {
          id: payload.uid || payload.sub,
          email: payload.email,
          roles: [],
          authTime: payload.auth_time,
        };
      }
    } catch {
      // Invalid token, fall through
    }
  }

  // Fallback to legacy tokens
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

// Deprecated middleware: forward to proxy behavior for Next.js 15
export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const correlationId = request.headers.get('x-correlation-id') || generateUUID();
  const path = request.nextUrl.pathname;
  const method = request.method;

  // Define route checks (used throughout middleware)
  const isAuthRoute = path.startsWith('/splash') || path.startsWith('/signup') || path.startsWith('/api/auth');
  const isApiRoute = path.startsWith('/api/');
  const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  // === RATE LIMITING ===
  // Disabled in development mode to allow rapid testing
  if (process.env.NODE_ENV === 'production') {

    if (isAuthRoute) {
      const rateLimitResult = await rateLimitMiddleware(request, RateLimitPresets.auth);
      if (rateLimitResult) return rateLimitResult;
    } else if (isApiRoute) {
      const preset = isWriteOperation ? RateLimitPresets.write : RateLimitPresets.read;
      const rateLimitResult = await rateLimitMiddleware(request, preset);
      if (rateLimitResult) return rateLimitResult;
    }
  }

  // === CSRF PROTECTION ===
  if (isApiRoute) {
    const csrfResult = csrfMiddleware(request);
    if (csrfResult) return csrfResult;
  }

  // === AUTH VALIDATION ===
  const user = await getUserFromRequest(request);

  const authRoutes = ['/splash', '/signup', '/reset-password', '/update-password'];
  const protectedRoutes = ['/wallet', '/cards', '/casino', '/settings', '/profile'];
  const currentPath = request.nextUrl.pathname;

  const publicPrefixes = ['/api/', '/offline', '/fresh', '/_next/', '/favicon.ico', '/icons/', '/images/'];
  const isPublicPath = publicPrefixes.some((prefix) => currentPath.startsWith(prefix));
  const isAuthPage = authRoutes.includes(currentPath);
  const isProtectedRoute = protectedRoutes.some((route) => currentPath.startsWith(route));

  // If user is logged in and tries to access auth pages, redirect to home
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Temporarily disabled auth check for demo mode
  if (!user && isProtectedRoute && !isPublicPath) {
    return NextResponse.redirect(new URL('/splash', request.url));
  }

  // === BUILD RESPONSE ===
  // Use rewrite to emulate proxy for public assets and API when needed
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

// Limit middleware scope; prefer proxy for routes in next.config.js
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt).*)'],
};
