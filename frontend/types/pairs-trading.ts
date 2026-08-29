/**
 * Statistical Pairs Trading & Pair Options Type Definitions
 * Based on 'The Handbook of Pairs Trading Strategies'
 */

export type NeutralizationMode =
  | "EQUAL_QUANTITY"
  | "EQUAL_NOTIONAL"
  | "DOLLAR_NEUTRAL"
  | "BETA_NEUTRAL"
  | "VOLATILITY_NEUTRAL"
  | "REGRESSION_HEDGE_RATIO"
  | "DELTA_NEUTRAL"
  | "CONTRACT_VALUE_NEUTRAL";

export type PairEntryDirection = "LONG_A_SHORT_B" | "SHORT_A_LONG_B" | "NEUTRAL_FLAT";

export type PairRegimeType =
  | "COINTEGRATED_MEAN_REVERTING"
  | "HIGH_CORRELATION_NON_STATIONARY"
  | "DIVERGING_TREND"
  | "REGIME_BREAK_WARNING"
  | "INSUFFICIENT_HISTORY";

export type OptionOverlayType =
  | "PROTECTIVE_PUT_LONG_LEG"
  | "PROTECTIVE_CALL_SHORT_LEG"
  | "DUAL_COLLAR_OVERLAY"
  | "DELTA_ADJUSTED_DYNAMIC_HEDGE"
  | "EVENT_VOLATILITY_GUARD";

export type OptionSubstitutionType =
  | "DEEP_ITM_CALL_PROXY"
  | "DEEP_ITM_PUT_PROXY"
  | "BULL_CALL_SPREAD_PROXY"
  | "BEAR_PUT_SPREAD_PROXY"
  | "CALL_BACKSPREAD_PROXY"
  | "PUT_BACKSPREAD_PROXY"
  | "DUAL_SPREAD_PROXIES"
  | "DIRECT_UNDERLYING_BASELINE";

export interface PairCandidate {
  pair_id: string;
  symbol_a: string;
  symbol_b: string;
  asset_class: string;
  market: "India" | "Global" | "Crypto";
  exchange_a: string;
  exchange_b: string;
  currency_a: string;
  currency_b: string;
  multiplier_a: number;
  multiplier_b: number;
  lot_size_a: number;
  lot_size_b: number;
  tick_size_a: number;
  tick_size_b: number;
  sector: string;
  is_perpetual?: boolean;
  is_futures?: boolean;
}

export interface PairAnalysisResult {
  pair_id: string;
  symbol_a: string;
  symbol_b: string;
  market: string;
  asset_class: string;
  last_price_a: number;
  last_price_b: number;
  price_ratio: number;
  log_price_ratio: number;
  hedge_ratio: number;
  intercept: number;
  r_squared: number;
  correlation: number;
  rolling_correlation_30d: number;
  rolling_hedge_ratio_30d: number;
  current_spread: number;
  spread_mean: number;
  spread_std: number;
  current_zscore: number;
  zscore_series: number[];
  spread_series: number[];
  timestamps: string[];
  cointegration_pvalue: number;
  is_cointegrated: boolean;
  adf_statistic: number;
  adf_pvalue: number;
  adf_critical_values: Record<string, number>;
  is_stationary: boolean;
  half_life_days: number;
  mean_crossings_count: number;
  max_divergence_pct: number;
  regime: PairRegimeType;
  composite_rank_score: number;
  suggested_direction: PairEntryDirection;
  estimated_annual_turnover: number;
  estimated_funding_drag_pct: number;
  estimated_borrow_cost_pct: number;
  parameter_stability_pct: number;
  lookback_candles: number;
}

export interface PairOptionLegDetail {
  leg_id: string;
  target_pair_leg: "LEG_A" | "LEG_B";
  instrument_symbol: string;
  underlying_symbol: string;
  action: "BUY" | "SELL";
  option_type: "CE" | "PE" | "STOCK";
  strike: number;
  expiry: string;
  premium: number;
  quantity: number;
  multiplier: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
}

export interface PairScenarioSimulation {
  underlying_shift_pct: number;
  simulated_price_a: number;
  simulated_price_b: number;
  pnl_direct_underlying: number;
  pnl_option_structure: number;
  relative_benefit: number;
}

export interface PairOptionStructureResult {
  structure_id: string;
  structure_type: string;
  pair_id: string;
  symbol_a: string;
  symbol_b: string;
  direction: string;
  legs: PairOptionLegDetail[];
  capital_required_direct: number;
  capital_required_options: number;
  capital_savings_pct: number;
  max_profit: number | "UNLIMITED";
  max_loss: number | "UNDEFINED";
  risk_profile: "DEFINED_RISK" | "UNDEFINED_RISK";
  net_delta: number;
  net_gamma: number;
  net_theta_daily: number;
  net_vega: number;
  assignment_risk: string;
  settlement_type: string;
  scenario_table: PairScenarioSimulation[];
  recommendation_notes: string[];
}

export interface PairTradeRecord {
  trade_id: string;
  pair_id: string;
  direction: string;
  entry_index: number;
  exit_index: number;
  entry_timestamp: string;
  exit_timestamp: string;
  holding_periods: number;
  entry_price_a: number;
  entry_price_b: number;
  exit_price_a: number;
  exit_price_b: number;
  quantity_a: number;
  quantity_b: number;
  entry_zscore: number;
  exit_zscore: number;
  hedge_ratio: number;
  gross_pnl: number;
  slippage_cost: number;
  commission_cost: number;
  borrow_funding_cost: number;
  net_pnl: number;
  return_pct: number;
  exit_reason: string;
}

export interface PairsBacktestResult {
  pair_id: string;
  symbol_a: string;
  symbol_b: string;
  start_timestamp: string;
  end_timestamp: string;
  total_candles: number;
  initial_capital: number;
  final_equity: number;
  net_pnl: number;
  total_return_pct: number;
  cagr_pct: number;
  max_drawdown_pct: number;
  max_drawdown_dollars: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  profit_factor: number;
  win_rate_pct: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  avg_holding_period: number;
  avg_convergence_time: number;
  annual_turnover: number;
  total_commission: number;
  total_slippage: number;
  total_borrow_funding: number;
  equity_curve: Array<{ timestamp: string; equity: number; drawdown_pct: number }>;
  trades: PairTradeRecord[];
  parameter_stability_score: number;
}
