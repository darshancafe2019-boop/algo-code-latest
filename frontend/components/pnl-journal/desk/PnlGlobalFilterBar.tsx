"use client";

import React from "react";
import {
  Search,
  Filter,
  Calendar,
  Layers,
  Activity,
  Briefcase,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { PnlFilterState, BrokerType, ExecutionMode, AssetClass } from "@/types/pnl-journal";

interface PnlGlobalFilterBarProps {
  filters: PnlFilterState;
  onFilterChange: (updates: Partial<PnlFilterState>) => void;
  onResetFilters: () => void;
  availableStrategies?: string[];
}

const TIME_PRESETS = [
  { id: "TODAY", label: "Today" },
  { id: "7D", label: "7D" },
  { id: "30D", label: "30D" },
  { id: "THIS_MONTH", label: "This Month" },
  { id: "LAST_MONTH", label: "Last Month" },
  { id: "3M", label: "3M" },
  { id: "YTD", label: "YTD" },
  { id: "ALL", label: "All Time" },
];

const BROKER_OPTIONS: { id: BrokerType; label: string }[] = [
  { id: "ALL", label: "All Brokers" },
  { id: "DHAN", label: "Dhan" },
  { id: "DELTA", label: "Delta India/Crypto" },
  { id: "UPSTOX", label: "Upstox" },
  { id: "ZERODHA", label: "Zerodha" },
  { id: "BINANCE", label: "Binance" },
  { id: "PAPER", label: "Paper Sim" },
];

const MODE_OPTIONS: { id: ExecutionMode; label: string }[] = [
  { id: "ALL", label: "All Modes" },
  { id: "LIVE", label: "Live Only" },
  { id: "PAPER", label: "Paper Only" },
  { id: "BACKTEST", label: "Backtest" },
];

const ASSET_OPTIONS: { id: AssetClass; label: string }[] = [
  { id: "ALL", label: "All Assets" },
  { id: "OPTIONS", label: "Options" },
  { id: "FUTURES", label: "Futures" },
  { id: "EQUITY", label: "Equity" },
  { id: "CRYPTO", label: "Crypto" },
  { id: "COMMODITY", label: "Commodity" },
];

export const PnlGlobalFilterBar: React.FC<PnlGlobalFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  availableStrategies = [],
}) => {
  const isFiltered =
    filters.broker !== "ALL" ||
    filters.mode !== "ALL" ||
    filters.assetClass !== "ALL" ||
    filters.strategy !== "ALL" ||
    filters.direction !== "ALL" ||
    filters.period !== "ALL" ||
    Boolean(filters.searchQuery);

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3 shadow-lg flex flex-col gap-3">
      {/* Top row: Time Presets & Search */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Time Preset Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
          <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
          {TIME_PRESETS.map((preset) => {
            const isSelected = filters.period === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onFilterChange({ period: preset.id as any })}
                className={`px-2.5 py-1 rounded text-xs font-medium font-mono transition-all shrink-0 ${
                  isSelected
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-950/40"
                    : "bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Search Query Input */}
        <div className="relative min-w-[220px] max-w-[320px] w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search symbol, strike, strategy..."
            value={filters.searchQuery || ""}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-100 placeholder-slate-500 font-sans focus:outline-none"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onFilterChange({ searchQuery: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom row: Dropdowns */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60">
        {/* Broker Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
          <Briefcase className="w-3 h-3 text-cyan-400" />
          <select
            value={filters.broker}
            onChange={(e) => onFilterChange({ broker: e.target.value as BrokerType })}
            className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
          >
            {BROKER_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-slate-900 text-slate-200">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
          <Activity className="w-3 h-3 text-emerald-400" />
          <select
            value={filters.mode}
            onChange={(e) => onFilterChange({ mode: e.target.value as ExecutionMode })}
            className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
          >
            {MODE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-slate-900 text-slate-200">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Asset Class Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
          <Layers className="w-3 h-3 text-indigo-400" />
          <select
            value={filters.assetClass}
            onChange={(e) => onFilterChange({ assetClass: e.target.value as AssetClass })}
            className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
          >
            {ASSET_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-slate-900 text-slate-200">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Strategy Selector */}
        {availableStrategies.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
            <SlidersHorizontal className="w-3 h-3 text-amber-400" />
            <select
              value={filters.strategy}
              onChange={(e) => onFilterChange({ strategy: e.target.value })}
              className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">All Strategies</option>
              {availableStrategies.map((s) => (
                <option key={s} value={s} className="bg-slate-900 text-slate-200">
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Direction Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
          <select
            value={filters.direction}
            onChange={(e) => onFilterChange({ direction: e.target.value as any })}
            className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900 text-slate-200">All Sides</option>
            <option value="BUY" className="bg-slate-900 text-slate-200">Long (BUY)</option>
            <option value="SELL" className="bg-slate-900 text-slate-200">Short (SELL)</option>
          </select>
        </div>

        {/* Reset Filters */}
        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1 px-2 py-1 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 rounded text-xs font-mono transition-colors ml-auto"
          >
            <X className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
};
