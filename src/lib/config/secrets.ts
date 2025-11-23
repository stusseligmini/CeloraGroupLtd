/**
 * Azure Key Vault Secrets Manager
 * Runtime retrieval of sensitive configuration
 */

import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

const keyVaultUrl = process.env.AZURE_KEY_VAULT_URL;
let client: SecretClient | null = null;

// In-memory cache to avoid repeated Key Vault calls
const secretCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize Key Vault client with Managed Identity
 */
function initializeClient(): SecretClient {
  if (!keyVaultUrl) {
    throw new Error('AZURE_KEY_VAULT_URL not configured');
  }

  if (!client) {
    const credential = new DefaultAzureCredential();
    client = new SecretClient(keyVaultUrl, credential);
  }

  return client;
}

/**
 * Get secret from Azure Key Vault with caching
 * Falls back to environment variable if Key Vault is unavailable
 */
export async function getSecret(secretName: string, fallbackEnvVar?: string): Promise<string> {
  // Check cache first
  const cached = secretCache.get(secretName);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  // Try Key Vault in production
  if (process.env.NODE_ENV === 'production' && keyVaultUrl) {
    try {
      const kvClient = initializeClient();
      const secret = await kvClient.getSecret(secretName);
      
      if (!secret.value) {
        throw new Error(`Secret ${secretName} has no value`);
      }

      // Cache the value
      secretCache.set(secretName, {
        value: secret.value,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return secret.value;
    } catch (error) {
      console.error(`Failed to retrieve secret ${secretName} from Key Vault:`, error);
      
      // Fall through to environment variable
      if (fallbackEnvVar && process.env[fallbackEnvVar]) {
        console.warn(`Using fallback environment variable ${fallbackEnvVar}`);
        return process.env[fallbackEnvVar]!;
      }
      
      throw error;
    }
  }

  // Development: use environment variables directly
  if (fallbackEnvVar && process.env[fallbackEnvVar]) {
    return process.env[fallbackEnvVar]!;
  }

  throw new Error(`Secret ${secretName} not found in Key Vault or environment variables`);
}

/**
 * Get multiple secrets in parallel
 */
export async function getSecrets(secretMappings: Record<string, string>): Promise<Record<string, string>> {
  const promises = Object.entries(secretMappings).map(async ([key, secretName]) => {
    const value = await getSecret(secretName, secretName.toUpperCase().replace(/-/g, '_'));
    return [key, value] as const;
  });

  const results = await Promise.all(promises);
  return Object.fromEntries(results);
}

/**
 * Clear secret cache (useful for testing or manual rotation)
 */
export function clearSecretCache(): void {
  secretCache.clear();
}

/**
 * Pre-warm cache with commonly used secrets
 */
export async function warmSecretCache(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;

  const commonSecrets = [
    'card-encryption-key',
    'highnote-webhook-secret',
    'highnote-api-key',
    'highnote-api-secret',
  ];

  await Promise.allSettled(
    commonSecrets.map((secret) => getSecret(secret))
  );
}

// Warm cache on module load in production
if (process.env.NODE_ENV === 'production' && keyVaultUrl) {
  warmSecretCache().catch((error) => {
    console.error('Failed to warm secret cache:', error);
  });
}
