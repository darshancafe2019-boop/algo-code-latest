"use client";

import React, { useMemo } from "react";
import {
  SlidersHorizontal,
  Columns,
  Search,
  Zap,
  Layers,
  Sparkles,
  ArrowUpDown,
  Filter,
  X,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { TerminalViewMode } from "@/types/option-terminal";

export interface ActiveFilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

interface OptionTerminalControlBarProps {
  strikeRange: number;
  onChangeStrikeRange: (range: number) => void;
  customStrikeFrom?: number | string;
  customStrikeTo?: number | string;
  onChangeCustomFrom?: (val: string) => void;
  onChangeCustomTo?: (val: string) => void;
  viewMode: TerminalViewMode;
  onChangeViewMode: (mode: TerminalViewMode) => void;
  onOpenColumnCustomizer: () => void;
  onOpenFilterModal: () => void;
  activeFilterCount: number;
  activeFilterChips?: ActiveFilterChip[];
  onClearAllFilters?: () => void;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  totalStrikesCount: number;
  displayedStrikesCount: number;
  oneClickMode?: boolean;
  onToggleOneClickMode?: () => void;
}

const STRIKE_RANGE_PRESETS = [
  { label: "ATM ±5", value: 10 },
  { label: "ATM ±10", value: 20 },
  { label: "ATM ±15", value: 30 },
  { label: "ATM ±25", value: 50 },
  { label: "ATM ±50", value: 100 },
  { label: "All", value: 999 },
];

export const OptionTerminalControlBar: React.FC<OptionTerminalControlBarProps> = ({
  strikeRange,
  onChangeStrikeRange,
  customStrikeFrom = "",
  customStrikeTo = "",
  onChangeCustomFrom,
  onChangeCustomTo,
  viewMode,
  onChangeViewMode,
  onOpenColumnCustomizer,
  onOpenFilterModal,
  activeFilterCount,
  activeFilterChips = [],
  onClearAllFilters,
  searchQuery,
  onChangeSearchQuery,
  totalStrikesCount,
  displayedStrikesCount,
  oneClickMode = false,
  onToggleOneClickMode,
}) => {
  // Check From <= To validation
  const strikeRangeValidationError = useMemo(() => {
    if (customStrikeFrom && customStrikeTo) {
      const fromVal = parseFloat(String(customStrikeFrom));
      const toVal = parseFloat(String(customStrikeTo));
      if (!isNaN(fromVal) && !isNaN(toVal) && fromVal > toVal) {
        return `Validation: From (${fromVal}) must be ≤ To (${toVal})`;
      }
    }
    return null;
  }, [customStrikeFrom, customStrikeTo]);

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-[#090E17] border border-slate-800/90 rounded-xl px-3 py-2.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs sm:text-sm">
        {/* Left: Strike Range Quick Toggles + Custom Range */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs sm:text-sm text-slate-400 uppercase font-bold mr-1">STRIKES:</span>
          {STRIKE_RANGE_PRESETS.map((preset) => {
            const isActive = strikeRange === preset.value && !customStrikeFrom && !customStrikeTo;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  onChangeStrikeRange(preset.value);
                  if (onChangeCustomFrom) onChangeCustomFrom("");
                  if (onChangeCustomTo) onChangeCustomTo("");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition border ${
                  isActive
                    ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm"
                    : "bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
                }`}
              >
                {preset.label}
              </button>
            );
          })}

          {/* Custom Range Inputs */}
          {onChangeCustomFrom && onChangeCustomTo && (
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-800 text-xs sm:text-sm flex-wrap">
              <span className="text-slate-400">From:</span>
              <input
                type="number"
                value={customStrikeFrom}
                onChange={(e) => onChangeCustomFrom(e.target.value)}
                placeholder="From"
                className={`w-20 sm:w-24 px-2 py-1 rounded bg-slate-900 border text-white font-mono text-xs sm:text-sm outline-none ${
                  strikeRangeValidationError ? "border-rose-500 text-rose-300" : "border-slate-700 focus:border-cyan-500"
                }`}
              />
              <span className="text-slate-400">To:</span>
              <input
                type="number"
                value={customStrikeTo}
                onChange={(e) => onChangeCustomTo(e.target.value)}
                placeholder="To"
                className={`w-20 sm:w-24 px-2 py-1 rounded bg-slate-900 border text-white font-mono text-xs sm:text-sm outline-none ${
                  strikeRangeValidationError ? "border-rose-500 text-rose-300" : "border-slate-700 focus:border-cyan-500"
                }`}
              />
              {(customStrikeFrom || customStrikeTo) && (
                <button
                  type="button"
                  onClick={() => {
                    onChangeCustomFrom("");
                    onChangeCustomTo("");
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
                  title="Clear Custom Range"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Center: Search Strike Filter */}
        <div className="relative flex items-center min-w-[160px] max-w-[240px]">
          <Search className="w-4 h-4 absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            placeholder="Search / Filter strike..."
            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onChangeSearchQuery("")}
              className="absolute right-2.5 text-slate-400 hover:text-white text-xs sm:text-sm font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right: View Mode Selector + Column Customizer + Filters Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1">
            {[
              { id: "STANDARD", label: "Standard" },
              { id: "GREEKS", label: "Greeks" },
              { id: "COMPACT", label: "Compact" },
              { id: "FULL", label: "Full Matrix" },
            ].map((mode) => {
              const isActive = viewMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onChangeViewMode(mode.id as TerminalViewMode)}
                  className={`px-2.5 py-1 rounded text-xs sm:text-sm font-bold transition ${
                    isActive
                      ? "bg-cyan-500 text-slate-950"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>

          {/* Columns Customization Button */}
          <button
            type="button"
            onClick={onOpenColumnCustomizer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold transition text-xs sm:text-sm"
          >
            <Columns className="w-4 h-4 text-cyan-400" />
            <span>Columns</span>
          </button>

          {/* Filter System Button with Badge */}
          <button
            type="button"
            onClick={onOpenFilterModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition text-xs sm:text-sm ${
              activeFilterCount > 0
                ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
            }`}
          >
            <Filter className="w-4 h-4 text-purple-400" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* One Click Trading Toggle Button */}
          {onToggleOneClickMode && (
            <button
              type="button"
              onClick={onToggleOneClickMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition text-xs sm:text-sm ${
                oneClickMode
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                  : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
              title={oneClickMode ? "One-Click Trading is ENABLED (Paper Mode Safety Active)" : "One-Click Trading is OFF (Standard Ticket Review)"}
            >
              <Zap className={`w-4 h-4 ${oneClickMode ? "text-amber-400 animate-pulse" : "text-slate-500"}`} />
              <span>ONE CLICK: {oneClickMode ? "ON" : "OFF"}</span>
            </button>
          )}

          {/* Strikes count indicator */}
          <span className="text-xs text-slate-400 pl-1 font-bold">
            {displayedStrikesCount} / {totalStrikesCount} strikes
          </span>
        </div>
      </div>

      {/* Validation Error Banner if From > To */}
      {strikeRangeValidationError && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{strikeRangeValidationError}</span>
        </div>
      )}

      {/* Active Filter Chips Bar */}
      {activeFilterChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap px-2 py-1 bg-slate-900/60 border border-slate-800/80 rounded-lg text-xs font-mono">
          <span className="text-slate-400 font-bold uppercase text-[11px] flex items-center gap-1">
            <Filter className="w-3 h-3 text-purple-400" />
            Active Filters ({activeFilterChips.length}):
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeFilterChips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/40 text-purple-200 font-semibold text-[11px]"
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="text-purple-300 hover:text-white font-black hover:bg-purple-500/30 rounded px-1 transition"
                  title={`Remove filter: ${chip.label}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          {onClearAllFilters && (
            <button
              type="button"
              onClick={onClearAllFilters}
              className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 font-bold text-[11px] transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};


