"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, Zap, Lock, RefreshCw, Activity, Radio, CheckCircle2 } from "lucide-react";
import { ExecutionMode } from "@/types/order-execution";

interface OrderCommandHeaderProps {
  executionMode: ExecutionMode;
  onToggleMode: () => void;
  brokerStatus: string;
  dataFeedStatus: string;
  latencyMs: number;
  riskGatePassed: boolean;
  onResetPaperAccount?: () => void;
}

export function OrderCommandHeader({
  executionMode,
  onToggleMode,
  brokerStatus = "CONNECTED",
  dataFeedStatus = "LIVE",
  latencyMs = 28,
  riskGatePassed = true,
  onResetPaperAccount,
}: OrderCommandHeaderProps) {
  return (
    <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 sm:p-5 font-sans space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Title & Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/30 flex items-center justify-center text-[#22D3EE]">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#F7FAFC] tracking-tight">
                ORDER & EXECUTION COMMAND CENTER
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-[#101B2D] text-[#22D3EE] border border-[#1A2A3F]">
                14-STAGE OMS
              </span>
            </div>
            <p className="text-xs text-[#7C8CA3] mt-0.5">
              Server-authoritative pre-trade risk checks, margin validation, and idempotent execution
            </p>
          </div>
        </div>

        {/* Paper / Live Mode Switch */}
        <div className="flex items-center gap-2">
          {executionMode === "PAPER" && onResetPaperAccount && (
            <button
              onClick={onResetPaperAccount}
              className="px-2.5 py-1 text-[11px] rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#F7FAFC] border border-[#1A2A3F] hover:border-[#29415F] transition-all flex items-center gap-1 font-medium"
              title="Reset simulated paper trading account balance"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Balance
            </button>
          )}

          <button
            onClick={onToggleMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              executionMode === "PAPER"
                ? "bg-[#19C5FF]/10 text-[#19C5FF] border border-[#19C5FF]/30 hover:bg-[#19C5FF]/20"
                : "bg-[#FF3B5C]/10 text-[#FF3B5C] border border-[#FF3B5C]/30 hover:bg-[#FF3B5C]/20 animate-pulse"
            }`}
          >
            {executionMode === "PAPER" ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>MODE: PAPER SIMULATION</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>MODE: LIVE TRADING (ARMED)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Telemetry Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#1A2A3F] text-xs">
        <div className="bg-[#07101A] border border-[#1A2A3F] rounded-lg p-2.5 flex items-center justify-between">
          <span className="text-[#52627A]">Broker Link:</span>
          <span className="text-[#00E890] font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E890]" />
            {brokerStatus}
          </span>
        </div>

        <div className="bg-[#07101A] border border-[#1A2A3F] rounded-lg p-2.5 flex items-center justify-between">
          <span className="text-[#52627A]">Market Data:</span>
          <span className="text-[#22D3EE] font-semibold flex items-center gap-1 font-mono tabular-nums">
            <Radio className="w-3 h-3 text-[#22D3EE]" />
            {dataFeedStatus} ({latencyMs}ms)
          </span>
        </div>

        <div className="bg-[#07101A] border border-[#1A2A3F] rounded-lg p-2.5 flex items-center justify-between">
          <span className="text-[#52627A]">Risk Engine:</span>
          <span className={riskGatePassed ? "text-[#00E890] font-semibold" : "text-[#F59E0B] font-semibold"}>
            {riskGatePassed ? "14/14 GATES" : "BLOCKED"}
          </span>
        </div>

        <div className="bg-[#07101A] border border-[#1A2A3F] rounded-lg p-2.5 flex items-center justify-between">
          <span className="text-[#52627A]">Execution Engine:</span>
          <span className="text-[#F7FAFC] font-semibold">READY</span>
        </div>
      </div>
    </div>
  );
}

