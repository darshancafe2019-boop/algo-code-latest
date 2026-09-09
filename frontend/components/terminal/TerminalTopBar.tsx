"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  ChevronDown,
  SlidersHorizontal,
  Bell,
  Radio,
  Shield,
  ShieldAlert,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Zap,
} from "lucide-react";
import { STANDARD_INDICATOR_PRESETS } from "@/lib/indicators/presets";
import { formatPrice, formatPercent } from "@/lib/formatters";

export interface TerminalTopBarProps {
  symbol: string;
  onSelectSymbol: (symbol: string) => void;
  price: number;
  change: number;
  changePct: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  activeTimeframe: string;
  onSelectTimeframe: (tf: string) => void;
  activeIndicatorsCount: number;
  onOpenIndicators: () => void;
  onSelectPreset?: (presetId: string) => void;
  executionMode: "PAPER" | "SHADOW" | "LIVE";
  onToggleMode: (mode: "PAPER" | "SHADOW" | "LIVE") => void;
  dataStatus?: "LIVE" | "WEBSOCKET" | "STALE" | "DISCONNECTED";
  latencyMs?: number;
  onOpenAlerts?: () => void;
}

const TIMEFRAMES = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1D"];

const POPULAR_SYMBOLS = [
  { symbol: "NIFTY", name: "Nifty 50 Index", exchange: "NSE", type: "INDEX" },
  { symbol: "BANKNIFTY", name: "Bank Nifty Index", exchange: "NSE", type: "INDEX" },
  { symbol: "FINNIFTY", name: "Nifty Financial Services", exchange: "NSE", type: "INDEX" },
  { symbol: "BTC/USDT", name: "Bitcoin Perpetual", exchange: "DELTA", type: "CRYPTO" },
  { symbol: "ETH/USDT", name: "Ethereum Perpetual", exchange: "DELTA", type: "CRYPTO" },
  { symbol: "SOL/USDT", name: "Solana Perpetual", exchange: "DELTA", type: "CRYPTO" },
  { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", type: "STOCK" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", exchange: "NSE", type: "STOCK" },
];

export function TerminalTopBar({
  symbol,
  onSelectSymbol,
  price,
  change,
  changePct,
  high24h,
  low24h,
  volume24h,
  activeTimeframe,
  onSelectTimeframe,
  activeIndicatorsCount,
  onOpenIndicators,
  onSelectPreset,
  executionMode,
  onToggleMode,
  dataStatus = "LIVE",
  latencyMs = 14,
  onOpenAlerts,
}: TerminalTopBarProps) {
  const [isSymbolOpen, setIsSymbolOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isModeOpen, setIsModeOpen] = useState(false);

  const symbolRef = useRef<HTMLDivElement>(null);
  const presetsRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (symbolRef.current && !symbolRef.current.contains(event.target as Node)) {
        setIsSymbolOpen(false);
      }
      if (presetsRef.current && !presetsRef.current.contains(event.target as Node)) {
        setIsPresetsOpen(false);
      }
      if (modeRef.current && !modeRef.current.contains(event.target as Node)) {
        setIsModeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isBullish = changePct >= 0;
  const filteredSymbols = POPULAR_SYMBOLS.filter(
    (s) =>
      s.symbol.toLowerCase().includes(symbolSearch.toLowerCase()) ||
      s.name.toLowerCase().includes(symbolSearch.toLowerCase())
  );

  return (
    <header className="h-12 bg-[#131722] border-b border-[#2A2E39] px-3 flex items-center justify-between select-none z-30 shrink-0 font-sans">
      {/* LEFT SECTION: Symbol Selector, Price Readout, 24h Stats */}
      <div className="flex items-center gap-3">
        {/* Symbol Selector Dropdown */}
        <div className="relative" ref={symbolRef}>
          <button
            onClick={() => setIsSymbolOpen(!isSymbolOpen)}
            className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] transition text-left"
          >
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-[#D1D4DC] tracking-wide font-mono flex items-center gap-1.5">
                {symbol}
                <ChevronDown className="w-3.5 h-3.5 text-[#787B86]" />
              </span>
            </div>
          </button>

          {/* Symbol Search Modal/Dropdown */}
          {isSymbolOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-72 bg-[#1E222D] border border-[#2A2E39] rounded-lg shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 pb-2 border-b border-[#2A2E39]">
                <div className="flex items-center gap-2 bg-[#131722] px-2.5 py-1.5 rounded border border-[#2A2E39]">
                  <Search className="w-3.5 h-3.5 text-[#787B86]" />
                  <input
                    type="text"
                    placeholder="Search Symbol (NIFTY, BTC...)"
                    value={symbolSearch}
                    onChange={(e) => setSymbolSearch(e.target.value)}
                    className="w-full bg-transparent text-xs text-[#D1D4DC] placeholder-[#787B86] outline-none font-sans"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto py-1">
                {filteredSymbols.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => {
                      onSelectSymbol(item.symbol);
                      setIsSymbolOpen(false);
                      setSymbolSearch("");
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[#2A2E39] transition-colors ${
                      symbol === item.symbol ? "bg-[#2962FF]/10 text-[#2962FF]" : "text-[#D1D4DC]"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold font-mono">{item.symbol}</div>
                      <div className="text-[10px] text-[#787B86]">{item.name}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#131722] text-[#787B86] font-mono border border-[#2A2E39]">
                      {item.exchange}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Primary Market Price (LTP: 20-24px Tabular Numbers) */}
        <div className="flex items-baseline gap-2 tabular-nums">
          <span
            className={`text-xl font-extrabold font-mono tracking-tight ${
              isBullish ? "text-[#26A69A]" : "text-[#EF5350]"
            }`}
          >
            {price > 0 ? (price >= 1000 ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : price.toFixed(2)) : "—"}
          </span>

          {/* Change Pill */}
          <span
            className={`text-xs font-bold font-mono flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
              isBullish ? "bg-[#26A69A]/15 text-[#26A69A]" : "bg-[#EF5350]/15 text-[#EF5350]"
            }`}
          >
            {isBullish ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {isBullish ? "+" : ""}
            {change.toFixed(2)} ({isBullish ? "+" : ""}
            {changePct.toFixed(2)}%)
          </span>
        </div>

        {/* 24h High/Low Stats (Hidden on small screens) */}
        <div className="hidden xl:flex items-center gap-3 pl-2 border-l border-[#2A2E39] text-[11px] font-mono tabular-nums text-[#787B86]">
          {high24h && (
            <div>
              <span className="text-[#787B86]">H: </span>
              <span className="text-[#D1D4DC]">{high24h.toLocaleString()}</span>
            </div>
          )}
          {low24h && (
            <div>
              <span className="text-[#787B86]">L: </span>
              <span className="text-[#D1D4DC]">{low24h.toLocaleString()}</span>
            </div>
          )}
          {volume24h && (
            <div>
              <span className="text-[#787B86]">Vol: </span>
              <span className="text-[#D1D4DC]">{volume24h >= 1000000 ? `${(volume24h / 1000000).toFixed(1)}M` : `${(volume24h / 1000).toFixed(0)}K`}</span>
            </div>
          )}
        </div>
      </div>

      {/* CENTER SECTION: Candlestick Timeframe Selector */}
      <div className="flex items-center gap-0.5 bg-[#1E222D] p-0.5 rounded border border-[#2A2E39]">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => onSelectTimeframe(tf)}
            className={`px-2 py-1 rounded text-xs font-semibold font-mono transition-all ${
              activeTimeframe === tf
                ? "bg-[#2962FF] text-white shadow-sm"
                : "text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39]"
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* RIGHT SECTION: Indicators, Presets, Alerts, Mode, Data Status */}
      <div className="flex items-center gap-2">
        {/* Indicators Drawer Trigger */}
        <button
          onClick={onOpenIndicators}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-[#D1D4DC] hover:text-white transition text-xs font-medium"
          title="Open Central Indicator Library"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#2962FF]" />
          <span>Indicators</span>
          {activeIndicatorsCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#2962FF] text-white font-mono font-bold">
              {activeIndicatorsCount}
            </span>
          )}
        </button>

        {/* Indicator Presets Dropdown */}
        {onSelectPreset && (
          <div className="relative hidden lg:block" ref={presetsRef}>
            <button
              onClick={() => setIsPresetsOpen(!isPresetsOpen)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-[#787B86] hover:text-[#D1D4DC] transition text-xs"
              title="Load Indicator Strategy Presets"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Presets</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isPresetsOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#1E222D] border border-[#2A2E39] rounded-lg shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#787B86] border-b border-[#2A2E39]">
                  Indicator Presets
                </div>
                {STANDARD_INDICATOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onSelectPreset(preset.id);
                      setIsPresetsOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[#2A2E39] transition-colors"
                  >
                    <div className="text-xs font-bold text-[#D1D4DC]">{preset.name}</div>
                    <div className="text-[10px] text-[#787B86] truncate">{preset.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Alerts Button */}
        {onOpenAlerts && (
          <button
            onClick={onOpenAlerts}
            className="p-1.5 rounded bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-[#787B86] hover:text-[#D1D4DC] transition"
            title="Price & Indicator Alerts"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Execution Mode Selector (PAPER / SHADOW / LIVE) */}
        <div className="relative" ref={modeRef}>
          <button
            onClick={() => setIsModeOpen(!isModeOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold font-mono transition shadow-sm ${
              executionMode === "LIVE"
                ? "bg-[#EF5350] hover:bg-[#EF5350]/90 text-white animate-pulse"
                : executionMode === "SHADOW"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-[#2962FF]/15 text-[#2962FF] border border-[#2962FF]/40 hover:bg-[#2962FF]/25"
            }`}
            title="Trading Execution Mode"
          >
            {executionMode === "LIVE" ? (
              <ShieldAlert className="w-3.5 h-3.5" />
            ) : (
              <Shield className="w-3.5 h-3.5" />
            )}
            <span>{executionMode}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {isModeOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#1E222D] border border-[#2A2E39] rounded-lg shadow-2xl py-1 z-50">
              {(["PAPER", "SHADOW", "LIVE"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    onToggleMode(m);
                    setIsModeOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs font-mono font-bold hover:bg-[#2A2E39] transition-colors ${
                    executionMode === m ? "text-[#2962FF] bg-[#2962FF]/10" : "text-[#D1D4DC]"
                  }`}
                >
                  <span>{m} MODE</span>
                  {executionMode === m && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Telemetry Data Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-[#1E222D] border border-[#2A2E39] text-[11px] font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              dataStatus === "LIVE"
                ? "bg-[#26A69A] animate-pulse"
                : dataStatus === "STALE"
                ? "bg-amber-400"
                : "bg-[#EF5350]"
            }`}
          />
          <span className="text-[#D1D4DC] font-semibold">{dataStatus}</span>
          <span className="text-[#787B86] tabular-nums">{latencyMs}ms</span>
        </div>
      </div>
    </header>
  );
}
