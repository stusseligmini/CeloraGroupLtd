import { ClientSecretCredential } from '@azure/identity';

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
    console.warn('[platformApi] failed to acquire client credential token', error);
    return null;
  }
}

export async function callPlatformApi<T>(
  options: CallOptions,
  fallback?: () => Promise<T> | T
): Promise<T> {
  const { path, method = 'GET', body, headers = {}, userToken, timeoutMs = 5000 } = options;

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

  if (body !== undefined && body !== null && method !== 'GET') {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

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
    if (fallback) {
      console.warn('[platformApi] falling back to local handler for', path, error);
      return await fallback();
    }
    throw error;
  }
}

