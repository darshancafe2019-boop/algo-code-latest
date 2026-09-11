/**
 * Centralized Live Market Data Engine - Server Configuration
 * STRICT TRUTH-IN-DATA: Never expose access tokens or secrets to client bundles.
 */

export interface MarketDataConfig {
  dhan: {
    clientId: string;
    accessToken: string;
    feedUrl: string;
    restUrl: string;
    isSandbox: boolean;
  };
  upstox: {
    apiKey: string;
    accessToken: string;
    feedUrl: string;
    restUrl: string;
  };
  delta: {
    apiKey: string;
    apiSecret: string;
    wsUrl: string;
    restUrl: string;
  };
  redis: {
    url: string;
    keyPrefix: string;
    ttlSeconds: number;
    enabled: boolean;
  };
  gateway: {
    url: string;
    secret: string;
  };
  isServer: boolean;
}

export const marketDataConfig: MarketDataConfig = {
  dhan: {
    clientId: process.env.DHAN_CLIENT_ID || "",
    accessToken: process.env.DHAN_ACCESS_TOKEN || "",
    feedUrl: process.env.DHAN_FEED_URL || "wss://api-feed.dhan.co",
    restUrl: process.env.DHAN_BASE_URL || "https://api.dhan.co/v2",
    isSandbox: (process.env.DHAN_SANDBOX || "").toLowerCase() === "true",
  },
  upstox: {
    apiKey: process.env.UPSTOX_API_KEY || "",
    accessToken: process.env.UPSTOX_ACCESS_TOKEN || "",
    feedUrl: process.env.UPSTOX_FEED_URL || "wss://api.upstox.com/v2/feed/market-data-feed",
    restUrl: process.env.UPSTOX_BASE_URL || "https://api.upstox.com/v2",
  },
  delta: {
    apiKey: process.env.DELTA_API_KEY || "",
    apiSecret: process.env.DELTA_API_SECRET || "",
    wsUrl: process.env.DELTA_WS_URL || "wss://socket.india.delta.exchange",
    restUrl: process.env.DELTA_BASE_URL || "https://api.india.delta.exchange",
  },
  redis: {
    url: process.env.REDIS_URL || process.env.REDIS_CACHE_URL || "redis://127.0.0.1:6379",
    keyPrefix: "quantos:market:",
    ttlSeconds: 60,
    enabled: !!(process.env.REDIS_URL || process.env.REDIS_CACHE_URL),
  },
  gateway: {
    url: process.env.MARKET_GATEWAY_URL || "http://127.0.0.1:5051",
    secret: process.env.MARKET_GATEWAY_SECRET || "changeme-set-a-strong-random-secret-here",
  },
  isServer: typeof window === "undefined",
};

export const DHAN_CONFIG = {
  getCredentials: () => {
    let token = "";
    let clientId = "";
    try {
      // Lazy import token manager on server side if available
      const { dhanTokenManager } = require("@/lib/brokers/dhan/token-manager");
      token = dhanTokenManager.getAccessToken();
      clientId = dhanTokenManager.getClientId();
    } catch {}

    return {
      clientId: clientId || process.env.DHAN_CLIENT_ID || "",
      accessToken: token || process.env.DHAN_ACCESS_TOKEN || "",
      feedUrl: process.env.DHAN_FEED_URL || "wss://api-feed.dhan.co",
      restUrl: process.env.DHAN_BASE_URL || "https://api.dhan.co/v2",
      isSandbox: (process.env.DHAN_SANDBOX || "").toLowerCase() === "true",
    };
  },
  hasCredentials: () => {
    const creds = DHAN_CONFIG.getCredentials();
    return Boolean(creds.clientId && creds.accessToken);
  },
};

export function hasDhanCredentials(): boolean {
  return DHAN_CONFIG.hasCredentials();
}


