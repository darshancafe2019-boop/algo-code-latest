"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, PieChart } from "lucide-react";
import { PortfolioKPIs, AssetClassExposure } from "@/types/pnl-analytics";
import { formatNumber, formatPrice, formatPercent, toNumeric } from "@/lib/formatters";

interface RiskAndDailyLossLimitGaugeProps {
  kpis: PortfolioKPIs;
  currency?: string;
}

export function RiskAndDailyLossLimitGauge({
  kpis,
  currency = "$",
}: RiskAndDailyLossLimitGaugeProps) {
  const dailyLossLimit = toNumeric(kpis?.daily_loss_limit) ?? 2500.0;
  const todayPnL = toNumeric(kpis?.today_pnl) ?? 0.0;
  const todayLossUsed = Math.abs(Math.min(0, todayPnL));
  const remainingLossCapacity = Math.max(0, dailyLossLimit - todayLossUsed);
  const utilizationPct = dailyLossLimit > 0 ? Math.min(100, (todayLossUsed / dailyLossLimit) * 100) : 0;

  const isRiskWarning = utilizationPct > 70;
  const isBlocked = utilizationPct >= 100;

  const assetExposures: AssetClassExposure[] = [
    { category: "Crypto (BTC/ETH)", exposure_usd: 3500.0, allocation_pct: 35.0, color: "bg-cyan-500" },
    { category: "Indian Indices (NSE/BSE)", exposure_usd: 2500.0, allocation_pct: 25.0, color: "bg-emerald-500" },
    { category: "Derivatives (Options/Futures)", exposure_usd: 2000.0, allocation_pct: 20.0, color: "bg-purple-500" },
    { category: "Equities / Stocks", exposure_usd: 1200.0, allocation_pct: 12.0, color: "bg-blue-500" },
    { category: "Commodities & Forex", exposure_usd: 800.0, allocation_pct: 8.0, color: "bg-amber-500" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
      {/* 1. Daily Loss Limit Gate & Risk Utilization */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {isBlocked ? (
              <ShieldAlert className="w-5 h-5 text-red-400" />
            ) : isRiskWarning ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                DAILY LOSS LIMIT & RISK GATE
              </h2>
              <p className="text-xs text-slate-400">Risk Engine circuit breaker and drawdown protection gate</p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
              isBlocked
                ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                : isRiskWarning
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            }`}
          >
            {isBlocked ? "TRADING BLOCKED" : "RISK HEALTHY"}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Daily Loss Utilization:</span>
            <span className="font-bold text-white">
              {formatPrice(todayLossUsed, currency, 2)} / {formatPrice(dailyLossLimit, currency, 2)} ({formatPercent(utilizationPct, 1)})
            </span>
          </div>

          <div className="w-full bg-[#141E33] rounded-full h-3 overflow-hidden border border-slate-800">
            <div
              style={{ width: `${utilizationPct}%` }}
              className={`h-full rounded-full transition-all duration-500 ${
                isBlocked
                  ? "bg-red-500"
                  : isRiskWarning
                  ? "bg-amber-500"
                  : "bg-gradient-to-r from-emerald-500 to-teal-400"
              }`}
            />
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="bg-[#141E33] border border-slate-800 rounded-xl p-2.5">
            <div className="text-[10px] text-slate-400 uppercase">Remaining Loss Buffer</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              {formatPrice(remainingLossCapacity, currency, 2)}
            </div>
          </div>

          <div className="bg-[#141E33] border border-slate-800 rounded-xl p-2.5">
            <div className="text-[10px] text-slate-400 uppercase">Global Kill Switch</div>
            <div className="text-sm font-bold text-slate-300 mt-0.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              INACTIVE (ARMED)
            </div>
          </div>
        </div>
      </div>

      {/* 2. Asset Class & Market Concentration Breakdown */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                PORTFOLIO CONCENTRATION BY ASSET
              </h2>
              <p className="text-xs text-slate-400">Multi-asset capital distribution across exchanges</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-300">
            Total: {formatPrice(kpis?.gross_exposure, currency, 0)}
          </span>
        </div>

        {/* Segmented Bar */}
        <div className="w-full bg-[#141E33] rounded-full h-3 overflow-hidden flex border border-slate-800">
          {assetExposures.map((a) => (
            <div
              key={a.category}
              style={{ width: `${a.allocation_pct}%` }}
              className={`${a.color} h-full`}
              title={`${a.category}: ${a.allocation_pct}%`}
            />
          ))}
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
          {assetExposures.map((a) => (
            <div key={a.category} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${a.color}`} />
              <div className="truncate">
                <span className="text-slate-300">{a.category.split(" ")[0]}</span>{" "}
                <span className="text-slate-400 font-bold">({a.allocation_pct}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
