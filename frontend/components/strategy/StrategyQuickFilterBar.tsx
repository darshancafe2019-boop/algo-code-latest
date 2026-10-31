"use client";

import React, { useState } from "react";
import {
  Filter,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  SlidersHorizontal,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MoreFilterOptions {
  exchange: string;
  provider: string;
  assetType: string;
  marketRegime: string;
  riskStatus: string;
  dataReadiness: string;
}

export const INITIAL_MORE_FILTERS: MoreFilterOptions = {
  exchange: "ALL",
  provider: "ALL",
  assetType: "ALL",
  marketRegime: "ALL",
  riskStatus: "ALL",
  dataReadiness: "ALL",
};

interface StrategyQuickFilterBarProps {
  quickFilter: string;
  onSelectQuickFilter: (filterId: string) => void;
  moreFilters: MoreFilterOptions;
  onMoreFiltersChange: (filters: MoreFilterOptions) => void;
  onResetAllFilters: () => void;
}

const QUICK_FILTERS = [
  { id: "ALL", label: "All Strategies" },
  { id: "READY_NOW", label: "Ready Now" },
  { id: "LONG", label: "Long" },
  { id: "SHORT", label: "Short" },
  { id: "BOTH", label: "Both" },
  { id: "1M", label: "1m" },
  { id: "5M", label: "5m" },
  { id: "15M", label: "15m" },
  { id: "1H", label: "1H" },
  { id: "4H", label: "4H" },
  { id: "DAILY", label: "Daily" },
];

export function StrategyQuickFilterBar({
  quickFilter,
  onSelectQuickFilter,
  moreFilters,
  onMoreFiltersChange,
  onResetAllFilters,
}: StrategyQuickFilterBarProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const activeMoreFiltersCount = Object.values(moreFilters).filter((v) => v !== "ALL").length;

  return (
    <div className="w-full bg-[#081321] border border-[#1A2B43] rounded-lg p-2.5 space-y-2 select-none font-sans shadow-md">
      {/* Top row: Quick filter pills + More filters toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase font-bold text-[#91A7C1] mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3 text-[#00C9E8]" />
            <span>Quick:</span>
          </span>

          {QUICK_FILTERS.map((qf) => {
            const isSelected = quickFilter === qf.id;
            return (
              <button
                key={qf.id}
                type="button"
                onClick={() => onSelectQuickFilter(qf.id)}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-mono transition-colors border cursor-pointer",
                  isSelected
                    ? "bg-[#00C9E8]/15 border-[#00C9E8]/40 text-[#00C9E8] font-bold shadow-xs"
                    : "bg-[#09182B] border-[#15304A] text-[#91A7C1] hover:text-[#EAF3FF] hover:border-[#1F4264]"
                )}
              >
                {qf.label}
              </button>
            );
          })}
        </div>

        {/* Right: More Filters & Reset Actions */}
        <div className="flex items-center gap-2">
          {activeMoreFiltersCount > 0 && (
            <button
              type="button"
              onClick={onResetAllFilters}
              className="px-2 py-1 rounded bg-[#FF5268]/10 hover:bg-[#FF5268]/20 border border-[#FF5268]/30 text-[#FF5268] text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={cn(
              "px-2.5 py-1 rounded border text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
              isMoreOpen || activeMoreFiltersCount > 0
                ? "bg-[#00C9E8]/15 border-[#00C9E8]/40 text-[#00C9E8]"
                : "bg-[#09182B] border-[#15304A] text-[#91A7C1] hover:text-[#EAF3FF]"
            )}
          >
            <SlidersHorizontal className="h-3 w-3 text-[#00C9E8]" />
            <span>More Filters</span>
            {activeMoreFiltersCount > 0 && (
              <span className="px-1 py-0.2 rounded-full text-[9px] bg-[#00C9E8] text-[#050B16] font-bold">
                {activeMoreFiltersCount}
              </span>
            )}
            {isMoreOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Expanded More Filters Drawer */}
      {isMoreOpen && (
        <div className="pt-2 border-t border-[#1A2B43]/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-[11px] font-mono animate-in fade-in-50 duration-150">
          {/* 1. Exchange */}
          <div>
            <label className="text-[9px] text-[#91A7C1] font-bold uppercase block mb-1">Exchange</label>
            <select
              value={moreFilters.exchange}
              onChange={(e) => onMoreFiltersChange({ ...moreFilters, exchange: e.target.value })}
              className="w-full px-2 py-1 rounded bg-[#06101B] border border-[#1A2B43] text-[#EAF3FF] text-[10px] focus:outline-none focus:border-[#00C9E8]"
            >
              <option value="ALL">All Exchanges</option>
              <option value="NSE">NSE (India)</option>
              <option value="BSE">BSE (India)</option>
              <option value="MCX">MCX (Commodities)</option>
              <option value="BINANCE">Binance</option>
              <option value="DELTA">Delta Exchange</option>
            </select>
          </div>

          {/* 2. Provider */}
          <div>
            <label className="text-[9px] text-[#91A7C1] font-bold uppercase block mb-1">Provider</label>
            <select
              value={moreFilters.provider}
              onChange={(e) => onMoreFiltersChange({ ...moreFilters, provider: e.target.value })}
              className="w-full px-2 py-1 rounded bg-[#06101B] border border-[#1A2B43] text-[#EAF3FF] text-[10px] focus:outline-none focus:border-[#00C9E8]"
            >
              <option value="ALL">All Providers</option>
              <option value="UPSTOX">Upstox v3</option>
              <option value="DELTA">Delta India</option>
              <option value="BINANCE">Binance Spot/FUT</option>
              <option value="SIMULATED">Paper Sim</option>
            </select>
          </div>

          {/* 3. Asset Type */}
          <div>
            <label className="text-[9px] text-[#91A7C1] font-bold uppercase block mb-1">Asset Type</label>
            <select
              value={moreFilters.assetType}
              onChange={(e) => onMoreFiltersChange({ ...moreFilters, assetType: e.target.value })}
              className="w-full px-2 py-1 rounded bg-[#06101B] border border-[#1A2B43] text-[#EAF3FF] text-[10px] focus:outline-none focus:border-[#00C9E8]"
            >
              <option value="ALL">All Asset Types</option>
              <option value="CRYPTO">Crypto & Spot</option>
              <option value="OPTIONS">Options & Multi-Leg</option>
              <option value="FUTURES">Futures & Perps</option>
              <option value="EQUITY">Equities / Stocks</option>
            </select>
          </div>

          {/* 4. Market Regime */}
          <div>
            <label className="text-[9px] text-[#91A7C1] font-bold uppercase block mb-1">Regime Alignment</label>
            <select
              value={moreFilters.marketRegime}
              onChange={(e) => onMoreFiltersChange({ ...moreFilters, marketRegime: e.target.value })}
              className="w-full px-2 py-1 rounded bg-[#06101B] border border-[#1A2B43] text-[#EAF3FF] text-[10px] focus:outline-none focus:border-[#00C9E8]"
            >
              <option value="ALL">All Regimes</option>
              <option value="TRENDING">TRENDING</option>
              <option value="RANGING">RANGING</option>
              <option value="BREAKOUT">BREAKOUT / EXPANSION</option>
              <option value="HIGH_VOLATILITY">HIGH VOLATILITY</option>
              <option value="LOW_VOLATILITY">LOW VOLATILITY</option>
            </select>
          </div>

          {/* 5. Risk Status */}
          <div>
            <label className="text-[9px] text-[#91A7C1] font-bold uppercase block mb-1">Risk Profile</label>
            <select
              value={moreFilters.riskStatus}
              onChange={(e) => onMoreFiltersChange({ ...moreFilters, riskStatus: e.target.value })}
              className="w-full px-2 py-1 rounded bg-[#06101B] border border-[#1A2B43] text-[#EAF3FF] text-[10px] focus:outline-none focus:border-[#00C9E8]"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="LOW">Low Risk (Theta/Income)</option>
              <option value="MEDIUM">Medium Risk (Trend/Breakout)</option>
              <option value="HIGH">High Risk (Gamma/Expansion)</option>
            </select>
          </div>

          {/* 6. Data Readiness */}
          <div>
            <label className="text-[9px] text-[#91A7C1] font-bold uppercase block mb-1">Data Readiness</label>
            <select
              value={moreFilters.dataReadiness}
              onChange={(e) => onMoreFiltersChange({ ...moreFilters, dataReadiness: e.target.value })}
              className="w-full px-2 py-1 rounded bg-[#06101B] border border-[#1A2B43] text-[#EAF3FF] text-[10px] focus:outline-none focus:border-[#00C9E8]"
            >
              <option value="ALL">All Readiness</option>
              <option value="READY">READY (100% Feeds)</option>
              <option value="WARNING">WARNING (Delayed)</option>
              <option value="ERROR">ERROR (Missing Feeds)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

