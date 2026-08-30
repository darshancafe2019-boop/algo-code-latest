"use client";

import React from "react";
import { Layers, Activity, Server, Clock, RefreshCw } from "lucide-react";

interface StocksHeaderProps {
  totalCount: number;
  liveCount?: number;
  providerCount?: number;
  lastUpdated?: string | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const StocksHeader: React.FC<StocksHeaderProps> = ({
  totalCount,
  liveCount = 0,
  providerCount = 3,
  lastUpdated,
  isLoading = false,
  onRefresh,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-md relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Tagline */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">STOCKS UNIVERSE</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  PURE EQUITIES
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Institutional Screener &amp; Real-Time Multi-Exchange Analytics (NSE, BSE, NASDAQ, NYSE)
              </p>
            </div>
          </div>
        </div>

        {/* Live KPI Badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <div className="text-[11px]">
              <span className="text-slate-500 block text-[9px] uppercase font-mono">Discovered</span>
              <span className="text-white font-bold font-mono">{totalCount.toLocaleString()} Stocks</span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <div className="text-[11px]">
              <span className="text-slate-500 block text-[9px] uppercase font-mono">Sources</span>
              <span className="text-slate-200 font-bold font-mono">{providerCount} Providers</span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <div className="text-[11px]">
              <span className="text-slate-500 block text-[9px] uppercase font-mono">Latency</span>
              <span className="text-emerald-400 font-bold font-mono">Real-Time</span>
            </div>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition disabled:opacity-50"
              title="Refresh Quotes"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
