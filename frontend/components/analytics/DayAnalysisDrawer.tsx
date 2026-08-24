"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Target,
  Clock,
  ArrowRight,
  ExternalLink,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { DayAnalysisDetail, DayTradeDetail } from "@/types/pnl-analytics";
import { apiClient } from "@/lib/apiClient";
import { formatPrice, formatPercent, formatPnL } from "@/lib/formatters";
import Link from "next/link";

interface DayAnalysisDrawerProps {
  date: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  allAvailableDates: string[];
  mode?: "PAPER" | "LIVE";
  timezone?: string;
  currency?: string;
}

export function DayAnalysisDrawer({
  date,
  isOpen,
  onClose,
  onSelectDate,
  allAvailableDates = [],
  mode = "PAPER",
  timezone = "UTC",
  currency = "$",
}: DayAnalysisDrawerProps) {
  const [activeTab, setActiveTab] = useState<"trades" | "intraday" | "signals" | "events">("trades");

  // Fetch Granular Day Details
  const { data: dayData, isLoading, error } = useQuery<DayAnalysisDetail>({
    queryKey: ["dayPerformanceDetails", date, mode, timezone],
    queryFn: async () => {
      if (!date) return null as any;
      const res = await apiClient.get<DayAnalysisDetail>(
        `/api/portfolio/performance/day-details?date=${date}&mode=${mode}&timezone=${encodeURIComponent(timezone)}`
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error?.message || "Failed to load day details");
      }
      return res.data;
    },
    enabled: isOpen && Boolean(date),
    staleTime: 10000,
  });

  if (!isOpen || !date) return null;

  // Previous & Next Day Navigation indices
  const currentIndex = allAvailableDates.indexOf(date);
  const prevDate = currentIndex > 0 ? allAvailableDates[currentIndex - 1] : null;
  const nextDate = currentIndex >= 0 && currentIndex < allAvailableDates.length - 1 ? allAvailableDates[currentIndex + 1] : null;

  const summary = dayData?.summary || {
    date,
    netPnl: 0,
    grossPnl: 0,
    fees: 0,
    tradesCount: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    largestGain: 0,
    largestLoss: 0,
    explanation: "Loading session data...",
  };

  const isProfit = summary.netPnl > 0.001;
  const isLoss = summary.netPnl < -0.001;
  const pnlMeta = formatPnL(summary.netPnl, currency, 2);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-200">
      {/* Backdrop Click to Close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer Container (Slide-over desktop, full-width sheet mobile) */}
      <div className="relative w-full max-w-2xl bg-[#080D18] border-l border-[#1E293B] shadow-2xl flex flex-col h-full z-10 font-mono text-slate-200 animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="bg-[#0B111E] border-b border-[#1E293B] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{date}</h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isProfit
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : isLoss
                      ? "bg-red-500/10 text-red-400 border border-red-500/30"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                >
                  {pnlMeta.formatted}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Mode: <span className="text-cyan-400 font-semibold">{mode}</span> • Timezone: {timezone}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Prev / Next Date Navigation */}
            <div className="flex items-center bg-[#050811] border border-[#1E293B] rounded-lg p-0.5 mr-2">
              <button
                type="button"
                disabled={!prevDate}
                onClick={() => prevDate && onSelectDate(prevDate)}
                title={prevDate ? `Previous Day (${prevDate})` : "No earlier date"}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] text-slate-500 px-1">DAY</span>
              <button
                type="button"
                disabled={!nextDate}
                onClick={() => nextDate && onSelectDate(nextDate)}
                title={nextDate ? `Next Day (${nextDate})` : "No later date"}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-[#1E293B] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Executive Summary Card */}
          <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-4 space-y-3">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
              <span>Session Executive Breakdown</span>
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#050811] border border-[#1E293B]/70 rounded-lg p-3">
              {summary.explanation}
            </p>

            {/* Key Day Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="bg-[#050811] border border-[#1E293B] rounded-lg p-2.5 space-y-0.5">
                <div className="text-[10px] text-slate-400 uppercase">Gross P&L</div>
                <div className="text-sm font-bold text-white">{formatPnL(summary.grossPnl, currency).formatted}</div>
              </div>
              <div className="bg-[#050811] border border-[#1E293B] rounded-lg p-2.5 space-y-0.5">
                <div className="text-[10px] text-slate-400 uppercase">Total Fees</div>
                <div className="text-sm font-bold text-red-400">-{formatPrice(summary.fees, currency)}</div>
              </div>
              <div className="bg-[#050811] border border-[#1E293B] rounded-lg p-2.5 space-y-0.5">
                <div className="text-[10px] text-slate-400 uppercase">Executions</div>
                <div className="text-sm font-bold text-white">
                  {summary.tradesCount} ({summary.wins}W / {summary.losses}L)
                </div>
              </div>
              <div className="bg-[#050811] border border-[#1E293B] rounded-lg p-2.5 space-y-0.5">
                <div className="text-[10px] text-slate-400 uppercase">Win Rate</div>
                <div className={`text-sm font-bold ${summary.winRate >= 50 ? "text-emerald-400" : "text-amber-400"}`}>
                  {formatPercent(summary.winRate, 1)}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs for Subsections */}
          <div className="flex border-b border-[#1E293B] gap-2 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("trades")}
              className={`pb-2 px-3 font-semibold transition-colors border-b-2 ${
                activeTab === "trades"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Trades & Orders ({dayData?.trades?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("intraday")}
              className={`pb-2 px-3 font-semibold transition-colors border-b-2 ${
                activeTab === "intraday"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Intraday Curve
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("signals")}
              className={`pb-2 px-3 font-semibold transition-colors border-b-2 ${
                activeTab === "signals"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              AI Signals ({dayData?.signals?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("events")}
              className={`pb-2 px-3 font-semibold transition-colors border-b-2 ${
                activeTab === "events"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Audit Events ({dayData?.events?.length || 0})
            </button>
          </div>

          {/* Tab 1: Trades Table */}
          {activeTab === "trades" && (
            <div className="space-y-3">
              {(!dayData?.trades || dayData.trades.length === 0) ? (
                <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-8 text-center text-slate-400 text-xs">
                  No trade executions recorded on this date.
                </div>
              ) : (
                <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#050811] text-[10px] text-slate-400 uppercase border-b border-[#1E293B]">
                        <tr>
                          <th className="py-2.5 px-3">Symbol</th>
                          <th className="py-2.5 px-3">Side</th>
                          <th className="py-2.5 px-3 text-right">Entry / Exit</th>
                          <th className="py-2.5 px-3 text-right">Size</th>
                          <th className="py-2.5 px-3 text-right">Net P&L</th>
                          <th className="py-2.5 px-3">Bot / Strat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E293B]/60">
                        {dayData.trades.map((tr) => (
                          <tr key={tr.id} className="hover:bg-[#1E293B]/30 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-white">{tr.symbol}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  tr.direction === "LONG" || tr.direction === "BUY"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                    : "bg-red-500/10 text-red-400 border border-red-500/30"
                                }`}
                              >
                                {tr.direction}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-300">
                              <div>{formatPrice(tr.entryPrice, currency)}</div>
                              <div className="text-[10px] text-slate-500">{formatPrice(tr.exitPrice, currency)}</div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-300">{tr.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-bold">
                              <span className={tr.netPnl > 0 ? "text-emerald-400" : tr.netPnl < 0 ? "text-red-400" : "text-slate-300"}>
                                {formatPnL(tr.netPnl, currency).formatted}
                              </span>
                              <div className="text-[9px] text-slate-500">
                                Fee: {formatPrice(tr.fees, currency)}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-[10px] text-slate-400">
                              <div className="text-cyan-400">{tr.botId}</div>
                              <div className="truncate max-w-[100px]">{tr.strategy}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Intraday Step Movement */}
          {activeTab === "intraday" && (
            <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-4 space-y-3">
              <div className="text-xs text-slate-400 font-semibold uppercase">Cumulative Session Step P&L</div>
              {(!dayData?.intradayEquity || dayData.intradayEquity.length === 0) ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No intraday execution timeline available for this day.
                </div>
              ) : (
                <div className="space-y-2">
                  {dayData.intradayEquity.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-[#050811] border border-[#1E293B] rounded-lg p-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <div>
                          <div className="text-white font-semibold">{step.symbol}</div>
                          <div className="text-[10px] text-slate-400">{step.time ? new Date(step.time).toLocaleTimeString() : `Step ${idx + 1}`}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${step.stepPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {formatPnL(step.stepPnL, currency).formatted}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Session: {formatPnL(step.cumulativePnL, currency).formatted}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Signals */}
          {activeTab === "signals" && (
            <div className="space-y-2">
              {(!dayData?.signals || dayData.signals.length === 0) ? (
                <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-8 text-center text-slate-400 text-xs">
                  No strategy triggers logged on this date.
                </div>
              ) : (
                dayData.signals.map((sig) => (
                  <div key={sig.id} className="bg-[#0B111E] border border-[#1E293B] rounded-lg p-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{sig.symbol}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          sig.signal_type === "LONG" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                        }`}>
                          {sig.signal_type}
                        </span>
                        {sig.is_blocked && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            BLOCKED
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Price: ${sig.price.toFixed(2)} • Confidence: {sig.confidence.toFixed(1)}%
                        {sig.reason ? ` • ${sig.reason}` : ""}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(sig.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 4: Events */}
          {activeTab === "events" && (
            <div className="space-y-2">
              {(!dayData?.events || dayData.events.length === 0) ? (
                <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-8 text-center text-slate-400 text-xs">
                  No system audit events recorded on this date.
                </div>
              ) : (
                dayData.events.map((evt) => (
                  <div key={evt.id} className="bg-[#0B111E] border border-[#1E293B] rounded-lg p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{evt.type}</span>
                      <span className="text-[10px] text-slate-400">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">{evt.message}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="bg-[#0B111E] border-t border-[#1E293B] p-4 flex items-center justify-between gap-3">
          <Link
            href={`/trade-journal?date=${date}`}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-900/30 transition-all"
          >
            <span>Open in Full Trade Journal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-slate-300 font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
