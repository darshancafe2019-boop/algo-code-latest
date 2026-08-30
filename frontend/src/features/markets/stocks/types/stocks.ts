/**
 * Authoritative Stocks Market Data Types
 * =====================================
 * Type definitions matching backend models. Strict asset class separation.
 */

export type StockRegion = "INDIA" | "US" | "GLOBAL";
export type StockExchange = "NSE" | "BSE" | "NASDAQ" | "NYSE" | "AMEX" | "LSE" | "TSX";
export type MarketCapCategory = "MEGA_CAP" | "LARGE_CAP" | "MID_CAP" | "SMALL_CAP" | "MICRO_CAP" | "UNKNOWN";
export type TrendDirection = "STRONG_BULLISH" | "BULLISH" | "NEUTRAL" | "BEARISH" | "STRONG_BEARISH";
export type DataQualityStatus = "LIVE" | "DELAYED" | "STALE" | "PARTIAL" | "MARKET_CLOSED" | "PROVIDER_DOWN" | "INVALID";
export type StockTimeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

export interface StockInstrument {
  instrument_id: string;
  symbol: string;
  company_name: string;
  exchange: string;
  region: string;
  currency: string;
  instrument_type: string;
  isin?: string | null;
  sector?: string | null;
  industry?: string | null;
  market_cap_category: string;
  index_memberships: string[];
  is_fno_enabled: boolean;
  trading_status: string;
  tick_size: number;
  lot_size: number;
  session_timezone: string;
  primary_provider: string;
  last_metadata_refresh?: string | null;
}

export interface StockQuoteRow {
  instrument_id: string;
  symbol: string;
  company_name: string;
  exchange: string;
  region: string;
  currency: string;
  instrument_type: string;
  isin?: string | null;
  sector?: string | null;
  industry?: string | null;
  market_cap_category: string;
  index_memberships?: string[];
  is_fno_enabled?: boolean;
  trading_status?: string;

  // Price & returns
  last_price: number;
  open_price?: number | null;
  high_price?: number | null;
  low_price?: number | null;
  previous_close?: number | null;
  change_abs?: number | null;
  change_pct?: number | null;
  bid?: number | null;
  ask?: number | null;
  spread?: number | null;
  volume_shares: number;
  relative_volume?: number | null;
  turnover?: number | null;
  turnover_usd?: number | null;
  turnover_inr?: number | null;
  vwap?: number | null;
  high_52w?: number | null;
  low_52w?: number | null;
  market_status: string;
  data_quality: string;
  data_age_ms?: number;
  provider: string;
  timestamp_exchange?: string | null;

  // Technical snapshot
  rsi_14?: number | null;
  macd_hist?: number | null;
  ema_20?: number | null;
  ema_50?: number | null;
  is_breakout?: boolean;
  is_breakdown?: boolean;

  // Fundamental snapshot
  pe_ratio?: number | null;
  pb_ratio?: number | null;
  eps_ttm?: number | null;
  dividend_yield_pct?: number | null;
  roe_pct?: number | null;
  debt_to_equity?: number | null;

  // Quantitative Analysis snapshot
  directional_bias?: string;
  overall_score?: number;
  technical_score?: number;
  momentum_score?: number;
  confidence_score?: number;
  summary_explanation?: string;
}

export interface StockFundamentals {
  instrument_id: string;
  symbol: string;
  market_cap?: number | null;
  pe_ratio?: number | null;
  forward_pe?: number | null;
  pb_ratio?: number | null;
  eps_ttm?: number | null;
  dividend_yield_pct?: number | null;
  roe_pct?: number | null;
  debt_to_equity?: number | null;
  operating_margin_pct?: number | null;
  net_margin_pct?: number | null;
  revenue_growth_yoy_pct?: number | null;
  profit_growth_yoy_pct?: number | null;
  free_cash_flow?: number | null;
  promoter_holding_pct?: number | null;
  institutional_holding_pct?: number | null;
  last_updated?: string | null;
  data_source: string;
}

export interface StockTechnicals {
  instrument_id: string;
  symbol: string;
  timeframe: string;
  rsi_14?: number | null;
  macd_line?: number | null;
  macd_signal?: number | null;
  macd_hist?: number | null;
  ema_20?: number | null;
  ema_50?: number | null;
  ema_200?: number | null;
  sma_50?: number | null;
  sma_200?: number | null;
  atr_14?: number | null;
  atr_pct?: number | null;
  vwap?: number | null;
  bollinger_upper?: number | null;
  bollinger_middle?: number | null;
  bollinger_lower?: number | null;
  pivot_level?: number | null;
  support_1?: number | null;
  support_2?: number | null;
  resistance_1?: number | null;
  resistance_2?: number | null;
  is_breakout: boolean;
  is_breakdown: boolean;
  is_near_52w_high: boolean;
  is_near_52w_low: boolean;
  last_calculated?: string | null;
}

export interface StockAnalysisResult {
  instrument_id: string;
  symbol: string;
  timeframe: string;
  directional_bias: string;
  overall_score: number;
  technical_score: number;
  fundamental_score?: number | null;
  liquidity_score: number;
  momentum_score: number;
  risk_score: number;
  confidence_score: number;
  summary_explanation: string;
  indicators_used: string[];
  data_points_used: number;
  missing_input_warnings: string[];
  calculated_at?: string | null;
  calculation_latency_ms: number;
}

export interface StockCandle {
  timestamp: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockFilterState {
  search: string;
  country?: string;
  exchange?: string;
  sector?: string;
  market_cap_category?: string;
  index?: string;
  price_direction?: "GAINERS" | "LOSERS" | "UNCHANGED";
  min_price?: number;
  max_price?: number;
  min_change_pct?: number;
  max_change_pct?: number;
  min_volume?: number;
  min_relative_volume?: number;
  min_rsi?: number;
  max_rsi?: number;
  min_pe?: number;
  max_pe?: number;
  directional_bias?: string;
  min_score?: number;
  sort_by: string;
  sort_direction: "asc" | "desc";
  page: number;
  page_size: number;
}

export interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  meta: {
    provider: string;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    exchangeTimestamp?: string | null;
    receivedTimestamp: string;
    isLive: boolean;
    isStale: boolean;
    quality: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
    statusCode?: number;
  } | null;
}
