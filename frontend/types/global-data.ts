/**
 * Authoritative Global Data & Portfolio Contracts for Quant.OS
 */

export interface PortfolioSnapshot {
  asOf: string;
  mode: "PAPER" | "LIVE";
  baseCurrency: string;
  startingBalance: number;
  cashBalance: number;
  equity: number;
  availableCapital: number;
  marginUsed: number;
  buyingPower: number;
  grossRealizedPnl: number;
  netRealizedPnl: number;
  unrealizedPnl: number;
  netPnl: number;
  dailyPnl: number;
  weeklyPnl: number;
  monthlyPnl: number;
  lifetimePnl: number;
  fees: number;
  funding: number;
  openPositions: number;
  openOrders: number;
  totalTradesCount: number;
  winningTradesCount: number;
  losingTradesCount: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  riskRewardRatio: number;
  expectancy: number;
  maxDrawdownPct: number;
  currentDrawdownPct: number;
  accountingMethod: string;
  dataFreshness: "LIVE" | "DELAYED" | "CACHED" | "STALE";
  reconciliationStatus: "RECONCILED" | "UNRECONCILED";
}

export interface PositionItem {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  quantity: number;
  entry_price: number;
  current_price: number;
  stop_loss?: number;
  take_profit?: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  notional_value: number;
  status: "OPEN" | "RUNNING" | "PARTIAL";
  opened_at: string;
  bot_id: string;
  execution_mode: "PAPER" | "LIVE";
}

export interface OrderItem {
  id: string;
  trade_id?: number;
  symbol: string;
  direction: "BUY" | "SELL" | "LONG" | "SHORT";
  order_type: "MARKET" | "LIMIT" | "STOP";
  requested_quantity: number;
  filled_quantity: number;
  price: number;
  status: "FILLED" | "PARTIALLY_FILLED" | "OPEN" | "CANCELLED" | "REJECTED";
  created_at: string;
  execution_mode: "PAPER" | "LIVE";
  bot_id: string;
}

export interface ProviderCapability {
  provider_id: string;
  provider_name: string;
  asset_classes: string[];
  supported_exchanges: string[];
  status: "LIVE" | "DELAYED" | "NOT_CONFIGURED" | "UNCONFIGURED" | "UNAVAILABLE";
  data_mode: "REAL_TIME" | "DELAYED" | "EOD";
  rate_limit_per_min: number;
  health: "HEALTHY" | "DEGRADED" | "NOT_CONFIGURED" | "UNCONFIGURED";
  credentials_required: boolean;
  credentials_configured: boolean;
  message?: string;
}

export interface RiskSummaryContract {
  portfolioEquity: number;
  allocatedCapital: number;
  availableMargin: number;
  marginUsed: number;
  marginUsedPct: number;
  dailyDrawdownPct: number;
  maxDailyLossPct: number;
  riskPerTradePct: number;
  riskRewardRatio: number;
  openPositionsCount: number;
  maxPositionsCount: number;
  universalRiskGateStatus: string;
  globalKillSwitchActive: boolean;
  isApprovedForTrading: boolean;
  reconciliationStatus: "RECONCILED" | "UNRECONCILED";
  asOf?: string;
}
