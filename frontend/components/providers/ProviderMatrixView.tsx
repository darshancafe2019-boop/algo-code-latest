"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Globe,
  Radio,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  ShieldCheck,
  Zap,
  Layers,
  Lock,
} from "lucide-react";

interface ProviderCapability {
  provider_id: string;
  name: string;
  asset_classes: string[];
  historical: boolean;
  realtime: boolean;
  websocket: boolean;
  options: boolean;
  open_interest: boolean;
  funding_rate: boolean;
  orderbook: boolean;
  trading: boolean;
  status: "ONLINE" | "STANDBY" | "NOT_CONFIGURED" | "UNSUPPORTED";
  latency_ms: number;
  notes: string;
}

interface ProviderResponse {
  status: string;
  providers: ProviderCapability[];
}

export function ProviderMatrixView() {
  const { data, isLoading, refetch, isFetching } = useQuery<ProviderResponse>({
    queryKey: ["providerCapabilities"],
    queryFn: async () => {
      const res = await fetch("/api/providers/capabilities");
      if (!res.ok) throw new Error("Failed to fetch provider capabilities");
      return res.json();
    },
    refetchInterval: 10000,
  });

  return (
    <div className="flex flex-col gap-4 text-slate-100 font-sans">
      {/* Header */}
      <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">Provider Capability & Entitlement Matrix</h1>
            <p className="text-xs text-slate-400">
              Pluggable data & execution providers • No TradingView scraping • Real-time connection metrics
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-3.5 py-2 bg-[#0B0F17] border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl hover:text-white transition flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          Refresh Providers
        </button>
      </div>

      {/* Capability Matrix Table */}
      <div className="bg-[#131B2A] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#0B0F17] text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Provider / Exchange</th>
                <th className="py-3 px-3">Asset Coverage</th>
                <th className="py-3 px-2 text-center">Historical</th>
                <th className="py-3 px-2 text-center">Realtime</th>
                <th className="py-3 px-2 text-center">WebSocket</th>
                <th className="py-3 px-2 text-center">Options</th>
                <th className="py-3 px-2 text-center">OI / Funding</th>
                <th className="py-3 px-2 text-center">Order Book</th>
                <th className="py-3 px-2 text-center">Live Trade</th>
                <th className="py-3 px-3 text-center">Latency</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                      <span>Scanning registered provider capabilities...</span>
                    </div>
                  </td>
                </tr>
              ) : data?.providers ? (
                data.providers.map((p) => (
                  <tr key={p.provider_id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-bold text-white">
                      <div>{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal font-mono">{p.notes}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {p.asset_classes.map((ac) => (
                          <span
                            key={ac}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono"
                          >
                            {ac.replace("_", " ")}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-2 text-center">
                      {p.historical ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">UNSUPPORTED</span>
                      )}
                    </td>

                    <td className="py-3 px-2 text-center">
                      {p.realtime ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">UNSUPPORTED</span>
                      )}
                    </td>

                    <td className="py-3 px-2 text-center">
                      {p.websocket ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">UNSUPPORTED</span>
                      )}
                    </td>

                    <td className="py-3 px-2 text-center">
                      {p.options ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">UNSUPPORTED</span>
                      )}
                    </td>

                    <td className="py-3 px-2 text-center">
                      {p.open_interest ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">UNSUPPORTED</span>
                      )}
                    </td>

                    <td className="py-3 px-2 text-center">
                      {p.orderbook ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">UNSUPPORTED</span>
                      )}
                    </td>

                    <td className="py-3 px-2 text-center">
                      {p.trading ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {p.status === "NOT_CONFIGURED" ? "KEY REQUIRED" : "READ ONLY"}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      <span className={p.latency_ms < 50 ? "text-emerald-400" : "text-amber-400"}>
                        {p.latency_ms}ms
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      {p.status === "ONLINE" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          ONLINE
                        </span>
                      ) : p.status === "NOT_CONFIGURED" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                          NOT CONFIGURED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-bold">
                          STANDBY
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
