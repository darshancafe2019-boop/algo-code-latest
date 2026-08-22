"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Sliders,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Shield,
  FileText,
} from "lucide-react";
import { TradeJournalRecord } from "@/types/trade-journal";

interface TradeJournalTableProps {
  trades: TradeJournalRecord[];
  onSelectTrade: (trade: TradeJournalRecord) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount: number;
}

export function TradeJournalTable({
  trades = [],
  onSelectTrade,
  currentPage,
  totalPages,
  onPageChange,
  totalCount,
}: TradeJournalTableProps) {
  // Column Visibility state with localStorage
  const defaultColumns = {
    id: true,
    time: true,
    symbol: true,
    direction: true,
    entryExit: true,
    quantity: true,
    slTp: true,
    risk: true,
    fees: true,
    pnl: true,
    status: true,
    actions: true,
  };

  const [visibleCols, setVisibleCols] = useState(defaultColumns);
  const [showColPicker, setShowColPicker] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("trade_journal_cols_v1");
      if (saved) setVisibleCols(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const toggleCol = (key: keyof typeof defaultColumns) => {
    const updated = { ...visibleCols, [key]: !visibleCols[key] };
    setVisibleCols(updated);
    try {
      localStorage.setItem("trade_journal_cols_v1", JSON.stringify(updated));
    } catch (e) {}
  };

  return (
    <div className="space-y-3 font-sans select-none">
      {/* Table Toolbar: Total count & Column customizer */}
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-[var(--theme-text-secondary)]">
          Showing <strong>{trades.length}</strong> of <strong>{totalCount}</strong> durable trade records
        </span>

        <div className="relative">
          <button
            onClick={() => setShowColPicker(!showColPicker)}
            className="min-h-[36px] px-3 py-1 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Customize Columns</span>
          </button>

          {showColPicker && (
            <div className="absolute right-0 mt-2 w-48 bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-xl p-3 shadow-2xl z-30 space-y-2">
              <span className="text-[10px] text-[var(--theme-text-muted)] font-bold uppercase block border-b border-[var(--theme-border-subtle)] pb-1">
                Visible Columns
              </span>
              <div className="space-y-1 text-[11px]">
                {Object.keys(defaultColumns).map((k) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={visibleCols[k as keyof typeof defaultColumns]}
                      onChange={() => toggleCol(k as keyof typeof defaultColumns)}
                      className="accent-[var(--theme-accent)] rounded"
                    />
                    <span className="capitalize">{k}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Trade Ledger Container */}
      <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl overflow-hidden shadow-xl">
        {/* Desktop Table (≥ 768px) */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[var(--theme-elevated)] text-[var(--theme-text-muted)] text-[10px] uppercase tracking-wider border-b border-[var(--theme-border-subtle)]">
              <tr>
                {visibleCols.id && <th className="py-3 px-4">Trade ID</th>}
                {visibleCols.time && <th className="py-3 px-3">UTC Time</th>}
                {visibleCols.symbol && <th className="py-3 px-3">Symbol / Strategy</th>}
                {visibleCols.direction && <th className="py-3 px-3">Side</th>}
                {visibleCols.entryExit && <th className="py-3 px-3">Entry / Exit</th>}
                {visibleCols.quantity && <th className="py-3 px-3">Qty / Size</th>}
                {visibleCols.slTp && <th className="py-3 px-3">SL / TP</th>}
                {visibleCols.risk && <th className="py-3 px-3">Risk</th>}
                {visibleCols.fees && <th className="py-3 px-3">Fees</th>}
                {visibleCols.pnl && <th className="py-3 px-3">Net P&L</th>}
                {visibleCols.status && <th className="py-3 px-3">Status</th>}
                {visibleCols.actions && <th className="py-3 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-border-subtle)] text-[var(--theme-text-primary)]">
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-xs text-[var(--theme-text-muted)]">
                    No historical trade records match the active filter criteria.
                  </td>
                </tr>
              ) : (
                trades.map((t) => {
                  const isLong = (t.direction || t.side || "LONG").toUpperCase() === "LONG";
                  const netPnl = typeof t.net_pnl === "number" ? t.net_pnl : typeof t.result_pnl === "number" ? t.result_pnl : (Number(t.net_pnl) || Number(t.result_pnl) || 0);
                  const isProfit = netPnl >= 0;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTrade(t)}
                      className="hover:bg-[var(--theme-elevated)]/50 transition-colors cursor-pointer group"
                    >
                      {visibleCols.id && (
                        <td className="py-3.5 px-4 font-bold text-[var(--theme-text-primary)] group-hover:text-[var(--theme-accent)]">
                          #{t.id}
                        </td>
                      )}
                      {visibleCols.time && (
                        <td className="py-3.5 px-3 text-[var(--theme-text-secondary)] whitespace-nowrap">
                          {t.timestamp.replace("T", " ").slice(0, 16)}
                        </td>
                      )}
                      {visibleCols.symbol && (
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-[var(--theme-text-primary)] block">{t.symbol}</span>
                          <span className="text-[10px] text-[var(--theme-text-muted)] truncate block max-w-[140px]">
                            {t.strategy || "Confluence"}
                          </span>
                        </td>
                      )}
                      {visibleCols.direction && (
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isLong
                                ? "bg-emerald-950 text-[var(--theme-profit)] border border-emerald-800"
                                : "bg-red-950 text-[var(--theme-loss)] border border-red-800"
                            }`}
                          >
                            {isLong ? "BUY" : "SELL"}
                          </span>
                        </td>
                      )}
                      {visibleCols.entryExit && (
                        <td className="py-3.5 px-3">
                          <span className="text-[var(--theme-text-primary)] block">${t.entry_price.toLocaleString()}</span>
                          <span className="text-[10px] text-[var(--theme-accent)] block">
                            {t.exit_price ? `$${t.exit_price.toLocaleString()}` : "Active"}
                          </span>
                        </td>
                      )}
                      {visibleCols.quantity && (
                        <td className="py-3.5 px-3 font-semibold text-[var(--theme-text-secondary)]">
                          {t.position_size}
                        </td>
                      )}
                      {visibleCols.slTp && (
                        <td className="py-3.5 px-3">
                          <span className="text-[var(--theme-loss)] block">${t.stop_loss || "—"}</span>
                          <span className="text-[var(--theme-profit)] text-[10px] block">${t.take_profit || "—"}</span>
                        </td>
                      )}
                      {visibleCols.risk && (
                        <td className="py-3.5 px-3">
                          <span className="text-purple-300 block">${t.risk_amount || "50.00"}</span>
                        </td>
                      )}
                      {visibleCols.fees && (
                        <td className="py-3.5 px-3 text-[var(--theme-text-muted)]">
                          ${(t.fees || 0.50).toFixed(2)}
                        </td>
                      )}
                      {visibleCols.pnl && (
                        <td className="py-3.5 px-3 font-bold">
                          <span className={isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}>
                            {isProfit ? "+" : ""}${netPnl.toFixed(2)}
                          </span>
                        </td>
                      )}
                      {visibleCols.status && (
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              t.status === "OPEN"
                                ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                                : isProfit
                                ? "bg-emerald-950 text-[var(--theme-profit)] border border-emerald-800"
                                : "bg-red-950 text-[var(--theme-loss)] border border-red-800"
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                      )}
                      {visibleCols.actions && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTrade(t);
                            }}
                            className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-accent)] border border-[var(--theme-border)] text-xs font-bold transition-colors"
                          >
                            Audit
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Chronological Timeline Cards (< 768px) */}
        <div className="md:hidden p-3 space-y-3 font-mono">
          {trades.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--theme-text-muted)]">
              No historical trade records match the active filter criteria.
            </div>
          ) : (
            trades.map((t) => {
              const isLong = (t.direction || t.side || "LONG").toUpperCase() === "LONG";
              const netPnl = typeof t.net_pnl === "number" ? t.net_pnl : typeof t.result_pnl === "number" ? t.result_pnl : (Number(t.net_pnl) || Number(t.result_pnl) || 0);
              const isProfit = netPnl >= 0;

              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTrade(t)}
                  className="p-3.5 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] space-y-2.5 shadow-md active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--theme-text-primary)]">#{t.id}</span>
                      <span className="font-bold text-[var(--theme-accent)]">{t.symbol}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isLong
                            ? "bg-emerald-950 text-[var(--theme-profit)] border border-emerald-800"
                            : "bg-red-950 text-[var(--theme-loss)] border border-red-800"
                        }`}
                      >
                        {isLong ? "BUY" : "SELL"}
                      </span>
                    </div>

                    <span className={`font-bold text-sm ${isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
                      {isProfit ? "+" : ""}${netPnl.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-y border-[var(--theme-border-subtle)] py-2 text-[var(--theme-text-secondary)]">
                    <div>
                      <span className="text-[10px] text-[var(--theme-text-muted)] block">Entry / Exit</span>
                      <span>${t.entry_price.toLocaleString()} → {t.exit_price ? `$${t.exit_price.toLocaleString()}` : "Open"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--theme-text-muted)] block">UTC Execution</span>
                      <span className="text-[11px]">{t.timestamp.replace("T", " ").slice(0, 16)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[var(--theme-text-muted)] truncate max-w-[180px]">{t.strategy || "Confluence Alpha"}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTrade(t);
                      }}
                      className="min-h-[44px] min-w-[44px] px-3 py-1 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-accent)] text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="p-3.5 bg-[var(--theme-elevated)] border-t border-[var(--theme-border-subtle)] flex items-center justify-between text-xs font-mono">
          <span className="text-[var(--theme-text-muted)]">
            Page {currentPage} of {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)] text-slate-300 disabled:opacity-30 transition-colors"
              aria-label="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)] text-slate-300 disabled:opacity-30 transition-colors"
              aria-label="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
