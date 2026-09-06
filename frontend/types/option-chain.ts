export type Moneyness = "ITM" | "ATM" | "OTM";

export type OptionSource = "ALL" | "DHAN" | "UPSTOX" | "DELTA" | "DELTA_INDIA" | "BINANCE" | "PAPER_SIMULATOR";

export interface OptionContract {
  instrumentId: string;
  provider: "DHAN" | "UPSTOX" | "DELTA" | "BINANCE" | "PAPER_SIMULATOR";
  providerInstrumentId: string;
  underlying: string;
  expiry: string;
  strike: number;
  optionType: "CALL" | "PUT" | "CE" | "PE";
  bid: number | null;
  ask: number | null;
  bidQty: number | null;
  askQty: number | null;
  last: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  openInterest: number | null;
  oiChange: number | null;
  impliedVolatility: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  rho: number | null;
  underlyingPrice: number | null;
  exchangeTimestamp: number | null;
  receivedTimestamp: number;
  status: "LIVE" | "STALE" | "UNAVAILABLE";
}

export type FreshnessStatus =
  | "CONNECTED"
  | "CONNECTING"
  | "DISCONNECTED"
  | "STALE"
  | "ERROR"
  | "RECONCILIATION_REQUIRED"
  | "AUTHENTICATION_FAILED"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "LIVE"
  | "DEGRADED";

export interface OptionContractQuote {
  ltp: number;
  bid: number;
  ask: number;
  spread: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho?: number;
  open_interest: number;
  oi_change?: number;
  oi_change_pct?: number;
  volume: number;
  moneyness: Moneyness;
  in_the_money?: boolean;
  strike?: number;
  // 8-Tier Provenance & Identification
  department?: string;
  sourceName?: string;
  instrumentId?: string;
  instrument_id?: string;
  symbol?: string;
  underlying?: string;
  expiry?: string;
  provider?: string;
  sourceProvider?: string;
  brokerId?: string;
  brokerAccountId?: string;
  brokerAccountAlias?: string;
  environment?: "PAPER" | "LIVE";
  exchange?: string;
  segment?: string;
  currency?: string;
  dataFeed?: "REST" | "WEBSOCKET";
  receivedTimestamp?: string;
  exchangeTimestamp?: string;
  lastUpdated?: string;
  dataAgeMs?: number;
  latencyMs?: number;
  freshnessStatus?: FreshnessStatus;
  connectionStatus?: string;
  isExecutable?: boolean;
  rejectionReason?: string | null;
  contractKey?: string;
  streamKey?: string;
  greeks_source?: "PROVIDER" | "CALCULATED";
  markPrice?: number;
  change?: number;
  changePct?: number;
}

export interface OptionStrikeRow {
  strike: number;
  is_atm: boolean;
  distance_pct: number;
  ce: OptionContractQuote;
  pe: OptionContractQuote;
}

export interface PCRMetrics {
  pcr_oi: number;
  pcr_volume: number;
  total_call_oi: number;
  total_put_oi: number;
  total_call_volume: number;
  total_put_volume: number;
}

export interface BackendExpiryRecord {
  id?: number | string;
  underlying_symbol?: string;
  expiry_date: string;
  settlement_time?: string;
  days_to_expiry?: number;
  is_active?: boolean;
  last_synced_at?: string;
}

export type RawExpiryItem = string | BackendExpiryRecord;

export interface NormalizedExpiryOption {
  key: string;
  value: string;
  label: string;
  dateString: string;
  daysToExpiry?: number;
  isActive: boolean;
  raw: RawExpiryItem;
}

export interface OptionChainDiagnostics {
  total_received: number;
  accepted: number;
  updated: number;
  deduplicated: number;
  rejected: number;
  rejection_reasons: Record<string, number>;
  last_successful_update: string;
}

export interface ProviderSourceStatus {
  provider: OptionSource | string;
  name: string;
  account_alias: string;
  exchange: string;
  segment: string;
  feed: string;
  status: FreshnessStatus;
  latency_ms: number;
  last_update: string;
}

export interface OptionChainData {
  status: string;
  underlying: string;
  spot_price: number;
  spot_change_24h?: number;
  selected_expiry: string;
  available_expiries: RawExpiryItem[];
  strike_count: number;
  total_available_strikes: number;
  max_pain: number;
  pcr: PCRMetrics;
  strikes: OptionStrikeRow[];
  data_status?: FreshnessStatus;
  freshnessStatus?: FreshnessStatus;
  latency_ms?: number;
  latencyMs?: number;
  dataAgeMs?: number;
  provider?: string;
  brokerAccountId?: string;
  brokerAccountAlias?: string;
  environment?: "PAPER" | "LIVE";
  dataFeed?: "REST" | "WEBSOCKET";
  exchange?: string;
  segment?: string;
  currency?: string;
  streamKey?: string;
  diagnostics?: OptionChainDiagnostics;
  sources?: Record<string, OptionChainData>;
  is_live?: boolean;
  is_stale?: boolean;
  atm_strike?: number;
}

export interface StrategyLeg {
  leg_id: string;
  action: "BUY" | "SELL";
  option_type: "CE" | "PE";
  strike: number;
  expiry: string;
  lots: number;
  quantity: number;
  premium: number;
  iv?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface MultiLegPayoff {
  strategy_name: string;
  underlying: string;
  spot_price: number;
  legs: StrategyLeg[];
  max_profit: number | "UNLIMITED";
  max_loss: number | "UNLIMITED";
  breakevens: number[];
  net_premium: number;
  net_delta: number;
  net_gamma: number;
  net_theta: number;
  net_vega: number;
  required_margin: number;
  risk_reward_ratio: number | string;
}
