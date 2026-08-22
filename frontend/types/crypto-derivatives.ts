export type DataQualityStatus = "LIVE" | "DELAYED" | "STALE" | "DISCONNECTED";
export type DataProvenance = "EXCHANGE DATA" | "CALCULATED" | "NOT SUPPORTED BY PROVIDER";

export interface CryptoFuture {
  provider: string;
  exchange: string;
  symbol: string;
  canonical_symbol: string;
  underlying: string;
  contract_name: string;
  contract_type: "PERPETUAL" | "DATED_FUTURES";
  settlement_type: string;
  expiry: string;
  last_price: number;
  mark_price: number;
  index_price: number;
  bid: number;
  ask: number;
  spread: number;
  volume_24h: number;
  open_interest: number;
  funding_rate: number;
  funding_rate_pct: number;
  funding_countdown: string;
  change_24h: number;
  high_24h: number;
  low_24h: number;
  basis: number;
  basis_pct: number;
  contract_size: number;
  max_leverage: number;
  status: DataQualityStatus;
  provenance: DataProvenance;
  timestamp: string;
}

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface OptionContract {
  symbol: string;
  canonical_symbol: string;
  underlying: string;
  expiry: string;
  strike: number;
  option_type: "CALL" | "PUT";
  ltp: number;
  bid: number;
  ask: number;
  volume: number;
  open_interest: number;
  oi_change: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  mark_price: number;
  index_price: number;
  underlying_price: number;
  greeks_source: DataProvenance;
  status: DataQualityStatus;
  timestamp: string;
  moneyness?: "ITM" | "ATM" | "OTM";
  is_highest_oi?: boolean;
}

export interface StrikeRow {
  strike: number;
  is_atm: boolean;
  distance_spot: number;
  distance_spot_pct: number;
  call: OptionContract | null;
  put: OptionContract | null;
}

export interface OptionChainResponse {
  status: string;
  provider: string;
  underlying: string;
  spot_price: number;
  selected_expiry: string;
  available_expiries: string[];
  days_to_expiry: number;
  atm_strike: number;
  max_pain: number;
  expected_move: number;
  expected_move_pct: number;
  pcr: {
    pcr_oi: number;
    pcr_volume: number;
    total_call_oi: number;
    total_put_oi: number;
    total_call_volume: number;
    total_put_volume: number;
  };
  highlights: {
    max_call_oi_strike: number;
    max_put_oi_strike: number;
    max_call_oi: number;
    max_put_oi: number;
  };
  total_available_strikes: number;
  visible_strikes_count: number;
  strikes: StrikeRow[];
  timestamp: string;
}

export interface CryptoMarketOverviewItem {
  underlying: string;
  display_name: string;
  spot_price: number;
  futures_price: number;
  mark_price: number;
  basis: number;
  basis_pct: number;
  funding_rate_pct: number;
  funding_countdown: string;
  open_interest: number;
  change_24h: number;
  active_expiries_count: number;
  nearest_expiry: string;
}

export interface OptionStrategyLeg {
  leg_id: string;
  action: "BUY" | "SELL";
  option_type: "CALL" | "PUT";
  strike: number;
  expiry: string;
  premium: number;
  quantity: number;
  iv?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
}

export interface OptionStrategyPayoffPoint {
  underlying_price: number;
  pnl: number;
  pnl_pct: number;
}

export interface OptionStrategyEvaluation {
  status: string;
  strategy_name: string;
  underlying: string;
  spot_price: number;
  legs_count: number;
  legs: OptionStrategyLeg[];
  nature: "NET DEBIT" | "NET CREDIT";
  net_premium: number;
  net_cash_flow: number;
  max_profit: number | "UNLIMITED";
  max_loss: number | "UNLIMITED";
  risk_reward_ratio: number | string;
  breakevens: number[];
  aggregate_greeks: OptionGreeks;
  payoff_curve: OptionStrategyPayoffPoint[];
  provenance: string;
}

export interface DerivativeOrder {
  id?: number;
  order_id: string;
  bot_id: string;
  symbol: string;
  canonical_symbol: string;
  underlying: string;
  instrument_type: "FUTURES" | "OPTIONS";
  side: "BUY" | "SELL";
  order_type: "MARKET" | "LIMIT";
  quantity: number;
  price: number;
  stop_loss?: number;
  take_profit?: number;
  leverage: number;
  margin: number;
  status: "FILLED" | "PENDING" | "REJECTED" | "CANCELLED";
  execution_mode: "PAPER" | "LIVE";
  created_at: string;
  filled_at?: string;
  remarks?: string;
}

export interface DerivativePosition {
  id?: number;
  position_id: string;
  bot_id: string;
  symbol: string;
  canonical_symbol: string;
  underlying: string;
  instrument_type: "FUTURES" | "OPTIONS";
  side: "BUY" | "SELL";
  quantity: number;
  entry_price: number;
  current_price: number;
  mark_price: number;
  leverage: number;
  liquidation_price?: number;
  margin: number;
  unrealized_pnl: number;
  realized_pnl: number;
  status: "OPEN" | "CLOSED";
  opened_at: string;
  closed_at?: string;
  updated_at: string;
}
