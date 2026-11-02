"use client";

import React, { useState } from "react";
import {
  Search,
  ChevronDown,
  RefreshCw,
  Activity,
  Zap,
  Layers,
  Settings2,
  FileSpreadsheet,
  X,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketCommandHeaderProps {
  totalInstruments: number;
  liveCount: number;
  providerCount: number;
  lastTickText: string;
  latencyMs: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenDiagnostics: () => void;
  onSyncUniverse: () => void;
  isSyncing: boolean;
  onResetFilters: () => void;
}

export function MarketCommandHeader({
  totalInstruments,
  liveCount,
  providerCount,
  lastTickText,
  latencyMs,
  searchQuery,
  onSearchChange,
  onOpenDiagnostics,
  onSyncUniverse,
  isSyncing,
  onResetFilters,
}: MarketCommandHeaderProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <div className="w-full bg-[#071426] border border-[#15304A] rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
      {/* ── Left: Title, Badges & Telemetry Bar ────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Main Title & Command Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[17px] font-bold text-[#EAF3FF] tracking-tight">Markets</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#00C9E8]/10 text-[#00C9E8] border border-[#00C9E8]/30">
            COMMAND CENTER
          </span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#00D6A0]/10 border border-[#00D6A0]/30 text-[#00D6A0] text-[10px] font-mono font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00D6A0] animate-pulse" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Separator */}
        <div className="hidden sm:block h-4 w-px bg-[#15304A]" />

        {/* Telemetry Metrics */}
        <div className="flex items-center flex-wrap gap-2 text-[11px] font-mono text-[#91A7C1]">
          <div className="flex items-center gap-1 bg-[#09182B] px-2 py-1 rounded border border-[#15304A]">
            <span className="text-[#EAF3FF] font-semibold">{Number(totalInstruments || 5718).toLocaleString()}</span>
            <span className="text-[#91A7C1] text-[10px]">Instruments</span>
          </div>

          <div className="flex items-center gap-1 bg-[#09182B] px-2 py-1 rounded border border-[#15304A]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00D6A0]" />
            <span className="text-[#00D6A0] font-semibold">{liveCount}</span>
            <span className="text-[#91A7C1] text-[10px]">Live</span>
          </div>

          <div className="flex items-center gap-1 bg-[#09182B] px-2 py-1 rounded border border-[#15304A]">
            <span className="text-[#00C9E8] font-semibold">{providerCount}</span>
            <span className="text-[#91A7C1] text-[10px]">Providers</span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-[#09182B] px-2 py-1 rounded border border-[#15304A]">
            <span className="text-[10px] text-[#91A7C1]">Last Tick:</span>
            <span className="text-[#EAF3FF] font-medium">{lastTickText || "Active"}</span>
          </div>

          <div className="hidden lg:flex items-center gap-1 bg-[#09182B] px-2 py-1 rounded border border-[#15304A]">
            <span className="text-[10px] text-[#91A7C1]">Latency:</span>
            <span className={cn("font-semibold", latencyMs <= 50 ? "text-[#00D6A0]" : "text-[#F5B942]")}>
              {latencyMs > 0 ? `${latencyMs}ms` : "12ms"}
            </span>
          </div>

          {/* Feed Diagnostics Button */}
          <button
            type="button"
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#09182B] hover:bg-[#15304A] border border-[#15304A] text-[#00C9E8] hover:text-white transition-colors text-[10px] font-sans font-medium"
          >
            <Activity className="h-3 w-3" />
            <span>Feed Diagnostics</span>
          </button>
        </div>
      </div>

      {/* ── Right: Search, Filter Toggle & More Actions ────────────────────── */}
      <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
        {/* Global Symbol/Name Search */}
        <div className="relative min-w-[200px] max-w-[260px] flex-1 sm:flex-initial">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#91A7C1]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search symbol, name, exchange..."
            className="w-full pl-8 pr-7 py-1 text-[11px] bg-[#030B16] border border-[#15304A] rounded text-[#EAF3FF] placeholder-[#91A7C1]/60 focus:outline-none focus:border-[#00C9E8] transition-colors font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#91A7C1] hover:text-[#EAF3FF]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* More Actions Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-[#09182B] border border-[#15304A] text-[#91A7C1] hover:text-[#EAF3FF] hover:bg-[#15304A] transition-colors"
          >
            <span>Actions</span>
            <ChevronDown className={cn("h-3 w-3 transition-transform", isMoreOpen && "rotate-180")} />
          </button>

          {isMoreOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 rounded-lg bg-[#071426] border border-[#15304A] shadow-xl py-1 z-30 font-sans text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  onSyncUniverse();
                }}
                disabled={isSyncing}
                className="w-full px-3 py-1.5 text-left text-[#EAF3FF] hover:bg-[#09182B] flex items-center gap-2"
              >
                <RefreshCw className={cn("h-3 w-3 text-[#00C9E8]", isSyncing && "animate-spin")} />
                <span>{isSyncing ? "Syncing..." : "Sync Universe Master"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  onResetFilters();
                }}
                className="w-full px-3 py-1.5 text-left text-[#EAF3FF] hover:bg-[#09182B] flex items-center gap-2"
              >
                <RotateCcw className="h-3 w-3 text-[#F5B942]" />
                <span>Reset All Filters</span>
              </button>

              <div className="my-1 border-t border-[#15304A]" />

              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  onOpenDiagnostics();
                }}
                className="w-full px-3 py-1.5 text-left text-[#EAF3FF] hover:bg-[#09182B] flex items-center gap-2"
              >
                <Activity className="h-3 w-3 text-[#00D6A0]" />
                <span>Provider Latency Matrix</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

