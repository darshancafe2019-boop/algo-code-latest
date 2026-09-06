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
  Clock,
  Layers,
  Globe,
} from "lucide-react";
import { PositionsSummaryData } from "@/types/positions";

interface PositionsKpiStripProps {
  summary?: PositionsSummaryData;
  isLoading?: boolean;
}

export function PositionsKpiStrip({ summary, isLoading }: PositionsKpiStripProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 font-sans select-none">
        <div className="h-5 w-48 bg-[var(--theme-elevated)]/60 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
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
      </div>
    );
  }

  const unPnl = summary?.total_unrealized_pnl !== undefined ? Number(summary.total_unrealized_pnl) : null;
  const isUnPnlPos = unPnl !== null ? unPnl >= 0 : false;
  const relPnl = summary?.total_realized_pnl !== undefined ? Number(summary.total_realized_pnl) : null;
  const isRelPnlPos = relPnl !== null ? relPnl >= 0 : false;
  
  const openCount = summary?.open_positions_count ?? 0;
  const longCount = summary?.long_positions_count ?? 0;
  const shortCount = summary?.short_positions_count ?? 0;
  const longExp = summary?.long_exposure ?? 0;
  const shortExp = summary?.short_exposure ?? 0;
  const totalExp = longExp + shortExp;
  const longExpPct = totalExp > 0 ? Math.round((longExp / totalExp) * 100) : 50;

  const marginUsed = summary?.total_margin_used ?? 0;
  const availMargin = summary?.available_margin ?? 50000;
  const totalBalance = summary?.account_balance || (marginUsed + availMargin);
  const marginUtilPct = totalBalance > 0 ? Math.min(100, Math.round((marginUsed / totalBalance) * 100)) : 0;
  
  const riskUtil = summary?.portfolio_risk_utilization_pct ?? 0;
  const portfolioVar = summary?.portfolio_var_usd ?? 0;
  const dailyLoss = summary?.daily_loss ?? 0;
  const dailyLossLimit = summary?.daily_loss_limit ?? 500;
  const dailyLossPct = dailyLossLimit > 0 ? Math.min(100, Math.round((dailyLoss / dailyLossLimit) * 100)) : 0;
  
  const scopeText = summary?.scope || "ALL SOURCES (PAPER)";
  const currency = summary?.currency || "USD";
  const asOfTime = summary?.as_of_timestamp
    ? new Date(summary.as_of_timestamp).toLocaleTimeString("en-US", { hour12: false }) + " UTC"
    : "Live Feed";

  return (
    <div className="space-y-2 font-sans select-none">
      {/* Dynamic Scope & Timestamp Meta Strip */}
      <div className="flex items-center justify-between px-1 text-[11px] text-[var(--theme-text-secondary)] font-mono flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[var(--theme-accent)] font-bold">
            <Globe className="h-3 w-3" />
            <span>SCOPE: {scopeText}</span>
          </span>
          <span className="text-[var(--theme-text-muted)]">•</span>
          <span className="text-[var(--theme-text-muted)]">CURRENCY: {currency}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[var(--theme-text-muted)]">
          <Clock className="h-3 w-3" />
          <span>AUTHORITATIVE AS-OF: {asOfTime}</span>
        </div>
      </div>

      {/* 6 Core Institutional KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Floating Unrealized P&L */}
        <div className="p-4 rounded-2xl bg-[var(--theme-surface)]/90 backdrop-blur-md border border-[var(--theme-border)] shadow-md hover:border-[var(--theme-accent)]/40 transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
            <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Unrealized P&L</span>
            <div title="Real-time mark-to-market floating P&L calculated authoritatively by backend P&L engine">
              <HelpCircle className="h-3 w-3 text-[var(--theme-text-muted)] cursor-help" />
            </div>
          </div>
          <div className="mt-1.5">
            <div
              className={`text-lg sm:text-xl font-black font-mono tabular-nums tracking-tight ${
                unPnl === null
                  ? "text-[var(--theme-text-muted)]"
                  : isUnPnlPos
                  ? "text-[var(--theme-profit)]"
                  : "text-[var(--theme-loss)]"
              }`}
            >
              {unPnl === null ? "—" : `${isUnPnlPos ? "+" : ""}$${unPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <div className="text-[11px] font-mono text-[var(--theme-text-muted)] flex items-center gap-1 mt-0.5">
              {unPnl !== null && (
                isUnPnlPos ? (
                  <TrendingUp className="h-3 w-3 text-[var(--theme-profit)] shrink-0" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-[var(--theme-loss)] shrink-0" />
                )
              )}
              <span>Live Mark-to-Market</span>
            </div>
          </div>
        </div>

        {/* 2. Realized Booked P&L */}
        <div className="p-4 rounded-2xl bg-[var(--theme-surface)]/90 backdrop-blur-md border border-[var(--theme-border)] shadow-md hover:border-[var(--theme-accent)]/40 transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
            <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Realized P&L</span>
            <div title="Cumulative booked profit/loss verified across closed executions">
              <HelpCircle className="h-3 w-3 text-[var(--theme-text-muted)] cursor-help" />
            </div>
          </div>
          <div className="mt-1.5">
            <div
              className={`text-lg sm:text-xl font-black font-mono tabular-nums tracking-tight ${
                relPnl === null
                  ? "text-[var(--theme-text-muted)]"
                  : isRelPnlPos
                  ? "text-[var(--theme-profit)]"
                  : "text-[var(--theme-loss)]"
              }`}
            >
              {relPnl === null ? "—" : `${isRelPnlPos ? "+" : ""}$${relPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
            <div title="Margin allocated across positions vs available broker capital">
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
            <div title="Value-at-Risk 95% 1-day calculated on backend with planned risk caps">
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
            <div className="text-[11px] font-mono text-[var(--theme-text-muted)] mt-0.5 flex justify-between">
              <span>VaR 95%: ${portfolioVar.toFixed(0)}</span>
              <span className="text-[10px]">Cap: 5.0%</span>
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
    </div>
  );
}
