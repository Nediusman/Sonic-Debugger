export interface RateLimiter {
  /** True when the key may make another call now. */
  allow(key: string): boolean;
}

const PRUNE_ABOVE = 1000;

/** Sliding window kept in memory. Each serverless instance counts on its own. */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now): RateLimiter {
  const hits = new Map<string, number[]>();

  function prune(time: number): void {
    for (const [key, times] of hits) {
      if (times.every((t) => time - t >= windowMs)) hits.delete(key);
    }
  }

  return {
    allow(key) {
      const time = now();
      if (hits.size > PRUNE_ABOVE) prune(time);
      const recent = (hits.get(key) ?? []).filter((t) => time - t < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(time);
      hits.set(key, recent);
      return true;
    },
  };
}
