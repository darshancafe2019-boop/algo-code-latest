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
} from "lucide-react";
import { PortfolioKPIs } from "@/types/pnl-analytics";
import { formatNumber, formatPrice, formatPercent, formatPnL, toNumeric } from "@/lib/formatters";

interface PortfolioSummaryKPIStripProps {
  kpis: PortfolioKPIs;
  currency?: string;
}

export function PortfolioSummaryKPIStrip({
  kpis,
  currency = "$",
}: PortfolioSummaryKPIStripProps) {
  const todayPnL = toNumeric(kpis?.today_pnl) ?? 0.0;
  const todayReturnPct = toNumeric(kpis?.today_pnl_pct) ?? 0.0;
  const netPnL = toNumeric(kpis?.net_pnl) ?? 0.0;
  const totalRealized = toNumeric(kpis?.total_realized) ?? 0.0;
  const totalUnrealized = toNumeric(kpis?.total_unrealized) ?? 0.0;

  const todayMeta = formatPnL(todayPnL, currency, 2);
  const netMeta = formatPnL(netPnL, currency, 2);
  const realizedMeta = formatPnL(totalRealized, currency, 2);
  const unrealizedMeta = formatPnL(totalUnrealized, currency, 2);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono">
      {/* 1. Total Equity */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
          <span>Total Equity</span>
          <DollarSign className="w-3 h-3 text-cyan-400" />
        </div>
        <div className="text-base font-bold text-white tracking-tight">
          {formatPrice(kpis?.total_equity, currency, 2)}
        </div>
        <div className="text-[9px] text-slate-400 truncate">
          HWM: {formatPrice(kpis?.high_water_mark, currency, 0)}
        </div>
      </div>

      {/* 2. Today's Net P&L */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
          <span>Today P&L</span>
          {todayMeta.isPositive ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-400" />
          )}
        </div>
        <div className={`text-base font-bold tracking-tight ${todayMeta.isPositive ? "text-emerald-400" : todayMeta.isNegative ? "text-red-400" : "text-slate-300"}`}>
          {todayMeta.formatted}
        </div>
        <div className={`text-[9px] font-semibold ${todayReturnPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {formatPercent(todayReturnPct, 2, true)} Return
        </div>
      </div>

      {/* 3. Total Net P&L */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
          <span>Total Net P&L</span>
          {netMeta.isPositive ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-400" />
          )}
        </div>
        <div className={`text-base font-bold tracking-tight ${netMeta.isPositive ? "text-emerald-400" : netMeta.isNegative ? "text-red-400" : "text-slate-300"}`}>
          {netMeta.formatted}
        </div>
        <div className="text-[9px] text-slate-400">
          Fees: -{formatPrice(kpis?.total_fees, currency, 2)}
        </div>
      </div>

      {/* 4. Realized P&L */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
          <span>Realized P&L</span>
          <Target className="w-3 h-3 text-cyan-400" />
        </div>
        <div className={`text-base font-bold tracking-tight ${realizedMeta.isPositive ? "text-emerald-400" : realizedMeta.isNegative ? "text-red-400" : "text-slate-300"}`}>
          {realizedMeta.formatted}
        </div>
        <div className="text-[9px] text-slate-400">
          Closed Executions
        </div>
      </div>

      {/* 5. Unrealized P&L */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
          <span>Unrealized P&L</span>
          <ActivityIcon className="w-3 h-3 text-purple-400" />
        </div>
        <div className={`text-base font-bold tracking-tight ${unrealizedMeta.isPositive ? "text-emerald-400" : unrealizedMeta.isNegative ? "text-red-400" : "text-slate-300"}`}>
          {unrealizedMeta.formatted}
        </div>
        <div className="text-[9px] text-slate-400">
          Mark to Market
        </div>
      </div>

      {/* 6. Available Capital */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
          <span>Available Margin</span>
          <Gauge className="w-3 h-3 text-cyan-400" />
        </div>
        <div className="text-base font-bold text-white tracking-tight">
          {formatPrice(kpis?.available_margin, currency, 0)}
        </div>
        <div className="text-[9px] text-slate-400">
          {formatPercent(kpis?.margin_utilization_pct, 1)} Utilized
        </div>
      </div>

      {/* 7. Gross Exposure */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
          <span>Gross Exposure</span>
          <Layers className="w-3 h-3 text-amber-400" />
        </div>
        <div className="text-base font-bold text-amber-400 tracking-tight">
          {formatPrice(kpis?.gross_exposure, currency, 0)}
        </div>
        <div className="text-[9px] text-slate-400 truncate">
          L: {formatPercent(kpis?.long_exposure_pct, 0)} / S: {formatPercent(kpis?.short_exposure_pct, 0)}
        </div>
      </div>

      {/* 8. Maximum Drawdown */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
          <span>Max Drawdown</span>
          <Zap className="w-3 h-3 text-rose-400" />
        </div>
        <div className="text-base font-bold text-rose-400 tracking-tight">
          -{formatPercent(kpis?.max_drawdown_pct, 2)}
        </div>
        <div className="text-[9px] text-slate-400 truncate">
          Current: -{formatPercent(kpis?.current_drawdown_pct, 2)}
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
