/**
 * Quant.OS NSE India Complete Resilient API Client
 * Connects frontend safely to high-speed backend market data, historical candles & algo bot endpoints.
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
import { apiClient } from "./apiClient";

export async function fetchNseQuote(symbol: string = "NIFTY"): Promise<NseQuoteResponse> {
  const res = await apiClient.get<NseQuoteResponse>(`/api/nse/quote?symbol=${encodeURIComponent(symbol)}`, { timeoutMs: 5000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || `Failed to fetch NSE quote for ${symbol}`);
  return res.data;
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

  const res = await apiClient.get<NseOptionChainResponse>(`/api/nse/option-chain?${params.toString()}`, { timeoutMs: 6000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || `Failed to fetch NSE option chain for ${symbol}`);
  return res.data;
}

export async function fetchNseMarketSummary(): Promise<NseMarketSummaryResponse> {
  const res = await apiClient.get<NseMarketSummaryResponse>("/api/nse/market-summary", { timeoutMs: 5000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch NSE market summary");
  return res.data;
}

export async function fetchNseDerivatives(): Promise<NseDerivativesResponse> {
  const res = await apiClient.get<NseDerivativesResponse>("/api/nse/derivatives/most-active", { timeoutMs: 5000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch NSE derivatives analytics");
  return res.data;
}

export async function fetchNseFiiDii(): Promise<any> {
  const res = await apiClient.get<any>("/api/nse/fii-dii", { timeoutMs: 5000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch FII/DII institutional flows");
  return res.data;
}

export async function fetchNseHolidays(): Promise<any> {
  const res = await apiClient.get<any>("/api/nse/holidays", { timeoutMs: 5000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch NSE holidays");
  return res.data;
}

export async function fetchNseCorporateActions(): Promise<{ status: string; data: CorporateActionItem[] }> {
  const res = await apiClient.get<{ status: string; data: CorporateActionItem[] }>("/api/nse/corporate-actions", { timeoutMs: 5000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch NSE corporate actions");
  return res.data;
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
  const res = await apiClient.get<{ status: string; symbol: string; interval: string; count: number; candles: any[] }>(
    `/api/nse/candles?${params.toString()}`,
    { timeoutMs: 6000 }
  );
  if (!res.ok || !res.data) throw new Error(res.error?.message || `Failed to fetch NSE candles for ${symbol}`);
  return res.data;
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
  const res = await apiClient.get<{ status: string; query: string; exchange: string; count: number; results: any[] }>(
    `/api/nse/master/search?${params.toString()}`,
    { timeoutMs: 5000 }
  );
  if (!res.ok || !res.data) throw new Error(res.error?.message || `Failed to search NSE master for ${query}`);
  return res.data;
}

export async function fetchNseEquitiesMaster(): Promise<{ status: string; data: any[] }> {
  const res = await apiClient.get<{ status: string; data: any[] }>("/api/nse/equities/master?list_only=false", { timeoutMs: 5000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch NSE equities master list");
  return res.data;
}

export async function fetchNseFnoMaster(): Promise<{ status: string; data: any[] }> {
  const res = await apiClient.get<{ status: string; data: any[] }>("/api/nse/fno/master?list_only=false", { timeoutMs: 5000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch NSE FNO master list");
  return res.data;
}

export async function fetchNsePreMarket(category: string = "All"): Promise<{ status: string; data: any[] }> {
  const res = await apiClient.get<{ status: string; data: any[] }>(`/api/nse/pre-market?category=${encodeURIComponent(category)}`, { timeoutMs: 5000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch NSE pre-market data");
  return res.data;
}

export async function fetchNseValuation(): Promise<{ status: string; pe_ratios: any[]; pb_ratios: any[]; div_yields: any[] }> {
  const res = await apiClient.get<{ status: string; pe_ratios: any[]; pb_ratios: any[]; div_yields: any[] }>("/api/nse/valuation", { timeoutMs: 5000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch NSE valuation ratios");
  return res.data;
}

export async function fetchNseOiQuadrants(): Promise<{
  status: string;
  oi_underlying: any[];
  long_buildup: any[];
  short_buildup: any[];
  long_unwinding: any[];
  short_covering: any[];
}> {
  const res = await apiClient.get<{
    status: string;
    oi_underlying: any[];
    long_buildup: any[];
    short_buildup: any[];
    long_unwinding: any[];
    short_covering: any[];
  }>("/api/nse/oi-quadrants", { timeoutMs: 5000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch NSE OI 4-quadrant build-up");
  return res.data;
}

export async function fetchNseInsiderTrading(): Promise<{ status: string; data: any[] }> {
  const res = await apiClient.get<{ status: string; data: any[] }>("/api/nse/insider-trading", { timeoutMs: 5000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch NSE insider trading filings");
  return res.data;
}

export async function fetchNseResultsCalendar(): Promise<{ status: string; data: any[] }> {
  const res = await apiClient.get<{ status: string; data: any[] }>("/api/nse/results-calendar", { timeoutMs: 5000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch NSE results calendar");
  return res.data;
}

export async function fetchNseEtfs(): Promise<{ status: string; data: any[] }> {
  const res = await apiClient.get<{ status: string; data: any[] }>("/api/nse/etfs", { timeoutMs: 5000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch NSE ETF list");
  return res.data;
}

export async function fetchNseBotSignals(symbol: string = "NIFTY"): Promise<any> {
  const res = await apiClient.get<any>(`/api/nse/bot/signals?symbol=${encodeURIComponent(symbol)}`, { timeoutMs: 5000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch NSE algo bot signals");
  return res.data;
}

export async function executeNseTrade(
  payload: NseTradeExecutionPayload
): Promise<NseTradeExecutionResponse> {
  const res = await apiClient.post<NseTradeExecutionResponse>("/api/nse/trade/execute", payload, { timeoutMs: 8000 });
  if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to route NSE trade order");
  return res.data;
}
