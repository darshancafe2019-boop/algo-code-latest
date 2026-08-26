"use client";

import React from "react";
import {
  Zap,
  ShieldCheck,
  RefreshCw,
  Maximize2,
  Minimize2,
  Lock,
  Globe,
  Sliders,
  Layers,
  Sparkles,
} from "lucide-react";
import { CanonicalFuturesContract, DataQualityStatus } from "@/types/futures-terminal";
import { useUIStore } from "@/lib/store/useUIStore";

interface Props {
  selectedContract: CanonicalFuturesContract | null;
  connectionStatus: DataQualityStatus;
  executionMode: "PAPER" | "LIVE";
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenDetails: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function FuturesTerminalHeader({
  selectedContract,
  connectionStatus,
  executionMode,
  isRefreshing,
  onRefresh,
  onOpenDetails,
  isFullscreen,
  onToggleFullscreen,
}: Props) {
  const { interfaceMode, toggleInterfaceMode } = useUIStore();

  const lastPrice = selectedContract?.last_price || 65000;
  const change24h = selectedContract?.change_24h || 0;
  const isPositiveChange = change24h >= 0;
  const fundingRate = selectedContract?.funding_rate_pct || 0.006;
  const isPositiveFunding = fundingRate >= 0;
  const oiUsd = selectedContract?.open_interest_usd || 8360000000;

  // Format OI cleanly (e.g. $8.36B or $120.5M)
  const formatOI = (val: number) => {
    if (val >= 1_000_000_000) {
      return `$${(val / 1_000_000_000).toFixed(2)}B`;
    }
    return `$${(val / 1_000_000).toFixed(2)}M`;
  };

  return (
    <header className="bg-[#0B101B] border border-slate-800 rounded-xl p-3.5 shadow-xl flex flex-wrap items-center justify-between gap-4 select-none font-mono">
      {/* 1. Left: Header Title & Active Contract Pill */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-white uppercase flex items-center gap-1.5 font-mono">
              FUTURES
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-bold text-blue-400">
                {selectedContract?.display_symbol || "BTCUSDT"}
              </span>
              <span className="text-[11px] text-slate-500">•</span>
              <span className="text-[11px] text-slate-300">
                {selectedContract?.exchange || "Binance"}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300 font-semibold">
                {selectedContract?.is_perpetual ? "Perpetual" : selectedContract?.expiry || "Dated"}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Fast Header Metrics Strip */}
        <div className="flex items-center gap-4 bg-[#131B2A] px-3.5 py-1.5 rounded-xl border border-slate-800/80 text-xs">
          {/* Price */}
          <div>
            <span className="text-[9px] text-slate-400 block uppercase">Price</span>
            <span className="text-xs font-bold text-white tracking-wide">
              ${lastPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* 24H Change */}
          <div className="border-l border-slate-800 pl-3">
            <span className="text-[9px] text-slate-400 block uppercase">24H</span>
            <span className={`text-xs font-bold ${isPositiveChange ? "text-emerald-400" : "text-rose-400"}`}>
              {isPositiveChange ? `+${change24h.toFixed(2)}%` : `${change24h.toFixed(2)}%`}
            </span>
          </div>

          {/* Funding */}
          <div className="border-l border-slate-800 pl-3">
            <span className="text-[9px] text-slate-400 block uppercase">Funding</span>
            <span className={`text-xs font-bold ${isPositiveFunding ? "text-emerald-400" : "text-rose-400"}`}>
              {isPositiveFunding ? `+${fundingRate.toFixed(4)}%` : `${fundingRate.toFixed(4)}%`}
            </span>
          </div>

          {/* OI */}
          <div className="border-l border-slate-800 pl-3 hidden sm:block">
            <span className="text-[9px] text-slate-400 block uppercase">OI</span>
            <span className="text-xs font-bold text-slate-200">
              {formatOI(oiUsd)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Right: Status Pills & Action Buttons */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Status: LIVE / DELAYED / STALE */}
        <div className="flex items-center gap-1.5 bg-[#131B2A] px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === "LIVE"
                ? "bg-emerald-400 animate-pulse"
                : connectionStatus === "STALE"
                ? "bg-amber-400"
                : "bg-rose-400"
            }`}
          />
          <span className="text-[10px] font-bold text-slate-300">
            {connectionStatus || "LIVE"}
          </span>
        </div>

        {/* Status: RISK SAFE */}
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-emerald-300 text-xs">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold">RISK SAFE</span>
        </div>

        {/* Status: PAPER / LIVE Tag */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold uppercase tracking-wider ${
            executionMode === "LIVE"
              ? "bg-rose-950/40 border-rose-500/40 text-rose-300 animate-pulse"
              : "bg-cyan-950/40 border-cyan-500/40 text-cyan-300"
          }`}
        >
          <Lock className="w-3 h-3" />
          <span className="text-[10px]">{executionMode}</span>
        </div>

        {/* Mode Toggle: SIMPLE vs ADVANCED */}
        <button
          onClick={toggleInterfaceMode}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
            interfaceMode === "ADVANCED"
              ? "bg-purple-950/60 border-purple-500/40 text-purple-300 shadow-sm shadow-purple-950/40"
              : "bg-[#131B2A] hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
          title="Toggle Simple / Advanced Interface Mode"
        >
          <Sliders className="w-3 h-3" />
          <span>{interfaceMode === "ADVANCED" ? "ADVANCED" : "SIMPLE"}</span>
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#131B2A] hover:bg-slate-800 text-slate-300 transition-colors border border-slate-800 text-xs font-semibold"
          title="Refresh Market Data"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-400" : ""}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        {/* Details Button (Opens Contract Drawer) */}
        <button
          onClick={onOpenDetails}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 hover:text-blue-300 transition-colors text-xs font-bold"
          title="Open Contract Details & Derivatives Analytics"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Details</span>
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-lg bg-[#131B2A] hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors border border-slate-800"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </header>
  );
}
