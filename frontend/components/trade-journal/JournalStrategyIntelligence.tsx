"use client";

import React from "react";
import {
  Code,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
} from "lucide-react";
import { StrategyStat } from "@/types/trade-journal";
import { formatPnL } from "@/lib/formatters";

interface JournalStrategyIntelligenceProps {
  strategies: StrategyStat[];
  currency?: string;
}

export function JournalStrategyIntelligence({
  strategies,
  currency = "$",
}: JournalStrategyIntelligenceProps) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-4 font-sans select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border-subtle)] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30">
            <Code className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--theme-text-primary)]">
              Strategy Intelligence & Regime Matrix
            </h3>
            <p className="text-xs text-[var(--theme-text-secondary)]">
              Statistical performance comparison, profit factors, and regime profitability breakdown.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] text-[10px] uppercase tracking-wider border-b border-[var(--theme-border-subtle)]">
            <tr>
              <th className="py-2.5 px-3">Strategy / Version</th>
              <th className="py-2.5 px-3">Total Trades</th>
              <th className="py-2.5 px-3">Win Rate</th>
              <th className="py-2.5 px-3">Profit Factor</th>
              <th className="py-2.5 px-3">Expectancy</th>
              <th className="py-2.5 px-3">Trending Regime P&L</th>
              <th className="py-2.5 px-3">Ranging Regime P&L</th>
              <th className="py-2.5 px-3 text-right">Net P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--theme-border-subtle)]">
            {strategies.map((s, idx) => {
              const isProfit = s.net_pnl >= 0;
              return (
                <tr key={idx} className="hover:bg-[var(--theme-elevated)]/50 transition">
                  <td className="py-3 px-3 font-bold text-[var(--theme-text-primary)]">
                    {s.strategy}
                    <span className="text-[9px] text-[var(--theme-text-muted)] block">{s.version}</span>
                  </td>
                  <td className="py-3 px-3 tabular-nums">{s.trades_count}</td>
                  <td className="py-3 px-3 tabular-nums font-bold">{s.win_rate_pct.toFixed(1)}%</td>
                  <td className="py-3 px-3 tabular-nums">{s.profit_factor.toFixed(2)}</td>
                  <td className="py-3 px-3 tabular-nums">${s.expectancy_usd.toFixed(2)}</td>
                  <td className="py-3 px-3 tabular-nums font-bold text-[var(--theme-profit)]">
                    +${s.trending_pnl.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 tabular-nums font-bold text-[var(--theme-warning)]">
                    ${s.ranging_pnl.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-bold tabular-nums">
                    <span className={isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}>
                      {formatPnL(s.net_pnl, currency, 2).formatted}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
