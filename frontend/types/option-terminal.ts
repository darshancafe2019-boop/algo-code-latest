/**
 * Production Option Chain & Options Flow Terminal - TypeScript Definitions
 */

export type OptionType = "CE" | "PE" | "CALL" | "PUT";

export type Moneyness = "ITM" | "ATM" | "OTM";

export type OIBuildupType =
  | "LONG_BUILDUP"
  | "SHORT_BUILDUP"
  | "LONG_UNWINDING"
  | "SHORT_COVERING"
  | "NEUTRAL";

export type FlowSentiment = "BULLISH" | "BEARISH" | "NEUTRAL";

export type FlowTradeSide = "BUY" | "SELL" | "MID";

export type FlowSignalType =
  | "UNUSUAL_ACTIVITY"
  | "LARGE_ACTIVITY"
  | "SWEEP"
  | "BLOCK"
  | "REGULAR";

export type MarketSessionStatus = "PRE_OPEN" | "OPEN" | "CLOSED" | "POST_MARKET";

export type TerminalViewMode = "STANDARD" | "GREEKS" | "COMPACT" | "FULL";

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho?: number;
  iv: number;
  ivRank?: number;
  ivPercentile?: number;
}

export interface OptionContractQuote {
  symbol: string;
  securityId?: string;
  underlying: string;
  expiry: string;
  strike: number;
  optionType: OptionType;
  ltp: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  bidQty: number;
  askQty: number;
  volume: number;
  oi: number;
  previousOi?: number;
  oiChange: number;
  oiChangePercent: number;
  iv?: number;
  greeks?: OptionGreeks;
  premium?: number;
  moneyness: Moneyness;
  intrinsicValue: number;
  timeValue: number;
  oiBuildup: OIBuildupType;
  volumeOiRatio: number;
  provider?: string;
  brokerAccountId?: string;
  instrumentId?: string;
  timestamp?: number;
}

export interface OptionStrikeRowData {
  strike: number;
  isATM: boolean;
  distanceFromSpot: number;
  distancePct: number;
  moneynessCall: Moneyness;
  moneynessPut: Moneyness;
  call: OptionContractQuote | null;
  put: OptionContractQuote | null;
}

export interface OptionFlowTrade {
  id: string;
  symbol: string;
  underlying: string;
  time: string;
  timestamp: number;
  expiry: string;
  daysToExpiry: number;
  optionType: OptionType;
  side: FlowTradeSide;
  strike: number;
  spotPrice: number;
  moneyness: Moneyness;
  price: number;
  premium: number; // Total turnover = price * size
  size: number;
  lots: number;
  oi: number;
  volumeOiRatio: number;
  iv: number;
  delta: number;
  theta: number;
  sentiment: FlowSentiment;
  sentimentConfidence: number; // 0 to 100%
  signalType: FlowSignalType;
  tradeDetails?: string;
}

export interface PCRMetrics {
  pcrOI: number | null;
  pcrVolume: number | null;
  pcrOIChange: number | null;
  totalCallOI: number;
  totalPutOI: number;
  totalCallVolume: number;
  totalPutVolume: number;
  totalCallOIChange: number;
  totalPutOIChange: number;
}

export interface OptionTerminalSnapshot {
  underlying: string;
  spotPrice: number;
  spotChange: number;
  spotChangePercent: number;
  marketStatus: MarketSessionStatus;
  selectedExpiry: string;
  daysToExpiry: number;
  isWeekly: boolean;
  availableExpiries: Array<{
    expiry: string;
    daysToExpiry: number;
    isWeekly: boolean;
    label: string;
  }>;
  atmStrike: number;
  maxPain: number | null;
  spotVsMaxPainDistance: number | null;
  pcr: PCRMetrics;
  atmIV: number | null;
  ivSkew: {
    callIVAverage: number;
    putIVAverage: number;
    skewPct: number;
  };
  supportZone: {
    strike: number;
    oi: number;
    label: string;
  } | null;
  resistanceZone: {
    strike: number;
    oi: number;
    label: string;
  } | null;
  flowSummary: {
    totalFlowVolume: number;
    totalFlowTurnover: number;
    bullishTurnover: number;
    bearishTurnover: number;
    bullishPercentage: number;
    bearishPercentage: number;
    overallSentiment: FlowSentiment;
    confidence: number;
    unusualTradeCount: number;
  };
  strikes: OptionStrikeRowData[];
  flowTrades: OptionFlowTrade[];
  source: string;
  environment: "LIVE" | "PAPER";
  freshnessStatus: "LIVE" | "RECENT" | "STALE" | "OFFLINE";
  dataAgeMs: number;
  latencyMs: number;
  timestamp: number;
}

export interface ActionableOptionContract {
  broker: "DELTA" | "DHAN" | "UPSTOX" | "PAPER";
  source: string;
  symbol: string;
  productId?: number | string;
  instrumentId?: string;
  securityId?: string;
  underlying: string;
  expiry: string;
  strike: number;
  optionType: OptionType;
  side: "BUY" | "SELL";
  ltp: number;
  bid: number;
  ask: number;
  bidSize?: number;
  askSize?: number;
  markPrice?: number;
  iv?: number;
  lotSize: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  oi?: number;
  volume?: number;
  dataAgeMs?: number;
  freshnessStatus?: "LIVE" | "RECENT" | "STALE" | "OFFLINE";
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orders?: number;
}

export interface OrderBookDepthData {
  broker: string;
  source: string;
  symbol: string;
  underlying: string;
  expiry: string;
  strike: number;
  optionType: OptionType;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  ltp: number;
  markPrice?: number;
  spread: number;
  spreadPct: number;
  totalBidQty: number;
  totalAskQty: number;
  imbalanceRatio: number;
  volume?: number;
  oi?: number;
  iv?: number;
  timestamp: number;
  dataAgeMs: number;
  status: "LIVE" | "STALE" | "DISCONNECTED";
}

export interface OptionPositionInfo {
  symbol: string;
  strike: number;
  optionType: OptionType;
  quantity: number;
  lots: number;
  averagePrice: number;
  ltp: number;
  unrealizedPnl: number;
  realizedPnl?: number;
  pnlPct: number;
  broker: string;
}

export interface ColumnVisibilityConfig {
  oi: boolean;
  oiChange: boolean;
  oiChangePercent: boolean;
  volume: boolean;
  volumeOiRatio: boolean;
  iv: boolean;
  intrinsicValue: boolean;
  timeValue: boolean;
  ltp: boolean;
  change: boolean;
  changePercent: boolean;
  bid: boolean;
  ask: boolean;
  bidQty: boolean;
  askQty: boolean;
  delta: boolean;
  gamma: boolean;
  theta: boolean;
  vega: boolean;
  rho: boolean;
  buildupBadge: boolean;
}

export interface OptionFilterConfig {
  side: "ALL" | "CALLS_ONLY" | "PUTS_ONLY";
  moneyness: "ALL" | "ITM_ONLY" | "ATM_ONLY" | "OTM_ONLY";
  buildup: "ALL" | "LONG_BUILDUP" | "SHORT_BUILDUP" | "LONG_UNWINDING" | "SHORT_COVERING";
  minVolume: number;
  minOI: number;
  unusualOnly: boolean;
  sentiment: "ALL" | "BULLISH" | "BEARISH" | "NEUTRAL";
  minPremium: number;
}

