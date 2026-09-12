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
  BookOpen,
  Target,
} from "lucide-react";
import {
  OptionStrikeRowData,
  OptionContractQuote,
  ColumnVisibilityConfig,
  OIBuildupType,
  ActionableOptionContract,
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
  underlying?: string;
  selectedExpiry?: string;
  source?: string;
  columnConfig: ColumnVisibilityConfig;
  selectedStrike?: number | null;
  selectedOptionType?: "CE" | "PE" | null;
  positions?: any[];
  onSelectOption: (strike: number, type: "CE" | "PE", quote: OptionContractQuote) => void;
  onQuickTrade?: (strike: number, type: "CE" | "PE", side: "BUY" | "SELL", ltp: number) => void;
  onActionBuy?: (contract: ActionableOptionContract) => void;
  onActionSell?: (contract: ActionableOptionContract) => void;
  onActionDepth?: (contract: ActionableOptionContract) => void;
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
  underlying = "BTC",
  selectedExpiry = "",
  source = "DELTA_INDIA",
  columnConfig,
  selectedStrike,
  selectedOptionType,
  positions = [],
  onSelectOption,
  onQuickTrade,
  onActionBuy,
  onActionSell,
  onActionDepth,
}) => {
  const [sortField, setSortField] = useState<SortField>("strike");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const isCrypto = ["BTC", "ETH", "SOL", "XRP"].includes(underlying);

  // Helper to construct canonical ActionableOptionContract
  const resolveContract = (
    strike: number,
    type: "CE" | "PE",
    quote: OptionContractQuote,
    side: "BUY" | "SELL"
  ): ActionableOptionContract => {
    const rawBroker = quote.provider || source;
    const broker: "DELTA" | "DHAN" | "UPSTOX" | "PAPER" =
      rawBroker.toUpperCase().includes("DELTA") || isCrypto
        ? "DELTA"
        : rawBroker.toUpperCase().includes("UPSTOX")
        ? "UPSTOX"
        : "DHAN";

    const defaultLotSize = isCrypto
      ? 1
      : underlying.includes("BANKNIFTY")
      ? 15
      : underlying.includes("FINNIFTY")
      ? 25
      : underlying.includes("MIDCPNIFTY")
      ? 75
      : underlying.includes("SENSEX")
      ? 10
      : underlying.includes("NIFTY")
      ? 50
      : 1;

    const sym =
      quote.symbol ||
      (broker === "DELTA"
        ? `${type === "CE" ? "C" : "P"}-${underlying}-${strike}-${selectedExpiry.replace(/\s+/g, "")}`
        : `${underlying} ${strike} ${type}`);

    return {
      broker,
      source: quote.provider || source || (isCrypto ? "DELTA_EXCHANGE" : "DHAN"),
      symbol: sym,
      productId: quote.securityId || quote.instrumentId || strike,
      instrumentId: quote.instrumentId || quote.symbol,
      securityId: quote.securityId,
      underlying,
      expiry: selectedExpiry || quote.expiry,
      strike,
      optionType: type === "CE" ? "CALL" : "PUT",
      side,
      ltp: quote.ltp,
      bid: quote.bid > 0 ? quote.bid : quote.ltp,
      ask: quote.ask > 0 ? quote.ask : quote.ltp,
      bidSize: quote.bidQty,
      askSize: quote.askQty,
      markPrice: quote.ltp,
      iv: quote.iv,
      lotSize: defaultLotSize,
      delta: quote.greeks?.delta,
      gamma: quote.greeks?.gamma,
      theta: quote.greeks?.theta,
      vega: quote.greeks?.vega,
      oi: quote.oi,
      volume: quote.volume,
    };
  };

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
        default:
          valA = a.strike;
          valB = b.strike;
      }

      if (sortDirection === "asc") {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });
    return sorted;
  }, [strikes, sortField, sortDirection]);

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-30 group-hover:opacity-70" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 inline-block ml-1 text-cyan-400" />
    ) : (
      <ArrowDown className="w-3 h-3 inline-block ml-1 text-cyan-400" />
    );
  };

  const renderBuildupBadge = (buildup?: OIBuildupType) => {
    if (!buildup || buildup === "NEUTRAL") {
      return <span className="text-slate-600 text-[10px]">—</span>;
    }
    switch (buildup) {
      case "LONG_BUILDUP":
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            LB
          </span>
        );
      case "SHORT_BUILDUP":
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
            SB
          </span>
        );
      case "LONG_UNWINDING":
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            LU
          </span>
        );
      case "SHORT_COVERING":
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            SC
          </span>
        );
      default:
        return null;
    }
  };

  // Position lookup matching strike and option side
  const findPosition = (strike: number, type: "CE" | "PE") => {
    if (!positions || positions.length === 0) return null;
    return positions.find((p) => {
      const matchStrike = (p as any).strike === strike;
      const matchType = (p as any).optionType === (type === "CE" ? "CALL" : "PUT") || (p as any).optionType === type;
      const matchSym = p.symbol && (p.symbol.includes(String(strike)) && (p.symbol.includes(type) || p.symbol.includes(type === "CE" ? "CALL" : "PUT")));
      return (matchStrike && matchType) || matchSym;
    });
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
                colSpan={16}
                className="py-1.5 px-4 text-center bg-rose-950/30 text-rose-300 border-r border-slate-800/80"
              >
                CALL OPTIONS (CE)
              </th>

              {/* Center Strike Banner */}
              <th className="py-1.5 px-4 text-center bg-purple-950/40 text-purple-300 font-extrabold border-x border-slate-800 min-w-[130px]">
                STRIKE LADDER
              </th>

              {/* Puts Side Banner */}
              <th
                colSpan={16}
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

              {/* CALL DIRECT ACTIONS HEADER */}
              <th className="py-2 px-2 text-center bg-rose-950/20 text-rose-200 font-bold">
                Trade
              </th>

              {columnConfig.change && <th className="py-2 px-2 text-right text-slate-400">Chg</th>}
              {columnConfig.changePercent && <th className="py-2 px-2 text-right text-slate-400">Chg%</th>}

              {/* CENTER STRIKE HEADER */}
              <th
                onClick={() => handleHeaderSort("strike")}
                className="py-2 px-3 text-center bg-slate-900 font-bold text-white border-x border-slate-800 cursor-pointer hover:text-cyan-300"
              >
                STRIKE {renderSortIndicator("strike")}
              </th>

              {/* PUT DIRECT ACTIONS HEADER */}
              <th className="py-2 px-2 text-center bg-emerald-950/20 text-emerald-200 font-bold">
                Trade
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
                <td colSpan={34} className="py-12 text-center text-slate-500">
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

                const callPosition = findPosition(row.strike, "CE");
                const putPosition = findPosition(row.strike, "PE");

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
                    className={`transition-colors hover:bg-slate-800/40 group ${
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
                        title="Click to inspect Call quote"
                      >
                        {call ? formatIndianCurrency(call.ltp, currency) : "—"}
                      </td>
                    )}

                    {/* CALL DIRECT ACTIONS CELL */}
                    <td className={`py-1 px-1.5 text-right ${callBgClass} whitespace-nowrap`}>
                      {call ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onActionBuy) {
                                onActionBuy(resolveContract(row.strike, "CE", call, "BUY"));
                              } else if (onQuickTrade) {
                                onQuickTrade(row.strike, "CE", "BUY", call.ltp);
                              }
                            }}
                            className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] shadow-sm transition active:scale-95"
                            title="Buy Call Option"
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onActionSell) {
                                onActionSell(resolveContract(row.strike, "CE", call, "SELL"));
                              } else if (onQuickTrade) {
                                onQuickTrade(row.strike, "CE", "SELL", call.ltp);
                              }
                            }}
                            className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] shadow-sm transition active:scale-95"
                            title="Sell Call Option"
                          >
                            S
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onActionDepth) {
                                onActionDepth(resolveContract(row.strike, "CE", call, "BUY"));
                              }
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 hover:border-cyan-500/50 text-slate-400 border border-slate-700/80 transition"
                            title="View Call Market Depth / Order Book"
                          >
                            <BookOpen className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[10px]">—</span>
                      )}
                    </td>

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
                    <td className="py-1.5 px-2.5 text-center bg-slate-900 font-extrabold text-white border-x border-slate-800 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {callPosition && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                              callPosition.quantity > 0
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            }`}
                            title={`Held Call Position: ${callPosition.quantity} qty`}
                          >
                            POS:{callPosition.quantity > 0 ? `+${callPosition.quantity}` : callPosition.quantity}
                          </span>
                        )}

                        {isATM && <span className="text-[8px] font-bold text-cyan-400">←</span>}
                        <span className={isATM ? "text-cyan-300 font-black text-sm" : ""}>
                          {row.strike.toLocaleString("en-IN")}
                        </span>
                        {isATM && (
                          <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-cyan-500 text-slate-950">
                            ATM
                          </span>
                        )}
                        {isATM && <span className="text-[8px] font-bold text-cyan-400">→</span>}

                        {putPosition && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                              putPosition.quantity > 0
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            }`}
                            title={`Held Put Position: ${putPosition.quantity} qty`}
                          >
                            POS:{putPosition.quantity > 0 ? `+${putPosition.quantity}` : putPosition.quantity}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* PUT DIRECT ACTIONS CELL */}
                    <td className={`py-1 px-1.5 text-left ${putBgClass} whitespace-nowrap`}>
                      {put ? (
                        <div className="flex items-center justify-start gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onActionDepth) {
                                onActionDepth(resolveContract(row.strike, "PE", put, "BUY"));
                              }
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 hover:border-cyan-500/50 text-slate-400 border border-slate-700/80 transition"
                            title="View Put Market Depth / Order Book"
                          >
                            <BookOpen className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onActionBuy) {
                                onActionBuy(resolveContract(row.strike, "PE", put, "BUY"));
                              } else if (onQuickTrade) {
                                onQuickTrade(row.strike, "PE", "BUY", put.ltp);
                              }
                            }}
                            className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] shadow-sm transition active:scale-95"
                            title="Buy Put Option"
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onActionSell) {
                                onActionSell(resolveContract(row.strike, "PE", put, "SELL"));
                              } else if (onQuickTrade) {
                                onQuickTrade(row.strike, "PE", "SELL", put.ltp);
                              }
                            }}
                            className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] shadow-sm transition active:scale-95"
                            title="Sell Put Option"
                          >
                            S
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[10px]">—</span>
                      )}
                    </td>

                    {/* PUTS CELLS */}
                    {columnConfig.ltp && (
                      <td
                        onClick={() => put && onSelectOption(row.strike, "PE", put)}
                        className={`py-1.5 px-2.5 text-left cursor-pointer font-bold text-emerald-300 hover:text-white ${putBgClass} ${
                          isPutSelected ? "ring-2 ring-cyan-400 bg-cyan-500/20" : ""
                        }`}
                        title="Click to inspect Put quote"
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
