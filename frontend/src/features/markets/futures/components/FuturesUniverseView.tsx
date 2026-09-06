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
} from "lucide-react";
import { fetchFuturesUniverseData, fetchFundingHeatmap, fetchFuturesProvidersHealth } from "../api/futures-api";
import { useFuturesStore } from "../state/futures-store";
import { FuturesTable } from "./FuturesTable";
import { FundingRateHeatmap } from "./FundingRateHeatmap";
import { BasisArbitrageMatrix } from "./BasisArbitrageMatrix";
import { FuturesDetailsDrawer } from "./FuturesDetailsDrawer";
import { OrderReviewModal } from "./OrderReviewModal";
import { FuturesHealthView } from "./FuturesHealthView";
import { FuturesSavedView } from "./FuturesSavedView";
import { FuturesStrategiesView } from "./FuturesStrategiesView";
import { FuturesPositionsView } from "./FuturesPositionsView";
import { useUIStore } from "@/lib/store/useUIStore";

interface FuturesUniverseViewProps {
  initialSource?: string;
  initialTab?: "UNIVERSE" | "HEATMAP" | "BASIS" | "CALCULATOR" | "STRATEGIES" | "HEALTH" | "SAVED" | "POSITIONS";
}

export function FuturesUniverseView({ initialSource, initialTab }: FuturesUniverseViewProps) {
  const {
    activeTab,
    setActiveTab,
    selectedContract,
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

  const [freshOnly, setFreshOnly] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const { setAICopilotOpen } = useUIStore();
  const queryClient = useQueryClient();

  const currentSource = initialSource || selectedSource;

  // 1. Fetch Universe Contracts & Dynamic Aggregated Telemetry
  const { data: universeData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["futuresUniverseContracts", selectedVenue, selectedAsset, currentSource, selectedExpiry, freshOnly],
    queryFn: () =>
      fetchFuturesUniverseData({
        exchange: selectedVenue,
        type: selectedAsset,
        source: currentSource,
        expiry: selectedExpiry,
        fresh_only: freshOnly,
      }),
    refetchInterval: 4000,
  });

  // 2. Fetch Providers Health
  const { data: healthData } = useQuery({
    queryKey: ["futuresProvidersHealthReport"],
    queryFn: () => fetchFuturesProvidersHealth(),
    refetchInterval: 6000,
  });

  // 3. Fetch Funding Heatmap
  const { data: heatmapData = [], isLoading: isHeatmapLoading } = useQuery({
    queryKey: ["futuresFundingHeatmap"],
    queryFn: () => fetchFundingHeatmap(),
    refetchInterval: 8000,
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
    // Asset Filter
    if (selectedAsset !== "ALL") {
      if (selectedAsset === "PERPETUALS" && c.contract_type !== "PERPETUAL") return false;
      if (selectedAsset === "FUTURES" && c.contract_type === "PERPETUAL") return false;
      if (selectedAsset === "INDIAN" && c.exchange !== "NSE") return false;
      if (selectedAsset === "CRYPTO" && !c.segment?.includes("CRYPTO")) return false;
      if (selectedAsset === "COMMODITIES" && c.segment !== "COMMODITIES") return false;
    }

    // Source Filter
    if (currentSource !== "ALL") {
      const s = currentSource.toUpperCase();
      const matchProvider = c.market_data_provider?.toUpperCase().includes(s) || c.provider?.toUpperCase().includes(s);
      if (!matchProvider) return false;
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

  // Dynamic high-level summary metrics from real connected contracts
  const totalVolume = universeData?.total_volume_usd ?? 0;
  const totalOI = universeData?.total_open_interest_usd ?? 0;
  const avgFundingAPR = universeData?.avg_funding_rate_apr;
  const liveCount = healthData?.live_providers_count ?? 3;
  const totalCount = healthData?.total_providers_count ?? 6;

  const currentTab = initialTab || activeTab;

  return (
    <div className="w-full space-y-4 font-sans text-slate-100 select-none">
      {/* 1. Dynamic 4-Card Telemetry Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        {/* CARD 1: 24H FUTURES VOLUME */}
        <div className="p-4 bg-[#0E1524] border border-[#1E293B] hover:border-cyan-500/30 rounded-2xl shadow-xl transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 pointer-events-none" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">24H Futures Volume</span>
          <span className="text-xl font-bold text-white mt-1 block">
            {totalVolume > 0 ? `$${(totalVolume / 1e9).toFixed(2)}B` : "—"}
          </span>
          <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Aggregated Across Feeds</span>
            <span className="text-cyan-400 font-bold">USD Notional</span>
          </div>
        </div>

        {/* CARD 2: TOTAL OPEN INTEREST */}
        <div className="p-4 bg-[#0E1524] border border-[#1E293B] hover:border-cyan-500/30 rounded-2xl shadow-xl transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 pointer-events-none" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Total Open Interest</span>
          <span className="text-xl font-bold text-cyan-300 mt-1 block">
            {totalOI > 0 ? `$${(totalOI / 1e9).toFixed(2)}B` : "—"}
          </span>
          <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Market Depth</span>
            <span className="text-emerald-400 font-bold">Live OI</span>
          </div>
        </div>

        {/* CARD 3: AVG FUNDING RATE APR */}
        <div className="p-4 bg-[#0E1524] border border-[#1E293B] hover:border-cyan-500/30 rounded-2xl shadow-xl transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 pointer-events-none" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Avg Funding Rate APR</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">
            {avgFundingAPR != null ? `+${avgFundingAPR}%` : "—"}
          </span>
          <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Annualized Yield</span>
            <span className="text-purple-300 font-bold">Cash & Carry</span>
          </div>
        </div>

        {/* CARD 4: FEED STATUS & EXECUTION MODE */}
        <div className="p-4 bg-[#0E1524] border border-[#1E293B] hover:border-cyan-500/30 rounded-2xl shadow-xl transition-all relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Feed Status</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <strong className="text-sm font-bold text-emerald-400">
                  {liveCount > 0 ? "LIVE FEEDS" : "STANDBY"}
                </strong>
              </div>
            </div>
            <button
              onClick={() => setAICopilotOpen(true)}
              className="p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/50 text-purple-300 transition active:scale-95 shadow-sm"
              title="Open AI Copilot"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>
              Providers: <strong className="text-white">{liveCount}/{totalCount} LIVE</strong>
            </span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
              {executionMode} SAFE
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Controls & Navigation Tabs */}
      <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-4 shadow-xl space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#080C14] p-1 rounded-xl border border-[#1E293B] font-mono text-xs">
            {[
              { id: "UNIVERSE", label: "⚡ Futures Universe" },
              { id: "HEATMAP", label: "🔥 Funding Heatmap" },
              { id: "BASIS", label: "📊 Basis Matrix" },
              { id: "STRATEGIES", label: "🧠 Strategies" },
              { id: "POSITIONS", label: "💼 Positions" },
              { id: "SAVED", label: "⭐ Saved" },
              { id: "HEALTH", label: "🛡️ Health" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentTab === tab.id
                    ? "bg-cyan-500 text-slate-950 shadow-md font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search, Mode & Sync Action */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter contract, source, account..."
                className="pl-8 pr-3 py-1.5 bg-[#080C14] border border-[#1E293B] rounded-xl text-xs text-slate-100 placeholder:text-slate-500 font-mono focus:outline-none focus:border-cyan-500 w-44 sm:w-56"
              />
            </div>

            {/* Execution Mode Selector */}
            <div className="flex items-center gap-1 bg-[#080C14] p-1 rounded-xl border border-[#1E293B] font-mono text-xs">
              {(["PAPER", "SHADOW", "LIVE"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    if (m === "LIVE") {
                      alert("LIVE Trading Gate: Real-money live trading requires operator live entitlement and server safety certification.");
                    } else {
                      setExecutionMode(m);
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    executionMode === m
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : m === "LIVE"
                      ? "text-slate-600 cursor-not-allowed"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m === "LIVE" ? "🔒 LIVE" : m}
                </button>
              ))}
            </div>

            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 rounded-xl border border-cyan-700/50 text-xs font-mono font-bold transition shadow-md active:scale-95 disabled:opacity-50"
              title="Synchronize Feeds"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending || isFetching ? "animate-spin text-cyan-400" : ""}`} />
              <span>{syncMutation.isPending ? "Syncing..." : "Sync Feeds"}</span>
            </button>
          </div>
        </div>

        {/* Sync Toast */}
        {syncFeedback && (
          <div className="p-2.5 bg-cyan-950/80 border border-cyan-600/50 rounded-xl text-xs text-cyan-200 font-mono flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Source and Type Filter Rows */}
        <div className="pt-3 border-t border-[#1E293B]/70 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          {/* Source Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1">Source:</span>
            {[
              { id: "ALL", label: "ALL SOURCES" },
              { id: "BINANCE_USDM", label: "BINANCE USD-M" },
              { id: "BINANCE_COINM", label: "BINANCE COIN-M" },
              { id: "DELTA_INDIA", label: "DELTA INDIA" },
              { id: "UPSTOX", label: "UPSTOX" },
              { id: "DHAN", label: "DHAN" },
              { id: "CME", label: "CME" },
              { id: "PAPER_SIM", label: "PAPER SIM" },
            ].map((src) => (
              <button
                key={src.id}
                onClick={() => setSelectedSource(src.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedSource === src.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm"
                    : "bg-[#080C14] text-slate-400 hover:text-white border border-[#1E293B]"
                }`}
              >
                {src.label}
              </button>
            ))}
          </div>

          {/* Segment Type Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1">Asset:</span>
            {["ALL", "PERPETUALS", "FUTURES", "CRYPTO", "INDIAN", "COMMODITIES"].map((seg) => (
              <button
                key={seg}
                onClick={() => setSelectedAsset(seg)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                  selectedAsset === seg
                    ? "bg-purple-950 text-purple-300 border border-purple-700 shadow-sm"
                    : "bg-[#080C14] text-slate-500 hover:text-slate-300 border border-[#1E293B]"
                }`}
              >
                {seg}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Main Active Tab Content */}
      {currentTab === "UNIVERSE" ? (
        <FuturesTable contracts={filteredContracts} isLoading={isLoading} />
      ) : currentTab === "HEATMAP" ? (
        <FundingRateHeatmap data={heatmapData} isLoading={isHeatmapLoading} />
      ) : currentTab === "BASIS" ? (
        <BasisArbitrageMatrix contracts={filteredContracts} />
      ) : currentTab === "STRATEGIES" ? (
        <FuturesStrategiesView contracts={contracts} />
      ) : currentTab === "POSITIONS" ? (
        <FuturesPositionsView />
      ) : currentTab === "SAVED" ? (
        <FuturesSavedView contracts={contracts} />
      ) : (
        <FuturesHealthView />
      )}

      {/* 4. Details Drawer */}
      <FuturesDetailsDrawer
        contract={selectedContract}
        isOpen={isDetailsDrawerOpen}
        onClose={() => setDetailsDrawerOpen(false)}
      />

      {/* 5. Institutional Order Review Modal */}
      <OrderReviewModal
        contract={orderReviewContract}
        side={orderReviewSide}
        isOpen={isOrderReviewOpen}
        onClose={() => setOrderReviewOpen(false)}
        onOrderSuccess={(res) => {
          queryClient.invalidateQueries({ queryKey: ["futuresActivePositions"] });
        }}
      />
    </div>
  );
}
