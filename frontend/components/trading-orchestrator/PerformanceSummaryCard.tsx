"use client";

import { formatMoney } from "@/lib/formatters";
import React from "react";
import {
  TrendingUp,
  BarChart3,
  Percent,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { PerformanceMetrics, DrawerContentType } from "./useSharedTradingState";
import { cn } from "@/lib/utils";

interface PerformanceSummaryCardProps {
  performance: PerformanceMetrics;
  onOpenDrawer: (type: DrawerContentType, title: string, data?: any) => void;
}

export const PerformanceSummaryCard: React.FC<PerformanceSummaryCardProps> = ({
  performance,
  onOpenDrawer,
}) => {
  const isProfit = performance.todayPnl >= 0;

  return (
    <div className="w-full bg-[#050e1d]/90 border border-[#12365a] rounded-xl p-4 shadow-lg select-none backdrop-blur flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#0d2847]">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#00D4FF]" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            TODAY&apos;S PERFORMANCE
          </h3>
        </div>

        <span
          className={cn(
            "font-mono font-black text-xs px-2 py-0.5 rounded border",
            isProfit
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          )}
        >
          {isProfit ? "+" : ""}{formatMoney(performance.todayPnl, "₹")}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 py-3 text-center font-mono">
        <div className="bg-[#07192f] border border-[#103456] rounded-lg p-2">
          <span className="text-[10px] text-slate-400 block uppercase">TRADES</span>
          <span className="text-slate-100 font-bold text-xs">{performance.todayTradesCount}</span>
        </div>

        <div className="bg-[#07192f] border border-[#103456] rounded-lg p-2">
          <span className="text-[10px] text-slate-400 block uppercase">WIN RATE</span>
          <span className="text-emerald-400 font-bold text-xs">{performance.winRatePercent}%</span>
        </div>

        <div className="bg-[#07192f] border border-[#103456] rounded-lg p-2">
          <span className="text-[10px] text-slate-400 block uppercase">RISK USED</span>
          <span className="text-cyan-300 font-bold text-xs">{performance.riskBudgetUsedPercent}%</span>
        </div>
      </div>

      {/* Button */}
      <div className="pt-2 border-t border-[#0d2847]">
        <button
          onClick={() => onOpenDrawer("trade_audit", "Chronological Execution & Trade Ledger")}
          className="w-full py-1.5 px-3 rounded-lg bg-[#07192f] hover:bg-[#0c284a] text-slate-200 hover:text-white border border-[#143e69] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Layers className="h-3.5 w-3.5 text-[#00D4FF]" />
          VIEW TRADE JOURNAL & AUDIT
        </button>
      </div>
    </div>
  );
};
