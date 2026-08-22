"use client";

import React from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Shield,
  Percent,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";

interface PositionsSummaryData {
  total_unrealized_pnl?: number;
  total_realized_pnl?: number;
  open_positions_count?: number;
  long_positions_count?: number;
  short_positions_count?: number;
  long_exposure?: number;
  short_exposure?: number;
  net_exposure?: number;
  total_margin_used?: number;
  available_margin?: number;
  account_balance?: number;
  portfolio_risk_utilization_pct?: number;
  daily_loss?: number;
  daily_loss_limit?: number;
}

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
            className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)] h-28 flex flex-col justify-between"
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
  const marginUsed = summary?.total_margin_used || 0;
  const availMargin = summary?.available_margin || 10000;
  const totalBalance = (summary?.account_balance || 10000);
  const marginUtilPct = totalBalance > 0 ? Math.min(100, Math.round((marginUsed / totalBalance) * 100)) : 0;
  const riskUtil = summary?.portfolio_risk_utilization_pct || 0;
  const dailyLoss = summary?.daily_loss || 0;
  const dailyLossLimit = summary?.daily_loss_limit || 500;
  const dailyLossPct = dailyLossLimit > 0 ? Math.min(100, Math.round((dailyLoss / dailyLossLimit) * 100)) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-sans select-none">
      {/* 1. Total Floating Unrealized P&L */}
      <div className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Unrealized P&L</span>
          <div title="Real-time mark-to-market floating P&L across all open positions">
            <HelpCircle className="h-3 w-3 text-[var(--theme-text-muted)] cursor-help" />
          </div>
        </div>
        <div className="mt-1">
          <div
            className={`text-lg sm:text-xl font-extrabold font-mono tabular-nums ${
              isUnPnlPos ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
            }`}
          >
            {isUnPnlPos ? "+" : ""}${unPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-[var(--theme-text-muted)] flex items-center gap-1 mt-0.5">
            {isUnPnlPos ? (
              <TrendingUp className="h-3 w-3 text-[var(--theme-profit)]" />
            ) : (
              <TrendingDown className="h-3 w-3 text-[var(--theme-loss)]" />
            )}
            <span>Mark-to-Market</span>
          </div>
        </div>
      </div>

      {/* 2. Realized P&L */}
      <div className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Realized P&L</span>
          <div title="Authoritative booked profit/loss from closed trade executions">
            <HelpCircle className="h-3 w-3 text-[var(--theme-text-muted)] cursor-help" />
          </div>
        </div>
        <div className="mt-1">
          <div
            className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${
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

      {/* 3. Open Positions & Exposure Split */}
      <div className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Active Positions</span>
          <div title="Number of open positions and directional exposure ratio">
            <HelpCircle className="h-3 w-3 text-[var(--theme-text-muted)] cursor-help" />
          </div>
        </div>
        <div className="mt-1">
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--theme-text-primary)] flex items-baseline gap-1.5">
            <span>{openCount}</span>
            <span className="text-xs font-normal text-[var(--theme-text-muted)]">
              ({longCount}L / {shortCount}S)
            </span>
          </div>
          <div className="text-[11px] font-mono text-[var(--theme-text-muted)] truncate mt-0.5">
            <span className="text-[var(--theme-profit)]">${Math.round(longExp).toLocaleString()}</span> L •{" "}
            <span className="text-[var(--theme-loss)]">${Math.round(shortExp).toLocaleString()}</span> S
          </div>
        </div>
      </div>

      {/* 4. Margin Utilization */}
      <div className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Margin Used</span>
          <div title="Margin allocated across positions vs available margin buffer">
            <HelpCircle className="h-3 w-3 text-[var(--theme-text-muted)] cursor-help" />
          </div>
        </div>
        <div className="mt-1">
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--theme-text-primary)]">
            ${marginUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {/* Progress bar */}
          <div className="w-full bg-[var(--theme-elevated)] h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                marginUtilPct > 75 ? "bg-[var(--theme-loss)]" : "bg-[var(--theme-accent)]"
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
      <div className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Portfolio Risk (VaR)</span>
          <div title="Aggregate value-at-risk at stop loss levels as a % of equity">
            <HelpCircle className="h-3 w-3 text-[var(--theme-text-muted)] cursor-help" />
          </div>
        </div>
        <div className="mt-1">
          <div
            className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${
              riskUtil > 4.0 ? "text-[var(--theme-warning)]" : "text-[var(--theme-text-primary)]"
            }`}
          >
            {riskUtil.toFixed(2)}%
          </div>
          <div className="text-[11px] font-mono text-[var(--theme-text-muted)] mt-0.5">
            <span>Cap: 5.00% Max</span>
          </div>
        </div>
      </div>

      {/* 6. Daily Drawdown Tracker */}
      <div className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Daily Loss Limit</span>
          <div title="Daily loss accumulated vs hard circuit-breaker stop limit">
            <HelpCircle className="h-3 w-3 text-[var(--theme-text-muted)] cursor-help" />
          </div>
        </div>
        <div className="mt-1">
          <div
            className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${
              dailyLossPct > 50 ? "text-[var(--theme-loss)]" : "text-[var(--theme-text-primary)]"
            }`}
          >
            ${dailyLoss.toFixed(2)} <span className="text-xs font-normal text-[var(--theme-text-muted)]">/ ${dailyLossLimit.toFixed(0)}</span>
          </div>
          <div className="text-[11px] font-mono text-[var(--theme-profit)] flex items-center gap-1 mt-0.5">
            <Shield className="h-3 w-3" />
            <span>0 Breaches</span>
          </div>
        </div>
      </div>
    </div>
  );
}
