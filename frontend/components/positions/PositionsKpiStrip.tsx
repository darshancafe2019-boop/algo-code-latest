"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  HelpCircle,
  Activity,
  AlertTriangle,
  Scale,
} from "lucide-react";
import { PositionsSummaryData } from "@/types/positions";

interface PositionsKpiStripProps {
  summary?: PositionsSummaryData;
  isLoading?: boolean;
}

export function PositionsKpiStrip({ summary, isLoading }: PositionsKpiStripProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-sans animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-[var(--theme-surface)]/80 border border-[var(--theme-border-subtle)] h-28 flex flex-col justify-between"
          >
            <div className="h-3 w-20 bg-[var(--theme-elevated)] rounded" />
            <div className="h-6 w-28 bg-[var(--theme-elevated)] rounded" />
            <div className="h-3 w-16 bg-[var(--theme-elevated)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  const unPnl = Number(summary?.total_unrealized_pnl || 0);
  const isUnPnlPos = unPnl >= 0;
  const relPnl = Number(summary?.total_realized_pnl || 0);
  const isRelPnlPos = relPnl >= 0;
  const openCount = summary?.open_positions_count || 0;
  const longCount = summary?.long_positions_count || 0;
  const shortCount = summary?.short_positions_count || 0;
  const longExp = summary?.long_exposure || 0;
  const shortExp = summary?.short_exposure || 0;
  const totalExp = longExp + shortExp;
  const longExpPct = totalExp > 0 ? Math.round((longExp / totalExp) * 100) : 50;

  const marginUsed = summary?.total_margin_used || 0;
  const availMargin = summary?.available_margin || 10000;
  const totalBalance = summary?.account_balance || (marginUsed + availMargin);
  const marginUtilPct = totalBalance > 0 ? Math.min(100, Math.round((marginUsed / totalBalance) * 100)) : 0;
  const riskUtil = summary?.portfolio_risk_utilization_pct || 0;
  const dailyLoss = summary?.daily_loss || 0;
  const dailyLossLimit = summary?.daily_loss_limit || 500;
  const dailyLossPct = dailyLossLimit > 0 ? Math.min(100, Math.round((dailyLoss / dailyLossLimit) * 100)) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-sans select-none">
      {/* 1. Total Floating Unrealized P&L */}
      <div className="p-4 rounded-2xl bg-[var(--theme-surface)]/90 backdrop-blur-md border border-[var(--theme-border)] shadow-md hover:border-[var(--theme-accent)]/40 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
          <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Unrealized P&L</span>
          <div title="Real-time mark-to-market floating P&L across active positions">
            <HelpCircle className="h-3 w-3 text-[var(--theme-text-muted)] cursor-help" />
          </div>
        </div>
        <div className="mt-1.5">
          <div
            className={`text-lg sm:text-xl font-black font-mono tabular-nums tracking-tight ${
              isUnPnlPos ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
            }`}
          >
            {isUnPnlPos ? "+" : ""}${unPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-[var(--theme-text-muted)] flex items-center gap-1 mt-0.5">
            {isUnPnlPos ? (
              <TrendingUp className="h-3 w-3 text-[var(--theme-profit)] shrink-0" />
            ) : (
              <TrendingDown className="h-3 w-3 text-[var(--theme-loss)] shrink-0" />
            )}
            <span>Live Mark-to-Market</span>
          </div>
        </div>
      </div>

      {/* 2. Realized Booked P&L */}
      <div className="p-4 rounded-2xl bg-[var(--theme-surface)]/90 backdrop-blur-md border border-[var(--theme-border)] shadow-md hover:border-[var(--theme-accent)]/40 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
          <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Realized P&L</span>
          <div title="Cumulative booked profit/loss across closed trade executions">
            <HelpCircle className="h-3 w-3 text-[var(--theme-text-muted)] cursor-help" />
          </div>
        </div>
        <div className="mt-1.5">
          <div
            className={`text-lg sm:text-xl font-black font-mono tabular-nums tracking-tight ${
              isRelPnlPos ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
            }`}
          >
            {isRelPnlPos ? "+" : ""}${relPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-[var(--theme-text-muted)] mt-0.5">
            <span>Cumulative Booked</span>
          </div>
        </div>
      </div>

      {/* 3. Active Positions & Long/Short Exposure */}
      <div className="p-4 rounded-2xl bg-[var(--theme-surface)]/90 backdrop-blur-md border border-[var(--theme-border)] shadow-md hover:border-[var(--theme-accent)]/40 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
          <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Active Exposure</span>
          <div title="Directional exposure distribution across active holdings">
            <Scale className="h-3 w-3 text-[var(--theme-text-muted)] cursor-help" />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--theme-text-primary)] flex items-baseline gap-1.5">
            <span>{openCount}</span>
            <span className="text-xs font-normal text-[var(--theme-text-muted)] font-mono">
              ({longCount}L / {shortCount}S)
            </span>
          </div>
          {/* Long / Short Bar */}
          <div className="w-full bg-[var(--theme-loss)]/30 h-1.5 rounded-full mt-1.5 overflow-hidden flex">
            <div
              className="h-full bg-[var(--theme-profit)] transition-all"
              style={{ width: `${longExpPct}%` }}
              title={`Long Exposure: ${longExpPct}%`}
            />
          </div>
          <div className="text-[10px] font-mono text-[var(--theme-text-muted)] flex justify-between mt-1">
            <span className="text-[var(--theme-profit)]">${Math.round(longExp).toLocaleString()} L</span>
            <span className="text-[var(--theme-loss)]">${Math.round(shortExp).toLocaleString()} S</span>
          </div>
        </div>
      </div>

      {/* 4. Margin Utilization */}
      <div className="p-4 rounded-2xl bg-[var(--theme-surface)]/90 backdrop-blur-md border border-[var(--theme-border)] shadow-md hover:border-[var(--theme-accent)]/40 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
          <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Margin Used</span>
          <div title="Margin allocated across positions vs available capital">
            <HelpCircle className="h-3 w-3 text-[var(--theme-text-muted)] cursor-help" />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--theme-text-primary)]">
            ${marginUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {/* Progress bar */}
          <div className="w-full bg-[var(--theme-elevated)] h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                marginUtilPct > 75
                  ? "bg-[var(--theme-loss)]"
                  : marginUtilPct > 50
                  ? "bg-[var(--theme-warning)]"
                  : "bg-[var(--theme-accent)]"
              }`}
              style={{ width: `${marginUtilPct}%` }}
            />
          </div>
          <div className="text-[10px] font-mono text-[var(--theme-text-muted)] flex justify-between mt-1">
            <span>{marginUtilPct}% Utilized</span>
            <span>${Math.round(availMargin).toLocaleString()} Avail</span>
          </div>
        </div>
      </div>

      {/* 5. Portfolio Risk (VaR) */}
      <div className="p-4 rounded-2xl bg-[var(--theme-surface)]/90 backdrop-blur-md border border-[var(--theme-border)] shadow-md hover:border-[var(--theme-accent)]/40 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
          <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Portfolio Risk (VaR)</span>
          <div title="Value-at-risk at stop loss boundaries as % of total equity">
            <Activity className="h-3 w-3 text-[var(--theme-text-muted)] cursor-help" />
          </div>
        </div>
        <div className="mt-1.5">
          <div
            className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${
              riskUtil > 4.0 ? "text-[var(--theme-warning)]" : "text-[var(--theme-text-primary)]"
            }`}
          >
            {riskUtil.toFixed(2)}%
          </div>
          <div className="text-[11px] font-mono text-[var(--theme-text-muted)] mt-0.5">
            <span>Max Cap: 5.00%</span>
          </div>
        </div>
      </div>

      {/* 6. Daily Drawdown Tracker */}
      <div className="p-4 rounded-2xl bg-[var(--theme-surface)]/90 backdrop-blur-md border border-[var(--theme-border)] shadow-md hover:border-[var(--theme-accent)]/40 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
          <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Daily Loss Limit</span>
          <div title="Accumulated daily drawdown vs hard circuit breaker threshold">
            <HelpCircle className="h-3 w-3 text-[var(--theme-text-muted)] cursor-help" />
          </div>
        </div>
        <div className="mt-1.5">
          <div
            className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${
              dailyLossPct > 50 ? "text-[var(--theme-loss)]" : "text-[var(--theme-text-primary)]"
            }`}
          >
            ${dailyLoss.toFixed(2)}{" "}
            <span className="text-xs font-normal text-[var(--theme-text-muted)]">
              / ${dailyLossLimit.toFixed(0)}
            </span>
          </div>
          <div className="text-[11px] font-mono text-[var(--theme-profit)] flex items-center gap-1 mt-0.5">
            <Shield className="h-3 w-3" />
            <span>Circuit Armed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
