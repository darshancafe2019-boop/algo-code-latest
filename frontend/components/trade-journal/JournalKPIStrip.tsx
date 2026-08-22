"use client";

import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Award,
  Shield,
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  Target,
  BarChart2,
} from "lucide-react";
import { JournalKPISummary } from "@/types/trade-journal";
import { formatNumber, formatPrice, formatPercent, formatPnL } from "@/lib/formatters";

interface JournalKPIStripProps {
  kpis?: JournalKPISummary | null;
  currency?: string;
}

export function JournalKPIStrip({ kpis, currency = "$" }: JournalKPIStripProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const p = kpis?.primary || {
    net_pnl: 0,
    win_rate_pct: 0,
    profit_factor: 0,
    expectancy_usd: 0,
    total_closed_trades: 0,
    open_positions_count: 0,
    avg_risk_reward: 0,
    max_drawdown_pct: 0,
    review_completion_pct: 0,
    reviewed_count: 0,
  };

  const s = kpis?.secondary || {
    gross_profit: 0,
    gross_loss: 0,
    avg_win_usd: 0,
    avg_loss_usd: 0,
    largest_win_usd: 0,
    largest_loss_usd: 0,
    avg_hold_time: "0m",
    avg_slippage_usd: 0,
    avg_mae_usd: 0,
    avg_mfe_usd: 0,
    fees_paid_usd: 0,
    long_win_rate_pct: 0,
    short_win_rate_pct: 0,
    current_streak: 0,
    current_streak_type: "NONE",
  };

  const isProfit = p.net_pnl >= 0;

  return (
    <div className="space-y-2.5 select-none font-sans">
      {/* 1. Primary 8-Card KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Net P&L */}
        <div className="p-3.5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md space-y-1">
          <div className="text-[10px] font-bold uppercase text-[var(--theme-text-secondary)] flex items-center justify-between">
            <span>Net P&L</span>
            {isProfit ? <TrendingUp className="h-3.5 w-3.5 text-[var(--theme-profit)]" /> : <TrendingDown className="h-3.5 w-3.5 text-[var(--theme-loss)]" />}
          </div>
          <div className={`text-base sm:text-lg font-bold font-mono ${isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
            {formatPnL(p.net_pnl, currency, 2).formatted}
          </div>
          <div className="text-[9px] text-[var(--theme-text-muted)] font-mono">Realized + Fees</div>
        </div>

        {/* Win Rate */}
        <div className="p-3.5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md space-y-1">
          <div className="text-[10px] font-bold uppercase text-[var(--theme-text-secondary)] flex items-center justify-between">
            <span>Win Rate</span>
            <Award className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[var(--theme-text-primary)]">
            {formatPercent(p.win_rate_pct, 1)}
          </div>
          <div className="text-[9px] text-[var(--theme-text-muted)] font-mono">{p.total_closed_trades} closed trades</div>
        </div>

        {/* Profit Factor */}
        <div className="p-3.5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md space-y-1">
          <div className="text-[10px] font-bold uppercase text-[var(--theme-text-secondary)] flex items-center justify-between">
            <span>Profit Factor</span>
            <BarChart2 className="h-3.5 w-3.5 text-[var(--theme-info)]" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[var(--theme-text-primary)]">
            {p.profit_factor.toFixed(2)}
          </div>
          <div className="text-[9px] text-[var(--theme-text-muted)] font-mono">Gross Gain / Loss</div>
        </div>

        {/* Expectancy */}
        <div className="p-3.5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md space-y-1">
          <div className="text-[10px] font-bold uppercase text-[var(--theme-text-secondary)] flex items-center justify-between">
            <span>Expectancy</span>
            <Target className="h-3.5 w-3.5 text-[var(--theme-warning)]" />
          </div>
          <div className={`text-base sm:text-lg font-bold font-mono ${p.expectancy_usd >= 0 ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
            {formatPnL(p.expectancy_usd, currency, 2).formatted}
          </div>
          <div className="text-[9px] text-[var(--theme-text-muted)] font-mono">Per trade edge</div>
        </div>

        {/* Total Trades */}
        <div className="p-3.5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md space-y-1">
          <div className="text-[10px] font-bold uppercase text-[var(--theme-text-secondary)] flex items-center justify-between">
            <span>Trades</span>
            <Layers className="h-3.5 w-3.5 text-[var(--theme-text-muted)]" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[var(--theme-text-primary)]">
            {p.total_closed_trades}
          </div>
          <div className="text-[9px] text-[var(--theme-text-muted)] font-mono">{p.open_positions_count} open now</div>
        </div>

        {/* Avg R:R */}
        <div className="p-3.5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md space-y-1">
          <div className="text-[10px] font-bold uppercase text-[var(--theme-text-secondary)] flex items-center justify-between">
            <span>Avg Realized R</span>
            <Activity className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[var(--theme-text-primary)]">
            {p.avg_risk_reward > 0 ? `+${p.avg_risk_reward.toFixed(2)}R` : `${p.avg_risk_reward.toFixed(2)}R`}
          </div>
          <div className="text-[9px] text-[var(--theme-text-muted)] font-mono">Risk multiple</div>
        </div>

        {/* Max Drawdown */}
        <div className="p-3.5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md space-y-1">
          <div className="text-[10px] font-bold uppercase text-[var(--theme-text-secondary)] flex items-center justify-between">
            <span>Max Drawdown</span>
            <Shield className="h-3.5 w-3.5 text-[var(--theme-loss)]" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[var(--theme-loss)]">
            {formatPercent(p.max_drawdown_pct, 1)}
          </div>
          <div className="text-[9px] text-[var(--theme-text-muted)] font-mono">Peak to valley</div>
        </div>

        {/* Review Completion */}
        <div className="p-3.5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md space-y-1">
          <div className="text-[10px] font-bold uppercase text-[var(--theme-text-secondary)] flex items-center justify-between">
            <span>Reviewed</span>
            <Award className="h-3.5 w-3.5 text-[var(--theme-profit)]" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[var(--theme-accent)]">
            {p.review_completion_pct.toFixed(0)}%
          </div>
          <div className="text-[9px] text-[var(--theme-text-muted)] font-mono">{p.reviewed_count} / {p.total_closed_trades} reviewed</div>
        </div>
      </div>

      {/* Expand / Collapse Secondary Metrics Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[11px] font-mono font-semibold text-[var(--theme-accent)] hover:underline flex items-center gap-1 transition"
        >
          <span>{isExpanded ? "Hide Advanced Metrics" : "Show Advanced Metrics (MAE, MFE, Slippage, Hold Time, Streaks)"}</span>
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* 2. Expandable Secondary Metrics Panel */}
      {isExpanded && (
        <div className="p-4 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] shadow-inner grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs font-mono">
          <div className="space-y-0.5">
            <span className="text-[10px] text-[var(--theme-text-muted)] block uppercase">Gross Gain / Loss</span>
            <div className="font-bold text-[var(--theme-text-primary)]">
              <span className="text-[var(--theme-profit)]">+${s.gross_profit.toLocaleString()}</span> / <span className="text-[var(--theme-loss)]">-${s.gross_loss.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-[var(--theme-text-muted)] block uppercase">Avg Win / Loss</span>
            <div className="font-bold text-[var(--theme-text-primary)]">
              <span className="text-[var(--theme-profit)]">+${s.avg_win_usd.toFixed(2)}</span> / <span className="text-[var(--theme-loss)]">-${s.avg_loss_usd.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-[var(--theme-text-muted)] block uppercase">Largest Win / Loss</span>
            <div className="font-bold text-[var(--theme-text-primary)]">
              <span className="text-[var(--theme-profit)]">+${s.largest_win_usd.toFixed(2)}</span> / <span className="text-[var(--theme-loss)]">${s.largest_loss_usd.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-[var(--theme-text-muted)] block uppercase">Avg Hold Time</span>
            <div className="font-bold text-[var(--theme-text-primary)] flex items-center gap-1">
              <Clock className="h-3 w-3 text-[var(--theme-text-secondary)]" />
              <span>{s.avg_hold_time}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-[var(--theme-text-muted)] block uppercase">Avg MAE / MFE</span>
            <div className="font-bold text-[var(--theme-text-primary)]">
              <span className="text-[var(--theme-loss)]">${s.avg_mae_usd.toFixed(2)}</span> / <span className="text-[var(--theme-profit)]">${s.avg_mfe_usd.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-[var(--theme-text-muted)] block uppercase">Long / Short Win %</span>
            <div className="font-bold text-[var(--theme-text-primary)]">
              {s.long_win_rate_pct.toFixed(1)}% / {s.short_win_rate_pct.toFixed(1)}%
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-[var(--theme-text-muted)] block uppercase">Current Streak</span>
            <div className={`font-bold ${s.current_streak_type === "WIN" ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
              {s.current_streak} {s.current_streak_type}S
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
