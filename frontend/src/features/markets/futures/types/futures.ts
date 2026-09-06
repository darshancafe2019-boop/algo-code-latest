/**
 * Modular Futures Universe TypeScript Definitions
 * ================================================
 * Institutional types for Futures contracts, funding rates, basis arbitrage,
 * exact source identification, broker segregation, and provider health.
 */

export type FuturesContractType =
  | "PERPETUAL"
  | "QUARTERLY"
  | "MONTHLY"
  | "INDEX_FUTURES"
  | "STOCK_FUTURES"
  | "COMMODITY_FUTURES";

export type MarketVenue =
  | "BINANCE"
  | "BINANCE_USDM"
  | "BINANCE_COINM"
  | "DELTA_EXCHANGE"
  | "UPSTOX_NSE"
  | "DHAN_NSE"
  | "CME"
  | "DERIBIT"
  | "PAPER_SIM";

export type MarginMode = "CROSS" | "ISOLATED";

export interface FundingRateData {
  symbol: string;
  venue: MarketVenue | string;
  funding_rate_8h?: number | null;
  funding_rate_annualized?: number | null;
  predicted_next_rate?: number | null;
  next_funding_time?: string | null;
  countdown_seconds?: number | null;
  historical_avg_7d?: number | null;
}

export interface BasisData {
  symbol: string;
  spot_symbol: string;
  spot_price?: number | null;
  futures_price?: number | null;
  basis_absolute?: number | null;
  basis_percentage?: number | null;
  annualized_basis?: number | null;
  regime: "CONTANGO" | "BACKWARDATION" | "PARITY" | string;
}

export interface ProviderHealthReport {
  provider: string;
  display_name: string;
  configured: boolean;
  rest_status: string;
  websocket_status: string;
  subscription_status: string;
  decoder_status: string;
  instrument_count: number;
  first_tick_received: boolean;
  last_real_tick_at?: string | null;
  last_tick_age_ms?: number | null;
  status: "LIVE" | "TOKEN_EXPIRED" | "AUTH_REQUIRED" | "DATA_PLAN_INACTIVE" | "NOT_CONFIGURED" | "STALE" | "DISCONNECTED" | "DEGRADED" | string;
  error_code?: string | null;
  error_details?: string | null;
  reconnect_count: number;
}

export interface CanonicalFuturesContract {
  symbol: string;
  underlying: string;
  displayName: string;
  contract_type: FuturesContractType;
  venue: MarketVenue;

  // Nullable telemetry to prevent falsifying missing data into zeros
  mark_price?: number | null;
  index_price?: number | null;
  last_price?: number | null;
  bid?: number | null;
  ask?: number | null;
  bid_qty?: number | null;
  ask_qty?: number | null;
  change_24h_pct?: number | null;
  volume_24h_usd?: number | null;
  open_interest_usd?: number | null;
  open_interest_coins?: number | null;
  open_interest_change?: number | null;

  // Exact Source Identification & Decoupled Execution Broker
  market_data_provider?: string;
  provider?: string;
  execution_broker?: string;
  broker_account?: string;
  broker_account_alias?: string;
  environment?: string;
  exchange?: string;
  segment?: string;
  asset_type?: string;
  canonical_symbol?: string;
  provider_instrument_id?: string;
  instrument_key?: string;
  feed_type?: string;
  last_update?: string | null;
  data_age_ms?: number | null;
  latency_ms?: number | null;
  freshness_status?: "LIVE" | "DELAYED" | "STALE" | "NO_DATA" | "MARKET_CLOSED" | "UNAVAILABLE" | string;
  market_status?: "OPEN" | "CLOSED" | "PRE_OPEN" | "POST_CLOSE" | string;
  status?: "CONNECTED" | "LIVE" | "AUTH_REQUIRED" | "TOKEN_EXPIRED" | "DATA_PLAN_INACTIVE" | "NOT_CONFIGURED" | "DISCONNECTED" | "STALE" | "UNAVAILABLE" | string;
  currency?: string;
  quote_currency?: string;
  margin_currency?: string;
  settlement_type?: "CASH" | "PHYSICAL" | string;
  contract_multiplier?: number;
  lot_size?: number;
  error_details?: string | null;
  funding_rate?: FundingRateData | null;
  basis?: BasisData | null;
  max_leverage: number;
  min_qty: number;
  tick_size: number;
  maker_fee_pct?: number;
  taker_fee_pct?: number;
  expiry_date?: string | null;
  is_active: boolean;
  long_short_ratio?: number | null;
  timestamp: string;
}

export interface FuturesUniverseResponse {
  status: string;
  count: number;
  total_volume_usd?: number | null;
  total_open_interest_usd?: number | null;
  avg_funding_rate_apr?: number | null;
  connected_providers_count?: number;
  total_providers_count?: number;
  contracts: CanonicalFuturesContract[];
}

export interface FundingHeatmapItem {
  symbol: string;
  underlying: string;
  markPrice?: number | null;
  change24h?: number | null;
  rate8h?: number | null;
  apr?: number | null;
  countdown?: string | null;
  openInterestUsd?: number | null;
}

export interface LiquidationCalcResult {
  entryPrice: number;
  leverage: number;
  side: "LONG" | "SHORT" | "BUY" | "SELL";
  liquidationPrice: number;
  liquidationDistancePct: number;
  riskLevel: "HIGH" | "MODERATE" | "SAFE";
}

export interface FuturesPosition {
  id: string;
  symbol: string;
  displayName: string;
  provider: string;
  exchange: string;
  side: "LONG" | "SHORT";
  quantity: number;
  entry_price: number;
  mark_price: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  margin_mode: MarginMode;
  leverage: number;
  margin_usd: number;
  liquidation_price: number;
  liquidation_distance_pct: number;
  environment: "PAPER" | "SHADOW" | "LIVE";
  opened_at: string;
}

export interface OrderIntentPayload {
  symbol: string;
  side: "BUY" | "SELL" | "LONG" | "SHORT";
  quantity: number;
  order_type?: "MARKET" | "LIMIT" | "STOP_MARKET";
  limit_price?: number;
  leverage?: number;
  margin_mode?: MarginMode;
  stop_loss?: number;
  take_profit?: number;
  mode?: "PAPER" | "SHADOW" | "LIVE";
  client_order_id?: string;
}

export interface OrderIntentResponse {
  status: "SUCCESS" | "ERROR";
  code?: string;
  message?: string;
  result?: {
    order_intent_id: string;
    client_order_id: string;
    symbol: string;
    canonical_symbol?: string;
    market_data_provider?: string;
    execution_broker?: string;
    environment: string;
    side: string;
    quantity: number;
    order_type: string;
    execution_price: number;
    estimated_notional: number;
    required_margin: number;
    leverage: number;
    margin_mode: string;
    estimated_fee: number;
    status: string;
    risk_decision: string;
    message: string;
    timestamp: string;
  };
}
