"use client";

import React from "react";
import { ArrowRight, CheckCircle2, AlertCircle, Clock, Zap, Shield, TrendingUp, Layers } from "lucide-react";

interface PipelineStage {
  id: string;
  label: string;
  status: "ACTIVE" | "PENDING" | "PASSED" | "FAILED" | "IDLE";
  detail?: string;
}

interface EcoStrategyFlowProps {
  strategyName?: string;
  stages?: PipelineStage[];
  conditions?: {
    label: string;
    condition: string;
    passed: boolean;
    currentValue?: string | number;
  }[];
  className?: string;
}

export function EcoStrategyFlow({
  strategyName = "Multi-Timeframe Trend Confluence",
  stages = [
    { id: "data", label: "DATA FEED", status: "PASSED", detail: "14.5ms Live" },
    { id: "indicators", label: "INDICATORS", status: "PASSED", detail: "RSI, MACD, EMA" },
    { id: "strategy", label: "STRATEGY", status: "PASSED", detail: "78% Score" },
    { id: "risk", label: "RISK GATES", status: "PASSED", detail: "20/20 Passed" },
    { id: "order", label: "OMS ORDER", status: "IDLE", detail: "Ready" },
    { id: "position", label: "POSITION", status: "IDLE", detail: "Standby" },
  ],
  conditions = [
    { label: "EMA Trend", condition: "EMA 9 > EMA 21", passed: true, currentValue: "Bullish Cross" },
    { label: "Momentum", condition: "RSI > 55", passed: true, currentValue: "64.2" },
    { label: "MACD Hist", condition: "MACD Hist > 0", passed: true, currentValue: "+14.2" },
    { label: "Regime", condition: "Price > VWAP", passed: true, currentValue: "Above" },
    { label: "Risk Gate", condition: "Drawdown < 3%", passed: true, currentValue: "0.85%" },
  ],
  className = "",
}: EcoStrategyFlowProps) {
  return (
    <div
      className={`p-4 bg-[#0D1914] border border-[#294238] rounded-2xl space-y-4 font-sans select-none ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#123C2A]/60 border border-[#2E7D5B]/40 text-[#55C98A]">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#70877A] block">
              Strategy Execution Pipeline
            </span>
            <h4 className="text-xs font-bold text-[#E8F3EC]">{strategyName}</h4>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-lg bg-[#2E7D5B]/20 text-[#55C98A] border border-[#2E7D5B]/40 text-[10px] font-mono font-bold">
          CONFLUENCE ARMED
        </span>
      </div>

      {/* 1. Pipeline Execution Stages */}
      <div className="p-3 bg-[#07110D] border border-[#1B3328] rounded-xl overflow-x-auto">
        <div className="flex items-center justify-between min-w-[500px] gap-2 font-mono text-xs">
          {stages.map((stage, idx) => {
            const isPassed = stage.status === "PASSED" || stage.status === "ACTIVE";
            return (
              <React.Fragment key={stage.id}>
                <div className="flex flex-col items-center text-center space-y-1">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center border text-[11px] font-bold ${
                      isPassed
                        ? "bg-[#2E7D5B]/20 border-[#55C98A] text-[#55C98A]"
                        : "bg-[#12221B] border-[#294238] text-[#70877A]"
                    }`}
                  >
                    {isPassed ? "●" : "—"}
                  </div>
                  <span className="text-[9px] font-bold text-[#E8F3EC] uppercase">{stage.label}</span>
                  {stage.detail && (
                    <span className="text-[8px] text-[#70877A]">{stage.detail}</span>
                  )}
                </div>

                {idx < stages.length - 1 && (
                  <div className="flex-1 h-[1px] bg-[#1B3328] relative mx-1">
                    {isPassed && (
                      <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-[#55C98A]/80 to-[#1B3328]" />
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 2. Visual Decision Condition Nodes */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase text-[#70877A] tracking-wider block">
          Condition Verification Matrix
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-xs">
          {conditions.map((cond) => (
            <div
              key={cond.label}
              className={`p-2.5 rounded-xl border flex items-center justify-between ${
                cond.passed
                  ? "bg-[#0B1F17]/80 border-[#2E7D5B]/40 text-[#E8F3EC]"
                  : "bg-[#07110D] border-[#1B3328] text-[#70877A]"
              }`}
            >
              <div>
                <span className="text-[9px] text-[#70877A] block uppercase">{cond.label}</span>
                <span className="text-[11px] font-bold text-[#A8D5BA]">{cond.condition}</span>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    cond.passed
                      ? "bg-[#55C98A]/15 text-[#55C98A]"
                      : "bg-[#E26D6D]/15 text-[#E26D6D]"
                  }`}
                >
                  {cond.passed ? "✓ OK" : "✗ WAIT"}
                </span>
                {cond.currentValue && (
                  <span className="text-[9px] text-[#70877A] block mt-0.5">
                    {cond.currentValue}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
