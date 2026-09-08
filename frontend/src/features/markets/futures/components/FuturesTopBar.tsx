"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  ChevronDown,
  Filter,
  RefreshCw,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";

interface FuturesTopBarProps {
  selectedSource: string;
  onChangeSource: (source: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedAsset: string;
  onChangeAsset: (asset: string) => void;
  selectedExpiry: string;
  onChangeExpiry: (expiry: string) => void;
  executionMode: "PAPER" | "SHADOW" | "LIVE";
  onChangeExecutionMode: (mode: "PAPER" | "SHADOW" | "LIVE") => void;
  liveProvidersCount?: number;
  totalProvidersCount?: number;
  overallStatus?: string;
  isFetching?: boolean;
  onRefresh?: () => void;
  lockSource?: boolean;
}

const SOURCES = [
  { id: "ALL", label: "All Sources" },
  { id: "BINANCE_USDM", label: "Binance USD-M" },
  { id: "BINANCE_COINM", label: "Binance COIN-M" },
  { id: "DELTA_INDIA", label: "Delta India" },
  { id: "DHAN", label: "Dhan" },
  { id: "UPSTOX", label: "Upstox" },
  { id: "CME", label: "CME" },
  { id: "PAPER_SIM", label: "Paper Sim" },
];

const ASSET_TYPES = [
  { id: "ALL", label: "All Assets" },
  { id: "PERPETUALS", label: "Perpetuals" },
  { id: "FUTURES", label: "Dated Futures" },
  { id: "CRYPTO", label: "Crypto" },
  { id: "INDIAN", label: "Indian (NSE)" },
  { id: "COMMODITIES", label: "Commodities" },
];

export function FuturesTopBar({
  selectedSource,
  onChangeSource,
  searchQuery,
  onSearchChange,
  selectedAsset,
  onChangeAsset,
  selectedExpiry,
  onChangeExpiry,
  executionMode,
  onChangeExecutionMode,
  liveProvidersCount = 4,
  totalProvidersCount = 6,
  overallStatus = "LIVE",
  isFetching = false,
  onRefresh,
  lockSource = false,
}: FuturesTopBarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 200);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  const isLive = overallStatus === "LIVE" || liveProvidersCount > 0;

  return (
    <div className="w-full flex flex-col gap-2.5 p-3 bg-[#080E1C] border border-slate-800 rounded-2xl shadow-xl font-mono text-xs select-none">
      {/* Top Row: Brand / Title + Live Feed Status + Source Dropdown + Search + Filter + Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand & Live Status */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="font-black tracking-wider text-slate-100 text-sm">
              FUTURES
            </span>
          </div>

          <span className="text-slate-700 hidden sm:inline">•</span>

          {/* Live Feed Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isLive ? "LIVE" : "CONNECTING"}</span>
            <span className="text-emerald-500/80 font-normal">
              {liveProvidersCount}/{totalProvidersCount} FEEDS
            </span>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1 justify-end">
          {/* Source Dropdown */}
          <div className="relative">
            <select
              value={selectedSource}
              disabled={lockSource}
              onChange={(e) => onChangeSource(e.target.value)}
              className={`appearance-none bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl px-3 py-1.5 pr-8 text-xs font-mono font-bold focus:outline-none focus:border-cyan-500 cursor-pointer ${
                lockSource ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {SOURCES.map((src) => (
                <option key={src.id} value={src.id}>
                  {src.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search Field */}
          <div className="relative min-w-[140px] sm:min-w-[180px] max-w-xs flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search contract..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 font-mono"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Popover Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                selectedAsset !== "ALL" || isFilterOpen
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
              {selectedAsset !== "ALL" && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-0.5" />
              )}
            </button>

            {/* Filter Dropdown Popover */}
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0B132B] border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Asset Type</span>
                  {selectedAsset !== "ALL" && (
                    <button
                      type="button"
                      onClick={() => onChangeAsset("ALL")}
                      className="text-[10px] text-cyan-400 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  {ASSET_TYPES.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        onChangeAsset(a.id);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                        selectedAsset === a.id
                          ? "bg-cyan-500/20 text-cyan-300 font-bold"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      }`}
                    >
                      <span>{a.label}</span>
                      {selectedAsset === a.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Environment Mode: PAPER vs LIVE */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => onChangeExecutionMode("PAPER")}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                executionMode === "PAPER"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              PAPER
            </button>
            <button
              type="button"
              onClick={() => onChangeExecutionMode("LIVE")}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                executionMode === "LIVE"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              LIVE
            </button>
          </div>

          {/* Refresh Action */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh Futures Feeds"
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
