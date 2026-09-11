"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  MessageSquare,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { TradeRecord } from "@/types/pnl-journal";

interface TradeJournalTableDeskProps {
  trades: TradeRecord[];
  onSelectTrade: (trade: TradeRecord) => void;
  currencySymbol?: string;
}

export const TradeJournalTableDesk: React.FC<TradeJournalTableDeskProps> = ({
  trades,
  onSelectTrade,
  currencySymbol = "₹",
}) => {
  const [sortField, setSortField] = useState<keyof TradeRecord>("entryTimestamp");
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const handleSort = (field: keyof TradeRecord) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "ASC" ? "DESC" : "ASC");
    } else {
      setSortField(field);
      setSortDirection("DESC");
    }
  };

  const sortedTrades = useMemo(() => {
    const list = [...trades];
    list.sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "ASC" ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === "ASC"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return list;
  }, [trades, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedTrades.length / pageSize) || 1;
  const paginatedTrades = sortedTrades.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatMoney = (val: number) => {
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    let str = "";
    if (absVal >= 100000) {
      str = `${(absVal / 100000).toFixed(2)}L`;
    } else if (absVal >= 1000) {
      str = `${(absVal / 1000).toFixed(1)}K`;
    } else {
      str = absVal.toFixed(2);
    }
    return `${isNeg ? "-" : "+"}${currencySymbol}${str}`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "-";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-md flex flex-col gap-3">
      {/* Table Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Trade Journal & Execution Log
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {trades.length} Records
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Click any trade row for tick-by-tick order fills, fee breakdown & trade autopsy
            </p>
          </div>
        </div>

        {/* Pagination Indicator */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded text-slate-200"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded text-slate-200"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800/80">
        <table className="w-full text-left text-xs font-mono select-none">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th
                onClick={() => handleSort("entryTimestamp")}
                className="py-2.5 px-3 font-semibold cursor-pointer hover:text-slate-200"
              >
                Date / Time
              </th>
              <th
                onClick={() => handleSort("symbol")}
                className="py-2.5 px-3 font-semibold cursor-pointer hover:text-slate-200"
              >
                Symbol
              </th>
              <th className="py-2.5 px-3 font-semibold text-center">Side</th>
              <th className="py-2.5 px-3 font-semibold text-center">Broker</th>
              <th
                onClick={() => handleSort("quantity")}
                className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-slate-200"
              >
                Qty
              </th>
              <th
                onClick={() => handleSort("entryPrice")}
                className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-slate-200"
              >
                Entry Price
              </th>
              <th
                onClick={() => handleSort("exitPrice")}
                className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-slate-200"
              >
                Exit Price
              </th>
              <th
                onClick={() => handleSort("grossPnl")}
                className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-slate-200"
              >
                Gross P&L
              </th>
              <th
                onClick={() => handleSort("totalCharges")}
                className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-slate-200"
              >
                Charges
              </th>
              <th
                onClick={() => handleSort("netPnl")}
                className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-slate-200"
              >
                Net P&L
              </th>
              <th
                onClick={() => handleSort("rMultiple")}
                className="py-2.5 px-3 font-semibold text-center cursor-pointer hover:text-slate-200"
              >
                R-Mult
              </th>
              <th className="py-2.5 px-3 font-semibold text-center">Duration</th>
              <th className="py-2.5 px-3 font-semibold">Strategy</th>
              <th className="py-2.5 px-3 font-semibold text-center">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
            {paginatedTrades.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-8 text-center text-slate-500">
                  No trades match the current filter criteria.
                </td>
              </tr>
            ) : (
              paginatedTrades.map((t) => {
                const isProfit = t.netPnl > 0;
                const isLoss = t.netPnl < 0;

                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTrade(t)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(t.entryTimestamp).toLocaleString("en-IN", {
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Symbol */}
                    <td className="py-2.5 px-3 font-bold text-slate-200 whitespace-nowrap flex items-center gap-1.5">
                      <span>{t.symbol}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {t.assetClass}
                      </span>
                    </td>

                    {/* Side */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.side === "BUY"
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                            : "bg-rose-950/80 text-rose-400 border border-rose-800/60"
                        }`}
                      >
                        {t.side === "BUY" ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {t.side}
                      </span>
                    </td>

                    {/* Broker */}
                    <td className="py-2.5 px-3 text-center text-slate-300">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {t.broker}
                      </span>
                    </td>

                    {/* Qty */}
                    <td className="py-2.5 px-3 text-right text-slate-300 font-medium">
                      {t.quantity}
                    </td>

                    {/* Entry Price */}
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {currencySymbol}{t.entryPrice.toFixed(2)}
                    </td>

                    {/* Exit Price */}
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {t.exitPrice ? `${currencySymbol}${t.exitPrice.toFixed(2)}` : (
                        <span className="text-cyan-400 italic">OPEN</span>
                      )}
                    </td>

                    {/* Gross P&L */}
                    <td className={`py-2.5 px-3 text-right font-medium ${
                      t.grossPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {formatMoney(t.grossPnl)}
                    </td>

                    {/* Charges */}
                    <td className="py-2.5 px-3 text-right text-amber-400">
                      {currencySymbol}{t.totalCharges.toFixed(2)}
                    </td>

                    {/* Net P&L */}
                    <td className={`py-2.5 px-3 text-right font-bold ${
                      isProfit ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-slate-400"
                    }`}>
                      {formatMoney(t.netPnl)}
                    </td>

                    {/* R-Multiple */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          t.rMultiple && t.rMultiple > 0
                            ? "text-emerald-400 bg-emerald-950/40"
                            : "text-rose-400 bg-rose-950/40"
                        }`}
                      >
                        {t.rMultiple !== undefined
                          ? t.rMultiple > 0
                            ? `+${t.rMultiple.toFixed(1)}R`
                            : `${t.rMultiple.toFixed(1)}R`
                          : "-"}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="py-2.5 px-3 text-center text-slate-400 text-[11px]">
                      {formatDuration(t.holdingDurationSeconds)}
                    </td>

                    {/* Strategy */}
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[120px]">{t.strategy}</span>
                        {t.notes && <MessageSquare className="w-3 h-3 text-cyan-400 shrink-0" />}
                      </div>
                    </td>

                    {/* Inspect Icon */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-cyan-400 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
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
