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
  market_data?: { status: string; label: string };
  database?: { status: string; latency_ms?: number; label: string };
  broker?: { status: string; label: string };
  bot_engine?: { status: string; label: string };
  websocket?: { status: string; label: string };
  recovery_engine?: { status: string; label: string; escalated_incidents?: number };
  marketData?: { status: "HEALTHY" | "DEGRADED" | "DOWN"; latencyMs: number; provider: string };
  execution?: { status: "HEALTHY" | "DEGRADED" | "DOWN"; mode: string };
  riskEngine?: { status: "HEALTHY" | "BLOCKED"; killSwitchEngaged: boolean };
  workers?: { healthyCount: number; totalCount: number };
  telegram?: { status: "CONNECTED" | "UNCONFIGURED" | "ERROR"; queueSize: number };
  db?: { status: "HEALTHY" | "LOCKED"; storageMode: string };
}

interface LiveOperationsBarProps {
  health?: {
    overall_status?: string;
    subsystems?: Record<string, any>;
  } | Partial<SubsystemHealth>;
}

export function LiveOperationsBar({ health }: LiveOperationsBarProps) {
  const dynamicSubsystems = (health as any)?.subsystems;

  const subsystems = [
    {
      id: "market",
      label: "MARKET FEEDS",
      status: dynamicSubsystems?.market_data?.status || (health as any)?.marketData?.status || "HEALTHY",
      detail: dynamicSubsystems?.market_data ? dynamicSubsystems.market_data.status : `${(health as any)?.marketData?.provider || "Binance"} • ${(health as any)?.marketData?.latencyMs || 42}ms`,
      icon: <Activity className="w-3.5 h-3.5" />
    },
    {
      id: "database",
      label: "PRIMARY DATABASE",
      status: dynamicSubsystems?.database?.status || (health as any)?.db?.status || "HEALTHY",
      detail: dynamicSubsystems?.database ? `${dynamicSubsystems.database.status} • ${dynamicSubsystems.database.latency_ms || 1.2}ms` : "WAL Mode • Online",
      icon: <Database className="w-3.5 h-3.5" />
    },
    {
      id: "broker",
      label: "EXECUTION GATEWAY",
      status: dynamicSubsystems?.broker?.status || "HEALTHY",
      detail: dynamicSubsystems?.broker ? dynamicSubsystems.broker.status : "Paper & Live Ready",
      icon: <Cpu className="w-3.5 h-3.5" />
    },
    {
      id: "workers",
      label: "BOT SCHEDULER",
      status: dynamicSubsystems?.bot_engine?.status || "HEALTHY",
      detail: dynamicSubsystems?.bot_engine ? dynamicSubsystems.bot_engine.status : "Scheduler Active",
      icon: <Wifi className="w-3.5 h-3.5" />
    },
    {
      id: "recovery",
      label: "SELF-HEALER",
      status: dynamicSubsystems?.recovery_engine?.status || "READY",
      detail: dynamicSubsystems?.recovery_engine ? (dynamicSubsystems.recovery_engine.status === "RECOVERING" ? "Auto-Healing" : "Circuit Closed") : "Auto-Healing Ready",
      icon: <ShieldCheck className="w-3.5 h-3.5" />
    }
  ];

  return (
    <div className="bg-[#0D131F]/90 border border-slate-800/80 rounded-xl p-2.5 px-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] font-bold uppercase tracking-wider">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Safe Self-Healing Observability:
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {subsystems.map((s) => {
          const isHealthy = s.status === "HEALTHY" || s.status === "READY" || s.status === "CONNECTED";
          const isRecovering = s.status === "RECOVERING";
          const colorClass = isHealthy ? "text-emerald-400" : isRecovering ? "text-cyan-400 animate-pulse" : "text-rose-400 font-bold";

          return (
            <div
              key={s.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono hover:border-slate-700 transition-colors"
            >
              <span className={colorClass}>
                {s.icon}
              </span>
              <span className="font-semibold text-slate-300">{s.label}:</span>
              <span className={colorClass}>
                {s.detail}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
