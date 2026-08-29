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
  Grid
} from "lucide-react";
import { UniverseSummaryStats } from "@/types/market-universe";

interface SimpleMarketsHeaderProps {
  totalInstruments: number;
  isLive: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  onOpenFilters: () => void;
  onOpenExplore: (view: "top_movers" | "heatmap" | "scanner") => void;
  onOpenDiagnostics: () => void;
  onOpenColumnSettings: () => void;
  onSyncUniverse: () => void;
  isSyncing: boolean;
  activeFiltersCount?: number;
}

const CATEGORIES = [
  { id: "ALL", label: "All" },
  { id: "STOCKS", label: "Stocks" },
  { id: "FUNDS", label: "Funds" },
  { id: "FUTURES", label: "Futures" },
  { id: "FOREX", label: "Forex" },
  { id: "CRYPTO", label: "Crypto" },
  { id: "INDICES", label: "Indices" },
  { id: "BONDS", label: "Bonds" },
  { id: "ECONOMY", label: "Economy" },
  { id: "OPTIONS", label: "Options" },
  { id: "WATCHLISTS", label: "Watchlist ★" },
];

export function SimpleMarketsHeader({
  totalInstruments,
  isLive = true,
  searchQuery,
  onSearchChange,
  activeCategory,
  onSelectCategory,
  onOpenFilters,
  onOpenExplore,
  onOpenDiagnostics,
  onOpenColumnSettings,
  onSyncUniverse,
  isSyncing,
  activeFiltersCount = 0,
}: SimpleMarketsHeaderProps) {
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const exploreRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exploreRef.current && !exploreRef.current.contains(event.target as Node)) {
        setIsExploreOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 font-sans select-none">
      {/* 1. Title & Search Row */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Title & Status */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Markets
              </h1>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {totalInstruments} Instruments across Crypto, Equities, Indices, and Derivatives
            </p>
          </div>
        </div>

        {/* Right: Search Box + Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Universal Search Box */}
          <div className="relative flex-1 md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search BTC, NIFTY, AAPL, GOLD..."
              className="w-full bg-[#141E33] border border-slate-700 hover:border-slate-600 focus:border-cyan-500 text-xs font-mono text-white placeholder-slate-500 rounded-xl pl-9 pr-8 py-2 transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters Button */}
          <button
            onClick={onOpenFilters}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 shrink-0 ${
              activeFiltersCount > 0
                ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-400"
                : "bg-[#141E33] hover:bg-[#1C2A47] text-slate-300 border-slate-700 hover:border-slate-600"
            }`}
            title="Filter instruments"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* More Settings Dropdown (•••) */}
          <div className="relative shrink-0" ref={moreRef}>
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={`p-2 text-xs rounded-xl border transition-all ${
                isMoreOpen
                  ? "bg-[#1E293B] text-white border-cyan-500/50"
                  : "bg-[#141E33] hover:bg-[#1E293B] text-slate-300 border-slate-700 hover:border-slate-600"
              }`}
              title="More Actions & Settings"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMoreOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl z-40 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-150 font-sans">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase font-mono border-b border-slate-800 mb-1">
                  Table & Data
                </div>
                <button
                  onClick={() => {
                    onOpenColumnSettings();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-slate-200 hover:text-cyan-400 transition-colors flex items-center gap-2"
                >
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Customize Columns</span>
                </button>
                <button
                  onClick={() => {
                    onOpenDiagnostics();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-slate-200 hover:text-cyan-400 transition-colors flex items-center gap-2"
                >
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span>Market Data Status</span>
                </button>
                <button
                  onClick={() => {
                    onSyncUniverse();
                    setIsMoreOpen(false);
                  }}
                  disabled={isSyncing}
                  className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-slate-200 hover:text-cyan-400 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>Sync Universe</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Category Tabs & Explore Dropdown */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-850 pt-3 overflow-x-auto scrollbar-none">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1 ${
                  isSelected
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40"
                    : "bg-[#141E33] text-slate-400 hover:text-slate-200 hover:bg-[#1C2A47]"
                }`}
              >
                {cat.id === "WATCHLISTS" && <Star className="w-3 h-3 fill-current" />}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Explore ▾ Dropdown */}
        <div className="relative shrink-0" ref={exploreRef}>
          <button
            onClick={() => setIsExploreOpen(!isExploreOpen)}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
              isExploreOpen
                ? "bg-[#1E293B] text-cyan-400 border-cyan-500/50"
                : "bg-[#141E33] hover:bg-[#1C2A47] text-slate-300 border-slate-700 hover:border-slate-600"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Explore</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {isExploreOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl z-40 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-150 font-sans">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase font-mono border-b border-slate-800 mb-1">
                Visual Tools
              </div>
              <button
                onClick={() => {
                  onOpenExplore("top_movers");
                  setIsExploreOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-slate-200 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Top Movers</span>
              </button>
              <button
                onClick={() => {
                  onOpenExplore("heatmap");
                  setIsExploreOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-slate-200 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                <Grid className="w-4 h-4 text-cyan-400" />
                <span>Market Heatmap</span>
              </button>
              <button
                onClick={() => {
                  onOpenExplore("scanner");
                  setIsExploreOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-slate-200 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                <Radar className="w-4 h-4 text-blue-400" />
                <span>Quant Scanner</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
