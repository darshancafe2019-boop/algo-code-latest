"use client";

import React from "react";
import {
  TrendingUp,
  Activity,
  Radio,
  RefreshCw,
  Filter,
  ShieldCheck,
  Zap,
  Calendar,
  Layers,
} from "lucide-react";

interface LivePnLCommandHeaderProps {
  timeframe: string;
  onChangeTimeframe: (tf: string) => void;
  botFilter: string;
  onChangeBotFilter: (bot: string) => void;
  strategyFilter: string;
  onChangeStrategyFilter: (st: string) => void;
  brokerStatus?: string;
  dataStatus?: string;
  latencyMs?: number;
  isFetching?: boolean;
  onRefresh?: () => void;
}

export function LivePnLCommandHeader({
  timeframe,
  onChangeTimeframe,
  botFilter,
  onChangeBotFilter,
  strategyFilter,
  onChangeStrategyFilter,
  brokerStatus = "CONNECTED",
  dataStatus = "LIVE",
  latencyMs = 28,
  isFetching,
  onRefresh,
}: LivePnLCommandHeaderProps) {
  const timeframes = ["1D", "7D", "30D", "3M", "6M", "1Y", "ALL"];

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Top Bar: Title & Live Telemetry Strip */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                LIVE P&L & PORTFOLIO PERFORMANCE CENTER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                AUDITED LEDGER
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Authoritative financial accounting, high-water mark equity tracking, and risk-adjusted analytics
            </p>
          </div>
        </div>

        {/* Telemetry Status Bar */}
        <div className="flex items-center gap-4 bg-[#141E33] border border-[#1E293B] rounded-xl p-2.5 px-4 text-xs font-mono">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Account Link</div>
            <div className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {brokerStatus}
            </div>
          </div>

          <div className="border-l border-slate-700 pl-3 hidden sm:block">
            <div className="text-[10px] text-slate-400 uppercase">P&L Engine</div>
            <div className="text-cyan-400 font-bold flex items-center gap-1">
              <Radio className="w-3 h-3 text-cyan-400" />
              {dataStatus} ({latencyMs}ms)
            </div>
          </div>

          <div className="border-l border-slate-700 pl-3 hidden md:block">
            <div className="text-[10px] text-slate-400 uppercase">Risk Engine</div>
            <div className="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              HEALTHY
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isFetching}
            className="p-1.5 rounded-lg bg-[#0B111E] hover:bg-slate-800 text-slate-300 transition-all disabled:opacity-50"
            title="Refresh P&L and Account State"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Control Bar: Timeframe Range Buttons & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono">
        {/* Timeframe Range Selector */}
        <div className="flex items-center gap-1 bg-[#141E33] border border-slate-700 rounded-xl p-1 overflow-x-auto">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onChangeTimeframe(tf)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                timeframe === tf
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Bot & Strategy Filter Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Bot Selector */}
          <div className="flex items-center gap-1 bg-[#141E33] border border-slate-700 rounded-xl px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={botFilter}
              onChange={(e) => onChangeBotFilter(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#0B111E]">All Bot Instances</option>
              <option value="bot-1" className="bg-[#0B111E]">Alpha BTC Scalper (bot-1)</option>
              <option value="bot-2" className="bg-[#0B111E]">Trend Confluence Pro (bot-2)</option>
              <option value="bot-3" className="bg-[#0B111E]">NIFTY Dynamic Breakout (bot-3)</option>
            </select>
          </div>

          {/* Strategy Selector */}
          <div className="flex items-center gap-1 bg-[#141E33] border border-slate-700 rounded-xl px-2.5 py-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={strategyFilter}
              onChange={(e) => onChangeStrategyFilter(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#0B111E]">All Strategies</option>
              <option value="Trend Confluence" className="bg-[#0B111E]">Trend Confluence</option>
              <option value="Breakout Hunter" className="bg-[#0B111E]">Breakout Hunter</option>
              <option value="Mean Reversion" className="bg-[#0B111E]">Mean Reversion</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
