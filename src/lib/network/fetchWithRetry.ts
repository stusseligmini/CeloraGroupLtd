// Fetch with retry + exponential backoff + jitter (simple implementation)
export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export async function fetchWithRetry(url: string, init?: RequestInit, opts: RetryOptions = {}): Promise<Response> {
  const { retries = 3, baseDelayMs = 200 } = opts;
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url, init);
      if (!res.ok && res.status >= 500 && attempt < retries) {
        // retry on 5xx
        attempt++;
        const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 100;
        await sleep(delay);
        continue;
      }
      return res;
    } catch (err) {
      if (attempt >= retries) throw err;
      attempt++;
      const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 100;
      await sleep(delay);
    }
  }
}
