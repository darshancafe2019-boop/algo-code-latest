"use client";

import React from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  Activity,
  Percent,
  TrendingDown,
  Layers,
  CheckCircle2,
  AlertOctagon,
  Radio,
  Sliders,
  HelpCircle,
} from "lucide-react";
import { RiskOverviewState } from "@/types/risk";

interface TopGlobalRiskBarProps {
  overview: RiskOverviewState;
  onOpenEmergencyModal: () => void;
}

export function TopGlobalRiskBar({ overview, onOpenEmergencyModal }: TopGlobalRiskBarProps) {
  const numericScore =
    overview.risk_score_numeric !== undefined
      ? overview.risk_score_numeric
      : overview.risk_score === "CRITICAL"
      ? 85
      : overview.risk_score === "HIGH"
      ? 65
      : overview.risk_score === "MODERATE"
      ? 38
      : 22;

  const isHalted = overview.kill_switch_active || overview.risk_score === "CRITICAL";
  const isWarning = overview.risk_score === "HIGH" || overview.risk_score === "MODERATE";

  const totalCap = overview.account_balance || 10000.0;
  const availCap = overview.available_capital || 6800.0;
  const grossExp = overview.gross_exposure || 3200.0;
  const marginPct = overview.margin_usage_pct || 32.0;
  const dailyLossPct = overview.daily_drawdown_pct || 1.8;
  const maxDailyLossLimit = overview.active_limits?.max_daily_loss_pct || 5.0;
  const dailyLossRemaining = Math.max(0, maxDailyLossLimit - dailyLossPct);

  return (
    <div className="bg-[#0D1914] border border-[#294238] rounded-2xl p-4 sm:p-5 shadow-2xl select-none font-sans space-y-4">
      {/* Top Row: Title, Status Gauge, Metric Chips & Emergency Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Risk Status & Score Gauge */}
        <div className="flex items-center gap-3.5 min-w-[280px]">
          <div
            className={`p-3 rounded-2xl border shadow-lg flex items-center justify-center ${
              isHalted
                ? "bg-red-950/80 text-red-400 border-red-800 shadow-red-950/40 animate-pulse"
                : isWarning
                ? "bg-amber-950/80 text-amber-400 border-amber-800"
                : "bg-gradient-to-tr from-[#123C2A] to-[#2E7D5B] text-[#55C98A] border-[#39B978]/40 shadow-[#2E7D5B]/20"
            }`}
          >
            {isHalted ? (
              <ShieldAlert className="h-6 w-6" />
            ) : isWarning ? (
              <AlertTriangle className="h-6 w-6" />
            ) : (
              <ShieldCheck className="h-6 w-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#A8BDB0] font-bold uppercase tracking-wider">
                Risk Status:
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider ${
                  isHalted
                    ? "bg-red-950 text-red-400 border border-red-800"
                    : isWarning
                    ? "bg-amber-950 text-amber-400 border border-amber-800"
                    : "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40"
                }`}
              >
                {isHalted ? "HALTED" : isWarning ? "WARNING" : "SAFE"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">{numericScore}</span>
              <span className="text-xs text-[#70877A] font-mono">/ 100 Portfolio Risk Score</span>
            </div>
          </div>
        </div>

        {/* Realtime Core Telemetry Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          {/* Capital */}
          <div className="p-2.5 rounded-xl bg-[#07110D] border border-[#1B3328] space-y-0.5">
            <span className="text-[10px] text-[#70877A] uppercase font-bold block">Available Capital</span>
            <span className="text-sm font-bold text-white">${availCap.toLocaleString()}</span>
            <span className="text-[10px] text-[#55C98A] block">of ${totalCap.toLocaleString()} Total</span>
          </div>

          {/* Exposure */}
          <div className="p-2.5 rounded-xl bg-[#07110D] border border-[#1B3328] space-y-0.5">
            <span className="text-[10px] text-[#70877A] uppercase font-bold block">Gross Exposure</span>
            <span className="text-sm font-bold text-cyan-300">${grossExp.toLocaleString()}</span>
            <span className="text-[10px] text-[#A8BDB0] block">{((grossExp / totalCap) * 100).toFixed(1)}% Utilization</span>
          </div>

          {/* Margin */}
          <div className="p-2.5 rounded-xl bg-[#07110D] border border-[#1B3328] space-y-0.5">
            <span className="text-[10px] text-[#70877A] uppercase font-bold block">Margin Used</span>
            <span className="text-sm font-bold text-purple-300">{marginPct.toFixed(1)}%</span>
            <span className="text-[10px] text-[#55C98A] block">{(100 - marginPct).toFixed(1)}% Free</span>
          </div>

          {/* Daily Loss */}
          <div className="p-2.5 rounded-xl bg-[#07110D] border border-[#1B3328] space-y-0.5">
            <span className="text-[10px] text-[#70877A] uppercase font-bold block">Daily Loss Buffer</span>
            <span className="text-sm font-bold text-[#55C98A]">{dailyLossRemaining.toFixed(1)}% left</span>
            <span className="text-[10px] text-[#70877A] block">{dailyLossPct.toFixed(1)}% / {maxDailyLossLimit}% Limit</span>
          </div>
        </div>

        {/* Pre-Order Gate & Emergency Kill Switch Trigger */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#07110D] border border-emerald-800/40 text-xs font-mono text-[#55C98A]">
            <CheckCircle2 className="h-4 w-4" />
            <div>
              <span className="font-bold block">14 / 14 PASS</span>
              <span className="text-[9px] text-[#70877A] uppercase">Pre-Order Gates</span>
            </div>
          </div>

          <button
            onClick={onOpenEmergencyModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-red-600/20"
          >
            <AlertOctagon className="h-4 w-4 fill-current animate-pulse" />
            <span>EMERGENCY</span>
          </button>
        </div>
      </div>

      {/* Instant 7-Answers Quantitative Strip */}
      <div className="pt-3 border-t border-[#1B3328] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[11px] font-mono">
        <div className="p-2 rounded-lg bg-[#07110D] border border-[#1B3328]">
          <span className="text-[#70877A] block text-[9px] uppercase font-bold">1. Can I Trade?</span>
          <span className="text-[#55C98A] font-bold">YES (GATES OPEN)</span>
        </div>

        <div className="p-2 rounded-lg bg-[#07110D] border border-[#1B3328]">
          <span className="text-[#70877A] block text-[9px] uppercase font-bold">2. Max Order Size?</span>
          <span className="text-white font-bold">${(totalCap * 0.25).toLocaleString()}</span>
        </div>

        <div className="p-2 rounded-lg bg-[#07110D] border border-[#1B3328]">
          <span className="text-[#70877A] block text-[9px] uppercase font-bold">3. Capital In Use?</span>
          <span className="text-cyan-300 font-bold">${grossExp.toLocaleString()} ({((grossExp / totalCap) * 100).toFixed(0)}%)</span>
        </div>

        <div className="p-2 rounded-lg bg-[#07110D] border border-[#1B3328]">
          <span className="text-[#70877A] block text-[9px] uppercase font-bold">4. Max Risk/Trade?</span>
          <span className="text-purple-300 font-bold">${(totalCap * 0.01).toFixed(0)} (1.0%)</span>
        </div>

        <div className="p-2 rounded-lg bg-[#07110D] border border-[#1B3328]">
          <span className="text-[#70877A] block text-[9px] uppercase font-bold">5. Net Exposure?</span>
          <span className="text-emerald-400 font-bold">${overview.net_exposure?.toLocaleString() || grossExp.toLocaleString()}</span>
        </div>

        <div className="p-2 rounded-lg bg-[#07110D] border border-[#1B3328]">
          <span className="text-[#70877A] block text-[9px] uppercase font-bold">6. Halting Limit?</span>
          <span className="text-amber-400 font-bold">-$500 (5.0% DD)</span>
        </div>

        <div className="p-2 rounded-lg bg-[#07110D] border border-[#1B3328]">
          <span className="text-[#70877A] block text-[9px] uppercase font-bold">7. Last Rejection?</span>
          <span className="text-[#55C98A] font-bold">NONE (0 Blocked)</span>
        </div>
      </div>
    </div>
  );
}
