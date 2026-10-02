"use client";

import React from "react";
import {
  Smile,
  Frown,
  Meh,
  Activity,
  Award,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { EmotionStat } from "@/types/trade-journal";
import { formatPnL } from "@/lib/formatters";

interface JournalBehavioralAnalyticsProps {
  emotions: EmotionStat[];
  currency?: string;
}

export function JournalBehavioralAnalytics({
  emotions,
  currency = "$",
}: JournalBehavioralAnalyticsProps) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-4 font-sans select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border-subtle)] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--theme-info)]/15 text-[var(--theme-info)] border border-[var(--theme-info)]/30">
            <Smile className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--theme-text-primary)]">
              Behavioral & Psychological Journal Analytics
            </h3>
            <p className="text-xs text-[var(--theme-text-secondary)]">
              Correlation between psychological state (Disciplined, FOMO, Revenge, Fear) and real execution performance.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {emotions.map((e, idx) => {
          const isProfit = e.net_pnl >= 0;
          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] shadow-md space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-[var(--theme-text-primary)]">
                  {e.emotion}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--theme-surface)] text-[var(--theme-text-muted)]">
                  {e.trades_count} Trades
                </span>
              </div>

              <div className="space-y-1 font-mono">
                <div className="text-sm sm:text-base font-bold flex items-center justify-between">
                  <span className="text-[10px] text-[var(--theme-text-muted)] font-normal uppercase">Net P&L:</span>
                  <span className={isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}>
                    {formatPnL(e.net_pnl, currency, 2).formatted}
                  </span>
                </div>

                <div className="text-xs flex items-center justify-between text-[var(--theme-text-secondary)]">
                  <span className="text-[10px] text-[var(--theme-text-muted)] uppercase">Win Rate:</span>
                  <span className="font-bold text-[var(--theme-text-primary)]">{e.win_rate_pct.toFixed(1)}%</span>
                </div>

                <div className="text-xs flex items-center justify-between text-[var(--theme-text-secondary)]">
                  <span className="text-[10px] text-[var(--theme-text-muted)] uppercase">Avg / Trade:</span>
                  <span className="font-bold">{formatPnL(e.avg_pnl_per_trade, currency, 2).formatted}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
