"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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
  onToggleWatchlist?: (inst: MarketInstrument) => void;
  watchlistSymbols?: Set<string>;
  showColumnSettings?: boolean;
  onCloseColumnSettings?: () => void;
}

const DEFAULT_COLS = {
  symbol: true,
  price: true,
  change: true,
  volume: true,
  trend: true,
  status: true,
};

type SortableValue = string | number | boolean | undefined | null;

export function SimpleMarketTable({
  instruments = [],
  selectedInstrument,
  onSelectInstrument,
  onToggleWatchlist,
  watchlistSymbols,
  showColumnSettings = false,
  onCloseColumnSettings,
}: SimpleMarketTableProps) {
  const [visibleCols, setVisibleCols] = useState(DEFAULT_COLS);
  const [sortField, setSortField] = useState<string>("volume_24h");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("markets_table_cols_v3");
      if (saved) setVisibleCols({ ...DEFAULT_COLS, ...JSON.parse(saved) });
    } catch { }
  }, []);

  const toggleCol = (k: keyof typeof DEFAULT_COLS) => {
    const updated = { ...visibleCols, [k]: !visibleCols[k] };
    setVisibleCols(updated);
    try {
      localStorage.setItem("markets_table_cols_v3", JSON.stringify(updated));
    } catch { }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Safe typed sort comparator across numbers, strings, and booleans without 'any'
  const sortedInstruments = [...instruments].sort((a, b) => {
    const rowA = a as unknown as Record<string, SortableValue>;
    const rowB = b as unknown as Record<string, SortableValue>;
    const valA = rowA[sortField] ?? 0;
    const valB = rowB[sortField] ?? 0;
    if (typeof valA === "string" && typeof valB === "string") {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    const numA = typeof valA === "number" ? valA : (typeof valA === "boolean" ? (valA ? 1 : 0) : 0);
    const numB = typeof valB === "number" ? valB : (typeof valB === "boolean" ? (valB ? 1 : 0) : 0);
    return sortAsc ? numA - numB : numB - numA;
  });

  // Dynamically compute real visible column count (1 star column + visible toggled columns)
  const visibleColumnCount = 1 + Object.values(visibleCols).filter(Boolean).length;

  const renderSortHeader = (label: string, field: string, align: "left" | "right" | "center" = "left") => {
    const isSorted = sortField === field;
    return (
      <div
        className={`flex items-center gap-1.5 cursor-pointer select-none transition-colors group/header ${
          align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"
        } ${isSorted ? "text-cyan-300 font-bold" : "hover:text-cyan-300 text-slate-400"}`}
        onClick={() => handleSort(field)}
      >
        <span>{label}</span>
        {isSorted ? (
          sortAsc ? (
            <ArrowUp className="h-3 w-3 text-cyan-400 shrink-0" />
          ) : (
            <ArrowDown className="h-3 w-3 text-cyan-400 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40 group-hover/header:opacity-100 shrink-0" />
        )}
      </div>
    );
  };

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
            {(Object.keys(DEFAULT_COLS) as Array<keyof typeof DEFAULT_COLS>).map((k) => (
              <label key={k} className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={Boolean(visibleCols[k])}
                  onChange={() => toggleCol(k)}
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
                  <th className="py-3 px-3 font-sans">
                    {renderSortHeader("Instrument", "canonical_symbol", "left")}
                  </th>
                )}
                {visibleCols.price && (
                  <th className="py-3 px-3 text-right font-sans">
                    {renderSortHeader("Price", "last_price", "right")}
                  </th>
                )}
                {visibleCols.change && (
                  <th className="py-3 px-3 text-right font-sans">
                    {renderSortHeader("24H", "change_24h", "right")}
                  </th>
                )}
                {visibleCols.volume && (
                  <th className="py-3 px-3 text-right font-sans">
                    {renderSortHeader("Volume", "volume_24h", "right")}
                  </th>
                )}
                {visibleCols.trend && (
                  <th className="py-3 px-3 text-center font-sans">
                    {renderSortHeader("Trend", "directional_bias", "center")}
                  </th>
                )}
                {visibleCols.status && (
                  <th className="py-3 px-3 text-center font-sans">
                    <span className="text-slate-400">Status</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-slate-200">
              {sortedInstruments.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount} className="py-12 text-center text-xs text-slate-500 font-sans">
                    No instruments match the active search or category filter.
                  </td>
                </tr>
              ) : (
                sortedInstruments.map((inst, idx) => {
                  const sym = inst.canonical_symbol || inst.provider_symbol || inst.symbol || "UNKNOWN";
                  const isWatched = watchlistSymbols
                    ? Boolean(watchlistSymbols.has(sym) || (inst.instrument_id && watchlistSymbols.has(inst.instrument_id)))
                    : false;

                  // Bug #1 Fix: Read real data_status & data_age_ms from MarketInstrument
                  const rawStatus = (inst.data_status || "LIVE").toUpperCase();
                  const isStale =
                    rawStatus === "STALE" ||
                    rawStatus === "DISCONNECTED" ||
                    rawStatus === "DEGRADED" ||
                    Boolean((inst as unknown as { is_stale?: boolean })?.is_stale) ||
                    (inst.data_age_ms !== undefined && inst.data_age_ms > 5000);
                  const statusLabel = rawStatus === "DISCONNECTED" ? "OFFLINE" : (isStale ? "STALE" : "LIVE");

                  // Bug #2 Fix: Only derive bias if real change data exists; missing change defaults to NEUTRAL (never guess)
                  const hasChange = inst.change_24h !== undefined && inst.change_24h !== null && !isNaN(Number(inst.change_24h));
                  const isPositive = hasChange ? Number(inst.change_24h) >= 0 : null;
                  const currSymbol = inst.currency === "INR" ? "₹" : "$";
                  const isSelected = selectedInstrument?.instrument_id === inst.instrument_id;

                  // Price Formatting with micro-precision support
                  const priceStr = formatPrice(inst.last_price, currSymbol, undefined, "—");
                  const volumeStr = formatVolume(inst.volume_24h, currSymbol, "—");

                  // Trend / Bias
                  const rawBias = inst.directional_bias
                    ? inst.directional_bias.toUpperCase()
                    : (hasChange ? (isPositive ? "BULLISH" : "BEARISH") : "NEUTRAL");
                  const isBull = rawBias.includes("BULL");
                  const isBear = rawBias.includes("BEAR");

                  return (
                    <tr
                      key={inst.instrument_id || sym || idx}
                      onClick={() => onSelectInstrument(inst)}
                      className={`transition-colors cursor-pointer group ${
                        isSelected
                          ? "bg-[#0F2238] border-l-2 border-cyan-400"
                          : isWatched
                          ? "bg-[#0C1929]/70 hover:bg-[#141E33]/80 border-l-2 border-amber-400/40"
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
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
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
                          {hasChange ? (
                            <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
                              {isPositive ? "+" : ""}
                              {Number(inst.change_24h).toFixed(2)}%
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

                      {/* Status — reflects real freshness from MarketInstrument */}
                      {visibleCols.status && (
                        <td className="py-3 px-3 text-center">
                          {isStale ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 font-semibold">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>{statusLabel}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>LIVE</span>
                            </span>
                          )}
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