export type DeltaConnectionStatus =
  | "LIVE"
  | "DELAYED"
  | "STALE"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "UNAVAILABLE";

export type DeltaOptionSide = "CALL" | "PUT";

export interface DeltaOptionContract {
  productId: number | null;
  symbol: string;
  underlying: string;
  expiry: string;
  strike: number | null;
  optionType: "CALL" | "PUT";

  ltp: number | null;
  markPrice: number | null;
  spotPrice: number | null;

  bid: number | null;
  ask: number | null;
  bidSize: number | null;
  askSize: number | null;

  volume: number | null;
  openInterest: number | null;

  iv: number | null;
  bidIv: number | null;
  askIv: number | null;

  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  rho: number | null;

  high: number | null;
  low: number | null;
  close: number | null;

  change24h: number | null;

  source: "DELTA";
  sourceTimestamp: number | null;
  receivedAt: number;
  status: DeltaConnectionStatus;
}

export interface DeltaExpiryItem {
  underlying: string;
  expiryIso: string;          // YYYY-MM-DD (e.g. "2026-09-18")
  expiryDisplay: string;      // e.g. "18 Sep 2026"
  expiryApiFormat: string;    // DD-MM-YYYY (e.g. "18-09-2026")
  expiryWsFormat: string;     // DDMMYY (e.g. "180926")
  daysToExpiry: number;
  contractCount: number;
  callCount: number;
  putCount: number;
  firstStrike: number | null;
  lastStrike: number | null;
  state: string;
  status: "LIVE" | "UPCOMING" | "STALE";
  category?: "TODAY" | "TOMORROW" | "THIS_WEEK" | "WEEKLY" | "MONTHLY" | "QUARTERLY";
}

export interface DeltaExpiryRegistry {
  underlying: string;
  expiries: DeltaExpiryItem[];
  allUnderlyings: string[];
  lastUpdated: number;
  source: "DELTA";
  status: "LIVE" | "STALE" | "ERROR";
}

export interface DeltaOptionChainRow {
  strike: number;
  call: DeltaOptionContract | null;
  put: DeltaOptionContract | null;
  isAtm?: boolean;
  distancePct?: number;
}

export interface DeltaChainSnapshot {
  source: "DELTA_EXCHANGE";
  broker: "DELTA";
  underlying: string;
  expiry: string;
  selectedExpiry: string;
  availableExpiries: DeltaExpiryItem[];
  allUnderlyings: string[];

  spotPrice: number | null;
  atmStrike: number | null;

  contractsCount: number;
  callsCount: number;
  putsCount: number;
  strikesCount: number;

  rows: DeltaOptionChainRow[];
  strikes: DeltaOptionChainRow[];

  status: DeltaConnectionStatus;
  wsSubscriptionSymbol: string;
  lastUpdated: number;
  latencyMs: number;
}

// Backwards-compatibility type aliases
export type DeltaOptionLeg = {
  source: "DELTA_EXCHANGE";
  broker: "DELTA";
  symbol: string;
  productId: number;

  underlying: string;
  expiry: string;
  strike: number;
  side: DeltaOptionSide;

  spot: number | null;
  mark: number | null;

  bid: number | null;
  ask: number | null;
  bidSize: number | null;
  askSize: number | null;

  askIv: number | null;
  bidIv: number | null;
  markIv: number | null;

  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  rho: number | null;

  openInterest: number | null;
  volume: number | null;

  exchangeTs: number | null;
  receivedAt: number;

  status: DeltaConnectionStatus;
};

export type OptionChainRow = {
  strike: number;
  call: DeltaOptionLeg | null;
  put: DeltaOptionLeg | null;
};

export type DeltaOptionChainSnapshot = {
  source: "DELTA_EXCHANGE";
  broker: "DELTA";
  underlying: string;
  expiry: string;

  spot: number | null;
  atmStrike: number | null;

  contracts: number;
  rows: OptionChainRow[];

  status: DeltaConnectionStatus;

  exchangeTs: number | null;
  receivedAt: number;
};
