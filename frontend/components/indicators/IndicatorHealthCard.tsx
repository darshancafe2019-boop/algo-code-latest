"use client";

import React from "react";
import { Activity, CheckCircle2, AlertTriangle, Cpu, Zap, Clock, ShieldCheck } from "lucide-react";

interface IndicatorHealthCardProps {
  activeCount: number;
  healthyCount: number;
  errorCount: number;
  dataAgeSeconds?: number;
  latencyMs?: number;
  errorMessage?: string | null;
  onOpenDiagnostics: () => void;
}

export function IndicatorHealthCard({
  activeCount,
  healthyCount,
  errorCount,
  dataAgeSeconds = 0.4,
  latencyMs = 1.2,
  errorMessage,
  onOpenDiagnostics,
}: IndicatorHealthCardProps) {
  const isAllHealthy = errorCount === 0;

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
      {/* Auto-surfaced Error Banner if present */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-xs text-red-400 font-sans">
                Indicator Calculation Error
              </div>
              <div className="text-xs text-slate-300 font-mono mt-0.5">
                {errorMessage}
              </div>
            </div>
          </div>
          <button
            onClick={onOpenDiagnostics}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-500 hover:bg-red-400 text-slate-950 font-sans transition-all shrink-0"
          >
            Fix / Inspect
          </button>
        </div>
      )}

      {/* Main Health Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left: Summary Metrics */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs font-mono">
          <div className="flex items-center gap-1.5 font-bold text-white font-sans text-xs">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Indicator Health</span>
          </div>

          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{healthyCount} Healthy</span>
          </div>

          {errorCount > 0 ? (
            <div className="flex items-center gap-1 text-red-400 font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{errorCount} Errors</span>
            </div>
          ) : (
            <div className="text-slate-400">
              0 Errors
            </div>
          )}

          <div className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Data Age: {dataAgeSeconds.toFixed(1)}s</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Calc: {latencyMs.toFixed(1)}ms</span>
          </div>
        </div>

        {/* Right: Action */}
        <button
          onClick={onOpenDiagnostics}
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 font-sans flex items-center gap-1 transition-colors self-end sm:self-center"
        >
          <span>View Diagnostics</span>
        </button>
      </div>
    </div>
  );
}
