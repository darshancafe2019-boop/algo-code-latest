"use client";

import React, { useRef } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  Bot,
  Radio,
  Briefcase,
  ClipboardList,
  Server,
  Bell,
  Layers,
} from "lucide-react";
import { BotViewMode, DensityMode } from "@/types/bot-control";
import { cn } from "@/lib/utils";

interface SimpleBotFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedMarket: string;
  onSelectMarket: (market: string) => void;
  selectedBroker?: string;
  onSelectBroker?: (broker: string) => void;
  selectedStrategy?: string;
  onSelectStrategy?: (strategy: string) => void;
  selectedHealth?: string;
  onSelectHealth?: (health: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  envFilter: string;
  onEnvFilterChange: (env: string) => void;
  showingCount: number;
  totalCount: number;
  viewMode: BotViewMode;
  onViewModeChange: (mode: BotViewMode) => void;
  densityMode?: DensityMode;
  onDensityModeChange?: (mode: DensityMode) => void;
  groupByFamily: boolean;
  onToggleGroupByFamily: (val: boolean) => void;
  onExportCsv?: () => void;
  onExportJson?: () => void;
  activeNavTab: string;
  onSelectNavTab: (tab: string) => void;
}

export function SimpleBotFilterBar({
  search,
  onSearchChange,
  selectedMarket,
  onSelectMarket,
  selectedBroker = "ALL",
  onSelectBroker,
  selectedStrategy = "ALL",
  onSelectStrategy,
  statusFilter,
  onStatusFilterChange,
  envFilter,
  onEnvFilterChange,
  showingCount,
  totalCount,
  viewMode,
  onViewModeChange,
  densityMode = "compact",
  onDensityModeChange,
  activeNavTab = "BOTS",
  onSelectNavTab,
}: SimpleBotFilterBarProps) {
  const handleClearAll = () => {
    onSearchChange("");
    onSelectMarket("ALL");
    if (onSelectBroker) onSelectBroker("ALL");
    if (onSelectStrategy) onSelectStrategy("ALL");
    onStatusFilterChange("ALL");
    onEnvFilterChange("ALL");
  };

  const navTabs = [
    { id: "BOTS", label: "Bots", icon: Bot, count: totalCount },
    { id: "STREAMS", label: "Live Streams", icon: Radio, count: 4 },
    { id: "ORDERS", label: "Orders", icon: ClipboardList, count: 0 },
    { id: "POSITIONS", label: "Positions", icon: Briefcase, count: 1 },
    { id: "PROVIDERS", label: "Providers", icon: Server, count: 7 },
    { id: "ALERTS", label: "Alerts", icon: Bell, count: 0 },
  ];

  return (
    <div className="space-y-2.5 font-sans select-none text-[#F8FAFC]">
      {/* ── Navigation Tabs Strip ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeNavTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectNavTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  isActive
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-950 font-black"
                    : "bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                      isActive ? "bg-cyan-950 text-cyan-200" : "bg-slate-800 text-slate-400"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Density Selector */}
        {onDensityModeChange && (
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => onDensityModeChange("compact")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-bold transition",
                densityMode === "compact" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              Compact
            </button>
            <button
              onClick={() => onDensityModeChange("comfortable")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-bold transition",
                densityMode === "comfortable" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              Comfortable
            </button>
          </div>
        )}
      </div>

      {/* ── Compact Single-Line Filter Controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#08101e] border border-[#13233c] text-xs font-mono">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search bot, contract, or strategy..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-7 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">Status: All</option>
            <option value="RUNNING">Running / Active</option>
            <option value="PAUSED">Paused</option>
            <option value="STOPPED">Stopped / Draft</option>
            <option value="ERROR">Error</option>
          </select>

          {/* Market */}
          <select
            value={selectedMarket}
            onChange={(e) => onSelectMarket(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">Market: All</option>
            <option value="CRYPTO_OPTIONS">Crypto Options</option>
            <option value="CRYPTO_FUTURES">Crypto Futures</option>
            <option value="OPTIONS">NSE Options</option>
            <option value="FUTURES">NSE Futures</option>
          </select>

          {/* Provider */}
          {onSelectBroker && (
            <select
              value={selectedBroker}
              onChange={(e) => onSelectBroker(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">Provider: All</option>
              <option value="DELTA">DELTA</option>
              <option value="DHAN">DHAN</option>
              <option value="UPSTOX">UPSTOX</option>
              <option value="BINANCE">BINANCE</option>
            </select>
          )}

          {/* Environment */}
          <select
            value={envFilter}
            onChange={(e) => onEnvFilterChange(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">Env: All</option>
            <option value="PAPER">Paper</option>
            <option value="LIVE">Live</option>
          </select>

          {/* Reset */}
          <button
            onClick={handleClearAll}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
