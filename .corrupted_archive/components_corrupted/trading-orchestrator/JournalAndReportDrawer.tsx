"use client";

import { formatMoney } from "@/lib/formatters";
import React, { useState } from "react";
import { BookOpen, FileText, Calendar, TrendingUp, CheckCircle, ShieldAlert, Award, Clock } from "lucide-react";

interface JournalEntry {
  journal_id: string;
  timestamp: string;
  checkpoint_id: string;
  market_regime: string;
  analysis_summary: string;
  outcome_summary: string;
  ai_observations: string;
  candidate_setups?: any[];
  decisions?: any[];
}

interface DailyReportData {
  report_id: string;
  report_date: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  gross_pnl: number;
  net_pnl: number;
  total_fees: number;
  max_drawdown_pct: number;
  risk_utilization_pct: number;
  blocked_trades_count: number;
  execution_errors_count: number;
  ai_observations: string;
  next_session_watchlist: Array<{ symbol: string; key_level: number; bias: string; reason: string }>;
}

interface JournalAndReportDrawerProps {
  journalEntries: JournalEntry[];
  dailyReport: DailyReportData | null;
}

export const JournalAndReportDrawer: React.FC<JournalAndReportDrawerProps> = ({
  journalEntries,
  dailyReport,
}) => {
  const [activeTab, setActiveTab] = useState<"REPORT" | "JOURNAL">("REPORT");

  return (
    <div className="bg-[#0B0E17]/95 border border-[#1A2A3F] rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            End-of-Day Report & Trading Journal
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab("REPORT")}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              activeTab === "REPORT"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Daily Report
          </button>
          <button
            onClick={() => setActiveTab("JOURNAL")}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              activeTab === "JOURNAL"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Checkpoint Journal ({journalEntries.length})
          </button>
        </div>
      </div>

      {activeTab === "REPORT" && dailyReport && (
        <div className="space-y-4">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">NET P&L</span>
              <span
                className={`text-sm font-bold ${
                  dailyReport.net_pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatMoney(dailyReport.net_pnl, "₹")}
              </span>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">WIN RATE</span>
              <span className="text-sm font-bold text-cyan-400">
                {dailyReport.win_rate_pct}% ({dailyReport.winning_trades}W / {dailyReport.losing_trades}L)
              </span>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">MAX DRAWDOWN</span>
              <span className="text-sm font-bold text-slate-300">
                {dailyReport.max_drawdown_pct}%
              </span>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">BLOCKED TRADES</span>
              <span className="text-sm font-bold text-amber-400">
                {dailyReport.blocked_trades_count}
              </span>
            </div>
          </div>

          {/* AI Observations Box */}
          <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800">
            <span className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-cyan-400" />
              AI Session Observations & Risk Notes
            </span>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {dailyReport.ai_observations}
            </p>
          </div>

          {/* Next Session Watchlist */}
          {dailyReport.next_session_watchlist && dailyReport.next_session_watchlist.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-300 block mb-2">
                Next-Session Watchlist:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {dailyReport.next_session_watchlist.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/60 p-2.5 rounded border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-white block">{item.symbol}</span>
                      <span className="text-[11px] text-slate-400">{item.reason}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-cyan-400 font-bold block">₹{item.key_level}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {item.bias}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "JOURNAL" && (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {journalEntries.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 font-mono">
              No checkpoint journal entries recorded today.
            </div>
          ) : (
            journalEntries.map((j) => (
              <div
                key={j.journal_id}
                className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-xs"
              >
                <div className="flex items-center justify-between mb-1.5 font-mono">
                  <span className="font-bold text-cyan-400">{j.checkpoint_id}</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(j.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-slate-300 mb-1 leading-relaxed">{j.analysis_summary}</p>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  {j.outcome_summary}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
