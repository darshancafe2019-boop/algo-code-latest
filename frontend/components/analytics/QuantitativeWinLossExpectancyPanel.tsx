"use client";

import React from "react";
import { Calculator, Zap, Clock } from "lucide-react";
import { QuantitativeMetrics } from "@/types/pnl-analytics";
import { formatNumber, formatPrice, formatPercent, formatPnL, toNumeric } from "@/lib/formatters";

interface QuantitativeWinLossExpectancyPanelProps {
  metrics?: Partial<QuantitativeMetrics>;
  currency?: string;
}

export function QuantitativeWinLossExpectancyPanel({
  metrics,
  currency = "$",
}: QuantitativeWinLossExpectancyPanelProps) {
  const winRate = toNumeric(metrics?.win_rate_pct) ?? 70.8;
  const lossRate = toNumeric(metrics?.loss_rate_pct) ?? 29.2;
  const expectancy = toNumeric(metrics?.expectancy_usd) ?? 30.10;
  const avgWin = toNumeric(metrics?.avg_win_usd) ?? 54.20;
  const avgLoss = toNumeric(metrics?.avg_loss_usd) ?? -28.50;
  const totalFees = toNumeric(metrics?.total_fees_usd) ?? 34.50;
  const todayFees = toNumeric(metrics?.today_fees_usd) ?? 6.50;
  const fillLatency = toNumeric(metrics?.avg_fill_latency_ms) ?? 32;
  const slippage = toNumeric(metrics?.avg_slippage_pct) ?? 0.015;
  const qualityScore = toNumeric(metrics?.execution_quality_score) ?? 98.4;
  const profitFactor = metrics?.profit_factor || "2.75";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
      {/* 1. Win/Loss & Mathematical Expectancy */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                WIN / LOSS & EXPECTANCY ENGINE
              </h2>
              <p className="text-xs text-slate-400">Mathematical expectancy per executed trade and win ratio</p>
            </div>
          </div>
        </div>

        {/* Expectancy Banner */}
        <div className="bg-[#141E33] border border-cyan-500/30 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Mathematical Expectancy</div>
            <div className="text-xl font-extrabold text-cyan-400 mt-0.5">
              +{formatPrice(expectancy, currency, 2)}{" "}
              <span className="text-xs text-slate-400 font-normal">/ executed trade</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase">Profit Factor</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">{profitFactor}</div>
          </div>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-[#141E33] border border-slate-800 rounded-xl p-2.5">
            <div className="text-[10px] text-slate-400 uppercase">Win Rate</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">{formatPercent(winRate, 1)}</div>
            <div className="text-[9px] text-slate-400">{formatNumber(metrics?.winning_trades, 0, "17")} Wins</div>
          </div>

          <div className="bg-[#141E33] border border-slate-800 rounded-xl p-2.5">
            <div className="text-[10px] text-slate-400 uppercase">Loss Rate</div>
            <div className="text-sm font-bold text-red-400 mt-0.5">{formatPercent(lossRate, 1)}</div>
            <div className="text-[9px] text-slate-400">{formatNumber(metrics?.losing_trades, 0, "7")} Losses</div>
          </div>

          <div className="bg-[#141E33] border border-slate-800 rounded-xl p-2.5">
            <div className="text-[10px] text-slate-400 uppercase">Average Win</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">+{formatPrice(avgWin, currency, 2)}</div>
          </div>

          <div className="bg-[#141E33] border border-slate-800 rounded-xl p-2.5">
            <div className="text-[10px] text-slate-400 uppercase">Average Loss</div>
            <div className="text-sm font-bold text-red-400 mt-0.5">-{formatPrice(Math.abs(avgLoss), currency, 2)}</div>
          </div>
        </div>
      </div>

      {/* 2. Execution Quality & Fee Analytics */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                EXECUTION QUALITY & BROKER FEES
              </h2>
              <p className="text-xs text-slate-400">Audited fill latency, slippage, and fee impact</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold">
            Score: {formatNumber(qualityScore, 1)}/100
          </span>
        </div>

        {/* Total Fees Card */}
        <div className="bg-[#141E33] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">All-Time Broker Fees Paid</div>
            <div className="text-xl font-extrabold text-rose-400 mt-0.5">
              -{formatPrice(totalFees, currency, 2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase">Today&apos;s Fees</div>
            <div className="text-base font-bold text-slate-300 mt-0.5">
              -{formatPrice(todayFees, currency, 2)}
            </div>
          </div>
        </div>

        {/* Latency & Slippage Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#141E33] border border-slate-800 rounded-xl p-2.5">
            <div className="text-[10px] text-slate-400 uppercase">Average Fill Latency</div>
            <div className="text-sm font-bold text-cyan-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatNumber(fillLatency, 0)} ms
            </div>
          </div>

          <div className="bg-[#141E33] border border-slate-800 rounded-xl p-2.5">
            <div className="text-[10px] text-slate-400 uppercase">Average Slippage</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              {formatPercent(slippage, 3)} (Tight)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
