"use client";

import React, { useState } from "react";
import {
  Filter,
  RotateCcw,
  X,
  Flame,
  Sparkles,
  DollarSign,
  TrendingUp,
  Activity,
  Layers,
  Percent,
  Sliders,
} from "lucide-react";
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
  maxVolume: undefined,
  highVolumeOnly: false,
  minOI: 0,
  maxOI: undefined,
  minOIChange: undefined,
  maxOIChange: undefined,
  minOIChangePct: undefined,
  maxOIChangePct: undefined,
  highOIOnly: false,
  highOIChangeOnly: false,
  minLtp: undefined,
  maxLtp: undefined,
  minChangePct: undefined,
  maxChangePct: undefined,
  minBid: undefined,
  maxBid: undefined,
  minAsk: undefined,
  maxAsk: undefined,
  minIV: undefined,
  maxIV: undefined,
  highIVOnly: false,
  minDelta: undefined,
  maxDelta: undefined,
  minGamma: undefined,
  maxGamma: undefined,
  minTheta: undefined,
  maxTheta: undefined,
  minVega: undefined,
  maxVega: undefined,
  minSpread: undefined,
  maxSpread: undefined,
  maxSpreadPct: undefined,
  marketDirection: "ALL",
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
  const [activeCategory, setActiveCategory] = useState<
    "BASIC" | "PRICE" | "OI_VOL" | "VOLATILITY_GREEKS" | "STRUCTURE"
  >("BASIC");

  if (!isOpen) return null;

  const updateFilter = <K extends keyof OptionFilterConfig>(
    key: K,
    value: OptionFilterConfig[K]
  ) => {
    onChangeFilters({ ...filters, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs">
      <div className="bg-[#0B1222] border border-slate-700/80 rounded-2xl p-5 max-w-2xl w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Filter className="w-4 h-4 text-purple-400" />
            <span>Advanced Option Chain Filters</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Navigation Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 flex-wrap flex-shrink-0">
          {[
            { id: "BASIC", label: "Basic & Direction", icon: Layers },
            { id: "PRICE", label: "Price & Spreads", icon: DollarSign },
            { id: "OI_VOL", label: "OI & Volume", icon: Activity },
            { id: "VOLATILITY_GREEKS", label: "IV & Greeks", icon: Percent },
            { id: "STRUCTURE", label: "OI Structure & Flow", icon: Sparkles },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                  isActive
                    ? "bg-purple-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Body with dynamic categories */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* TAB 1: BASIC & DIRECTION */}
          {activeCategory === "BASIC" && (
            <div className="space-y-4">
              {/* Option Side Filter */}
              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[10px] font-bold">
                  Option Contract Type:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "ALL", label: "Calls & Puts (CE & PE)" },
                    { id: "CALLS_ONLY", label: "Calls Only (CE)" },
                    { id: "PUTS_ONLY", label: "Puts Only (PE)" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateFilter("side", item.id as any)}
                      className={`py-2 px-2.5 rounded-xl font-bold text-center border transition ${
                        filters.side === item.id
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Moneyness Filter */}
              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[10px] font-bold">
                  Moneyness Status:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "ALL", label: "All Strikes" },
                    { id: "ATM_ONLY", label: "ATM Only" },
                    { id: "ITM_ONLY", label: "ITM Only" },
                    { id: "OTM_ONLY", label: "OTM Only" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateFilter("moneyness", item.id as any)}
                      className={`py-2 px-2 rounded-xl font-bold text-center border transition ${
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

              {/* Market Direction Filter */}
              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[10px] font-bold">
                  Price Change Direction:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "ALL", label: "All Changes" },
                    { id: "POSITIVE", label: "Gainers (+ Change)" },
                    { id: "NEGATIVE", label: "Losers (- Change)" },
                    { id: "UNCHANGED", label: "Unchanged (0%)" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateFilter("marketDirection", item.id as any)}
                      className={`py-2 px-2 rounded-xl font-bold text-center border transition ${
                        filters.marketDirection === item.id
                          ? item.id === "POSITIVE"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                            : item.id === "NEGATIVE"
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                            : "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRICE & SPREADS */}
          {activeCategory === "PRICE" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Min LTP:
                  </label>
                  <input
                    type="number"
                    value={filters.minLtp !== undefined ? filters.minLtp : ""}
                    onChange={(e) =>
                      updateFilter(
                        "minLtp",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 50"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Max LTP:
                  </label>
                  <input
                    type="number"
                    value={filters.maxLtp !== undefined ? filters.maxLtp : ""}
                    onChange={(e) =>
                      updateFilter(
                        "maxLtp",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 500"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Min Change %:
                  </label>
                  <input
                    type="number"
                    value={filters.minChangePct !== undefined ? filters.minChangePct : ""}
                    onChange={(e) =>
                      updateFilter(
                        "minChangePct",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. -20"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Max Change %:
                  </label>
                  <input
                    type="number"
                    value={filters.maxChangePct !== undefined ? filters.maxChangePct : ""}
                    onChange={(e) =>
                      updateFilter(
                        "maxChangePct",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 100"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Min Bid Price:
                  </label>
                  <input
                    type="number"
                    value={filters.minBid !== undefined ? filters.minBid : ""}
                    onChange={(e) =>
                      updateFilter(
                        "minBid",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 10"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Max Ask Price:
                  </label>
                  <input
                    type="number"
                    value={filters.maxAsk !== undefined ? filters.maxAsk : ""}
                    onChange={(e) =>
                      updateFilter(
                        "maxAsk",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 400"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Max Bid/Ask Spread (Points):
                  </label>
                  <input
                    type="number"
                    value={filters.maxSpread !== undefined ? filters.maxSpread : ""}
                    onChange={(e) =>
                      updateFilter(
                        "maxSpread",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 2.0"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Max Spread %:
                  </label>
                  <input
                    type="number"
                    value={filters.maxSpreadPct !== undefined ? filters.maxSpreadPct : ""}
                    onChange={(e) =>
                      updateFilter(
                        "maxSpreadPct",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 5 (%)"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OI & VOLUME */}
          {activeCategory === "OI_VOL" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Min Open Interest (OI):
                  </label>
                  <input
                    type="number"
                    value={filters.minOI || ""}
                    onChange={(e) =>
                      updateFilter("minOI", parseFloat(e.target.value) || 0)
                    }
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Max Open Interest:
                  </label>
                  <input
                    type="number"
                    value={filters.maxOI !== undefined ? filters.maxOI : ""}
                    onChange={(e) =>
                      updateFilter(
                        "maxOI",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 5000000"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Min Contract Volume:
                  </label>
                  <input
                    type="number"
                    value={filters.minVolume || ""}
                    onChange={(e) =>
                      updateFilter("minVolume", parseFloat(e.target.value) || 0)
                    }
                    placeholder="e.g. 10000"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Max Volume:
                  </label>
                  <input
                    type="number"
                    value={filters.maxVolume !== undefined ? filters.maxVolume : ""}
                    onChange={(e) =>
                      updateFilter(
                        "maxVolume",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 2000000"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Min Absolute OI Change (ΔOI):
                  </label>
                  <input
                    type="number"
                    value={filters.minOIChange !== undefined ? filters.minOIChange : ""}
                    onChange={(e) =>
                      updateFilter(
                        "minOIChange",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 10000"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Min ΔOI Percentage (%):
                  </label>
                  <input
                    type="number"
                    value={filters.minOIChangePct !== undefined ? filters.minOIChangePct : ""}
                    onChange={(e) =>
                      updateFilter(
                        "minOIChangePct",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 15 (%)"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Quick High Volume & High OI Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => updateFilter("highOIOnly", !filters.highOIOnly)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    filters.highOIOnly
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-bold">Top OI Concentrations</div>
                  <div className="text-[10px] text-slate-500">Above 75th percentile</div>
                </button>
                <button
                  type="button"
                  onClick={() => updateFilter("highVolumeOnly", !filters.highVolumeOnly)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    filters.highVolumeOnly
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-bold">High Volume Spikes</div>
                  <div className="text-[10px] text-slate-500">Above 75th percentile</div>
                </button>
                <button
                  type="button"
                  onClick={() => updateFilter("highOIChangeOnly", !filters.highOIChangeOnly)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    filters.highOIChangeOnly
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-bold">High ΔOI Activity</div>
                  <div className="text-[10px] text-slate-500">Significant shifts</div>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: VOLATILITY & GREEKS */}
          {activeCategory === "VOLATILITY_GREEKS" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Min Implied Volatility (IV%):
                  </label>
                  <input
                    type="number"
                    value={filters.minIV !== undefined ? filters.minIV : ""}
                    onChange={(e) =>
                      updateFilter(
                        "minIV",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 15"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Max Implied Volatility (IV%):
                  </label>
                  <input
                    type="number"
                    value={filters.maxIV !== undefined ? filters.maxIV : ""}
                    onChange={(e) =>
                      updateFilter(
                        "maxIV",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 50"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Min Delta (Δ):
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={filters.minDelta !== undefined ? filters.minDelta : ""}
                    onChange={(e) =>
                      updateFilter(
                        "minDelta",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 0.3"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Max Delta (Δ):
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={filters.maxDelta !== undefined ? filters.maxDelta : ""}
                    onChange={(e) =>
                      updateFilter(
                        "maxDelta",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 0.8"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Min Theta (Θ Daily Decay):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={filters.minTheta !== undefined ? filters.minTheta : ""}
                    onChange={(e) =>
                      updateFilter(
                        "minTheta",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. -15"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Max Theta (Θ):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={filters.maxTheta !== undefined ? filters.maxTheta : ""}
                    onChange={(e) =>
                      updateFilter(
                        "maxTheta",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 0"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Min Vega (ν):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={filters.minVega !== undefined ? filters.minVega : ""}
                    onChange={(e) =>
                      updateFilter(
                        "minVega",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 5"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">
                    Max Vega (ν):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={filters.maxVega !== undefined ? filters.maxVega : ""}
                    onChange={(e) =>
                      updateFilter(
                        "maxVega",
                        e.target.value !== "" ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="e.g. 30"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: STRUCTURE & FLOW */}
          {activeCategory === "STRUCTURE" && (
            <div className="space-y-4">
              {/* Open Interest Buildup Matrix */}
              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[10px] font-bold">
                  OI Market Structure Candidate:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "ALL", label: "All Structures" },
                    { id: "LONG_BUILDUP", label: "Long Buildup (P↑ OI↑)" },
                    { id: "SHORT_BUILDUP", label: "Short Buildup (P↓ OI↑)" },
                    { id: "LONG_UNWINDING", label: "Long Unwinding (P↓ OI↓)" },
                    { id: "SHORT_COVERING", label: "Short Covering (P↑ OI↓)" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateFilter("buildup", item.id as any)}
                      className={`py-2 px-2 rounded-xl font-bold text-left border transition text-[11px] ${
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
                <label className="text-slate-400 uppercase text-[10px] font-bold">
                  Order Flow Sentiment:
                </label>
                <div className="grid grid-cols-4 gap-2">
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
                      className={`py-2 px-2 rounded-xl font-bold text-center border transition ${
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
                    <div className="text-[10px] text-slate-500">
                      Filters trades with Vol/OI &gt; 3.0x or high premium sweeps
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateFilter("unusualOnly", !filters.unusualOnly)}
                  className={`w-10 h-6 rounded-full transition p-0.5 flex items-center ${
                    filters.unusualOnly
                      ? "bg-orange-500 justify-end"
                      : "bg-slate-700 justify-start"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 flex-shrink-0">
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition text-xs font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black transition text-xs shadow-md shadow-cyan-500/20"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

