import { getCachedJson, setCachedJson } from '../cache/redisCache';
import { WalletHolding, WalletSummary } from '@/types/api';

const CACHE_KEY_PREFIX = 'wallet:summary:';
const CACHE_TTL_MS = 60_000; // 1 minute cache

const FALLBACK_SUMMARY: WalletSummary = {
  totalBalance: 0,
  currency: 'USD',
  holdings: [],
  lastUpdated: new Date().toISOString(),
};

type PlatformWalletResponse = {
  totalBalance?: number;
  currency?: string;
  holdings?: WalletHolding[];
  lastUpdated?: string;
};

function normalizeSummary(payload: PlatformWalletResponse | WalletSummary): WalletSummary {
  return {
    totalBalance: typeof payload.totalBalance === 'number' ? payload.totalBalance : 0,
    currency: payload.currency ?? 'USD',
    holdings: Array.isArray(payload.holdings) ? payload.holdings : [],
    lastUpdated: payload.lastUpdated ?? new Date().toISOString(),
  };
}

export async function getWalletSummary(userId: string | null, userToken: string | null): Promise<WalletSummary> {
  const cacheKey = userId ? `${CACHE_KEY_PREFIX}${userId}` : null;

  if (cacheKey) {
    const cached = await getCachedJson<WalletSummary>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const headers: Record<string, string> = {};
  if (userId) {
    headers['X-User-Id'] = userId;
  }

  const summary = await callPlatformApi<PlatformWalletResponse>(
    {
      path: '/wallets/summary',
      method: 'GET',
      headers,
      userToken,
    },
    async () => FALLBACK_SUMMARY
  );

  const normalized = normalizeSummary(summary);

  if (cacheKey) {
    await setCachedJson(cacheKey, normalized, CACHE_TTL_MS);
  }

  return normalized;
}

