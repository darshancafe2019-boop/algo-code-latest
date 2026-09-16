/**
 * Upstox Integration Type Definitions
 * ===================================
 * Complete TypeScript models for Upstox V2/V3 REST & WebSocket APIs,
 * Normalized Market Data, Option Chains, Greeks, and Health Diagnostics.
 */

export type UpstoxMarket = "INDIA";
export type UpstoxExchange = "NSE_EQ" | "NSE_FO" | "NSE_INDEX" | "BSE_EQ" | "BSE_FO" | "MCX_FO";
export type UpstoxSegment = "CASH" | "INDEX" | "FUTURES" | "OPTIONS" | "COMMODITY";
export type UpstoxFeedMode = "ltpc" | "option_greeks" | "full" | "full_d30";
export type UpstoxFeedStatus = "LIVE" | "DELAYED" | "STALE" | "MARKET_CLOSED" | "DISCONNECTED" | "AUTH_REQUIRED";
export type UpstoxWsState = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "RECONNECTING" | "STALE" | "ERROR";
export type UpstoxCandleInterval = "1m" | "5m" | "15m" | "30m" | "1h" | "1d";

// ─── Independent Core State Classifications ──────────────────────────────────
export type UpstoxConnectionState = "CONNECTED" | "CONNECTING" | "RECONNECTING" | "DISCONNECTED" | "ERROR";
export type UpstoxMarketPhase = "PRE_OPEN" | "NORMAL_OPEN" | "CLOSING_AUCTION" | "CLOSING_SESSION" | "CLOSED";
export type UpstoxPriceState = "LIVE_TRADE" | "LAST_TRADED" | "INDICATIVE" | "STALE" | "NO_DATA";

export interface UpstoxCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken?: string;
  redirectUri: string;
  analyticsToken?: string;
  tradingEnabled: boolean;
  paperMode: boolean;
}

export interface UpstoxTokenResolution {
  token: string | null;
  tokenType: "ANALYTICS" | "OAUTH" | "NONE";
  isValid: boolean;
  error?: string;
}

export interface NormalizedLtp {
  provider: "UPSTOX";
  instrumentKey: string;
  symbol: string;
  ltp: number;
  previousClose: number;
  lastTradeTime: string;
  receivedAt: string;
  source: "LIVE" | "SNAPSHOT" | "CACHED";
  change?: number;
  changePct?: number;
  indicativePrice?: number | null;
  marketPhase?: UpstoxMarketPhase;
  priceState?: UpstoxPriceState;
}

export interface NormalizedMarketDepthLevel {
  bidPrice: number;
  bidQty: number;
  bidOrders: number;
  askPrice: number;
  askQty: number;
  askOrders: number;
}

export interface NormalizedOptionGreeks {
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  rho: number | null;
}

export interface NormalizedQuote {
  provider: "UPSTOX" | "DHAN";
  instrumentKey: string;
  symbol: string;
  exchange: string;
  segment: string;
  ltp: number;
  ltq: number;
  lastTradeTime: string;
  previousLtt?: number | null;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  close: number;
  indicativePrice?: number | null;
  volume: number;
  oi: number;
  iv: number | null;
  bid: number;
  bidQty: number;
  ask: number;
  askQty: number;
  marketDepth: NormalizedMarketDepthLevel[];
  greeks: NormalizedOptionGreeks;
  exchangeTimestamp: string;
  receivedAt: string;
  sourceTimestamp?: string;
  ageMs: number;
  stale: boolean;
  status: UpstoxFeedStatus;
  connectionState: UpstoxConnectionState;
  marketPhase: UpstoxMarketPhase;
  priceState: UpstoxPriceState;
  isTradable: boolean;
}

export interface NormalizedMarketTick {
  provider: "upstox" | "dhan";
  instrumentKey: string;
  symbol: string;
  ltp: number | null;
  previousClose: number | null;
  lastTradeTime: number | null;
  receivedAt: number;
  indicativePrice?: number | null;
  connectionState: UpstoxConnectionState;
  marketPhase: UpstoxMarketPhase;
  priceState: UpstoxPriceState;
  isTradable: boolean;
  ageMs: number | null;
}

export interface UpstoxInstrument {
  instrumentKey: string;
  exchange: string;
  segment: string;
  symbol: string;
  tradingSymbol: string;
  name: string;
  isin?: string;
  expiry?: string;
  strike?: number;
  strikePrice?: number;
  instrumentType?: "EQUITY" | "INDEX" | "FUTURE" | "OPTION" | "FUT" | "CE" | "PE" | "UNKNOWN" | string;
  optionType?: "CE" | "PE";
  underlyingKey?: string;
  underlyingSymbol?: string;
  lotSize: number;
  tickSize: number;
}

export interface NormalizedCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi?: number;
}

export interface OptionContractLeg {
  instrumentKey: string;
  tradingSymbol?: string;
  ltp: number | null;
  bid: number | null;
  ask: number | null;
  volume: number | null;
  oi: number | null;
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  change?: number | null;
  changePct?: number | null;
}

export interface NormalizedOptionChainStrike {
  strike: number;
  expiry: string;
  isAtm: boolean;
  call: OptionContractLeg;
  put: OptionContractLeg;
}

export interface NormalizedOptionChainResponse {
  provider: "UPSTOX";
  underlying: string;
  underlyingLtp: number;
  expiry: string;
  availableExpiries: string[];
  atmStrike: number;
  strikes: NormalizedOptionChainStrike[];
  timestamp: string;
}

export interface UpstoxExchangeStatus {
  exchange: string;
  status: "OPEN" | "CLOSED" | "PRE_OPEN" | "POST_CLOSE";
  phase: UpstoxMarketPhase;
  marketHours: string;
  isOpen: boolean;
  lastChecked: string;
}

export interface UpstoxHealthReport {
  provider: "UPSTOX";
  configured: boolean;
  authenticated: boolean;
  tokenType: "ANALYTICS" | "OAUTH" | "NONE";
  restApi: "healthy" | "error" | "unauthenticated";
  websocket: UpstoxWsState;
  connectionState: UpstoxConnectionState;
  marketStatus: "OPEN" | "CLOSED";
  marketPhase: UpstoxMarketPhase;
  subscriptions: number;
  lastTickAt: string | null;
  stale: boolean;
  paperMode: boolean;
  tradingEnabled: boolean;
  timestamp: string;
  // Truthful per-instrument breakdown
  liveTradeCount: number;
  closingAuctionCount: number;
  lastTradedCount: number;
  staleCount: number;
}
