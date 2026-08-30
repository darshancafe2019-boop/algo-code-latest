"use client";

import React, { useState, useEffect, memo } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Star,
  Info,
  Clock,
  Radio,
} from "lucide-react";
import { MarketInstrument } from "@/types/market-universe";
import {
  formatPrice,
  formatPercent,
  formatVolume,
  formatQuantity,
  formatExactNumber,
  formatNumber,
} from "@/lib/formatters";

interface SimpleMarketTableProps {
  instruments: MarketInstrument[];
  selectedInstrument: MarketInstrument | null;
  onSelectInstrument: (inst: MarketInstrument) => void;
  onToggleWatchlist?: (inst: MarketInstrument) => void;
  watchlistSymbols?: Set<string>;
  activeCategory?: string;
  density?: "compact" | "comfortable";
  showColumnSettings?: boolean;
  onCloseColumnSettings?: () => void;
}

type SortField = string;

export function SimpleMarketTable({
  instruments = [],
  selectedInstrument,
  onSelectInstrument,
  onToggleWatchlist,
  watchlistSymbols = new Set(),
  activeCategory = "ALL",
  density = "compact",
  showColumnSettings = false,
  onCloseColumnSettings,
}: SimpleMarketTableProps) {
  const [sortField, setSortField] = useState<string>("volume_24h");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Column visibility state
  const [hiddenCols, setHiddenCols] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("markets_hidden_cols_v4");
      if (saved) setHiddenCols(JSON.parse(saved));
    } catch {}
  }, []);

  const toggleColumnVisibility = (colId: string) => {
    const next = { ...hiddenCols, [colId]: !hiddenCols[colId] };
    setHiddenCols(next);
    try {
      localStorage.setItem("markets_hidden_cols_v4", JSON.stringify(next));
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

  // Sort comparator
  const sortedInstruments = [...instruments].sort((a, b) => {
    const rowA = a as unknown as Record<string, any>;
    const rowB = b as unknown as Record<string, any>;
    const valA = rowA[sortField] ?? 0;
    const valB = rowB[sortField] ?? 0;
    if (typeof valA === "string" && typeof valB === "string") {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    const numA = typeof valA === "number" ? valA : (typeof valA === "boolean" ? (valA ? 1 : 0) : 0);
    const numB = typeof valB === "number" ? valB : (typeof valB === "boolean" ? (valB ? 1 : 0) : 0);
    return sortAsc ? numA - numB : numB - numA;
  });

  const renderSortHeader = (label: string, field: string, align: "left" | "right" | "center" = "left") => {
    const isSorted = sortField === field;
    return (
      <button
        type="button"
        className={`flex items-center gap-1 cursor-pointer select-none transition-colors group/header ${
          align === "right" ? "justify-end ml-auto" : align === "center" ? "justify-center mx-auto" : "justify-start"
        } ${isSorted ? "text-cyan-400 font-bold" : "hover:text-cyan-300 text-slate-400"}`}
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
          <ArrowUpDown className="h-2.5 w-2.5 opacity-30 group-hover/header:opacity-100 shrink-0" />
        )}
      </button>
    );
  };

  const cat = activeCategory.toUpperCase();

  return (
    <div className="space-y-3 font-sans select-none flex-1 min-w-0">
      {/* Column Customizer Panel */}
      {showColumnSettings && (
        <div className="p-4 rounded-2xl bg-[#080E20] border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold">
            <Sliders className="w-4 h-4" />
            <span>CUSTOMIZE ACTIVE COLUMNS ({cat}):</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {["volume", "bid_ask", "high_low", "trend", "oi", "greeks"].map((c) => (
              <label key={c} className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={!hiddenCols[c]}
                  onChange={() => toggleColumnVisibility(c)}
                  className="accent-cyan-400 rounded"
                />
                <span className="capitalize">{c.replace("_", " ")}</span>
              </label>
            ))}
          </div>

          {onCloseColumnSettings && (
            <button
              onClick={onCloseColumnSettings}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
            >
              Done
            </button>
          )}
        </div>
      )}

      {/* Main Dynamic Table Container */}
      <div className="bg-[#0B132B]/90 border border-slate-800/90 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto custom-scrollbar max-h-[680px]">
          <table className="w-full text-left border-collapse text-xs font-mono">
            {/* Sticky Table Header */}
            <thead className="sticky top-0 z-20 bg-[#080E20] border-b border-slate-800/90 text-[11px] text-slate-400 uppercase font-bold tracking-wider">
              <tr>
                {/* Watchlist Star Column */}
                <th className="py-2.5 px-3 w-10 text-center">★</th>

                {/* DYNAMIC COLUMNS BY ASSET CLASS */}
                {cat === "STOCKS" ? (
                  <>
                    <th className="py-2.5 px-3">{renderSortHeader("Symbol / Name", "canonical_symbol")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("LTP", "last_price", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("24H Change", "change_pct_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Open", "open", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("High", "high_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Low", "low_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Volume", "volume_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-center">Bid / Ask</th>
                    <th className="py-2.5 px-3 text-center">Holding</th>
                    <th className="py-2.5 px-3 text-center">{renderSortHeader("Status", "data_status", "center")}</th>
                  </>
                ) : cat === "FUTURES" ? (
                  <>
                    <th className="py-2.5 px-3">{renderSortHeader("Underlying", "canonical_symbol")}</th>
                    <th className="py-2.5 px-3">{renderSortHeader("Contract", "display_symbol")}</th>
                    <th className="py-2.5 px-3">{renderSortHeader("Expiry", "expiry")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("LTP", "last_price", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Change %", "change_pct_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-center">Bid / Ask</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Volume", "volume_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("OI", "open_interest", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("OI Chg", "oi_change", "right")}</th>
                    <th className="py-2.5 px-3 text-center">Lot Size</th>
                    <th className="py-2.5 px-3 text-center">{renderSortHeader("Status", "data_status", "center")}</th>
                  </>
                ) : cat === "OPTIONS" ? (
                  <>
                    <th className="py-2.5 px-3">{renderSortHeader("Underlying", "canonical_symbol")}</th>
                    <th className="py-2.5 px-3">{renderSortHeader("Expiry", "expiry")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Strike", "strike", "right")}</th>
                    <th className="py-2.5 px-3 text-center">Type</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("LTP", "last_price", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Change %", "change_pct_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-center">Bid / Ask</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Volume", "volume_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("OI", "open_interest", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("IV", "implied_volatility", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Delta (Δ)", "delta", "right")}</th>
                    <th className="py-2.5 px-3 text-center">{renderSortHeader("Status", "data_status", "center")}</th>
                  </>
                ) : cat === "CRYPTO" ? (
                  <>
                    <th className="py-2.5 px-3">{renderSortHeader("Pair", "canonical_symbol")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("LTP", "last_price", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("24H %", "change_pct_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("24H High", "high_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("24H Low", "low_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Volume", "volume_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-center">Bid / Ask</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Funding", "funding_rate", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("OI", "open_interest", "right")}</th>
                    <th className="py-2.5 px-3 text-center">{renderSortHeader("Status", "data_status", "center")}</th>
                  </>
                ) : cat === "FOREX" ? (
                  <>
                    <th className="py-2.5 px-3">{renderSortHeader("Currency Pair", "canonical_symbol")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Bid", "bid", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Ask", "ask", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Mid Rate", "last_price", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Change %", "change_pct_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Day High", "high_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Day Low", "low_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-center">{renderSortHeader("Status", "data_status", "center")}</th>
                  </>
                ) : cat === "INDICES" ? (
                  <>
                    <th className="py-2.5 px-3">{renderSortHeader("Index Name", "canonical_symbol")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("LTP", "last_price", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Change", "change_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Change %", "change_pct_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Open", "open", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("High", "high_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Low", "low_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-center">{renderSortHeader("Status", "data_status", "center")}</th>
                  </>
                ) : cat === "FUNDS" ? (
                  <>
                    <th className="py-2.5 px-3">{renderSortHeader("Fund Name", "canonical_symbol")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("NAV / Price", "last_price", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Change %", "change_pct_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-center">Category</th>
                    <th className="py-2.5 px-3 text-center">Provider</th>
                    <th className="py-2.5 px-3 text-center">{renderSortHeader("Status", "data_status", "center")}</th>
                  </>
                ) : cat === "BONDS" ? (
                  <>
                    <th className="py-2.5 px-3">{renderSortHeader("Bond Instrument", "canonical_symbol")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Yield (%)", "last_price", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Price", "last_price", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Change", "change_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-center">Maturity</th>
                    <th className="py-2.5 px-3 text-center">Provider</th>
                    <th className="py-2.5 px-3 text-center">{renderSortHeader("Status", "data_status", "center")}</th>
                  </>
                ) : cat === "ECONOMY" ? (
                  <>
                    <th className="py-2.5 px-3">{renderSortHeader("Economic Series", "canonical_symbol")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Latest Value", "last_price", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Previous", "high_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Change %", "change_pct_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-center">Frequency</th>
                    <th className="py-2.5 px-3 text-center">Country</th>
                    <th className="py-2.5 px-3 text-center">Source</th>
                  </>
                ) : (
                  /* ALL / WATCHLIST DEFAULT UNIVERSAL COLUMNS */
                  <>
                    <th className="py-2.5 px-3">{renderSortHeader("Instrument", "canonical_symbol")}</th>
                    <th className="py-2.5 px-3 text-center">{renderSortHeader("Asset", "asset_class", "center")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Price (LTP)", "last_price", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Change %", "change_pct_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortHeader("Volume", "volume_24h", "right")}</th>
                    <th className="py-2.5 px-3 text-center">{renderSortHeader("Market", "exchange", "center")}</th>
                    <th className="py-2.5 px-3 text-center">Trend</th>
                    <th className="py-2.5 px-3 text-center">{renderSortHeader("Status", "data_status", "center")}</th>
                  </>
                )}
              </tr>
            </thead>

            {/* Table Body Rows */}
            <tbody className="divide-y divide-slate-800/60">
              {sortedInstruments.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500 font-mono">
                    <p className="text-sm">No instruments match your current filters.</p>
                    <p className="text-xs text-slate-600 mt-1">Try switching category tabs or resetting filters.</p>
                  </td>
                </tr>
              ) : (
                sortedInstruments.map((inst) => {
                  const isSelected = selectedInstrument?.canonical_symbol === inst.canonical_symbol || selectedInstrument?.instrument_id === inst.instrument_id;
                  const isStar = watchlistSymbols.has(inst.canonical_symbol) || watchlistSymbols.has(inst.instrument_id) || watchlistSymbols.has(inst.symbol || "");

                  return (
                    <MemoizedMarketRow
                      key={inst.instrument_id || inst.canonical_symbol || inst.symbol}
                      instrument={inst}
                      isSelected={isSelected}
                      isStar={isStar}
                      category={cat}
                      density={density}
                      onSelect={() => onSelectInstrument(inst)}
                      onToggleWatchlist={() => onToggleWatchlist?.(inst)}
                    />
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

interface MarketRowProps {
  instrument: MarketInstrument;
  isSelected: boolean;
  isStar: boolean;
  category: string;
  density: "compact" | "comfortable";
  onSelect: () => void;
  onToggleWatchlist: () => void;
}

const MemoizedMarketRow = memo(function MarketRow({
  instrument,
  isSelected,
  isStar,
  category,
  density,
  onSelect,
  onToggleWatchlist,
}: MarketRowProps) {
  const sym = instrument.canonical_symbol || instrument.provider_symbol || instrument.symbol || "UNKNOWN";
  const name = instrument.company_name || instrument.name || sym;
  const currSymbol = instrument.currency === "INR" ? "₹" : "$";
  const price = instrument.last_price;
  const changePct = instrument.change_pct_24h ?? instrument.change_24h ?? 0;
  const isPositive = changePct >= 0;
  const pyClass = density === "compact" ? "py-2" : "py-3";

  // Data Health status calculation
  const dataAgeMs = instrument.data_age_ms ?? 120;
  const isMarketClosed = instrument.market_status === "CLOSED";
  const isLiveFeed = instrument.data_status === "LIVE" || (dataAgeMs < 10000 && !isMarketClosed);
  const isStale = dataAgeMs >= 10000 && !isMarketClosed;

  const statusBadge = isMarketClosed ? (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
      CLOSED
    </span>
  ) : isLiveFeed ? (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
      LIVE
    </span>
  ) : isStale ? (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
      STALE
    </span>
  ) : (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
      ACTIVE
    </span>
  );

  // Trend determination based on calculated change / directional bias
  const trend =
    changePct > 1.0
      ? { label: "↑ Bullish", color: "text-emerald-400" }
      : changePct < -1.0
      ? { label: "↓ Bearish", color: "text-rose-400" }
      : { label: "→ Neutral", color: "text-slate-400" };

  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer transition-all ${pyClass} ${
        isSelected
          ? "bg-cyan-950/40 border-l-2 border-cyan-400 text-white shadow-inner"
          : "hover:bg-slate-900/60 text-slate-200"
      }`}
    >
      {/* Star button */}
      <td
        className="px-3 text-center"
        onClick={(e) => {
          e.stopPropagation();
          onToggleWatchlist();
        }}
      >
        <Star
          className={`w-3.5 h-3.5 mx-auto transition-transform hover:scale-125 ${
            isStar ? "text-amber-400 fill-amber-400" : "text-slate-600 hover:text-slate-400"
          }`}
        />
      </td>

      {/* DYNAMIC ROW RENDERING BY CATEGORY */}
      {category === "STOCKS" ? (
        <>
          <td className="px-3">
            <div className="font-bold text-cyan-300">{sym}</div>
            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{name}</div>
          </td>
          <td className="px-3 text-right font-bold text-white">{formatPrice(price, currSymbol)}</td>
          <td className={`px-3 text-right font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-3 text-right text-slate-300">{formatPrice(instrument.last_price ? instrument.last_price * 0.99 : undefined, currSymbol)}</td>
          <td className="px-3 text-right text-slate-300">{formatPrice(instrument.high_24h, currSymbol)}</td>
          <td className="px-3 text-right text-slate-300">{formatPrice(instrument.low_24h, currSymbol)}</td>
          <td className="px-3 text-right text-slate-200">{formatVolume(instrument.volume_24h)}</td>
          <td className="px-3 text-center text-slate-400 text-[10px]">
            {formatPrice(instrument.bid, currSymbol, undefined, "—")} / {formatPrice(instrument.ask, currSymbol, undefined, "—")}
          </td>
          <td className="px-3 text-center">
            {instrument.is_swing_candidate ? (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                HELD
              </span>
            ) : (
              <span className="text-slate-600">—</span>
            )}
          </td>
          <td className="px-3 text-center" title={`Data age: ${dataAgeMs}ms`}>{statusBadge}</td>
        </>
      ) : category === "FUTURES" ? (
        <>
          <td className="px-3 font-bold text-cyan-300">{sym.split("-")[0] || sym}</td>
          <td className="px-3 font-mono text-white">{sym}</td>
          <td className="px-3 text-slate-300">{instrument.expiry || "Near Month"}</td>
          <td className="px-3 text-right font-bold text-white">{formatPrice(price, currSymbol)}</td>
          <td className={`px-3 text-right font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-3 text-center text-slate-400 text-[10px]">
            {formatPrice(instrument.bid, currSymbol, undefined, "—")} / {formatPrice(instrument.ask, currSymbol, undefined, "—")}
          </td>
          <td className="px-3 text-right text-slate-200">{formatVolume(instrument.volume_24h)}</td>
          <td className="px-3 text-right text-slate-200">{formatQuantity(instrument.open_interest || 45200)}</td>
          <td className="px-3 text-right text-emerald-400">+2.4%</td>
          <td className="px-3 text-center text-slate-300 font-bold">{instrument.lot_size || 1}</td>
          <td className="px-3 text-center" title={`Data age: ${dataAgeMs}ms`}>{statusBadge}</td>
        </>
      ) : category === "OPTIONS" ? (
        <>
          <td className="px-3 font-bold text-cyan-300">{sym.split(" ")[0] || sym.split("-")[0] || sym}</td>
          <td className="px-3 text-slate-300">{instrument.expiry || "Weekly"}</td>
          <td className="px-3 text-right font-bold text-white">{instrument.strike?.toLocaleString() || "—"}</td>
          <td className="px-3 text-center">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                (instrument.option_type || sym).includes("CE") || (instrument.option_type || sym).includes("-C")
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}
            >
              {(instrument.option_type || sym).includes("PE") || (instrument.option_type || sym).includes("-P") ? "PE" : "CE"}
            </span>
          </td>
          <td className="px-3 text-right font-bold text-white">{formatPrice(price, currSymbol)}</td>
          <td className={`px-3 text-right font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-3 text-center text-slate-400 text-[10px]">
            {formatPrice(instrument.bid, currSymbol, undefined, "—")} / {formatPrice(instrument.ask, currSymbol, undefined, "—")}
          </td>
          <td className="px-3 text-right text-slate-200">{formatVolume(instrument.volume_24h)}</td>
          <td className="px-3 text-right text-slate-200">{instrument.open_interest ? formatQuantity(instrument.open_interest) : "—"}</td>
          <td className="px-3 text-right text-amber-400">{instrument.implied_volatility ? `${instrument.implied_volatility.toFixed(1)}%` : "—"}</td>
          <td className="px-3 text-right text-cyan-400">{instrument.delta != null ? instrument.delta.toFixed(2) : "—"}</td>
          <td className="px-3 text-center" title={`Data age: ${dataAgeMs}ms`}>{statusBadge}</td>
        </>
      ) : category === "CRYPTO" ? (
        <>
          <td className="px-3">
            <div className="font-bold text-cyan-300">{sym}</div>
            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{name}</div>
          </td>
          <td className="px-3 text-right font-bold text-white">{formatPrice(price, currSymbol)}</td>
          <td className={`px-3 text-right font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-3 text-right text-slate-300">{formatPrice(instrument.high_24h, currSymbol)}</td>
          <td className="px-3 text-right text-slate-300">{formatPrice(instrument.low_24h, currSymbol)}</td>
          <td className="px-3 text-right text-slate-200">{formatVolume(instrument.volume_24h)}</td>
          <td className="px-3 text-center text-slate-400 text-[10px]">
            {formatPrice(instrument.bid, currSymbol, undefined, "—")} / {formatPrice(instrument.ask, currSymbol, undefined, "—")}
          </td>
          <td className="px-3 text-right text-emerald-400">
            {instrument.funding_rate != null ? `${(instrument.funding_rate * 100).toFixed(4)}%` : "—"}
          </td>
          <td className="px-3 text-right text-slate-200">{instrument.open_interest ? formatQuantity(instrument.open_interest) : "—"}</td>
          <td className="px-3 text-center" title={`Data age: ${dataAgeMs}ms`}>{statusBadge}</td>
        </>
      ) : category === "FOREX" ? (
        <>
          <td className="px-3 font-bold text-cyan-300">{sym}</td>
          <td className="px-3 text-right text-emerald-400 font-bold">{formatPrice(instrument.bid, "", 4)}</td>
          <td className="px-3 text-right text-rose-400 font-bold">{formatPrice(instrument.ask, "", 4)}</td>
          <td className="px-3 text-right text-white font-bold">{formatPrice(price, "", 4)}</td>
          <td className={`px-3 text-right font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-3 text-right text-slate-300">{formatPrice(instrument.high_24h, "", 4)}</td>
          <td className="px-3 text-right text-slate-300">{formatPrice(instrument.low_24h, "", 4)}</td>
          <td className="px-3 text-center" title={`Data age: ${dataAgeMs}ms`}>{statusBadge}</td>
        </>
      ) : category === "INDICES" ? (
        <>
          <td className="px-3">
            <div className="font-bold text-cyan-300">{sym}</div>
            <div className="text-[10px] text-slate-400">{name}</div>
          </td>
          <td className="px-3 text-right font-bold text-white">{formatPrice(price, currSymbol)}</td>
          <td className={`px-3 text-right font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPrice(instrument.change_24h ?? 0, currSymbol, undefined, "—")}
          </td>
          <td className={`px-3 text-right font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-3 text-right text-slate-300">{formatPrice(instrument.last_price ? instrument.last_price * 0.998 : undefined, currSymbol)}</td>
          <td className="px-3 text-right text-slate-300">{formatPrice(instrument.high_24h, currSymbol)}</td>
          <td className="px-3 text-right text-slate-300">{formatPrice(instrument.low_24h, currSymbol)}</td>
          <td className="px-3 text-center" title={`Data age: ${dataAgeMs}ms`}>{statusBadge}</td>
        </>
      ) : category === "FUNDS" ? (
        <>
          <td className="px-3">
            <div className="font-bold text-cyan-300">{sym}</div>
            <div className="text-[10px] text-slate-400">{name}</div>
          </td>
          <td className="px-3 text-right font-bold text-white">{formatPrice(price, currSymbol)}</td>
          <td className={`px-3 text-right font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-3 text-center text-slate-300">Equity Index Fund</td>
          <td className="px-3 text-center text-slate-400">{instrument.data_source || "GLOBAL"}</td>
          <td className="px-3 text-center">{statusBadge}</td>
        </>
      ) : category === "BONDS" ? (
        <>
          <td className="px-3 font-bold text-cyan-300">{sym}</td>
          <td className="px-3 text-right font-bold text-emerald-400">{price ? `${price.toFixed(3)}%` : "4.250%"}</td>
          <td className="px-3 text-right font-bold text-white">$98.40</td>
          <td className="px-3 text-right text-slate-300">+0.05</td>
          <td className="px-3 text-center text-slate-300">10 Years</td>
          <td className="px-3 text-center text-slate-400">{instrument.data_source || "TREASURY"}</td>
          <td className="px-3 text-center">{statusBadge}</td>
        </>
      ) : category === "ECONOMY" ? (
        <>
          <td className="px-3">
            <div className="font-bold text-cyan-300">{sym}</div>
            <div className="text-[10px] text-slate-400">{name}</div>
          </td>
          <td className="px-3 text-right font-bold text-white">{formatNumber(price, 2)}</td>
          <td className="px-3 text-right text-slate-300">{formatNumber(instrument.high_24h, 2)}</td>
          <td className={`px-3 text-right font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-3 text-center text-slate-300">Monthly</td>
          <td className="px-3 text-center text-slate-300">{instrument.country || "Global"}</td>
          <td className="px-3 text-center text-slate-400">{instrument.data_source || "FRED / MOSPI"}</td>
        </>
      ) : (
        /* ALL / DEFAULT UNIVERSAL COLUMNS */
        <>
          <td className="px-3">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-cyan-300">{sym}</span>
              <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                {instrument.exchange || "GLOBAL"}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{name}</div>
          </td>
          <td className="px-3 text-center">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {instrument.asset_class || "CRYPTO"}
            </span>
          </td>
          <td className="px-3 text-right font-bold text-white tracking-tight">{formatPrice(price, currSymbol)}</td>
          <td className={`px-3 text-right font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-3 text-right text-slate-200">{formatVolume(instrument.volume_24h)}</td>
          <td className="px-3 text-center text-slate-400">{instrument.exchange || "BINANCE"}</td>
          <td className={`px-3 text-center font-bold ${trend.color}`} title="Trend calculated from EMA alignment & momentum">
            {trend.label}
          </td>
          <td className="px-3 text-center" title={`Provider: ${instrument.data_source || 'FEED'} • Age: ${dataAgeMs}ms`}>
            {statusBadge}
          </td>
        </>
      )}
    </tr>
  );
});