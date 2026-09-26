"use client";

import React, { memo } from "react";
import { Search, RefreshCw, Activity, ShieldCheck, Zap, Globe2 } from "lucide-react";
import { Environment } from "@/types/data-core";

interface TopHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  environment?: Environment;
  onEnvironmentChange?: (env: Environment) => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  connectedCount?: number;
  totalCount?: number;
}

export const TopHeader = memo(function TopHeader({
  searchQuery,
  onSearchChange,
  environment = "PAPER",
  onEnvironmentChange,
  isRefreshing = false,
  onRefresh,
  connectedCount = 0,
  totalCount = 0,
}: TopHeaderProps) {
  return (
    <header className="w-full h-14 bg-[#04111C] border-b border-[#0D2438] px-4 flex items-center justify-between gap-4 select-none shrink-0">
      {/* LEFT: Search Field */}
      <div className="flex-1 max-w-[480px]">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-[#7D8EA5] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search accounts, symbols, brokers or exposure (e.g. DHAN, NIFTY, UPSTOX, BTC...)"
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#071D2D]/80 border border-[#10304C] text-[12px] text-slate-100 placeholder-[#566B82] focus:outline-none focus:border-[#16C6F4] focus:ring-1 focus:ring-[#16C6F4]/30 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 text-[10px] text-[#7D8EA5] hover:text-white"
            >
              ESC
            </button>
          )}
        </div>
      </div>

      {/* RIGHT: Live Feed Telemetry, Environment Toggle & Manual Sync */}
      <div className="flex items-center gap-3">
        {/* Live Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#061828] border border-[#0F304E] text-[11px] font-mono">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-slate-300 font-semibold">FEED: LIVE</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-400 font-bold">
            {connectedCount}/{totalCount || 5} BROKERS
          </span>
        </div>

        {/* Environment Switcher */}
        {onEnvironmentChange && (
          <div className="flex items-center p-0.5 rounded-lg bg-[#061828] border border-[#0F304E]">
            <button
              type="button"
              onClick={() => onEnvironmentChange("PAPER")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold font-mono transition-all ${
                environment === "PAPER"
                  ? "bg-[#16C6F4] text-[#020B14] shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              PAPER SIM
            </button>
            <button
              type="button"
              onClick={() => onEnvironmentChange("LIVE")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold font-mono transition-all ${
                environment === "LIVE"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              LIVE BROKER
            </button>
          </div>
        )}

        {/* Refresh Trigger */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh Live Data"
            className="h-9 w-9 rounded-lg bg-[#071F32] hover:bg-[#0C2D48] border border-[#133A5C] flex items-center justify-center text-[#16C6F4] hover:text-white transition-all shadow-sm active:scale-95"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>
    </header>
  );
});
