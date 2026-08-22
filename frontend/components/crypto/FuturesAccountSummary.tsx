"use client";

import React from "react";
import Link from "next/link";
import { DollarSign, Wallet, ShieldAlert, ArrowUpRight, TrendingUp } from "lucide-react";

interface Props {
  equity?: number;
  availableMargin?: number;
  usedMargin?: number;
  unrealizedPnl?: number;
  dailyPnl?: number;
  openPositionsCount?: number;
}

export function FuturesAccountSummary({
  equity = 10000.0,
  availableMargin = 8500.0,
  usedMargin = 1500.0,
  unrealizedPnl = 124.5,
  dailyPnl = 420.0,
  openPositionsCount = 2,
}: Props) {
  const marginRatio = (usedMargin / Math.max(1, equity)) * 100.0;
  const isHealthy = marginRatio < 50;

  return (
    <div className="bg-[#0B101B] border border-slate-800/80 rounded-xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-4 font-mono text-xs select-none">
      {/* Account Metrics Strip */}
      <div className="flex items-center gap-5 flex-wrap">
        {/* Equity */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Account Equity</span>
            <span className="text-sm font-bold text-white tracking-wide">
              ${equity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Available Margin */}
        <div className="border-l border-slate-800 pl-4">
          <span className="text-[10px] text-slate-400 block uppercase">Available Margin</span>
          <span className="text-xs font-bold text-emerald-400">
            ${availableMargin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Used Margin & Ratio */}
        <div className="border-l border-slate-800 pl-4">
          <span className="text-[10px] text-slate-400 block uppercase">Used Margin</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-200">
              ${usedMargin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${
                isHealthy
                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/20"
                  : "bg-rose-950/40 text-rose-300 border-rose-500/20"
              }`}
            >
              {marginRatio.toFixed(1)}% Ratio
            </span>
          </div>
        </div>

        {/* Unrealized P&L */}
        <div className="border-l border-slate-800 pl-4">
          <span className="text-[10px] text-slate-400 block uppercase">Unrealized P&L</span>
          <span
            className={`text-xs font-bold ${
              unrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {unrealizedPnl >= 0 ? `+$${unrealizedPnl.toFixed(2)}` : `-$${Math.abs(unrealizedPnl).toFixed(2)}`}
          </span>
        </div>

        {/* Daily P&L */}
        <div className="border-l border-slate-800 pl-4 hidden md:block">
          <span className="text-[10px] text-slate-400 block uppercase">Daily P&L</span>
          <span
            className={`text-xs font-bold ${
              dailyPnl >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {dailyPnl >= 0 ? `+$${dailyPnl.toFixed(2)}` : `-$${Math.abs(dailyPnl).toFixed(2)}`}
          </span>
        </div>
      </div>

      {/* Right Link */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-slate-400">
          <span className="text-blue-400 font-bold">{openPositionsCount}</span> Active Contracts
        </span>
        <Link
          href="/positions"
          className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2.5 py-1 rounded"
        >
          <span>Portfolio Risk</span>
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
