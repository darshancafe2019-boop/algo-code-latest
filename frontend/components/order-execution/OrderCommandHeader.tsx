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
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Title & Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                ORDER & EXECUTION COMMAND CENTER
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                14-STAGE OMS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Server-authoritative pre-trade risk checks, margin validation, and idempotent execution
            </p>
          </div>
        </div>

        {/* Paper / Live Mode Switch */}
        <div className="flex items-center gap-2">
          {executionMode === "PAPER" && onResetPaperAccount && (
            <button
              onClick={onResetPaperAccount}
              className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-[#141E33] hover:bg-[#1C2A47] text-slate-300 border border-slate-700 transition-all flex items-center gap-1"
              title="Reset simulated paper trading account balance"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Balance
            </button>
          )}

          <button
            onClick={onToggleMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-sm ${
              executionMode === "PAPER"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                : "bg-red-950 text-red-400 border border-red-800 hover:bg-red-900 animate-pulse"
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
        <div className="bg-[#141E33] border border-[#1E293B] rounded-lg p-2 flex items-center justify-between">
          <span className="text-slate-400">Broker Link:</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {brokerStatus}
          </span>
        </div>

        <div className="bg-[#141E33] border border-[#1E293B] rounded-lg p-2 flex items-center justify-between">
          <span className="text-slate-400">Market Data:</span>
          <span className="text-cyan-400 font-bold flex items-center gap-1">
            <Radio className="w-3 h-3 text-cyan-400" />
            {dataFeedStatus} ({latencyMs}ms)
          </span>
        </div>

        <div className="bg-[#141E33] border border-[#1E293B] rounded-lg p-2 flex items-center justify-between">
          <span className="text-slate-400">Risk Engine:</span>
          <span className={riskGatePassed ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
            {riskGatePassed ? "✓ 14/14 GATES" : "⚠ BLOCKED"}
          </span>
        </div>

        <div className="bg-[#141E33] border border-[#1E293B] rounded-lg p-2 flex items-center justify-between">
          <span className="text-slate-400">Execution Engine:</span>
          <span className="text-white font-bold">READY</span>
        </div>
      </div>
    </div>
  );
}
