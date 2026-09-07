"use client";

import React from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  Award,
  Shield,
  Layers,
  Activity,
  Zap,
  BarChart2,
  PieChart,
} from "lucide-react";
import { formatMoney, formatNumber, formatPercent } from "@/lib/formatters";

export interface TradeSummaryData {
  start_balance: number;
  current_balance: number;
  total_capital: number;
  available_capital: number;
  used_margin: number;
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  win_rate: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  avg_win: number;
  avg_loss: number;
  avg_win_pct: number;
  avg_loss_pct: number;
  max_gain: number;
  max_loss: number;
  gross_pnl: number;
  fees: number;
  funding: number;
  taxes: number;
  net_pnl: number;
  avg_pnl_per_trade: number;
  profit_factor: number;
  avg_win_duration_mins?: number;
  avg_loss_duration_mins?: number;
}

interface TradeSummaryPanelProps {
  summary?: Partial<TradeSummaryData>;
  currencySymbol?: string;
}

export function TradeSummaryPanel({
  summary = {},
  currencySymbol = "₹",
}: TradeSummaryPanelProps) {
  const {
    start_balance = 100000.0,
    current_balance = 114850.0,
    total_capital = 100000.0,
    available_capital = 87500.0,
    used_margin = 12500.0,
    total_trades = 38,
    open_trades = 3,
    closed_trades = 35,
    win_rate = 68.57,
    winning_trades = 24,
    losing_trades = 10,
    breakeven_trades = 1,
    avg_win = 850.0,
    avg_loss = 420.0,
    avg_win_pct = 3.25,
    avg_loss_pct = 1.65,
    max_gain = 3450.0,
    max_loss = -1200.0,
    gross_pnl = 16200.0,
    fees = 680.0,
    funding = 240.0,
    taxes = 430.0,
    net_pnl = 14850.0,
    avg_pnl_per_trade = 424.28,
  } = summary;

  const isProfitable = net_pnl >= 0;

  return (
    <div className="bg-[#0b101b]/95 border border-[#1e293b] rounded-2xl p-4 shadow-2xl backdrop-blur-xl select-none font-mono space-y-4 flex flex-col justify-between">
      {/* 1. Header with Badge */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Scale className="w-4 h-4" />
          </div>
          <span className="text-xs font-extrabold text-white tracking-widest uppercase">
            TRADE SUMMARY
          </span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            isProfitable
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-rose-500/15 text-rose-400 border-rose-500/30"
          }`}
        >
          {isProfitable ? "NET PROFIT" : "NET DRAWDOWN"}
        </span>
      </div>

      {/* 2. Primary Balances Section */}
      <div className="space-y-2 bg-[#060910] p-3 rounded-xl border border-slate-800/60">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">START BALANCE</span>
          <span className="text-slate-200 font-bold">
            {currencySymbol}
            {formatNumber(start_balance, 2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">CURRENT BALANCE</span>
          <span className="text-white font-extrabold text-sm">
            {currencySymbol}
            {formatNumber(current_balance, 2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/50">
          <span className="text-slate-400">TOTAL CAPITAL</span>
          <span className="text-slate-300">
            {currencySymbol}
            {formatNumber(total_capital, 2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">AVAILABLE CAPITAL</span>
          <span className="text-emerald-400 font-bold">
            {currencySymbol}
            {formatNumber(available_capital, 2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">USED MARGIN</span>
          <span className="text-amber-400 font-bold">
            {currencySymbol}
            {formatNumber(used_margin, 2)}
          </span>
        </div>
      </div>

      {/* 3. Trade Counts & Win Rate Meter */}
      <div className="space-y-2 bg-[#060910] p-3 rounded-xl border border-slate-800/60">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">TOTAL TRADES</span>
          <span className="text-white font-bold text-sm">{total_trades}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800/50">
          <div className="flex justify-between">
            <span className="text-slate-400">OPEN TRADES:</span>
            <span className="text-sky-400 font-bold">{open_trades}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">CLOSED TRADES:</span>
            <span className="text-slate-200 font-bold">{closed_trades}</span>
          </div>
        </div>

        {/* Win Rate Bar Meter */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-bold">WIN RATE</span>
            <span className="text-emerald-400 font-extrabold text-sm">{win_rate.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              style={{ width: `${Math.min(100, Math.max(0, win_rate))}%` }}
            />
            <div
              className="bg-rose-500/80 h-full transition-all duration-500"
              style={{ width: `${100 - Math.min(100, Math.max(0, win_rate))}%` }}
            />
          </div>
        </div>

        {/* Win / Loss / Breakeven Counts */}
        <div className="grid grid-cols-3 gap-1 pt-2 text-[10px] text-center">
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg py-1.5 px-1">
            <div className="text-emerald-400 font-extrabold text-xs">{winning_trades}</div>
            <div className="text-slate-400 text-[9px] uppercase">WINS</div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/25 rounded-lg py-1.5 px-1">
            <div className="text-rose-400 font-extrabold text-xs">{losing_trades}</div>
            <div className="text-slate-400 text-[9px] uppercase">LOSSES</div>
          </div>
          <div className="bg-slate-700/20 border border-slate-700/40 rounded-lg py-1.5 px-1">
            <div className="text-slate-300 font-extrabold text-xs">{breakeven_trades}</div>
            <div className="text-slate-400 text-[9px] uppercase">BREAKEVEN</div>
          </div>
        </div>
      </div>

      {/* 4. Averages & Extremes */}
      <div className="space-y-1.5 bg-[#060910] p-3 rounded-xl border border-slate-800/60 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">AVG WIN</span>
          <span className="text-emerald-400 font-bold">
            +{currencySymbol}
            {formatNumber(avg_win, 2)} ({avg_win_pct.toFixed(2)}%)
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">AVG LOSS</span>
          <span className="text-rose-400 font-bold">
            -{currencySymbol}
            {formatNumber(avg_loss, 2)} ({avg_loss_pct.toFixed(2)}%)
          </span>
        </div>
        <div className="flex justify-between items-center pt-1 border-t border-slate-800/50">
          <span className="text-slate-400">MAX GAIN</span>
          <span className="text-emerald-400 font-bold">
            +{currencySymbol}
            {formatNumber(max_gain, 2)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">MAX LOSS</span>
          <span className="text-rose-400 font-bold">
            {max_loss < 0 ? "-" : ""}
            {currencySymbol}
            {formatNumber(Math.abs(max_loss), 2)}
          </span>
        </div>
      </div>

      {/* 5. Cost Breakdown & Net P&L (Formula Authoritative) */}
      <div className="space-y-2 bg-gradient-to-b from-[#080d17] to-[#04070d] p-3 rounded-xl border border-slate-800/80 text-xs">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-400">GROSS P&L</span>
          <span className={gross_pnl >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
            {gross_pnl >= 0 ? "+" : ""}
            {currencySymbol}
            {formatNumber(gross_pnl, 2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-400">FEES & BROKERAGE</span>
          <span className="text-slate-300">
            -{currencySymbol}
            {formatNumber(fees, 2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-400">FUNDING</span>
          <span className="text-slate-300">
            -{currencySymbol}
            {formatNumber(funding, 2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-400">TAX / CHARGES</span>
          <span className="text-slate-300">
            -{currencySymbol}
            {formatNumber(taxes, 2)}
          </span>
        </div>

        {/* Master Net PnL */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-700/80">
          <span className="text-white font-extrabold text-xs">TOTAL NET P&L</span>
          <span
            className={`text-base font-extrabold ${
              isProfitable
                ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                : "text-rose-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]"
            }`}
          >
            {isProfitable ? "+" : ""}
            {currencySymbol}
            {formatNumber(net_pnl, 2)}
          </span>
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
          <span>AVG P&L / TRADE</span>
          <span className={avg_pnl_per_trade >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
            {avg_pnl_per_trade >= 0 ? "+" : ""}
            {currencySymbol}
            {formatNumber(avg_pnl_per_trade, 2)}
          </span>
        </div>
      </div>
    </div>
  );
}
