/**
 * Upstox Account, Profile, Funds, Holdings, Positions, and Orders Service
 * =======================================================================
 * Connects directly to official Upstox V2 and V3 account endpoints:
 * - Profile: GET /v2/user/profile
 * - Funds & Margin: GET /v3/user/get-funds-and-margin
 * - Holdings: GET /v2/portfolio/long-term-holdings
 * - Positions: GET /v2/portfolio/short-term-positions
 * - Orders: GET /v2/order/retrieve-all
 * - Trades: GET /v2/order/trades/get-trades-for-day
 */

import { upstoxFetch } from "./client";

export interface UpstoxUserProfile {
  user_id: string;
  user_name: string;
  email: string;
  user_type: string;
  is_active: boolean;
  exchanges: string[];
  products: string[];
  order_types: string[];
  broker: string;
}

export interface UpstoxFundsMargin {
  equity: {
    used_margin: number;
    payin_amount: number;
    span_margin: number;
    adhoc_margin: number;
    notional_cash: number;
    available_margin: number;
    exposure_margin: number;
  };
  commodity?: {
    used_margin: number;
    available_margin: number;
  };
}

export interface UpstoxHolding {
  isin: string;
  company_name: string;
  trading_symbol: string;
  instrument_token: string;
  quantity: number;
  t1_quantity: number;
  collateral_quantity: number;
  collateral_update_qty: number;
  haircut: number;
  avg_price: number;
  last_price: number;
  pnl: number;
  close_price: number;
  asset_class?: string;
}

export interface UpstoxPosition {
  instrument_token: string;
  symbol: string;
  quantity: number;
  buy_amount: number;
  sell_amount: number;
  buy_quantity: number;
  sell_quantity: number;
  buy_price: number;
  sell_price: number;
  avg_price: number;
  last_price: number;
  pnl: number;
  realized_pnl: number;
  unrealized_pnl: number;
  value: number;
  product: string;
  exchange: string;
  asset_class?: "STOCK" | "FUTURE" | "OPTION" | "INDEX" | "OTHER";
}

export interface UpstoxOrder {
  order_id: string;
  exchange_order_id?: string;
  exchange: string;
  symbol: string;
  trading_symbol: string;
  instrument_token: string;
  order_type: string;
  transaction_type: "BUY" | "SELL";
  product: string;
  quantity: number;
  price: number;
  trigger_price: number;
  disclosed_quantity: number;
  validity: string;
  status: string;
  status_message?: string;
  order_timestamp: string;
  average_price: number;
  filled_quantity: number;
  pending_quantity: number;
  cancelled_quantity: number;
  asset_class?: "STOCK" | "FUTURE" | "OPTION" | "INDEX" | "OTHER";
}

export interface UpstoxTrade {
  trade_id: string;
  order_id: string;
  exchange_order_id?: string;
  exchange: string;
  symbol: string;
  trading_symbol: string;
  instrument_token: string;
  transaction_type: "BUY" | "SELL";
  product: string;
  quantity: number;
  price: number;
  trade_timestamp: string;
  asset_class?: "STOCK" | "FUTURE" | "OPTION" | "INDEX" | "OTHER";
}

export interface UpstoxPnLSummary {
  realized_pnl: number;
  unrealized_pnl: number;
  net_pnl: number;
  charges: number;
  net_after_charges: number;
  stocks_pnl: number;
  futures_pnl: number;
  options_pnl: number;
  positions_count: number;
  holdings_count: number;
  timestamp: string;
}

/**
 * Classify instrument token or symbol into standard asset class
 */
export function classifyUpstoxAssetClass(symbolOrToken: string, product?: string): "STOCK" | "FUTURE" | "OPTION" | "INDEX" | "OTHER" {
  const upper = (symbolOrToken || "").toUpperCase();
  if (upper.includes(" CE") || upper.includes(" PE") || upper.endsWith("CE") || upper.endsWith("PE")) {
    return "OPTION";
  }
  if (upper.includes(" FUT") || upper.endsWith("FUT")) {
    return "FUTURE";
  }
  if (upper.startsWith("NSE_INDEX") || upper.includes("NIFTY 50") || upper.includes("BANK NIFTY") || upper.includes("INDIA VIX")) {
    return "INDEX";
  }
  if (upper.startsWith("NSE_EQ") || upper.startsWith("BSE_EQ") || upper.includes("INE")) {
    return "STOCK";
  }
  return "STOCK";
}

/**
 * Fetch authenticated user profile
 */
export async function getUpstoxProfile(oauthToken?: string | null): Promise<UpstoxUserProfile> {
  const res = await upstoxFetch<{ status: string; data: UpstoxUserProfile }>("user/profile", {
    apiVersion: "v2",
    oauthToken,
  });
  return res.data;
}

/**
 * Fetch current funds and margin (V3)
 */
export async function getUpstoxFunds(oauthToken?: string | null): Promise<UpstoxFundsMargin> {
  const res = await upstoxFetch<{ status: string; data: UpstoxFundsMargin }>("user/get-funds-and-margin", {
    apiVersion: "v3",
    oauthToken,
  });
  return res.data;
}

/**
 * Fetch long-term portfolio holdings
 */
export async function getUpstoxHoldings(oauthToken?: string | null): Promise<UpstoxHolding[]> {
  const res = await upstoxFetch<{ status: string; data: UpstoxHolding[] }>("portfolio/long-term-holdings", {
    apiVersion: "v2",
    oauthToken,
  });
  const holdings = res.data || [];
  return holdings.map((h) => ({
    ...h,
    asset_class: "STOCK",
  }));
}

/**
 * Fetch short-term open and intraday positions
 */
export async function getUpstoxPositions(oauthToken?: string | null): Promise<UpstoxPosition[]> {
  const res = await upstoxFetch<{ status: string; data: UpstoxPosition[] }>("portfolio/short-term-positions", {
    apiVersion: "v2",
    oauthToken,
  });
  const positions = res.data || [];
  return positions.map((p) => ({
    ...p,
    asset_class: classifyUpstoxAssetClass(p.symbol || p.instrument_token, p.product),
  }));
}

/**
 * Fetch all orders for the current session
 */
export async function getUpstoxOrders(oauthToken?: string | null): Promise<UpstoxOrder[]> {
  const res = await upstoxFetch<{ status: string; data: UpstoxOrder[] }>("order/retrieve-all", {
    apiVersion: "v2",
    oauthToken,
  });
  const orders = res.data || [];
  return orders.map((o) => ({
    ...o,
    asset_class: classifyUpstoxAssetClass(o.trading_symbol || o.symbol || o.instrument_token, o.product),
  }));
}

/**
 * Fetch all executed trades for the day
 */
export async function getUpstoxTrades(oauthToken?: string | null): Promise<UpstoxTrade[]> {
  const res = await upstoxFetch<{ status: string; data: UpstoxTrade[] }>("order/trades/get-trades-for-day", {
    apiVersion: "v2",
    oauthToken,
  });
  const trades = res.data || [];
  return trades.map((t) => ({
    ...t,
    asset_class: classifyUpstoxAssetClass(t.trading_symbol || t.symbol || t.instrument_token, t.product),
  }));
}

/**
 * Calculate consolidated Upstox P&L from positions and trade logs
 */
export async function getUpstoxPnLSummary(oauthToken?: string | null): Promise<UpstoxPnLSummary> {
  const [positions, trades] = await Promise.all([
    getUpstoxPositions(oauthToken).catch(() => []),
    getUpstoxTrades(oauthToken).catch(() => []),
  ]);

  let realized_pnl = 0;
  let unrealized_pnl = 0;
  let stocks_pnl = 0;
  let futures_pnl = 0;
  let options_pnl = 0;

  for (const pos of positions) {
    const rPnl = Number(pos.realized_pnl || 0);
    const uPnl = Number(pos.unrealized_pnl || (pos.pnl - rPnl) || 0);
    const totalPnl = rPnl + uPnl;

    realized_pnl += rPnl;
    unrealized_pnl += uPnl;

    if (pos.asset_class === "STOCK") stocks_pnl += totalPnl;
    else if (pos.asset_class === "FUTURE") futures_pnl += totalPnl;
    else if (pos.asset_class === "OPTION") options_pnl += totalPnl;
  }

  // Calculate estimated regulatory charges (STT, exchange turnover, GST, SEBI fee)
  let totalTurnover = 0;
  for (const t of trades) {
    totalTurnover += (Number(t.quantity || 0) * Number(t.price || 0));
  }
  const estimatedCharges = roundToTwo(totalTurnover * 0.00035); // ~0.035% average all-in turnover friction

  const net_pnl = realized_pnl + unrealized_pnl;
  const net_after_charges = net_pnl - estimatedCharges;

  return {
    realized_pnl: roundToTwo(realized_pnl),
    unrealized_pnl: roundToTwo(unrealized_pnl),
    net_pnl: roundToTwo(net_pnl),
    charges: estimatedCharges,
    net_after_charges: roundToTwo(net_after_charges),
    stocks_pnl: roundToTwo(stocks_pnl),
    futures_pnl: roundToTwo(futures_pnl),
    options_pnl: roundToTwo(options_pnl),
    positions_count: positions.length,
    holdings_count: 0,
    timestamp: new Date().toISOString(),
  };
}

function roundToTwo(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}
