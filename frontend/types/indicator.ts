export type IndicatorCategory = 
  | "ALL"
  | "TREND"
  | "MOMENTUM"
  | "VOLATILITY"
  | "VOLUME"
  | "PRICE_ACTION"
  | "MARKET_STRUCTURE"
  | "DERIVATIVES";

export type IndicatorStatus = "READY" | "CALCULATING" | "STALE" | "ERROR" | "DISABLED";

export type RepaintingClassification = "NON-REPAINTING" | "IN-PROGRESS" | "STRUCTURAL";

export interface ParameterSchemaField {
  name: string;
  label: string;
  type: "integer" | "number" | "select" | "boolean" | "string";
  default: any;
  minimum?: number;
  maximum?: number;
  step?: number;
  options?: { value: string; label: string }[];
  description?: string;
}

export interface IndicatorConfigItem {
  id: string;
  indicator_id: string;
  name: string;
  category: IndicatorCategory;
  description?: string;
  version?: string;
  enabled: boolean;
  weight: number;
  timeframe: string;
  parameters: Record<string, any>;
  parameter_schema?: ParameterSchemaField[];
  current_value?: number | string | null;
  formatted_value?: string;
  previous_value?: number | string | null;
  delta?: number | null;
  signal?: "BUY" | "SELL" | "NEUTRAL" | "HOLD";
  current_signal?: string;
  current_reason?: string;
  signal_contribution?: number;
  signal_mode?: string;
  status: IndicatorStatus;
  bars_count?: number;
  last_updated_ms?: number;
  calculation_latency_ms?: number;
  effective_source: "BOT OVERRIDE" | "BOT PROFILE" | "GLOBAL DEFAULT";
  repainting_type?: RepaintingClassification;
  is_favorite?: boolean;
  favorite?: boolean;
}

export interface MarketSummaryData {
  decision: "LONG" | "SHORT" | "HOLD";
  bull_score: number;
  bear_score: number;
  confluence_pct: number;
  regime: string;
  volatility: string;
  bias: string;
  threshold_long: number;
  threshold_short: number;
  contributing_factors?: string[];
  opposing_factors?: string[];
}

export interface IndicatorProfile {
  profile_id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  is_active?: boolean;
  indicators_count: number;
  weights_summary?: Record<string, number>;
  conditions_summary?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface TimeframeConfluenceRow {
  timeframe: "5m" | "15m" | "1h" | "4h" | "1d";
  label: string;
  role: "ENTRY" | "CONFIRMATION" | "TREND" | "MACRO";
  confluence_pct: number;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  signals: {
    indicator_id: string;
    name: string;
    value: string | number;
    signal: "BUY" | "SELL" | "NEUTRAL";
    healthy: boolean;
  }[];
}

export interface ConfluenceEvaluation {
  overall_score_pct: number;
  direction: "BUY" | "SELL" | "NEUTRAL";
  bull_score_pct: number;
  bear_score_pct: number;
  neutral_score_pct: number;
  market_regime: "TRENDING" | "RANGING" | "VOLATILE" | "BREAKOUT";
  adx: number;
  positive_factors: string[];
  negative_factors: string[];
  decision: "EXECUTE BUY" | "EXECUTE SELL" | "WAIT / CONFIRMATION";
}

export interface IndicatorDiagnostic {
  indicator_id: string;
  name: string;
  category: string;
  input_candles: number;
  last_candle_timestamp: string;
  latency_ms: number;
  freshness_seconds: number;
  status: "HEALTHY" | "STALE" | "ERROR";
  repainting: RepaintingClassification;
  error_message?: string;
}

export interface IndicatorBacktestRunResult {
  indicator_id: string;
  symbol: string;
  timeframe: string;
  bars_analyzed: number;
  total_signals: number;
  win_rate_pct: number;
  avg_favorable_move_pct: number;
  avg_adverse_move_pct: number;
  profit_factor: number;
  max_drawdown_pct: number;
  tested_at: string;
}
