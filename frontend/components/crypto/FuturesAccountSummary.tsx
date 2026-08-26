"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Wallet, ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { formatMoney, formatPnL, formatPercent } from "@/lib/formatters";

interface Props {
  equity?: number;
  availableMargin?: number;
  usedMargin?: number;
  unrealizedPnl?: number;
  dailyPnl?: number;
  openPositionsCount?: number;
}

export function FuturesAccountSummary({
  equity = 50000.0,
  availableMargin = 50000.0,
  usedMargin = 0.0,
  unrealizedPnl = 0.0,
  dailyPnl = 0.0,
  openPositionsCount = 0,
}: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const marginRatio = (usedMargin / Math.max(1, equity)) * 100.0;
  const isHealthy = marginRatio < 50;

  const dailyPnlFmt = formatPnL(dailyPnl, "$");
  const unrealPnlFmt = formatPnL(unrealizedPnl, "$");

  return (
    <div className="bg-[#0B101B] border border-slate-800/80 rounded-xl p-3 shadow-lg flex flex-col gap-2 font-mono text-xs select-none">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Core Account Strip */}
        <div className="flex items-center gap-5 flex-wrap">
          {/* Account Title */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Account</span>
              <span className="text-sm font-bold text-white tracking-wide">
                {formatMoney(equity, "$")}
              </span>
            </div>
          </div>

          {/* Available Margin */}
          <div className="border-l border-slate-800 pl-4">
            <span className="text-[10px] text-slate-400 block uppercase">Available</span>
            <span className="text-xs font-bold text-emerald-400">
              {formatMoney(availableMargin, "$")}
            </span>
          </div>

          {/* Used Margin */}
          <div className="border-l border-slate-800 pl-4">
            <span className="text-[10px] text-slate-400 block uppercase">Used Margin</span>
            <span className="text-xs font-bold text-slate-200">
              {formatMoney(usedMargin, "$")}
            </span>
          </div>

          {/* Daily P&L */}
          <div className="border-l border-slate-800 pl-4">
            <span className="text-[10px] text-slate-400 block uppercase">Daily P&L</span>
            <span
              className={`text-xs font-bold ${
                dailyPnlFmt.isPositive ? "text-emerald-400" : dailyPnlFmt.isNegative ? "text-rose-400" : "text-slate-300"
              }`}
            >
              {dailyPnlFmt.formatted}
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors bg-[#131B2A] hover:bg-slate-800 border border-slate-800 px-2 py-1 rounded"
          >
            <span>Details</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <Link
            href="/positions"
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2.5 py-1 rounded"
          >
            <span>Positions ({openPositionsCount})</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Expandable Details Tray */}
      {showDetails && (
        <div className="pt-2.5 mt-1 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
          <div className="bg-[#131B2A] p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Margin Ratio</span>
            <span className={`font-bold ${isHealthy ? "text-emerald-400" : "text-amber-400"}`}>
              {formatPercent(marginRatio)} ({isHealthy ? "Healthy" : "Elevated"})
            </span>
          </div>

          <div className="bg-[#131B2A] p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Unrealized P&L</span>
            <span
              className={`font-bold ${
                unrealPnlFmt.isPositive ? "text-emerald-400" : unrealPnlFmt.isNegative ? "text-rose-400" : "text-slate-300"
              }`}
            >
              {unrealPnlFmt.formatted}
            </span>
          </div>

          <div className="bg-[#131B2A] p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Maintenance Margin</span>
            <span className="font-bold text-slate-200">
              {formatMoney(usedMargin * 0.5, "$")}
            </span>
          </div>

          <div className="bg-[#131B2A] p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Liquidation Buffer</span>
            <span className="font-bold text-emerald-400">
              {formatPercent(Math.max(0, 100 - marginRatio * 1.5))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
