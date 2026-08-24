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
  high_water_mark?: number;
  highWaterMark?: number;
  drawdown?: number;
  drawdown_pct?: number;
  drawdownPct?: number;
  realized_pnl?: number;
  realizedPnl?: number;
  unrealized_pnl?: number;
  unrealizedPnl?: number;
  fees?: number;
  funding?: number;
  netCashFlow?: number;
}

export interface EquityCurveEvent {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  description: string;
  symbol?: string;
  botId?: string;
  strategyId?: string;
  equityBefore?: number;
  equityAfter?: number;
  pnl?: number;
  severity?: "INFO" | "SUCCESS" | "WARNING" | "DANGER" | string;
}

export interface ContributionItem {
  name: string;
  pnl: number;
  trades: number;
  wins: number;
}

export interface EquityCurveSummary {
  startingEquity: number;
  currentEquity: number;
  netPnl: number;
  totalReturnPct: number;
  highWaterMark: number;
  distanceFromPeakPct: number;
  maxDrawdownPct: number;
  recoveryFactor: number;
}

export interface EquityCurveResponse {
  status: string;
  asOf: string;
  mode: "PAPER" | "LIVE";
  baseCurrency: string;
  reconciliationStatus: "RECONCILED" | "UNRECONCILED";
  freshness: "LIVE" | "DELAYED" | "STALE";
  summary: EquityCurveSummary;
  points: EquityCurvePoint[];
  events: EquityCurveEvent[];
  contributions: {
    by_bot: ContributionItem[];
    by_strategy: ContributionItem[];
    by_symbol: ContributionItem[];
    by_asset_class: ContributionItem[];
  };
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

export type ChartMetricType =
  | "NET_PNL"
  | "RETURN_PCT"
  | "GROSS_PNL"
  | "REALIZED_PNL"
  | "UNREALIZED_CHANGE"
  | "FEES"
  | "DRAWDOWN"
  | "TRADES";

export type ChartViewMode =
  | "DAILY_BARS"
  | "WEEKLY_BARS"
  | "MONTHLY_BARS"
  | "CUMULATIVE_EQUITY"
  | "EQUITY_AND_DAILY"
  | "DRAWDOWN";

export interface DailyProfitabilityBar {
  date: string;
  displayDate: string;
  dayOfWeek: string;
  openingEquity: number;
  closingEquity: number;
  grossPnl: number;
  realizedPnl: number;
  unrealizedChange: number;
  fees: number;
  commissions: number;
  funding: number;
  deposits: number;
  withdrawals: number;
  netExternalCashFlow: number;
  netPnl: number;
  returnPct: number;
  highWaterMark: number;
  drawdown: number;
  drawdownPct: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  bestTrade: number;
  worstTrade: number;
  intensity: number;
  status: "COMPLETE" | "INCOMPLETE" | "LIVE";
  reconciliationStatus: "RECONCILED" | "UNRECONCILED";
}

export interface DailyProfitabilitySummary {
  totalNetPnl: number;
  totalGrossPnl: number;
  totalFees: number;
  totalFunding: number;
  startingEquity: number;
  currentEquity: number;
  profitableDays: number;
  losingDays: number;
  flatDays: number;
  dailyWinRate: number;
  bestDay: number;
  worstDay: number;
  avgProfitableDay: number;
  avgLosingDay: number;
  profitFactor: number;
  currentStreak: string;
  highWaterMark: number;
  maxDrawdownPct: number;
  reconciliationStatus: "RECONCILED" | "UNRECONCILED";
}

export interface DailyProfitabilityResponse {
  status: string;
  asOf: string;
  mode: "PAPER" | "LIVE";
  timezone: string;
  baseCurrency: string;
  aggregation: "daily" | "weekly" | "monthly" | string;
  metric: string;
  freshness: "LIVE" | "DELAYED" | "STALE";
  summary: DailyProfitabilitySummary;
  bars: DailyProfitabilityBar[];
  contributions: {
    by_bot: ContributionItem[];
    by_strategy: ContributionItem[];
    by_symbol: ContributionItem[];
    by_asset_class: ContributionItem[];
  };
  selectedDayContributions?: {
    date: string;
    by_bot: ContributionItem[];
    by_strategy: ContributionItem[];
    by_symbol: ContributionItem[];
    by_asset_class: ContributionItem[];
  } | null;
}

export interface DayTradeDetail {
  id: number | string;
  orderId: string;
  symbol: string;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  netPnl: number;
  grossPnl: number;
  fees: number;
  pnlPercent: number;
  botId: string;
  strategy: string;
  entryTime: string;
  exitTime: string;
  confidenceScore: number;
  status: string;
}

export interface DayAnalysisDetail {
  status: string;
  date: string;
  mode: string;
  timezone: string;
  summary: {
    date: string;
    netPnl: number;
    grossPnl: number;
    fees: number;
    tradesCount: number;
    wins: number;
    losses: number;
    winRate: number;
    largestGain: number;
    largestLoss: number;
    explanation: string;
  };
  trades: DayTradeDetail[];
  intradayEquity: Array<{
    time: string;
    stepPnL: number;
    cumulativePnL: number;
    tradeId: number | string;
    symbol: string;
  }>;
  events: Array<{
    id: string;
    timestamp: string;
    type: string;
    message: string;
    severity: string;
    details?: string;
  }>;
  signals: Array<{
    id: number | string;
    timestamp: string;
    symbol: string;
    signal_type: string;
    price: number;
    confidence: number;
    is_blocked: boolean;
    reason: string;
  }>;
}
