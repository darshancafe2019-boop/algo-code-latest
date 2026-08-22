"use client";

import React from "react";
import {
  Bot,
  Search,
  Command,
  Shield,
  Activity,
  Send,
  Radio,
  SlidersHorizontal,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Database,
  Layers,
} from "lucide-react";
import { MarketAssetClass } from "@/types/bot-control";

interface BotControlCenterHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedMarket: string;
  onMarketChange: (m: string) => void;
  isLiveMode: boolean;
  onOpenCommandPalette: () => void;
  telegramStatus?: "CONNECTED" | "DISCONNECTED" | "NOT_CONFIGURED";
  systemLatencyMs?: number;
  totalRunningCount: number;
  totalPausedCount?: number;
  totalStoppedCount?: number;
  totalBotsCount?: number;
  brokerStatus?: "CONNECTED" | "DISCONNECTED";
  marketDataStatus?: "HEALTHY" | "DEGRADED" | "STALE" | "OFFLINE";
  riskStatus?: "HEALTHY" | "WARNING" | "HALTED";
  dbStatus?: "HEALTHY" | "DEGRADED";
}

export function BotControlCenterHeader({
  searchQuery,
  onSearchChange,
  selectedMarket,
  onMarketChange,
  isLiveMode,
  onOpenCommandPalette,
  telegramStatus = "CONNECTED",
  systemLatencyMs = 12,
  totalRunningCount,
  totalPausedCount = 0,
  totalStoppedCount = 0,
  totalBotsCount = 0,
  brokerStatus = "CONNECTED",
  marketDataStatus = "HEALTHY",
  riskStatus = "HEALTHY",
  dbStatus = "HEALTHY",
}: BotControlCenterHeaderProps) {
  const markets: Array<{ id: string; label: string }> = [
    { id: "ALL", label: "All Markets" },
    { id: "crypto", label: "Crypto Spot & Perp" },
    { id: "equity", label: "NSE / Indian Equities" },
    { id: "futures", label: "Futures" },
    { id: "options", label: "Options" },
    { id: "forex", label: "Forex" },
    { id: "commodity", label: "Commodities (MCX)" },
  ];

  const totalBots = totalBotsCount || (totalRunningCount + totalPausedCount + totalStoppedCount);
  const isSystemHealthy =
    brokerStatus === "CONNECTED" &&
    (marketDataStatus === "HEALTHY" || marketDataStatus === "LIVE" as any) &&
    riskStatus === "HEALTHY" &&
    dbStatus === "HEALTHY";

  return (
    <header className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-3.5 sm:p-4.5 shadow-2xl select-none font-sans space-y-3.5">
      {/* Top Bar: Title, System Status, Environment, Global Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        {/* Left: Branding & Fleet State Summary */}
        <div className="flex items-center gap-3 min-w-[280px]">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#122238] to-[#1E3A5F] text-cyan-400 border border-cyan-700/50 shadow-lg shadow-cyan-950/40">
            <Bot className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
                BOT COMMAND CENTER
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                v2.4 MASTER
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pt-0.5">
              <span className="font-bold text-slate-200">{totalBots} BOTS</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{totalRunningCount} RUNNING</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">{totalPausedCount} PAUSED</span>
              <span>•</span>
              <span className="text-slate-400">{totalStoppedCount} STOPPED</span>
            </div>
          </div>
        </div>

        {/* Middle/Right: Authoritative Subsystem Health Pills */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#070D14] border border-[#1E293B] text-[11px] font-mono">
          <div className="flex items-center gap-1.5 pr-2 border-r border-[#1E293B]">
            <span className={`h-1.5 w-1.5 rounded-full ${isSystemHealthy ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="text-slate-400">System:</span>
            <span className={`font-bold ${isSystemHealthy ? "text-emerald-400" : "text-amber-400"}`}>
              {isSystemHealthy ? "HEALTHY" : "DEGRADED"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 pr-2 border-r border-[#1E293B]">
            <span className="text-slate-500">Broker:</span>
            <span className="text-slate-200 font-bold">{brokerStatus}</span>
          </div>

          <div className="flex items-center gap-1.5 pr-2 border-r border-[#1E293B]">
            <span className="text-slate-500">Feed:</span>
            <span className="text-emerald-400 font-bold">{marketDataStatus}</span>
          </div>

          <div className="flex items-center gap-1.5 pr-2 border-r border-[#1E293B]">
            <span className="text-slate-500">Risk:</span>
            <span className="text-cyan-300 font-bold">{riskStatus}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">DB:</span>
            <span className="text-slate-200 font-bold">{dbStatus}</span>
          </div>
        </div>

        {/* Right Controls: Search, Cmd+K, Environment Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search bot, symbol, strategy..."
              className="w-40 sm:w-56 bg-[#070D14] border border-[#1E293B] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all font-mono"
            />
          </div>

          {/* Command Palette Trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="px-2.5 py-1.5 rounded-xl bg-[#070D14] hover:bg-[#122238] border border-[#1E293B] text-slate-300 hover:text-slate-100 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Open Command Palette (⌘K)"
          >
            <Command className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Commands</span>
            <kbd className="px-1.5 py-0.2 rounded bg-[#1C2C42] text-[10px] text-slate-400 font-mono">⌘K</kbd>
          </button>

          {/* Environment Banner: Paper (Cyan/Slate) vs Live (Red/Warning) */}
          <div
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border shadow-sm ${
              isLiveMode
                ? "bg-rose-950/80 text-rose-300 border-rose-800 shadow-rose-950/40 animate-pulse"
                : "bg-cyan-950/60 text-cyan-300 border-cyan-800/70"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isLiveMode ? "bg-rose-400 animate-ping" : "bg-cyan-400"}`} />
            <span>{isLiveMode ? "LIVE TRADING (REAL CAPITAL)" : "PAPER ENVIRONMENT"}</span>
          </div>

          {/* Telegram Status */}
          <div
            className={`px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold flex items-center gap-1.5 border ${
              telegramStatus === "CONNECTED"
                ? "bg-[#070D14] text-emerald-400 border-[#1E293B]"
                : "bg-amber-950/60 text-amber-300 border-amber-800"
            }`}
            title="Telegram Alert Dispatcher"
          >
            <Send className="h-3 w-3" />
            <span className="hidden md:inline">TG:</span>
            <span>{telegramStatus === "CONNECTED" ? "CONNECTED" : "OFFLINE"}</span>
          </div>

          {/* Real Latency */}
          <div className="px-2.5 py-1.5 rounded-xl bg-[#070D14] border border-[#1E293B] font-mono text-[11px] text-slate-300 flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-cyan-400 animate-pulse" />
            <span>{systemLatencyMs}ms</span>
          </div>
        </div>
      </div>

      {/* Bottom Filter Row: Market Selector Tabs */}
      <div className="pt-2 border-t border-[#1C2C42] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full custom-scrollbar">
          <span className="text-[11px] text-slate-500 font-bold uppercase mr-1.5 shrink-0">Market Filter:</span>
          {markets.map((m) => (
            <button
              key={m.id}
              onClick={() => onMarketChange(m.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 font-mono ${
                selectedMarket === m.id
                  ? "bg-gradient-to-r from-[#122238] to-[#1E3A5F] text-cyan-300 border border-cyan-600/70 shadow-md"
                  : "bg-[#070D14] hover:bg-[#122238]/60 text-slate-400 hover:text-slate-200 border border-[#1E293B]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <span>Worker Health:</span>
          <span className="text-emerald-400 font-bold">
            {totalRunningCount > 0 ? `${totalRunningCount}/${totalBots} Active` : "Standby"}
          </span>
        </div>
      </div>
    </header>
  );
}
