"use client";

import React, { useRef, useEffect } from "react";
import { Search, ArrowUpDown, X, FileSpreadsheet, FileCode, Building2 } from "lucide-react";
import { PositionFilterCategory, PositionBrokerFilter, PositionSortKey } from "@/types/positions";

interface PositionsFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: PositionFilterCategory;
  onCategoryChange: (cat: PositionFilterCategory) => void;
  selectedBroker: PositionBrokerFilter;
  onBrokerChange: (broker: PositionBrokerFilter) => void;
  sortKey: PositionSortKey;
  onSortChange: (sort: PositionSortKey) => void;
  counts: {
    all: number;
    long: number;
    short: number;
    profit: number;
    loss: number;
  };
  onExportCsv: () => void;
  onExportJson: () => void;
}

export function PositionsFilterBar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedBroker,
  onBrokerChange,
  sortKey,
  onSortChange,
  counts,
  onExportCsv,
  onExportJson,
}: PositionsFilterBarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global '/' keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement !== searchInputRef.current &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="p-3 sm:p-4 rounded-xl bg-[#0A1422] border border-[#1A2A3F] space-y-3 font-sans select-none shadow-sm">
      {/* Top Filter Row: Broker Source Isolation Strip */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-1 text-xs border-b border-[#122033]">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold text-[#52627A] flex items-center gap-1 mr-1">
            <Building2 className="h-3.5 w-3.5 text-[#19C5FF]" />
            <span>SOURCE:</span>
          </span>
          {[
            { id: "ALL", label: "ALL SOURCES" },
            { id: "PAPER_SIM", label: "PAPER SIM" },
            { id: "BINANCE", label: "BINANCE" },
            { id: "UPSTOX", label: "UPSTOX NSE" },
            { id: "DHAN", label: "DHAN" },
            { id: "DELTA_INDIA", label: "DELTA INDIA" },
            { id: "DERIBIT", label: "DERIBIT" },
          ].map((item) => {
            const isSelected = selectedBroker === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onBrokerChange(item.id as PositionBrokerFilter)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all whitespace-nowrap border ${
                  isSelected
                    ? "bg-[#2563EB] text-white border-[#2563EB] font-semibold shadow-sm"
                    : "text-[#7C8CA3] hover:text-[#F7FAFC] bg-[#0D1727] hover:bg-[#101B2D] border-[#1A2A3F] font-medium"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Filter Row: Search, Direction/PnL Filters, Sort, and Exports */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input & Category filter pills */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[280px]">
          {/* Search Input with Keyboard Shortcut Hint */}
          <div className="relative flex-1 max-w-xs">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#52627A]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search symbol, bot, broker... (/)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-[#0D1727] border border-[#1A2A3F] focus:border-[#2563EB] rounded-lg text-xs text-[#F7FAFC] placeholder-[#52627A] focus:outline-none transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#52627A] hover:text-[#F7FAFC] transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs py-0.5">
            {[
              { id: "ALL", label: "All", count: counts.all },
              { id: "LONG", label: "Long", count: counts.long },
              { id: "SHORT", label: "Short", count: counts.short },
              { id: "PROFIT", label: "Profit", count: counts.profit },
              { id: "LOSS", label: "Drawdown", count: counts.loss },
            ].map((item) => {
              const isSelected = selectedCategory === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onCategoryChange(item.id as PositionFilterCategory)}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap text-xs border ${
                    isSelected
                      ? "bg-[#2563EB] text-white border-[#2563EB] font-semibold shadow-sm"
                      : "text-[#7C8CA3] hover:text-[#F7FAFC] bg-[#0D1727] hover:bg-[#101B2D] border-[#1A2A3F] font-medium"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] tabular-nums ${
                      isSelected
                        ? "bg-white/20 text-white font-bold"
                        : "bg-[#101B2D] text-[#52627A]"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Sort Dropdown & Export Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0D1727] border border-[#1A2A3F] rounded-lg text-xs text-[#7C8CA3] shadow-sm">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#19C5FF]" />
            <span className="text-xs text-[#52627A] font-medium">Sort:</span>
            <select
              value={sortKey}
              onChange={(e) => onSortChange(e.target.value as PositionSortKey)}
              className="bg-transparent text-xs text-[#F7FAFC] font-medium focus:outline-none cursor-pointer"
            >
              <option value="pnl_desc" className="bg-[#0A1422] text-[#F7FAFC]">
                Highest P&L ($)
              </option>
              <option value="pnl_asc" className="bg-[#0A1422] text-[#F7FAFC]">
                Lowest P&L ($)
              </option>
              <option value="size_desc" className="bg-[#0A1422] text-[#F7FAFC]">
                Position Notional ($)
              </option>
              <option value="risk_desc" className="bg-[#0A1422] text-[#F7FAFC]">
                Planned Risk ($)
              </option>
              <option value="duration_desc" className="bg-[#0A1422] text-[#F7FAFC]">
                Duration (Oldest)
              </option>
              <option value="symbol_asc" className="bg-[#0A1422] text-[#F7FAFC]">
                Symbol Name (A-Z)
              </option>
            </select>
          </div>

          {/* Export Action Controls */}
          <div className="flex items-center rounded-lg bg-[#0D1727] border border-[#1A2A3F] p-0.5 text-xs shadow-sm">
            <button
              onClick={onExportCsv}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-[#7C8CA3] hover:text-[#F7FAFC] hover:bg-[#101B2D] transition flex items-center gap-1"
              title="Download CSV Position Ledger with Exact Sources"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#19C5FF]" />
              <span>CSV</span>
            </button>
            <button
              onClick={onExportJson}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-[#7C8CA3] hover:text-[#F7FAFC] hover:bg-[#101B2D] transition flex items-center gap-1"
              title="Download JSON Position Payload"
            >
              <FileCode className="h-3.5 w-3.5 text-[#19C5FF]" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
