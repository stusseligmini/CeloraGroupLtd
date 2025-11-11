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
    msalConfigured: Boolean(
      process.env.NEXT_PUBLIC_AZURE_B2C_CLIENT_ID &&
      process.env.NEXT_PUBLIC_AZURE_B2C_AUTHORITY_DOMAIN &&
      process.env.AZURE_B2C_CLIENT_SECRET
    ),
    azureKeyVaultConfigured: Boolean(process.env.AZURE_KEY_VAULT_URL),
    appInsightsConfigured: Boolean(process.env.APPLICATION_INSIGHTS_CONNECTION_STRING),
  });

  return successResponse(diagnostics, 200, requestId);
}
