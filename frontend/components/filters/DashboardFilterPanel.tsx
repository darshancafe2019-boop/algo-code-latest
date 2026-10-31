"use client";

import React, { useState } from "react";
import {
  Filter,
  X,
  RotateCcw,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  TrendingUp,
  Activity,
  Layers,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardFilterStore } from "@/lib/store/useDashboardFilterStore";

export function DashboardFilterPanel() {
  const {
    isFilterOpen,
    setFilterOpen,
    searchQuery,
    setSearchQuery,
    exchange,
    setExchange,
    segment,
    setSegment,
    scannerCategory,
    setScannerCategory,
    minPctMove,
    setMinPctMove,
    optionType,
    setOptionType,
    technicalConfluence,
    setTechnicalConfluence,
    botStatus,
    setBotStatus,
    positionStatus,
    setPositionStatus,
    applyPreset,
    resetFilters,
    getActiveFiltersCount,
  } = useDashboardFilterStore();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    market: true,
    scanner: true,
    technical: false,
    trading: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeCount = getActiveFiltersCount();

  if (!isFilterOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[360px] bg-[#07111F] border-l border-[#12304A] shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-200 select-none">
      {/* 1. Header */}
      <div className="p-3.5 border-b border-[#12304A] bg-[#050C16] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">Filter Station</span>
              {activeCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-[#168BFF] text-white">
                  {activeCount} Active
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#7D8EA5]">Centralized Multi-Market Filter Matrix</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="p-1 rounded text-[10px] text-[#7D8EA5] hover:text-[#FF3B5C] hover:bg-[#FF3B5C]/10 transition-colors flex items-center gap-1"
              title="Reset all filters"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setFilterOpen(false)}
            className="p-1 rounded text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#122A42] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Search Box */}
      <div className="p-3 border-b border-[#10263A] bg-[#06101B]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#7D8EA5]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbols, indices, strategies..."
            className="w-full bg-[#0A1422] border border-[#12304A] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#F8FAFC] placeholder-[#7D8EA5] focus:outline-none focus:border-[#00F0FF]/60 font-sans"
          />
        </div>
      </div>

      {/* 3. Quick Presets */}
      <div className="p-3 border-b border-[#10263A] bg-[#07111F] space-y-1.5">
        <div className="flex items-center gap-1 text-[10px] font-semibold text-[#7D8EA5] uppercase tracking-wider">
          <Sparkles className="h-3 w-3 text-amber-400" />
          <span>Quick Presets</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <button
            type="button"
            onClick={() => applyPreset("MOMENTUM")}
            className="px-2 py-1 rounded bg-[#0A1422] border border-[#122A42] hover:border-[#00E89A]/50 text-[#00E89A] font-semibold flex items-center gap-1 transition-colors text-left"
          >
            <TrendingUp className="h-3 w-3 shrink-0" />
            <span className="truncate">Intraday Momentum</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset("BREAKOUT")}
            className="px-2 py-1 rounded bg-[#0A1422] border border-[#122A42] hover:border-[#00F0FF]/50 text-[#00F0FF] font-semibold flex items-center gap-1 transition-colors text-left"
          >
            <Zap className="h-3 w-3 shrink-0" />
            <span className="truncate">High Vol Breakout</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset("REVERSION")}
            className="px-2 py-1 rounded bg-[#0A1422] border border-[#122A42] hover:border-[#FF3B5C]/50 text-[#FF3B5C] font-semibold flex items-center gap-1 transition-colors text-left"
          >
            <Activity className="h-3 w-3 shrink-0" />
            <span className="truncate">Mean Reversion</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset("OPTIONS_FLOW")}
            className="px-2 py-1 rounded bg-[#0A1422] border border-[#122A42] hover:border-[#A855F7]/50 text-[#A855F7] font-semibold flex items-center gap-1 transition-colors text-left"
          >
            <Layers className="h-3 w-3 shrink-0" />
            <span className="truncate">Option Flow Delta</span>
          </button>
        </div>
      </div>

      {/* 4. Collapsible Filter Groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin text-xs">
        {/* GROUP A: MARKET VENUE & SEGMENT */}
        <div className="rounded-md border border-[#122A42] bg-[#0A1422] overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("market")}
            className="w-full p-2.5 flex items-center justify-between text-left font-semibold text-[#F8FAFC] bg-[#08121E]"
          >
            <span className="text-[11px] uppercase tracking-wider text-[#22D3EE]">1. Market & Exchange</span>
            {expandedSections.market ? <ChevronUp className="h-3.5 w-3.5 text-[#7D8EA5]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#7D8EA5]" />}
          </button>
          {expandedSections.market && (
            <div className="p-3 space-y-2.5 text-[11px]">
              <div>
                <label className="text-[10px] text-[#7D8EA5] uppercase font-mono block mb-1">Exchange</label>
                <div className="grid grid-cols-3 gap-1">
                  {(["ALL", "NSE", "BSE", "MCX", "CRYPTO"] as const).map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setExchange(ex)}
                      className={cn(
                        "py-1 px-1.5 rounded font-mono text-[10px] font-semibold border transition-colors",
                        exchange === ex
                          ? "bg-[#168BFF] text-white border-[#168BFF]"
                          : "bg-[#06101B] text-[#7D8EA5] border-[#10263A] hover:text-[#F8FAFC]"
                      )}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#7D8EA5] uppercase font-mono block mb-1">Segment</label>
                <div className="grid grid-cols-2 gap-1">
                  {(["ALL", "EQUITY", "FUTURES", "OPTIONS"] as const).map((seg) => (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => setSegment(seg)}
                      className={cn(
                        "py-1 px-1.5 rounded font-mono text-[10px] font-semibold border transition-colors",
                        segment === seg
                          ? "bg-[#168BFF] text-white border-[#168BFF]"
                          : "bg-[#06101B] text-[#7D8EA5] border-[#10263A] hover:text-[#F8FAFC]"
                      )}
                    >
                      {seg}
                    </button>
                  ))}
                </div>
              </div>

              {segment === "OPTIONS" && (
                <div>
                  <label className="text-[10px] text-[#7D8EA5] uppercase font-mono block mb-1">Option Type</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(["ALL", "CE", "PE"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setOptionType(opt)}
                        className={cn(
                          "py-1 px-1.5 rounded font-mono text-[10px] font-semibold border transition-colors",
                          optionType === opt
                            ? "bg-[#00E89A] text-[#06101B] border-[#00E89A]"
                            : "bg-[#06101B] text-[#7D8EA5] border-[#10263A] hover:text-[#F8FAFC]"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* GROUP B: SCANNER FILTERS */}
        <div className="rounded-md border border-[#122A42] bg-[#0A1422] overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("scanner")}
            className="w-full p-2.5 flex items-center justify-between text-left font-semibold text-[#F8FAFC] bg-[#08121E]"
          >
            <span className="text-[11px] uppercase tracking-wider text-[#00E89A]">2. Market Scanners</span>
            {expandedSections.scanner ? <ChevronUp className="h-3.5 w-3.5 text-[#7D8EA5]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#7D8EA5]" />}
          </button>
          {expandedSections.scanner && (
            <div className="p-3 space-y-2.5 text-[11px]">
              <div>
                <label className="text-[10px] text-[#7D8EA5] uppercase font-mono block mb-1">Scanner Engine</label>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: "ALL", label: "All Candidates" },
                    { id: "gainers", label: "Top Gainers" },
                    { id: "losers", label: "Top Losers" },
                    { id: "volume", label: "Volume Gainers" },
                    { id: "oi_gainers", label: "OI Gainers" },
                    { id: "breakout", label: "Breakout Scan" },
                    { id: "momentum", label: "Momentum Scan" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setScannerCategory(cat.id as any)}
                      className={cn(
                        "py-1 px-1.5 rounded text-[10px] font-semibold border transition-colors text-left truncate",
                        scannerCategory === cat.id
                          ? "bg-[#00E89A]/20 text-[#00E89A] border-[#00E89A]/50"
                          : "bg-[#06101B] text-[#7D8EA5] border-[#10263A] hover:text-[#F8FAFC]"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] text-[#7D8EA5] mb-1">
                  <span className="uppercase font-mono">Session Move Threshold</span>
                  <span className="font-mono text-[#F8FAFC] font-semibold">|Δ| ≥ {minPctMove.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={minPctMove}
                  onChange={(e) => setMinPctMove(parseFloat(e.target.value))}
                  className="w-full accent-[#00F0FF] cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* GROUP C: TECHNICAL FILTERS */}
        <div className="rounded-md border border-[#122A42] bg-[#0A1422] overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("technical")}
            className="w-full p-2.5 flex items-center justify-between text-left font-semibold text-[#F8FAFC] bg-[#08121E]"
          >
            <span className="text-[11px] uppercase tracking-wider text-[#A855F7]">3. Technical Confluence</span>
            {expandedSections.technical ? <ChevronUp className="h-3.5 w-3.5 text-[#7D8EA5]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#7D8EA5]" />}
          </button>
          {expandedSections.technical && (
            <div className="p-3 space-y-2 text-[11px]">
              {[
                { id: "ALL", label: "No Technical Filter" },
                { id: "EMA_BULLISH", label: "Price > EMA 20 & EMA 200" },
                { id: "EMA_BEARISH", label: "Price < EMA 20 & EMA 200" },
                { id: "RSI_OVERSOLD", label: "RSI < 30 (Oversold)" },
                { id: "RSI_OVERBOUGHT", label: "RSI > 70 (Overbought)" },
                { id: "VWAP_ABOVE", label: "Trading Above VWAP" },
                { id: "MACD_CROSS", label: "MACD Bullish Cross" },
              ].map((tech) => (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => setTechnicalConfluence(tech.id as any)}
                  className={cn(
                    "w-full py-1.5 px-2 rounded text-[10px] font-semibold border transition-colors text-left flex items-center justify-between",
                    technicalConfluence === tech.id
                      ? "bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]/50"
                      : "bg-[#06101B] text-[#7D8EA5] border-[#10263A] hover:text-[#F8FAFC]"
                  )}
                >
                  <span>{tech.label}</span>
                  {technicalConfluence === tech.id && <Check className="h-3 w-3 text-[#A855F7]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GROUP D: TRADING & FLEET FILTERS */}
        <div className="rounded-md border border-[#122A42] bg-[#0A1422] overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("trading")}
            className="w-full p-2.5 flex items-center justify-between text-left font-semibold text-[#F8FAFC] bg-[#08121E]"
          >
            <span className="text-[11px] uppercase tracking-wider text-[#FFB020]">4. Trading & Fleet</span>
            {expandedSections.trading ? <ChevronUp className="h-3.5 w-3.5 text-[#7D8EA5]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#7D8EA5]" />}
          </button>
          {expandedSections.trading && (
            <div className="p-3 space-y-2.5 text-[11px]">
              <div>
                <label className="text-[10px] text-[#7D8EA5] uppercase font-mono block mb-1">Bot Status</label>
                <div className="grid grid-cols-2 gap-1">
                  {(["ALL", "RUNNING", "PAUSED", "STOPPED"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setBotStatus(st)}
                      className={cn(
                        "py-1 px-1.5 rounded font-mono text-[10px] font-semibold border transition-colors",
                        botStatus === st
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                          : "bg-[#06101B] text-[#7D8EA5] border-[#10263A] hover:text-[#F8FAFC]"
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#7D8EA5] uppercase font-mono block mb-1">Position P&L Status</label>
                <div className="grid grid-cols-3 gap-1">
                  {(["ALL", "PROFIT", "LOSS"] as const).map((ps) => (
                    <button
                      key={ps}
                      type="button"
                      onClick={() => setPositionStatus(ps)}
                      className={cn(
                        "py-1 px-1.5 rounded font-mono text-[10px] font-semibold border transition-colors",
                        positionStatus === ps
                          ? "bg-[#00E89A] text-[#06101B] border-[#00E89A]"
                          : "bg-[#06101B] text-[#7D8EA5] border-[#10263A] hover:text-[#F8FAFC]"
                      )}
                    >
                      {ps}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Footer Summary & Apply */}
      <div className="p-3 border-t border-[#12304A] bg-[#050C16] flex items-center justify-between">
        <span className="text-[10px] text-[#7D8EA5]">
          Active: <strong className="text-[#00F0FF]">{activeCount}</strong> filters applied
        </span>
        <button
          type="button"
          onClick={() => setFilterOpen(false)}
          className="px-3 py-1 rounded bg-[#168BFF] hover:bg-[#168BFF]/80 text-white text-[11px] font-bold transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}

