"use client";

import React from "react";
import { Filter, RotateCcw, X, Flame, Sparkles } from "lucide-react";
import { OptionFilterConfig } from "@/types/option-terminal";

interface OptionFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: OptionFilterConfig;
  onChangeFilters: (newFilters: OptionFilterConfig) => void;
  onResetFilters: () => void;
}

export const DEFAULT_FILTER_CONFIG: OptionFilterConfig = {
  side: "ALL",
  moneyness: "ALL",
  buildup: "ALL",
  minVolume: 0,
  minOI: 0,
  unusualOnly: false,
  sentiment: "ALL",
  minPremium: 0,
};

export const OptionFilterModal: React.FC<OptionFilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  onChangeFilters,
  onResetFilters,
}) => {
  if (!isOpen) return null;

  const updateFilter = <K extends keyof OptionFilterConfig>(key: K, value: OptionFilterConfig[K]) => {
    onChangeFilters({ ...filters, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs">
      <div className="bg-[#0B1222] border border-slate-700/80 rounded-2xl p-5 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Filter className="w-4 h-4 text-purple-400" />
            <span>Instant Market & Flow Filters</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Moneyness Filter */}
          <div className="space-y-1.5">
            <label className="text-slate-400 uppercase text-[10px] font-bold">Moneyness Filter:</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: "ALL", label: "All Strikes" },
                { id: "ITM_ONLY", label: "ITM Only" },
                { id: "ATM_ONLY", label: "ATM Only" },
                { id: "OTM_ONLY", label: "OTM Only" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => updateFilter("moneyness", item.id as any)}
                  className={`py-1.5 px-2 rounded-lg font-bold text-center border transition ${
                    filters.moneyness === item.id
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Open Interest Buildup Matrix */}
          <div className="space-y-1.5">
            <label className="text-slate-400 uppercase text-[10px] font-bold">OI Buildup Classification:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {[
                { id: "ALL", label: "All Buildups" },
                { id: "LONG_BUILDUP", label: "Long Buildup (P↑ OI↑)" },
                { id: "SHORT_BUILDUP", label: "Short Buildup (P↓ OI↑)" },
                { id: "LONG_UNWINDING", label: "Long Unwinding (P↓ OI↓)" },
                { id: "SHORT_COVERING", label: "Short Covering (P↑ OI↓)" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => updateFilter("buildup", item.id as any)}
                  className={`py-1.5 px-2 rounded-lg font-bold text-left border transition text-[11px] ${
                    filters.buildup === item.id
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/50"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options Flow Sentiment Filter */}
          <div className="space-y-1.5">
            <label className="text-slate-400 uppercase text-[10px] font-bold">Flow Sentiment Filter:</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: "ALL", label: "All Sentiment" },
                { id: "BULLISH", label: "Bullish Flow" },
                { id: "BEARISH", label: "Bearish Flow" },
                { id: "NEUTRAL", label: "Neutral Flow" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => updateFilter("sentiment", item.id as any)}
                  className={`py-1.5 px-2 rounded-lg font-bold text-center border transition ${
                    filters.sentiment === item.id
                      ? item.id === "BULLISH"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                        : item.id === "BEARISH"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                        : "bg-slate-700 text-white border-slate-600"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Unusual Activity Toggle */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <div>
                <div className="font-bold text-white">Unusual Options Activity Only</div>
                <div className="text-[10px] text-slate-500">Filters trades with Vol/OI &gt; 3.0x or high premium sweeps</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateFilter("unusualOnly", !filters.unusualOnly)}
              className={`w-10 h-6 rounded-full transition p-0.5 flex items-center ${
                filters.unusualOnly ? "bg-orange-500 justify-end" : "bg-slate-700 justify-start"
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Minimum Volume & Minimum OI Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-400 text-[10px] uppercase font-bold">Min Contract Volume:</label>
              <input
                type="number"
                value={filters.minVolume || ""}
                onChange={(e) => updateFilter("minVolume", parseFloat(e.target.value) || 0)}
                placeholder="e.g. 5000"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 text-[10px] uppercase font-bold">Min Open Interest (OI):</label>
              <input
                type="number"
                value={filters.minOI || ""}
                onChange={(e) => updateFilter("minOI", parseFloat(e.target.value) || 0)}
                placeholder="e.g. 10000"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition text-xs shadow-md shadow-cyan-500/20"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
