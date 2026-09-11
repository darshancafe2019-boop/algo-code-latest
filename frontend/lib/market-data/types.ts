/**
 * Centralized Live Market Data Engine - TypeScript Definitions
 */

export type BrokerProvider = "dhan" | "upstox" | "delta" | "binance" | "angelone" | "fyers";

export type ExchangeSegment =
  | "IDX_I"
  | "NSE_EQ"
  | "NSE_FNO"
  | "NSE_CURR"
  | "BSE_EQ"
  | "BSE_FNO"
  | "BSE_CURR"
  | "MCX_COMM"
  | "DELTA_PERP"
  | "BINANCE_FUTURES";

export type InstrumentType = "EQUITY" | "INDEX" | "FUTURES" | "OPTION" | "CRYPTO_PERP";

export type FreshnessStatus = "LIVE" | "RECENT" | "FRESH" | "STALE" | "EXPIRED" | "MISSING" | "INVALID";

export type ConnectionState =
  | "CONNECTING"
  | "CONNECTED"
  | "AUTHENTICATING"
  | "SUBSCRIBING"
  | "LIVE"
  | "DEGRADED"
  | "STALE"
  | "DISCONNECTED"
  | "RECONNECTING"
  | "ERROR";

export type CandleTimeframe = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1D";

export interface DepthLevel {
  price: number;
  quantity: number;
  ordersCount?: number;
}

export interface MarketDepth {
  bids: DepthLevel[];
  asks: DepthLevel[];
  spread: number;
  spreadPct: number;
  totalBidQty: number;
  totalAskQty: number;
  imbalanceRatio: number;
  timestamp: number;
}

export interface MarketTick {
  provider: BrokerProvider;
  exchange: ExchangeSegment;
  securityId: string;
  symbol: string;
  tradingSymbol?: string;
  timestamp: number;
  exchangeTimestamp: number;
  receivedTimestamp: number;

  ltp: number;
  lastTradedQuantity?: number;
  averagePrice?: number;

  open?: number;
  high?: number;
  low?: number;
  close?: number;
  previousClose?: number;
  change?: number;
  changePct?: number;

  volume: number;

  bid?: number;
  ask?: number;
  bidQuantity?: number;
  askQuantity?: number;

  openInterest?: number;
  oiHigh?: number;
  oiLow?: number;
  oiChange?: number;

  marketDepth?: MarketDepth;

  source: "WEBSOCKET" | "REST" | "SYNTHETIC";
  sequence?: number;
  freshness: FreshnessStatus;
  ageMs: number;
  isValid: boolean;
  status?: "VALID" | "ANOMALY" | "DROPPED";
}

export interface NormalizedQuote {
  symbol: string;
  exchange: string;
  provider: BrokerProvider;
  last_price: number;
  bid: number;
  ask: number;
  volume: number;
  high: number | null;
  low: number | null;
  open: number | null;
  close: number | null;
  change_pct: number | null;
  vwap: number | null;
  open_interest?: number;
  event_timestamp: string;
  received_timestamp: string;
  feed_latency_ms: number;
  data_mode: "REAL_TIME" | "DELAYED" | "EOD" | "CACHED";
  is_stale: boolean;
  age_seconds: number;
  freshness_status: FreshnessStatus;
}

export interface OHLCVCandle {
  symbol: string;
  timeframe: CandleTimeframe;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradesCount?: number;
  isClosed: boolean;
  formingProgressPct?: number;
}

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho?: number;
  iv: number;
  ivRank?: number;
}

export interface OptionStrikeData {
  strikePrice: number;
  isATM: boolean;
  distancePct: number;
  call: {
    symbol: string;
    securityId: string;
    ltp: number;
    bid: number;
    ask: number;
    volume: number;
    openInterest: number;
    oiChange: number;
    greeks?: OptionGreeks;
  } | null;
  put: {
    symbol: string;
    securityId: string;
    ltp: number;
    bid: number;
    ask: number;
    volume: number;
    openInterest: number;
    oiChange: number;
    greeks?: OptionGreeks;
  } | null;
}

export interface OptionChainSnapshot {
  underlying: string;
  underlyingPrice: number;
  expiryDate: string;
  availableExpiries: string[];
  strikes: OptionStrikeData[];
  pcr: {
    pcrOI: number;
    pcrVolume: number;
    totalCallOI: number;
    totalPutOI: number;
    totalCallVolume: number;
    totalPutVolume: number;
  };
  maxPain: number;
  atmIV: number;
  timestamp: number;
  freshness: FreshnessStatus;
}

export interface InstrumentMasterRecord {
  symbol: string;
  tradingSymbol: string;
  securityId: string;
  exchange: ExchangeSegment;
  provider: BrokerProvider;
  instrumentType: InstrumentType;
  lotSize: number;
  tickSize: number;
  underlying?: string;
  strikePrice?: number;
  expiryDate?: string;
  optionType?: "CE" | "PE";
  feedMode?: number;
}

export type FeedMode = "ltpc" | "option_greeks" | "full" | "full_d30";

export type UpstoxAuthState =
  | "TOKEN_MISSING"
  | "TOKEN_PRESENT"
  | "TOKEN_INVALID"
  | "REST_AUTHENTICATED"
  | "WS_AUTHORIZED"
  | "WS_CONNECTING"
  | "WS_CONNECTED"
  | "SUBSCRIBING"
  | "SUBSCRIBED"
  | "LIVE_STREAMING"
  | "STALE"
  | "DISCONNECTED"
  | "RECONNECTING"
  | "FAILED";

export interface ProviderHealthEntry {
  provider: BrokerProvider;
  name: string;
  state: ConnectionState;
  authState?: UpstoxAuthState | string;
  restAuth?: "OK" | "FAIL" | "NOT_CONFIGURED" | "AUTH_REQUIRED";
  websocketAuth?: "OK" | "FAIL" | "PENDING";
  websocketConnection?: "CONNECTED" | "DISCONNECTED" | "CONNECTING" | "DEGRADED";
  subscription?: "OK" | "PARTIAL" | "NONE";
  connectedSockets: number;
  subscribedCount: number;
  ticksPerSec: number;
  latencyMs: number;
  lastMessageTime: number;
  lastTickTime?: number;
  tickCount?: number;
  dataFreshness?: FreshnessStatus;
  errorCount: number;
  lastError?: string;
}

export interface MarketDataMetrics {
  ticksReceivedTotal: number;
  messagesReceivedTotal: number;
  bytesReceivedTotal: number;
  decodeErrorsTotal: number;
  staleTicksCount: number;
  currentTicksPerSec: number;
  averageLatencyMs: number;
  maxLatencyMs: number;
  activeSocketsCount: number;
  activeSubscriptionsCount: number;
  lastSuccessfulTickTimestamp: number;
}

