"use client";

import React, { useState, useEffect } from "react";
import {
  Star,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Sliders
} from "lucide-react";
import { MarketInstrument } from "@/types/market-universe";
import { WatchlistStarButton } from "@/components/watchlists/WatchlistStarButton";
import { formatPrice, formatVolume } from "@/lib/formatters";

interface SimpleMarketTableProps {
  instruments: MarketInstrument[];
  selectedInstrument: MarketInstrument | null;
  onSelectInstrument: (inst: MarketInstrument) => void;
  onToggleWatchlist: (inst: MarketInstrument) => void;
  watchlistSymbols: Set<string>;
  showColumnSettings?: boolean;
  onCloseColumnSettings?: () => void;
}

export function SimpleMarketTable({
  instruments = [],
  selectedInstrument,
  onSelectInstrument,
  onToggleWatchlist,
  watchlistSymbols,
  showColumnSettings = false,
  onCloseColumnSettings,
}: SimpleMarketTableProps) {
  const defaultCols = {
    symbol: true,
    price: true,
    change: true,
    volume: true,
    trend: true,
    status: true,
  };

  const [visibleCols, setVisibleCols] = useState(defaultCols);
  const [sortField, setSortField] = useState<string>("volume_24h");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("markets_table_cols_v3");
      if (saved) setVisibleCols({ ...defaultCols, ...JSON.parse(saved) });
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
      {/* Column Customizer Panel (if triggered from header menu) */}
      {showColumnSettings && (
        <div className="p-4 rounded-xl bg-[#080D17] border border-cyan-500/30 flex items-center justify-between gap-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Sliders className="w-4 h-4" />
            <span className="font-bold uppercase">Customize Table Columns:</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            {Object.keys(defaultCols).map((k) => (
              <label key={k} className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={visibleCols[k as keyof typeof defaultCols]}
                  onChange={() => toggleCol(k as keyof typeof defaultCols)}
                  className="accent-cyan-400 rounded"
                />
                <span className="capitalize">{k}</span>
              </label>
            ))}
          </div>

          {onCloseColumnSettings && (
            <button
              onClick={onCloseColumnSettings}
              className="text-xs font-semibold text-slate-400 hover:text-white"
            >
              Done
            </button>
          )}
        </div>
      )}

      {/* Main Table */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#070D14] text-slate-400 text-[10px] uppercase tracking-wider border-b border-[#1E293B]">
              <tr>
                <th className="py-3 px-3 w-8"></th>
                {visibleCols.symbol && (
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-cyan-300 font-sans"
                    onClick={() => handleSort("canonical_symbol")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Instrument</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                )}
                {visibleCols.price && (
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-cyan-300 font-sans"
                    onClick={() => handleSort("last_price")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Price</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                )}
                {visibleCols.change && (
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-cyan-300 font-sans"
                    onClick={() => handleSort("change_24h")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>24H</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                )}
                {visibleCols.volume && (
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-cyan-300 font-sans"
                    onClick={() => handleSort("volume_24h")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Volume</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                )}
                {visibleCols.trend && (
                  <th
                    className="py-3 px-3 text-center cursor-pointer hover:text-cyan-300 font-sans"
                    onClick={() => handleSort("directional_bias")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Trend</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                )}
                {visibleCols.status && (
                  <th className="py-3 px-3 text-center font-sans">
                    <span>Status</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-slate-200">
              {sortedInstruments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-500 font-sans">
                    No instruments match the active search or category filter.
                  </td>
                </tr>
              ) : (
                sortedInstruments.map((inst, idx) => {
                  const sym = inst.canonical_symbol || inst.provider_symbol || inst.symbol || "UNKNOWN";
                  const isWatched = watchlistSymbols.has(sym) || watchlistSymbols.has(inst.instrument_id);
                  const isPositive = (inst.change_24h || 0) >= 0;
                  const currSymbol = inst.currency === "INR" ? "₹" : "$";
                  const isSelected = selectedInstrument?.instrument_id === inst.instrument_id;

                  // Price Formatting with micro-precision support
                  const priceStr = formatPrice(inst.last_price, currSymbol, undefined, "—");
                  const volumeStr = formatVolume(inst.volume_24h, currSymbol, "—");

                  // Trend / Bias
                  const bias = inst.directional_bias || (isPositive ? "BULLISH" : "NEUTRAL");
                  const isBull = bias.toUpperCase().includes("BULL");
                  const isBear = bias.toUpperCase().includes("BEAR");

                  return (
                    <tr
                      key={inst.instrument_id || sym || idx}
                      onClick={() => onSelectInstrument(inst)}
                      className={`transition-colors cursor-pointer group ${
                        isSelected
                          ? "bg-[#0F2238] border-l-2 border-cyan-400"
                          : "hover:bg-[#141E33]/70"
                      }`}
                    >
                      {/* Watchlist Star */}
                      <td className="py-3 px-3 w-8" onClick={(e) => e.stopPropagation()}>
                        <WatchlistStarButton instrument={inst} size="sm" />
                      </td>

                      {/* Instrument Symbol & Venue */}
                      {visibleCols.symbol && (
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                              {sym}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                              {inst.exchange || "GLOBAL"}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 truncate block max-w-[180px] font-sans mt-0.5">
                            {inst.company_name || inst.asset_class}
                          </span>
                        </td>
                      )}

                      {/* Price */}
                      {visibleCols.price && (
                        <td className="py-3 px-3 text-right font-bold text-white text-sm font-mono">
                          {priceStr}
                        </td>
                      )}

                      {/* 24H Change */}
                      {visibleCols.change && (
                        <td className="py-3 px-3 text-right font-bold font-mono">
                          {inst.change_24h !== undefined ? (
                            <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
                              {isPositive ? "+" : ""}{inst.change_24h.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      )}

                      {/* Volume */}
                      {visibleCols.volume && (
                        <td className="py-3 px-3 text-right text-slate-300 font-mono">
                          {volumeStr}
                        </td>
                      )}

                      {/* Trend */}
                      {visibleCols.trend && (
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                              isBull
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : isBear
                                ? "bg-red-500/10 text-red-400 border-red-500/30"
                                : "bg-slate-800/80 text-slate-300 border-slate-700"
                            }`}
                          >
                            {isBull ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : isBear ? (
                              <ArrowDownRight className="w-3 h-3" />
                            ) : (
                              <Minus className="w-3 h-3" />
                            )}
                            <span>{isBull ? "Bullish" : isBear ? "Bearish" : "Neutral"}</span>
                          </span>
                        </td>
                      )}

                      {/* Status */}
                      {visibleCols.status && (
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>LIVE</span>
                          </span>
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
