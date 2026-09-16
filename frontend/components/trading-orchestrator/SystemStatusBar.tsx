"use client";

import React from "react";
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Clock,
  Zap,
  RefreshCw,
  Cpu,
  Layers,
} from "lucide-react";
import {
  SystemStatusState,
  ProviderDiagnostic,
  DrawerContentType,
} from "./useSharedTradingState";
import { cn } from "@/lib/utils";

interface SystemStatusBarProps {
  system: SystemStatusState;
  providers: ProviderDiagnostic[];
  healthyCount: number;
  riskStatus: "APPROVED" | "BLOCKED" | "PENDING";
  onOpenDrawer: (type: DrawerContentType, title: string, data?: any) => void;
}

export const SystemStatusBar: React.FC<SystemStatusBarProps> = ({
  system,
  providers,
  healthyCount,
  riskStatus,
  onOpenDrawer,
}) => {
  const isMarketOpen = system.marketSession === "OPEN";

  return (
    <div className="w-full bg-[#050e1d]/90 border border-[#12365a] rounded-xl px-3 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-2.5 text-xs select-none backdrop-blur">
      {/* Left: Engine & Mode */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Engine Status Pill */}
        <button
          onClick={() => onOpenDrawer("workflow_schedule", "Scheduled Automation & Engine Status")}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono font-bold transition-all cursor-pointer",
            system.isKilled
              ? "bg-rose-950/50 border-rose-600 text-rose-300 animate-pulse"
              : system.isPaused
              ? "bg-amber-950/40 border-amber-600/50 text-amber-300"
              : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:border-emerald-400"
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              system.isKilled
                ? "bg-rose-400"
                : system.isPaused
                ? "bg-amber-400"
                : "bg-emerald-400 animate-pulse"
            )}
          />
          ENGINE {system.isKilled ? "KILLED" : system.isPaused ? "PAUSED" : "ACTIVE"}
        </button>

        {/* Mode Pill */}
        <span
          className={cn(
            "px-2 py-1 rounded-lg border font-mono text-[11px] font-bold uppercase",
            system.tradingMode === "PAPER"
              ? "bg-cyan-950/60 border-cyan-500/40 text-cyan-300"
              : "bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse"
          )}
        >
          MODE: {system.tradingMode}
        </span>

        {/* Market Session Pill */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#07192f] border border-[#143e69] text-slate-300 font-mono text-[11px]">
          <Clock className="h-3 w-3 text-[#00D4FF]" />
          <span>NSE {system.marketSession}</span>
          <span className="text-slate-500">•</span>
          <span className="text-[#00D4FF] font-semibold">{system.clockIst || "IST"}</span>
        </div>
      </div>

      {/* Center: Data Providers Quick Pings */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
          DATA:
        </span>
        {providers.map((p) => {
          const isConn = p.status === "CONNECTED" || p.status === "LIVE" || p.status === "VALID";
          return (
            <button
              key={p.id}
              onClick={() => onOpenDrawer("provider_diagnostics", `Provider Diagnostics: ${p.name}`, p)}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono transition-all cursor-pointer hover:scale-105",
                isConn
                  ? "bg-[#07192e] border-[#134373] text-slate-200 hover:border-[#00D4FF]"
                  : "bg-rose-950/30 border-rose-800 text-rose-300"
              )}
              title={`${p.name} (${p.protocol}) - Click for details`}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isConn ? "bg-emerald-400" : "bg-rose-400 animate-ping"
                )}
              />
              <span className="font-semibold uppercase">{p.id}</span>
            </button>
          );
        })}
      </div>

      {/* Right: AI, Risk, Reconciliation */}
      <div className="flex items-center gap-2">
        {/* AI Pill */}
        <button
          onClick={() => onOpenDrawer("ai_reasoning", "AI Strategy Agent Reasoning & State")}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-950/40 border border-purple-500/40 text-purple-300 hover:border-purple-400 transition-all font-mono text-[11px] cursor-pointer"
        >
          <Cpu className="h-3 w-3 text-purple-400" />
          <span>AI: READY</span>
        </button>

        {/* Risk Status Pill */}
        <button
          onClick={() => onOpenDrawer("risk_checks", "Risk Engine — 12 Rule Verification Matrix")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg border transition-all font-mono text-[11px] cursor-pointer",
            riskStatus === "APPROVED"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:border-emerald-400"
              : "bg-rose-950/60 border-rose-500 text-rose-300 animate-pulse"
          )}
        >
          {riskStatus === "APPROVED" ? (
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
          ) : (
            <ShieldAlert className="h-3 w-3 text-rose-400" />
          )}
          <span>RISK: {riskStatus === "APPROVED" ? "NORMAL" : "BLOCKED"}</span>
        </button>

        {/* Reconciliation */}
        <button
          onClick={() => onOpenDrawer("reconciliation", "Multi-Broker Position & Order Reconciliation")}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#07192f] border border-[#143e69] text-cyan-300 hover:border-cyan-400 transition-all font-mono text-[11px] cursor-pointer hidden md:flex"
        >
          <RefreshCw className="h-3 w-3 text-cyan-400" />
          <span>RECON: SYNCED</span>
        </button>
      </div>
    </div>
  );
};
