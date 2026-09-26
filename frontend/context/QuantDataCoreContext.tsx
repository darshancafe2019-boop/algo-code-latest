"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import {
  Environment,
  ProviderInfo,
  BrokerAccount,
  PositionItem,
  OrderItem,
  LedgerEntry,
  ReconciliationReport,
  PortfolioSummaryResponse,
} from "@/types/data-core";

interface QuantDataCoreContextValue {
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  providers: ProviderInfo[];
  providersSummary: {
    totalProviders: number;
    connectedProviders: number;
    liveFeeds: number;
    averageLatencyMs: number;
    healthy: boolean;
  };
  accounts: BrokerAccount[];
  portfolioSummary: PortfolioSummaryResponse | null;
  positions: PositionItem[];
  orders: OrderItem[];
  ledger: LedgerEntry[];
  reconciliation: ReconciliationReport | null;
  systemHealth: any | null;
  isLoading: boolean;
  isDataDrawerOpen: boolean;
  openDataDrawer: () => void;
  closeDataDrawer: () => void;
  toggleDataDrawer: () => void;
  refreshAll: () => Promise<void>;
}

const QuantDataCoreContext = createContext<QuantDataCoreContextValue | null>(null);

export function QuantDataCoreProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [environment, setEnvironment] = useState<Environment>("PAPER");
  const [isDataDrawerOpen, setIsDataDrawerOpen] = useState(false);

  // 1. Providers & Capabilities Query
  const { data: providersData } = useQuery({
    queryKey: ["v2_providers"],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; data: ProviderInfo[]; summary: any }>(
        "/api/v2/providers"
      );
      return res.data || { status: "success", data: [], summary: { totalProviders: 0, connectedProviders: 0, liveFeeds: 0, averageLatencyMs: 0, healthy: false } };
    },
    refetchInterval: 3000,
    staleTime: 2000,
  });

  // 2. Segregated Broker Accounts Query
  const { data: accountsData } = useQuery({
    queryKey: ["v2_accounts", environment],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; data: BrokerAccount[] }>(
        `/api/v2/accounts?environment=${environment}`
      );
      return res.data?.data || [];
    },
    refetchInterval: 3000,
    staleTime: 2000,
  });

  // 3. Currency-Aware Portfolio Summary Query
  const { data: portfolioData, isLoading: isPortfolioLoading } = useQuery({
    queryKey: ["v2_portfolio", environment],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; data: PortfolioSummaryResponse }>(
        `/api/v2/portfolio?environment=${environment}`
      );
      return res.data?.data || null;
    },
    refetchInterval: 3000,
    staleTime: 2000,
  });

  // 4. Marked-to-Market Positions Query
  const { data: positionsData } = useQuery({
    queryKey: ["v2_positions", environment],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; data: PositionItem[] }>(
        `/api/v2/positions?environment=${environment}`
      );
      return res.data?.data || [];
    },
    refetchInterval: 3000,
    staleTime: 2000,
  });

  // 5. Authoritative Centralized OMS Orders Query
  const { data: ordersData } = useQuery({
    queryKey: ["v2_orders", environment],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; data: OrderItem[] }>(
        `/api/v2/orders?environment=${environment}&limit=200`
      );
      return res.data?.data || [];
    },
    refetchInterval: 4000,
    staleTime: 3000,
  });

  // 6. Append-Only Capital Ledger Query
  const { data: ledgerData } = useQuery({
    queryKey: ["v2_ledger", environment],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; data: LedgerEntry[] }>(
        `/api/v2/capital/ledger?environment=${environment}&limit=100`
      );
      return res.data?.data || [];
    },
    refetchInterval: 5000,
    staleTime: 4000,
  });

  // 7. Continuous Reconciliation Report Query
  const { data: reconData } = useQuery({
    queryKey: ["v2_reconciliation", environment],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; data: ReconciliationReport }>(
        `/api/v2/reconciliation?environment=${environment}`
      );
      return res.data?.data || null;
    },
    refetchInterval: 5000,
    staleTime: 4000,
  });

  // 8. Global System Health
  const { data: healthData } = useQuery({
    queryKey: ["v2_system_health"],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; data: any }>(
        "/api/v2/system/health"
      );
      return res.data?.data || null;
    },
    refetchInterval: 4000,
    staleTime: 3000,
  });

  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["v2_providers"] }),
      queryClient.invalidateQueries({ queryKey: ["v2_accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["v2_portfolio"] }),
      queryClient.invalidateQueries({ queryKey: ["v2_positions"] }),
      queryClient.invalidateQueries({ queryKey: ["v2_orders"] }),
      queryClient.invalidateQueries({ queryKey: ["v2_ledger"] }),
      queryClient.invalidateQueries({ queryKey: ["v2_reconciliation"] }),
      queryClient.invalidateQueries({ queryKey: ["v2_system_health"] }),
    ]);
  }, [queryClient]);

  const value = useMemo<QuantDataCoreContextValue>(
    () => ({
      environment,
      setEnvironment,
      providers: providersData?.data || [],
      providersSummary: providersData?.summary || {
        totalProviders: 0,
        connectedProviders: 0,
        liveFeeds: 0,
        averageLatencyMs: 0,
        healthy: false,
      },
      accounts: accountsData || [],
      portfolioSummary: portfolioData || null,
      positions: positionsData || [],
      orders: ordersData || [],
      ledger: ledgerData || [],
      reconciliation: reconData || null,
      systemHealth: healthData || null,
      isLoading: isPortfolioLoading,
      isDataDrawerOpen,
      openDataDrawer: () => setIsDataDrawerOpen(true),
      closeDataDrawer: () => setIsDataDrawerOpen(false),
      toggleDataDrawer: () => setIsDataDrawerOpen((prev) => !prev),
      refreshAll,
    }),
    [
      environment,
      providersData,
      accountsData,
      portfolioData,
      positionsData,
      ordersData,
      ledgerData,
      reconData,
      healthData,
      isPortfolioLoading,
      isDataDrawerOpen,
      refreshAll,
    ]
  );

  return (
    <QuantDataCoreContext.Provider value={value}>
      {children}
    </QuantDataCoreContext.Provider>
  );
}

export function useQuantDataCore() {
  const context = useContext(QuantDataCoreContext);
  if (!context) {
    throw new Error("useQuantDataCore must be used within a QuantDataCoreProvider");
  }
  return context;
}
