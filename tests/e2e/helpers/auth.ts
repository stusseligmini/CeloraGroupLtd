/**
 * Authentication Helpers for E2E Tests
 * 
 * Provides utilities for mocking authentication in Playwright tests.
 */

import { BrowserContext } from '@playwright/test';

/**
 * Mock authentication by setting auth cookies
 * This simulates an authenticated user session
 */
export async function mockAuth(context: BrowserContext, userId: string = 'test-user-123'): Promise<void> {
  await context.addCookies([
    {
      name: 'celora-auth-id-token',
      value: createMockToken(userId),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'celora-auth-access-token',
      value: createMockToken(userId),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

/**
 * Create a mock JWT token for testing
 * In production, this would be a real Azure B2C token
 */
function createMockToken(userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      oid: userId,
      sub: userId,
      email: 'test@celora.com',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      iat: Math.floor(Date.now() / 1000),
    })
  ).toString('base64url');
  const signature = 'mock-signature';
  
  return `${header}.${payload}.${signature}`;
}

/**
 * Clear authentication cookies
 */
export async function clearAuth(context: BrowserContext): Promise<void> {
  await context.clearCookies();
}

