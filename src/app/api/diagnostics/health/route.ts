/**
 * Health Check API
 * 
 * Returns system health status for monitoring and observability.
 */

import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/server/db/client';
import { HealthCheckResponseSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/validation/validate';
import { logger } from '@/lib/logger';

export async function GET() {
  const requestId = crypto.randomUUID();

  try {
    // Check database health
    const dbHealth = await checkDatabaseHealth();

    // Check Redis health (placeholder)
    const redisHealth = {
      status: 'healthy' as const,
      latency: null,
    };

    // Check App Check / reCAPTCHA configuration
    const appCheckConfigured = Boolean(process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY);
    const recaptchaConfigured = Boolean(process.env.RECAPTCHA_SECRET_KEY);

    // Determine overall status
    const isHealthy = dbHealth.status === 'healthy' && redisHealth.status === 'healthy';
    const overallStatus = isHealthy ? 'healthy' : 'unhealthy';

    const healthCheck = HealthCheckResponseSchema.parse({
      status: overallStatus,
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealth.status,
          latency: dbHealth.latency || null,
          error: dbHealth.error,
        },
        redis: {
          status: redisHealth.status,
          latency: redisHealth.latency,
        },
        appCheck: {
          status: appCheckConfigured ? 'healthy' : 'unhealthy',
          configured: appCheckConfigured,
        },
        recaptcha: {
          status: recaptchaConfigured ? 'healthy' : 'unhealthy',
          configured: recaptchaConfigured,
        },
      },
    });

    return successResponse(healthCheck, isHealthy ? 200 : 503, requestId);
  } catch (error) {
    logger.error('Health check error', error, { requestId });

    return NextResponse.json(
      {
        status: 'unhealthy',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}
