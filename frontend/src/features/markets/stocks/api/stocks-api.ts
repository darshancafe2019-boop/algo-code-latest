/**
 * Stocks Market Data API Client
 * ==============================
 * Typed HTTP client interfacing with /api/market-data/stocks/* endpoints.
 */

import {
  StockQuoteRow,
  StockInstrument,
  StockFundamentals,
  StockTechnicals,
  StockAnalysisResult,
  StockCandle,
  StockFilterState,
  ApiResponseEnvelope,
} from "../types/stocks";
import { serializeStockFilters } from "../utils/filter-serialization";

const BASE_URL = "/api/market-data/stocks";

export async function fetchStocks(
  filters: StockFilterState
): Promise<ApiResponseEnvelope<StockQuoteRow[]>> {
  const qs = serializeStockFilters(filters);
  const res = await fetch(`${BASE_URL}?${qs}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch stocks (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function fetchStockDetail(
  instrumentId: string
): Promise<ApiResponseEnvelope<StockInstrument>> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(instrumentId)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch stock detail: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchStockHistory(
  instrumentId: string,
  timeframe: string = "15m",
  limit: number = 100
): Promise<ApiResponseEnvelope<StockCandle[]>> {
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent(instrumentId)}/history?timeframe=${timeframe}&limit=${limit}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch stock candles: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchStockFundamentals(
  instrumentId: string
): Promise<ApiResponseEnvelope<StockFundamentals>> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(instrumentId)}/fundamentals`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch fundamentals: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchStockTechnicals(
  instrumentId: string,
  timeframe: string = "1d"
): Promise<ApiResponseEnvelope<StockTechnicals>> {
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent(instrumentId)}/analysis?timeframe=${timeframe}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch analysis: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchStockAnalysis(
  instrumentId: string,
  timeframe: string = "1d"
): Promise<ApiResponseEnvelope<StockAnalysisResult>> {
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent(instrumentId)}/analysis?timeframe=${timeframe}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch analysis: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchStockMovers(
  preset: string = "gainers",
  exchange?: string,
  limit: number = 10
): Promise<ApiResponseEnvelope<any[]>> {
  const params = new URLSearchParams({ preset, limit: String(limit) });
  if (exchange && exchange !== "ALL") params.set("exchange", exchange);

  const res = await fetch(`${BASE_URL}/movers?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch stock movers: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchFilterSchema(): Promise<ApiResponseEnvelope<any>> {
  const res = await fetch(`${BASE_URL}/filters/schema`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch filter schema: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchFavorites(): Promise<ApiResponseEnvelope<string[]>> {
  const res = await fetch(`${BASE_URL}/favorites`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return { success: true, data: [], meta: {} as any };
  return res.json();
}

export async function toggleFavoriteStock(
  instrumentId: string,
  symbol: string,
  exchange: string
): Promise<ApiResponseEnvelope<{ instrument_id: string; is_favorite: boolean }>> {
  const res = await fetch(`${BASE_URL}/favorites/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instrument_id: instrumentId, symbol, exchange }),
  });
  if (!res.ok) {
    throw new Error(`Failed to toggle favorite: ${res.statusText}`);
  }
  return res.json();
}
