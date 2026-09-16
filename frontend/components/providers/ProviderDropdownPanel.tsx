"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Radio,
  Settings,
  Zap,
  Sliders,
  ExternalLink,
  Shield,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Plus,
  Loader2,
  X,
} from "lucide-react";
import { ProviderStatusItem, ProviderCategory, ProviderCatalogResponse } from "@/types/provider";
import { ProviderConfigModal } from "./ProviderConfigModal";

interface ProviderDropdownPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProviderDropdownPanel({ isOpen, onClose }: ProviderDropdownPanelProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [configModalProvider, setConfigModalProvider] = useState<ProviderStatusItem | null>(null);

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

  const filteredProviders = useMemo(() => {
    if (!catalog?.providers) return [];
    let list = catalog.providers;

    if (selectedCategory !== "ALL") {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
        const catMatch = p.category.toLowerCase().replace("_", " ").includes(q);
        const assetMatch = p.assetClasses.some((a) => a.toLowerCase().includes(q));
        const marketMatch = p.markets.some((m) => m.toLowerCase().includes(q));
        const stateMatch = (p.connectionState || "").toLowerCase().includes(q);

        // Capability search
        const caps = p.capabilities || {};
        let capMatch = false;
        if (q.includes("option") && caps.optionChain) capMatch = true;
        if (q.includes("crypto") && caps.crypto) capMatch = true;
        if (q.includes("forex") && caps.forex) capMatch = true;
        if (q.includes("future") && caps.futures) capMatch = true;
        if ((q.includes("market data") || q.includes("live") || q.includes("feed")) && caps.marketData) capMatch = true;
        if ((q.includes("broker") || q.includes("exec")) && caps.orderExecution) capMatch = true;

        return nameMatch || catMatch || assetMatch || marketMatch || stateMatch || capMatch;
      });
    }

    return list;
  }, [catalog, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const activeRoles = catalog?.active_roles || {
    marketDataProvider: "dhan",
    executionBroker: "dhan",
    optionsProvider: "dhan",
    historicalDataProvider: "dhan",
    secondaryFailoverProvider: "fyers",
  };

  const getStatusBadge = (state: string) => {
    switch (state) {
      case "LIVE":
      case "CONNECTED":
        return {
          bg: "bg-emerald-950/80 border-emerald-800 text-emerald-300",
          dot: "bg-emerald-400 animate-pulse",
          label: "Connected",
        };
      case "CONNECTING":
      case "RECONNECTING":
        return {
          bg: "bg-amber-950/80 border-amber-800 text-amber-300",
          dot: "bg-amber-400 animate-spin",
          label: state === "RECONNECTING" ? "Reconnecting" : "Connecting",
        };
      case "STALE":
        return {
          bg: "bg-amber-950/80 border-amber-800 text-amber-300",
          dot: "bg-amber-400",
          label: "Stale Feed",
        };
      case "AUTH_EXPIRED":
        return {
          bg: "bg-red-950/80 border-red-800 text-red-300",
          dot: "bg-red-400",
          label: "Auth Expired",
        };
      case "ERROR":
        return {
          bg: "bg-red-950/80 border-red-800 text-red-300",
          dot: "bg-red-400",
          label: "Error",
        };
      case "NOT_CONFIGURED":
      default:
        return {
          bg: "bg-slate-900 border-slate-700 text-slate-400",
          dot: "bg-slate-500",
          label: "Not Connected",
        };
    }
  };

  const groupedCategories: { key: ProviderCategory; label: string; icon: string }[] = [
    { key: "INDIAN_BROKERS", label: "Indian Brokers", icon: "🇮🇳" },
    { key: "CRYPTO", label: "Crypto Exchanges", icon: "⚡" },
    { key: "GLOBAL_FOREX", label: "Global / Forex", icon: "🌐" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      <div className="fixed top-14 right-4 sm:right-16 z-50 w-full max-w-xl rounded-2xl bg-[#0C1322] border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-200">
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-800/80 bg-[#0F172A]/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-400">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                PROVIDER CONTROL PLANE
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {catalog?.connected_count || 0}/{catalog?.total_count || 14} Online
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Independent Market Data & Execution Broker Matrix
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => refetch()}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Refresh provider telemetry"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search Bar & Category Tabs */}
        <div className="p-3 bg-[#0B111E] border-b border-slate-800/60 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search providers, 'options', 'crypto', 'forex', 'broker'..."
              className="w-full rounded-xl bg-slate-900/90 border border-slate-700/80 pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition shrink-0 ${
                selectedCategory === "ALL"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "bg-slate-800/60 text-slate-400 hover:text-white"
              }`}
            >
              All ({catalog?.total_count || 14})
            </button>
            {groupedCategories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition shrink-0 flex items-center gap-1.5 ${
                  selectedCategory === cat.key
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "bg-slate-800/60 text-slate-400 hover:text-white"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Providers List (Grouped) */}
        <div className="max-h-[380px] overflow-y-auto p-3 space-y-4 divide-y divide-slate-800/40">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              <span className="text-xs">Loading provider states...</span>
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              No matching providers found for &quot;{searchQuery}&quot;.
            </div>
          ) : (
            groupedCategories
              .filter((c) => selectedCategory === "ALL" || selectedCategory === c.key)
              .map((category) => {
                const providersInCategory = filteredProviders.filter(
                  (p) => p.category === category.key
                );
                if (providersInCategory.length === 0) return null;

                return (
                  <div key={category.key} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 tracking-wider uppercase px-1">
                      <span className="flex items-center gap-1.5">
                        <span>{category.icon}</span>
                        <span>{category.label}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {providersInCategory.filter((p) => p.connectionState === "CONNECTED").length}/
                        {providersInCategory.length} active
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {providersInCategory.map((provider) => {
                        const status = getStatusBadge(provider.connectionState || "DISCONNECTED");
                        const isMarketData = activeRoles.marketDataProvider === provider.id;
                        const isExecution = activeRoles.executionBroker === provider.id;
                        const isOptions = activeRoles.optionsProvider === provider.id;

                        return (
                          <div
                            key={provider.id}
                            className="group rounded-xl bg-[#111928] hover:bg-[#162235] border border-slate-800 hover:border-slate-700 p-2.5 transition flex flex-col gap-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              {/* Left: Logo & Info */}
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-lg shrink-0">{provider.logo}</span>
                                <div className="truncate">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-white truncate">
                                      {provider.name}
                                    </span>
                                    {/* Connection Badge */}
                                    <span
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded border text-[10px] font-mono font-semibold ${status.bg}`}
                                    >
                                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                                      {status.label}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
                                    <span>{provider.markets.join(" / ")}</span>
                                    <span>•</span>
                                    <span className="text-slate-500">
                                      {provider.assetClasses.join(" / ")}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Actions */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => setConfigModalProvider(provider)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold transition flex items-center gap-1"
                                >
                                  <Settings className="h-3 w-3 text-slate-400" />
                                  {provider.configured ? "Manage" : "Connect"}
                                </button>
                              </div>
                            </div>

                            {/* Capabilities & Active Role Toggles */}
                            <div className="flex items-center justify-between text-[10px] border-t border-slate-800/60 pt-2 text-slate-400">
                              {/* Capability Badges */}
                              <div className="flex items-center gap-1 flex-wrap">
                                {provider.capabilities?.marketData && (
                                  <span className="px-1.5 py-0.2 rounded bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 font-mono">
                                    Data
                                  </span>
                                )}
                                {provider.capabilities?.orderExecution && (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 font-mono">
                                    Exec
                                  </span>
                                )}
                                {provider.capabilities?.optionChain && (
                                  <span className="px-1.5 py-0.2 rounded bg-purple-950/70 border border-purple-800/60 text-purple-300 font-mono">
                                    Options
                                  </span>
                                )}
                                {provider.capabilities?.futures && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-950/70 border border-amber-800/60 text-amber-300 font-mono">
                                    Futures
                                  </span>
                                )}
                                {provider.capabilities?.crypto && (
                                  <span className="px-1.5 py-0.2 rounded bg-yellow-950/70 border border-yellow-800/60 text-yellow-300 font-mono">
                                    Crypto
                                  </span>
                                )}
                              </div>

                              {/* Assign Roles Buttons */}
                              <div className="flex items-center gap-1.5">
                                {provider.capabilities?.marketData && (
                                  <button
                                    onClick={() =>
                                      selectRoleMutation.mutate({
                                        role: "market_data_provider",
                                        providerId: provider.id,
                                      })
                                    }
                                    title="Set as active Market Data Provider"
                                    className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] transition ${
                                      isMarketData
                                        ? "bg-cyan-600 text-white shadow-sm"
                                        : "bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                                    }`}
                                  >
                                    {isMarketData ? "★ Live Data" : "Set Data"}
                                  </button>
                                )}

                                {provider.capabilities?.orderExecution && (
                                  <button
                                    onClick={() =>
                                      selectRoleMutation.mutate({
                                        role: "execution_broker",
                                        providerId: provider.id,
                                      })
                                    }
                                    title="Set as active Order Execution Broker"
                                    className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] transition ${
                                      isExecution
                                        ? "bg-emerald-600 text-white shadow-sm"
                                        : "bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                                    }`}
                                  >
                                    {isExecution ? "★ Live Exec" : "Set Exec"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0F172A] border-t border-slate-800 flex items-center justify-between text-xs">
          <Link
            href="/settings/providers"
            onClick={onClose}
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold transition"
          >
            <Sliders className="h-3.5 w-3.5" />
            Open Full Provider Manager (/settings/providers)
          </Link>
          <button
            onClick={() => {
              if (filteredProviders.length > 0) {
                setConfigModalProvider(filteredProviders[0]);
              }
            }}
            className="flex items-center gap-1 text-slate-400 hover:text-white font-medium transition"
          >
            <Plus className="h-3.5 w-3.5 text-cyan-400" />
            Add Custom Provider
          </button>
        </div>
      </div>

      {/* Config Modal */}
      {configModalProvider && (
        <ProviderConfigModal
          provider={configModalProvider}
          isOpen={!!configModalProvider}
          onClose={() => setConfigModalProvider(null)}
        />
      )}
    </>
  );
}
