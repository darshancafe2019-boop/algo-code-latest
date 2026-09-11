"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Globe,
  Radio,
  ChevronDown,
  X,
  ExternalLink,
} from "lucide-react";
import { useMarketHealth } from "@/lib/market-data";
import { InstrumentMasterRecord } from "@/lib/market-data/types";
import { instrumentMaster } from "@/lib/market-data/instrument-master";

interface MarketTerminalHeaderProps {
  activeView: "universe" | "live";
  onViewChange: (view: "universe" | "live") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectInstrument: (symbol: string) => void;
  onOpenDiagnostics: () => void;
  onOpenFilterDrawer: () => void;
  activeWatchlistName: string;
  onSelectWatchlist: () => void;
}

export function MarketTerminalHeader({
  activeView,
  onViewChange,
  searchQuery,
  onSearchChange,
  onSelectInstrument,
  onOpenDiagnostics,
  onOpenFilterDrawer,
  activeWatchlistName,
  onSelectWatchlist,
}: MarketTerminalHeaderProps) {
  const { systemState, isLive, providers } = useMarketHealth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<InstrumentMasterRecord[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const results = instrumentMaster.search(searchQuery, "ALL", 8);
      setSearchResults(results);
      setIsSearchOpen(true);
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/90 px-4 py-2.5 backdrop-blur-md">
      {/* Left: Terminal Title & Mode Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase font-mono">
              MARKETS
            </h1>
          </div>
        </div>

        {/* UNIVERSE / LIVE Tab Switcher */}
        <div className="flex items-center rounded-md bg-slate-900 border border-slate-800 p-0.5">
          <button
            onClick={() => onViewChange("universe")}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
              activeView === "universe"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            UNIVERSE
          </button>
          <button
            onClick={() => onViewChange("live")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-all ${
              activeView === "live"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            LIVE FEED
          </button>
        </div>
      </div>

      {/* Center: Universal Fast Search with Instant Dropdown */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-md min-w-[220px]">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim().length > 0) setIsSearchOpen(true);
            }}
            placeholder="Search symbol, NIFTY 25000 CE, BTCUSD..."
            className="w-full h-8 pl-8 pr-8 text-xs font-mono bg-slate-900/90 border border-slate-800 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {isSearchOpen && searchResults.length > 0 && (
          <div className="absolute top-9 left-0 right-0 z-50 rounded-md border border-slate-700 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl">
            <div className="text-[10px] uppercase font-mono font-semibold text-slate-400 px-2 py-1">
              Matching Instruments ({searchResults.length})
            </div>
            {searchResults.map((rec) => (
              <button
                key={`${rec.exchange}:${rec.symbol}`}
                onClick={() => {
                  onSelectInstrument(rec.symbol);
                  setIsSearchOpen(false);
                }}
                className="w-full flex items-center justify-between rounded px-2.5 py-1.5 text-left text-xs font-mono hover:bg-slate-800/80 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200 group-hover:text-emerald-400">
                    {rec.symbol}
                  </span>
                  <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {rec.exchange}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{rec.instrumentType}</span>
                  <span className="text-[10px] text-emerald-400/80 uppercase">{rec.provider}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Quick Action Controls & Compact Connection Indicator */}
      <div className="flex items-center gap-2">
        {/* Watchlist Quick Switcher */}
        <button
          onClick={onSelectWatchlist}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-all"
        >
          <Bookmark className="h-3 w-3 text-amber-400" />
          <span className="max-w-[100px] truncate">{activeWatchlistName}</span>
        </button>

        {/* Filter Drawer Toggle */}
        <button
          onClick={onOpenFilterDrawer}
          className="flex items-center gap-1 h-8 px-2.5 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-all"
          title="Filter Instruments"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
          <span>Filters</span>
        </button>

        {/* Compact Connection Pill (NO permanent status bar) */}
        <button
          onClick={onOpenDiagnostics}
          className={`flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-mono border transition-all ${
            isLive
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40"
              : systemState === "CONNECTING" || systemState === "AUTHENTICATING"
              ? "bg-amber-950/40 border-amber-500/40 text-amber-400 hover:bg-amber-900/40"
              : "bg-rose-950/40 border-rose-500/40 text-rose-400 hover:bg-rose-900/40"
          }`}
          title="Click to open Advanced Provider Diagnostics"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isLive
                ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                : systemState === "CONNECTING"
                ? "bg-amber-400 animate-ping"
                : "bg-rose-500"
            }`}
          />
          <span className="font-semibold">{isLive ? "LIVE FEED" : systemState}</span>
        </button>
      </div>
    </div>
  );
}
