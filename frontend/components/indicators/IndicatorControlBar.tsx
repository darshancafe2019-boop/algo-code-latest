"use client";

import React, { useState } from "react";
import {
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
  Plus,
  Bookmark,
  MoreVertical,
  Check,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

const POPULAR_INSTRUMENTS = [
  { symbol: "BTC/USDT", name: "Bitcoin Perpetual", exchange: "DELTA", provider: "Delta Exchange" },
  { symbol: "ETH/USDT", name: "Ethereum Perpetual", exchange: "DELTA", provider: "Delta Exchange" },
  { symbol: "SOL/USDT", name: "Solana Perpetual", exchange: "DELTA", provider: "Delta Exchange" },
  { symbol: "NIFTY 50", name: "Nifty 50 Index", exchange: "NSE", provider: "Upstox" },
  { symbol: "BANKNIFTY", name: "Bank Nifty Index", exchange: "NSE", provider: "Upstox" },
  { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", provider: "Upstox" },
  { symbol: "TATASTEEL", name: "Tata Steel", exchange: "NSE", provider: "Upstox" },
  { symbol: "CRUDEOIL", name: "Crude Oil Futures", exchange: "MCX", provider: "Multi-Broker" },
  { symbol: "GOLD", name: "Gold 1KG", exchange: "MCX", provider: "Multi-Broker" },
];

interface IndicatorControlBarProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  selectedTimeframe: string;
  onSelectTimeframe: (tf: string) => void;
  activeCount: number;
  totalCount: number;
  isDataConnected?: boolean;
  lastUpdateLatency?: string;
  onAddIndicator: () => void;
  onOpenPresets: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function IndicatorControlBar({
  selectedSymbol = "BTC/USDT",
  onSelectSymbol,
  selectedTimeframe = "5m",
  onSelectTimeframe,
  activeCount = 14,
  totalCount = 20,
  isDataConnected = true,
  lastUpdateLatency = "42ms",
  onAddIndicator,
  onOpenPresets,
  onRefresh,
  isRefreshing = false,
}: IndicatorControlBarProps) {
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);
  const [symbolSearchQuery, setSymbolSearchQuery] = useState("");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const filteredInstruments = POPULAR_INSTRUMENTS.filter((inst) =>
    inst.symbol.toLowerCase().includes(symbolSearchQuery.toLowerCase()) ||
    inst.name.toLowerCase().includes(symbolSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-lg bg-[#0A1422] border border-[#122A42]">
      {/* ── Left Title ── */}
      <div className="flex flex-col min-w-[200px]">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-4 w-4 text-[#00F0FF]" />
          <span className="text-[13px] font-black text-[#F8FAFC] tracking-wider uppercase">
            INDICATORS — PRO ENGINE
          </span>
        </div>
        <span className="text-[10px] text-[#7D8EA5]">
          Live quantitative indicators and deterministic confluence signals.
        </span>
      </div>

      {/* ── Middle Controls: Market, Timeframe, Status ── */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {/* Market Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSymbolDropdownOpen((prev) => !prev)}
            className="h-[32px] px-2.5 rounded bg-[#06101B] border border-[#10263A] hover:border-[#168BFF]/50 text-[#F8FAFC] flex items-center gap-2 font-mono font-bold text-[11px] transition-colors cursor-pointer"
          >
            <span className="text-[#00F0FF]">MKT:</span>
            <span>{selectedSymbol}</span>
            <ChevronDown className="h-3 w-3 text-[#7D8EA5]" />
          </button>

          {isSymbolDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 rounded-lg bg-[#06101B] border border-[#122A42] shadow-xl z-50 p-2 space-y-1">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0A1422] border border-[#10263A] mb-1">
                <Search className="h-3 w-3 text-[#7D8EA5]" />
                <input
                  type="text"
                  value={symbolSearchQuery}
                  onChange={(e) => setSymbolSearchQuery(e.target.value)}
                  placeholder="Search symbols..."
                  className="w-full bg-transparent text-[11px] text-[#F8FAFC] focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filteredInstruments.map((inst) => {
                  const isSelected = inst.symbol === selectedSymbol;
                  return (
                    <button
                      key={inst.symbol}
                      type="button"
                      onClick={() => {
                        onSelectSymbol(inst.symbol);
                        setIsSymbolDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded flex items-center justify-between text-[11px] transition-colors cursor-pointer",
                        isSelected ? "bg-[#168BFF]/20 text-[#00F0FF]" : "hover:bg-[#0A1422] text-[#F8FAFC]"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-mono font-bold">{inst.symbol}</span>
                        <span className="text-[9px] text-[#7D8EA5]">{inst.name}</span>
                      </div>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#0A1422] border border-[#10263A] text-[#22D3EE]">
                        {inst.exchange}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Timeframe Selector Pills */}
        <div className="flex items-center gap-0.5 bg-[#06101B] p-0.5 rounded border border-[#10263A]">
          {TIMEFRAMES.map((tf) => {
            const isSelected = selectedTimeframe === tf;
            return (
              <button
                key={tf}
                type="button"
                onClick={() => onSelectTimeframe(tf)}
                className={cn(
                  "px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer",
                  isSelected
                    ? "bg-[#168BFF] text-white shadow-xs"
                    : "text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0A1422]"
                )}
              >
                {tf}
              </button>
            );
          })}
        </div>

        {/* Data Status Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#06101B] border border-[#10263A] text-[10px] font-mono">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isDataConnected ? "bg-[#00E89A] animate-pulse" : "bg-[#FF3B5C]"
            )}
          />
          <span className="text-[#7D8EA5]">DATA:</span>
          <span className={cn("font-bold", isDataConnected ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
            {isDataConnected ? "CONNECTED" : "OFFLINE"}
          </span>
          <span className="text-[#7D8EA5] ml-1">({lastUpdateLatency})</span>
        </div>

        {/* Active Indicators Count */}
        <div className="px-2 py-1 rounded bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[10px] font-mono font-bold text-[#00F0FF]">
          {activeCount} / {totalCount} ACTIVE
        </div>
      </div>

      {/* ── Right Action Buttons ── */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onAddIndicator}
          className="h-[32px] px-2.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/25 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Indicator</span>
        </button>

        <button
          type="button"
          onClick={onOpenPresets}
          className="h-[32px] px-2.5 rounded bg-[#06101B] border border-[#10263A] hover:border-[#168BFF]/50 text-[#F8FAFC] font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Bookmark className="h-3 w-3 text-[#168BFF]" />
          <span>Presets</span>
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-[32px] px-2 rounded bg-[#06101B] border border-[#10263A] hover:border-[#168BFF]/50 text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors cursor-pointer"
          title="Refresh Indicator Pipeline"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-[#00F0FF]")} />
        </button>

        {/* More Actions Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen((prev) => !prev)}
            className="h-[32px] px-1.5 rounded bg-[#06101B] border border-[#10263A] hover:border-[#168BFF]/50 text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors cursor-pointer"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>

          {isMoreMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-44 rounded-lg bg-[#06101B] border border-[#122A42] shadow-xl z-50 p-1 space-y-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  onRefresh();
                  setIsMoreMenuOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#0A1422] text-[#F8FAFC] transition-colors"
              >
                Clear Compute Cache
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#0A1422] text-[#F8FAFC] transition-colors"
              >
                Export Indicators Config
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#0A1422] text-rose-400 transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

