"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Target,
  DollarSign,
  Activity,
  Layers,
} from "lucide-react";
import { DailyProfitabilityBar } from "@/types/pnl-analytics";
import { formatPrice, formatPercent, formatPnL } from "@/lib/formatters";

interface BarHoverTooltipProps {
  bar: DailyProfitabilityBar;
  metric: string;
  currency?: string;
  tradingMode?: "PAPER" | "LIVE";
  x: number;
  y: number;
  containerWidth?: number;
}

export function BarHoverTooltip({
  bar,
  metric,
  currency = "$",
  tradingMode = "PAPER",
  x,
  y,
  containerWidth = 900,
}: BarHoverTooltipProps) {
  const pnlMeta = formatPnL(bar.netPnl, currency, 2);
  const isPositive = bar.netPnl > 0.001;
  const isNegative = bar.netPnl < -0.001;
  const isFlat = !isPositive && !isNegative;

  // Compute position relative to chart container (avoid overflowing right edge)
  const tooltipWidth = 280;
  const leftPos = x + tooltipWidth > containerWidth - 20 ? x - tooltipWidth - 15 : x + 15;
  const topPos = Math.max(10, Math.min(y - 80, 180));

  return (
    <div
      role="tooltip"
      aria-label={`Performance details for ${bar.displayDate}`}
      className="absolute z-40 pointer-events-none transition-all duration-75 ease-out"
      style={{
        left: `${leftPos}px`,
        top: `${topPos}px`,
        width: `${tooltipWidth}px`,
      }}
    >
      <div className="bg-[#0B111E]/95 backdrop-blur-md border border-[#1E293B] shadow-2xl shadow-black/80 rounded-xl p-3.5 space-y-2.5 font-mono text-xs text-slate-200">
        {/* Header: Date + Status Badges */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
          <div>
            <div className="text-white font-bold text-sm tracking-tight">{bar.displayDate}</div>
            <div className="text-[10px] text-slate-400">{bar.dayOfWeek}</div>
          </div>
          <div className="flex items-center gap-1.5">
            {bar.status === "INCOMPLETE" && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-semibold text-cyan-400 animate-pulse">
                <Clock className="w-2.5 h-2.5" />
                LIVE
              </span>
            )}
            {bar.reconciliationStatus === "UNRECONCILED" ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] font-semibold text-amber-400">
                <ShieldAlert className="w-2.5 h-2.5" />
                UNRECONCILED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-semibold text-emerald-400">
                <ShieldCheck className="w-2.5 h-2.5" />
                RECONCILED
              </span>
            )}
          </div>
        </div>

        {/* Primary Metric Hero Card */}
        <div className="bg-[#050811] border border-[#1E293B]/70 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Net Profit / Loss</div>
            <div
              className={`text-lg font-extrabold tracking-tight flex items-center gap-1 ${
                isPositive ? "text-emerald-400" : isNegative ? "text-red-400" : "text-slate-300"
              }`}
            >
              {isPositive && <TrendingUp className="w-4 h-4" />}
              {isNegative && <TrendingDown className="w-4 h-4" />}
              <span>{pnlMeta.formatted}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Daily Return</div>
            <div
              className={`text-sm font-bold ${
                bar.returnPct > 0 ? "text-emerald-400" : bar.returnPct < 0 ? "text-red-400" : "text-slate-300"
              }`}
            >
              {formatPercent(bar.returnPct, 2, true)}
            </div>
          </div>
        </div>

        {/* Financial Breakdown Grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] pt-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Gross P&L:</span>
            <span className="font-semibold text-slate-200">{formatPnL(bar.grossPnl, currency).formatted}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Realized:</span>
            <span className="font-semibold text-slate-200">{formatPnL(bar.realizedPnl, currency).formatted}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Total Fees:</span>
            <span className="text-red-400/90 font-medium">-{formatPrice(bar.fees + bar.commissions, currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Funding:</span>
            <span className="font-medium text-slate-300">{formatPnL(bar.funding, currency).formatted}</span>
          </div>
          {bar.netExternalCashFlow !== 0 && (
            <div className="col-span-2 flex items-center justify-between border-t border-[#1E293B]/50 pt-1">
              <span className="text-slate-400">Net Cash Flow:</span>
              <span className="font-semibold text-cyan-400">{formatPnL(bar.netExternalCashFlow, currency).formatted}</span>
            </div>
          )}
        </div>

        {/* Trade Quality & Sizing */}
        <div className="border-t border-[#1E293B] pt-2 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Executions:</span>
            <span className="text-white font-bold">
              {bar.trades} trade{bar.trades === 1 ? "" : "s"} ({bar.wins}W / {bar.losses}L)
            </span>
          </div>
          {bar.trades > 0 && (
            <>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Session Win Rate:</span>
                <span className={`font-semibold ${bar.winRate >= 50 ? "text-emerald-400" : "text-amber-400"}`}>
                  {formatPercent(bar.winRate, 1)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Best: <span className="text-emerald-400 font-semibold">{formatPnL(bar.bestTrade, currency).formatted}</span></span>
                <span>Worst: <span className="text-red-400 font-semibold">{formatPnL(bar.worstTrade, currency).formatted}</span></span>
              </div>
            </>
          )}
        </div>

        {/* Equity & Peak State */}
        <div className="border-t border-[#1E293B] pt-2 flex items-center justify-between text-[10px] text-slate-400">
          <div>
            <span>End Equity: </span>
            <span className="text-white font-semibold">{formatPrice(bar.closingEquity, currency)}</span>
          </div>
          <div>
            <span>Drawdown: </span>
            <span className={bar.drawdownPct > 0 ? "text-red-400 font-semibold" : "text-slate-400 font-medium"}>
              {bar.drawdownPct > 0 ? `-${formatPercent(bar.drawdownPct, 2)}` : "0.00%"}
            </span>
          </div>
        </div>

        {/* Click-to-Analyze Prompt */}
        <div className="text-[9px] text-cyan-400/80 text-center pt-1 border-t border-[#1E293B]/40 italic">
          Click bar for full Day Analysis drill-down & orders
        </div>
      </div>
    </div>
  );
}
