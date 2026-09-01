/**
 * Alpha Vantage In-Memory Server Cache & In-Flight Request Deduplicator
 * ====================================================================
 * Protects Alpha Vantage rate limits by caching data server-side and deduplicating
 * concurrent requests across users, bots, and UI components.
 */

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

export class AlphaVantageCache {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();

  // Default TTLs in milliseconds
  public static TTL = {
    QUOTE: 30 * 1000,          // 30 seconds
    INTRADAY: 60 * 1000,       // 1 minute
    DAILY: 30 * 60 * 1000,     // 30 minutes
    INDICATOR: 5 * 60 * 1000,  // 5 minutes
    SENTIMENT: 15 * 60 * 1000, // 15 minutes
    STATUS: 10 * 1000,         // 10 seconds
  };

  /**
   * Generates a deterministic cache key.
   */
  public makeKey(func: string, params: Record<string, any>): string {
    const sortedEntries = Object.entries(params)
      .filter(([k, v]) => v !== undefined && v !== null && k !== "apikey")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${String(v).toUpperCase()}`);
    return `av:${func.toUpperCase()}:${sortedEntries.join("&")}`;
  }

  /**
   * Retrieves an item from cache if not expired.
   */
  public get<T>(key: string): { data: T; cachedAt: string } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return {
      data: entry.data as T,
      cachedAt: new Date(entry.cachedAt).toISOString(),
    };
  }

  /**
   * Stores an item in cache with a specific TTL.
   */
  public set<T>(key: string, data: T, ttlMs: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      cachedAt: now,
      expiresAt: now + ttlMs,
    });

    // Lazy cleanup if cache grows large
    if (this.cache.size > 2000) {
      this.prune();
    }
  }

  /**
   * Wraps an asynchronous fetch function with single-flight request deduplication.
   */
  public async getOrFetch<T>(
    key: string,
    ttlMs: number,
    fetchFn: () => Promise<T>
  ): Promise<{ data: T; isCached: boolean; cachedAt: string }> {
    // 1. Check cache
    const cached = this.get<T>(key);
    if (cached) {
      return { data: cached.data, isCached: true, cachedAt: cached.cachedAt };
    }

    // 2. Check in-flight promise deduplication
    if (this.inFlight.has(key)) {
      try {
        const data = await this.inFlight.get(key);
        return { data, isCached: true, cachedAt: new Date().toISOString() };
      } catch {
        // Continue to fresh fetch on failure
      }
    }

    // 3. Launch single-flight execution
    const promise = (async () => {
      try {
        const result = await fetchFn();
        if (result !== null && result !== undefined) {
          this.set(key, result, ttlMs);
        }
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    const data = await promise;
    return { data, isCached: false, cachedAt: new Date().toISOString() };
  }

  private prune(): void {
    const now = Date.now();
    for (const [k, v] of this.cache.entries()) {
      if (now > v.expiresAt) {
        this.cache.delete(k);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }
}

// Global server singleton
export const globalAlphaVantageCache = new AlphaVantageCache();
