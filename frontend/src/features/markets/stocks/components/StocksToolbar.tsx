"use client";

import React from "react";
import { Search, Filter, SlidersHorizontal, RotateCcw, Globe, Bookmark } from "lucide-react";
import { useStocksStore } from "../state/stocks-store";
import { ColumnManager } from "./ColumnManager";
import { SavedScreens } from "./SavedScreens";

interface StocksToolbarProps {
  activeFilterCount: number;
}

export const StocksToolbar: React.FC<StocksToolbarProps> = ({ activeFilterCount }) => {
  const {
    filters,
    setFilters,
    resetFilters,
    isFilterDrawerOpen,
    setFilterDrawerOpen,
    isColumnManagerOpen,
    setColumnManagerOpen,
  } = useStocksStore();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: e.target.value, page: 1 });
  };

  const marketChips = [
    { label: "All Markets", country: undefined, exchange: "ALL" },
    { label: "India (NSE/BSE)", country: "INDIA", exchange: "ALL" },
    { label: "United States", country: "US", exchange: "ALL" },
    { label: "NSE", country: "INDIA", exchange: "NSE" },
    { label: "BSE", country: "INDIA", exchange: "BSE" },
    { label: "NASDAQ", country: "US", exchange: "NASDAQ" },
    { label: "NYSE", country: "US", exchange: "NYSE" },
  ];

  return (
    <div className="space-y-3">
      {/* Country / Market Chip Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {marketChips.map((chip) => {
          const isSelected =
            (chip.country === filters.country || (!chip.country && !filters.country)) &&
            (chip.exchange === filters.exchange || (chip.exchange === "ALL" && (!filters.exchange || filters.exchange === "ALL")));

          return (
            <button
              key={chip.label}
              onClick={() => setFilters({ country: chip.country, exchange: chip.exchange, page: 1 })}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Main Search & Control Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.search || ""}
            onChange={handleSearchChange}
            placeholder="Search stocks by symbol, company, or ISIN (e.g. RELIANCE, AAPL, TCS)..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-800/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Saved Screens Presets */}
          <SavedScreens />

          {/* Column Customizer Toggle */}
          <div className="relative">
            <button
              onClick={() => setColumnManagerOpen(!isColumnManagerOpen)}
              className="px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Columns</span>
            </button>
            {isColumnManagerOpen && <ColumnManager />}
          </div>

          {/* Filter Drawer Toggle */}
          <button
            onClick={() => setFilterDrawerOpen(!isFilterDrawerOpen)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition ${
              activeFilterCount > 0 || isFilterDrawerOpen
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                : "bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-cyan-400 text-slate-950">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Reset Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition"
              title="Reset All Filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
