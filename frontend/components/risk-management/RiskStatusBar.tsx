"use client";

import React from "react";
import { ShieldCheck, Activity, AlertOctagon, Server, CheckCircle2, Lock } from "lucide-react";
import { RiskAnalytics } from "@/types/risk";

interface RiskStatusBarProps {
  analytics?: RiskAnalytics;
  isConnected: boolean;
  onOpenEmergencyModal?: () => void;
}

export function RiskStatusBar({ analytics, isConnected, onOpenEmergencyModal }: RiskStatusBarProps) {
  return (
    <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-3.5 shadow-xl select-none font-sans text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Engine & Policy Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              )}
            </span>
            <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
              {isConnected ? "RISK STREAM LIVE" : "DISCONNECTED"}
            </span>
          </div>

          <div className="h-3.5 w-px bg-[#1E293B]" />

          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-400">Risk Engine:</span>
            <span className="font-bold text-emerald-400">{analytics?.risk_engine_status || "HEALTHY"}</span>
            <span className="text-[10px] text-slate-500">(v2.8.0)</span>
          </div>

          <div className="h-3.5 w-px bg-[#1E293B]" />

          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
            <span className="text-slate-400">Policy:</span>
            <span className="font-bold text-purple-400">{analytics?.policy_version || "v3.4.1"}</span>
          </div>
        </div>

        {/* Right: Kill Switch State & Data Health */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-slate-400">Kill Switch:</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {analytics?.kill_switch_state || "INACTIVE"}
            </span>
          </div>

          <div className="h-3.5 w-px bg-[#1E293B]" />

          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Server className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-400">Data Health:</span>
            <span className="font-bold text-emerald-400">OPTIMAL</span>
          </div>

          {onOpenEmergencyModal && (
            <button
              onClick={onOpenEmergencyModal}
              className="px-2.5 py-1 rounded-xl bg-rose-950/60 border border-rose-800 hover:bg-rose-900 text-rose-300 text-[10px] font-bold transition-colors flex items-center gap-1 font-mono"
            >
              <AlertOctagon className="h-3 w-3 text-rose-400" />
              Emergency Halt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
