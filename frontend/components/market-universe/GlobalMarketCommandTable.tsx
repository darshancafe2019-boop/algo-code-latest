"use client";

import React, { useState, useEffect } from "react";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Layers,
  Zap,
  Sliders,
  Sparkles,
  LineChart,
  ArrowUpDown,
  ExternalLink
} from "lucide-react";
import { MarketInstrument } from "@/types/market-universe";

interface GlobalMarketCommandTableProps {
  instruments: MarketInstrument[];
  selectedInstrument: MarketInstrument | null;
  onSelectInstrument: (inst: MarketInstrument) => void;
  onOpenOptions?: (symbol: string) => void;
  onOpenFutures?: (symbol: string) => void;
  onOpenAnalysis: (inst: MarketInstrument) => void;
  onToggleWatchlist: (inst: MarketInstrument) => void;
  watchlistSymbols: Set<string>;
}

export function GlobalMarketCommandTable({
  instruments = [],
  selectedInstrument,
  onSelectInstrument,
  onOpenOptions,
  onOpenFutures,
  onOpenAnalysis,
  onToggleWatchlist,
  watchlistSymbols,
}: GlobalMarketCommandTableProps) {
  const defaultCols = {
    symbol: true,
    price: true,
    change: true,
    volume: true,
    regime: true,
    momentum: true,
    dataQuality: true,
    actions: true,
  };

  const [visibleCols, setVisibleCols] = useState(defaultCols);
  const [showColPicker, setShowColPicker] = useState(false);
  const [sortField, setSortField] = useState<string>("change_24h");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("markets_table_cols_v3");
      if (saved) setVisibleCols(JSON.parse(saved));
    } catch {}
  }, []);

  const toggleCol = (k: keyof typeof defaultCols) => {
    const updated = { ...visibleCols, [k]: !visibleCols[k] };
    setVisibleCols(updated);
    try {
      localStorage.setItem("markets_table_cols_v3", JSON.stringify(updated));
    } catch {}
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedInstruments = [...instruments].sort((a: any, b: any) => {
    const valA = a[sortField] !== undefined ? a[sortField] : 0;
    const valB = b[sortField] !== undefined ? b[sortField] : 0;
    if (typeof valA === "string") {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? valA - valB : valB - valA;
  });

  return (
    <div className="space-y-3 font-sans select-none">
      {/* Table Toolbar */}
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400">
          Showing <strong>{sortedInstruments.length}</strong> active instruments in canonical registry
        </span>

        <div className="relative">
          <button
            onClick={() => setShowColPicker(!showColPicker)}
            className="px-3 py-1 rounded-xl bg-[#0B131E] border border-[#1E293B] hover:border-cyan-700 text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Customize Columns</span>
          </button>

          {showColPicker && (
            <div className="absolute right-0 mt-2 w-48 bg-[#0B131E] border border-[#1E293B] rounded-xl p-3 shadow-2xl z-30 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block border-b border-[#1E293B] pb-1">
                Visible Columns
              </span>
              <div className="space-y-1.5 text-[11px]">
                {Object.keys(defaultCols).map((k) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={visibleCols[k as keyof typeof defaultCols]}
                      onChange={() => toggleCol(k as keyof typeof defaultCols)}
                      className="accent-cyan-500 rounded"
                    />
                    <span className="capitalize">{k}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Market Table */}
      <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#070D14] text-slate-400 text-[10px] uppercase tracking-wider border-b border-[#1E293B]">
              <tr>
                <th className="py-3 px-3 w-8"></th>
                {visibleCols.symbol && (
                  <th className="py-3 px-3 cursor-pointer hover:text-cyan-300" onClick={() => handleSort("canonical_symbol")}>
                    <div className="flex items-center gap-1">
                      <span>Symbol / Exchange</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                )}
                {visibleCols.price && (
                  <th className="py-3 px-3 text-right cursor-pointer hover:text-cyan-300" onClick={() => handleSort("last_price")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Last Price</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                )}
                {visibleCols.change && (
                  <th className="py-3 px-3 text-right cursor-pointer hover:text-cyan-300" onClick={() => handleSort("change_24h")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>24H Change</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                )}
                {visibleCols.volume && (
                  <th className="py-3 px-3 text-right cursor-pointer hover:text-cyan-300" onClick={() => handleSort("volume_24h")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>24H Volume</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                )}
                {visibleCols.regime && (
                  <th className="py-3 px-3 text-center cursor-pointer hover:text-cyan-300" onClick={() => handleSort("directional_bias")}>
                    <div className="flex items-center justify-center gap-1">
                      <span>Regime</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                )}
                {visibleCols.momentum && (
                  <th className="py-3 px-3 text-center cursor-pointer hover:text-cyan-300" onClick={() => handleSort("momentum_score")}>
                    <div className="flex items-center justify-center gap-1">
                      <span>Momentum</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                )}
                {visibleCols.dataQuality && <th className="py-3 px-3 text-center">Feed Health</th>}
                {visibleCols.actions && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-slate-200">
              {sortedInstruments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-500">
                    No instruments match the active search or category filter.
                  </td>
                </tr>
              ) : (
                sortedInstruments.map((inst, idx) => {
                  const sym = inst.canonical_symbol || inst.provider_symbol || inst.symbol || "UNKNOWN";
                  const isWatched = watchlistSymbols.has(sym) || watchlistSymbols.has(inst.instrument_id);
                  const isPositive = (inst.change_24h || 0) >= 0;
                  const hasPrice = inst.last_price !== undefined && inst.last_price !== null && inst.last_price > 0;
                  const currSymbol = inst.currency === "INR" ? "₹" : "$";
                  const isSelected = selectedInstrument?.instrument_id === inst.instrument_id;

                  return (
                    <tr
                      key={inst.instrument_id || sym || idx}
                      onClick={() => onSelectInstrument(inst)}
                      className={`transition-colors cursor-pointer group ${
                        isSelected ? "bg-[#0F2238] border-l-2 border-cyan-400" : "hover:bg-[#070D14]"
                      }`}
                    >
                      {/* Watchlist Star */}
                      <td className="py-3 px-3 w-8" onClick={(e) => { e.stopPropagation(); onToggleWatchlist(inst); }}>
                        <Star
                          className={`h-4 w-4 transition-colors ${
                            isWatched ? "text-amber-400 fill-amber-400" : "text-slate-600 hover:text-amber-400"
                          }`}
                        />
                      </td>

                      {/* Symbol / Exchange */}
                      {visibleCols.symbol && (
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                              {sym}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-[#070D14] text-cyan-300 text-[9px] font-bold border border-[#1E293B]">
                              {inst.exchange || "GLOBAL"}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 truncate block max-w-[160px] font-sans">
                            {inst.company_name || inst.asset_class}
                          </span>
                        </td>
                      )}

                      {/* Price (Quote) */}
                      {visibleCols.price && (
                        <td className="py-3 px-3 text-right font-bold text-slate-100">
                          {hasPrice ? (
                            <span>{currSymbol}{inst.last_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                          ) : (
                            <span className="text-slate-500 font-normal" title="Provider quote unavailable">—</span>
                          )}
                        </td>
                      )}

                      {/* 24H Change */}
                      {visibleCols.change && (
                        <td className="py-3 px-3 text-right font-bold">
                          {inst.change_24h !== undefined ? (
                            <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                              {isPositive ? "+" : ""}{inst.change_24h.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      )}

                      {/* Volume */}
                      {visibleCols.volume && (
                        <td className="py-3 px-3 text-right text-slate-300">
                          {inst.volume_24h ? (
                            <span>
                              {currSymbol}
                              {inst.volume_24h > 1e6
                                ? `${(inst.volume_24h / 1e6).toFixed(2)}M`
                                : inst.volume_24h.toLocaleString()}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      )}

                      {/* Regime */}
                      {visibleCols.regime && (
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inst.directional_bias === "BULLISH"
                                ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
                                : inst.directional_bias === "BEARISH"
                                ? "bg-rose-950/60 border border-rose-800 text-rose-300"
                                : "bg-slate-900 border border-slate-800 text-slate-400"
                            }`}
                          >
                            {inst.directional_bias || "NEUTRAL"}
                          </span>
                        </td>
                      )}

                      {/* Momentum Score */}
                      {visibleCols.momentum && (
                        <td className="py-3 px-3 text-center font-bold text-cyan-300">
                          {inst.momentum_score ? `${inst.momentum_score}/100` : "50/100"}
                        </td>
                      )}

                      {/* Feed Health */}
                      {visibleCols.dataQuality && (
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inst.data_status === "STALE"
                                ? "bg-amber-950/60 text-amber-300 border border-amber-800"
                                : "bg-emerald-950/60 text-emerald-300 border border-emerald-800"
                            }`}
                          >
                            {inst.data_status || "LIVE"}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      {visibleCols.actions && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onSelectInstrument(inst)}
                              className="px-2.5 py-1 rounded-lg bg-[#070D14] hover:bg-cyan-950 text-cyan-300 border border-[#1E293B] hover:border-cyan-800 text-[10px] font-bold transition-colors"
                            >
                              Select
                            </button>
                            <button
                              onClick={() => onOpenAnalysis(inst)}
                              className="px-2.5 py-1 rounded-lg bg-[#070D14] hover:bg-purple-950 text-purple-300 border border-[#1E293B] hover:border-purple-800 text-[10px] font-bold transition-colors"
                            >
                              Analyze
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
