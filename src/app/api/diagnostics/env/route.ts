/**
 * Environment Diagnostics API
 * 
 * Returns configuration status (safe - no secrets exposed).
 */

import { EnvDiagnosticsResponseSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/validation/validate';

export async function GET() {
  const requestId = crypto.randomUUID();

  const diagnostics = EnvDiagnosticsResponseSchema.parse({
    nodeEnv: process.env.NODE_ENV || 'development',
    nextVersion: process.env.npm_package_version || '1.0.0',
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    redisConfigured: Boolean(process.env.REDIS_URL),
    firebaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_PROJECT_ID
    ),
    appCheckConfigured: Boolean(process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY),
    recaptchaConfigured: Boolean(process.env.RECAPTCHA_SECRET_KEY),
  });

  return successResponse(diagnostics, 200, requestId);
}
