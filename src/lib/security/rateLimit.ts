/**
 * Rate Limiting with In-Memory Store
 * 
 * Implements sliding window rate limiting using in-memory store.
 * For production with multiple instances, consider using a reverse proxy
 * like Azure Front Door or Cloudflare for distributed rate limiting.
 * 
 * @server-only This file must only be imported in server-side code (API routes, server components)
 */

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';

// In-memory store for development (not suitable for production with multiple instances)
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: NextRequest) => string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Default key generator (uses IP address)
 */
function defaultKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0].trim() || realIp || 'unknown';
  return ip;
}

/**
 * Clean up expired entries from in-memory store
 */
function cleanupInMemoryStore(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  inMemoryStore.forEach((value, key) => {
    if (now > value.resetTime) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => inMemoryStore.delete(key));
}

/**
 * Rate limiter using in-memory store
 */
async function rateLimitInMemory(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  // Periodic cleanup (every 100 requests)
  if (Math.random() < 0.01) {
    cleanupInMemoryStore();
  }
  
  const now = Date.now();
  const resetTime = now + windowMs;
  
  let record = inMemoryStore.get(key);
  
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime };
    inMemoryStore.set(key, record);
  }
  
  record.count++;
  const success = record.count <= limit;
  const remaining = Math.max(0, limit - record.count);
  
  return {
    success,
    limit,
    remaining,
    resetTime: record.resetTime,
  };
}

/**
 * Apply rate limiting
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const {
    limit,
    windowMs,
    keyGenerator = defaultKeyGenerator,
  } = config;
  
  const key = keyGenerator(request);
  const storeKey = `ratelimit:${key}`;
  
  // Use in-memory rate limiting
  // NOTE: For production with multiple instances, implement distributed rate limiting
  // at the infrastructure level (Azure Front Door, Cloudflare, etc.) or use
  // an edge-compatible KV store like Upstash Redis with REST API
  return rateLimitInMemory(storeKey, limit, windowMs);
}

/**
 * Rate limit middleware
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const result = await rateLimit(request, config);
  
  if (!result.success) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          retryAfter,
          limit: result.limit,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(Math.floor(result.resetTime / 1000)),
        },
      }
    );
  }
  
  return null; // Allow request to proceed
}

/**
 * Predefined rate limit configs
 */
export const RateLimitPresets = {
  // General API endpoints
  api: {
    limit: 100,
    windowMs: 60 * 1000, // 100 requests per minute
  },
  
  // Authentication endpoints (stricter)
  auth: {
    limit: 10,
    windowMs: 60 * 1000, // 10 requests per minute
  },
  
  // Write operations (POST, PUT, DELETE)
  write: {
    limit: 30,
    windowMs: 60 * 1000, // 30 requests per minute
  },
  
  // Read operations (GET)
  read: {
    limit: 200,
    windowMs: 60 * 1000, // 200 requests per minute
  },
  
  // Strict (for sensitive operations)
  strict: {
    limit: 5,
    windowMs: 60 * 1000, // 5 requests per minute
  },
};

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.floor(result.resetTime / 1000)));
  
  return response;
}
