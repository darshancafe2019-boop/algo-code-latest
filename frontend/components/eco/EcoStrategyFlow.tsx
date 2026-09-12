"use client";

import React from "react";
import { Zap } from "lucide-react";

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
      className={`p-4 bg-[#0A1422] border border-[#1A2A3F] rounded-xl space-y-4 font-sans select-none ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#22D3EE]/10 border border-[#22D3EE]/30 text-[#22D3EE]">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#52627A] block">
              Strategy Execution Pipeline
            </span>
            <h4 className="text-xs font-bold text-[#F7FAFC]">{strategyName}</h4>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded text-[#22D3EE] bg-[#22D3EE]/10 border border-[#22D3EE]/30 text-[10px] font-mono font-bold">
          CONFLUENCE ARMED
        </span>
      </div>

      {/* 1. Pipeline Execution Stages */}
      <div className="p-3 bg-[#07101A] border border-[#122033] rounded-lg overflow-x-auto">
        <div className="flex items-center justify-between min-w-[500px] gap-2 font-mono text-xs">
          {stages.map((stage, idx) => {
            const isPassed = stage.status === "PASSED" || stage.status === "ACTIVE";
            return (
              <React.Fragment key={stage.id}>
                <div className="flex flex-col items-center text-center space-y-1">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border text-[11px] font-bold ${
                      isPassed
                        ? "bg-[#2563EB]/20 border-[#22D3EE] text-[#22D3EE]"
                        : "bg-[#101B2D] border-[#122033] text-[#52627A]"
                    }`}
                  >
                    {isPassed ? "●" : "—"}
                  </div>
                  <span className="text-[9px] font-bold text-[#F7FAFC] uppercase">{stage.label}</span>
                  {stage.detail && (
                    <span className="text-[8px] text-[#52627A]">{stage.detail}</span>
                  )}
                </div>

                {idx < stages.length - 1 && (
                  <div className="flex-1 h-[1px] bg-[#122033] relative mx-1">
                    {isPassed && (
                      <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-[#22D3EE]/80 to-[#122033]" />
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
        <span className="text-[10px] font-mono uppercase text-[#52627A] tracking-wider block">
          Condition Verification Matrix
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-xs">
          {conditions.map((cond) => (
            <div
              key={cond.label}
              className={`p-2.5 rounded-lg border flex items-center justify-between ${
                cond.passed
                  ? "bg-[#07101A] border-[#122033] text-[#F7FAFC]"
                  : "bg-[#060B14] border-[#122033] text-[#52627A]"
              }`}
            >
              <div>
                <span className="text-[9px] text-[#52627A] block uppercase">{cond.label}</span>
                <span className="text-[11px] font-bold text-[#19C5FF]">{cond.condition}</span>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    cond.passed
                      ? "bg-[#00E890]/15 text-[#00E890]"
                      : "bg-[#FF3B5C]/15 text-[#FF3B5C]"
                  }`}
                >
                  {cond.passed ? "✓ OK" : "✗ WAIT"}
                </span>
                {cond.currentValue && (
                  <span className="text-[9px] text-[#52627A] block mt-0.5">
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
