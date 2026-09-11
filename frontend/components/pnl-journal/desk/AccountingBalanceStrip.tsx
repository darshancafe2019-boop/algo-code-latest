"use client";

import React from "react";
import { Wallet, ShieldCheck, PieChart, Coins, AlertCircle, RefreshCw } from "lucide-react";
import { AccountingBalance } from "@/types/pnl-journal";

interface AccountingBalanceStripProps {
  balances: AccountingBalance[];
  currencySymbol?: string;
}

export const AccountingBalanceStrip: React.FC<AccountingBalanceStripProps> = ({
  balances,
  currencySymbol = "₹",
}) => {
  const totalBalance = balances.reduce((acc, b) => acc + b.totalBalance, 0);
  const totalAvailableMargin = balances.reduce((acc, b) => acc + b.availableMargin, 0);
  const totalUsedMargin = balances.reduce((acc, b) => acc + b.usedMargin, 0);
  const totalCollateral = balances.reduce((acc, b) => acc + b.collateralValue, 0);
  const totalUnrealized = balances.reduce((acc, b) => acc + b.unrealizedPnl, 0);

  const marginUtilization = totalBalance > 0 ? (totalUsedMargin / totalBalance) * 100 : 0;

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-lg backdrop-blur-md">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Aggregated Capital Overview */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Portfolio Capital
              </div>
              <div className="text-base font-bold font-mono text-slate-100">
                {currencySymbol}{formatNumber(totalBalance)}
              </div>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-slate-800 hidden sm:block" />

          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Available Margin
            </div>
            <div className="text-sm font-bold font-mono text-emerald-400">
              {currencySymbol}{formatNumber(totalAvailableMargin)}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Used Margin ({marginUtilization.toFixed(1)}%)
            </div>
            <div className="text-sm font-bold font-mono text-amber-400">
              {currencySymbol}{formatNumber(totalUsedMargin)}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Collateral Value
            </div>
            <div className="text-sm font-bold font-mono text-indigo-400">
              {currencySymbol}{formatNumber(totalCollateral)}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Live Unrealized
            </div>
            <div className={`text-sm font-bold font-mono ${
              totalUnrealized >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              {totalUnrealized >= 0 ? "+" : ""}{currencySymbol}{formatNumber(totalUnrealized)}
            </div>
          </div>
        </div>

        {/* Right: Individual Broker Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {balances.map((b) => (
            <div
              key={`${b.broker}-${b.currency}`}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono"
            >
              <span className={`w-2 h-2 rounded-full ${
                b.broker === "DHAN"
                  ? "bg-emerald-400"
                  : b.broker === "DELTA"
                  ? "bg-cyan-400"
                  : b.broker === "UPSTOX"
                  ? "bg-purple-400"
                  : "bg-slate-400"
              }`} />
              <span className="font-semibold text-slate-200">{b.broker}:</span>
              <span className="text-slate-300">
                {b.currency === "USDT" ? "$" : currencySymbol}{formatNumber(b.totalBalance)}
              </span>
              <span className="text-[10px] text-slate-500">
                (Avail: {b.currency === "USDT" ? "$" : currencySymbol}{formatNumber(b.availableMargin)})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Margin Utilization Progress Bar */}
      <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center gap-3">
        <span className="text-[10px] text-slate-400 font-mono shrink-0">
          Margin Utilization
        </span>
        <div className="flex-1 bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-500 ${
              marginUtilization > 80
                ? "bg-rose-500"
                : marginUtilization > 50
                ? "bg-amber-500"
                : "bg-cyan-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(2, marginUtilization))}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          {marginUtilization.toFixed(1)}% / 100%
        </span>
      </div>
    </div>
  );
};
