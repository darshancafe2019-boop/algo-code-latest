"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Cpu,
  Lock,
  Zap,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";

export function OptionsHealthView() {
  const { data, isLoading, isFetching, refetch } = useQuery<any>({
    queryKey: ["optionsProvidersHealth"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/options/providers/health");
      if (!res.ok || !res.data) throw new Error("Failed to load options providers health");
      return res.data.data || res.data;
    },
    staleTime: 4000,
  });

  const providers = data?.providers || [];

  return (
    <div className="space-y-5 text-slate-100 font-sans">
      {/* Header Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
              OPTIONS DATA PROVIDER HEALTH & DIAGNOSTICS
            </h1>
            <p className="text-xs text-slate-400">
              Live multi-broker connection verification, token lifecycles, and stream telemetry
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-2 text-xs font-mono font-bold"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-sky-400" : ""}`} />
          Re-Check All Providers
        </button>
      </div>

      {/* Provider Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
        {providers.map((p: any) => {
          const isLive = p.status === "LIVE" || p.status === "CONNECTED";
          const isAuthReq = p.status === "AUTH_REQUIRED" || p.status === "TOKEN_EXPIRED" || p.authentication_status === "AUTH_REQUIRED";

          return (
            <div
              key={p.provider_id}
              className={`p-5 rounded-2xl border transition-all ${
                isLive
                  ? "bg-slate-900/80 border-slate-800 hover:border-emerald-500/40"
                  : isAuthReq
                  ? "bg-amber-950/20 border-amber-500/40"
                  : "bg-slate-900/60 border-slate-800"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      isLive
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-100">{p.provider_name}</h2>
                    <span className="text-[10px] text-slate-400 block">{p.exchange} • {p.feed_type}</span>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    isLive
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  }`}
                >
                  {p.status}
                </span>
              </div>

              {/* Telemetry Matrix Grid */}
              <div className="grid grid-cols-2 gap-3 py-4 text-xs border-b border-slate-800/80">
                <div>
                  <span className="text-slate-400 text-[10px] block">AUTHENTICATION</span>
                  <span className={`font-bold ${p.authentication_status === "ACTIVE" || p.authentication_status === "PUBLIC_FEED_ACTIVE" || p.authentication_status === "PUBLIC_EAPI_ACTIVE" ? "text-emerald-400" : "text-amber-400"}`}>
                    {p.authentication_status || "AUTH_REQUIRED"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] block">TOKEN VALIDITY</span>
                  <span className="text-slate-200">{p.token_status || "N/A"}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] block">REST GATEWAY</span>
                  <span className="text-emerald-400 font-bold">{p.rest_status || "UP"}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] block">STREAMING SOCKET</span>
                  <span className={`font-bold ${p.websocket_status === "LIVE" ? "text-emerald-400" : "text-slate-400"}`}>
                    {p.websocket_status || "IDLE"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] block">PAYLOAD DECODER</span>
                  <span className="text-slate-300">{p.decoder_status || "READY"}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] block">RESOLVED CONTRACTS</span>
                  <span className="text-sky-400 font-bold">{p.instrument_count || "—"}</span>
                </div>
              </div>

              {/* Status Message & Action Link */}
              <div className="pt-3.5 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 truncate max-w-[70%]">
                  {p.safe_error_message ? (
                    <span className="text-amber-300">{p.safe_error_message}</span>
                  ) : (
                    <span className="text-emerald-400">Operating nominally with low latency</span>
                  )}
                </div>

                {isAuthReq && (
                  <Link
                    href="/settings/brokers"
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 transition"
                  >
                    <span>Connect</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
