"use client";

import React from "react";
import {
  AlertTriangle,
  TrendingDown,
  ShieldAlert,
  Info,
  DollarSign,
  Activity,
} from "lucide-react";
import { MistakeStat } from "@/types/trade-journal";
import { formatPnL } from "@/lib/formatters";

interface JournalMistakeAnalysisProps {
  mistakes: MistakeStat[];
  currency?: string;
}

export function JournalMistakeAnalysis({
  mistakes,
  currency = "$",
}: JournalMistakeAnalysisProps) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-4 font-sans select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border-subtle)] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border border-[var(--theme-loss)]/30">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--theme-text-primary)]">
              Mistake Intelligence & Behavioral Cost Accounting
            </h3>
            <p className="text-xs text-[var(--theme-text-secondary)]">
              Which behaviors, rule breaks, and execution errors are costing the most money?
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] text-[10px] uppercase tracking-wider border-b border-[var(--theme-border-subtle)]">
            <tr>
              <th className="py-2.5 px-3">Mistake / Rule Deviation</th>
              <th className="py-2.5 px-3">Frequency</th>
              <th className="py-2.5 px-3">Net P&L Impact</th>
              <th className="py-2.5 px-3">Avg Cost / Loss</th>
              <th className="py-2.5 px-3">Win Rate</th>
              <th className="py-2.5 px-3 text-right">Sample Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--theme-border-subtle)]">
            {mistakes.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--theme-text-muted)] italic">
                  No mistake records tagged in reviewed trades yet. Keep reviewing trades to identify leaks!
                </td>
              </tr>
            ) : (
              mistakes.map((m, idx) => (
                <tr key={idx} className="hover:bg-[var(--theme-elevated)]/50 transition">
                  <td className="py-3 px-3 font-bold text-[var(--theme-loss)] flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{m.mistake}</span>
                  </td>
                  <td className="py-3 px-3 tabular-nums">
                    {m.occurrences} trades
                  </td>
                  <td className="py-3 px-3 font-bold tabular-nums text-[var(--theme-loss)]">
                    {formatPnL(m.total_pnl_impact, currency, 2).formatted}
                  </td>
                  <td className="py-3 px-3 tabular-nums text-[var(--theme-loss)]">
                    -${m.avg_loss.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 tabular-nums">
                    {m.win_rate_pct.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)]">
                      {m.sample_evidence}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
