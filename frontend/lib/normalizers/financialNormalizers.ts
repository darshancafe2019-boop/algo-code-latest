/**
 * Authoritative Frontend Financial & Market Data Normalizers for Quant.OS
 * =========================================================================
 * Translates arbitrary API / store payloads into strictly typed, safe view models.
 * Missing or invalid financial numbers are normalized to null (never fake zeros).
 */

import { toFiniteNumber, safeArray } from "../formatters/financial";

export interface NormalizedPosition {
  id: string | number;
  symbol: string;
  direction: "LONG" | "SHORT";
  quantity: number | null;
  entryPrice: number | null;
  currentPrice: number | null;
  pnl: number | null;
  pnlPct: number | null;
  status: string;
  executionMode: "PAPER" | "LIVE";
  marketDataSource: string | null;
  executionBroker: string | null;
  feedStatus: string;
}

export interface NormalizedOrder {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number | null;
  filledQuantity: number | null;
  price: number | null;
  status: string;
  time: string;
  executionMode: "PAPER" | "LIVE";
}

export interface NormalizedBot {
  id: string;
  name: string;
  broker: string;
  instrument: string;
  strategy: string;
  timeframe: string;
  status: string;
  capital: number | string | null;
  pnl: number | string | null;
  lastSignal?: string;
  isRunning: boolean;
}

export interface NormalizedStrategy {
  id: string;
  name: string;
  instrument: string;
  type: string;
  winRate: number | string | null;
  profitFactor: number | string | null;
  status: string;
}

export interface NormalizedQuote {
  symbol: string;
  ltp: number | null;
  bid: number | null;
  ask: number | null;
  change: number | null;
  changePercent: number | null;
  source: string | null;
  status: "LIVE" | "WAITING" | "STALE" | "DISCONNECTED" | "UNAVAILABLE";
}

/**
 * Normalizes a raw position object (supporting PositionItem, PositionRecord, or backend dicts).
 */
export function normalizePosition(raw: any): NormalizedPosition | null {
  if (!raw || typeof raw !== "object") return null;

  const rawDir = String(raw.direction || raw.side || raw.type || "LONG").toUpperCase();
  const direction: "LONG" | "SHORT" = rawDir === "SHORT" || rawDir === "SELL" ? "SHORT" : "LONG";

  const entryPrice = toFiniteNumber(raw.entry_price ?? raw.entryPrice ?? raw.avgPrice ?? raw.avg_price ?? raw.price);
  const currentPrice = toFiniteNumber(raw.current_price ?? raw.currentPrice ?? raw.ltp ?? raw.mark_price ?? raw.last_price);
  const quantity = toFiniteNumber(raw.quantity ?? raw.qty ?? raw.position_size ?? raw.size);

  let pnl = toFiniteNumber(raw.unrealized_pnl ?? raw.pnl ?? raw.unrealizedPnl ?? raw.net_pnl);
  let pnlPct = toFiniteNumber(raw.unrealized_pnl_pct ?? raw.pnlPct ?? raw.pnl_pct ?? raw.unrealizedPnlPct);

  // Safely derive PnL if absent but prices & quantity are valid
  if (pnl === null && entryPrice !== null && currentPrice !== null && quantity !== null) {
    const diff = direction === "LONG" ? currentPrice - entryPrice : entryPrice - currentPrice;
    pnl = diff * quantity;
    if (entryPrice > 0) {
      pnlPct = (diff / entryPrice) * 100;
    }
  }

  return {
    id: raw.id ?? raw.position_uid ?? raw.trade_id ?? `pos_${Math.random().toString(36).substring(2, 7)}`,
    symbol: String(raw.symbol || "UNKNOWN").toUpperCase(),
    direction,
    quantity,
    entryPrice,
    currentPrice,
    pnl,
    pnlPct,
    status: String(raw.status || "OPEN").toUpperCase(),
    executionMode: String(raw.execution_mode || raw.executionMode || "PAPER").toUpperCase() === "LIVE" ? "LIVE" : "PAPER",
    marketDataSource: raw.market_data_source || raw.marketDataSource || null,
    executionBroker: raw.execution_broker || raw.executionBroker || raw.broker || null,
    feedStatus: String(raw.feed_status || raw.feedStatus || "LIVE").toUpperCase(),
  };
}

/**
 * Normalizes a raw order object.
 */
export function normalizeOrder(raw: any): NormalizedOrder | null {
  if (!raw || typeof raw !== "object") return null;

  const rawSide = String(raw.direction || raw.side || raw.type || "BUY").toUpperCase();
  const side: "BUY" | "SELL" = rawSide.includes("SELL") || rawSide === "SHORT" ? "SELL" : "BUY";

  const quantity = toFiniteNumber(raw.requested_quantity ?? raw.quantity ?? raw.qty ?? raw.size);
  const filledQuantity = toFiniteNumber(raw.filled_quantity ?? raw.filledQty ?? raw.executed_qty);
  const price = toFiniteNumber(raw.price ?? raw.avg_price ?? raw.limit_price);

  let timeStr = "—";
  if (raw.created_at || raw.timestamp || raw.time || raw.opened_at) {
    const rawTime = String(raw.created_at || raw.timestamp || raw.time || raw.opened_at);
    if (rawTime.includes("T") || rawTime.includes("-")) {
      try {
        const d = new Date(rawTime);
        if (!isNaN(d.getTime())) {
          timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        } else {
          timeStr = rawTime;
        }
      } catch {
        timeStr = rawTime;
      }
    } else {
      timeStr = rawTime;
    }
  }

  return {
    id: String(raw.id || raw.order_id || raw.orderId || `ORD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`),
    symbol: String(raw.symbol || "UNKNOWN").toUpperCase(),
    side,
    quantity,
    filledQuantity,
    price,
    status: String(raw.status || "OPEN").toUpperCase(),
    time: timeStr,
    executionMode: String(raw.execution_mode || raw.executionMode || "PAPER").toUpperCase() === "LIVE" ? "LIVE" : "PAPER",
  };
}

/**
 * Normalizes an array of raw position objects.
 */
export function normalizePositions(items: unknown): NormalizedPosition[] {
  return safeArray(items)
    .map(normalizePosition)
    .filter((p): p is NormalizedPosition => p !== null);
}

/**
 * Normalizes an array of raw order objects.
 */
export function normalizeOrders(items: unknown): NormalizedOrder[] {
  return safeArray(items)
    .map(normalizeOrder)
    .filter((o): o is NormalizedOrder => o !== null);
}
