"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Zap,
  Globe2,
  DollarSign,
} from "lucide-react";
import { fetchFuturesUniverse, fetchFundingHeatmap } from "../api/futures-api";
import { useFuturesStore } from "../state/futures-store";
import { FuturesTable } from "./FuturesTable";
import { FundingRateHeatmap } from "./FundingRateHeatmap";
import { BasisArbitrageMatrix } from "./BasisArbitrageMatrix";
import { FuturesDetailsDrawer } from "./FuturesDetailsDrawer";
import { useUIStore } from "@/lib/store/useUIStore";

export function FuturesUniverseView() {
  const {
    activeTab,
    setActiveTab,
    selectedContract,
    setSelectedContract,
    selectedVenue,
    setSelectedVenue,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    isDetailsDrawerOpen,
    setDetailsDrawerOpen,
  } = useFuturesStore();

  const { setAICopilotOpen } = useUIStore();

  // 1. Fetch Universe Contracts
  const { data: contracts = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["futuresUniverseContracts", selectedVenue, selectedCategory],
    queryFn: () =>
      fetchFuturesUniverse({
        exchange: selectedVenue,
        type: selectedCategory,
      }),
    refetchInterval: 4000,
  });

  // 2. Fetch Funding Heatmap
  const { data: heatmapData = [], isLoading: isHeatmapLoading } = useQuery({
    queryKey: ["futuresFundingHeatmap"],
    queryFn: () => fetchFundingHeatmap(),
    refetchInterval: 8000,
  });

  const filteredContracts = contracts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.symbol.toLowerCase().includes(q) ||
      c.underlying.toLowerCase().includes(q) ||
      c.displayName.toLowerCase().includes(q)
    );
  });

  // Calculate high-level summary metrics
  const totalVolume = contracts.reduce((acc, c) => acc + (c.volume_24h_usd || 0), 0);
  const totalOI = contracts.reduce((acc, c) => acc + (c.open_interest_usd || 0), 0);
  const avgFundingAPR = contracts.length > 0
    ? (contracts.reduce((acc, c) => acc + (c.funding_rate?.funding_rate_annualized || 0), 0) / contracts.length).toFixed(2)
    : "10.45";

  return (
    <div className="w-full space-y-4 font-sans text-slate-100">
      {/* 1. Metric Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-[#0B132B] border border-slate-800 rounded-2xl">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">24h Futures Volume</span>
          <span className="text-lg font-black text-white font-mono mt-0.5 block">
            ${(totalVolume / 1e9).toFixed(2)}B
          </span>
        </div>
        <div className="p-4 bg-[#0B132B] border border-slate-800 rounded-2xl">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Open Interest</span>
          <span className="text-lg font-black text-cyan-400 font-mono mt-0.5 block">
            ${(totalOI / 1e9).toFixed(2)}B
          </span>
        </div>
        <div className="p-4 bg-[#0B132B] border border-slate-800 rounded-2xl">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Avg Funding Rate APR</span>
          <span className="text-lg font-black text-emerald-400 font-mono mt-0.5 block">
            +{avgFundingAPR}%
          </span>
        </div>
        <div className="p-4 bg-[#0B132B] border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">AI Copilot Status</span>
            <span className="text-xs font-bold text-purple-300 font-mono mt-0.5 block">
              Derivatives Armed
            </span>
          </div>
          <button
            onClick={() => setAICopilotOpen(true)}
            className="p-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 transition active:scale-95"
            title="Open AI Copilot"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Top Controls & Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#0B132B] border border-slate-800 rounded-2xl">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          {[
            { id: "UNIVERSE", label: "⚡ Futures Universe" },
            { id: "HEATMAP", label: "🔥 Funding Heatmap" },
            { id: "BASIS", label: "📊 Basis Matrix" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                activeTab === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter contracts (BTC, NIFTY, GOLD)..."
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Refresh Quotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 3. Main Active Tab Content */}
      {activeTab === "UNIVERSE" ? (
        <FuturesTable contracts={filteredContracts} isLoading={isLoading} />
      ) : activeTab === "HEATMAP" ? (
        <FundingRateHeatmap data={heatmapData} isLoading={isHeatmapLoading} />
      ) : (
        <BasisArbitrageMatrix contracts={filteredContracts} />
      )}

      {/* 4. Details & Execution Drawer */}
      <FuturesDetailsDrawer
        contract={selectedContract}
        isOpen={isDetailsDrawerOpen}
        onClose={() => setDetailsDrawerOpen(false)}
      />
    </div>
  );
}
