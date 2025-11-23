import { ClientSecretCredential } from '@azure/identity';
import { logger } from '@/lib/logger';

type CallOptions = {
  path: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  userToken?: string | null;
  timeoutMs?: number;
};

type ApiError = Error & { status?: number };

const baseUrl = process.env.PLATFORM_API_BASE_URL?.replace(/\/$/, '') ?? '';
const tenantId = process.env.AZURE_B2C_TENANT_ID;
const clientId = process.env.AZURE_B2C_CLIENT_ID;
const clientSecret = process.env.AZURE_B2C_CLIENT_SECRET;
const configuredScope =
  process.env.AZURE_PLATFORM_API_SCOPE ??
  process.env.NEXT_PUBLIC_AZURE_B2C_API_SCOPE?.replace(/\/user_impersonation$/, '/.default') ??
  '';

let credential: ClientSecretCredential | null = null;
let tokenCache: { token: string; expiresOnTimestamp: number } | null = null;

if (tenantId && clientId && clientSecret) {
  credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
}

function resolveScope(): string | null {
  if (!configuredScope) {
    return null;
  }

  if (configuredScope.includes('.default')) {
    return configuredScope;
  }

  return `${configuredScope}/.default`;
}

async function getClientCredentialToken(): Promise<string | null> {
  if (!credential) {
    return null;
  }

  const scope = resolveScope();
  if (!scope) {
    return null;
  }

  const now = Date.now();
  if (tokenCache && tokenCache.expiresOnTimestamp > now + 30_000) {
    return tokenCache.token;
  }

  try {
    const result = await credential.getToken(scope);
    if (!result?.token) {
      return null;
    }

    tokenCache = {
      token: result.token,
      expiresOnTimestamp: result.expiresOnTimestamp ?? now + 300_000,
    };
    return result.token;
  } catch (error) {
    logger.warn('Failed to acquire client credential token', { error });
    return null;
  }
}

/**
 * Generate idempotency key for POST/PUT/PATCH requests
 */
function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Retry fetch with exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  retryDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      // Retry on 5xx errors and network errors
      if (response.ok || attempt === maxRetries - 1) {
        return response;
      }

      // Wait before retrying (exponential backoff with jitter)
      const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      lastError = error as Error;

      // Don't retry on abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      // Wait before retrying
      if (attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to fetch after retries');
}

export async function callPlatformApi<T>(
  options: CallOptions & { idempotencyKey?: string; maxRetries?: number },
  fallback?: () => Promise<T> | T
): Promise<T> {
  const {
    path,
    method = 'GET',
    body,
    headers = {},
    userToken,
    timeoutMs = 10000, // Increased default timeout
    idempotencyKey,
    maxRetries = 3,
  } = options;

  if (!baseUrl) {
    if (fallback) {
      return await fallback();
    }
    throw new Error('PLATFORM_API_BASE_URL is not configured');
  }

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  let bearerToken = userToken || null;

  if (!bearerToken) {
    bearerToken = await getClientCredentialToken();
  }

  if (bearerToken) {
    requestHeaders.Authorization = `Bearer ${bearerToken}`;
  }

  // Add idempotency key for mutating requests
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const key = idempotencyKey || generateIdempotencyKey();
    requestHeaders['Idempotency-Key'] = key;
  }

  if (body !== undefined && body !== null && method !== 'GET') {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchWithRetry(
      `${baseUrl}${path}`,
      {
        method,
        headers: requestHeaders,
        body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      },
      maxRetries
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      const error: ApiError = new Error(
        errorBody || `Platform API request failed with status ${response.status}`
      );
      error.status = response.status;
      throw error;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Log retry attempts
    if (error instanceof Error && error.name !== 'AbortError') {
      logger.warn('Platform API request failed', {
        path,
        method,
        error: error.message,
        retries: maxRetries,
      });
    }

    if (fallback) {
      logger.warn('Falling back to local handler', { path, error });
      return await fallback();
    }
    throw error;
  }
}

