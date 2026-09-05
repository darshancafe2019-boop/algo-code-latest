/**
 * Stocks Market Data API Client
 * ==============================
 * Typed HTTP client interfacing with /api/market-data/stocks/* endpoints.
 */

import { apiClient } from "@/lib/apiClient";
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
  const res = await apiClient.get<ApiResponseEnvelope<StockQuoteRow[]>>(`${BASE_URL}?${qs}`, {
    timeoutMs: 8000,
    deduplicate: true,
  });
  if (!res.ok || !res.data) {
    throw new Error(`Failed to fetch stocks: ${res.error || "Unknown error"}`);
  }
  return res.data;
}

export async function fetchStockDetail(
  instrumentId: string
): Promise<ApiResponseEnvelope<StockInstrument>> {
  const res = await apiClient.get<ApiResponseEnvelope<StockInstrument>>(`${BASE_URL}/${encodeURIComponent(instrumentId)}`, {
    timeoutMs: 8000,
    deduplicate: true,
  });
  if (!res.ok || !res.data) {
    throw new Error(`Failed to fetch stock detail: ${res.error || "Unknown error"}`);
  }
  return res.data;
}

export async function fetchStockHistory(
  instrumentId: string,
  timeframe: string = "15m",
  limit: number = 100
): Promise<ApiResponseEnvelope<StockCandle[]>> {
  const res = await apiClient.get<ApiResponseEnvelope<StockCandle[]>>(
    `${BASE_URL}/${encodeURIComponent(instrumentId)}/history?timeframe=${timeframe}&limit=${limit}`,
    {
      timeoutMs: 8000,
      deduplicate: true,
    }
  );
  if (!res.ok || !res.data) {
    throw new Error(`Failed to fetch stock candles: ${res.error || "Unknown error"}`);
  }
  return res.data;
}

export async function fetchStockFundamentals(
  instrumentId: string
): Promise<ApiResponseEnvelope<StockFundamentals>> {
  const res = await apiClient.get<ApiResponseEnvelope<StockFundamentals>>(`${BASE_URL}/${encodeURIComponent(instrumentId)}/fundamentals`, {
    timeoutMs: 8000,
    deduplicate: true,
  });
  if (!res.ok || !res.data) {
    throw new Error(`Failed to fetch fundamentals: ${res.error || "Unknown error"}`);
  }
  return res.data;
}

export async function fetchStockTechnicals(
  instrumentId: string,
  timeframe: string = "1d"
): Promise<ApiResponseEnvelope<StockTechnicals>> {
  const res = await apiClient.get<ApiResponseEnvelope<StockTechnicals>>(
    `${BASE_URL}/${encodeURIComponent(instrumentId)}/analysis?timeframe=${timeframe}`,
    {
      timeoutMs: 8000,
      deduplicate: true,
    }
  );
  if (!res.ok || !res.data) {
    throw new Error(`Failed to fetch analysis: ${res.error || "Unknown error"}`);
  }
  return res.data;
}

export async function fetchStockAnalysis(
  instrumentId: string,
  timeframe: string = "1d"
): Promise<ApiResponseEnvelope<StockAnalysisResult>> {
  const res = await apiClient.get<ApiResponseEnvelope<StockAnalysisResult>>(
    `${BASE_URL}/${encodeURIComponent(instrumentId)}/analysis?timeframe=${timeframe}`,
    {
      timeoutMs: 8000,
      deduplicate: true,
    }
  );
  if (!res.ok || !res.data) {
    throw new Error(`Failed to fetch analysis: ${res.error || "Unknown error"}`);
  }
  return res.data;
}

export async function fetchStockMovers(
  preset: string = "gainers",
  exchange?: string,
  limit: number = 10
): Promise<ApiResponseEnvelope<any[]>> {
  const params = new URLSearchParams({ preset, limit: String(limit) });
  if (exchange && exchange !== "ALL") params.set("exchange", exchange);

  const res = await apiClient.get<ApiResponseEnvelope<any[]>>(`${BASE_URL}/movers?${params.toString()}`, {
    timeoutMs: 8000,
    deduplicate: true,
  });
  if (!res.ok || !res.data) {
    throw new Error(`Failed to fetch stock movers: ${res.error || "Unknown error"}`);
  }
  return res.data;
}

export async function fetchFilterSchema(): Promise<ApiResponseEnvelope<any>> {
  const res = await apiClient.get<ApiResponseEnvelope<any>>(`${BASE_URL}/filters/schema`, {
    timeoutMs: 8000,
    deduplicate: true,
  });
  if (!res.ok || !res.data) {
    throw new Error(`Failed to fetch filter schema: ${res.error || "Unknown error"}`);
  }
  return res.data;
}

export async function fetchFavorites(): Promise<ApiResponseEnvelope<string[]>> {
  const res = await apiClient.get<ApiResponseEnvelope<string[]>>(`${BASE_URL}/favorites`, {
    timeoutMs: 8000,
    deduplicate: true,
  });
  if (!res.ok || !res.data) return { success: true, data: [], meta: {} as any };
  return res.data;
}

export async function toggleFavoriteStock(
  instrumentId: string,
  symbol: string,
  exchange: string
): Promise<ApiResponseEnvelope<{ instrument_id: string; is_favorite: boolean }>> {
  const res = await apiClient.post<ApiResponseEnvelope<{ instrument_id: string; is_favorite: boolean }>>(
    `${BASE_URL}/favorites/toggle`,
    { instrument_id: instrumentId, symbol, exchange },
    { timeoutMs: 5000 }
  );
  if (!res.ok || !res.data) {
    throw new Error(`Failed to toggle favorite: ${res.error || "Unknown error"}`);
  }
  return res.data;
}
