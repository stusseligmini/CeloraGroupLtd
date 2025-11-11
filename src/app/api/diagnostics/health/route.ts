/**
 * Health Check API
 * 
 * Returns system health status for monitoring and observability.
 */

import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/server/db/client';
import { HealthCheckResponseSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/validation/validate';

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

    // Check MSAL configuration
    const msalConfigured = Boolean(
      process.env.NEXT_PUBLIC_AZURE_B2C_CLIENT_ID &&
      process.env.NEXT_PUBLIC_AZURE_B2C_AUTHORITY_DOMAIN
    );

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
        msal: {
          status: msalConfigured ? 'healthy' : 'unhealthy',
          configured: msalConfigured,
        },
      },
    });

    return successResponse(healthCheck, isHealthy ? 200 : 503, requestId);
  } catch (error) {
    console.error('[Health Check Error]', error);

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
