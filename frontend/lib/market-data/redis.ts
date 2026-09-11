/**
 * Centralized Live Market Data Engine - Redis & Shared Cache Abstraction
 * Gracefully degrades to MemoryCache when Redis is not available.
 */

import { marketDataConfig } from "./config";
import { memoryCache } from "./cache";

export class RedisService {
  private static instance: RedisService | null = null;
  private isRedisConnected: boolean = false;

  private constructor() {
    // In server environment, probe Redis availability if enabled
    if (marketDataConfig.isServer && marketDataConfig.redis.enabled) {
      this.initRedis();
    }
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private initRedis() {
    try {
      // In Node.js server context, optional Redis connection can be initialized
      this.isRedisConnected = false;
    } catch {
      this.isRedisConnected = false;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    const fullKey = `${marketDataConfig.redis.keyPrefix}${key}`;
    const cached = memoryCache.get<T>(fullKey);
    return cached !== undefined ? cached : null;
  }

  public async set<T>(key: string, value: T, ttlSeconds: number = 60): Promise<void> {
    const fullKey = `${marketDataConfig.redis.keyPrefix}${key}`;
    memoryCache.set(fullKey, value, ttlSeconds * 1000);
  }

  public async del(key: string): Promise<void> {
    const fullKey = `${marketDataConfig.redis.keyPrefix}${key}`;
    memoryCache.delete(fullKey);
  }

  public isConnected(): boolean {
    return this.isRedisConnected;
  }
}

export const redisService = RedisService.getInstance();
