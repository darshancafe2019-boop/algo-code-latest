"use client";

import React, { useMemo } from "react";
import { OptionLegGreekData, NseOptionStrikeRow } from "@/types/nse";
import { Check, ChevronDown, Eye, SlidersHorizontal } from "lucide-react";

export type OptionalColumn = "iv" | "delta" | "theta" | "gamma" | "vega" | "volume" | "oi_change" | "bid_ask";

interface SimpleOptionChainTableProps {
  strikes: NseOptionStrikeRow[];
  spotPrice: number;
  selectedStrike: number | null;
  selectedOptionType: "CE" | "PE" | null;
  onSelectOption: (strike: number, type: "CE" | "PE", ltp: number, details: OptionLegGreekData) => void;
  visibleColumns: Record<OptionalColumn, boolean>;
  onToggleColumn: (col: OptionalColumn) => void;
  currencySymbol?: string;
  isLoading?: boolean;
}

function formatNumberShort(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "—";
  if (num >= 10_000_000) return `${(num / 10_000_000).toFixed(2)}Cr`;
  if (num >= 100_000) return `${(num / 100_000).toFixed(1)}L`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toLocaleString();
}

function formatPrice(val: number | undefined | null, symbol: string = "₹"): string {
  if (val === undefined || val === null || isNaN(val)) return "—";
  return `${symbol}${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatGreek(val: number | undefined | null, decimals: number = 2): string {
  if (val === undefined || val === null || isNaN(val)) return "—";
  return val.toFixed(decimals);
}

export function SimpleOptionChainTable({
  strikes,
  spotPrice,
  selectedStrike,
  selectedOptionType,
  onSelectOption,
  visibleColumns,
  onToggleColumn,
  currencySymbol = "₹",
  isLoading = false,
}: SimpleOptionChainTableProps) {
  const [columnsDropdownOpen, setColumnsDropdownOpen] = React.useState(false);

  // Compute ATM strike index / value dynamically
  const atmStrike = useMemo(() => {
    if (!strikes || strikes.length === 0) return null;
    let closest = strikes[0].strike;
    let minDiff = Math.abs(strikes[0].strike - spotPrice);
    for (const row of strikes) {
      const diff = Math.abs(row.strike - spotPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closest = row.strike;
      }
    }
    return closest;
  }, [strikes, spotPrice]);

  const hasExtraColumns = Object.values(visibleColumns).some(Boolean);

  return (
    <div className="flex flex-col h-full bg-[#0B132B]/80 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
      {/* Table Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Option Chain
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {strikes.length} Strikes
          </span>
        </div>

        {/* Columns Customizer */}
        <div className="relative">
          <button
            onClick={() => setColumnsDropdownOpen(!columnsDropdownOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-lg border transition ${
              hasExtraColumns
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Columns</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {columnsDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 font-mono text-xs">
              <div className="text-[10px] text-slate-400 px-2 py-1 font-sans uppercase font-semibold">
                Advanced Greeks & Data
              </div>
              {[
                { key: "iv", label: "IV (%)" },
                { key: "delta", label: "Delta (Δ)" },
                { key: "theta", label: "Theta (θ)" },
                { key: "gamma", label: "Gamma (Γ)" },
                { key: "vega", label: "Vega (ν)" },
                { key: "volume", label: "Volume" },
                { key: "oi_change", label: "OI Change" },
                { key: "bid_ask", label: "Bid / Ask" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => onToggleColumn(item.key as OptionalColumn)}
                  className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition"
                >
                  <span>{item.label}</span>
                  {visibleColumns[item.key as OptionalColumn] && (
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[600px] min-h-[400px]">
        <table className="w-full text-left font-mono text-xs border-collapse">
          {/* Table Header Row */}
          <thead className="sticky top-0 z-20 bg-slate-900/95 text-slate-400 border-b border-slate-800 shadow-md">
            <tr>
              {/* CALL SIDES */}
              {visibleColumns.delta && <th className="py-2.5 px-2 text-right font-semibold text-cyan-400/80">Δ</th>}
              {visibleColumns.theta && <th className="py-2.5 px-2 text-right font-semibold text-rose-400/80">θ</th>}
              {visibleColumns.iv && <th className="py-2.5 px-2 text-right font-semibold text-amber-400/80">IV</th>}
              {visibleColumns.volume && <th className="py-2.5 px-2 text-right font-semibold">Vol</th>}
              {visibleColumns.oi_change && <th className="py-2.5 px-2 text-right font-semibold">OI Chg</th>}
              <th className="py-2.5 px-3 text-right font-bold text-slate-300">CALL OI</th>
              <th className="py-2.5 px-4 text-right font-bold text-emerald-400 bg-emerald-950/20">CALL LTP</th>

              {/* STRIKE CENTER */}
              <th className="py-2.5 px-4 text-center font-extrabold text-white bg-slate-950/90 border-x border-slate-800">
                STRIKE
              </th>

              {/* PUT SIDES */}
              <th className="py-2.5 px-4 text-left font-bold text-rose-400 bg-rose-950/20">PUT LTP</th>
              <th className="py-2.5 px-3 text-left font-bold text-slate-300">PUT OI</th>
              {visibleColumns.oi_change && <th className="py-2.5 px-2 text-left font-semibold">OI Chg</th>}
              {visibleColumns.volume && <th className="py-2.5 px-2 text-left font-semibold">Vol</th>}
              {visibleColumns.iv && <th className="py-2.5 px-2 text-left font-semibold text-amber-400/80">IV</th>}
              {visibleColumns.theta && <th className="py-2.5 px-2 text-left font-semibold text-rose-400/80">θ</th>}
              {visibleColumns.delta && <th className="py-2.5 px-2 text-left font-semibold text-cyan-400/80">Δ</th>}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/40">
            {isLoading ? (
              <tr>
                <td colSpan={15} className="py-16 text-center text-slate-400 font-mono">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span>Loading canonical option chain...</span>
                  </div>
                </td>
              </tr>
            ) : strikes.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-12 text-center text-slate-400 font-mono">
                  No strikes available for this underlying and expiry.
                </td>
              </tr>
            ) : (
              strikes.map((row) => {
                const isATM = row.strike === atmStrike || row.is_atm;
                const isCallSelected = selectedStrike === row.strike && selectedOptionType === "CE";
                const isPutSelected = selectedStrike === row.strike && selectedOptionType === "PE";
                const isITMCall = row.strike < spotPrice;
                const isITMPut = row.strike > spotPrice;

                return (
                  <tr
                    key={row.strike}
                    className={`transition-colors group ${
                      isATM
                        ? "bg-amber-500/10 font-bold border-y border-amber-500/30"
                        : "hover:bg-slate-800/30"
                    }`}
                  >
                    {/* CALL OPTIONAL GREEKS */}
                    {visibleColumns.delta && (
                      <td className="py-2 px-2 text-right text-slate-400 text-[11px]">
                        {formatGreek(row.ce?.delta, 2)}
                      </td>
                    )}
                    {visibleColumns.theta && (
                      <td className="py-2 px-2 text-right text-rose-400/80 text-[11px]">
                        {formatGreek(row.ce?.theta, 1)}
                      </td>
                    )}
                    {visibleColumns.iv && (
                      <td className="py-2 px-2 text-right text-amber-400/90 text-[11px]">
                        {row.ce?.iv ? `${row.ce.iv.toFixed(1)}%` : "—"}
                      </td>
                    )}
                    {visibleColumns.volume && (
                      <td className="py-2 px-2 text-right text-slate-400 text-[11px]">
                        {formatNumberShort(row.ce?.volume)}
                      </td>
                    )}
                    {visibleColumns.oi_change && (
                      <td
                        className={`py-2 px-2 text-right text-[11px] ${
                          (row.ce?.change_in_oi || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {(row.ce?.change_in_oi || 0) > 0 ? "+" : ""}
                        {formatNumberShort(row.ce?.change_in_oi)}
                      </td>
                    )}

                    {/* CALL OI */}
                    <td className="py-2 px-3 text-right text-slate-300 font-mono">
                      {formatNumberShort(row.ce?.open_interest)}
                    </td>

                    {/* CALL LTP (CLICKABLE) */}
                    <td
                      onClick={() => onSelectOption(row.strike, "CE", row.ce?.ltp || 0, row.ce)}
                      className={`py-2 px-4 text-right cursor-pointer transition select-none ${
                        isCallSelected
                          ? "bg-emerald-500 text-slate-950 font-extrabold shadow-inner"
                          : isITMCall
                          ? "bg-emerald-950/25 text-emerald-300 hover:bg-emerald-900/40"
                          : "text-emerald-400 hover:bg-emerald-950/40"
                      }`}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-bold">{formatPrice(row.ce?.ltp, currencySymbol)}</span>
                      </div>
                    </td>

                    {/* STRIKE (CENTER) */}
                    <td className="py-2 px-4 text-center font-extrabold text-white bg-slate-950/80 border-x border-slate-800">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{row.strike.toLocaleString()}</span>
                        {isATM && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black tracking-tighter">
                            ATM
                          </span>
                        )}
                      </div>
                    </td>

                    {/* PUT LTP (CLICKABLE) */}
                    <td
                      onClick={() => onSelectOption(row.strike, "PE", row.pe?.ltp || 0, row.pe)}
                      className={`py-2 px-4 text-left cursor-pointer transition select-none ${
                        isPutSelected
                          ? "bg-rose-500 text-white font-extrabold shadow-inner"
                          : isITMPut
                          ? "bg-rose-950/25 text-rose-300 hover:bg-rose-900/40"
                          : "text-rose-400 hover:bg-rose-950/40"
                      }`}
                    >
                      <div className="flex items-center justify-start gap-1">
                        <span className="font-bold">{formatPrice(row.pe?.ltp, currencySymbol)}</span>
                      </div>
                    </td>

                    {/* PUT OI */}
                    <td className="py-2 px-3 text-left text-slate-300 font-mono">
                      {formatNumberShort(row.pe?.open_interest)}
                    </td>

                    {/* PUT OPTIONAL GREEKS */}
                    {visibleColumns.oi_change && (
                      <td
                        className={`py-2 px-2 text-left text-[11px] ${
                          (row.pe?.change_in_oi || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {(row.pe?.change_in_oi || 0) > 0 ? "+" : ""}
                        {formatNumberShort(row.pe?.change_in_oi)}
                      </td>
                    )}
                    {visibleColumns.volume && (
                      <td className="py-2 px-2 text-left text-slate-400 text-[11px]">
                        {formatNumberShort(row.pe?.volume)}
                      </td>
                    )}
                    {visibleColumns.iv && (
                      <td className="py-2 px-2 text-left text-amber-400/90 text-[11px]">
                        {row.pe?.iv ? `${row.pe.iv.toFixed(1)}%` : "—"}
                      </td>
                    )}
                    {visibleColumns.theta && (
                      <td className="py-2 px-2 text-left text-rose-400/80 text-[11px]">
                        {formatGreek(row.pe?.theta, 1)}
                      </td>
                    )}
                    {visibleColumns.delta && (
                      <td className="py-2 px-2 text-left text-cyan-400/80 text-[11px]">
                        {formatGreek(row.pe?.delta, 2)}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Legend */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-950/60 border border-emerald-500/40" />
            <span>Call ITM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-950/60 border border-rose-500/40" />
            <span>Put ITM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-500/60" />
            <span>ATM Strike</span>
          </div>
        </div>
        <div className="text-slate-500 text-[10px]">
          Click any Call or Put price to instantly populate the order ticket
        </div>
      </div>
    </div>
  );
}
