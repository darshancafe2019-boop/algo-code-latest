"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Activity } from "lucide-react";

interface EcoRiskMeterProps {
  score?: number; // 0 to 100
  riskPerTradePct?: number;
  dailyDrawdownPct?: number;
  maxDrawdownPct?: number;
  marginUsedPct?: number;
  leverage?: number;
  isKillSwitchActive?: boolean;
  className?: string;
}

export function EcoRiskMeter({
  score = 18,
  riskPerTradePct = 1.0,
  dailyDrawdownPct = 0.85,
  maxDrawdownPct = 2.4,
  marginUsedPct = 35.0,
  leverage = 3,
  isKillSwitchActive = false,
  className = "",
}: EcoRiskMeterProps) {
  // Determine risk level category
  const getRiskCategory = (val: number) => {
    if (isKillSwitchActive) return { label: "KILL SWITCH HALTED", color: "#C95454", bg: "bg-[#C95454]/15", border: "border-[#C95454]/40" };
    if (val < 40) return { label: "SAFE", color: "#55C98A", bg: "bg-[#55C98A]/15", border: "border-[#55C98A]/40" };
    if (val < 75) return { label: "MODERATE / WARNING", color: "#D9A441", bg: "bg-[#D9A441]/15", border: "border-[#D9A441]/40" };
    return { label: "ELEVATED RISK", color: "#E26D6D", bg: "bg-[#E26D6D]/15", border: "border-[#E26D6D]/40" };
  };

  const category = getRiskCategory(score);
  const clampedScore = Math.min(100, Math.max(0, score));

  return (
    <div className={`p-4 bg-[#0D1914] border border-[#294238] rounded-2xl space-y-4 font-sans select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${category.bg} ${category.border}`}>
            {score < 40 && !isKillSwitchActive ? (
              <ShieldCheck className="h-4 w-4 text-[#55C98A]" />
            ) : score < 75 && !isKillSwitchActive ? (
              <AlertTriangle className="h-4 w-4 text-[#D9A441]" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-[#E26D6D]" />
            )}
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#70877A] block">
              Portfolio Risk Engine
            </span>
            <span className="text-xs font-extrabold text-[#E8F3EC] flex items-center gap-1.5">
              <span>{category.label}</span>
              <span className="font-mono text-[#78A88A]">({clampedScore}%)</span>
            </span>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${category.bg} ${category.border}`}
          style={{ color: category.color }}
        >
          {isKillSwitchActive ? "ARMED LOCK" : `${clampedScore}/100 SCORE`}
        </span>
      </div>

      {/* Nature-Inspired Progress Gauge Bar */}
      <div className="space-y-1.5">
        <div className="h-2 w-full bg-[#07110D] border border-[#1B3328] rounded-full overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${clampedScore}%`,
              background:
                score < 40
                  ? "linear-gradient(90deg, #123C2A, #55C98A)"
                  : score < 75
                  ? "linear-gradient(90deg, #123C2A, #D9A441)"
                  : "linear-gradient(90deg, #D9A441, #E26D6D)",
            }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-[#70877A]">
          <span>0% (SAFE)</span>
          <span>40% (MODERATE)</span>
          <span>75% (WARNING)</span>
          <span>100% (CRITICAL)</span>
        </div>
      </div>

      {/* Telemetry Metric Grid */}
      <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs">
        <div className="p-2 bg-[#07110D] border border-[#1B3328] rounded-xl">
          <span className="text-[9px] text-[#70877A] uppercase block">Risk / Trade</span>
          <span className="text-xs font-bold text-[#E8F3EC]">{riskPerTradePct.toFixed(2)}%</span>
        </div>
        <div className="p-2 bg-[#07110D] border border-[#1B3328] rounded-xl">
          <span className="text-[9px] text-[#70877A] uppercase block">Daily Drawdown</span>
          <span className="text-xs font-bold text-[#D9A441]">{dailyDrawdownPct.toFixed(2)}%</span>
        </div>
        <div className="p-2 bg-[#07110D] border border-[#1B3328] rounded-xl">
          <span className="text-[9px] text-[#70877A] uppercase block">Margin / Lev</span>
          <span className="text-xs font-bold text-[#78A88A]">{marginUsedPct.toFixed(0)}% ({leverage}x)</span>
        </div>
      </div>
    </div>
  );
}
