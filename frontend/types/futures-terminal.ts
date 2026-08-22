export type DataQualityStatus = "LIVE" | "DELAYED" | "STALE" | "DISCONNECTED";

export interface CanonicalFuturesContract {
  contract_id: string;
  exchange: string;
  symbol: string;
  display_symbol: string;
  canonical_symbol: string;
  contract_name: string;
  underlying: string;
  base_asset: string;
  quote_asset: string;
  settlement_asset: "USDT_LINEAR" | "USDC_LINEAR" | "COIN_INVERSE";
  contract_type: "PERPETUAL" | "DATED_FUTURES";
  expiry: string;
  days_to_expiry: number;
  is_perpetual: boolean;
  last_price: number;
  mark_price: number;
  index_price: number;
  bid: number;
  ask: number;
  spread: number;
  spread_pct: number;
  basis: number;
  basis_pct: number;
  annualized_basis_pct: number;
  funding_rate: number;
  funding_rate_pct: number;
  predicted_funding_rate_pct: number;
  funding_countdown: string;
  next_funding_time: string;
  open_interest: number;
  open_interest_usd: number;
  volume_24h: number;
  change_24h: number;
  high_24h: number;
  low_24h: number;
  contract_size: number;
  tick_size: number;
  quantity_step: number;
  min_quantity: number;
  max_leverage: number;
  margin_modes: ("ISOLATED" | "CROSS")[];
  data_source: string;
  status: DataQualityStatus;
  data_age_ms: number;
  updated_at: string;
}

export interface TermStructurePoint {
  label: string;
  expiry: string;
  days_to_expiry: number;
  price: number;
  mark_price?: number;
  basis: number;
  annualized_basis_pct: number;
  contract_type: string;
  contract_id?: string;
}

export interface TermStructureResponse {
  status: string;
  underlying: string;
  spot_price: number;
  regime: "CONTANGO" | "BACKWARDATION" | "FLAT";
  regime_description: string;
  curve_points: TermStructurePoint[];
  total_points: number;
  updated_at: string;
}

export interface FundingHeatmapRate {
  funding_rate: number;
  funding_rate_pct: number;
  apr_pct: number;
  sentiment: "BULLISH_CROWDED" | "BEARISH_CROWDED" | "NEUTRAL";
  countdown: string;
  interval: string;
}

export interface FundingHeatmapResponse {
  status: string;
  exchanges: string[];
  assets: string[];
  matrix: {
    underlying: string;
    rates: Record<string, FundingHeatmapRate>;
  }[];
  updated_at: string;
}

export interface OpenInterestAnalyticsResponse {
  status: string;
  underlying: string;
  current_oi: number;
  open_interest_usd: number;
  oi_change_24h_pct: number;
  price_change_24h_pct: number;
  interpretation: string;
  explanation: string;
  signal_bias: "BULLISH" | "BEARISH" | "NEUTRAL_BULLISH" | "BEARISH_CAPITULATION";
  oi_trend_7d: string;
  updated_at: string;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total_usd: number;
  cumulative_quantity: number;
}

export interface OrderBookResponse {
  status: string;
  contract_id: string;
  underlying: string;
  best_bid: number;
  best_ask: number;
  spread: number;
  spread_pct: number;
  imbalance_ratio: number;
  imbalance_sentiment: "BUY_PRESSURE" | "SELL_PRESSURE" | "BALANCED";
  total_bid_depth: number;
  total_ask_depth: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: string;
}

export interface RiskPrecheckStage {
  stage: number;
  name: string;
  status: "PASS" | "WARNING" | "FAILED";
  description: string;
}

export interface TrueBreakEvenMetrics {
  entry_price: number;
  break_even_price: number;
  break_even_distance_pct: number;
  estimated_opening_fee: number;
  estimated_closing_fee: number;
  estimated_funding_drag: number;
  total_execution_drag: number;
  estimated_liquidation_price: number;
  liquidation_distance_pct: number;
}

export interface RiskPrecheckResponse {
  status: string;
  verdict: "APPROVED" | "APPROVED_WITH_WARNINGS" | "REJECTED";
  approved: boolean;
  stages: RiskPrecheckStage[];
  pass_count: number;
  warning_count: number;
  failed_count: number;
  margin_required: number;
  notional_value: number;
  estimated_risk_usd: number;
  break_even: TrueBreakEvenMetrics;
  decision?: string;
  reasons?: string[];
  timestamp: string;
}

export interface FuturesOrderRecord {
  id?: number;
  order_id: string;
  bot_id: string;
  symbol: string;
  canonical_symbol: string;
  underlying: string;
  instrument_type: string;
  side: "BUY" | "SELL";
  order_type: "MARKET" | "LIMIT" | "STOP_MARKET" | "STOP_LIMIT" | "TRAILING_STOP";
  quantity: number;
  price: number;
  stop_loss?: number;
  take_profit?: number;
  leverage: number;
  margin: number;
  margin_mode?: "ISOLATED" | "CROSS";
  status: "FILLED" | "PENDING" | "CANCELLED" | "REJECTED";
  execution_mode: "PAPER" | "LIVE";
  created_at: string;
  filled_at?: string;
  remarks?: string;
  client_order_id?: string;
  idempotency_key?: string;
}

export interface FuturesPositionRecord {
  id?: number;
  position_id: string;
  bot_id: string;
  symbol: string;
  canonical_symbol: string;
  underlying: string;
  instrument_type: string;
  side: "BUY" | "SELL";
  quantity: number;
  entry_price: number;
  current_price: number;
  mark_price: number;
  leverage: number;
  liquidation_price: number;
  margin: number;
  unrealized_pnl: number;
  realized_pnl: number;
  status: "OPEN" | "CLOSED" | "LIQUIDATED";
  opened_at: string;
  updated_at: string;
}
