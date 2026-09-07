"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  Radio,
  Clock,
  Zap,
} from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/formatters";
import { SpreadsheetTradeRow, TradeAuditDrawer } from "./TradeAuditDrawer";

interface SpreadsheetTradeLedgerTableProps {
  trades?: SpreadsheetTradeRow[];
  openPositions?: any[];
  currencySymbol?: string;
  isFetching?: boolean;
}

export function SpreadsheetTradeLedgerTable({
  trades = [],
  openPositions = [],
  currencySymbol = "₹",
  isFetching = false,
}: SpreadsheetTradeLedgerTableProps) {
  const [activeTab, setActiveTab] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sideFilter, setSideFilter] = useState("ALL");
  const [sortField, setSortField] = useState<keyof SpreadsheetTradeRow>("id");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedTrade, setSelectedTrade] = useState<SpreadsheetTradeRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filtered List
  const filtered = useMemo(() => {
    return trades.filter((t) => {
      // Tab filter
      if (activeTab === "OPEN" && t.status !== "OPEN") return false;
      if (activeTab === "CLOSED" && t.status !== "CLOSED") return false;

      // Side filter
      if (sideFilter === "LONG" && t.direction !== "LONG" && t.direction !== "BUY") return false;
      if (sideFilter === "SHORT" && t.direction !== "SHORT" && t.direction !== "SELL") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          t.symbol.toLowerCase().includes(q) ||
          t.broker.toLowerCase().includes(q) ||
          t.strategy.toLowerCase().includes(q) ||
          t.trade_ref_id.toLowerCase().includes(q) ||
          (t.remarks && t.remarks.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [trades, activeTab, sideFilter, searchQuery]);

  // Sorted List
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortAsc]);

  // Paginated List
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const handleSort = (field: keyof SpreadsheetTradeRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleRowClick = (trade: SpreadsheetTradeRow) => {
    setSelectedTrade(trade);
    setIsDrawerOpen(true);
  };

  return (
    <div className="bg-[#0b101b]/95 border border-[#1e293b] rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl select-none font-mono space-y-4">
      {/* 1. Header with Search, Tabs, & Quick Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-wider uppercase">
                COMPLETE TRADE LEDGER & JOURNAL
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {filtered.length} TRADES
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Spreadsheet Column-Grouped View • Real Execution Ledger
            </p>
          </div>
        </div>

        {/* View Switcher & Search Filter */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Switcher Tabs */}
          <div className="flex items-center bg-[#070b12] p-1 rounded-xl border border-slate-800/80 text-xs">
            <button
              onClick={() => {
                setActiveTab("ALL");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                activeTab === "ALL"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ALL ({trades.length})
            </button>
            <button
              onClick={() => {
                setActiveTab("OPEN");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                activeTab === "OPEN"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              OPEN POSITIONS ({trades.filter((t) => t.status === "OPEN").length})
            </button>
            <button
              onClick={() => {
                setActiveTab("CLOSED");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                activeTab === "CLOSED"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              CLOSED ({trades.filter((t) => t.status === "CLOSED").length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search symbol, ref, broker..."
              className="w-full bg-[#060910] border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* 2. SPREADSHEET TABLE WITH COLUMN GROUP HEADERS */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/90 max-h-[600px] scrollbar-thin">
        <table className="w-full text-left text-xs border-collapse min-w-[2000px]">
          {/* TIER 1: GROUPED CATEGORY HEADERS */}
          <thead>
            <tr className="bg-[#060a12] text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800 text-center">
              <th colSpan={7} className="py-2 px-3 border-r border-slate-800 bg-sky-950/20 text-sky-400">
                ASSET & IDENTITY
              </th>
              <th colSpan={7} className="py-2 px-3 border-r border-slate-800 bg-indigo-950/20 text-indigo-400">
                ENTRY EXECUTION
              </th>
              <th colSpan={3} className="py-2 px-3 border-r border-slate-800 bg-amber-950/20 text-amber-400">
                SAFETY & RISK
              </th>
              <th colSpan={4} className="py-2 px-3 border-r border-slate-800 bg-teal-950/20 text-teal-400">
                EXIT EXECUTION
              </th>
              <th colSpan={3} className="py-2 px-3 border-r border-slate-800 bg-slate-900/60 text-slate-400">
                COSTS & CHARGES
              </th>
              <th colSpan={5} className="py-2 px-3 border-r border-slate-800 bg-emerald-950/20 text-emerald-400">
                BALANCE & P&L
              </th>
              <th colSpan={3} className="py-2 px-3 bg-purple-950/20 text-purple-400">
                OBSERVATIONS & JOURNAL
              </th>
            </tr>

            {/* TIER 2: COLUMN HEADER NAMES */}
            <tr className="bg-[#090e18] text-[11px] text-slate-300 font-bold border-b border-slate-700/80 whitespace-nowrap">
              {/* Asset & Identity */}
              <th onClick={() => handleSort("date_time")} className="py-2.5 px-3 cursor-pointer hover:text-white">
                DATE / TIME
              </th>
              <th onClick={() => handleSort("broker")} className="py-2.5 px-2.5 cursor-pointer hover:text-white">
                BROKER
              </th>
              <th className="py-2.5 px-2.5">ACCOUNT</th>
              <th onClick={() => handleSort("mode")} className="py-2.5 px-2.5 cursor-pointer hover:text-white">
                MODE
              </th>
              <th className="py-2.5 px-2.5">ASSET</th>
              <th className="py-2.5 px-2.5">MARKET</th>
              <th onClick={() => handleSort("symbol")} className="py-2.5 px-3 border-r border-slate-800 cursor-pointer hover:text-white">
                SYMBOL
              </th>

              {/* Entry */}
              <th onClick={() => handleSort("direction")} className="py-2.5 px-2.5 cursor-pointer hover:text-white">
                SIDE
              </th>
              <th onClick={() => handleSort("entry_price")} className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white">
                ENTRY PRICE
              </th>
              <th onClick={() => handleSort("quantity")} className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white">
                QTY
              </th>
              <th className="py-2.5 px-2.5 text-right">ENTRY NOTIONAL</th>
              <th className="py-2.5 px-2.5">OPEN DATE</th>
              <th onClick={() => handleSort("strategy")} className="py-2.5 px-2.5 cursor-pointer hover:text-white">
                STRATEGY
              </th>
              <th className="py-2.5 px-3 border-r border-slate-800">SETUP</th>

              {/* Safety / Risk */}
              <th className="py-2.5 px-2.5 text-right">TARGET</th>
              <th className="py-2.5 px-2.5 text-right">STOP LOSS</th>
              <th className="py-2.5 px-3 border-r border-slate-800 text-center">R:R</th>

              {/* Exit */}
              <th className="py-2.5 px-2.5">EXIT DATE</th>
              <th onClick={() => handleSort("exit_price")} className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white">
                EXIT PRICE
              </th>
              <th className="py-2.5 px-2.5 text-right">EXIT NOTIONAL</th>
              <th className="py-2.5 px-3 border-r border-slate-800 text-right">DURATION</th>

              {/* Costs */}
              <th className="py-2.5 px-2.5 text-right">FEES</th>
              <th className="py-2.5 px-2.5 text-right">FUNDING</th>
              <th className="py-2.5 px-3 border-r border-slate-800 text-right">TAXES</th>

              {/* Balance & P&L */}
              <th onClick={() => handleSort("gross_pnl")} className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white">
                GROSS P&L
              </th>
              <th onClick={() => handleSort("net_pnl")} className="py-2.5 px-3 text-right cursor-pointer hover:text-white font-extrabold text-sky-300">
                NET P&L
              </th>
              <th onClick={() => handleSort("pnl_percent")} className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white">
                P&L %
              </th>
              <th onClick={() => handleSort("r_multiple")} className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white">
                R-MULT
              </th>
              <th onClick={() => handleSort("status")} className="py-2.5 px-3 border-r border-slate-800 text-center cursor-pointer hover:text-white">
                STATUS
              </th>

              {/* Observations */}
              <th className="py-2.5 px-2.5">EMOTION</th>
              <th className="py-2.5 px-3">REMARKS</th>
              <th className="py-2.5 px-2.5 text-center">ACTION</th>
            </tr>
          </thead>

          {/* TABLE BODY */}
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={29} className="py-12 text-center text-slate-500">
                  No trade records found matching active filter criteria.
                </td>
              </tr>
            ) : (
              paginated.map((row) => {
                const isPos = row.net_pnl >= 0;
                const isBuy = row.direction === "LONG" || row.direction === "BUY";

                return (
                  <tr
                    key={row.id}
                    onClick={() => handleRowClick(row)}
                    className="hover:bg-slate-800/40 transition cursor-pointer group"
                  >
                    {/* Date / Time */}
                    <td className="py-2 px-3 text-slate-300 whitespace-nowrap">{row.date_time}</td>

                    {/* Broker */}
                    <td className="py-2 px-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                        {row.broker}
                      </span>
                    </td>

                    {/* Account */}
                    <td className="py-2 px-2.5 text-slate-400 truncate max-w-[100px]">{row.account}</td>

                    {/* Mode */}
                    <td className="py-2 px-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          row.mode === "LIVE"
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                        }`}
                      >
                        {row.mode}
                      </span>
                    </td>

                    {/* Asset */}
                    <td className="py-2 px-2.5 text-slate-300">{row.asset}</td>

                    {/* Market */}
                    <td className="py-2 px-2.5 text-slate-400">{row.market}</td>

                    {/* Symbol */}
                    <td className="py-2 px-3 font-bold text-white border-r border-slate-800/80 group-hover:text-sky-400">
                      {row.symbol}
                    </td>

                    {/* Side */}
                    <td className="py-2 px-2.5 font-bold">
                      <span className={isBuy ? "text-emerald-400" : "text-rose-400"}>
                        {row.direction}
                      </span>
                    </td>

                    {/* Entry Price */}
                    <td className="py-2 px-2.5 text-right text-slate-200">
                      {currencySymbol}
                      {formatNumber(row.entry_price, 2)}
                    </td>

                    {/* Qty */}
                    <td className="py-2 px-2.5 text-right text-slate-300">{row.quantity}</td>

                    {/* Entry Notional */}
                    <td className="py-2 px-2.5 text-right text-slate-400">
                      {currencySymbol}
                      {formatNumber(row.entry_notional, 2)}
                    </td>

                    {/* Open Date */}
                    <td className="py-2 px-2.5 text-slate-400">{row.open_date}</td>

                    {/* Strategy */}
                    <td className="py-2 px-2.5 text-sky-300 font-bold">{row.strategy}</td>

                    {/* Setup */}
                    <td className="py-2 px-3 text-slate-300 border-r border-slate-800/80">{row.setup}</td>

                    {/* Target */}
                    <td className="py-2 px-2.5 text-right text-emerald-400">
                      {currencySymbol}
                      {formatNumber(row.target, 2)}
                    </td>

                    {/* Stop Loss */}
                    <td className="py-2 px-2.5 text-right text-rose-400">
                      {currencySymbol}
                      {formatNumber(row.stop_loss, 2)}
                    </td>

                    {/* R:R */}
                    <td className="py-2 px-3 text-center text-slate-400 border-r border-slate-800/80">
                      {row.risk_reward}
                    </td>

                    {/* Exit Date */}
                    <td className="py-2 px-2.5 text-slate-400">{row.exit_date}</td>

                    {/* Exit Price */}
                    <td className="py-2 px-2.5 text-right text-slate-200">
                      {row.status === "CLOSED" ? (
                        <>
                          {currencySymbol}
                          {formatNumber(row.exit_price, 2)}
                        </>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Exit Notional */}
                    <td className="py-2 px-2.5 text-right text-slate-400">
                      {row.status === "CLOSED" ? (
                        <>
                          {currencySymbol}
                          {formatNumber(row.exit_notional, 2)}
                        </>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Duration */}
                    <td className="py-2 px-3 text-right text-slate-400 border-r border-slate-800/80">
                      {row.duration_mins ? `${row.duration_mins}m` : "—"}
                    </td>

                    {/* Fees */}
                    <td className="py-2 px-2.5 text-right text-slate-400">
                      {currencySymbol}
                      {formatNumber(row.fees, 2)}
                    </td>

                    {/* Funding */}
                    <td className="py-2 px-2.5 text-right text-slate-400">
                      {currencySymbol}
                      {formatNumber(row.funding, 2)}
                    </td>

                    {/* Taxes */}
                    <td className="py-2 px-3 text-right text-slate-400 border-r border-slate-800/80">
                      {currencySymbol}
                      {formatNumber(row.taxes, 2)}
                    </td>

                    {/* Gross P&L */}
                    <td className={`py-2 px-2.5 text-right font-bold ${row.gross_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {row.gross_pnl >= 0 ? "+" : ""}
                      {currencySymbol}
                      {formatNumber(row.gross_pnl, 2)}
                    </td>

                    {/* Net P&L */}
                    <td className={`py-2 px-3 text-right font-extrabold text-xs ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                      {isPos ? "+" : ""}
                      {currencySymbol}
                      {formatNumber(row.net_pnl, 2)}
                    </td>

                    {/* P&L % */}
                    <td className={`py-2 px-2.5 text-right font-bold ${row.pnl_percent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {row.pnl_percent >= 0 ? "+" : ""}
                      {row.pnl_percent.toFixed(2)}%
                    </td>

                    {/* R Multiple */}
                    <td className={`py-2 px-2.5 text-right font-extrabold ${row.r_multiple >= 0 ? "text-sky-400" : "text-rose-400"}`}>
                      {row.r_multiple >= 0 ? `+${row.r_multiple.toFixed(2)}R` : `${row.r_multiple.toFixed(2)}R`}
                    </td>

                    {/* Status */}
                    <td className="py-2 px-3 text-center border-r border-slate-800/80">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          row.status === "CLOSED"
                            ? "bg-slate-800 text-slate-300"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>

                    {/* Emotion */}
                    <td className="py-2 px-2.5 text-amber-400">{row.emotion}</td>

                    {/* Remarks */}
                    <td className="py-2 px-3 text-slate-400 truncate max-w-[160px]">{row.remarks}</td>

                    {/* Action */}
                    <td className="py-2 px-2.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(row);
                        }}
                        className="p-1 rounded bg-slate-800 hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 transition"
                        title="Audit Trade Details"
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

      {/* 3. Pagination Footer Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400">
        <div>
          Showing page <span className="text-white font-bold">{currentPage}</span> of{" "}
          <span className="text-white font-bold">{totalPages}</span> ({sorted.length} records total)
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>

          <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sky-400 font-bold">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audit Drawer Triggered on Click */}
      <TradeAuditDrawer
        trade={selectedTrade}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}
