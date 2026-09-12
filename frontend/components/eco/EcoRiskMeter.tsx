"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";

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
    if (isKillSwitchActive) return { label: "KILL SWITCH HALTED", color: "#FF3B5C", bg: "bg-[#FF3B5C]/15", border: "border-[#FF3B5C]/40" };
    if (val < 40) return { label: "SAFE", color: "#00E890", bg: "bg-[#00E890]/15", border: "border-[#00E890]/40" };
    if (val < 75) return { label: "MODERATE / WARNING", color: "#F59E0B", bg: "bg-[#F59E0B]/15", border: "border-[#F59E0B]/40" };
    return { label: "ELEVATED RISK", color: "#FF3B5C", bg: "bg-[#FF3B5C]/15", border: "border-[#FF3B5C]/40" };
  };

  const category = getRiskCategory(score);
  const clampedScore = Math.min(100, Math.max(0, score));

  return (
    <div className={`p-4 bg-[#0A1422] border border-[#1A2A3F] rounded-xl space-y-4 font-sans select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg border ${category.bg} ${category.border}`}>
            {score < 40 && !isKillSwitchActive ? (
              <ShieldCheck className="h-4 w-4 text-[#00E890]" />
            ) : score < 75 && !isKillSwitchActive ? (
              <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-[#FF3B5C]" />
            )}
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#52627A] block">
              Portfolio Risk Engine
            </span>
            <span className="text-xs font-bold text-[#F7FAFC] flex items-center gap-1.5">
              <span>{category.label}</span>
              <span className="font-mono text-[#7C8CA3]">({clampedScore}%)</span>
            </span>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${category.bg} ${category.border}`}
          style={{ color: category.color }}
        >
          {isKillSwitchActive ? "ARMED LOCK" : `${clampedScore}/100 SCORE`}
        </span>
      </div>

      {/* Progress Gauge Bar */}
      <div className="space-y-1.5">
        <div className="h-2 w-full bg-[#07101A] border border-[#122033] rounded-full overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${clampedScore}%`,
              background:
                score < 40
                  ? "linear-gradient(90deg, #1E40AF, #22D3EE)"
                  : score < 75
                  ? "linear-gradient(90deg, #1E40AF, #F59E0B)"
                  : "linear-gradient(90deg, #F59E0B, #FF3B5C)",
            }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-[#52627A]">
          <span>0% (SAFE)</span>
          <span>40% (MODERATE)</span>
          <span>75% (WARNING)</span>
          <span>100% (CRITICAL)</span>
        </div>
      </div>

      {/* Telemetry Metric Grid */}
      <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs">
        <div className="p-2 bg-[#07101A] border border-[#122033] rounded-lg">
          <span className="text-[9px] text-[#52627A] uppercase block">Risk / Trade</span>
          <span className="text-xs font-bold text-[#F7FAFC] tabular-nums">{riskPerTradePct.toFixed(2)}%</span>
        </div>
        <div className="p-2 bg-[#07101A] border border-[#122033] rounded-lg">
          <span className="text-[9px] text-[#52627A] uppercase block">Daily Drawdown</span>
          <span className="text-xs font-bold text-[#F59E0B] tabular-nums">{dailyDrawdownPct.toFixed(2)}%</span>
        </div>
        <div className="p-2 bg-[#07101A] border border-[#122033] rounded-lg">
          <span className="text-[9px] text-[#52627A] uppercase block">Margin / Lev</span>
          <span className="text-xs font-bold text-[#19C5FF] tabular-nums">{marginUsedPct.toFixed(0)}% ({leverage}x)</span>
        </div>
      </div>
    </div>
  );
}
