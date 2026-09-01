/**
 * Alpha Vantage Type Definitions & Normalized Data Interfaces
 * ==========================================================
 * Standardized types for Alpha Vantage integration.
 * Strictly used server-side in Next.js BFF routes and services.
 */

export type DataStatus = "REALTIME" | "DELAYED" | "HISTORICAL" | "RATE_LIMITED" | "UNAVAILABLE";
export type AlphaVantageStatus = "SUCCESS" | "DATA_RATE_LIMITED" | "INVALID_SYMBOL" | "AUTH_ERROR" | "TIMEOUT" | "PROVIDER_ERROR" | "NOT_CONFIGURED";

export interface NormalizedQuote {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  latestTradingDay: string;
  previousClose: number;
  change: number;
  changePercent: number;
  source: "ALPHA_VANTAGE";
  dataStatus: DataStatus;
  timestamp: string;
  isStale?: boolean;
}

export interface NormalizedCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: "ALPHA_VANTAGE";
  dataStatus: DataStatus;
}

export interface NormalizedIndicatorPoint {
  timestamp: string;
  values: Record<string, number>;
}

export interface NormalizedTechnicalIndicator {
  symbol: string;
  indicator: string;
  interval: string;
  timePeriod?: number;
  series: NormalizedIndicatorPoint[];
  source: "ALPHA_VANTAGE";
  dataStatus: DataStatus;
  timestamp: string;
}

export interface NormalizedSentimentFeed {
  symbol?: string;
  title: string;
  url: string;
  timePublished: string;
  summary: string;
  overallSentimentScore: number;
  overallSentimentLabel: string;
  tickerSentiment?: Array<{
    ticker: string;
    relevanceScore: string;
    tickerSentimentScore: string;
    tickerSentimentLabel: string;
  }>;
}

export interface AlphaVantageApiResponse<T> {
  status: AlphaVantageStatus;
  success: boolean;
  data: T | null;
  message?: string;
  isCached?: boolean;
  cachedAt?: string;
  rateLimitRemaining?: number;
  latencyMs?: number;
  timestamp: string;
}

export interface AlphaVantageStatusResponse {
  status: string;
  connected: boolean;
  hasApiKey: boolean;
  apiKeyMasked: string;
  latencyMs: number;
  rateLimit: {
    maxCallsPerMin: number;
    callsMadeThisMin: number;
    isRateLimited: boolean;
    rateLimitedUntil: string | null;
  };
  supportedCapabilities: string[];
  providerRole: "MARKET_DATA_ONLY";
  orderExecutionBroker: "BINANCE_UPSTOX_PAPER_UNMODIFIED";
  timestamp: string;
}
