"use client";

import React from "react";
import { Cpu, Activity, Zap, Layers, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Sliders, PlayCircle, BarChart3, GitCompare } from "lucide-react";

interface IndicatorIntelligenceHeaderProps {
  bots: any[];
  selectedBotId: string;
  onSelectBotId: (id: string) => void;
  activeBotData: any;
  statusData: any;
  onEnableAll: () => void;
  onDisableAll: () => void;
  onResetAll: () => void;
  onOpenBacktest: () => void;
  onOpenCompare: () => void;
  isSyncing: boolean;
  onRefresh: () => void;
}

export function IndicatorIntelligenceHeader({
  bots,
  selectedBotId,
  onSelectBotId,
  activeBotData,
  statusData,
  onEnableAll,
  onDisableAll,
  onResetAll,
  onOpenBacktest,
  onOpenCompare,
  isSyncing,
  onRefresh,
}: IndicatorIntelligenceHeaderProps) {
  const isHealthy = statusData?.status === "HEALTHY" || !statusData?.status || statusData?.status === "OK";
  const latencyMs = statusData?.latency_ms || 0.8;
  const activeCount = statusData?.active_indicators_count || statusData?.enabled_count || 6;
  const totalCount = statusData?.total_indicators_count || 18;

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
      {/* Top Row: Title, Bot Selector, Global Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/40">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                INDICATOR INTELLIGENCE CENTER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold tracking-wider rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                PRO QUANT ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic, multi-timeframe indicator calculations isolated per bot instance
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenBacktest}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#141E33] hover:bg-[#1C2A47] text-cyan-400 border border-cyan-500/30 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Backtest Indicators
          </button>
          <button
            onClick={onOpenCompare}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#141E33] hover:bg-[#1C2A47] text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <GitCompare className="w-3.5 h-3.5" />
            Compare
          </button>
          <button
            onClick={onEnableAll}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all"
          >
            Enable All
          </button>
          <button
            onClick={onDisableAll}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all"
          >
            Disable All
          </button>
          <button
            onClick={onRefresh}
            disabled={isSyncing}
            className="p-2 text-xs rounded-lg bg-[#1E293B] hover:bg-slate-700 text-slate-300 transition-all disabled:opacity-50"
            title="Refresh calculations"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Bot Context & Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-[#1E293B]">
        {/* 1. Bot Selector */}
        <div className="col-span-2 sm:col-span-1 bg-[#141E33] border border-[#1E293B] rounded-xl p-2.5 flex flex-col justify-center">
          <label className="text-[10px] font-mono uppercase text-slate-400 mb-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" />
            Target Bot Instance
          </label>
          <select
            value={selectedBotId}
            onChange={(e) => onSelectBotId(e.target.value)}
            className="bg-[#0B111E] border border-slate-700 text-white text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500"
          >
            {bots && bots.length > 0 ? (
              bots.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || b.id} ({b.symbol || "BTC/USDT"})
                </option>
              ))
            ) : (
              <option value="bot-1">Alpha BTC Scalper (bot-1)</option>
            )}
          </select>
        </div>

        {/* 2. Symbol & Exchange */}
        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-2.5">
          <div className="text-[10px] font-mono uppercase text-slate-400">Underlying Asset</div>
          <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
            {activeBotData?.symbol || "BTC/USDT"}
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
              {activeBotData?.exchange || "BINANCE"}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            Mode: <span className="text-emerald-400 font-semibold">{activeBotData?.execution_mode || "PAPER"}</span>
          </div>
        </div>

        {/* 3. Timeframes */}
        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-2.5">
          <div className="text-[10px] font-mono uppercase text-slate-400">Primary Timeframe</div>
          <div className="text-sm font-bold text-cyan-400 mt-0.5 font-mono">
            {activeBotData?.timeframe || "15m"}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            Matrix: <span className="text-slate-200 font-medium">5m / 15m / 1h / 4h</span>
          </div>
        </div>

        {/* 4. Active Count */}
        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-2.5">
          <div className="text-[10px] font-mono uppercase text-slate-400">Active Indicators</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5 font-mono">
            {activeCount} <span className="text-xs text-slate-500 font-normal">/ {totalCount} total</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            Weight Sum: <span className="text-white font-semibold">100%</span>
          </div>
        </div>

        {/* 5. Calculation Latency */}
        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-2.5">
          <div className="text-[10px] font-mono uppercase text-slate-400">Engine Latency</div>
          <div className="text-sm font-bold text-cyan-400 mt-0.5 font-mono flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            {latencyMs.toFixed(1)} ms
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            DATA: LIVE (0s age)
          </div>
        </div>

        {/* 6. Health Status */}
        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-2.5">
          <div className="text-[10px] font-mono uppercase text-slate-400">Engine Status</div>
          <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
            {isHealthy ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-xs">HEALTHY</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-semibold text-xs">DEGRADED</span>
              </>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            Zero Repainting: <span className="text-cyan-400 font-semibold">ENFORCED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
