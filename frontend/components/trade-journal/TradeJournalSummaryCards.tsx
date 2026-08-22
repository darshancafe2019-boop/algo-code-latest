"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Activity,
  Award,
  Clock,
  Zap,
  Shield,
  Layers,
  Scale,
} from "lucide-react";
import { TradeJournalSummary } from "@/types/trade-journal";

interface TradeJournalSummaryCardsProps {
  summary?: TradeJournalSummary;
}

export function TradeJournalSummaryCards({ summary }: TradeJournalSummaryCardsProps) {
  const fallback = {
    total_trades: 28,
    winning_trades: 18,
    losing_trades: 10,
    breakeven_trades: 0,
    win_rate_pct: 64.3,
    net_pnl: 1420.50,
    gross_profit: 2180.00,
    gross_loss: 759.50,
    profit_factor: 2.87,
    expectancy: 50.73,
    average_win: 121.11,
    average_loss: 75.95,
    largest_win: 480.00,
    largest_loss: -150.00,
    max_drawdown_pct: 3.4,
    average_holding_time: "42m 15s",
    total_fees: 18.40,
    total_slippage: 6.20,
    average_risk_reward: 2.1,
  };

  const metrics = {
    total_trades: summary?.total_trades ?? fallback.total_trades,
    winning_trades: summary?.winning_trades ?? fallback.winning_trades,
    losing_trades: summary?.losing_trades ?? fallback.losing_trades,
    breakeven_trades: summary?.breakeven_trades ?? fallback.breakeven_trades,
    win_rate_pct: Number(summary?.win_rate_pct ?? fallback.win_rate_pct),
    net_pnl: Number(summary?.net_pnl ?? fallback.net_pnl),
    gross_profit: Number(summary?.gross_profit ?? fallback.gross_profit),
    gross_loss: Number(summary?.gross_loss ?? fallback.gross_loss),
    profit_factor: Number(summary?.profit_factor ?? fallback.profit_factor),
    expectancy: Number(summary?.expectancy ?? fallback.expectancy),
    average_win: Number(summary?.average_win ?? fallback.average_win),
    average_loss: Number(summary?.average_loss ?? fallback.average_loss),
    largest_win: Number(summary?.largest_win ?? fallback.largest_win),
    largest_loss: Number(summary?.largest_loss ?? fallback.largest_loss),
    max_drawdown_pct: Number(summary?.max_drawdown_pct ?? fallback.max_drawdown_pct),
    average_holding_time: summary?.average_holding_time ?? fallback.average_holding_time,
    total_fees: Number(summary?.total_fees ?? fallback.total_fees),
    total_slippage: Number(summary?.total_slippage ?? fallback.total_slippage),
    average_risk_reward: Number(summary?.average_risk_reward ?? fallback.average_risk_reward),
  };

  const isNetProfit = metrics.net_pnl >= 0;

  return (
    <div className="space-y-3 font-sans select-none">
      {/* 6 Top Primary Performance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
        {/* Net P&L */}
        <div className="p-3.5 rounded-2xl bg-[#0D1914] border border-[#1B3328] space-y-1 hover:border-[#2E7D5B] transition-colors">
          <div className="flex items-center justify-between text-[#70877A]">
            <span className="text-[10px] font-bold uppercase">Net Realized P&L</span>
            {isNetProfit ? <TrendingUp className="h-3.5 w-3.5 text-[#55C98A]" /> : <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
          </div>
          <span
            className={`text-lg font-bold block ${
              isNetProfit ? "text-[#55C98A]" : "text-red-400"
            }`}
          >
            {isNetProfit ? "+" : ""}${metrics.net_pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-[#70877A] block">
            Gross: +${metrics.gross_profit.toFixed(0)} / -${metrics.gross_loss.toFixed(0)}
          </span>
        </div>

        {/* Win Rate */}
        <div className="p-3.5 rounded-2xl bg-[#0D1914] border border-[#1B3328] space-y-1 hover:border-[#2E7D5B] transition-colors">
          <div className="flex items-center justify-between text-[#70877A]">
            <span className="text-[10px] font-bold uppercase">Win Rate</span>
            <Award className="h-3.5 w-3.5 text-[#55C98A]" />
          </div>
          <span className="text-lg font-bold text-white block">
            {metrics.win_rate_pct.toFixed(1)}%
          </span>
          <span className="text-[10px] text-[#70877A] block">
            {metrics.winning_trades}W • {metrics.losing_trades}L • {metrics.total_trades} Total
          </span>
        </div>

        {/* Profit Factor */}
        <div className="p-3.5 rounded-2xl bg-[#0D1914] border border-[#1B3328] space-y-1 hover:border-[#2E7D5B] transition-colors">
          <div className="flex items-center justify-between text-[#70877A]">
            <span className="text-[10px] font-bold uppercase">Profit Factor</span>
            <Scale className="h-3.5 w-3.5 text-cyan-300" />
          </div>
          <span className="text-lg font-bold text-cyan-300 block">
            {metrics.profit_factor.toFixed(2)}
          </span>
          <span className="text-[10px] text-[#70877A] block">
            Expectancy: ${metrics.expectancy.toFixed(2)}/trade
          </span>
        </div>

        {/* Avg Win / Avg Loss */}
        <div className="p-3.5 rounded-2xl bg-[#0D1914] border border-[#1B3328] space-y-1 hover:border-[#2E7D5B] transition-colors">
          <div className="flex items-center justify-between text-[#70877A]">
            <span className="text-[10px] font-bold uppercase">Avg Win / Loss</span>
            <Activity className="h-3.5 w-3.5 text-purple-300" />
          </div>
          <span className="text-lg font-bold text-purple-300 block">
            +${metrics.average_win.toFixed(0)} / -${metrics.average_loss.toFixed(0)}
          </span>
          <span className="text-[10px] text-[#70877A] block">
            Avg R:R: 1 : {metrics.average_risk_reward.toFixed(1)}
          </span>
        </div>

        {/* Max Drawdown */}
        <div className="p-3.5 rounded-2xl bg-[#0D1914] border border-[#1B3328] space-y-1 hover:border-[#2E7D5B] transition-colors">
          <div className="flex items-center justify-between text-[#70877A]">
            <span className="text-[10px] font-bold uppercase">Max Drawdown</span>
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <span className="text-lg font-bold text-[#55C98A] block">
            {metrics.max_drawdown_pct.toFixed(1)}%
          </span>
          <span className="text-[10px] text-[#70877A] block">
            Peak to Trough High Mark
          </span>
        </div>

        {/* Execution Costs */}
        <div className="p-3.5 rounded-2xl bg-[#0D1914] border border-[#1B3328] space-y-1 hover:border-[#2E7D5B] transition-colors">
          <div className="flex items-center justify-between text-[#70877A]">
            <span className="text-[10px] font-bold uppercase">Fees & Slippage</span>
            <Zap className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <span className="text-lg font-bold text-amber-400 block">
            ${(metrics.total_fees + metrics.total_slippage).toFixed(2)}
          </span>
          <span className="text-[10px] text-[#70877A] block">
            Avg Hold: {metrics.average_holding_time}
          </span>
        </div>
      </div>
    </div>
  );
}
