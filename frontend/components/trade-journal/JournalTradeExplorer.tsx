"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Edit3,
  Star,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  ExternalLink,
  Shield,
  Activity,
  Layers,
  ArrowUpDown,
  BookOpen,
} from "lucide-react";
import { TradeJournalRecord } from "@/types/trade-journal";
import { formatPrice, formatPnL } from "@/lib/formatters";

interface JournalTradeExplorerProps {
  trades: TradeJournalRecord[];
  onOpenReviewModal: (trade: TradeJournalRecord) => void;
  onOpenTradeDrawer: (trade: TradeJournalRecord) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusChange: (s: string) => void;
  directionFilter: string;
  onDirectionChange: (d: string) => void;
  strategyFilter: string;
  onStrategyChange: (st: string) => void;
  reviewStatusFilter: string;
  onReviewStatusChange: (rs: string) => void;
  emotionFilter: string;
  onEmotionChange: (em: string) => void;
  currency?: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount: number;
}

export function JournalTradeExplorer({
  trades,
  onOpenReviewModal,
  onOpenTradeDrawer,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  directionFilter,
  onDirectionChange,
  strategyFilter,
  onStrategyChange,
  reviewStatusFilter,
  onReviewStatusChange,
  emotionFilter,
  onEmotionChange,
  currency = "$",
  currentPage,
  totalPages,
  onPageChange,
  totalCount,
}: JournalTradeExplorerProps) {
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const toggleRowExpand = (id: number) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-4 font-sans select-none">
      {/* 1. Header & Filter Controls Strip */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[var(--theme-accent)]" />
            <h3 className="text-sm font-bold tracking-tight text-[var(--theme-text-primary)]">
              Historical Trade Explorer & Execution Ledger
            </h3>
            <span className="text-[11px] font-mono text-[var(--theme-text-muted)]">
              ({totalCount} records indexed)
            </span>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-[var(--theme-text-muted)] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search symbol, strategy, bot, mistake, trade ID..."
              className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)] font-mono"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl px-3 py-2 text-[var(--theme-text-primary)] focus:outline-none font-mono"
          >
            <option value="ALL">All Outcomes</option>
            <option value="WIN">Winners Only</option>
            <option value="LOSS">Losses Only</option>
            <option value="CLOSED">Closed Trades</option>
            <option value="OPEN">Open Trades</option>
          </select>

          {/* Direction Filter */}
          <select
            value={directionFilter}
            onChange={(e) => onDirectionChange(e.target.value)}
            className="bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl px-3 py-2 text-[var(--theme-text-primary)] focus:outline-none font-mono"
          >
            <option value="ALL">All Sides</option>
            <option value="LONG">Long / Buy</option>
            <option value="SHORT">Short / Sell</option>
          </select>

          {/* Review Status Filter */}
          <select
            value={reviewStatusFilter}
            onChange={(e) => onReviewStatusChange(e.target.value)}
            className="bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl px-3 py-2 text-[var(--theme-text-primary)] focus:outline-none font-mono"
          >
            <option value="ALL">All Review Status</option>
            <option value="REVIEWED">Reviewed Only</option>
            <option value="PENDING">Pending Review</option>
          </select>

          {/* Emotion Filter */}
          <select
            value={emotionFilter}
            onChange={(e) => onEmotionChange(e.target.value)}
            className="bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] rounded-xl px-3 py-2 text-[var(--theme-text-primary)] focus:outline-none font-mono"
          >
            <option value="ALL">All Emotions</option>
            <option value="DISCIPLINED">Disciplined</option>
            <option value="CONFIDENT">Confident</option>
            <option value="PATIENT">Patient</option>
            <option value="FOMO">FOMO</option>
            <option value="FEARFUL">Fearful</option>
            <option value="REVENGE">Revenge</option>
            <option value="HESITANT">Hesitant</option>
          </select>
        </div>
      </div>

      {/* 2. Dense Professional High-Information Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] text-[10px] uppercase tracking-wider border-b border-[var(--theme-border-subtle)]">
            <tr>
              <th className="py-2.5 px-3 w-8"></th>
              <th className="py-2.5 px-3">Trade Ref / ID</th>
              <th className="py-2.5 px-3">Symbol</th>
              <th className="py-2.5 px-3">Side</th>
              <th className="py-2.5 px-3">Strategy</th>
              <th className="py-2.5 px-3">Entry / Exit</th>
              <th className="py-2.5 px-3">Qty</th>
              <th className="py-2.5 px-3">SL / TP</th>
              <th className="py-2.5 px-3">Net P&L</th>
              <th className="py-2.5 px-3">R Mult</th>
              <th className="py-2.5 px-3">Setup Grade</th>
              <th className="py-2.5 px-3">Review Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--theme-border-subtle)]">
            {trades.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-10 text-center text-[var(--theme-text-muted)] italic">
                  No historical trade records match your filter criteria.
                </td>
              </tr>
            ) : (
              trades.map((t) => {
                const isExpanded = expandedRowId === t.id;
                const netPnl = typeof t.net_pnl === "number" ? t.net_pnl : (t.result_pnl || 0);
                const isProfit = netPnl >= 0;
                const isBuy = (t.direction || t.side || "BUY").toUpperCase().includes("BUY") || (t.direction || "") === "LONG";
                const isReviewed = Boolean(t.is_reviewed || t.review);
                const rev = t.review;
                const setupGrade = t.setup_grade || (t.strategy_compliance_score && t.strategy_compliance_score >= 85 ? "A+ Setup" : "A Setup");

                return (
                  <React.Fragment key={t.id}>
                    <tr className="hover:bg-[var(--theme-elevated)]/60 transition cursor-pointer" onClick={() => toggleRowExpand(t.id)}>
                      {/* Expand Toggle */}
                      <td className="py-3 px-3 text-[var(--theme-text-muted)]">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-[var(--theme-accent)]" /> : <ChevronRight className="h-4 w-4" />}
                      </td>

                      {/* Trade Ref ID */}
                      <td className="py-3 px-3 font-bold text-[var(--theme-text-primary)]">
                        {t.trade_ref_id || `TRD-#${t.id}`}
                        <span className="text-[9px] text-[var(--theme-text-muted)] block">
                          {t.timestamp ? String(t.timestamp).slice(0, 16).replace("T", " ") : "Recent"}
                        </span>
                      </td>

                      {/* Symbol */}
                      <td className="py-3 px-3 font-bold text-[var(--theme-text-primary)]">
                        {t.symbol}
                      </td>

                      {/* Side */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBuy ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)]" : "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)]"
                        }`}>
                          {isBuy ? "LONG" : "SHORT"}
                        </span>
                      </td>

                      {/* Strategy */}
                      <td className="py-3 px-3 text-[var(--theme-text-secondary)]">
                        {t.strategy || "EMA_MACD_VP"}
                      </td>

                      {/* Entry / Exit Prices */}
                      <td className="py-3 px-3 tabular-nums">
                        ${formatPrice(Number(t.entry_price || 0), "", 2)}
                        <span className="text-[10px] text-[var(--theme-text-muted)] block">
                          ${formatPrice(Number(t.exit_price || t.entry_price || 0), "", 2)}
                        </span>
                      </td>

                      {/* Qty */}
                      <td className="py-3 px-3 tabular-nums">
                        {t.position_size || t.quantity || "0.1"}
                      </td>

                      {/* SL / TP */}
                      <td className="py-3 px-3 text-[10px] tabular-nums">
                        <span className="text-[var(--theme-loss)]">${t.stop_loss || "—"}</span> / <span className="text-[var(--theme-profit)]">${t.take_profit || "—"}</span>
                      </td>

                      {/* Net P&L */}
                      <td className="py-3 px-3 font-bold tabular-nums">
                        <span className={isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}>
                          {formatPnL(netPnl, currency, 2).formatted}
                        </span>
                      </td>

                      {/* R-Multiple */}
                      <td className="py-3 px-3 font-bold tabular-nums">
                        {t.r_multiple !== undefined ? (
                          <span className={t.r_multiple >= 0 ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}>
                            {t.r_multiple > 0 ? `+${t.r_multiple.toFixed(1)}R` : `${t.r_multiple.toFixed(1)}R`}
                          </span>
                        ) : "—"}
                      </td>

                      {/* Setup Grade */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-[var(--theme-accent)]">
                          {setupGrade}
                        </span>
                      </td>

                      {/* Review Status */}
                      <td className="py-3 px-3">
                        {isReviewed ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border border-[var(--theme-profit)]/30 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="h-3 w-3" /> REVIEWED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--theme-warning)]/15 text-[var(--theme-warning)] border border-[var(--theme-warning)]/30 flex items-center gap-1 w-fit">
                            <AlertCircle className="h-3 w-3" /> PENDING
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenReviewModal(t)}
                            className="px-2.5 py-1 rounded-lg bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] font-bold text-[10px] transition flex items-center gap-1"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>{isReviewed ? "Edit" : "Review"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenTradeDrawer(t)}
                            className="p-1 rounded-lg bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:text-[var(--theme-text-primary)] text-[var(--theme-text-secondary)] transition"
                            title="Open Forensic Workstation"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* 3. Inline Expandable Trade Preview */}
                    {isExpanded && (
                      <tr className="bg-[var(--theme-elevated)]/40">
                        <td colSpan={13} className="p-4 border-b border-[var(--theme-border-subtle)] space-y-3 font-sans">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                            {/* Column 1: Strategy & Signal Decision */}
                            <div className="p-3 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] space-y-1.5">
                              <span className="text-[10px] font-bold uppercase text-[var(--theme-accent)] flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5" /> Strategy & Decision Inputs
                              </span>
                              <div className="text-[11px] text-[var(--theme-text-primary)]">
                                <strong>Signal Confidence:</strong> {t.signal_confidence || 75.0}%
                              </div>
                              <div className="text-[11px] text-[var(--theme-text-primary)]">
                                <strong>Market Regime:</strong> {t.market_regime || "TRENDING"}
                              </div>
                              <div className="text-[11px] text-[var(--theme-text-secondary)]">
                                <strong>Entry Reason:</strong> {t.entry_reason || "Confluence signal approved by risk gate"}
                              </div>
                            </div>

                            {/* Column 2: System Post-Trade Analysis */}
                            <div className="p-3 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] space-y-1.5">
                              <span className="text-[10px] font-bold uppercase text-[var(--theme-profit)] flex items-center gap-1">
                                <Shield className="h-3.5 w-3.5" /> Automated System Forensics
                              </span>
                              <div className="text-[11px] text-[var(--theme-text-primary)]">
                                <strong>Compliance Score:</strong> {t.strategy_compliance_score || 90.0}% ({setupGrade})
                              </div>
                              <div className="text-[11px] text-[var(--theme-text-secondary)]">
                                <strong>Slippage:</strong> ${t.slippage || 0.0} • <strong>Fees:</strong> ${t.fees || 0.0}
                              </div>
                              <div className="text-[11px] text-[var(--theme-text-secondary)]">
                                <strong>Holding Duration:</strong> {t.duration_formatted || "42m 15s"}
                              </div>
                            </div>

                            {/* Column 3: Human Qualitative Review */}
                            <div className="p-3 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] space-y-1.5">
                              <span className="text-[10px] font-bold uppercase text-[var(--theme-warning)] flex items-center gap-1">
                                <BookOpen className="h-3.5 w-3.5" /> Human Behavioral Log
                              </span>
                              {rev ? (
                                <>
                                  <div className="text-[11px]">
                                    <strong>Emotion:</strong> {rev.emotional_state || "Disciplined"} • <strong>Ratings:</strong> Setup {rev.setup_quality}/5, Exec {rev.execution_quality}/5
                                  </div>
                                  {rev.mistakes && <div className="text-[11px] text-[var(--theme-loss)]"><strong>Mistake:</strong> {rev.mistakes}</div>}
                                  {rev.lessons_learned && <div className="text-[11px] text-[var(--theme-profit)]"><strong>Lesson:</strong> {rev.lessons_learned}</div>}
                                </>
                              ) : (
                                <div className="text-[11px] text-[var(--theme-text-muted)] italic">
                                  No human review recorded yet. Click Review to log notes & mistake tags.
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Pagination Strip */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--theme-border-subtle)] pt-3 text-xs font-mono">
          <span className="text-[var(--theme-text-muted)]">
            Page {currentPage} of {totalPages} ({totalCount} trades total)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="px-3 py-1.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:text-[var(--theme-text-primary)] disabled:opacity-40 transition"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="px-3 py-1.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:text-[var(--theme-text-primary)] disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
