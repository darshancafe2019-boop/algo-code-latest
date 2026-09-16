"use client";

import React from "react";
import {
  Zap,
  Radio,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  ChevronDown,
} from "lucide-react";
import {
  CryptoComplexityMode,
  CryptoProviderId,
} from "./useSharedCryptoState";
import { cn } from "@/lib/utils";

interface CryptoHeaderProps {
  selectedUnderlying: string;
  onSelectUnderlying: (u: string) => void;
  selectedProvider: CryptoProviderId;
  onSelectProvider: (p: CryptoProviderId) => void;
  complexityMode: CryptoComplexityMode;
  onToggleComplexity: () => void;
  connectionStatus: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenDiagnostics: () => void;
}

export const CryptoHeader: React.FC<CryptoHeaderProps> = ({
  selectedUnderlying,
  onSelectUnderlying,
  selectedProvider,
  onSelectProvider,
  complexityMode,
  onToggleComplexity,
  connectionStatus,
  onRefresh,
  isRefreshing,
  onOpenDiagnostics,
}) => {
  const underlyings = ["BTC", "ETH", "SOL", "BNB", "XRP"];
  const providers: CryptoProviderId[] = ["ALL", "DELTA", "BINANCE", "DERIBIT"];
  const isLive = connectionStatus === "LIVE";

  return (
    <div className="w-full bg-[#050e1d] border border-[#12365a] rounded-2xl px-4 py-3.5 shadow-xl select-none backdrop-blur flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
      {/* 1. Left: Title & Asset Pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 text-slate-950 font-black">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-white tracking-tight">
              CRYPTO DERIVATIVES
            </span>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-800 hidden sm:block" />

        {/* Quick Asset Selectors */}
        <div className="flex items-center gap-1 bg-[#07192f] p-0.5 rounded-xl border border-[#143e69]">
          {underlyings.map((u) => (
            <button
              key={u}
              onClick={() => onSelectUnderlying(u)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                selectedUnderlying === u
                  ? "bg-[#00D4FF] text-slate-950 shadow-md shadow-[#00D4FF]/20"
                  : "text-slate-300 hover:text-white hover:bg-[#0c284a]"
              )}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Center: Truthful Provider Telemetry & 24/7 Market */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
        {/* Provider Switcher */}
        <div className="flex items-center gap-1 bg-[#07192f] px-2 py-1 rounded-lg border border-[#143e69]">
          <span className="text-slate-400 font-sans">PROVIDER:</span>
          <select
            value={selectedProvider}
            onChange={(e) => onSelectProvider(e.target.value as CryptoProviderId)}
            className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer"
          >
            {providers.map((p) => (
              <option key={p} value={p} className="bg-[#050e1d] text-slate-200">
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Feed Status Pill */}
        <button
          onClick={onOpenDiagnostics}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer",
            isLive
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:border-emerald-400"
              : "bg-rose-950/40 border-rose-600/50 text-rose-300"
          )}
          title="Click to view Provider Diagnostics"
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isLive ? "bg-emerald-400 animate-pulse" : "bg-rose-400 animate-ping"
            )}
          />
          <span>FEED: {isLive ? "CONNECTED" : connectionStatus}</span>
        </button>

        {/* Market 24/7 Pill */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#07192f] border border-[#143e69] text-slate-300">
          <Clock className="h-3 w-3 text-[#00D4FF]" />
          <span>MARKET: 24/7</span>
        </div>

        {/* Mode: Paper */}
        <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold">
          MODE: PAPER
        </span>
      </div>

      {/* 3. Right: Simple/Advanced, Refresh & Settings */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-[#040f1f] p-0.5 rounded-lg border border-[#103050] text-xs font-mono">
          <button
            onClick={onToggleComplexity}
            className={cn(
              "px-2.5 py-1 rounded font-bold transition-all cursor-pointer",
              complexityMode === "SIMPLE"
                ? "bg-cyan-500/20 text-[#00D4FF] border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            SIMPLE
          </button>
          <button
            onClick={onToggleComplexity}
            className={cn(
              "px-2.5 py-1 rounded font-bold transition-all cursor-pointer",
              complexityMode === "ADVANCED"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            ADVANCED
          </button>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg bg-[#07192f] hover:bg-[#0c284a] text-slate-300 hover:text-white border border-[#143e69] transition-all cursor-pointer"
          title="Refresh All Quotes"
        >
          <RefreshCw className={cn("h-4 w-4 text-[#00D4FF]", isRefreshing && "animate-spin")} />
        </button>

        <button
          onClick={onOpenDiagnostics}
          className="p-1.5 rounded-lg bg-[#07192f] hover:bg-[#0c284a] text-slate-300 hover:text-white border border-[#143e69] transition-all cursor-pointer"
          title="Provider Diagnostics"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
