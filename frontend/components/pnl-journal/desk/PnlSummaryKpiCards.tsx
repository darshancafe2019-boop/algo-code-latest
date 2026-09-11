"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Calculator,
  Scale,
  ShieldAlert,
  Target,
  Flame,
  Zap,
  DollarSign,
} from "lucide-react";
import { PnlSummary } from "@/types/pnl-journal";

interface PnlSummaryKpiCardsProps {
  summary: PnlSummary;
  currencySymbol?: string;
}

export const PnlSummaryKpiCards: React.FC<PnlSummaryKpiCardsProps> = ({
  summary,
  currencySymbol = "₹",
}) => {
  const formatMoney = (val: number) => {
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    let str = "";
    if (absVal >= 10000000) {
      str = `${(absVal / 10000000).toFixed(2)} Cr`;
    } else if (absVal >= 100000) {
      str = `${(absVal / 100000).toFixed(2)} L`;
    } else if (absVal >= 1000) {
      str = `${(absVal / 1000).toFixed(1)} K`;
    } else {
      str = absVal.toFixed(2);
    }
    return `${isNeg ? "-" : "+"}${currencySymbol}${str}`;
  };

  const isNetPositive = summary.netPnl >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
      {/* 1. Net P&L (Hero) */}
      <div className={`p-3.5 rounded-xl border backdrop-blur-md shadow-md transition-all ${
        isNetPositive
          ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50"
          : "bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50"
      }`}>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-semibold tracking-wider uppercase text-[10px]">Net P&L (FIFO)</span>
          {isNetPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          )}
        </div>
        <div className={`text-base font-bold font-mono tracking-tight ${
          isNetPositive ? "text-emerald-400" : "text-rose-400"
        }`}>
          {formatMoney(summary.netPnl)}
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-1 flex justify-between">
          <span>Gross: {formatMoney(summary.grossPnl)}</span>
        </div>
      </div>

      {/* 2. Realized vs Unrealized */}
      <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-md hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-semibold tracking-wider uppercase text-[10px]">Realized P&L</span>
          <Scale className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className={`text-base font-bold font-mono ${
          summary.realizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"
        }`}>
          {formatMoney(summary.realizedPnl)}
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-1 flex justify-between">
          <span>Unrealized:</span>
          <span className={summary.unrealizedPnl >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
            {formatMoney(summary.unrealizedPnl)}
          </span>
        </div>
      </div>

      {/* 3. Total Charges & Taxes */}
      <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-md hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-semibold tracking-wider uppercase text-[10px]">Total Charges</span>
          <Calculator className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="text-base font-bold font-mono text-amber-400">
          {currencySymbol}{summary.totalCharges.toFixed(2)}
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-1 flex justify-between">
          <span>STT: {currencySymbol}{summary.totalStt.toFixed(0)}</span>
          <span>GST: {currencySymbol}{summary.totalGst.toFixed(0)}</span>
        </div>
      </div>

      {/* 4. Win Rate & Trade Count */}
      <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-md hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-semibold tracking-wider uppercase text-[10px]">Win Rate</span>
          <Percent className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="text-base font-bold font-mono text-cyan-400">
          {summary.winRate.toFixed(1)}%
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-1 flex justify-between">
          <span className="text-emerald-400">{summary.winningTradesCount}W</span>
          <span className="text-rose-400">{summary.losingTradesCount}L</span>
          <span className="text-slate-400">({summary.totalTrades} total)</span>
        </div>
      </div>

      {/* 5. Profit Factor & Expectancy */}
      <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-md hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-semibold tracking-wider uppercase text-[10px]">Profit Factor</span>
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div className={`text-base font-bold font-mono ${
          summary.profitFactor >= 1.5 ? "text-emerald-400" : summary.profitFactor >= 1.0 ? "text-cyan-400" : "text-rose-400"
        }`}>
          {summary.profitFactor.toFixed(2)}
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-1 flex justify-between">
          <span>Exp: {formatMoney(summary.tradeExpectancy)}</span>
        </div>
      </div>

      {/* 6. Avg Win vs Avg Loss */}
      <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-md hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-semibold tracking-wider uppercase text-[10px]">Win / Loss Ratio</span>
          <Target className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="text-base font-bold font-mono text-purple-400">
          {summary.winLossRatio.toFixed(2)}x
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-1 flex justify-between">
          <span className="text-emerald-400">+{currencySymbol}{summary.averageWinAmount.toFixed(0)}</span>
          <span className="text-rose-400">-{currencySymbol}{summary.averageLossAmount.toFixed(0)}</span>
        </div>
      </div>

      {/* 7. Max Drawdown */}
      <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-md hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-semibold tracking-wider uppercase text-[10px]">Max Drawdown</span>
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
        </div>
        <div className="text-base font-bold font-mono text-rose-400">
          -{summary.maxDrawdownPercent.toFixed(2)}%
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-1 flex justify-between">
          <span>-{currencySymbol}{summary.maxDrawdownAmount.toFixed(0)}</span>
          <span>Rec: {summary.recoveryFactor.toFixed(1)}x</span>
        </div>
      </div>

      {/* 8. R-Multiple & Streaks */}
      <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-md hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-semibold tracking-wider uppercase text-[10px]">Avg R-Multiple</span>
          <Flame className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className={`text-base font-bold font-mono ${
          summary.averageRMultiple >= 1.0 ? "text-emerald-400" : summary.averageRMultiple >= 0 ? "text-cyan-400" : "text-rose-400"
        }`}>
          {summary.averageRMultiple >= 0 ? `+${summary.averageRMultiple.toFixed(2)}R` : `${summary.averageRMultiple.toFixed(2)}R`}
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-1 flex justify-between">
          <span className="text-emerald-400">Max W: {summary.maxWinStreak}</span>
          <span className="text-rose-400">Max L: {summary.maxLossStreak}</span>
        </div>
      </div>
    </div>
  );
};
