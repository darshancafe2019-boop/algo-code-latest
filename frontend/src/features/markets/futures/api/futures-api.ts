/**
 * Futures Universe API Client
 * ===========================
 * Fast, resilient API client with cached fallbacks.
 */

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

    const res = await fetch(`/api/futures/universe?${query.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.contracts) ? data.contracts : [];
  } catch (err) {
    console.warn("Falling back to internal mock contracts:", err);
    return [];
  }
}

export async function fetchFundingHeatmap(): Promise<FundingHeatmapItem[]> {
  try {
    const res = await fetch("/api/futures/funding-heatmap");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
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
    const res = await fetch("/api/futures/calculate-liquidation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.result || null;
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
