/**
 * Futures Universe API Client
 * ===========================
 * Fast, resilient API client for universal futures, live market-data, provider health, and risk-gated order intents.
 */

import { apiClient } from "@/lib/apiClient";
import {
  CanonicalFuturesContract,
  FundingHeatmapItem,
  LiquidationCalcResult,
  FuturesUniverseResponse,
  ProviderHealthReport,
  FuturesPosition,
  OrderIntentPayload,
  OrderIntentResponse,
} from "../types/futures";

export async function fetchFuturesUniverseData(params?: {
  underlying?: string;
  exchange?: string;
  type?: string;
  source?: string;
  expiry?: string;
  fresh_only?: boolean;
}): Promise<FuturesUniverseResponse> {
  try {
    const query = new URLSearchParams();
    if (params?.underlying) query.set("underlying", params.underlying);
    if (params?.exchange && params.exchange !== "ALL") query.set("exchange", params.exchange);
    if (params?.type && params.type !== "ALL") query.set("type", params.type);
    if (params?.source && params.source !== "ALL") query.set("source", params.source);
    if (params?.expiry && params.expiry !== "ALL") query.set("expiry", params.expiry);
    if (params?.fresh_only) query.set("fresh_only", "true");

    const res = await apiClient.get<any>(`/api/futures/universe?${query.toString()}`, {
      timeoutMs: 5000,
      deduplicate: true,
    });
    if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch futures universe");
    return {
      status: res.data.status || "SUCCESS",
      count: res.data.count || 0,
      total_volume_usd: res.data.total_volume_usd ?? null,
      total_open_interest_usd: res.data.total_open_interest_usd ?? null,
      avg_funding_rate_apr: res.data.avg_funding_rate_apr ?? null,
      connected_providers_count: res.data.connected_providers_count ?? 0,
      total_providers_count: res.data.total_providers_count ?? 5,
      contracts: Array.isArray(res.data.contracts) ? res.data.contracts : [],
    };
  } catch (err) {
    console.warn("Error fetching futures universe data:", err);
    return {
      status: "ERROR",
      count: 0,
      total_volume_usd: null,
      total_open_interest_usd: null,
      avg_funding_rate_apr: null,
      contracts: [],
    };
  }
}

export async function fetchFuturesUniverse(params?: {
  underlying?: string;
  exchange?: string;
  type?: string;
  source?: string;
  expiry?: string;
  fresh_only?: boolean;
}): Promise<CanonicalFuturesContract[]> {
  const data = await fetchFuturesUniverseData(params);
  return data.contracts;
}

export async function fetchFuturesProvidersHealth(): Promise<{
  providers: ProviderHealthReport[];
  live_providers_count: number;
  total_providers_count: number;
  overall_status: string;
}> {
  try {
    const res = await apiClient.get<any>("/api/futures/providers/health", {
      timeoutMs: 4000,
      deduplicate: true,
    });
    if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch provider health");
    return {
      providers: Array.isArray(res.data.providers) ? res.data.providers : [],
      live_providers_count: res.data.live_providers_count || 0,
      total_providers_count: res.data.total_providers_count || 5,
      overall_status: res.data.overall_status || "STANDBY",
    };
  } catch (err) {
    console.warn("Provider health fetch fallback:", err);
    return {
      providers: [],
      live_providers_count: 0,
      total_providers_count: 5,
      overall_status: "STANDBY",
    };
  }
}

export async function fetchFuturesPositions(): Promise<{
  positions: FuturesPosition[];
  total_unrealized_pnl_usd: number;
  total_margin_used_usd: number;
}> {
  try {
    const res = await apiClient.get<any>("/api/futures/positions", {
      timeoutMs: 4000,
      deduplicate: true,
    });
    if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch futures positions");
    return {
      positions: Array.isArray(res.data.positions) ? res.data.positions : [],
      total_unrealized_pnl_usd: res.data.total_unrealized_pnl_usd || 0,
      total_margin_used_usd: res.data.total_margin_used_usd || 0,
    };
  } catch (err) {
    console.warn("Futures positions fetch fallback:", err);
    return {
      positions: [],
      total_unrealized_pnl_usd: 0,
      total_margin_used_usd: 0,
    };
  }
}

export async function submitFuturesOrderIntent(payload: OrderIntentPayload): Promise<OrderIntentResponse> {
  try {
    const res = await apiClient.post<any>("/api/futures/order-intent", payload, {
      timeoutMs: 6000,
    });
    if (!res.ok || !res.data) {
      return {
        status: "ERROR",
        code: res.error?.code || "ORDER_FAILED",
        message: res.error?.message || "Failed to submit order intent",
      };
    }
    return res.data;
  } catch (err: any) {
    return {
      status: "ERROR",
      code: "NETWORK_ERROR",
      message: err.message || "Failed to contact execution gateway",
    };
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
    return res.data.result;
  } catch (err) {
    console.error("Failed to calculate liquidation price:", err);
    return null;
  }
}

export async function fetchLiveReadiness(): Promise<any> {
  try {
    const res = await apiClient.get<any>("/api/trading/live-readiness", {
      timeoutMs: 3000,
      deduplicate: true,
    });
    if (!res.ok || !res.data) throw new Error("Failed to fetch live readiness");
    return res.data.readiness;
  } catch (err) {
    return {
      overall_ready: false,
      active_mode: "PAPER",
      gate_details: { kill_switch_active: false },
    };
  }
}
