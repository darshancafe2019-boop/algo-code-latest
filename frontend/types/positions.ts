/**
 * Institutional Positions Type System & Financial Calculation Engine
 * ====================================================================
 * Authoritative schemas and mathematically pure functions for position tracking,
 * mark-to-market P&L, risk boundaries, leverage dynamics, and execution triggers.
 */

export type PositionDirection = "LONG" | "SHORT" | "BUY" | "SELL";
export type PositionStatus = "OPEN" | "RUNNING" | "PARTIAL" | "CLOSED";
export type PositionFeedStatus =
  | "LIVE"
  | "CONNECTING"
  | "STALE"
  | "DISCONNECTED"
  | "AUTH REQUIRED"
  | "NOT CONFIGURED"
  | "RECONCILIATION_REQUIRED";
export type PositionFreshnessStatus = "LIVE" | "STALE" | "DISCONNECTED" | "UNAVAILABLE";
export type PositionViewMode = "table" | "cards" | "ladder" | "risk";
export type PositionFilterCategory = "ALL" | "LONG" | "SHORT" | "PROFIT" | "LOSS";
export type PositionBrokerFilter =
  | "ALL"
  | "PAPER_SIM"
  | "BINANCE"
  | "UPSTOX"
  | "DHAN"
  | "DELTA_INDIA"
  | "DERIBIT";
export type PositionSortKey =
  | "pnl_desc"
  | "pnl_asc"
  | "size_desc"
  | "duration_desc"
  | "symbol_asc"
  | "risk_desc";

export type BulkActionType = "MOVE_TO_BREAKEVEN" | "HARVEST_PROFITS" | "SQUARE_OFF_ALL";

export interface PositionRecord {
  id: number;
  position_uid?: string; // provider + brokerAccountId + environment + positionId
  trade_id?: number | string;
  symbol: string;
  direction: string;
  side?: string;
  entry_price: number;
  current_price: number;
  mark_price?: number;
  position_size: number;
  quantity?: number;
  notional_value?: number;
  current_notional?: number;
  margin_used?: number;
  leverage?: number;
  stop_loss?: number;
  take_profit?: number;
  trailing_stop?: number;
  liquidation_price?: number;
  liquidation_dist_pct?: number;
  sl_distance_price?: number;
  sl_distance_pct?: number;
  tp_distance_price?: number;
  tp_distance_pct?: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  realized_pnl?: number;
  planned_risk?: number;
  planned_reward?: number;
  risk_reward_ratio?: number;
  r_multiple?: number;
  entry_timestamp?: string;
  duration_seconds?: number;
  bot_id?: string;
  bot_name?: string;
  strategy?: string;
  execution_mode?: "PAPER" | "LIVE";
  
  // Explicit Source Identification
  market_data_source: string;      // e.g. "Binance Official API", "Upstox Official API"
  execution_broker: string;        // e.g. "Paper Simulator", "Upstox", "Dhan"
  broker_account_id: string;       // e.g. "Paper-Binance-01", "Upstox-Paper-01"
  broker_account_alias?: string;   // e.g. "Paper OMS (Binance Sim)"
  exchange: string;                // e.g. "BINANCE", "NSE", "MCX", "DERIBIT", "DELTA_INDIA"
  segment: string;                 // e.g. "PERPETUAL", "EQUITY", "INDEX_FUTURES", "OPTIONS"
  asset_type: string;              // e.g. "CRYPTO_PERP", "EQUITY_CASH", "EQUITY_FUTURE", "INDEX_FUTURE", "OPTION"
  instrument_key: string;          // e.g. "BINANCE:BTCUSDT:PERPETUAL", "NSE_EQ|INE002A01018"
  currency?: string;               // e.g. "USD", "INR", "USDT"
  
  // Real-time Telemetry & Truthful Statuses
  feed_status: PositionFeedStatus; // "LIVE", "STALE", "NOT CONFIGURED", etc.
  freshness_status: PositionFreshnessStatus;
  latency_ms: number;
  data_age_ms: number;
  last_update_utc?: string;
  error_details?: string;

  risk_warnings?: string[];
  broker_status?: string;
  status?: PositionStatus;
  updated_at?: string;
}

export interface PositionsSummaryData {
  total_unrealized_pnl?: number;
  total_realized_pnl?: number;
  total_positions_count?: number;
  open_positions_count?: number;
  long_positions_count?: number;
  short_positions_count?: number;
  long_exposure?: number;
  short_exposure?: number;
  net_exposure?: number;
  total_margin_used?: number;
  available_margin?: number;
  account_balance?: number;
  portfolio_risk_utilization_pct?: number;
  portfolio_var_usd?: number;
  daily_loss?: number;
  daily_loss_limit?: number;
  total_planned_risk?: number;
  win_rate_estimate?: number;
  scope?: string;
  as_of_timestamp?: string;
  currency?: string;
  risk_gate_status?: string;
  market_feed_status?: string;
  broker_sync_status?: string;
}

export interface PositionProtectionPayload {
  position_id: number;
  stop_loss: number;
  take_profit: number;
  trailing_stop?: number;
  source?: string;
}

export interface PartialClosePayload {
  position_id: number;
  percentage?: number;
  quantity?: number;
  source?: string;
}

export interface BulkActionPayload {
  action: BulkActionType;
  position_ids?: number[];
  source?: string;
}

export interface PriceLadderLevel {
  label: string;
  price: number;
  distancePct: number;
  type: "TP_EXT" | "TP" | "MARK" | "ENTRY" | "TRAILING" | "SL" | "LIQUIDATION";
  pnlAtPrice?: number;
  isTriggered?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure Financial Calculations Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates unrealized P&L given entry price, live market mark, quantity, and side.
 */
export function calculateUnrealizedPnl(
  entryPrice: number,
  currentPrice: number,
  quantity: number,
  direction: string,
  feeRate: number = 0.0004
): { pnl: number; pnlPct: number; netPnl: number } {
  if (entryPrice <= 0 || quantity <= 0) {
    return { pnl: 0, pnlPct: 0, netPnl: 0 };
  }

  const isLong = direction.toUpperCase().includes("LONG") || direction.toUpperCase().includes("BUY");
  const rawPnl = isLong ? (currentPrice - entryPrice) * quantity : (entryPrice - currentPrice) * quantity;
  const entryNotional = entryPrice * quantity;
  const pnlPct = entryNotional > 0 ? (rawPnl / entryNotional) * 100 : 0;
  const totalFees = (entryPrice + currentPrice) * quantity * feeRate;
  const netPnl = rawPnl - totalFees;

  return {
    pnl: Math.round(rawPnl * 100) / 100,
    pnlPct: Math.round(pnlPct * 100) / 100,
    netPnl: Math.round(netPnl * 100) / 100,
  };
}

/**
 * Calculates exact estimated liquidation price under isolated margin rules.
 */
export function calculateLiquidationPrice(
  entryPrice: number,
  leverage: number,
  direction: string,
  maintenanceMarginRate: number = 0.005
): number {
  if (entryPrice <= 0 || leverage <= 0) return 0;
  const isLong = direction.toUpperCase().includes("LONG") || direction.toUpperCase().includes("BUY");
  const initialMarginRatio = 1 / Math.max(1, leverage);

  if (isLong) {
    const liqPrice = entryPrice * (1 - initialMarginRatio + maintenanceMarginRate);
    return Math.max(0, Math.round(liqPrice * 100) / 100);
  } else {
    const liqPrice = entryPrice * (1 + initialMarginRatio - maintenanceMarginRate);
    return Math.round(liqPrice * 100) / 100;
  }
}

/**
 * Calculates Risk / Reward ratio and distance percentages.
 */
export function calculateRiskRewardMetrics(
  entryPrice: number,
  stopLoss: number,
  takeProfit: number,
  quantity: number,
  currentPrice?: number
) {
  const isLong = takeProfit >= entryPrice;
  const plannedRisk = Math.abs(entryPrice - stopLoss) * quantity;
  const plannedReward = Math.abs(takeProfit - entryPrice) * quantity;
  const rrRatio = plannedRisk > 0 ? Math.round((plannedReward / plannedRisk) * 100) / 100 : 2.0;

  const mark = currentPrice || entryPrice;
  const slDistPrice = Math.abs(mark - stopLoss);
  const slDistPct = mark > 0 ? Math.round((slDistPrice / mark) * 10000) / 100 : 0;
  const tpDistPrice = Math.abs(takeProfit - mark);
  const tpDistPct = mark > 0 ? Math.round((tpDistPrice / mark) * 10000) / 100 : 0;

  return {
    plannedRisk: Math.round(plannedRisk * 100) / 100,
    plannedReward: Math.round(plannedReward * 100) / 100,
    riskRewardRatio: rrRatio,
    slDistancePrice: Math.round(slDistPrice * 100) / 100,
    slDistancePct: slDistPct,
    tpDistancePrice: Math.round(tpDistPrice * 100) / 100,
    tpDistancePct: tpDistPct,
  };
}

/**
 * Computes exact breakeven price factoring in estimated round-trip transaction fees.
 */
export function calculateBreakevenPrice(
  entryPrice: number,
  direction: string,
  feeRate: number = 0.0004
): number {
  const isLong = direction.toUpperCase().includes("LONG") || direction.toUpperCase().includes("BUY");
  if (isLong) {
    return Math.round(entryPrice * (1 + feeRate * 2) * 100) / 100;
  } else {
    return Math.round(entryPrice * (1 - feeRate * 2) * 100) / 100;
  }
}

/**
 * Formats holding duration in seconds to clean human-readable text.
 */
export function formatPositionDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "Just now";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
