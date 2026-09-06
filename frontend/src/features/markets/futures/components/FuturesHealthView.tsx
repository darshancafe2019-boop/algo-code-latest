"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Key,
  RefreshCw,
  Cpu,
  Radio,
  Server,
  Zap,
} from "lucide-react";
import { fetchFuturesProvidersHealth } from "../api/futures-api";
import { ProviderHealthReport } from "../types/futures";

export function FuturesHealthView() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["futuresProvidersHealthReport"],
    queryFn: () => fetchFuturesProvidersHealth(),
    refetchInterval: 5000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/market/live/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["futuresProvidersHealthReport"] });
      queryClient.invalidateQueries({ queryKey: ["futuresUniverseContracts"] });
    },
  });

  const providers: ProviderHealthReport[] = data?.providers || [];
  const liveCount = data?.live_providers_count || 0;
  const totalCount = data?.total_providers_count || 5;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "LIVE":
      case "CONNECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 shadow-sm font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        );
      case "TOKEN_EXPIRED":
      case "AUTH_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800/60 font-mono">
            <Key className="w-3 h-3 text-amber-400" />
            {status.replace("_", " ")}
          </span>
        );
      case "NOT_CONFIGURED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-700/60 font-mono">
            <Lock className="w-3 h-3 text-slate-500" />
            NOT CONFIGURED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800/60 font-mono">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-200">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Live Gateways</span>
          <span className="text-xl font-bold text-white mt-1 block">
            {liveCount} / {totalCount} Active
          </span>
          <div className="mt-2 text-[10px] text-slate-500">
            {liveCount >= 2 ? "Multi-Venue Resilient" : "Degraded Feed State"}
          </div>
        </div>

        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Gateway Process</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <strong className="text-sm font-bold text-emerald-400">OPERATIONAL (5051)</strong>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Centralized Normalizer Bus</div>
        </div>

        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Diagnostic Engine</span>
            <span className="text-xs font-bold text-cyan-300 mt-1 block">Continuous Health Probes</span>
            <div className="mt-1 text-[10px] text-slate-500">5-Second Heartbeats</div>
          </div>
          <button
            onClick={() => {
              syncMutation.mutate();
              refetch();
            }}
            disabled={isFetching || syncMutation.isPending}
            className="p-2.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/50 transition active:scale-95 shadow-md"
            title="Refresh All Feeds"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching || syncMutation.isPending ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Provider Matrix Table */}
      <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between bg-[#080C14]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              Futures Market Data Feeds & Provider Certifications
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Real market-data verification required for LIVE status
          </span>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left font-mono text-xs text-slate-300 border-collapse">
            <thead className="bg-[#080C14]/90 border-b border-[#1E293B] text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Provider / Feed</th>
                <th className="py-3 px-3">REST Gateway</th>
                <th className="py-3 px-3">WebSocket Feed</th>
                <th className="py-3 px-3">Subscriptions</th>
                <th className="py-3 px-3">Decoders</th>
                <th className="py-3 px-3 text-right">Instruments</th>
                <th className="py-3 px-3 text-right">Tick Age</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141D2E]">
              {providers.map((p) => {
                const isLive = p.status === "LIVE" || p.status === "CONNECTED";
                return (
                  <tr key={p.provider} className="hover:bg-[#121927]/70 transition-all">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-xs">{p.display_name}</div>
                      <div className="text-[10px] text-slate-500">{p.provider}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={p.rest_status === "CONNECTED" ? "text-emerald-400" : "text-amber-400"}>
                        {p.rest_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={p.websocket_status === "CONNECTED" ? "text-emerald-400" : "text-slate-500"}>
                        {p.websocket_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={p.subscription_status === "ACTIVE" ? "text-cyan-400" : "text-slate-500"}>
                        {p.subscription_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={p.decoder_status === "OPERATIONAL" ? "text-emerald-400" : "text-slate-500"}>
                        {p.decoder_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-white">
                      {p.instrument_count}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {p.last_tick_age_ms != null ? `${p.last_tick_age_ms.toFixed(0)} ms` : "—"}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {renderStatusBadge(p.status)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {p.status === "TOKEN_EXPIRED" || p.status === "AUTH_REQUIRED" ? (
                        <a
                          href="/settings"
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition inline-block"
                        >
                          Reconnect
                        </a>
                      ) : p.status === "NOT_CONFIGURED" ? (
                        <a
                          href="/settings"
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 text-[10px] font-bold transition inline-block"
                        >
                          Configure
                        </a>
                      ) : (
                        <button
                          onClick={() => syncMutation.mutate()}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition"
                        >
                          Sync
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
