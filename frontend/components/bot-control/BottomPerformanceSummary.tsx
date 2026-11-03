"use client";

import React from "react";
import {
  TrendingUp,
  Percent,
  CheckCircle2,
  Layers,
  Activity,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, formatSignedMoney } from "@/lib/formatters";

export interface BottomPerformanceSummaryProps {
  lifetimeNetPnl: number;
  todayPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalTrades: number;
  winRatePct: number;
  profitFactor: number;
  openPositionsCount: number;
  currencySymbol?: string;
}

export function BottomPerformanceSummary({
  lifetimeNetPnl,
  todayPnl,
  realizedPnl,
  unrealizedPnl,
  totalTrades,
  winRatePct,
  profitFactor,
  openPositionsCount,
  currencySymbol = "$",
}: BottomPerformanceSummaryProps) {
  return (
    <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-3 shadow-md select-none font-sans">
      <div className="flex items-center justify-between pb-2 border-b border-[#1A2B43]/70 mb-2.5">
        <div className="flex items-center gap-1.5">
          <Award className="h-4 w-4 text-[#00C9E8]" />
          <h3 className="text-xs font-bold text-[#EAF3FF] font-mono uppercase tracking-wider">
            Quantitative Fleet Performance Summary
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#00D6A0] bg-[#00D6A0]/10 border border-[#00D6A0]/30 px-2 py-0.5 rounded">
          Portfolio Engine Synchronized
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 font-mono">
        {/* 1. Lifetime Net P&L */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between min-h-[64px]">
          <span className="text-[10px] uppercase font-bold text-[#91A7C1]">Lifetime Net P&amp;L</span>
          <span
            className={cn(
              "text-sm sm:text-base font-bold tabular-nums tracking-tight",
              lifetimeNetPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]"
            )}
          >
            {formatSignedMoney(lifetimeNetPnl, currencySymbol)}
          </span>
        </div>

        {/* 2. Today's P&L */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between min-h-[64px]">
          <span className="text-[10px] uppercase font-bold text-[#91A7C1]">Today’s P&amp;L</span>
          <span
            className={cn(
              "text-sm sm:text-base font-bold tabular-nums tracking-tight",
              todayPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]"
            )}
          >
            {formatSignedMoney(todayPnl, currencySymbol)}
          </span>
        </div>

        {/* 3. Realized P&L */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between min-h-[64px]">
          <span className="text-[10px] uppercase font-bold text-[#91A7C1]">Realized P&amp;L</span>
          <span
            className={cn(
              "text-sm sm:text-base font-bold tabular-nums tracking-tight",
              realizedPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]"
            )}
          >
            {formatSignedMoney(realizedPnl, currencySymbol)}
          </span>
        </div>

        {/* 4. Unrealized P&L */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between min-h-[64px]">
          <span className="text-[10px] uppercase font-bold text-[#91A7C1]">Unrealized P&amp;L</span>
          <span
            className={cn(
              "text-sm sm:text-base font-bold tabular-nums tracking-tight",
              unrealizedPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]"
            )}
          >
            {formatSignedMoney(unrealizedPnl, currencySymbol)}
          </span>
        </div>

        {/* 5. Total Trades */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between min-h-[64px]">
          <span className="text-[10px] uppercase font-bold text-[#91A7C1]">Total Trades</span>
          <span className="text-sm sm:text-base font-bold text-[#EAF3FF] tabular-nums">
            {formatNumber(totalTrades, 0)}
          </span>
        </div>

        {/* 6. Win Rate */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between min-h-[64px]">
          <span className="text-[10px] uppercase font-bold text-[#91A7C1]">Win Rate</span>
          <span
            className={cn(
              "text-sm sm:text-base font-bold tabular-nums",
              winRatePct >= 50 ? "text-[#00D6A0]" : "text-[#FFB020]"
            )}
          >
            {winRatePct.toFixed(1)}%
          </span>
        </div>

        {/* 7. Profit Factor */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between min-h-[64px]">
          <span className="text-[10px] uppercase font-bold text-[#91A7C1]">Profit Factor</span>
          <span
            className={cn(
              "text-sm sm:text-base font-bold tabular-nums",
              profitFactor >= 1.5 ? "text-[#00D6A0]" : profitFactor >= 1 ? "text-[#00C9E8]" : "text-[#FF5268]"
            )}
          >
            {profitFactor > 0 ? profitFactor.toFixed(2) : "1.00"}
          </span>
        </div>

        {/* 8. Open Positions */}
        <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2 flex flex-col justify-between min-h-[64px]">
          <span className="text-[10px] uppercase font-bold text-[#91A7C1]">Open Positions</span>
          <span className="text-sm sm:text-base font-bold text-[#00C9E8] tabular-nums">
            {openPositionsCount} Active
          </span>
        </div>
      </div>
    </div>
  );
}

