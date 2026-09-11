/**
 * Centralized Live Market Data Engine - In-Memory Fast Cache
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  updatedAt: number;
}

export class MemoryCache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private maxEntries: number;
  private defaultTtlMs: number;

  constructor(maxEntries: number = 2000, defaultTtlMs: number = 60000) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
  }

  public set<T>(key: string, value: T, ttlMs?: number): void {
    if (this.store.size >= this.maxEntries) {
      // Evict oldest entry (LRU-like Map key iterator)
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    const duration = ttlMs !== undefined ? ttlMs : this.defaultTtlMs;
    const now = Date.now();
    this.store.set(key, {
      value,
      expiresAt: duration > 0 ? now + duration : Infinity,
      updatedAt: now,
    });
  }

  public get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  public has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  public delete(key: string): boolean {
    return this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  public size(): number {
    return this.store.size;
  }
}

export const memoryCache = new MemoryCache();
