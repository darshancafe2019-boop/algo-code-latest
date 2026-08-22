/**
 * Comprehensive Type Definitions for World-Class Strategy Builder
 */

export type RuleTimeframe = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w";

export type StrategyDirection = "LONG" | "SHORT" | "BOTH" | "OPTIONS_MULTI_LEG" | "FUTURES";

export type StrategyPublishStatus = "Draft" | "Saved" | "Published";

export type RuleOperator = ">" | "<" | ">=" | "<=" | "==" | "!=" | "crosses_above" | "crosses_below" | "in_range" | "outside_range";

export interface VisualRule {
  id: string;
  left: string;
  leftLabel?: string;
  timeframe?: RuleTimeframe;
  op: RuleOperator | string;
  right: string;
  rightLabel?: string;
  conjunction?: "AND" | "OR" | "NOT";
  enabled: boolean;
  category?: string;
  description?: string;
  groupId?: string;
}

export interface RuleGroup {
  id: string;
  name?: string;
  conjunction: "AND" | "OR";
  rules: VisualRule[];
}

export interface StrategyRiskConfig {
  capital: number;
  risk_per_trade_pct: number;
  max_position_size_pct: number;
  max_daily_loss: number;
  max_drawdown_pct: number;
  max_open_positions: number;
  leverage: number;
  stop_loss_type: "ATR" | "PERCENT" | "FIXED_PRICE" | "TRAILING";
  stop_loss_value: number;
  take_profit_type: "RR_RATIO" | "ATR" | "PERCENT" | "FIXED_PRICE";
  take_profit_value: number;
  trailing_stop_enabled: boolean;
  trailing_stop_activation: number;
  trailing_stop_callback: number;
  auto_square_off_enabled: boolean;
  auto_square_off_time: string;
  cooldown_bars: number;
}

export interface ConfluenceWeights {
  trend: number;
  timing: number;
  momentum: number;
  volume: number;
  min_confidence: number;
  regime_filter: "ALL" | "TRENDING_ONLY" | "RANGING_ONLY";
}

export interface OptionLegBuilderItem {
  id: string;
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
}

export interface OptionsBuilderConfig {
  preset: string;
  underlying: string;
  expiry: string;
  spot_price: number;
  lot_size: number;
  legs: OptionLegBuilderItem[];
  evaluation?: {
    max_profit: number;
    max_loss: number;
    breakevens: number[];
    margin_required: number;
    net_premium: number;
    risk_reward_ratio: number;
    payoff_curve?: Array<{ price: number; pnl: number }>;
  };
}

export interface FuturesBuilderConfig {
  contract: string;
  underlying: string;
  expiry: string;
  lot_size: number;
  leverage: number;
  margin_mode: "ISOLATED" | "CROSS";
  basis: number;
  funding_rate_pct: number;
  liquidation_buffer_pct: number;
}

export interface FullVisualStrategy {
  id: string;
  strategy_id?: string;
  name: string;
  description: string;
  status: StrategyPublishStatus;
  market_type: "crypto" | "equity" | "futures" | "options" | "forex" | "commodity";
  symbol: string;
  timeframe: RuleTimeframe | string;
  direction: StrategyDirection;
  mode: "simple" | "advanced";
  entry_conjunction: "AND" | "OR";
  entry_rules: VisualRule[];
  entry_groups?: RuleGroup[];
  confirmation_rules: VisualRule[];
  exit_rules: VisualRule[];
  confluence_weights: ConfluenceWeights;
  risk: StrategyRiskConfig;
  options_config?: OptionsBuilderConfig;
  futures_config?: FuturesBuilderConfig;
  compiled_expression?: string;
  is_template?: boolean;
  created_at?: string;
  updated_at?: string;
  readiness_score?: number;
}

export interface ReadinessCheckItem {
  id: string;
  category: "Data" | "Conditions" | "Risk" | "Exit" | "Backtest" | "Paper Test" | "Deployment";
  label: string;
  status: "PASSED" | "WARNING" | "FAILED";
  message: string;
  critical?: boolean;
}

export interface StrategyPaletteItem {
  id: string;
  label: string;
  category: "MARKET" | "TREND" | "MOMENTUM" | "VOLATILITY" | "VOLUME" | "PRICE ACTION" | "MARKET STRUCTURE" | "OPTIONS" | "FUTURES" | "RISK";
  defaultLeft: string;
  defaultOp: RuleOperator | string;
  defaultRight: string;
  defaultTimeframe: RuleTimeframe;
  tooltip: string;
  badge?: string;
  iconName?: string;
}

export interface NaturalLanguagePromptResult {
  strategyName: string;
  description: string;
  direction: StrategyDirection;
  symbol: string;
  timeframe: RuleTimeframe;
  entry_rules: VisualRule[];
  confirmation_rules: VisualRule[];
  risk: Partial<StrategyRiskConfig>;
  raw_prompt: string;
}
