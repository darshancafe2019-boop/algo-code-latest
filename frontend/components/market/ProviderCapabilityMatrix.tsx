"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Cpu,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  Zap,
  Layers,
  Activity,
  Filter,
} from "lucide-react";

interface ProviderEntry {
  provider_id: string;
  provider_name: string;
  market: string;
  exchange: string;
  data_types: string[];
  realtime: boolean;
  historical: boolean;
  options: boolean;
  futures: boolean;
  oi: boolean;
  greeks: boolean;
  status: string;
  latency_ms: number;
  entitlement: string;
}

export function ProviderCapabilityMatrix() {
  const [filterMarket, setFilterMarket] = useState("ALL");

  const { data, isLoading, refetch, isFetching } = useQuery<{
    status: string;
    total_providers: number;
    timestamp: string;
    providers: ProviderEntry[];
  }>({
    queryKey: ["providerCapabilityMatrix"],
    queryFn: async () => {
      const res = await fetch("/api/system/providers");
      if (!res.ok) throw new Error("Failed to fetch provider matrix");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const providers = data?.providers || [];

  const filteredProviders = providers.filter((p) => {
    if (filterMarket === "ALL") return true;
    if (filterMarket === "INDIA") return p.market.includes("India") || p.exchange === "NSE" || p.exchange === "BSE";
    if (filterMarket === "CRYPTO") return p.data_types.includes("CRYPTO");
    if (filterMarket === "GLOBAL") return p.market.includes("US") || p.market.includes("Global");
    if (filterMarket === "DERIVATIVES") return p.options || p.futures;
    return true;
  });

  return (
    <div className="space-y-4 font-sans text-slate-100 select-none">
      {/* Header & Controls */}
      <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Provider Capability & Entitlements Matrix
            </h2>
            <p className="text-xs text-slate-400">
              Direct authorized exchange feeds, institutional market gateways, latency meters, and data type entitlements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Market Filter Pills */}
          <div className="flex items-center gap-1 bg-[#080C14] p-1 rounded-xl border border-[#1E293B] text-xs font-mono">
            {["ALL", "INDIA", "CRYPTO", "GLOBAL", "DERIVATIVES"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterMarket(cat)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterMarket === cat
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121927] hover:bg-[#1A253A] text-slate-300 rounded-xl border border-[#1E293B] text-xs font-mono transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
            <span>Sync Feeds</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1E293B] bg-[#080C14]/80 text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Provider / Adapter</th>
                <th className="py-3 px-4">Market & Exchange</th>
                <th className="py-3 px-4">Supported Capabilities</th>
                <th className="py-3 px-4 text-center">Options</th>
                <th className="py-3 px-4 text-center">Futures</th>
                <th className="py-3 px-4 text-center">OI</th>
                <th className="py-3 px-4 text-center">Greeks</th>
                <th className="py-3 px-4 text-right">Latency</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141D2E] text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500 font-mono">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-cyan-400" />
                    Probing provider gateways & capability handshakes...
                  </td>
                </tr>
              ) : filteredProviders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500 font-mono">
                    No providers matched filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProviders.map((p) => {
                  const isLive = p.status === "LIVE";

                  return (
                    <tr key={p.provider_id} className="hover:bg-[#121927]/60 transition-colors">
                      {/* Provider Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs">{p.provider_name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{p.entitlement}</div>
                      </td>

                      {/* Market & Exchange */}
                      <td className="py-3.5 px-4">
                        <span className="text-cyan-300 font-bold">{p.exchange}</span>
                        <div className="text-[10px] text-slate-400">{p.market}</div>
                      </td>

                      {/* Capabilities Badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {p.data_types.map((dt) => (
                            <span
                              key={dt}
                              className="px-1.5 py-0.2 rounded bg-[#080C14] text-[9px] text-slate-300 border border-slate-700 font-mono"
                            >
                              {dt}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Options */}
                      <td className="py-3.5 px-4 text-center">
                        {p.options ? (
                          <span className="text-emerald-400 font-bold">YES</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Futures */}
                      <td className="py-3.5 px-4 text-center">
                        {p.futures ? (
                          <span className="text-emerald-400 font-bold">YES</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* OI */}
                      <td className="py-3.5 px-4 text-center">
                        {p.oi ? (
                          <span className="text-cyan-400 font-bold">LIVE</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Greeks */}
                      <td className="py-3.5 px-4 text-center">
                        {p.greeks ? (
                          <span className="text-purple-400 font-bold">EXCH</span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">CALC</span>
                        )}
                      </td>

                      {/* Latency */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-bold ${
                            p.latency_ms < 25
                              ? "text-emerald-400"
                              : p.latency_ms < 40
                              ? "text-cyan-400"
                              : "text-amber-400"
                          }`}
                        >
                          {(Number(p?.latency_ms) || 24.5).toFixed(1)} ms
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                            isLive
                              ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                              : "bg-amber-950/60 text-amber-400 border-amber-800/40"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
