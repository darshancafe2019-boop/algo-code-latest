"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Lock,
} from "lucide-react";
import { UpstoxHealthReport } from "@/lib/upstox/types";
import { apiClient } from "@/lib/apiClient";

export function UpstoxMarketDataPanel() {
  const { data, isLoading, refetch } = useQuery<UpstoxHealthReport>({
    queryKey: ["upstoxHealth"],
    queryFn: async () => {
      const res = await apiClient.get<UpstoxHealthReport>("/api/upstox/health", { timeoutMs: 5000 });
      if (!res.ok || !res.data) throw new Error("Failed to load Upstox health");
      return res.data;
    },
    refetchInterval: () => (apiClient.isOffline() ? false : 10000),
    staleTime: 5000,
    retry: 1,
  });

  const isAuth = Boolean(data?.authenticated);
  const isOpen = data?.marketStatus === "OPEN";

  return (
    <div className="bg-[#0B132B]/90 border border-slate-800 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl font-mono text-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                UPSTOX MARKET DATA
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                NSE / BSE Live
              </span>
            </div>
            <p className="text-slate-400 font-sans text-xs mt-0.5">
              Live Feed Engine, Protocol V3 WebSocket &amp; Real-Time Analytics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 transition"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Grid Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Provider & Auth */}
        <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Authentication</span>
          <div className="flex items-center gap-1.5 font-bold">
            {isAuth ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Auth Required
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block font-sans">
            Token: {data?.tokenType || "MISSING"}
          </span>
        </div>

        {/* REST API Status */}
        <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">REST API</span>
          <div className="flex items-center gap-1.5 font-bold">
            {data?.restApi === "healthy" ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Healthy
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                {data?.restApi || "Unauthenticated"}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block font-sans">
            Endpoints: V2/V3 Quotes
          </span>
        </div>

        {/* WebSocket V3 Status */}
        <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">WebSocket V3</span>
          <div className="flex items-center gap-1.5 font-bold">
            {data?.websocket === "CONNECTED" ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                {data?.websocket || "Disconnected"}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block font-sans">
            Subscriptions: {data?.subscriptions || 0} active
          </span>
        </div>

        {/* Market Status */}
        <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Market Session</span>
          <div className="flex items-center gap-1.5 font-bold">
            {isOpen ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                OPEN (09:15-15:30)
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                CLOSED
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block font-sans">
            Hours: Mon-Fri 09:15-15:30 IST
          </span>
        </div>
      </div>

      {/* Safety & Execution Guard */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-slate-400 border-t border-slate-800/60">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Paper Trading Mode: <strong className="text-emerald-400">ACTIVE (Real Orders Blocked)</strong>
          </span>
        </div>
        <div>
          Last Telemetry Check:{" "}
          <span className="text-slate-300 font-mono">
            {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "Just now"}
          </span>
        </div>
      </div>
    </div>
  );
}
