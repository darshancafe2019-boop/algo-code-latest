"use client";

import React from "react";
import { Search, Download, ArrowUpDown, Filter } from "lucide-react";

export type PositionFilterCategory = "ALL" | "LONG" | "SHORT" | "PROFIT" | "LOSS";
export type PositionSortKey = "pnl_desc" | "pnl_asc" | "size_desc" | "duration_desc" | "symbol_asc";

interface PositionsFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: PositionFilterCategory;
  onCategoryChange: (cat: PositionFilterCategory) => void;
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
  sortKey,
  onSortChange,
  counts,
  onExportCsv,
  onExportJson,
}: PositionsFilterBarProps) {
  return (
    <div className="p-3 sm:p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md flex flex-wrap items-center justify-between gap-3 font-sans select-none">
      {/* Left: Search input & Category filter pills */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[280px]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" />
          <input
            type="text"
            placeholder="Search symbol, bot, strategy..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] rounded-xl text-xs text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] font-mono focus:outline-none focus:border-[var(--theme-accent)] transition"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-xs font-mono">
          {[
            { id: "ALL", label: "ALL", count: counts.all },
            { id: "LONG", label: "LONGS", count: counts.long },
            { id: "SHORT", label: "SHORTS", count: counts.short },
            { id: "PROFIT", label: "PROFIT", count: counts.profit },
            { id: "LOSS", label: "LOSS", count: counts.loss },
          ].map((item) => {
            const isSelected = selectedCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onCategoryChange(item.id as PositionFilterCategory)}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] shadow-sm"
                    : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-elevated)]"
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`px-1 rounded text-[10px] ${
                    isSelected
                      ? "bg-[var(--theme-bg)]/30 text-[var(--theme-bg)]"
                      : "bg-[var(--theme-elevated)] text-[var(--theme-text-muted)]"
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
      <div className="flex items-center gap-2">
        {/* Sort Selector */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] rounded-xl text-xs text-[var(--theme-text-secondary)] font-mono">
          <ArrowUpDown className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
          <span className="text-[11px] text-[var(--theme-text-muted)]">SORT:</span>
          <select
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as PositionSortKey)}
            className="bg-transparent text-xs text-[var(--theme-text-primary)] font-bold focus:outline-none cursor-pointer"
          >
            <option value="pnl_desc" className="bg-[var(--theme-surface)] text-[var(--theme-text-primary)]">
              Highest P&L
            </option>
            <option value="pnl_asc" className="bg-[var(--theme-surface)] text-[var(--theme-text-primary)]">
              Lowest P&L
            </option>
            <option value="size_desc" className="bg-[var(--theme-surface)] text-[var(--theme-text-primary)]">
              Position Size
            </option>
            <option value="duration_desc" className="bg-[var(--theme-surface)] text-[var(--theme-text-primary)]">
              Holding Duration
            </option>
            <option value="symbol_asc" className="bg-[var(--theme-surface)] text-[var(--theme-text-primary)]">
              Symbol Name
            </option>
          </select>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] p-0.5 text-xs font-mono">
          <button
            onClick={onExportCsv}
            className="px-2 py-1 rounded-lg text-[11px] font-bold text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)] transition flex items-center gap-1"
            title="Download CSV Position Ledger"
          >
            <Download className="h-3 w-3 text-[var(--theme-accent)]" />
            <span>CSV</span>
          </button>
          <button
            onClick={onExportJson}
            className="px-2 py-1 rounded-lg text-[11px] font-bold text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)] transition flex items-center gap-1"
            title="Download JSON Position Record"
          >
            <span>JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
}
