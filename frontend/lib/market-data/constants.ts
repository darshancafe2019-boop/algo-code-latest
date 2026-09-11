/**
 * Centralized Live Market Data Engine - Constants & Protocol Enums
 */

import { CandleTimeframe, ExchangeSegment, FreshnessStatus } from "./types";

// DhanHQ V2 Binary Packet Response Codes
export const DHAN_RESPONSE_CODES = {
  INDEX: 1,
  TICKER: 2,
  QUOTE: 4,
  OPEN_INTEREST: 5,
  PREV_CLOSE: 6,
  MARKET_STATUS: 7,
  FULL_DEPTH: 8,
  DISCONNECT: 50,
} as const;

// DhanHQ V2 Binary Subscription Request Codes
export const DHAN_REQUEST_CODES = {
  SUBSCRIBE_DEPTH: 15,
  SUBSCRIBE_TICKER: 17,
  SUBSCRIBE_QUOTE: 18,
  SUBSCRIBE_FULL: 19,
  UNSUBSCRIBE: 20,
  SUBSCRIBE_OI: 21,
} as const;

// DhanHQ V2 Exchange Segment Map
export const DHAN_EXCHANGE_SEGMENTS: Record<number, ExchangeSegment> = {
  0: "IDX_I",
  1: "NSE_EQ",
  2: "NSE_FNO",
  3: "NSE_CURR",
  4: "BSE_EQ",
  5: "MCX_COMM",
  7: "BSE_FNO",
  8: "BSE_CURR",
};

export const EXCHANGE_SEGMENT_TO_DHAN_CODE: Record<ExchangeSegment, number> = {
  IDX_I: 0,
  NSE_EQ: 1,
  NSE_FNO: 2,
  NSE_CURR: 3,
  BSE_EQ: 4,
  MCX_COMM: 5,
  BSE_FNO: 7,
  BSE_CURR: 8,
  DELTA_PERP: 99,
  BINANCE_FUTURES: 98,
};

// Freshness Thresholds in Milliseconds
export const FRESHNESS_THRESHOLDS_MS = {
  LIVE_MAX_MS: 2000,       // 0–2 seconds: Real-time Live
  FRESH_MAX_MS: 5000,      // 2–5 seconds: Fresh
  STALE_MAX_MS: 15000,     // 5–15 seconds: Stale
  EXPIRED_MAX_MS: 30000,   // >15 seconds: Expired / Stalled
} as const;

// Standard Timeframes and their millisecond duration
export const TIMEFRAME_TO_MS: Record<CandleTimeframe, number> = {
  "1m": 60 * 1000,
  "3m": 3 * 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1D": 24 * 60 * 60 * 1000,
};

// Dhan WebSocket Limits
export const DHAN_WS_LIMITS = {
  MAX_CONNECTIONS: 5,
  MAX_INSTRUMENTS_PER_CONNECTION: 5000,
  MAX_INSTRUMENTS_PER_SUBSCRIBE_PACKET: 100,
  HEARTBEAT_INTERVAL_MS: 20000,
  STALE_SILENCE_TIMEOUT_MS: 25000,
  RECONNECT_DELAYS_MS: [1000, 2000, 4000, 8000, 16000, 30000],
} as const;
