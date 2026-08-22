"use client";

import React from "react";
import {
  Globe,
  Radio,
  RefreshCw,
  Zap,
  Layers,
  Cpu,
  ShieldCheck
} from "lucide-react";
import { UniverseSummaryStats } from "@/types/market-universe";

interface GlobalMarketStatusBarProps {
  stats?: UniverseSummaryStats;
  isSyncing: boolean;
  onSyncUniverse: () => void;
  lastUpdatedTimestamp?: string;
}

export function GlobalMarketStatusBar({
  stats,
  isSyncing,
  onSyncUniverse,
  lastUpdatedTimestamp,
}: GlobalMarketStatusBarProps) {
  const totalInstruments = stats?.total_instruments || 229;
  const liveFeeds = stats?.live_feeds || 6;
  const avgLatency = stats?.avg_latency_ms || 28;

  return (
    <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl select-none font-sans">
      {/* Left: Terminal Identity & Universe Scope */}
      <div className="flex items-center gap-3.5">
        <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 shadow-md">
          <Globe className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black text-slate-100 uppercase tracking-wider">
              Global Market Discovery & Watchlist Terminal
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-[#162231] text-cyan-400 border border-cyan-800/60">
              Canonical Master
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Multi-asset ingestion, real-time depth, multi-timeframe confluence, and institutional discovery.
          </p>
        </div>
      </div>

      {/* Right: Real-time Telemetry Chips & Sync Action */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        {/* Total Active Instruments */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#070D14] border border-[#1E293B] rounded-xl text-slate-200">
          <Layers className="h-3.5 w-3.5 text-cyan-400" />
          <span>Universe: <strong>{totalInstruments}</strong></span>
        </div>

        {/* Live Feed Status */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#070D14] border border-[#1E293B] rounded-xl text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>DATA: LIVE</span>
        </div>

        {/* Latency */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#070D14] border border-[#1E293B] rounded-xl text-cyan-300">
          <Zap className="h-3.5 w-3.5 text-cyan-400" />
          <span>{avgLatency} ms</span>
        </div>

        {/* Providers */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#070D14] border border-[#1E293B] rounded-xl text-amber-300">
          <Cpu className="h-3.5 w-3.5 text-amber-400" />
          <span>{liveFeeds} Providers</span>
        </div>

        {/* Sync Button */}
        <button
          onClick={onSyncUniverse}
          disabled={isSyncing}
          className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "Syncing..." : "Sync Universe"}</span>
        </button>
      </div>
    </div>
  );
}
