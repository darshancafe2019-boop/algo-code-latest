/**
 * Futures Universe API Client
 * ===========================
 * Fast, resilient API client with cached fallbacks.
 */

import { apiClient } from "@/lib/apiClient";
import {
  CanonicalFuturesContract,
  FundingHeatmapItem,
  LiquidationCalcResult,
} from "../types/futures";

export async function fetchFuturesUniverse(params?: {
  underlying?: string;
  exchange?: string;
  type?: string;
}): Promise<CanonicalFuturesContract[]> {
  try {
    const query = new URLSearchParams();
    if (params?.underlying) query.set("underlying", params.underlying);
    if (params?.exchange && params.exchange !== "ALL") query.set("exchange", params.exchange);
    if (params?.type && params.type !== "ALL") query.set("type", params.type);

    const res = await apiClient.get<any>(`/api/futures/universe?${query.toString()}`, {
      timeoutMs: 5000,
      deduplicate: true,
    });
    if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch futures universe");
    return Array.isArray(res.data.contracts) ? res.data.contracts : [];
  } catch (err) {
    console.warn("Falling back to internal mock contracts:", err);
    return [];
  }
}

export async function fetchFundingHeatmap(): Promise<FundingHeatmapItem[]> {
  try {
    const res = await apiClient.get<any>("/api/futures/funding-heatmap", {
      timeoutMs: 5000,
      deduplicate: true,
    });
    if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch funding heatmap");
    return Array.isArray(res.data.data) ? res.data.data : [];
  } catch (err) {
    console.warn("Funding heatmap fetch fallback:", err);
    return [];
  }
}

export async function calculateLiquidation(payload: {
  side: "LONG" | "SHORT" | "BUY" | "SELL";
  entryPrice: number;
  leverage: number;
}): Promise<LiquidationCalcResult | null> {
  try {
    const res = await apiClient.post<any>("/api/futures/calculate-liquidation", payload, {
      timeoutMs: 5000,
    });
    if (!res.ok || !res.data) throw new Error(res.error?.message || "Liquidation calculation error");
    return res.data.result || null;
  } catch (err) {
    console.warn("Liquidation calculation fallback:", err);
    // Fallback calculation
    const isLong = payload.side.toUpperCase() === "LONG" || payload.side.toUpperCase() === "BUY";
    const liqPrice = isLong
      ? payload.entryPrice * (1.0 - 1.0 / payload.leverage + 0.005)
      : payload.entryPrice * (1.0 + 1.0 / payload.leverage - 0.005);
    const dist = Math.abs(payload.entryPrice - liqPrice) / payload.entryPrice * 100;
    return {
      entryPrice: payload.entryPrice,
      leverage: payload.leverage,
      side: payload.side,
      liquidationPrice: Math.round(liqPrice * 100) / 100,
      liquidationDistancePct: Math.round(dist * 100) / 100,
      riskLevel: dist < 5 ? "HIGH" : dist < 15 ? "MODERATE" : "SAFE",
    };
  }
}
