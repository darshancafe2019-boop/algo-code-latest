"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  Activity,
  Shield,
  Zap,
  Radio,
  RefreshCw,
  Sliders,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Power,
  RotateCw,
  Search,
  Filter,
  Check,
  Server,
  FileText,
} from "lucide-react";
import {
  ProviderStatusItem,
  ProviderCatalogResponse,
  ProviderCategory,
} from "@/types/provider";
import { ProviderConfigModal } from "./ProviderConfigModal";

export function ProviderManagerFullView() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"matrix" | "roles" | "failover">("matrix");
  const [configModalProvider, setConfigModalProvider] = useState<ProviderStatusItem | null>(null);
  const [selectedLogsProvider, setSelectedLogsProvider] = useState<ProviderStatusItem | null>(null);

  const { data: catalog, isLoading, refetch } = useQuery<ProviderCatalogResponse>({
    queryKey: ["providersCatalog"],
    queryFn: async () => {
      const res = await fetch("/api/providers");
      if (!res.ok) return null;
      return await res.json();
    },
    staleTime: 5000,
    refetchInterval: 8000,
    refetchOnWindowFocus: false,
  });

  const selectRoleMutation = useMutation({
    mutationFn: async ({ role, providerId }: { role: string; providerId: string }) => {
      const res = await fetch("/api/providers/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, provider_id: providerId }),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providersCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["providersHealth"] });
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const res = await fetch(`/api/providers/${providerId}/reconnect`, {
        method: "POST",
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providersCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["providersHealth"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const res = await fetch(`/api/providers/${providerId}/disconnect`, {
        method: "POST",
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providersCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["providersHealth"] });
    },
  });

  const providers = catalog?.providers || [];
  const activeRoles = catalog?.active_roles || {
    marketDataProvider: "dhan",
    executionBroker: "dhan",
    optionsProvider: "dhan",
    historicalDataProvider: "dhan",
    secondaryFailoverProvider: "fyers",
  };

  const filteredProviders = providers.filter((p) => {
    if (selectedCategory !== "ALL" && p.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
      const catMatch = p.category.toLowerCase().includes(q);
      const assetMatch = p.assetClasses.some((a) => a.toLowerCase().includes(q));
      const stateMatch = (p.connectionState || "").toLowerCase().includes(q);
      return nameMatch || catMatch || assetMatch || stateMatch;
    }
    return true;
  });

  const getStatusBadge = (state: string) => {
    switch (state) {
      case "LIVE":
      case "CONNECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[11px] font-mono font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            CONNECTED
          </span>
        );
      case "CONNECTING":
      case "RECONNECTING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/80 text-amber-300 text-[11px] font-mono font-bold">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-spin" />
            {state}
          </span>
        );
      case "STALE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/80 text-amber-300 text-[11px] font-mono font-bold">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            STALE
          </span>
        );
      case "AUTH_EXPIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950/80 border border-red-700/80 text-red-300 text-[11px] font-mono font-bold">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            AUTH EXPIRED
          </span>
        );
      case "ERROR":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950/80 border border-red-700/80 text-red-300 text-[11px] font-mono font-bold">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            ERROR
          </span>
        );
      case "NOT_CONFIGURED":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 text-[11px] font-mono">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            NOT CONFIGURED
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-6 text-slate-100 font-sans pb-12">
      {/* Page Title & Stats */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#0F172A] border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-400 shadow-inner">
            <Layers className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black tracking-tight text-white">
                PROVIDER CONTROL PLANE
              </h1>
              <span className="rounded bg-cyan-950 px-2 py-0.5 text-xs font-mono font-bold text-cyan-300 border border-cyan-800">
                v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-broker registry, independent market-data gateways, failover orchestration & execution brokers
            </p>
          </div>
        </div>

        {/* Telemetry Summary Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-500 block text-[10px]">TOTAL PROVIDERS</span>
            <span className="font-mono font-bold text-cyan-400 text-sm">
              {catalog?.total_count || 14}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-500 block text-[10px]">ACTIVE & CONNECTED</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {catalog?.connected_count || 0}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-500 block text-[10px]">MARKET DATA GATEWAY</span>
            <span className="font-mono font-bold text-slate-200 text-sm flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              PORT 5051
            </span>
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Refresh telemetry"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab("matrix")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
            activeTab === "matrix"
              ? "bg-cyan-600 text-white shadow-md shadow-cyan-900/40"
              : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Activity className="h-4 w-4" />
          Provider Health & Matrix
        </button>

        <button
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
            activeTab === "roles"
              ? "bg-cyan-600 text-white shadow-md shadow-cyan-900/40"
              : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Sliders className="h-4 w-4" />
          Role Partitioning (Data vs Exec)
        </button>

        <button
          onClick={() => setActiveTab("failover")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
            activeTab === "failover"
              ? "bg-cyan-600 text-white shadow-md shadow-cyan-900/40"
              : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Shield className="h-4 w-4" />
          Failover & Safety Policy
        </button>
      </div>

      {/* TAB 1: PROVIDER MATRIX */}
      {activeTab === "matrix" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0B111E] p-3.5 rounded-xl border border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search provider, asset class, status..."
                className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
              {["ALL", "INDIAN_BROKERS", "CRYPTO", "GLOBAL_FOREX"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg font-semibold transition shrink-0 ${
                    selectedCategory === cat
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-800/80 text-slate-400 hover:text-white"
                  }`}
                >
                  {cat === "ALL"
                    ? "All Categories"
                    : cat === "INDIAN_BROKERS"
                    ? "🇮🇳 Indian Brokers"
                    : cat === "CRYPTO"
                    ? "⚡ Crypto"
                    : "🌐 Global / Forex"}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix Table */}
          <div className="rounded-2xl bg-[#0F172A] border border-slate-800 overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0A0F1D] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="p-3.5">Provider</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Connection</th>
                  <th className="p-3.5">Capabilities</th>
                  <th className="p-3.5">WebSocket</th>
                  <th className="p-3.5">Latency</th>
                  <th className="p-3.5">Last Tick</th>
                  <th className="p-3.5">Subs</th>
                  <th className="p-3.5">Active Roles</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredProviders.map((provider) => {
                  const health = provider.health || {
                    state: "NOT_CONFIGURED",
                    pingMs: 0,
                    lastTickMsAgo: null,
                    subscriptionsCount: 0,
                    maxSubscriptions: 5000,
                    websocketConnected: false,
                    lastError: null,
                  };

                  const isMarketData = activeRoles.marketDataProvider === provider.id;
                  const isExecution = activeRoles.executionBroker === provider.id;
                  const isSecondary = activeRoles.secondaryFailoverProvider === provider.id;

                  return (
                    <tr
                      key={provider.id}
                      className="hover:bg-slate-900/60 transition group"
                    >
                      {/* Provider Info */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{provider.logo}</span>
                          <div>
                            <div className="font-bold text-white text-xs">{provider.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {provider.markets.join(", ")}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-cyan-300">
                          {provider.category.replace("_", " ")}
                        </span>
                      </td>

                      {/* Connection State */}
                      <td className="p-3.5">{getStatusBadge(provider.connectionState)}</td>

                      {/* Capabilities */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
                          {provider.capabilities?.marketData && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-[10px] font-mono">
                              Data
                            </span>
                          )}
                          {provider.capabilities?.orderExecution && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-mono">
                              Exec
                            </span>
                          )}
                          {provider.capabilities?.optionChain && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-800 text-purple-300 text-[10px] font-mono">
                              Options
                            </span>
                          )}
                          {provider.capabilities?.futures && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-800 text-amber-300 text-[10px] font-mono">
                              Futures
                            </span>
                          )}
                          {provider.capabilities?.crypto && (
                            <span className="px-1.5 py-0.2 rounded bg-yellow-950/80 border border-yellow-800 text-yellow-300 text-[10px] font-mono">
                              Crypto
                            </span>
                          )}
                          {provider.capabilities?.forex && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-950/80 border border-blue-800 text-blue-300 text-[10px] font-mono">
                              Forex
                            </span>
                          )}
                        </div>
                      </td>

                      {/* WebSocket */}
                      <td className="p-3.5">
                        {health.websocketConnected ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Connected
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">Inactive</span>
                        )}
                      </td>

                      {/* Latency */}
                      <td className="p-3.5 font-mono text-slate-300 text-[11px]">
                        {health.pingMs > 0 ? `${health.pingMs}ms` : "—"}
                      </td>

                      {/* Last Tick */}
                      <td className="p-3.5 font-mono text-slate-300 text-[11px]">
                        {health.lastTickMsAgo !== null ? `${health.lastTickMsAgo}ms ago` : "—"}
                      </td>

                      {/* Subscriptions */}
                      <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                        {health.subscriptionsCount}/{health.maxSubscriptions}
                      </td>

                      {/* Active Roles */}
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1">
                          {isMarketData && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-600/90 text-white font-mono text-[10px] font-bold text-center">
                              ★ Live Data
                            </span>
                          )}
                          {isExecution && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-600/90 text-white font-mono text-[10px] font-bold text-center">
                              ★ Live Exec
                            </span>
                          )}
                          {isSecondary && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-600/90 text-white font-mono text-[10px] font-bold text-center">
                              ⚡ Failover
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setConfigModalProvider(provider)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition"
                            title="Configure credentials and test connection"
                          >
                            Configure
                          </button>

                          {provider.connectionState === "CONNECTED" ? (
                            <button
                              onClick={() => disconnectMutation.mutate(provider.id)}
                              disabled={disconnectMutation.isPending}
                              className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-[11px] font-semibold transition"
                            >
                              Disconnect
                            </button>
                          ) : (
                            <button
                              onClick={() => reconnectMutation.mutate(provider.id)}
                              disabled={reconnectMutation.isPending}
                              className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[11px] font-semibold transition"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ROLE PARTITIONING (DATA VS EXECUTION SEPARATION) */}
      {activeTab === "roles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Market Data Role */}
          <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
                  <Radio className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Market Data Provider</h3>
                  <p className="text-xs text-slate-400">Feeds normalized ticks to Market Gateway</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400">
                Active: {activeRoles.marketDataProvider.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2">
              {providers
                .filter((p) => p.capabilities?.marketData)
                .map((p) => {
                  const isSelected = activeRoles.marketDataProvider === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() =>
                        selectRoleMutation.mutate({
                          role: "market_data_provider",
                          providerId: p.id,
                        })
                      }
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? "bg-cyan-950/40 border-cyan-500 text-white shadow-sm"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{p.logo}</span>
                        <div>
                          <div className="font-bold text-xs">{p.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {p.category.replace("_", " ")} • {p.markets.join(", ")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(p.connectionState)}
                        {isSelected && <Check className="h-4 w-4 text-cyan-400" />}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Execution Broker Role */}
          <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Execution Broker</h3>
                  <p className="text-xs text-slate-400">Processes order dispatch & risk routing</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Active: {activeRoles.executionBroker.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2">
              {providers
                .filter((p) => p.capabilities?.orderExecution)
                .map((p) => {
                  const isSelected = activeRoles.executionBroker === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() =>
                        selectRoleMutation.mutate({
                          role: "execution_broker",
                          providerId: p.id,
                        })
                      }
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? "bg-emerald-950/40 border-emerald-500 text-white shadow-sm"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{p.logo}</span>
                        <div>
                          <div className="font-bold text-xs">{p.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {p.category.replace("_", " ")} • {p.markets.join(", ")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(p.connectionState)}
                        {isSelected && <Check className="h-4 w-4 text-emerald-400" />}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FAILOVER & SAFETY POLICY */}
      {activeTab === "failover" && (
        <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-6 space-y-6">
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-400" />
                Automatic Fail-Safe & Provider Fallback
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure primary-secondary data provider pairing and risk shutdown triggers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Provider Selector */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                1. Primary Data Provider
              </label>
              <select
                value={activeRoles.marketDataProvider}
                onChange={(e) =>
                  selectRoleMutation.mutate({
                    role: "market_data_provider",
                    providerId: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none font-sans"
              >
                {providers
                  .filter((p) => p.capabilities?.marketData)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category.replace("_", " ")})
                    </option>
                  ))}
              </select>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Preferred feed for tick streams and live price evaluation.
              </p>
            </div>

            {/* Secondary Failover Provider Selector */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                2. Secondary Fallback Provider
              </label>
              <select
                value={activeRoles.secondaryFailoverProvider}
                onChange={(e) =>
                  selectRoleMutation.mutate({
                    role: "secondary_failover_provider",
                    providerId: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none font-sans"
              >
                {providers
                  .filter((p) => p.capabilities?.marketData)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category.replace("_", " ")})
                    </option>
                  ))}
              </select>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Standby provider prompted when primary encounters auth expiry or disconnection.
              </p>
            </div>
          </div>

          {/* Safety Rules Manifesto */}
          <div className="rounded-xl bg-amber-950/20 border border-amber-800/40 p-4 space-y-2">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Quant.OS Fail-Safe Guarantees
            </h4>
            <ul className="text-xs text-amber-200/80 space-y-1.5 list-disc list-inside">
              <li>No price fabrication: if provider is STALE/DISCONNECTED, ticks are halted.</li>
              <li>Execution brokers are NEVER silently changed without operator authorization.</li>
              <li>Risk Engine halts automated decision locks if market data latency exceeds 5000ms.</li>
              <li>Credentials remain server-side and encrypted; never exposed to browser context.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {configModalProvider && (
        <ProviderConfigModal
          provider={configModalProvider}
          isOpen={!!configModalProvider}
          onClose={() => setConfigModalProvider(null)}
        />
      )}
    </div>
  );
}
