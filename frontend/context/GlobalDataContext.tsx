"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import {
  PortfolioSnapshot,
  PositionItem,
  OrderItem,
  ProviderCapability,
  RiskSummaryContract,
} from "@/types/global-data";

interface GlobalDataContextValue {
  portfolioSnapshot: PortfolioSnapshot | null;
  positions: PositionItem[];
  orders: OrderItem[];
  providers: ProviderCapability[];
  riskSummary: RiskSummaryContract | null;
  tradingMode: "PAPER" | "LIVE";
  isLive: boolean;
  isLoading: boolean;
  isStale: boolean;
  reconciliationStatus: "RECONCILED" | "UNRECONCILED";
  refreshAll: () => Promise<void>;
  setTradingMode: (mode: "PAPER" | "LIVE") => void;
}

const GlobalDataContext = createContext<GlobalDataContextValue | null>(null);

export function GlobalDataProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [tradingMode, setTradingMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [liveSseSnapshot, setLiveSseSnapshot] = useState<PortfolioSnapshot | null>(null);

  // 1. Authoritative Portfolio Snapshot Query (Single Financial Source of Truth)
  const {
    data: restSnapshot,
    isLoading: isSnapshotLoading,
    isStale: isSnapshotStale,
    refetch: refetchSnapshot,
  } = useQuery({
    queryKey: ["portfolioSnapshot", tradingMode],
    queryFn: async () => {
      const res = await apiClient.get<PortfolioSnapshot>(
        `/api/portfolio/snapshot?mode=${tradingMode}`,
        { timeoutMs: 5000 }
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error?.message || "Failed to fetch portfolio snapshot");
      }
      return res.data;
    },
    enabled: isAuthenticated,
    staleTime: 3000,
    refetchInterval: isAuthenticated ? 5000 : false,
    placeholderData: (prev) => prev,
  });

  // 2. Authoritative Positions Query
  const { data: positionsData, refetch: refetchPositions } = useQuery({
    queryKey: ["authoritativePositions", tradingMode],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; positions: PositionItem[] }>(
        `/api/positions?mode=${tradingMode}`,
        { timeoutMs: 5000 }
      );
      if (!res.ok || !res.data) return { positions: [] };
      return res.data;
    },
    enabled: isAuthenticated,
    staleTime: 3000,
    refetchInterval: isAuthenticated ? 5000 : false,
  });

  // 3. Authoritative Orders Query
  const { data: ordersData, refetch: refetchOrders } = useQuery({
    queryKey: ["authoritativeOrders", tradingMode],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; orders: OrderItem[] }>(
        `/api/orders?mode=${tradingMode}&limit=100`,
        { timeoutMs: 5000 }
      );
      if (!res.ok || !res.data) return { orders: [] };
      return res.data;
    },
    enabled: isAuthenticated,
    staleTime: 4000,
    refetchInterval: isAuthenticated ? 6000 : false,
  });

  // 4. Authoritative Providers Query
  const { data: providersData, refetch: refetchProviders } = useQuery({
    queryKey: ["providerCatalog"],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; providers: ProviderCapability[] }>(
        "/api/providers",
        { timeoutMs: 6000 }
      );
      if (!res.ok || !res.data) return { providers: [] };
      return res.data;
    },
    enabled: isAuthenticated,
    staleTime: 15000,
    refetchInterval: isAuthenticated ? 30000 : false,
  });

  // 5. Authoritative Risk Summary Query
  const { data: riskData, refetch: refetchRisk } = useQuery({
    queryKey: ["authoritativeRisk", tradingMode],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; risk: RiskSummaryContract }>(
        `/api/risk/summary?mode=${tradingMode}`,
        { timeoutMs: 5000 }
      );
      if (!res.ok || !res.data) return null;
      return res.data.risk;
    },
    enabled: isAuthenticated,
    staleTime: 4000,
    refetchInterval: isAuthenticated ? 6000 : false,
  });

  // 6. Real-time SSE Stream Listener for sub-second portfolio broadcast
  useEffect(() => {
    if (!isAuthenticated) return;
    const handle = apiClient.createResilientEventSource(`/api/stream/portfolio?mode=${tradingMode}`, {
      key: `stream_portfolio_${tradingMode}`,
      onMessage: (parsed) => {
        if (parsed?.type === "PORTFOLIO_SNAPSHOT" && parsed?.data) {
          setLiveSseSnapshot(parsed.data as PortfolioSnapshot);
        }
      },
    });

    return () => {
      handle.close();
    };
  }, [tradingMode, isAuthenticated]);

  const portfolioSnapshot = liveSseSnapshot || restSnapshot || null;
  const positions = positionsData?.positions || [];
  const orders = ordersData?.orders || [];
  const providers = providersData?.providers || [];
  const riskSummary = riskData || null;

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refetchSnapshot(),
      refetchPositions(),
      refetchOrders(),
      refetchProviders(),
      refetchRisk(),
    ]);
  }, [refetchSnapshot, refetchPositions, refetchOrders, refetchProviders, refetchRisk]);

  useEffect(() => {
    const handleReconcile = () => {
      refreshAll();
    };
    window.addEventListener("quantos:reconcile", handleReconcile);
    return () => {
      window.removeEventListener("quantos:reconcile", handleReconcile);
    };
  }, [refreshAll]);

  const value: GlobalDataContextValue = {
    portfolioSnapshot,
    positions,
    orders,
    providers,
    riskSummary,
    tradingMode,
    isLive: tradingMode === "LIVE",
    isLoading: isSnapshotLoading,
    isStale: isSnapshotStale,
    reconciliationStatus: portfolioSnapshot?.reconciliationStatus || "RECONCILED",
    refreshAll,
    setTradingMode,
  };

  return <GlobalDataContext.Provider value={value}>{children}</GlobalDataContext.Provider>;
}

export function useGlobalData(): GlobalDataContextValue {
  const ctx = useContext(GlobalDataContext);
  if (!ctx) {
    throw new Error("useGlobalData must be used within a <GlobalDataProvider>");
  }
  return ctx;
}

export function usePortfolioSnapshot(): PortfolioSnapshot | null {
  return useGlobalData().portfolioSnapshot;
}

export function useTradingMode(): "PAPER" | "LIVE" {
  return useGlobalData().tradingMode;
}

export function useAuthoritativePositions(): PositionItem[] {
  return useGlobalData().positions;
}

export function useAuthoritativeOrders(): OrderItem[] {
  return useGlobalData().orders;
}

export function useProviderCatalog(): ProviderCapability[] {
  return useGlobalData().providers;
}

export function useAuthoritativeRisk(): RiskSummaryContract | null {
  return useGlobalData().riskSummary;
}
