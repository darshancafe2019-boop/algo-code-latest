"use client";

import React from "react";
import { Radio, Activity, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Zap } from "lucide-react";

export interface BrokerStatusItem {
  id: string;
  name: string;
  status: "CONNECTED" | "DISCONNECTED" | "RECONNECTING" | "STALE" | "AUTH_REQUIRED" | "NOT_CONFIGURED";
  marketData: string;
  latencyMs: number;
  lastTick: string | null;
}

interface LiveSystemStatusProps {
  brokers: BrokerStatusItem[];
  gatewayStatus: string;
}

export const LiveSystemStatus: React.FC<LiveSystemStatusProps> = ({
  brokers,
  gatewayStatus,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "CONNECTED":
      case "LIVE":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        );
      case "AUTH_REQUIRED":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
            AUTH REQUIRED
          </span>
        );
      case "RECONNECTING":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 animate-pulse">
            RECONNECTING
          </span>
        );
      case "STALE":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
            STALE FEED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            READY / OFF
          </span>
        );
    }
  };

  return (
    <div className="bg-[#0B0E17]/95 border border-[#1A2A3F] rounded-xl p-4 shadow-lg mb-6">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Live Market Data & Broker Status
          </h2>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-slate-400">Gateway:</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            PORT 5051 (LIVE)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {brokers.map((b) => (
          <div
            key={b.id}
            className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white tracking-tight">{b.name}</span>
              {getStatusBadge(b.status)}
            </div>

            <div className="space-y-1 font-mono text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span className="text-slate-400">Data Feed:</span>
                <span className="text-slate-300 font-semibold">{b.marketData}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Latency:</span>
                <span className="text-cyan-400 font-bold">{b.latencyMs}ms</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
