export interface PortfolioKPIs {
  total_equity: number;
  starting_equity: number;
  available_balance: number;
  used_capital: number;
  available_margin: number;
  required_margin: number;
  margin_utilization_pct: number;
  today_pnl: number;
  today_pnl_pct: number;
  today_realized: number;
  today_unrealized: number;
  today_fees: number;
  total_pnl: number;
  total_realized: number;
  total_unrealized: number;
  total_fees: number;
  net_pnl: number;
  peak_equity: number;
  high_water_mark: number;
  distance_from_peak_pct: number;
  max_drawdown_pct: number;
  current_drawdown_pct: number;
  gross_exposure: number;
  net_exposure: number;
  long_exposure_pct: number;
  short_exposure_pct: number;
  daily_loss_limit: number;
  today_loss_used: number;
  remaining_loss_capacity: number;
  daily_loss_utilization_pct: number;
  data_age_ms: number;
  status: "LIVE" | "STALE" | "DEGRADED";
}

export interface EquityCurvePoint {
  timestamp: string;
  equity: number;
  high_water_mark: number;
  drawdown_pct: number;
  realized_pnl: number;
  unrealized_pnl: number;
}

export interface SymbolPerformanceRow {
  symbol: string;
  trades_count: number;
  wins: number;
  losses: number;
  breakevens: number;
  win_rate_pct: number;
  gross_pnl: number;
  fees: number;
  funding: number;
  net_pnl: number;
  avg_trade: number;
  profit_factor: number | string;
  max_drawdown_pct: number;
  avg_risk_reward: number | string;
}

export interface StrategyPerformanceRow {
  strategy_name: string;
  trades_count: number;
  wins: number;
  losses: number;
  breakevens: number;
  win_rate_pct: number;
  gross_pnl: number;
  fees: number;
  net_pnl: number;
  profit_factor: number | string;
  expectancy_per_trade: number;
  avg_win: number;
  avg_loss: number;
  max_drawdown_pct: number;
  avg_risk_reward: number | string;
  is_statistically_significant: boolean;
}

export interface BotPerformanceRow {
  bot_id: string;
  name: string;
  symbol: string;
  status: "RUNNING" | "PAUSED" | "STOPPED";
  trades_count: number;
  win_rate_pct: number;
  net_pnl: number;
  drawdown_pct: number;
  exposure_usd: number;
  fees_paid: number;
  risk_utilization_pct: number;
}

export interface QuantitativeMetrics {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  win_rate_pct: number;
  loss_rate_pct: number;
  avg_win_usd: number;
  avg_loss_usd: number;
  win_loss_ratio: number | string;
  profit_factor: number | string;
  expectancy_usd: number;
  total_fees_usd: number;
  today_fees_usd: number;
  avg_slippage_pct: number;
  avg_fill_latency_ms: number;
  execution_quality_score: number;
}

export interface AssetClassExposure {
  category: string;
  exposure_usd: number;
  allocation_pct: number;
  color: string;
}
