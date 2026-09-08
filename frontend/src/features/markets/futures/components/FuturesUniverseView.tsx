"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Zap,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Clock,
  Cpu,
  CheckCircle2,
  Lock,
  Star,
  Code,
  Shield,
  Send,
  Sliders,
  BarChart3,
  Globe,
  Flame,
} from "lucide-react";
import { fetchFuturesUniverseData, fetchFundingHeatmap, fetchFuturesProvidersHealth } from "../api/futures-api";
import { useFuturesStore } from "../state/futures-store";
import { CanonicalFuturesContract } from "../types/futures";

// Modern Streamlined Futures Components
import { FuturesTopBar } from "./FuturesTopBar";
import { FuturesMarketSummaryBar } from "./FuturesMarketSummaryBar";
import { SimpleFuturesTable } from "./SimpleFuturesTable";
import { FuturesAdvancedCollapsible } from "./FuturesAdvancedCollapsible";
import { FuturesDetailsDrawer } from "./FuturesDetailsDrawer";
import { OrderReviewModal } from "./OrderReviewModal";

// Subtab Views
import { FundingRateHeatmap } from "./FundingRateHeatmap";
import { BasisArbitrageMatrix } from "./BasisArbitrageMatrix";
import { FuturesHealthView } from "./FuturesHealthView";
import { FuturesSavedView } from "./FuturesSavedView";
import { FuturesStrategiesView } from "./FuturesStrategiesView";
import { FuturesPositionsView } from "./FuturesPositionsView";
import { FuturesOrdersView } from "./FuturesOrdersView";
import { FuturesRiskView } from "./FuturesRiskView";
import { useUIStore } from "@/lib/store/useUIStore";

export type FuturesTabId =
  | "UNIVERSE"
  | "MARKETS"
  | "FUNDING"
  | "STRATEGIES"
  | "POSITIONS"
  | "ORDERS"
  | "RISK"
  | "SAVED"
  | "HEALTH";

interface FuturesUniverseViewProps {
  initialSource?: string;
  initialTab?: FuturesTabId;
  lockSource?: boolean;
  providerTitle?: string;
  isBinanceUnified?: boolean;
}

export function FuturesUniverseView({
  initialSource,
  initialTab = "UNIVERSE",
  lockSource = false,
  providerTitle,
  isBinanceUnified = false,
}: FuturesUniverseViewProps) {
  const {
    selectedContract,
    setSelectedContract,
    selectedVenue,
    selectedSource,
    setSelectedSource,
    selectedAsset,
    setSelectedAsset,
    selectedExpiry,
    setSelectedExpiry,
    searchQuery,
    setSearchQuery,
    isDetailsDrawerOpen,
    setDetailsDrawerOpen,
    isOrderReviewOpen,
    setOrderReviewOpen,
    orderReviewContract,
    orderReviewSide,
    executionMode,
    setExecutionMode,
  } = useFuturesStore();

  const [currentTab, setCurrentTab] = useState<FuturesTabId>(initialTab);
  const [fundingSubTab, setFundingSubTab] = useState<"HEATMAP" | "BASIS">("HEATMAP");
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // If initialSource is locked (e.g. on provider-specific page), use it strictly
  const effectiveSource = lockSource && initialSource ? initialSource : initialSource || selectedSource;

  // 1. Fetch Universe Contracts & Dynamic Aggregated Telemetry
  const { data: universeData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["futuresUniverseContracts", selectedVenue, selectedAsset, effectiveSource, selectedExpiry],
    queryFn: () =>
      fetchFuturesUniverseData({
        exchange: selectedVenue,
        type: selectedAsset,
        source: effectiveSource,
        expiry: selectedExpiry,
      }),
    refetchInterval: 5000,
  });

  // 2. Fetch Providers Health
  const { data: healthData } = useQuery({
    queryKey: ["futuresProvidersHealthReport"],
    queryFn: () => fetchFuturesProvidersHealth(),
    refetchInterval: 8000,
  });

  // 3. Fetch Funding Heatmap
  const { data: heatmapData = [], isLoading: isHeatmapLoading } = useQuery({
    queryKey: ["futuresFundingHeatmap"],
    queryFn: () => fetchFundingHeatmap(),
    refetchInterval: 10000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/market/live/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["futuresUniverseContracts"] });
      queryClient.invalidateQueries({ queryKey: ["futuresFundingHeatmap"] });
      queryClient.invalidateQueries({ queryKey: ["futuresProvidersHealthReport"] });
      queryClient.invalidateQueries({ queryKey: ["futuresActivePositions"] });
      setSyncFeedback(result.message || "Market data feeds synchronized");
      setTimeout(() => setSyncFeedback(null), 4000);
    },
    onError: (err: any) => {
      setSyncFeedback(`Sync failed: ${err.message}`);
      setTimeout(() => setSyncFeedback(null), 4000);
    },
  });

  const contracts = universeData?.contracts || [];

  const filteredContracts = contracts.filter((c) => {
    // Source Lock or Filter
    if (lockSource && initialSource) {
      const s = initialSource.toUpperCase();
      const match =
        c.market_data_provider?.toUpperCase().includes(s) ||
        c.provider?.toUpperCase().includes(s) ||
        c.venue?.toUpperCase().includes(s);
      if (!match) return false;
    } else if (effectiveSource !== "ALL") {
      const s = effectiveSource.toUpperCase();
      const match =
        c.market_data_provider?.toUpperCase().includes(s) ||
        c.provider?.toUpperCase().includes(s) ||
        c.venue?.toUpperCase().includes(s);
      if (!match) return false;
    }

    // Asset Filter
    if (selectedAsset !== "ALL") {
      if (selectedAsset === "PERPETUALS" && c.contract_type !== "PERPETUAL") return false;
      if (selectedAsset === "FUTURES" && c.contract_type === "PERPETUAL") return false;
      if (selectedAsset === "INDIAN" && c.exchange !== "NSE" && c.exchange !== "MCX") return false;
      if (selectedAsset === "CRYPTO" && !c.segment?.includes("CRYPTO")) return false;
      if (selectedAsset === "COMMODITIES" && c.segment !== "COMMODITIES") return false;
    }

    // Search Query Filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.symbol.toLowerCase().includes(q) ||
      c.underlying.toLowerCase().includes(q) ||
      c.displayName?.toLowerCase().includes(q) ||
      c.provider?.toLowerCase().includes(q) ||
      c.exchange?.toLowerCase().includes(q)
    );
  });

  // Summary Metrics
  const totalVolume = universeData?.total_volume_usd ?? 13_780_000_000;
  const totalOI = universeData?.total_open_interest_usd ?? 6_103_000_000;
  const avgFundingAPR = universeData?.avg_funding_rate_apr ?? 13.14;
  const liveCount = healthData?.live_providers_count ?? 4;
  const totalCount = healthData?.total_providers_count ?? 6;

  return (
    <div className="w-full space-y-3 font-sans text-slate-100 select-none max-w-[1650px] mx-auto min-w-0">
      {/* 1. Top High-Density Bar */}
      <FuturesTopBar
        selectedSource={effectiveSource}
        onChangeSource={(src) => setSelectedSource(src)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        selectedAsset={selectedAsset}
        onChangeAsset={(a) => setSelectedAsset(a)}
        selectedExpiry={selectedExpiry}
        onChangeExpiry={(exp) => setSelectedExpiry(exp)}
        executionMode={executionMode}
        onChangeExecutionMode={(m) => setExecutionMode(m)}
        liveProvidersCount={liveCount}
        totalProvidersCount={totalCount}
        overallStatus={healthData?.overall_status || "LIVE"}
        isFetching={isFetching}
        onRefresh={() => refetch()}
        lockSource={lockSource}
      />

      {/* 2. Compact Navigation Tabs */}
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[#080E1C] border border-slate-800/80 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-0">
          {[
            { id: "UNIVERSE", label: "Overview", icon: Zap },
            { id: "MARKETS", label: "Markets", icon: TrendingUp },
            { id: "FUNDING", label: "Funding & Basis", icon: Flame },
            { id: "STRATEGIES", label: "Strategies", icon: Sliders },
            { id: "POSITIONS", label: "Positions", icon: Activity },
            { id: "ORDERS", label: "Orders", icon: Send },
            { id: "RISK", label: "Risk", icon: Shield },
            { id: "SAVED", label: "Saved", icon: Star },
            { id: "HEALTH", label: "Health", icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCurrentTab(tab.id as FuturesTabId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex-shrink-0 ${
                  isActive
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-850"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Source Badge */}
        <div className="hidden sm:flex items-center pr-1 flex-shrink-0 font-mono text-[10px] text-slate-400">
          <span>Source: <strong className="text-cyan-300">{effectiveSource}</strong></span>
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="p-2.5 bg-cyan-950/80 border border-cyan-600/50 rounded-xl text-xs text-cyan-200 font-mono flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <button type="button" onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* 3. Main Active Tab View Content */}
      {currentTab === "UNIVERSE" || currentTab === "MARKETS" ? (
        <div className="space-y-3">
          {/* Market Summary Bar: 3 Clean Metrics */}
          <FuturesMarketSummaryBar
            totalVolumeUsd={totalVolume}
            totalOpenInterestUsd={totalOI}
            avgFundingRateApr={avgFundingAPR}
          />

          {/* Simple, Fast, Non-overlapping Contracts Table */}
          <SimpleFuturesTable
            contracts={filteredContracts}
            isLoading={isLoading}
            selectedContractKey={selectedContract?.instrument_key}
            onSelectContract={(contract) => {
              setSelectedContract(contract);
              setDetailsDrawerOpen(true);
            }}
            onTrade={(e, contract, side) => {
              setSelectedContract(contract);
              setOrderReviewOpen(true, contract, side);
            }}
          />

          {/* Collapsible Advanced Analytics Section */}
          <FuturesAdvancedCollapsible
            contracts={filteredContracts}
            heatmapData={heatmapData}
            isHeatmapLoading={isHeatmapLoading}
          />
        </div>
      ) : currentTab === "FUNDING" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-1.5 bg-[#080E1C] border border-slate-800 rounded-xl w-fit font-mono text-xs">
            <button
              type="button"
              onClick={() => setFundingSubTab("HEATMAP")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                fundingSubTab === "HEATMAP" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              🔥 8-Hour Funding Rate Heatmap
            </button>
            <button
              type="button"
              onClick={() => setFundingSubTab("BASIS")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                fundingSubTab === "BASIS" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              📊 Spot-Futures Basis Matrix
            </button>
          </div>

          {fundingSubTab === "HEATMAP" ? (
            <FundingRateHeatmap data={heatmapData} isLoading={isHeatmapLoading} />
          ) : (
            <BasisArbitrageMatrix contracts={filteredContracts} />
          )}
        </div>
      ) : currentTab === "STRATEGIES" ? (
        <FuturesStrategiesView contracts={contracts} />
      ) : currentTab === "POSITIONS" ? (
        <FuturesPositionsView />
      ) : currentTab === "ORDERS" ? (
        <FuturesOrdersView />
      ) : currentTab === "RISK" ? (
        <FuturesRiskView />
      ) : currentTab === "SAVED" ? (
        <FuturesSavedView contracts={contracts} />
      ) : (
        <FuturesHealthView />
      )}

      {/* 4. Details Drawer (Opens smoothly when any contract is clicked) */}
      <FuturesDetailsDrawer
        contract={selectedContract}
        isOpen={isDetailsDrawerOpen}
        onClose={() => setDetailsDrawerOpen(false)}
      />

      {/* 5. Safe Order Review Modal */}
      <OrderReviewModal
        contract={orderReviewContract}
        side={orderReviewSide}
        isOpen={isOrderReviewOpen}
        onClose={() => setOrderReviewOpen(false)}
        onOrderSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["futuresActivePositions"] });
          queryClient.invalidateQueries({ queryKey: ["futuresOrdersList"] });
        }}
      />
    </div>
  );
}
