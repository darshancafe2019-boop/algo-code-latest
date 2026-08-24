/**
 * Quant.OS NSE India Complete API Client
 * Connects frontend directly to high-speed backend market data, historical candles & algo bot endpoints.
 */

import {
  NseQuoteResponse,
  NseOptionChainResponse,
  NseMarketSummaryResponse,
  NseDerivativesResponse,
  NseTradeExecutionPayload,
  NseTradeExecutionResponse,
  CorporateActionItem,
} from "@/types/nse";

export async function fetchNseQuote(symbol: string = "NIFTY"): Promise<NseQuoteResponse> {
  const res = await fetch(`/api/nse/quote?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`Failed to fetch NSE quote for ${symbol}`);
  return res.json();
}

export async function fetchNseOptionChain(
  symbol: string = "NIFTY",
  expiry: string = "",
  strikeCount: number = 20
): Promise<NseOptionChainResponse> {
  const params = new URLSearchParams({
    symbol,
    strike_count: strikeCount.toString(),
  });
  if (expiry) params.append("expiry", expiry);

  const res = await fetch(`/api/nse/option-chain?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch NSE option chain for ${symbol}`);
  return res.json();
}

export async function fetchNseMarketSummary(): Promise<NseMarketSummaryResponse> {
  const res = await fetch("/api/nse/market-summary");
  if (!res.ok) throw new Error("Failed to fetch NSE market summary");
  return res.json();
}

export async function fetchNseDerivatives(): Promise<NseDerivativesResponse> {
  const res = await fetch("/api/nse/derivatives/most-active");
  if (!res.ok) throw new Error("Failed to fetch NSE derivatives analytics");
  return res.json();
}

export async function fetchNseFiiDii(): Promise<any> {
  const res = await fetch("/api/nse/fii-dii");
  if (!res.ok) throw new Error("Failed to fetch FII/DII institutional flows");
  return res.json();
}

export async function fetchNseHolidays(): Promise<any> {
  const res = await fetch("/api/nse/holidays");
  if (!res.ok) throw new Error("Failed to fetch NSE holidays");
  return res.json();
}

export async function fetchNseCorporateActions(): Promise<{ status: string; data: CorporateActionItem[] }> {
  const res = await fetch("/api/nse/corporate-actions");
  if (!res.ok) throw new Error("Failed to fetch NSE corporate actions");
  return res.json();
}

export async function fetchNseCandles(
  symbol: string = "NIFTY 50",
  exchange: "NSE" | "NFO" = "NSE",
  interval: string = "1d",
  days: number = 7,
  indicators: boolean = true
): Promise<{ status: string; symbol: string; interval: string; count: number; candles: any[] }> {
  const params = new URLSearchParams({
    symbol,
    exchange,
    interval,
    days: days.toString(),
    indicators: indicators.toString(),
  });
  const res = await fetch(`/api/nse/candles?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch NSE candles for ${symbol}`);
  return res.json();
}

export async function fetchNseMasterSearch(
  query: string = "NIFTY",
  exchange: "NSE" | "NFO" = "NSE",
  match: boolean = false
): Promise<{ status: string; query: string; exchange: string; count: number; results: any[] }> {
  const params = new URLSearchParams({
    symbol: query,
    exchange,
    match: match.toString(),
  });
  const res = await fetch(`/api/nse/master/search?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to search NSE master for ${query}`);
  return res.json();
}

export async function fetchNseEquitiesMaster(): Promise<{ status: string; data: any[] }> {
  const res = await fetch("/api/nse/equities/master?list_only=false");
  if (!res.ok) throw new Error("Failed to fetch NSE equities master list");
  return res.json();
}

export async function fetchNseFnoMaster(): Promise<{ status: string; data: any[] }> {
  const res = await fetch("/api/nse/fno/master?list_only=false");
  if (!res.ok) throw new Error("Failed to fetch NSE FNO master list");
  return res.json();
}

export async function fetchNsePreMarket(category: string = "All"): Promise<{ status: string; data: any[] }> {
  const res = await fetch(`/api/nse/pre-market?category=${encodeURIComponent(category)}`);
  if (!res.ok) throw new Error("Failed to fetch NSE pre-market data");
  return res.json();
}

export async function fetchNseValuation(): Promise<{ status: string; pe_ratios: any[]; pb_ratios: any[]; div_yields: any[] }> {
  const res = await fetch("/api/nse/valuation");
  if (!res.ok) throw new Error("Failed to fetch NSE valuation ratios");
  return res.json();
}

export async function fetchNseOiQuadrants(): Promise<{
  status: string;
  oi_underlying: any[];
  long_buildup: any[];
  short_buildup: any[];
  long_unwinding: any[];
  short_covering: any[];
}> {
  const res = await fetch("/api/nse/oi-quadrants");
  if (!res.ok) throw new Error("Failed to fetch NSE OI 4-quadrant build-up");
  return res.json();
}

export async function fetchNseInsiderTrading(): Promise<{ status: string; data: any[] }> {
  const res = await fetch("/api/nse/insider-trading");
  if (!res.ok) throw new Error("Failed to fetch NSE insider trading filings");
  return res.json();
}

export async function fetchNseResultsCalendar(): Promise<{ status: string; data: any[] }> {
  const res = await fetch("/api/nse/results-calendar");
  if (!res.ok) throw new Error("Failed to fetch NSE results calendar");
  return res.json();
}

export async function fetchNseEtfs(): Promise<{ status: string; data: any[] }> {
  const res = await fetch("/api/nse/etfs");
  if (!res.ok) throw new Error("Failed to fetch NSE ETF list");
  return res.json();
}

export async function fetchNseBotSignals(symbol: string = "NIFTY"): Promise<any> {
  const res = await fetch(`/api/nse/bot/signals?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error("Failed to fetch NSE algo bot signals");
  return res.json();
}

export async function executeNseTrade(
  payload: NseTradeExecutionPayload
): Promise<NseTradeExecutionResponse> {
  const res = await fetch("/api/nse/trade/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to route NSE trade order");
  return res.json();
}
