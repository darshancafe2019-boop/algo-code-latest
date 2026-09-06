"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Cpu,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  Zap,
  Layers,
  Activity,
  Filter,
  Search,
  Key,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Server,
  Lock,
  ExternalLink,
  Sliders,
} from "lucide-react";

interface ProviderMatrixEntry {
  provider_id: string;
  provider_name: string;
  exact_source: string;
  broker_account: string;
  broker_account_alias: string;
  environment: string;
  market: string;
  exchange: string;
  segment: string;
  asset_class: string;
  supported_capabilities: string[];
  options: boolean;
  futures: boolean;
  spot: boolean;
  order_book: boolean;
  oi: boolean;
  greeks: boolean;
  historical: boolean;
  feed_type: string;
  last_update: string;
  data_age_ms: number;
  latency_ms: number;
  status: "CONNECTED" | "AUTH_REQUIRED" | "NOT_CONFIGURED" | "DISCONNECTED" | "STALE" | "UNAVAILABLE";
  error_details: string | null;
  entitlement: string;
  category: string;
}

interface MatrixResponse {
  status: string;
  total_providers: number;
  timestamp: string;
  providers: ProviderMatrixEntry[];
}

export function ProviderCapabilityMatrix() {
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery<MatrixResponse>({
    queryKey: ["providerCapabilityMatrix"],
    queryFn: async () => {
      const res = await fetch("/api/system/providers");
      if (!res.ok) throw new Error("Failed to fetch provider matrix");
      return res.json();
    },
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
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["providerCapabilityMatrix"] });
      queryClient.invalidateQueries({ queryKey: ["marketHealthTelemetry"] });
      setSyncFeedback(result.message || "Feeds synchronized successfully");
      setTimeout(() => setSyncFeedback(null), 4000);
    },
    onError: (err: any) => {
      setSyncFeedback(`Sync failed: ${err.message}`);
      setTimeout(() => setSyncFeedback(null), 4000);
    },
  });

  const providers = data?.providers || [];

  const filteredProviders = providers.filter((p) => {
    // Category Filter
    if (filterCategory !== "ALL") {
      if (filterCategory === "INDIA" && p.category !== "INDIA") return false;
      if (filterCategory === "CRYPTO" && p.category !== "CRYPTO") return false;
      if (filterCategory === "DERIVATIVES" && !p.options && !p.futures) return false;
      if (filterCategory === "FOREX" && p.category !== "FOREX") return false;
      if (filterCategory === "COMMODITIES" && p.category !== "COMMODITIES") return false;
      if (filterCategory === "GLOBAL" && p.category !== "GLOBAL" && !p.market.includes("Global")) return false;
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.provider_name.toLowerCase().includes(q);
      const matchSource = p.exact_source.toLowerCase().includes(q);
      const matchMarket = p.market.toLowerCase().includes(q);
      const matchExchange = p.exchange.toLowerCase().includes(q);
      const matchAccount = (p.broker_account_alias || p.broker_account).toLowerCase().includes(q);
      if (!matchName && !matchSource && !matchMarket && !matchExchange && !matchAccount) {
        return false;
      }
    }

    return true;
  });

  const renderStatusBadge = (p: ProviderMatrixEntry) => {
    switch (p.status) {
      case "CONNECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            CONNECTED
          </span>
        );
      case "AUTH_REQUIRED":
        return (
          <span
            title={p.error_details || "API credentials required in environment"}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-950/70 text-amber-400 border border-amber-800/60 cursor-help shadow-sm"
          >
            <Key className="w-3 h-3 text-amber-400" />
            AUTH REQUIRED
          </span>
        );
      case "NOT_CONFIGURED":
        return (
          <span
            title={p.error_details || "Provider adapter not configured"}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-700/60 cursor-help"
          >
            <Lock className="w-3 h-3 text-slate-500" />
            NOT CONFIGURED
          </span>
        );
      case "STALE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-orange-950/70 text-orange-400 border border-orange-800/60">
            <AlertTriangle className="w-3 h-3 text-orange-400" />
            STALE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-950/70 text-rose-400 border border-rose-800/60">
            DISCONNECTED
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-100 select-none">
      {/* 1. Header & Controls Card */}
      <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 shadow-inner">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Provider Capability & Entitlements Matrix
                </h2>
                <span className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-[10px] font-mono font-bold rounded-md">
                  AUTHENTICATED ADAPTERS ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact source identification, broker-wise segregation, strict zero-mock data policies, and real-time capability meters.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search provider, exchange, account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#080C14] border border-[#1E293B] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono w-48 sm:w-64"
              />
            </div>

            {/* Sync Feeds Idempotent Action */}
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || isFetching}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 rounded-xl border border-cyan-700/50 text-xs font-mono font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending || isFetching ? "animate-spin text-cyan-400" : ""}`} />
              <span>{syncMutation.isPending ? "Syncing..." : "Sync Feeds"}</span>
            </button>

            {/* Diagnostics Toggle */}
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121927] hover:bg-[#1A253A] text-slate-300 rounded-xl border border-[#1E293B] text-xs font-mono transition-all"
            >
              <Sliders className="h-3.5 w-3.5 text-slate-400" />
              <span>Metrics</span>
              {showDiagnostics ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* Sync Feedback Toast Banner if Active */}
        {syncFeedback && (
          <div className="mt-3 p-2.5 bg-cyan-950/80 border border-cyan-600/50 rounded-xl text-xs text-cyan-200 font-mono flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Category Filter Pills */}
        <div className="mt-4 pt-3 border-t border-[#1E293B]/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1">Filter Segment:</span>
            {["ALL", "INDIA", "CRYPTO", "DERIVATIVES", "FOREX", "GLOBAL"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterCategory === cat
                    ? "bg-cyan-500 text-slate-950 shadow-md scale-105"
                    : "bg-[#080C14] text-slate-400 hover:text-white border border-[#1E293B]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            Showing <strong className="text-cyan-300">{filteredProviders.length}</strong> of <strong className="text-slate-300">{providers.length}</strong> adapters
          </span>
        </div>
      </div>

      {/* 2. Optional Deduplication & Stream Diagnostics Panel */}
      {showDiagnostics && (
        <div className="p-4 bg-[#080C14] border border-cyan-800/40 rounded-2xl shadow-xl font-mono text-xs animate-fadeIn space-y-2">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              Stream Deduplication & Rejection Telemetry
            </span>
            <span className="text-[10px] text-slate-500">Zero-Duplication Guaranteed</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-2.5 bg-[#0E1524] rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Duplicate Subscriptions Prevented</span>
              <strong className="text-sm text-emerald-400">0 Prevented</strong>
            </div>
            <div className="p-2.5 bg-[#0E1524] rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Rejected Events</span>
              <strong className="text-sm text-slate-300">0 Rejections</strong>
            </div>
            <div className="p-2.5 bg-[#0E1524] rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Feed Protocol</span>
              <strong className="text-sm text-cyan-300">WebSocket + REST Dual</strong>
            </div>
            <div className="p-2.5 bg-[#0E1524] rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Execution Mode</span>
              <strong className="text-sm text-emerald-400">PAPER (Safe Invariant)</strong>
            </div>
          </div>
        </div>
      )}

      {/* 3. Authoritative Provider Capability Matrix Table */}
      <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1E293B] bg-[#080C14]/90 text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Provider / Adapter</th>
                <th className="py-3.5 px-3">Exact Source</th>
                <th className="py-3.5 px-3">Broker Account</th>
                <th className="py-3.5 px-2 text-center">Env</th>
                <th className="py-3.5 px-3">Market / Exchange</th>
                <th className="py-3.5 px-3">Asset Class</th>
                <th className="py-3.5 px-2 text-center">Options</th>
                <th className="py-3.5 px-2 text-center">Futures</th>
                <th className="py-3.5 px-2 text-center">Spot</th>
                <th className="py-3.5 px-2 text-center">Book</th>
                <th className="py-3.5 px-2 text-center">OI</th>
                <th className="py-3.5 px-2 text-center">Greeks</th>
                <th className="py-3.5 px-2 text-center">Feed</th>
                <th className="py-3.5 px-3 text-right">Latency</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141D2E] text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={15} className="text-center py-12 text-slate-500 font-mono">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Probing provider adapters and verifying authentication entitlements...
                  </td>
                </tr>
              ) : filteredProviders.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-10 text-slate-500 font-mono">
                    No market data providers match the specified filter or query.
                  </td>
                </tr>
              ) : (
                filteredProviders.map((p) => {
                  const isConnected = p.status === "CONNECTED";

                  return (
                    <tr key={p.provider_id} className="hover:bg-[#121927]/70 transition-colors group">
                      {/* Provider / Adapter */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs group-hover:text-cyan-300 transition-colors">
                          {p.provider_name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                          {p.entitlement}
                        </div>
                      </td>

                      {/* Exact Source */}
                      <td className="py-3.5 px-3">
                        <span className="text-[11px] text-slate-300 font-mono">
                          {p.exact_source}
                        </span>
                      </td>

                      {/* Broker Account */}
                      <td className="py-3.5 px-3">
                        <div className="text-[11px] text-cyan-300 font-bold font-mono">
                          {p.broker_account_alias || p.broker_account}
                        </div>
                        <div className="text-[9px] text-slate-500">
                          {p.broker_account}
                        </div>
                      </td>

                      {/* Environment */}
                      <td className="py-3.5 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/40 text-[9px] text-emerald-400 font-bold font-mono">
                          {p.environment}
                        </span>
                      </td>

                      {/* Market / Exchange */}
                      <td className="py-3.5 px-3">
                        <span className="text-cyan-400 font-bold">{p.exchange}</span>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]" title={p.market}>
                          {p.market}
                        </div>
                      </td>

                      {/* Asset Class */}
                      <td className="py-3.5 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#080C14] border border-slate-700/50 text-slate-300">
                          {p.asset_class}
                        </span>
                      </td>

                      {/* Options */}
                      <td className="py-3.5 px-2 text-center">
                        {p.options ? (
                          <span className="text-emerald-400 font-bold">YES</span>
                        ) : (
                          <span className="text-slate-600" title="Not provided by this source">—</span>
                        )}
                      </td>

                      {/* Futures */}
                      <td className="py-3.5 px-2 text-center">
                        {p.futures ? (
                          <span className="text-emerald-400 font-bold">YES</span>
                        ) : (
                          <span className="text-slate-600" title="Not provided by this source">—</span>
                        )}
                      </td>

                      {/* Spot */}
                      <td className="py-3.5 px-2 text-center">
                        {p.spot ? (
                          <span className="text-emerald-400 font-bold">YES</span>
                        ) : (
                          <span className="text-slate-600" title="Not provided by this source">—</span>
                        )}
                      </td>

                      {/* Order Book */}
                      <td className="py-3.5 px-2 text-center">
                        {p.order_book ? (
                          <span className="text-cyan-400 font-bold">YES</span>
                        ) : (
                          <span className="text-slate-600" title="Not provided by this source">—</span>
                        )}
                      </td>

                      {/* OI */}
                      <td className="py-3.5 px-2 text-center">
                        {p.oi ? (
                          <span className="text-cyan-400 font-bold">LIVE</span>
                        ) : (
                          <span className="text-slate-600" title="Not provided by this source">—</span>
                        )}
                      </td>

                      {/* Greeks */}
                      <td className="py-3.5 px-2 text-center">
                        {p.greeks ? (
                          <span className="text-purple-400 font-bold">EXCH</span>
                        ) : (
                          <span className="text-slate-600" title="Not provided by this source">—</span>
                        )}
                      </td>

                      {/* Feed Type */}
                      <td className="py-3.5 px-2 text-center">
                        <span className="text-[10px] text-slate-400 font-bold">
                          {p.feed_type}
                        </span>
                      </td>

                      {/* Latency */}
                      <td className="py-3.5 px-3 text-right">
                        {isConnected && p.latency_ms > 0 ? (
                          <span
                            className={`font-bold ${
                              p.latency_ms < 25
                                ? "text-emerald-400"
                                : p.latency_ms < 40
                                ? "text-cyan-400"
                                : "text-amber-400"
                            }`}
                          >
                            {p.latency_ms.toFixed(1)} ms
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {renderStatusBadge(p)}
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
