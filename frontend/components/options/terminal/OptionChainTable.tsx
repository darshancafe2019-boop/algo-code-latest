"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Activity,
  Zap,
  Info,
  Layers,
} from "lucide-react";
import {
  OptionStrikeRowData,
  OptionContractQuote,
  ColumnVisibilityConfig,
  OIBuildupType,
} from "@/types/option-terminal";
import {
  formatIndianCurrency,
  formatIndianQuantity,
} from "@/lib/options/options-analytics-engine";

interface OptionChainTableProps {
  strikes: OptionStrikeRowData[];
  spotPrice: number;
  atmStrike: number;
  currency?: string;
  columnConfig: ColumnVisibilityConfig;
  selectedStrike?: number | null;
  selectedOptionType?: "CE" | "PE" | null;
  onSelectOption: (strike: number, type: "CE" | "PE", quote: OptionContractQuote) => void;
  onQuickTrade?: (strike: number, type: "CE" | "PE", side: "BUY" | "SELL", ltp: number) => void;
}

type SortField =
  | "strike"
  | "call_oi"
  | "call_oiChange"
  | "call_volume"
  | "call_iv"
  | "call_ltp"
  | "call_delta"
  | "call_theta"
  | "call_volumeOiRatio"
  | "put_ltp"
  | "put_iv"
  | "put_volume"
  | "put_oiChange"
  | "put_oi"
  | "put_delta"
  | "put_theta"
  | "put_volumeOiRatio";

export const OptionChainTable: React.FC<OptionChainTableProps> = ({
  strikes,
  spotPrice,
  atmStrike,
  currency = "₹",
  columnConfig,
  selectedStrike,
  selectedOptionType,
  onSelectOption,
  onQuickTrade,
}) => {
  const [sortField, setSortField] = useState<SortField>("strike");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleHeaderSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedStrikes = useMemo(() => {
    const sorted = [...strikes];
    sorted.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      switch (sortField) {
        case "strike":
          valA = a.strike;
          valB = b.strike;
          break;
        case "call_oi":
          valA = a.call?.oi || 0;
          valB = b.call?.oi || 0;
          break;
        case "call_oiChange":
          valA = a.call?.oiChange || 0;
          valB = b.call?.oiChange || 0;
          break;
        case "call_volume":
          valA = a.call?.volume || 0;
          valB = b.call?.volume || 0;
          break;
        case "call_iv":
          valA = a.call?.iv || 0;
          valB = b.call?.iv || 0;
          break;
        case "call_ltp":
          valA = a.call?.ltp || 0;
          valB = b.call?.ltp || 0;
          break;
        case "call_delta":
          valA = a.call?.greeks?.delta || 0;
          valB = b.call?.greeks?.delta || 0;
          break;
        case "call_theta":
          valA = a.call?.greeks?.theta || 0;
          valB = b.call?.greeks?.theta || 0;
          break;
        case "call_volumeOiRatio":
          valA = a.call?.volumeOiRatio || 0;
          valB = b.call?.volumeOiRatio || 0;
          break;
        case "put_ltp":
          valA = a.put?.ltp || 0;
          valB = b.put?.ltp || 0;
          break;
        case "put_iv":
          valA = a.put?.iv || 0;
          valB = b.put?.iv || 0;
          break;
        case "put_volume":
          valA = a.put?.volume || 0;
          valB = b.put?.volume || 0;
          break;
        case "put_oiChange":
          valA = a.put?.oiChange || 0;
          valB = b.put?.oiChange || 0;
          break;
        case "put_oi":
          valA = a.put?.oi || 0;
          valB = b.put?.oi || 0;
          break;
        case "put_delta":
          valA = a.put?.greeks?.delta || 0;
          valB = b.put?.greeks?.delta || 0;
          break;
        case "put_theta":
          valA = a.put?.greeks?.theta || 0;
          valB = b.put?.greeks?.theta || 0;
          break;
        case "put_volumeOiRatio":
          valA = a.put?.volumeOiRatio || 0;
          valB = b.put?.volumeOiRatio || 0;
          break;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [strikes, sortField, sortDirection]);

  const renderBuildupBadge = (buildup: OIBuildupType | undefined) => {
    switch (buildup) {
      case "LONG_BUILDUP":
        return (
          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            LB
          </span>
        );
      case "SHORT_BUILDUP":
        return (
          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            SB
          </span>
        );
      case "LONG_UNWINDING":
        return (
          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            LU
          </span>
        );
      case "SHORT_COVERING":
        return (
          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            SC
          </span>
        );
      default:
        return <span className="text-slate-600 text-[9px]">—</span>;
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 text-cyan-400 inline ml-0.5" />
    ) : (
      <ArrowDown className="w-3 h-3 text-cyan-400 inline ml-0.5" />
    );
  };

  return (
    <div className="bg-[#090E17] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl font-mono text-xs select-none">
      {/* Table Container with Horizontal Scroll and Sticky Header */}
      <div className="overflow-x-auto max-h-[72vh] relative">
        <table className="w-full text-left border-collapse">
          {/* Top Level Group Header */}
          <thead className="sticky top-0 z-30 bg-[#060A12] border-b border-slate-800">
            <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {/* Calls Side Banner */}
              <th
                colSpan={15}
                className="py-1.5 px-4 text-center bg-rose-950/30 text-rose-300 border-r border-slate-800/80"
              >
                CALL OPTIONS (CE)
              </th>

              {/* Center Strike Banner */}
              <th className="py-1.5 px-4 text-center bg-purple-950/40 text-purple-300 font-extrabold border-x border-slate-800 min-w-[120px]">
                STRIKE LADDER
              </th>

              {/* Puts Side Banner */}
              <th
                colSpan={15}
                className="py-1.5 px-4 text-center bg-emerald-950/30 text-emerald-300 border-l border-slate-800/80"
              >
                PUT OPTIONS (PE)
              </th>
            </tr>

            {/* Detailed Column Headers */}
            <tr className="bg-[#0B1222] text-[10px] text-slate-400 border-b border-slate-800 uppercase tracking-tight">
              {/* CALLS COLUMNS */}
              {columnConfig.oi && (
                <th
                  onClick={() => handleHeaderSort("call_oi")}
                  className="py-2 px-2 text-right cursor-pointer hover:text-white"
                >
                  OI {renderSortIndicator("call_oi")}
                </th>
              )}
              {columnConfig.oiChange && (
                <th
                  onClick={() => handleHeaderSort("call_oiChange")}
                  className="py-2 px-2 text-right cursor-pointer hover:text-white"
                >
                  ΔOI {renderSortIndicator("call_oiChange")}
                </th>
              )}
              {columnConfig.volume && (
                <th
                  onClick={() => handleHeaderSort("call_volume")}
                  className="py-2 px-2 text-right cursor-pointer hover:text-white"
                >
                  Vol {renderSortIndicator("call_volume")}
                </th>
              )}
              {columnConfig.volumeOiRatio && (
                <th
                  onClick={() => handleHeaderSort("call_volumeOiRatio")}
                  className="py-2 px-1.5 text-right cursor-pointer hover:text-white"
                >
                  V/OI {renderSortIndicator("call_volumeOiRatio")}
                </th>
              )}
              {columnConfig.buildupBadge && (
                <th className="py-2 px-1.5 text-center text-slate-400">Buildup</th>
              )}
              {columnConfig.iv && (
                <th
                  onClick={() => handleHeaderSort("call_iv")}
                  className="py-2 px-2 text-right cursor-pointer hover:text-white"
                >
                  IV% {renderSortIndicator("call_iv")}
                </th>
              )}
              {columnConfig.delta && (
                <th
                  onClick={() => handleHeaderSort("call_delta")}
                  className="py-2 px-1.5 text-right cursor-pointer hover:text-white text-purple-300"
                >
                  Δ {renderSortIndicator("call_delta")}
                </th>
              )}
              {columnConfig.theta && (
                <th
                  onClick={() => handleHeaderSort("call_theta")}
                  className="py-2 px-1.5 text-right cursor-pointer hover:text-white text-purple-300"
                >
                  Θ {renderSortIndicator("call_theta")}
                </th>
              )}
              {columnConfig.bid && <th className="py-2 px-2 text-right text-slate-400">Bid</th>}
              {columnConfig.ask && <th className="py-2 px-2 text-right text-slate-400">Ask</th>}
              {columnConfig.ltp && (
                <th
                  onClick={() => handleHeaderSort("call_ltp")}
                  className="py-2 px-2.5 text-right cursor-pointer text-rose-300 font-bold hover:text-white"
                >
                  LTP {renderSortIndicator("call_ltp")}
                </th>
              )}
              {columnConfig.change && <th className="py-2 px-2 text-right text-slate-400">Chg</th>}
              {columnConfig.changePercent && <th className="py-2 px-2 text-right text-slate-400">Chg%</th>}

              {/* CENTER STRIKE HEADER */}
              <th
                onClick={() => handleHeaderSort("strike")}
                className="py-2 px-3 text-center bg-slate-900 font-bold text-white border-x border-slate-800 cursor-pointer hover:text-cyan-300"
              >
                STRIKE {renderSortIndicator("strike")}
              </th>

              {/* PUTS COLUMNS */}
              {columnConfig.ltp && (
                <th
                  onClick={() => handleHeaderSort("put_ltp")}
                  className="py-2 px-2.5 text-left cursor-pointer text-emerald-300 font-bold hover:text-white"
                >
                  LTP {renderSortIndicator("put_ltp")}
                </th>
              )}
              {columnConfig.change && <th className="py-2 px-2 text-left text-slate-400">Chg</th>}
              {columnConfig.changePercent && <th className="py-2 px-2 text-left text-slate-400">Chg%</th>}
              {columnConfig.bid && <th className="py-2 px-2 text-left text-slate-400">Bid</th>}
              {columnConfig.ask && <th className="py-2 px-2 text-left text-slate-400">Ask</th>}
              {columnConfig.delta && (
                <th
                  onClick={() => handleHeaderSort("put_delta")}
                  className="py-2 px-1.5 text-left cursor-pointer hover:text-white text-purple-300"
                >
                  Δ {renderSortIndicator("put_delta")}
                </th>
              )}
              {columnConfig.theta && (
                <th
                  onClick={() => handleHeaderSort("put_theta")}
                  className="py-2 px-1.5 text-left cursor-pointer hover:text-white text-purple-300"
                >
                  Θ {renderSortIndicator("put_theta")}
                </th>
              )}
              {columnConfig.iv && (
                <th
                  onClick={() => handleHeaderSort("put_iv")}
                  className="py-2 px-2 text-left cursor-pointer hover:text-white"
                >
                  IV% {renderSortIndicator("put_iv")}
                </th>
              )}
              {columnConfig.buildupBadge && (
                <th className="py-2 px-1.5 text-center text-slate-400">Buildup</th>
              )}
              {columnConfig.volumeOiRatio && (
                <th
                  onClick={() => handleHeaderSort("put_volumeOiRatio")}
                  className="py-2 px-1.5 text-left cursor-pointer hover:text-white"
                >
                  V/OI {renderSortIndicator("put_volumeOiRatio")}
                </th>
              )}
              {columnConfig.volume && (
                <th
                  onClick={() => handleHeaderSort("put_volume")}
                  className="py-2 px-2 text-left cursor-pointer hover:text-white"
                >
                  Vol {renderSortIndicator("put_volume")}
                </th>
              )}
              {columnConfig.oiChange && (
                <th
                  onClick={() => handleHeaderSort("put_oiChange")}
                  className="py-2 px-2 text-left cursor-pointer hover:text-white"
                >
                  ΔOI {renderSortIndicator("put_oiChange")}
                </th>
              )}
              {columnConfig.oi && (
                <th
                  onClick={() => handleHeaderSort("put_oi")}
                  className="py-2 px-2 text-left cursor-pointer hover:text-white"
                >
                  OI {renderSortIndicator("put_oi")}
                </th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {sortedStrikes.length === 0 ? (
              <tr>
                <td colSpan={30} className="py-12 text-center text-slate-500">
                  No options contracts matching filter criteria.
                </td>
              </tr>
            ) : (
              sortedStrikes.map((row) => {
                const isATM = row.isATM;
                const call = row.call;
                const put = row.put;

                const isCallSelected = selectedStrike === row.strike && selectedOptionType === "CE";
                const isPutSelected = selectedStrike === row.strike && selectedOptionType === "PE";

                // Background tint for ITM
                const callBgClass =
                  row.moneynessCall === "ITM"
                    ? "bg-rose-950/15"
                    : isATM
                    ? "bg-purple-950/20"
                    : "bg-transparent";

                const putBgClass =
                  row.moneynessPut === "ITM"
                    ? "bg-emerald-950/15"
                    : isATM
                    ? "bg-purple-950/20"
                    : "bg-transparent";

                return (
                  <tr
                    key={row.strike}
                    className={`transition-colors hover:bg-slate-800/40 ${
                      isATM ? "ring-1 ring-inset ring-purple-500/40 font-semibold" : ""
                    }`}
                  >
                    {/* CALLS CELLS */}
                    {columnConfig.oi && (
                      <td className={`py-1.5 px-2 text-right ${callBgClass} text-slate-200`}>
                        {call ? formatIndianQuantity(call.oi) : "—"}
                      </td>
                    )}
                    {columnConfig.oiChange && (
                      <td
                        className={`py-1.5 px-2 text-right ${callBgClass} ${
                          call && call.oiChange > 0
                            ? "text-emerald-400"
                            : call && call.oiChange < 0
                            ? "text-rose-400"
                            : "text-slate-400"
                        }`}
                      >
                        {call ? `${call.oiChange > 0 ? "+" : ""}${formatIndianQuantity(call.oiChange)}` : "—"}
                      </td>
                    )}
                    {columnConfig.volume && (
                      <td className={`py-1.5 px-2 text-right ${callBgClass} text-slate-400`}>
                        {call ? formatIndianQuantity(call.volume) : "—"}
                      </td>
                    )}
                    {columnConfig.volumeOiRatio && (
                      <td className={`py-1.5 px-1.5 text-right ${callBgClass} text-slate-300 font-bold`}>
                        {call ? `${call.volumeOiRatio.toFixed(1)}x` : "—"}
                      </td>
                    )}
                    {columnConfig.buildupBadge && (
                      <td className={`py-1.5 px-1.5 text-center ${callBgClass}`}>
                        {renderBuildupBadge(call?.oiBuildup)}
                      </td>
                    )}
                    {columnConfig.iv && (
                      <td className={`py-1.5 px-2 text-right ${callBgClass} text-slate-300`}>
                        {call?.iv ? `${call.iv.toFixed(1)}%` : "—"}
                      </td>
                    )}
                    {columnConfig.delta && (
                      <td className={`py-1.5 px-1.5 text-right ${callBgClass} text-purple-300 text-[11px]`}>
                        {call?.greeks?.delta !== undefined ? call.greeks.delta.toFixed(3) : "—"}
                      </td>
                    )}
                    {columnConfig.theta && (
                      <td className={`py-1.5 px-1.5 text-right ${callBgClass} text-rose-300 text-[11px]`}>
                        {call?.greeks?.theta !== undefined ? call.greeks.theta.toFixed(2) : "—"}
                      </td>
                    )}
                    {columnConfig.bid && (
                      <td className={`py-1.5 px-2 text-right ${callBgClass} text-slate-400 text-[11px]`}>
                        {call?.bid ? call.bid.toFixed(2) : "—"}
                      </td>
                    )}
                    {columnConfig.ask && (
                      <td className={`py-1.5 px-2 text-right ${callBgClass} text-slate-400 text-[11px]`}>
                        {call?.ask ? call.ask.toFixed(2) : "—"}
                      </td>
                    )}
                    {columnConfig.ltp && (
                      <td
                        onClick={() => call && onSelectOption(row.strike, "CE", call)}
                        className={`py-1.5 px-2.5 text-right cursor-pointer font-bold text-rose-300 hover:text-white ${callBgClass} ${
                          isCallSelected ? "ring-2 ring-cyan-400 bg-cyan-500/20" : ""
                        }`}
                      >
                        {call ? formatIndianCurrency(call.ltp, currency) : "—"}
                      </td>
                    )}
                    {columnConfig.change && (
                      <td
                        className={`py-1.5 px-2 text-right text-[11px] ${callBgClass} ${
                          call && call.change >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {call ? `${call.change >= 0 ? "+" : ""}${call.change.toFixed(2)}` : "—"}
                      </td>
                    )}
                    {columnConfig.changePercent && (
                      <td
                        className={`py-1.5 px-2 text-right text-[11px] ${callBgClass} ${
                          call && call.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {call ? `${call.changePercent >= 0 ? "+" : ""}${call.changePercent.toFixed(2)}%` : "—"}
                      </td>
                    )}

                    {/* CENTER STRIKE COLUMN */}
                    <td className="py-1.5 px-3 text-center bg-slate-900 font-extrabold text-white border-x border-slate-800">
                      <div className="flex items-center justify-center gap-1">
                        {isATM && <span className="text-[8px] font-bold text-cyan-400">← ITM</span>}
                        <span className={isATM ? "text-cyan-300 font-black text-sm" : ""}>
                          {row.strike.toLocaleString("en-IN")}
                        </span>
                        {isATM && (
                          <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-cyan-500 text-slate-950">
                            ATM
                          </span>
                        )}
                        {isATM && <span className="text-[8px] font-bold text-cyan-400">OTM →</span>}
                      </div>
                    </td>

                    {/* PUTS CELLS */}
                    {columnConfig.ltp && (
                      <td
                        onClick={() => put && onSelectOption(row.strike, "PE", put)}
                        className={`py-1.5 px-2.5 text-left cursor-pointer font-bold text-emerald-300 hover:text-white ${putBgClass} ${
                          isPutSelected ? "ring-2 ring-cyan-400 bg-cyan-500/20" : ""
                        }`}
                      >
                        {put ? formatIndianCurrency(put.ltp, currency) : "—"}
                      </td>
                    )}
                    {columnConfig.change && (
                      <td
                        className={`py-1.5 px-2 text-left text-[11px] ${putBgClass} ${
                          put && put.change >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {put ? `${put.change >= 0 ? "+" : ""}${put.change.toFixed(2)}` : "—"}
                      </td>
                    )}
                    {columnConfig.changePercent && (
                      <td
                        className={`py-1.5 px-2 text-left text-[11px] ${putBgClass} ${
                          put && put.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {put ? `${put.changePercent >= 0 ? "+" : ""}${put.changePercent.toFixed(2)}%` : "—"}
                      </td>
                    )}
                    {columnConfig.bid && (
                      <td className={`py-1.5 px-2 text-left ${putBgClass} text-slate-400 text-[11px]`}>
                        {put?.bid ? put.bid.toFixed(2) : "—"}
                      </td>
                    )}
                    {columnConfig.ask && (
                      <td className={`py-1.5 px-2 text-left ${putBgClass} text-slate-400 text-[11px]`}>
                        {put?.ask ? put.ask.toFixed(2) : "—"}
                      </td>
                    )}
                    {columnConfig.delta && (
                      <td className={`py-1.5 px-1.5 text-left ${putBgClass} text-purple-300 text-[11px]`}>
                        {put?.greeks?.delta !== undefined ? put.greeks.delta.toFixed(3) : "—"}
                      </td>
                    )}
                    {columnConfig.theta && (
                      <td className={`py-1.5 px-1.5 text-left ${putBgClass} text-rose-300 text-[11px]`}>
                        {put?.greeks?.theta !== undefined ? put.greeks.theta.toFixed(2) : "—"}
                      </td>
                    )}
                    {columnConfig.iv && (
                      <td className={`py-1.5 px-2 text-left ${putBgClass} text-slate-300`}>
                        {put?.iv ? `${put.iv.toFixed(1)}%` : "—"}
                      </td>
                    )}
                    {columnConfig.buildupBadge && (
                      <td className={`py-1.5 px-1.5 text-center ${putBgClass}`}>
                        {renderBuildupBadge(put?.oiBuildup)}
                      </td>
                    )}
                    {columnConfig.volumeOiRatio && (
                      <td className={`py-1.5 px-1.5 text-left ${putBgClass} text-slate-300 font-bold`}>
                        {put ? `${put.volumeOiRatio.toFixed(1)}x` : "—"}
                      </td>
                    )}
                    {columnConfig.volume && (
                      <td className={`py-1.5 px-2 text-left ${putBgClass} text-slate-400`}>
                        {put ? formatIndianQuantity(put.volume) : "—"}
                      </td>
                    )}
                    {columnConfig.oiChange && (
                      <td
                        className={`py-1.5 px-2 text-left ${putBgClass} ${
                          put && put.oiChange > 0
                            ? "text-emerald-400"
                            : put && put.oiChange < 0
                            ? "text-rose-400"
                            : "text-slate-400"
                        }`}
                      >
                        {put ? `${put.oiChange > 0 ? "+" : ""}${formatIndianQuantity(put.oiChange)}` : "—"}
                      </td>
                    )}
                    {columnConfig.oi && (
                      <td className={`py-1.5 px-2 text-left ${putBgClass} text-slate-200`}>
                        {put ? formatIndianQuantity(put.oi) : "—"}
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
  );
};
