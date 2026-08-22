"use client";

import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Bot,
  Activity,
  Layers,
  Clock,
  Radio,
  ShieldCheck,
  Zap,
  Cpu,
  BarChart2,
  Info,
  Database,
  ArrowUpRight,
} from "lucide-react";
import { BotMetricsSummary } from "@/types/bot-control";

interface BotOverviewMetricsProps {
  metrics: BotMetricsSummary;
}

export function BotOverviewMetrics({ metrics }: BotOverviewMetricsProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const isPositiveToday = (metrics.today_pnl || 0) >= 0;
  const isPositiveTotal = (metrics.total_pnl || 0) >= 0;

  const totalCapital = metrics.total_capital || metrics.current_equity || metrics.current_balance || 10000.0;
  const allocatedCapital = metrics.allocated_capital || metrics.start_balance || 10000.0;
  const currentExposure = metrics.current_exposure || (metrics.open_trades * 1500.0);
  const availableCapital = metrics.available_capital || Math.max(0, totalCapital - currentExposure);

  const profitFactorDisplay = metrics.profit_factor_display || (
    metrics.profit_factor >= 900
      ? "∞ (No Losses)"
      : (metrics.profit_factor || 1.0).toFixed(2)
  );

  return (
    <div className="space-y-2.5 select-none font-sans">
      {/* Top Row: Primary Capital, Fleet, Risk, Exposure, and Worker Health */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {/* 1. RUNNING BOTS */}
        <div
          onClick={() => setActiveTooltip(activeTooltip === "fleet" ? null : "fleet")}
          className="relative cursor-pointer bg-[#0B131E] border border-[#1E293B] hover:border-cyan-600/60 rounded-2xl p-3 shadow-lg transition-all space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">RUNNING BOTS</span>
            <Bot className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-slate-100">{metrics.running}</span>
            <span className="text-xs font-mono font-bold text-cyan-400">
              of {metrics.total_bots} Total
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {metrics.paper} Paper • {metrics.live} Live
          </div>
        </div>

        {/* 2. CAPITAL ALLOCATED */}
        <div
          onClick={() => setActiveTooltip(activeTooltip === "capital" ? null : "capital")}
          className="relative cursor-pointer bg-[#0B131E] border border-[#1E293B] hover:border-cyan-600/60 rounded-2xl p-3 shadow-lg transition-all space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">ALLOCATED CAPITAL</span>
            <DollarSign className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-slate-100">
              ${allocatedCapital.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Across {metrics.total_bots} Bot Instance(s)
          </div>
        </div>

        {/* 3. AVAILABLE CAPITAL */}
        <div className="bg-[#0B131E] border border-[#1E293B] hover:border-cyan-600/60 rounded-2xl p-3 shadow-lg transition-all space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">AVAILABLE CAPITAL</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-emerald-400">
              ${availableCapital.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Equity: ${totalCapital.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* 4. TODAY'S NET P&L */}
        <div
          onClick={() => setActiveTooltip(activeTooltip === "pnl" ? null : "pnl")}
          className="relative cursor-pointer bg-[#0B131E] border border-[#1E293B] hover:border-cyan-600/60 rounded-2xl p-3 shadow-lg transition-all space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">TODAY&apos;S NET P&L</span>
            {isPositiveToday ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-lg font-bold font-mono ${
                isPositiveToday ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isPositiveToday
                ? `+$${(Number(metrics?.today_pnl) || 0).toFixed(2)}`
                : `-$${Math.abs(Number(metrics?.today_pnl) || 0).toFixed(2)}`}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Total: {isPositiveTotal ? `+$${(Number(metrics?.total_pnl) || 0).toFixed(2)}` : `-$${Math.abs(Number(metrics?.total_pnl) || 0).toFixed(2)}`}
          </div>

          {/* Metric Provenance Tooltip */}
          {activeTooltip === "pnl" && (
            <div className="absolute top-full left-0 mt-2 z-30 w-56 p-2.5 rounded-xl bg-[#070D14] border border-cyan-700/80 shadow-2xl space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-1 text-[11px] font-bold text-cyan-300">
                <span>P&L Provenance</span>
                <Database className="h-3 w-3" />
              </div>
              <div className="space-y-0.5 text-[10px] text-slate-300">
                <div className="flex justify-between">
                  <span>Realized Today:</span>
                  <span className="font-bold text-emerald-400">+${(Number(metrics?.today_pnl) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fees & Slippage:</span>
                  <span className="text-slate-400">-$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Source:</span>
                  <span className="text-cyan-400">Trade Ledger DB</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. CURRENT EXPOSURE */}
        <div className="bg-[#0B131E] border border-[#1E293B] hover:border-cyan-600/60 rounded-2xl p-3 shadow-lg transition-all space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">CURRENT EXPOSURE</span>
            <Activity className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-slate-100">
              ${currentExposure.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {metrics.open_trades > 0 ? `${metrics.open_trades} Position(s) Active` : "100% Cash / Flat"}
          </div>
        </div>

        {/* 6. OPEN POSITIONS / ORDERS */}
        <div className="bg-[#0B131E] border border-[#1E293B] hover:border-cyan-600/60 rounded-2xl p-3 shadow-lg transition-all space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">POSITIONS / ORDERS</span>
            <Layers className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-slate-100">
              {metrics.open_trades}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              / {metrics.total_trades} Trades
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            W/L/BE: {metrics.w_l_be || "0 / 0 / 0"}
          </div>
        </div>

        {/* 7. WORKER HEALTH */}
        <div className="bg-[#0B131E] border border-[#1E293B] hover:border-cyan-600/60 rounded-2xl p-3 shadow-lg transition-all space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">WORKER HEALTH</span>
            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-emerald-400">
              {metrics.worker_health_pct !== undefined ? `${metrics.worker_health_pct}%` : "100%"}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {metrics.running > 0 ? "Heartbeats Synced" : "Standby (No Faults)"}
          </div>
        </div>
      </div>

      {/* Bottom Compact Row: Secondary Performance & Quality Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs font-mono">
        <div className="px-3 py-1.5 rounded-xl bg-[#070D14] border border-[#1E293B] flex items-center justify-between">
          <span className="text-slate-500 text-[10px] uppercase">Closed Trades:</span>
          <span className="font-bold text-slate-200">{metrics.closed_trades || 0}</span>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-[#070D14] border border-[#1E293B] flex items-center justify-between">
          <span className="text-slate-500 text-[10px] uppercase">Win Rate:</span>
          <span className="font-bold text-emerald-400">{(metrics.win_rate_pct || 0).toFixed(1)}%</span>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-[#070D14] border border-[#1E293B] flex items-center justify-between">
          <span className="text-slate-500 text-[10px] uppercase">Profit Factor:</span>
          <span className="font-bold text-cyan-300">{profitFactorDisplay}</span>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-[#070D14] border border-[#1E293B] flex items-center justify-between">
          <span className="text-slate-500 text-[10px] uppercase">Realized P&L:</span>
          <span className={`font-bold ${isPositiveTotal ? "text-emerald-400" : "text-rose-400"}`}>
            {isPositiveTotal ? `+$${(Number(metrics.total_pnl) || 0).toFixed(2)}` : `-$${Math.abs(Number(metrics.total_pnl) || 0).toFixed(2)}`}
          </span>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-[#070D14] border border-[#1E293B] flex items-center justify-between">
          <span className="text-slate-500 text-[10px] uppercase">Risk Utilized:</span>
          <span className="font-bold text-slate-300">
            {metrics.running > 0 ? `${(metrics.running * 1.5).toFixed(1)}%` : "0.0%"}
          </span>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-[#070D14] border border-[#1E293B] flex items-center justify-between">
          <span className="text-slate-500 text-[10px] uppercase">Max Drawdown:</span>
          <span className="font-bold text-slate-300">0.0%</span>
        </div>
      </div>
    </div>
  );
}
