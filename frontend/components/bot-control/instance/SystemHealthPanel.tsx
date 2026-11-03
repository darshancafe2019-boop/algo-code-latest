"use client";

import React from "react";
import { Activity, Radio, Database, Cpu, Wifi, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SystemServiceNode {
  name: string;
  category: "GATEWAY" | "BROKER" | "ENGINE" | "DATABASE" | "FEED";
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  latencyMs: number;
  lastHeartbeat: string;
  errorCount: number;
}

export interface SystemHealthData {
  exchangeApiStatus: "CONNECTED" | "DISCONNECTED";
  gatewayStatus: "LIVE" | "CONNECTING" | "STALE";
  websocketState: "SYNCHRONIZED" | "RECONNECTING" | "DISCONNECTED";
  restApiStatus: "HEALTHY" | "DEGRADED";
  feedLatencyMs: number;
  lastTickTimestamp: string;
  dataAgeSeconds: number;
  reconnectionAttempts: number;
  services: SystemServiceNode[];
}

interface SystemHealthPanelProps {
  health: SystemHealthData;
}

export function SystemHealthPanel({ health }: SystemHealthPanelProps) {
  const isStale = health.dataAgeSeconds > 10;

  return (
    <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-4 space-y-4 font-sans select-none shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1A2B43]/70">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#00C9E8]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            System Health &amp; Infrastructure Connectivity
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span
            className={cn(
              "px-2.5 py-0.5 rounded font-bold border",
              isStale
                ? "bg-[#FF5268]/20 text-[#FF5268] border-[#FF5268]/40 animate-pulse"
                : "bg-[#00D6A0]/10 text-[#00D6A0] border-[#00D6A0]/30"
            )}
          >
            {isStale ? "STALE MARKET FEED WARNING" : "ALL SERVICES OPERATIONAL"}
          </span>
        </div>
      </div>

      {/* Primary Infrastructure Status Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 font-mono text-xs">
        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Exchange API</span>
          <span className="text-sm font-bold text-[#00D6A0] flex items-center gap-1.5 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-[#00D6A0] animate-pulse" />
            {health.exchangeApiStatus}
          </span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Market Gateway</span>
          <span className="text-sm font-bold text-[#00C9E8] flex items-center gap-1.5 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-[#00C9E8] animate-pulse" />
            {health.gatewayStatus}
          </span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">WebSocket Stream</span>
          <span className="text-sm font-bold text-[#00D6A0] flex items-center gap-1.5 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-[#00D6A0]" />
            {health.websocketState}
          </span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Feed Latency</span>
          <span className={cn("text-sm font-bold tabular-nums block mt-0.5", health.feedLatencyMs < 50 ? "text-[#00D6A0]" : "text-[#FFB020]")}>
            {health.feedLatencyMs}ms
          </span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Data Age</span>
          <span className={cn("text-sm font-bold tabular-nums block mt-0.5", isStale ? "text-[#FF5268]" : "text-[#00C9E8]")}>
            {health.dataAgeSeconds.toFixed(1)}s
          </span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Reconnection Tries</span>
          <span className="text-sm font-bold text-[#EAF3FF] tabular-nums block mt-0.5">
            {health.reconnectionAttempts} Attempts
          </span>
        </div>
      </div>

      {/* Microservices Grid */}
      <div className="space-y-1.5 pt-2 border-t border-[#1A2B43]/70">
        <h4 className="text-[11px] font-bold font-mono text-[#00C9E8] uppercase tracking-wider">
          Individual Service Nodes Health
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs font-mono">
          {health.services.map((svc, idx) => (
            <div key={idx} className="p-2 rounded bg-[#050B16] border border-[#1A2B43]/60 flex items-center justify-between">
              <div>
                <span className="font-bold text-[#EAF3FF] block">{svc.name}</span>
                <span className="text-[10px] text-[#91A7C1]">{svc.latencyMs}ms</span>
              </div>
              <span className="h-2 w-2 rounded-full bg-[#00D6A0] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

