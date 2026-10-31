"use client";

import React, { useState } from "react";
import {
  Search,
  LayoutGrid,
  List,
  CheckSquare,
  Square,
  RotateCcw,
  SlidersHorizontal,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdvancedBotFilters {
  exchange: string;
  strategy: string;
  assetType: string;
  tradingMode: string;
  riskStatus: string;
}

interface FleetFilterBarProps {
  statusFilter: string;
  onStatusChange: (status: string) => void;
  currencyFilter: "ALL" | "INR" | "USD";
  onCurrencyChange: (c: "ALL" | "INR" | "USD") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: "table" | "grid";
  onViewModeChange: (m: "table" | "grid") => void;
  selectedCount: number;
  totalFiltered: number;
  totalBots: number;
  onToggleSelectAll: () => void;
  onClearFilters: () => void;
  statusCounts: Record<string, number>;
  advancedFilters: AdvancedBotFilters;
  onAdvancedFilterChange: (filters: AdvancedBotFilters) => void;
}

export function FleetFilterBar({
  statusFilter,
  onStatusChange,
  currencyFilter,
  onCurrencyChange,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  selectedCount,
  totalFiltered,
  totalBots,
  onToggleSelectAll,
  onClearFilters,
  statusCounts,
  advancedFilters,
  onAdvancedFilterChange,
}: FleetFilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isAllSelected = selectedCount > 0 && selectedCount === totalFiltered;

  const hasActiveAdvanced =
    advancedFilters.exchange !== "ALL" ||
    advancedFilters.strategy !== "ALL" ||
    advancedFilters.assetType !== "ALL" ||
    advancedFilters.tradingMode !== "ALL" ||
    advancedFilters.riskStatus !== "ALL";

  return (
    <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-2.5 flex flex-col gap-2 select-none font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Left: Currency & Status Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Currency Filter */}
          <div className="flex items-center gap-0.5 bg-[#050B16] p-0.5 rounded border border-[#1A2B43]">
            {(["ALL", "INR", "USD"] as const).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => onCurrencyChange(curr)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors",
                  currencyFilter === curr
                    ? "bg-[#0878FF] text-white"
                    : "text-[#91A7C1] hover:text-[#EAF3FF]"
                )}
              >
                {curr === "ALL" ? "All Currencies" : curr === "INR" ? "INR (₹)" : "USD ($)"}
              </button>
            ))}
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {["ALL", "RUNNING", "READY", "PAUSED", "STOPPED", "ERROR"].map((status) => {
              const count = statusCounts[status] || 0;
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatusChange(status)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors border",
                    active
                      ? "bg-[#0878FF]/20 text-[#00C9E8] border-[#0878FF]/50"
                      : "bg-[#050B16] text-[#91A7C1] border-[#1A2B43] hover:text-[#EAF3FF] hover:border-[#1A2B43]"
                  )}
                >
                  <span>{status}</span>
                  <span
                    className={cn(
                      "px-1 py-0.1 rounded-full text-[9px] font-mono font-bold",
                      active ? "bg-[#0878FF] text-white" : "bg-[#0B1728] text-[#91A7C1]"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Search, Advanced Filters, View Modes & Multi-Select */}
        <div className="flex items-center gap-2 flex-wrap justify-between lg:justify-end">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="h-3.5 w-3.5 text-[#91A7C1] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search bot, symbol, strategy..."
              className="w-full pl-8 pr-7 py-1 text-[11px] font-mono rounded bg-[#050B16] border border-[#1A2B43] text-[#EAF3FF] placeholder-[#91A7C1]/60 focus:outline-none focus:border-[#00C9E8] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#91A7C1] hover:text-[#EAF3FF]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Toggle Advanced Filters */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono font-bold transition-colors cursor-pointer",
              showAdvanced || hasActiveAdvanced
                ? "bg-[#00C9E8]/15 border-[#00C9E8]/40 text-[#00C9E8]"
                : "bg-[#050B16] border-[#1A2B43] text-[#91A7C1] hover:text-[#EAF3FF]"
            )}
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span>Filters</span>
            {hasActiveAdvanced && <span className="h-1.5 w-1.5 rounded-full bg-[#00C9E8]" />}
            {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {/* Select All Toggle */}
          <button
            type="button"
            onClick={onToggleSelectAll}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-mono font-bold transition-colors cursor-pointer",
              isAllSelected
                ? "bg-[#0878FF]/20 border-[#0878FF]/50 text-[#00C9E8]"
                : "bg-[#050B16] border-[#1A2B43] text-[#91A7C1] hover:text-[#EAF3FF]"
            )}
            title="Select all matching units"
          >
            {isAllSelected ? (
              <CheckSquare className="h-3 w-3 text-[#00C9E8]" />
            ) : (
              <Square className="h-3 w-3 text-[#91A7C1]" />
            )}
            <span>All ({totalFiltered})</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#050B16] p-0.5 rounded border border-[#1A2B43]">
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={cn(
                "p-1 rounded transition-colors",
                viewMode === "table" ? "bg-[#0878FF] text-white" : "text-[#91A7C1] hover:text-[#EAF3FF]"
              )}
              title="List / Table View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "p-1 rounded transition-colors",
                viewMode === "grid" ? "bg-[#0878FF] text-white" : "text-[#91A7C1] hover:text-[#EAF3FF]"
              )}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Reset Filters */}
          {(statusFilter !== "ALL" || currencyFilter !== "ALL" || searchQuery || hasActiveAdvanced) && (
            <button
              type="button"
              onClick={onClearFilters}
              className="p-1 rounded bg-[#050B16] border border-[#1A2B43] text-[#91A7C1] hover:text-[#FF5268] hover:border-[#FF5268]/40 transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Drawer */}
      {showAdvanced && (
        <div className="pt-2 mt-1 border-t border-[#1A2B43]/80 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] font-mono">
          {/* Exchange Filter */}
          <div>
            <label className="text-[#91A7C1] block mb-0.5 font-semibold">Exchange</label>
            <select
              value={advancedFilters.exchange}
              onChange={(e) =>
                onAdvancedFilterChange({ ...advancedFilters, exchange: e.target.value })
              }
              className="w-full bg-[#050B16] border border-[#1A2B43] rounded px-2 py-1 text-[#EAF3FF] focus:outline-none focus:border-[#00C9E8]"
            >
              <option value="ALL">All Exchanges</option>
              <option value="NSE">NSE (India)</option>
              <option value="DELTA">Delta Exchange</option>
              <option value="BINANCE">Binance USD-M</option>
              <option value="MCX">MCX Commodity</option>
              <option value="UPSTOX">Upstox</option>
            </select>
          </div>

          {/* Strategy Filter */}
          <div>
            <label className="text-[#91A7C1] block mb-0.5 font-semibold">Strategy Type</label>
            <select
              value={advancedFilters.strategy}
              onChange={(e) =>
                onAdvancedFilterChange({ ...advancedFilters, strategy: e.target.value })
              }
              className="w-full bg-[#050B16] border border-[#1A2B43] rounded px-2 py-1 text-[#EAF3FF] focus:outline-none focus:border-[#00C9E8]"
            >
              <option value="ALL">All Strategies</option>
              <option value="TREND">Trend Following</option>
              <option value="MOMENTUM">Momentum / Breakout</option>
              <option value="MEAN_REVERSION">Mean Reversion</option>
              <option value="STAT_ARB">Statistical Arbitrage</option>
              <option value="GRID">Volatility Grid</option>
            </select>
          </div>

          {/* Asset Type */}
          <div>
            <label className="text-[#91A7C1] block mb-0.5 font-semibold">Asset Category</label>
            <select
              value={advancedFilters.assetType}
              onChange={(e) =>
                onAdvancedFilterChange({ ...advancedFilters, assetType: e.target.value })
              }
              className="w-full bg-[#050B16] border border-[#1A2B43] rounded px-2 py-1 text-[#EAF3FF] focus:outline-none focus:border-[#00C9E8]"
            >
              <option value="ALL">All Asset Types</option>
              <option value="OPTION">Options</option>
              <option value="FUTURES">Futures</option>
              <option value="PERPETUAL">Crypto Perpetuals</option>
              <option value="EQUITY">Equities / Cash</option>
            </select>
          </div>

          {/* Trading Mode */}
          <div>
            <label className="text-[#91A7C1] block mb-0.5 font-semibold">Execution Mode</label>
            <select
              value={advancedFilters.tradingMode}
              onChange={(e) =>
                onAdvancedFilterChange({ ...advancedFilters, tradingMode: e.target.value })
              }
              className="w-full bg-[#050B16] border border-[#1A2B43] rounded px-2 py-1 text-[#EAF3FF] focus:outline-none focus:border-[#00C9E8]"
            >
              <option value="ALL">All Modes</option>
              <option value="PAPER">PAPER (Simulation)</option>
              <option value="LIVE">LIVE (Execution)</option>
            </select>
          </div>

          {/* Risk Status */}
          <div>
            <label className="text-[#91A7C1] block mb-0.5 font-semibold">Risk Gate Status</label>
            <select
              value={advancedFilters.riskStatus}
              onChange={(e) =>
                onAdvancedFilterChange({ ...advancedFilters, riskStatus: e.target.value })
              }
              className="w-full bg-[#050B16] border border-[#1A2B43] rounded px-2 py-1 text-[#EAF3FF] focus:outline-none focus:border-[#00C9E8]"
            >
              <option value="ALL">All Gates</option>
              <option value="ARMED">Armed &amp; Safe</option>
              <option value="WARNING">Exposure Warning</option>
              <option value="BREACHED">Breached / Circuit Paused</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
