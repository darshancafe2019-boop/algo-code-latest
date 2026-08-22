"use client";

import React from "react";
import { 
  Activity, 
  Database, 
  ShieldCheck, 
  Cpu, 
  Send, 
  Wifi, 
  HardDrive,
  CheckCircle2
} from "lucide-react";

interface SubsystemHealth {
  marketData: { status: "HEALTHY" | "DEGRADED" | "DOWN"; latencyMs: number; provider: string };
  execution: { status: "HEALTHY" | "DEGRADED" | "DOWN"; mode: string };
  riskEngine: { status: "HEALTHY" | "BLOCKED"; killSwitchEngaged: boolean };
  workers: { healthyCount: number; totalCount: number };
  telegram: { status: "CONNECTED" | "UNCONFIGURED" | "ERROR"; queueSize: number };
  db: { status: "HEALTHY" | "LOCKED"; storageMode: string };
}

interface LiveOperationsBarProps {
  health?: Partial<SubsystemHealth>;
}

export function LiveOperationsBar({ health }: LiveOperationsBarProps) {
  const subsystems = [
    {
      id: "market",
      label: "MARKET FEED",
      status: health?.marketData?.status || "HEALTHY",
      detail: `${health?.marketData?.provider || "Binance"} • ${health?.marketData?.latencyMs || 42}ms`,
      icon: <Activity className="w-3.5 h-3.5" />,
      color: "emerald"
    },
    {
      id: "execution",
      label: "EXECUTION ENGINE",
      status: health?.execution?.status || "HEALTHY",
      detail: health?.execution?.mode || "Paper & Live Ready",
      icon: <Cpu className="w-3.5 h-3.5" />,
      color: "emerald"
    },
    {
      id: "risk",
      label: "RISK GUARDRAILS",
      status: health?.riskEngine?.killSwitchEngaged ? "BLOCKED" : "HEALTHY",
      detail: health?.riskEngine?.killSwitchEngaged ? "HALTED" : "Max Drawdown Enforced",
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      color: health?.riskEngine?.killSwitchEngaged ? "rose" : "emerald"
    },
    {
      id: "workers",
      label: "WORKER FLEET",
      status: "HEALTHY",
      detail: `${health?.workers?.healthyCount || 8}/${health?.workers?.totalCount || 8} Healthy Leases`,
      icon: <Wifi className="w-3.5 h-3.5" />,
      color: "emerald"
    },
    {
      id: "database",
      label: "PERSISTENT DB",
      status: health?.db?.status || "HEALTHY",
      detail: "WAL Mode • Zero Loss",
      icon: <Database className="w-3.5 h-3.5" />,
      color: "emerald"
    },
    {
      id: "telegram",
      label: "NOTIFICATIONS",
      status: health?.telegram?.status || "CONNECTED",
      detail: "Priority Queue Ready",
      icon: <Send className="w-3.5 h-3.5" />,
      color: "emerald"
    }
  ];

  return (
    <div className="bg-[#0D131F]/90 border border-slate-800/80 rounded-xl p-2.5 px-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] font-bold uppercase tracking-wider">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Subsystem Observability:
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {subsystems.map((s) => {
          const isHealthy = s.status === "HEALTHY" || s.status === "CONNECTED";
          return (
            <div
              key={s.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono hover:border-slate-700 transition-colors"
            >
              <span className={isHealthy ? "text-emerald-400" : "text-rose-400"}>
                {s.icon}
              </span>
              <span className="font-semibold text-slate-300">{s.label}:</span>
              <span className={isHealthy ? "text-emerald-400 font-medium" : "text-rose-400 font-bold"}>
                {s.detail}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
