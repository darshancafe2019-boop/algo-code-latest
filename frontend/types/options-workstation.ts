/**
 * Multi-Market Options Workstation Type Definitions
 * Complete definitions for all 24 PDF strategies, multi-market chains, Greeks, payoff evaluation,
 * 14-point validation gates, orders, positions, and provider matrices.
 */

export type MarketUniverse = "ALL" | "India" | "Global" | "Crypto";

export type AssetClass =
  | "INDIAN_INDEX_OPTIONS"
  | "INDIAN_STOCK_OPTIONS"
  | "INDIAN_FUTURES"
  | "INDIAN_EQUITIES"
  | "GLOBAL_EQUITIES"
  | "GLOBAL_OPTIONS"
  | "GLOBAL_ETFS"
  | "GLOBAL_COMMODITIES"
  | "CRYPTO_OPTIONS"
  | "CRYPTO_PERPETUALS"
  | "CRYPTO_SPOT";

export type StrategyCategory =
  | "Single Leg"
  | "Vertical Spreads"
  | "Volatility"
  | "Iron Condors & Butterflies"
  | "Time Spreads"
  | "Ratio Spreads"
  | "Underlying Combinations";

export type StrategyOutlook = "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE";

export type RiskProfile = "DEFINED_RISK" | "UNDEFINED_RISK";

export interface OptionLeg {
  leg_id?: string;
  action: "BUY" | "SELL";
  option_type: "CALL" | "PUT" | "CE" | "PE" | "STOCK";
  strike: number;
  expiry: string;
  premium: number;
  quantity: number;
  multiplier?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
  iv?: number;
  strike_offset?: number;
  quantity_ratio?: number;
}

export interface PayoffPoint {
  underlying_price: number;
  pnl: number;
  pnl_pct: number;
}

export interface AggregateGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface StrategyEvaluationResult {
  status: "success" | "error";
  strategy_name: string;
  underlying: string;
  spot_price: number;
  legs_count: number;
  legs: OptionLeg[];
  nature: "NET DEBIT" | "NET CREDIT";
  net_premium: number;
  net_cash_flow: number;
  max_profit: number | "UNLIMITED";
  max_loss: number | "UNLIMITED";
  risk_reward_ratio: number | "UNLIMITED" | "N/A";
  breakevens: number[];
  required_margin: number;
  aggregate_greeks: AggregateGreeks;
  payoff_curve: PayoffPoint[];
  provenance: string;
  message?: string;
}

export interface StrategyMetadata {
  id: string;
  name: string;
  category: StrategyCategory;
  outlook: StrategyOutlook;
  risk_profile: RiskProfile;
  description: string;
  max_profit: string;
  max_loss: string;
  default_legs: OptionLeg[];
}

export interface ValidationGateCheck {
  gate: string;
  status: "PASS" | "WARN" | "FAIL";
  message: string;
}

export interface OrderValidationResult {
  is_valid: boolean;
  overall_status: "APPROVED" | "REJECTED";
  execution_mode: "PAPER" | "LIVE";
  checks: ValidationGateCheck[];
  validated_at: string;
}

export interface MultiMarketInstrument {
  internal_id: string;
  symbol: string;
  display_name: string;
  underlying: string;
  exchange: string;
  country: string;
  asset_class: AssetClass;
  currency: string;
  lot_size: number;
  contract_multiplier: number;
  tick_size: number;
  trading_session: string;
  is_tradable: boolean;
  supported_products: string[];
}

export interface ActiveStrategyInstance {
  instance_id: string;
  strategy_type: "MULTI_LEG_OPTION" | "STATISTICAL_PAIR";
  strategy_id: string;
  name: string;
  underlying: string;
  status: "ACTIVE" | "PAUSED" | "DRAINING" | "CLOSED" | "EMERGENCY_KILLED";
  execution_mode: "PAPER" | "LIVE";
  lots?: number;
  net_cash_flow?: number;
  unrealized_pnl: number;
  legs?: OptionLeg[];
  direction?: string;
  hedge_ratio?: number;
  entry_zscore?: number;
  allocated_capital?: number;
  created_at: string;
}

export interface WorkstationRiskSummary {
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  available_margin: number;
  margin_utilization_pct: number;
  active_strategies_count: number;
  max_concurrent_strategies: number;
  daily_loss_limit: number;
  current_daily_loss: number;
  max_drawdown_limit_pct: number;
  unhedged_exposure_alerts: Array<{ id: string; message: string; severity: string }>;
  emergency_kill_switch_armed: boolean;
  pre_flight_gates_active: number;
  updated_at: string;
}

export interface AuditLogEntry {
  audit_id: string;
  event_type: string;
  target_id: string;
  user_id: string;
  action_name: string;
  status: string;
  details: Record<string, any>;
  created_at: string;
}
