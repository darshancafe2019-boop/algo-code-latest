"use client";

import React from "react";
import { Search, Filter, X, Database, Sliders, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface IndicatorFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  selectedSource: string;
  onSourceChange: (src: string) => void;
  selectedSignal: string;
  onSignalChange: (sig: string) => void;
  selectedStatus: string;
  onStatusChange: (st: string) => void;
  selectedTimeframe: string;
  onTimeframeChange: (tf: string) => void;
  onResetFilters: () => void;
  activeFilterCount: number;
}

const CATEGORIES = ["ALL", "TREND", "MOMENTUM", "VOLATILITY", "VOLUME", "SUPPORT_RESISTANCE"];
const TIMEFRAMES = ["ALL", "1m", "5m", "15m", "1h", "4h", "1d"];
const SOURCES = ["ALL", "DELTA", "UPSTOX", "BINANCE", "PAPER_SIMULATOR"];
const SIGNALS = ["ALL", "BUY", "SELL", "NEUTRAL", "NONE"];
const STATUSES = ["ALL", "HEALTHY", "WARNING", "ERROR", "DISABLED"];

export function IndicatorFilterToolbar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedSource,
  onSourceChange,
  selectedSignal,
  onSignalChange,
  selectedStatus,
  onStatusChange,
  selectedTimeframe,
  onTimeframeChange,
  onResetFilters,
  activeFilterCount,
}: IndicatorFilterToolbarProps) {
  return (
    <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-2.5 space-y-2">
      {/* Top Filter Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-[340px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7D8EA5]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search indicator name, key, params..."
            className="w-full pl-8 pr-7 py-1 text-[11px] font-mono bg-[#06101B] border border-[#10263A] rounded text-[#F8FAFC] placeholder-[#7D8EA5] focus:outline-none focus:border-[#00F0FF]/50 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7D8EA5] hover:text-[#F8FAFC]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Dropdowns Group */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1 bg-[#06101B] border border-[#10263A] rounded px-2 py-0.5">
            <span className="text-[10px] text-[#7D8EA5] uppercase font-semibold">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="bg-transparent text-[#F8FAFC] font-mono text-[10px] focus:outline-none cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-[#0A1422] text-[#F8FAFC]">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Data Source Dropdown */}
          <div className="flex items-center gap-1 bg-[#06101B] border border-[#10263A] rounded px-2 py-0.5">
            <span className="text-[10px] text-[#7D8EA5] uppercase font-semibold">Source:</span>
            <select
              value={selectedSource}
              onChange={(e) => onSourceChange(e.target.value)}
              className="bg-transparent text-[#F8FAFC] font-mono text-[10px] focus:outline-none cursor-pointer"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s} className="bg-[#0A1422] text-[#F8FAFC]">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Signal Dropdown */}
          <div className="flex items-center gap-1 bg-[#06101B] border border-[#10263A] rounded px-2 py-0.5">
            <span className="text-[10px] text-[#7D8EA5] uppercase font-semibold">Signal:</span>
            <select
              value={selectedSignal}
              onChange={(e) => onSignalChange(e.target.value)}
              className="bg-transparent text-[#F8FAFC] font-mono text-[10px] focus:outline-none cursor-pointer"
            >
              {SIGNALS.map((s) => (
                <option key={s} value={s} className="bg-[#0A1422] text-[#F8FAFC]">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1 bg-[#06101B] border border-[#10263A] rounded px-2 py-0.5">
            <span className="text-[10px] text-[#7D8EA5] uppercase font-semibold">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="bg-transparent text-[#F8FAFC] font-mono text-[10px] focus:outline-none cursor-pointer"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st} className="bg-[#0A1422] text-[#F8FAFC]">
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Pill */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-2 py-1 rounded bg-[#FF3B5C]/15 border border-[#FF3B5C]/40 text-[#FF3B5C] hover:bg-[#FF3B5C]/25 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>Reset ({activeFilterCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Timeframe Pills Row */}
      <div className="flex items-center justify-between pt-1.5 border-t border-[#10263A]/60">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold text-[#7D8EA5] uppercase tracking-wider mr-1">Timeframe Filter:</span>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onTimeframeChange(tf)}
              className={cn(
                "px-2 py-0.5 text-[10px] font-mono font-semibold rounded transition-colors",
                selectedTimeframe === tf
                  ? "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-bold"
                  : "text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#06101B] border border-transparent"
              )}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-[#7D8EA5] font-mono">
          Engine Mode: <span className="text-[#00E89A] font-semibold">Zero-Latency Vectorized</span>
        </div>
      </div>
    </div>
  );
}

