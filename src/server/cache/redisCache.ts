import { createClient } from '@redis/client';
import type { RedisClientType as BaseRedisClientType } from '@redis/client';

type RedisClientType = ReturnType<typeof createClient>;

type CacheEntry = {
  value: string;
  expiresAt: number;
};

const TTL_MS_DEFAULT = 60_000;
const connectionString = process.env.AZURE_REDIS_CONNECTION_STRING;

let clientPromise: Promise<RedisClientType | null> | null = null;
const memoryCache = new Map<string, CacheEntry>();

async function connectRedis(): Promise<RedisClientType | null> {
  if (!connectionString) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const client = createClient({ url: connectionString });
        client.on('error', (error) => {
          console.warn('[redis] connection error', error);
        });
        await client.connect();
        return client;
      } catch (error) {
        console.warn('[redis] failed to connect, falling back to memory cache', error);
        return null;
      }
    })();
  }

  return clientPromise;
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const client = await connectRedis();

  if (client) {
    try {
      const value = await client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      console.warn('[redis] failed to read key', key, error);
    }
  }

  const now = Date.now();
  const entry = memoryCache.get(key);
  if (entry && entry.expiresAt > now) {
    try {
      return JSON.parse(entry.value) as T;
    } catch (_error) {
      memoryCache.delete(key);
    }
  }

  return null;
}

export async function setCachedJson<T>(key: string, value: T, ttlMs = TTL_MS_DEFAULT): Promise<void> {
  const serialized = JSON.stringify(value);
  const client = await connectRedis();

  if (client) {
    try {
      await client.set(key, serialized, { PX: ttlMs });
      return;
    } catch (error) {
      console.warn('[redis] failed to set key', key, error);
    }
  }

  memoryCache.set(key, {
    value: serialized,
    expiresAt: Date.now() + ttlMs,
  });
}

export async function clearCache(key?: string): Promise<void> {
  const client = await connectRedis();

  if (!key) {
    memoryCache.clear();
    if (client) {
      await client.flushAll().catch((error) => console.warn('[redis] failed to flush cache', error));
    }
    return;
  }

  memoryCache.delete(key);
  if (client) {
    await client.del(key).catch((error) => console.warn('[redis] failed to delete key', key, error));
  }
}

