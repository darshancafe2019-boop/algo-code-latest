"use client";

import React from "react";
import {
  Search,
  LayoutGrid,
  List,
  CheckSquare,
  Square,
  RotateCcw,
  RefreshCw,
  PlusCircle,
  X,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FleetFilterBarProps {
  statusFilter: string;
  onStatusChange: (status: string) => void;
  currencyFilter: "ALL" | "INR" | "USD";
  onCurrencyChange: (c: "ALL" | "INR" | "USD") => void;
  exchangeFilter: string;
  onExchangeChange: (exchange: string) => void;
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
  onCreateBot: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export function FleetFilterBar({
  statusFilter,
  onStatusChange,
  currencyFilter,
  onCurrencyChange,
  exchangeFilter,
  onExchangeChange,
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
  onCreateBot,
  onRefresh,
  loading,
}: FleetFilterBarProps) {
  const isAllSelected = selectedCount > 0 && selectedCount === totalFiltered;
  const isFiltered =
    statusFilter !== "ALL" ||
    currencyFilter !== "ALL" ||
    exchangeFilter !== "ALL" ||
    searchQuery.trim().length > 0;

  const STATUS_CONFIG: Array<{ key: string; label: string; activeColor: string }> = [
    { key: "ALL", label: "ALL", activeColor: "bg-[#0878FF]/20 text-[#00C9E8] border-[#0878FF]/50" },
    { key: "RUNNING", label: "RUNNING", activeColor: "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/40" },
    { key: "READY", label: "READY", activeColor: "bg-[#0878FF]/20 text-[#0878FF] border-[#0878FF]/40" },
    { key: "PAUSED", label: "PAUSED", activeColor: "bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020]/40" },
    { key: "STOPPED", label: "STOPPED", activeColor: "bg-[#91A7C1]/20 text-[#EAF3FF] border-[#91A7C1]/40" },
    { key: "ERROR", label: "ERROR", activeColor: "bg-[#FF5268]/20 text-[#FF5268] border-[#FF5268]/50" },
  ];

  return (
    <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-3 flex flex-col gap-3 select-none font-sans shadow-md">
      {/* ── ROW 1: PRIMARY TOOLBAR ───────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Left Section: Search & Dropdowns */}
        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
          {/* Unified Search Input */}
          <div className="relative min-w-[260px] flex-1 sm:max-w-md">
            <Search className="h-4 w-4 text-[#91A7C1] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search bot name, symbol, strategy..."
              className="w-full pl-9 pr-8 py-2 text-xs font-mono rounded-[6px] bg-[#050B16] border border-[#1A2B43] text-[#EAF3FF] placeholder-[#91A7C1]/60 focus:outline-none focus:border-[#00C9E8] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#91A7C1] hover:text-[#EAF3FF] p-0.5"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Exchange Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#050B16] border border-[#1A2B43] rounded-[6px] px-2.5 py-1.5">
            <span className="text-[10px] font-mono uppercase text-[#91A7C1] font-bold">Exchange:</span>
            <select
              value={exchangeFilter}
              onChange={(e) => onExchangeChange(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-[#EAF3FF] focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#091426] text-white">ALL EXCHANGES</option>
              <option value="NSE" className="bg-[#091426] text-white">NSE (India)</option>
              <option value="DELTA" className="bg-[#091426] text-white">DELTA (Crypto)</option>
              <option value="BINANCE" className="bg-[#091426] text-white">BINANCE (USD-M)</option>
              <option value="MCX" className="bg-[#091426] text-white">MCX (Commodity)</option>
              <option value="UPSTOX" className="bg-[#091426] text-white">UPSTOX</option>
            </select>
          </div>

          {/* Currency Filter Dropdown/Pills */}
          <div className="flex items-center gap-1 bg-[#050B16] p-1 rounded-[6px] border border-[#1A2B43]">
            <span className="text-[10px] font-mono uppercase text-[#91A7C1] font-bold px-1.5">Currency:</span>
            {(["ALL", "INR", "USD"] as const).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => onCurrencyChange(curr)}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer",
                  currencyFilter === curr
                    ? "bg-[#0878FF] text-white shadow-sm"
                    : "text-[#91A7C1] hover:text-[#EAF3FF]"
                )}
              >
                {curr === "ALL" ? "ALL" : curr === "INR" ? "₹ INR" : "$ USD"}
              </button>
            ))}
          </div>

          {/* Reset Filters button if any filter active */}
          {isFiltered && (
            <button
              type="button"
              onClick={onClearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-[#050B16] border border-[#1A2B43] text-xs font-mono font-bold text-[#91A7C1] hover:text-[#FF5268] hover:border-[#FF5268]/40 transition-colors cursor-pointer"
              title="Reset all search & filters"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Refresh Data Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#050B16] border border-[#1A2B43] hover:border-[#0878FF]/50 text-xs font-mono font-semibold text-[#91A7C1] hover:text-[#EAF3FF] transition-all cursor-pointer disabled:opacity-50"
            title="Refresh fleet telemetry & status"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading ? "animate-spin text-[#00C9E8]" : "text-[#91A7C1]")} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>

          {/* View Mode Toggle (Table / Grid) */}
          <div className="flex items-center bg-[#050B16] p-0.5 rounded-[6px] border border-[#1A2B43]">
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={cn(
                "p-1.5 rounded transition-colors cursor-pointer",
                viewMode === "table" ? "bg-[#0878FF] text-white shadow-sm" : "text-[#91A7C1] hover:text-[#EAF3FF]"
              )}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "p-1.5 rounded transition-colors cursor-pointer",
                viewMode === "grid" ? "bg-[#0878FF] text-white shadow-sm" : "text-[#91A7C1] hover:text-[#EAF3FF]"
              )}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* Create Bot Button */}
          <button
            type="button"
            onClick={onCreateBot}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] bg-[#00C9E8] hover:bg-[#00B4D0] text-[#050B16] font-mono font-bold text-xs transition-all shadow-md cursor-pointer hover:shadow-[#00C9E8]/20"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Bot</span>
          </button>
        </div>
      </div>

      {/* ── ROW 2: STATUS FILTER PILLS & SELECTION COUNT ──────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#1A2B43]/60">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {STATUS_CONFIG.map(({ key, label, activeColor }) => {
            const count = statusCounts[key] ?? 0;
            const active = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onStatusChange(key)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-mono font-bold transition-all border cursor-pointer",
                  active
                    ? activeColor
                    : "bg-[#050B16] text-[#91A7C1] border-[#1A2B43] hover:text-[#EAF3FF] hover:border-[#1A2B43]/80"
                )}
              >
                <span>{label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold tabular-nums",
                    active ? "bg-white/20 text-white" : "bg-[#0B1728] text-[#91A7C1]"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Multi-Select Status & Counter */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={onToggleSelectAll}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border text-xs font-mono font-bold transition-colors cursor-pointer",
              isAllSelected
                ? "bg-[#0878FF]/20 border-[#0878FF]/50 text-[#00C9E8]"
                : "bg-[#050B16] border-[#1A2B43] text-[#91A7C1] hover:text-[#EAF3FF]"
            )}
            title="Select all currently visible bots"
          >
            {isAllSelected ? (
              <CheckSquare className="h-3.5 w-3.5 text-[#00C9E8]" />
            ) : (
              <Square className="h-3.5 w-3.5 text-[#91A7C1]" />
            )}
            <span>Select All ({totalFiltered})</span>
          </button>
          {selectedCount > 0 && (
            <span className="text-xs font-mono font-bold text-[#00C9E8] bg-[#0878FF]/15 px-2 py-0.5 rounded border border-[#0878FF]/30">
              {selectedCount} Selected
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
