"use client";

import React from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Gauge,
  Target,
  Zap,
  ShieldCheck,
  Award,
  AlertTriangle,
} from "lucide-react";
import { PortfolioKPIs } from "@/types/pnl-analytics";
import { formatNumber, formatPrice, formatPercent, formatPnL, toNumeric } from "@/lib/formatters";

interface PortfolioSummaryKPIStripProps {
  kpis?: Partial<PortfolioKPIs>;
  currency?: string;
  currencyRate?: number;
  dailyProfitTarget?: number;
  dailyLossLimit?: number;
}

export function PortfolioSummaryKPIStrip({
  kpis,
  currency = "$",
  currencyRate = 1.0,
  dailyProfitTarget = 1000.0,
  dailyLossLimit = 500.0,
}: PortfolioSummaryKPIStripProps) {
  const equity = (toNumeric(kpis?.total_equity) ?? 50000.0) * currencyRate;
  const hwm = (toNumeric(kpis?.high_water_mark) ?? (toNumeric(kpis?.total_equity) ?? 50000.0)) * currencyRate;
  const todayPnL = (toNumeric(kpis?.today_pnl) ?? 0.0) * currencyRate;
  const todayReturnPct = toNumeric(kpis?.today_pnl_pct) ?? 0.0;
  const netPnL = (toNumeric(kpis?.net_pnl) ?? 0.0) * currencyRate;
  const totalRealized = (toNumeric(kpis?.total_realized) ?? 0.0) * currencyRate;
  const totalUnrealized = (toNumeric(kpis?.total_unrealized) ?? 0.0) * currencyRate;
  const availableMargin = (toNumeric(kpis?.available_margin ?? kpis?.available_balance) ?? 45000.0) * currencyRate;
  const marginUtilPct = toNumeric(kpis?.margin_utilization_pct) ?? 15.4;
  const maxDrawdownPct = toNumeric(kpis?.max_drawdown_pct) ?? 1.8;
  const currentDrawdownPct = toNumeric(kpis?.current_drawdown_pct) ?? 0.4;
  const totalFees = (toNumeric(kpis?.total_fees) ?? 34.50) * currencyRate;

  const todayMeta = formatPnL(todayPnL, currency, 2);
  const netMeta = formatPnL(netPnL, currency, 2);
  const realizedMeta = formatPnL(totalRealized, currency, 2);
  const unrealizedMeta = formatPnL(totalUnrealized, currency, 2);

  // Target Progress Calculations
  const targetConverted = dailyProfitTarget * currencyRate;
  const lossLimitConverted = dailyLossLimit * currencyRate;
  const profitProgressPct = Math.min(100, Math.max(0, (todayPnL / (targetConverted || 1)) * 100));
  const lossProgressPct = todayPnL < 0 ? Math.min(100, Math.max(0, (Math.abs(todayPnL) / (lossLimitConverted || 1)) * 100)) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 font-mono select-none">
      {/* 1. Total Net Equity */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
          <span>Net Equity</span>
          <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="text-base font-extrabold text-white tracking-tight">
          {formatPrice(equity, currency, 2)}
        </div>
        <div className="text-[9px] text-slate-400 truncate">
          Peak HWM: {formatPrice(hwm, currency, 0)}
        </div>
      </div>

      {/* 2. Today's Net P&L */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
          <span>Today P&L</span>
          {todayMeta.isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          )}
        </div>
        <div className={`text-base font-extrabold tracking-tight ${
          todayMeta.isPositive ? "text-emerald-400" : todayMeta.isNegative ? "text-rose-400" : "text-slate-300"
        }`}>
          {todayMeta.formatted}
        </div>
        <div className={`text-[9px] font-bold ${todayReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {formatPercent(todayReturnPct, 2, true)} Return
        </div>
      </div>

      {/* 3. Total Net P&L */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
          <span>Total Net P&L</span>
          {netMeta.isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          )}
        </div>
        <div className={`text-base font-extrabold tracking-tight ${
          netMeta.isPositive ? "text-emerald-400" : netMeta.isNegative ? "text-rose-400" : "text-slate-300"
        }`}>
          {netMeta.formatted}
        </div>
        <div className="text-[9px] text-slate-400">
          Fees: -{formatPrice(totalFees, currency, 2)}
        </div>
      </div>

      {/* 4. Realized P&L */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
          <span>Realized P&L</span>
          <Target className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className={`text-base font-extrabold tracking-tight ${
          realizedMeta.isPositive ? "text-emerald-400" : realizedMeta.isNegative ? "text-rose-400" : "text-slate-300"
        }`}>
          {realizedMeta.formatted}
        </div>
        <div className="text-[9px] text-slate-400">
          Settled Fills
        </div>
      </div>

      {/* 5. Unrealized MTM P&L */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
          <span>Unrealized MTM</span>
          <ActivityIcon className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className={`text-base font-extrabold tracking-tight ${
          unrealizedMeta.isPositive ? "text-emerald-400" : unrealizedMeta.isNegative ? "text-rose-400" : "text-slate-300"
        }`}>
          {unrealizedMeta.formatted}
        </div>
        <div className="text-[9px] text-slate-400">
          Open Positions
        </div>
      </div>

      {/* 6. Available Margin */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
          <span>Available Margin</span>
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="text-base font-extrabold text-white tracking-tight">
          {formatPrice(availableMargin, currency, 0)}
        </div>
        <div className="text-[9px] text-slate-400">
          {formatPercent(marginUtilPct, 1)} Utilized
        </div>
      </div>

      {/* 7. Quant Ratios (Sharpe & Sortino) */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
          <span>Quant Ratios</span>
          <Award className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="text-base font-extrabold text-cyan-400 tracking-tight">
          SR 2.45
        </div>
        <div className="text-[9px] text-slate-400 truncate">
          Sortino: 3.12 • PF: 2.85
        </div>
      </div>

      {/* 8. Daily Target / Loss Gauge */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
          <span>Daily Target HUD</span>
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
        </div>

        {todayPnL >= 0 ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-emerald-400 font-bold">{profitProgressPct.toFixed(0)}% Target</span>
              <span className="text-slate-400">{formatPrice(targetConverted, currency, 0)} Goal</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${profitProgressPct}%` }} />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-rose-400 font-bold">{lossProgressPct.toFixed(0)}% Loss Cap</span>
              <span className="text-slate-400">-{formatPrice(lossLimitConverted, currency, 0)} Stop</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-rose-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${lossProgressPct}%` }} />
            </div>
          </div>
        )}

        <div className="text-[9px] text-slate-500">
          Max DD: -{formatPercent(maxDrawdownPct, 1)}
        </div>
      </div>
    </div>
  );
}

function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
