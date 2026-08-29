"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  Sliders,
  Sparkles,
  TrendingUp,
  Activity,
  Layers,
  MoreHorizontal,
  RefreshCw,
  Star,
  CheckCircle2,
  ChevronDown,
  X,
  Radar,
  Grid,
  Radio,
  Clock,
  Settings2,
} from "lucide-react";
import { UniverseSummaryStats } from "@/types/market-universe";

interface SimpleMarketsHeaderProps {
  totalInstruments: number;
  liveCount: number;
  providerCount?: number;
  lastUpdateMs?: number;
  isLiveFeed: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  categoryCounts?: Record<string, number>;
  onOpenFilters: () => void;
  onOpenExplore?: (view: "top_movers" | "heatmap" | "scanner") => void;
  onOpenDiagnostics?: () => void;
  onOpenColumnSettings?: () => void;
  onSyncUniverse?: () => void;
  isSyncing?: boolean;
  activeFiltersCount?: number;
  density?: "compact" | "comfortable";
  onChangeDensity?: (d: "compact" | "comfortable") => void;
}

export const MARKET_CATEGORIES = [
  { id: "ALL", label: "ALL" },
  { id: "STOCKS", label: "STOCKS" },
  { id: "FUNDS", label: "FUNDS" },
  { id: "FUTURES", label: "FUTURES" },
  { id: "FOREX", label: "FOREX" },
  { id: "CRYPTO", label: "CRYPTO" },
  { id: "INDICES", label: "INDICES" },
  { id: "BONDS", label: "BONDS" },
  { id: "ECONOMY", label: "ECONOMY" },
  { id: "OPTIONS", label: "OPTIONS" },
  { id: "WATCHLISTS", label: "WATCHLIST ★" },
];

export function SimpleMarketsHeader({
  totalInstruments,
  liveCount,
  providerCount = 3,
  lastUpdateMs = 120,
  isLiveFeed = true,
  searchQuery,
  onSearchChange,
  activeCategory,
  onSelectCategory,
  categoryCounts = {},
  onOpenFilters,
  onOpenExplore,
  onOpenDiagnostics,
  onOpenColumnSettings,
  onSyncUniverse,
  isSyncing = false,
  activeFiltersCount = 0,
  density = "compact",
  onChangeDensity,
}: SimpleMarketsHeaderProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: '/' or Ctrl/Cmd+K to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.key === "/" && document.activeElement?.tagName !== "INPUT") || ((e.metaKey || e.ctrlKey) && e.key === "k")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-[#0B1224] border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-3 font-sans select-none">
      {/* 1. Header First Row: Title & Status | Universal Search | Filters | More Menu */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left: Title & Live Diagnostics Summary */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>MARKETS</span>
              <span className="text-cyan-400 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
                UNIVERSE
              </span>
            </h1>

            {/* Calculated Data Health Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold border transition-all ${
                isLiveFeed
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLiveFeed ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span>{isLiveFeed ? "LIVE FEED" : "STALE / RECONNECTING"}</span>
            </div>
          </div>

          {/* Compact Telemetry Summary Sub-Row */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span>
              <strong className="text-slate-200">{totalInstruments}</strong> Instruments
            </span>
            <span>•</span>
            <span>
              <strong className="text-emerald-400">{liveCount}</strong> Live
            </span>
            <span>•</span>
            <span>
              <strong className="text-slate-200">{providerCount}</strong> Providers
            </span>
            <span>•</span>
            <span>
              Last update <strong className="text-cyan-400">{lastUpdateMs}ms</strong>
            </span>
          </div>
        </div>

        {/* Right: Search Box, Filter Button, and More Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Universal Instant Search Box */}
          <div className="relative flex-1 md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search symbol, NIFTY, BTC, options... (/)"
              className="w-full bg-[#080E20] border border-slate-700/80 hover:border-slate-600 focus:border-cyan-500 text-xs font-mono text-white placeholder-slate-500 rounded-xl pl-9 pr-8 py-2 transition-all outline-none"
            />
            {searchQuery ? (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-mono text-slate-400">
                /
              </kbd>
            )}
          </div>

          {/* Filters Toggle Button */}
          <button
            onClick={onOpenFilters}
            className={`px-3 py-2 text-xs font-mono font-bold rounded-xl border transition-all flex items-center gap-1.5 shrink-0 ${
              activeFiltersCount > 0
                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)]"
                : "bg-[#080E20] hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-slate-600"
            }`}
            title="Filter instruments"
          >
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 bg-cyan-400 text-slate-950 rounded-full text-[10px] font-black">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* More (⋯) Menu */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="p-2 rounded-xl bg-[#080E20] hover:bg-slate-800 text-slate-300 border border-slate-700/80 hover:border-slate-600 transition-all"
              title="More options &amp; settings"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMoreOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#080E20] border border-slate-700/90 rounded-2xl shadow-2xl z-50 p-2 space-y-1 font-mono text-xs animate-in fade-in zoom-in-95 duration-100">
                {/* Density Options */}
                <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800">
                  Table Density
                </div>
                <div className="grid grid-cols-2 gap-1 p-1">
                  <button
                    onClick={() => {
                      onChangeDensity?.("compact");
                      setIsMoreOpen(false);
                    }}
                    className={`py-1 text-center rounded-lg text-xs font-bold transition ${
                      density === "compact"
                        ? "bg-cyan-500 text-slate-950"
                        : "text-slate-400 hover:text-white bg-slate-900"
                    }`}
                  >
                    Compact
                  </button>
                  <button
                    onClick={() => {
                      onChangeDensity?.("comfortable");
                      setIsMoreOpen(false);
                    }}
                    className={`py-1 text-center rounded-lg text-xs font-bold transition ${
                      density === "comfortable"
                        ? "bg-cyan-500 text-slate-950"
                        : "text-slate-400 hover:text-white bg-slate-900"
                    }`}
                  >
                    Comfortable
                  </button>
                </div>

                <div className="border-t border-slate-800 my-1" />

                {onOpenColumnSettings && (
                  <button
                    onClick={() => {
                      onOpenColumnSettings();
                      setIsMoreOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-slate-800 text-left text-slate-200 flex items-center gap-2 transition"
                  >
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Customize Columns</span>
                  </button>
                )}

                {onSyncUniverse && (
                  <button
                    onClick={() => {
                      onSyncUniverse();
                      setIsMoreOpen(false);
                    }}
                    disabled={isSyncing}
                    className="w-full px-3 py-2 rounded-xl hover:bg-slate-800 text-left text-slate-200 flex items-center gap-2 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>{isSyncing ? "Syncing Feed..." : "Sync Market Universe"}</span>
                  </button>
                )}

                {onOpenDiagnostics && (
                  <button
                    onClick={() => {
                      onOpenDiagnostics();
                      setIsMoreOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-slate-800 text-left text-slate-200 flex items-center gap-2 transition"
                  >
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Provider Gateway Status</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Category Navigation Segmented Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 pt-1 border-t border-slate-800/80">
        {MARKET_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          const count = categoryCounts[cat.id];
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black"
                  : "bg-[#080E20] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/60"
              }`}
            >
              <span>{cat.label}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? "bg-slate-950 text-cyan-300" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
