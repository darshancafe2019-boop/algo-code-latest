"use client";

import React, { useRef, useEffect } from "react";
import { Search, Download, ArrowUpDown, X, FileSpreadsheet, FileCode, Filter, Building2 } from "lucide-react";
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
    <div className="p-3 sm:p-4 rounded-3xl bg-[var(--theme-surface)]/90 backdrop-blur-md border border-[var(--theme-border)] shadow-md space-y-3 font-sans select-none">
      {/* Top Filter Row: Broker Source Isolation Strip */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-1 text-xs font-mono border-b border-[var(--theme-border-subtle)]/60">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] uppercase font-bold text-[var(--theme-text-muted)] flex items-center gap-1 mr-1">
            <Building2 className="h-3 w-3 text-[var(--theme-accent)]" />
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
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] shadow-sm font-black"
                    : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)]"
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
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search symbol, bot, source... (/)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] focus:border-[var(--theme-accent)] rounded-xl text-xs text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] font-mono focus:outline-none transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs font-mono py-0.5">
            {[
              { id: "ALL", label: "ALL", count: counts.all },
              { id: "LONG", label: "LONGS", count: counts.long },
              { id: "SHORT", label: "SHORTS", count: counts.short },
              { id: "PROFIT", label: "IN PROFIT", count: counts.profit },
              { id: "LOSS", label: "IN DRAWDOWN", count: counts.loss },
            ].map((item) => {
              const isSelected = selectedCategory === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onCategoryChange(item.id as PositionFilterCategory)}
                  className={`px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap text-[11px] shadow-sm ${
                    isSelected
                      ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] shadow-md shadow-[var(--theme-accent)]/20"
                      : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)]"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                      isSelected
                        ? "bg-[var(--theme-bg)]/30 text-[var(--theme-bg)] font-extrabold"
                        : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)]"
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
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] rounded-xl text-xs text-[var(--theme-text-secondary)] font-mono shadow-sm">
            <ArrowUpDown className="h-3 w-3 text-[var(--theme-accent)]" />
            <span className="text-[10px] text-[var(--theme-text-muted)]">SORT:</span>
            <select
              value={sortKey}
              onChange={(e) => onSortChange(e.target.value as PositionSortKey)}
              className="bg-transparent text-xs text-[var(--theme-text-primary)] font-bold focus:outline-none cursor-pointer"
            >
              <option value="pnl_desc" className="bg-[var(--theme-surface)] text-[var(--theme-text-primary)]">
                Highest P&L ($)
              </option>
              <option value="pnl_asc" className="bg-[var(--theme-surface)] text-[var(--theme-text-primary)]">
                Lowest P&L ($)
              </option>
              <option value="size_desc" className="bg-[var(--theme-surface)] text-[var(--theme-text-primary)]">
                Position Notional ($)
              </option>
              <option value="risk_desc" className="bg-[var(--theme-surface)] text-[var(--theme-text-primary)]">
                Planned Risk ($)
              </option>
              <option value="duration_desc" className="bg-[var(--theme-surface)] text-[var(--theme-text-primary)]">
                Duration (Oldest)
              </option>
              <option value="symbol_asc" className="bg-[var(--theme-surface)] text-[var(--theme-text-primary)]">
                Symbol Name (A-Z)
              </option>
            </select>
          </div>

          {/* Export Action Controls */}
          <div className="flex items-center rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] p-0.5 text-xs font-mono shadow-sm">
            <button
              onClick={onExportCsv}
              className="px-2 py-1 rounded-lg text-[10px] font-bold text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)] transition flex items-center gap-1"
              title="Download CSV Position Ledger with Exact Sources"
            >
              <FileSpreadsheet className="h-3 w-3 text-[var(--theme-accent)]" />
              <span>CSV</span>
            </button>
            <button
              onClick={onExportJson}
              className="px-2 py-1 rounded-lg text-[10px] font-bold text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)] transition flex items-center gap-1"
              title="Download JSON Position Payload"
            >
              <FileCode className="h-3 w-3 text-[var(--theme-accent)]" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
