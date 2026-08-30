export type Moneyness = "ITM" | "ATM" | "OTM";

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
  data_status?: "LIVE" | "STALE" | "DEGRADED" | "DISCONNECTED";
  latency_ms?: number;
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
