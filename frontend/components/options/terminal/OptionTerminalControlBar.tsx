"use client";

import React from "react";
import {
  SlidersHorizontal,
  Columns,
  Search,
  Zap,
  Layers,
  Sparkles,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { TerminalViewMode } from "@/types/option-terminal";

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
  searchQuery,
  onChangeSearchQuery,
  totalStrikesCount,
  displayedStrikesCount,
  oneClickMode = false,
  onToggleOneClickMode,
}) => {
  return (
    <div className="bg-[#090E17] border border-slate-800/90 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2.5 font-mono text-xs">
      {/* Left: Strike Range Quick Toggles + Custom Range */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">STRIKES:</span>
        {STRIKE_RANGE_PRESETS.map((preset) => {
          const isActive = strikeRange === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChangeStrikeRange(preset.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
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
          <div className="hidden xl:flex items-center gap-1 ml-2 pl-2 border-l border-slate-800 text-[11px]">
            <span className="text-slate-400">From:</span>
            <input
              type="number"
              value={customStrikeFrom}
              onChange={(e) => onChangeCustomFrom(e.target.value)}
              placeholder="e.g. 24500"
              className="w-20 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
            />
            <span className="text-slate-400">To:</span>
            <input
              type="number"
              value={customStrikeTo}
              onChange={(e) => onChangeCustomTo(e.target.value)}
              placeholder="e.g. 26000"
              className="w-20 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
            />
          </div>
        )}
      </div>

      {/* Center: Search Strike Filter */}
      <div className="relative flex items-center min-w-[140px] max-w-[200px]">
        <Search className="w-3.5 h-3.5 absolute left-2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onChangeSearchQuery(e.target.value)}
          placeholder="Filter strike..."
          className="w-full pl-7 pr-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 font-mono"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onChangeSearchQuery("")}
            className="absolute right-2 text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Right: View Mode Selector + Column Customizer + Filters Button */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* View Mode */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
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
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
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
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold transition text-xs"
        >
          <Columns className="w-3.5 h-3.5 text-cyan-400" />
          <span>Columns</span>
        </button>

        {/* Filter System Button with Badge */}
        <button
          type="button"
          onClick={onOpenFilterModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold transition text-xs ${
            activeFilterCount > 0
              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
              : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
          }`}
        >
          <Filter className="w-3.5 h-3.5 text-purple-400" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-purple-500 text-white text-[9px]">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* One Click Trading Toggle Button */}
        {onToggleOneClickMode && (
          <button
            type="button"
            onClick={onToggleOneClickMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold transition text-xs ${
              oneClickMode
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
            title={oneClickMode ? "One-Click Trading is ENABLED" : "One-Click Trading is OFF (Standard Ticket Review)"}
          >
            <Zap className={`w-3.5 h-3.5 ${oneClickMode ? "text-amber-400 animate-pulse" : "text-slate-500"}`} />
            <span>ONE CLICK: {oneClickMode ? "ON" : "OFF"}</span>
          </button>
        )}

        {/* Strikes count indicator */}
        <span className="text-[10px] text-slate-400 pl-1">
          {displayedStrikesCount} / {totalStrikesCount} strikes
        </span>
      </div>
    </div>
  );
};

