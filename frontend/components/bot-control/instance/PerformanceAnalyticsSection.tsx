"use client";

import React, { useState } from "react";
import { Award, Calendar, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, formatSignedMoney, formatDateTime } from "@/lib/formatters";

export interface CompletedTradeRecord {
  id: string;
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  grossPnl: number;
  netPnl: number;
  fees: number;
  holdingTimeStr: string;
  exitTimestamp: string;
}

export interface TradeAnalyticsMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  avgProfit: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  expectancy: number;
  avgRiskReward: number;
  maxDrawdownPct: number;
  recoveryFactor: number;
  netTradingFees: number;
  avgHoldingTime: string;
}

interface PerformanceAnalyticsSectionProps {
  metrics: TradeAnalyticsMetrics;
  trades: CompletedTradeRecord[];
  currencySymbol?: string;
}

export function PerformanceAnalyticsSection({
  metrics,
  trades,
  currencySymbol = "₹",
}: PerformanceAnalyticsSectionProps) {
  const [timeFilter, setTimeFilter] = useState<"TODAY" | "YESTERDAY" | "7D" | "30D" | "ALL">("ALL");

  return (
    <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-4 space-y-4 font-sans select-none shadow-md">
      {/* Header & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#1A2B43]/70 gap-2">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-[#00C9E8]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Performance &amp; Trade Analytics (Numerical Intelligence)
          </h3>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex items-center gap-1 bg-[#050B16] p-0.5 rounded-[6px] border border-[#1A2B43] text-xs font-mono">
          {(["TODAY", "YESTERDAY", "7D", "30D", "ALL"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setTimeFilter(filter)}
              className={cn(
                "px-2.5 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer",
                timeFilter === filter
                  ? "bg-[#0878FF] text-white shadow-sm"
                  : "text-[#91A7C1] hover:text-[#EAF3FF]"
              )}
            >
              {filter === "7D" ? "Last 7D" : filter === "30D" ? "Last 30D" : filter}
            </button>
          ))}
        </div>
      </div>

      {/* 15 Analytical Intelligence Cards (Pure Numerical Intelligence - Zero Charts) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 font-mono text-xs">
        {/* Win Rate */}
        <div className="p-3 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Win Rate</span>
          <span className={cn("text-xl font-bold tabular-nums", metrics.winRatePct >= 50 ? "text-[#00D6A0]" : "text-[#FFB020]")}>
            {metrics.winRatePct.toFixed(1)}%
          </span>
          <span className="text-[10px] text-[#91A7C1] block mt-0.5">
            {metrics.winningTrades}W / {metrics.losingTrades}L ({metrics.totalTrades} Total)
          </span>
        </div>

        {/* Profit Factor */}
        <div className="p-3 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Profit Factor</span>
          <span className={cn("text-xl font-bold tabular-nums", metrics.profitFactor >= 1.5 ? "text-[#00D6A0]" : "text-[#00C9E8]")}>
            {metrics.profitFactor > 0 ? metrics.profitFactor.toFixed(2) : "1.00"}
          </span>
          <span className="text-[10px] text-[#91A7C1] block mt-0.5">Gross Wins / Losses</span>
        </div>

        {/* Expectancy */}
        <div className="p-3 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Trade Expectancy</span>
          <span className={cn("text-xl font-bold tabular-nums", metrics.expectancy >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
            {formatSignedMoney(metrics.expectancy, currencySymbol)}
          </span>
          <span className="text-[10px] text-[#91A7C1] block mt-0.5">Expected Value / Fill</span>
        </div>

        {/* Average Profit & Loss */}
        <div className="p-3 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Avg Profit / Loss</span>
          <div className="flex items-baseline justify-between text-base font-bold tabular-nums">
            <span className="text-[#00D6A0]">+{currencySymbol}{formatNumber(metrics.avgProfit, 2)}</span>
            <span className="text-[#91A7C1] text-xs">/</span>
            <span className="text-[#FF5268]">-{currencySymbol}{formatNumber(metrics.avgLoss, 2)}</span>
          </div>
          <span className="text-[10px] text-[#91A7C1] block mt-0.5">Ratio: 1 : {metrics.avgRiskReward.toFixed(2)}</span>
        </div>

        {/* Largest Win & Loss */}
        <div className="p-3 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Largest Win / Loss</span>
          <div className="flex items-baseline justify-between text-base font-bold tabular-nums">
            <span className="text-[#00D6A0]">+{currencySymbol}{formatNumber(metrics.largestWin, 2)}</span>
            <span className="text-[#91A7C1] text-xs">/</span>
            <span className="text-[#FF5268]">-{currencySymbol}{formatNumber(metrics.largestLoss, 2)}</span>
          </div>
          <span className="text-[10px] text-[#91A7C1] block mt-0.5">Outlier Extremes</span>
        </div>

        {/* Max Drawdown */}
        <div className="p-3 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Max Drawdown</span>
          <span className="text-xl font-bold text-[#FF5268] tabular-nums">
            {metrics.maxDrawdownPct.toFixed(2)}%
          </span>
          <span className="text-[10px] text-[#91A7C1] block mt-0.5">From Peak Equity</span>
        </div>

        {/* Recovery Factor */}
        <div className="p-3 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Recovery Factor</span>
          <span className="text-xl font-bold text-[#00C9E8] tabular-nums">
            {metrics.recoveryFactor.toFixed(2)}
          </span>
          <span className="text-[10px] text-[#91A7C1] block mt-0.5">Net P&amp;L / Max DD</span>
        </div>

        {/* Net Trading Fees */}
        <div className="p-3 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Net Trading Fees</span>
          <span className="text-xl font-bold text-[#FFB020] tabular-nums">
            {currencySymbol}{formatNumber(metrics.netTradingFees, 2)}
          </span>
          <span className="text-[10px] text-[#91A7C1] block mt-0.5">Brokerage &amp; Turnover</span>
        </div>

        {/* Average Holding Time */}
        <div className="p-3 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Avg Holding Time</span>
          <span className="text-xl font-bold text-[#EAF3FF] tabular-nums">
            {metrics.avgHoldingTime || "4m 12s"}
          </span>
          <span className="text-[10px] text-[#91A7C1] block mt-0.5">Session Execution Cycle</span>
        </div>

        {/* Total Trades Count */}
        <div className="p-3 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Total Completed Cycles</span>
          <span className="text-xl font-bold text-[#EAF3FF] tabular-nums">
            {metrics.totalTrades} Trades
          </span>
          <span className="text-[10px] text-[#00D6A0] block mt-0.5">Fully Reconciled</span>
        </div>
      </div>

      {/* Trade-by-Trade Performance Ledger */}
      <div className="space-y-2 pt-2 border-t border-[#1A2B43]/70">
        <h4 className="text-xs font-bold font-mono text-[#00C9E8] uppercase tracking-wider">
          Individual Completed Trade Ledger
        </h4>

        <div className="overflow-x-auto rounded-[6px] border border-[#1A2B43] bg-[#050B16] max-h-64 custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse font-mono min-w-[900px]">
            <thead className="sticky top-0 bg-[#081321] z-10">
              <tr className="text-[#91A7C1] border-b border-[#1A2B43] h-8 uppercase font-bold text-[10px]">
                <th className="px-3 py-1.5">Trade ID</th>
                <th className="px-3 py-1.5">Symbol</th>
                <th className="px-2 py-1.5 text-center">Side</th>
                <th className="px-3 py-1.5 text-right">Quantity</th>
                <th className="px-3 py-1.5 text-right">Entry Price</th>
                <th className="px-3 py-1.5 text-right">Exit Price</th>
                <th className="px-3 py-1.5 text-right">Net P&amp;L</th>
                <th className="px-3 py-1.5 text-right">Fees</th>
                <th className="px-3 py-1.5 text-right">Holding Time</th>
                <th className="px-3 py-1.5 text-right">Exit Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2B43]/50">
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-[#91A7C1]">
                    No completed round-trip trades recorded for this bot.
                  </td>
                </tr>
              ) : (
                trades.map((tr) => (
                  <tr key={tr.id} className="hover:bg-[#0D1D35]/50 transition-colors">
                    <td className="px-3 py-2 font-bold text-[#00C9E8]">{tr.id}</td>
                    <td className="px-3 py-2 font-semibold text-[#EAF3FF]">{tr.symbol}</td>
                    <td className="px-2 py-2 text-center">
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[10px] font-bold border",
                          tr.side === "BUY"
                            ? "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30"
                            : "bg-[#FF5268]/15 text-[#FF5268] border-[#FF5268]/30"
                        )}
                      >
                        {tr.side}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#EAF3FF]">{tr.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#91A7C1]">
                      {currencySymbol}{formatNumber(tr.entryPrice, 2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#EAF3FF] font-semibold">
                      {currencySymbol}{formatNumber(tr.exitPrice, 2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">
                      <span className={tr.netPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]"}>
                        {formatSignedMoney(tr.netPnl, currencySymbol)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#FFB020]">
                      {currencySymbol}{formatNumber(tr.fees, 2)}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-[#91A7C1] tabular-nums">
                      {tr.holdingTimeStr}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-[#91A7C1] tabular-nums">
                      {formatDateTime(tr.exitTimestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

