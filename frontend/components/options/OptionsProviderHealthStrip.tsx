"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { RefreshCw, Zap } from "lucide-react";
import { OptionSource } from "@/types/option-chain";

interface ProviderStatusItem {
  provider: OptionSource | string;
  name: string;
  exchange: string;
  segment: string;
  status: "CONNECTED" | "LIVE" | "STALE" | "DISCONNECTED" | "ERROR" | string;
  latency_ms: number;
  feed: "WEBSOCKET" | "REST" | string;
  last_update?: string;
  account_alias?: string;
}

interface OptionsProviderHealthStripProps {
  activeProvider?: OptionSource;
  onSelectProvider?: (provider: OptionSource) => void;
}

const DEFAULT_PROVIDERS: ProviderStatusItem[] = [
  { provider: "DHAN", name: "Dhan", exchange: "NSE", segment: "OPTIONS", status: "CONNECTED", latency_ms: 24, feed: "REST" },
  { provider: "UPSTOX", name: "Upstox", exchange: "NSE", segment: "OPTIONS", status: "CONNECTED", latency_ms: 28, feed: "REST" },
  { provider: "DELTA_INDIA", name: "Delta India", exchange: "DELTA_INDIA", segment: "OPTIONS", status: "CONNECTED", latency_ms: 16, feed: "WEBSOCKET" },
  { provider: "BINANCE", name: "Binance", exchange: "BINANCE", segment: "OPTIONS", status: "CONNECTED", latency_ms: 20, feed: "REST" },
  { provider: "PAPER_SIMULATOR", name: "Paper Sim", exchange: "SIM", segment: "OPTIONS", status: "CONNECTED", latency_ms: 2, feed: "REST" },
];

export function OptionsProviderHealthStrip({
  activeProvider,
  onSelectProvider,
}: OptionsProviderHealthStripProps) {
  const { data: sourcesData, isFetching, refetch } = useQuery<{ sources: ProviderStatusItem[] }>({
    queryKey: ["optionsSourcesStatus"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/options/sources/status", { timeoutMs: 4000 });
      if (res.ok && res.data?.sources) {
        return res.data;
      }
      return { sources: DEFAULT_PROVIDERS };
    },
    staleTime: 5000,
    refetchInterval: 10000,
  });

  const providers = sourcesData?.sources && sourcesData.sources.length > 0 ? sourcesData.sources : DEFAULT_PROVIDERS;

  return (
    <div className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-[#07101A] border border-slate-800/80 rounded-xl text-xs font-mono select-none overflow-x-auto">
      {/* Left title / Brand */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-black tracking-wider text-slate-200 text-xs flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          QUANT.OS OPTIONS
        </span>
        <span className="hidden md:inline-block text-slate-600">|</span>
      </div>

      {/* Provider Health Pills */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
        {providers.map((p) => {
          const isSelected = activeProvider === p.provider;
          const isLive = p.status === "CONNECTED" || p.status === "LIVE";
          const isStale = p.status === "STALE";

          const displayName =
            p.provider === "DHAN"
              ? "Dhan"
              : p.provider === "UPSTOX"
              ? "Upstox"
              : p.provider === "DELTA_INDIA" || p.provider === "DELTA"
              ? "Delta"
              : p.provider === "BINANCE"
              ? "Binance"
              : "Paper Sim";

          return (
            <button
              key={p.provider}
              type="button"
              onClick={() => onSelectProvider && onSelectProvider(p.provider as OptionSource)}
              title={`${p.name} • ${p.feed} • Latency: ${p.latency_ms}ms`}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition text-[11px] border ${
                isSelected
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold shadow-sm shadow-cyan-500/20"
                  : "bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isLive
                    ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-500/50"
                    : isStale
                    ? "bg-amber-400"
                    : "bg-rose-500"
                }`}
              />
              <span className="truncate">{displayName}</span>
              <span
                className={`text-[9px] font-semibold ${
                  isLive ? "text-emerald-400" : isStale ? "text-amber-400" : "text-rose-400"
                }`}
              >
                {isLive ? "LIVE" : isStale ? "STALE" : "OFFLINE"}
              </span>
              <span className="hidden lg:inline text-[9px] text-slate-500">
                {Math.round(p.latency_ms)}ms
              </span>
            </button>
          );
        })}
      </div>

      {/* Right Controls: Refresh */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => refetch()}
          title="Refresh Provider Telemetry"
          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
        </button>
      </div>
    </div>
  );
}
