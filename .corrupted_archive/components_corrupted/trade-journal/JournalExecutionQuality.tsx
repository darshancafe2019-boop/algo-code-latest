"use client";

import React from "react";
import {
  Activity,
  Target,
  Clock,
  Shield,
  Layers,
} from "lucide-react";
import { ExecutionQualityAnalytics } from "@/types/trade-journal";

interface JournalExecutionQualityProps {
  data?: ExecutionQualityAnalytics | null;
  currency?: string;
}

export function JournalExecutionQuality({
  data,
  currency = "$",
}: JournalExecutionQualityProps) {
  const rDist = data?.r_distribution || {
    "< -2R": 0,
    "-2R to -1R": 0,
    "-1R to 0R": 0,
    "0R to 1R": 0,
    "1R to 2R": 0,
    "2R to 3R": 0,
    "> 3R": 0,
  };

  const total = data?.total_samples || 1;
  const maxCount = Math.max(1, ...Object.values(rDist));

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-5 font-sans select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border-subtle)] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--theme-text-primary)]">
              Execution Quality & R-Multiple Distribution
            </h3>
            <p className="text-xs text-[var(--theme-text-secondary)]">
              Realized R-distribution profile, Maximum Adverse Excursion (MAE), and Maximum Favorable Excursion (MFE).
            </p>
          </div>
        </div>
      </div>

      {/* R-Distribution Histogram */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase font-mono text-[var(--theme-text-secondary)]">
          R-Multiple Distribution Profile ({total} Samples)
        </span>
        <div className="grid grid-cols-7 gap-2 items-end h-32 pt-4">
          {Object.entries(rDist).map(([bin, count]) => {
            const heightPct = Math.round((count / maxCount) * 100);
            const isLoss = bin.includes("-");
            return (
              <div key={bin} className="flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[10px] font-mono font-bold text-[var(--theme-text-secondary)]">
                  {count}
                </span>
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    isLoss ? "bg-[var(--theme-loss)]/60" : "bg-[var(--theme-profit)]/60"
                  }`}
                  style={{ height: `${Math.max(8, heightPct)}%` }}
                />
                <span className="text-[9px] font-mono font-bold text-[var(--theme-text-muted)] truncate w-full text-center">
                  {bin}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Excursion Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        <div className="p-3.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-1">
          <span className="text-[10px] text-[var(--theme-text-muted)] block uppercase">Avg Slippage</span>
          <div className="text-base font-bold text-[var(--theme-text-primary)]">
            ${data?.avg_slippage.toFixed(2) || "0.00"}
          </div>
          <span className="text-[9px] text-[var(--theme-text-muted)]">Per trade execution friction</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-1">
          <span className="text-[10px] text-[var(--theme-loss)] block uppercase">Avg MAE (Adverse Excursion)</span>
          <div className="text-base font-bold text-[var(--theme-loss)]">
            ${data?.avg_mae.toFixed(2) || "0.00"}
          </div>
          <span className="text-[9px] text-[var(--theme-text-muted)]">Maximum drawdown per trade</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-1">
          <span className="text-[10px] text-[var(--theme-profit)] block uppercase">Avg MFE (Favorable Excursion)</span>
          <div className="text-base font-bold text-[var(--theme-profit)]">
            ${data?.avg_mfe.toFixed(2) || "0.00"}
          </div>
          <span className="text-[9px] text-[var(--theme-text-muted)]">Maximum unrealized gain peak</span>
        </div>
      </div>
    </div>
  );
}
