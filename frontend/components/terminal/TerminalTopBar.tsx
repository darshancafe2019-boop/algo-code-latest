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
    <header className="h-12 bg-[#07101A] border-b border-[#1A2A3F] px-3 flex items-center justify-between select-none z-30 shrink-0 font-sans">
      {/* LEFT SECTION: Symbol Selector, Price Readout, 24h Stats */}
      <div className="flex items-center gap-3">
        {/* Symbol Selector Dropdown */}
        <div className="relative" ref={symbolRef}>
          <button
            onClick={() => setIsSymbolOpen(!isSymbolOpen)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0A1422] hover:bg-[#101B2D] border border-[#1A2A3F] hover:border-[#29415F] transition text-left"
          >
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-[#F7FAFC] tracking-wide font-mono flex items-center gap-1.5">
                {symbol}
                <ChevronDown className="w-3.5 h-3.5 text-[#52627A]" />
              </span>
            </div>
          </button>

          {/* Symbol Search Modal/Dropdown */}
          {isSymbolOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-72 bg-[#0A1422] border border-[#1A2A3F] rounded-lg shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 pb-2 border-b border-[#1A2A3F]">
                <div className="flex items-center gap-2 bg-[#0D1727] px-2.5 py-1.5 rounded-lg border border-[#1A2A3F] focus-within:border-[#22D3EE]">
                  <Search className="w-3.5 h-3.5 text-[#52627A]" />
                  <input
                    type="text"
                    placeholder="Search Symbol (NIFTY, BTC...)"
                    value={symbolSearch}
                    onChange={(e) => setSymbolSearch(e.target.value)}
                    className="w-full bg-transparent text-xs text-[#F7FAFC] placeholder-[#52627A] outline-none font-sans"
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
                    className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[#101B2D] transition-colors ${
                      symbol === item.symbol ? "bg-[#2563EB]/15 text-[#19C5FF]" : "text-[#F7FAFC]"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold font-mono">{item.symbol}</div>
                      <div className="text-[10px] text-[#7C8CA3]">{item.name}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0D1727] text-[#7C8CA3] font-mono border border-[#1A2A3F]">
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
            className={`text-xl font-bold font-mono tracking-tight ${
              isBullish ? "text-[#00E890]" : "text-[#FF3B5C]"
            }`}
          >
            {price > 0 ? (price >= 1000 ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : price.toFixed(2)) : "—"}
          </span>

          {/* Change Pill */}
          <span
            className={`text-xs font-bold font-mono flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
              isBullish ? "bg-[#00E890]/15 text-[#00E890]" : "bg-[#FF3B5C]/15 text-[#FF3B5C]"
            }`}
          >
            {isBullish ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {isBullish ? "+" : ""}
            {change.toFixed(2)} ({isBullish ? "+" : ""}
            {changePct.toFixed(2)}%)
          </span>
        </div>

        {/* 24h High/Low Stats (Hidden on small screens) */}
        <div className="hidden xl:flex items-center gap-3 pl-2 border-l border-[#1A2A3F] text-[11px] font-mono tabular-nums text-[#7C8CA3]">
          {high24h && (
            <div>
              <span className="text-[#52627A]">H: </span>
              <span className="text-[#F7FAFC]">{high24h.toLocaleString()}</span>
            </div>
          )}
          {low24h && (
            <div>
              <span className="text-[#52627A]">L: </span>
              <span className="text-[#F7FAFC]">{low24h.toLocaleString()}</span>
            </div>
          )}
          {volume24h && (
            <div>
              <span className="text-[#52627A]">Vol: </span>
              <span className="text-[#F7FAFC]">{(volume24h / 1000).toFixed(1)}k</span>
            </div>
          )}
        </div>
      </div>

      {/* CENTER SECTION: Timeframe Selector & Indicators Button */}
      <div className="flex items-center gap-2">
        {/* Timeframe Bar */}
        <div className="flex items-center bg-[#0A1422] border border-[#1A2A3F] rounded-lg p-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => onSelectTimeframe(tf)}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                activeTimeframe === tf
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-[#7C8CA3] hover:text-[#F7FAFC] hover:bg-[#101B2D]"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Indicator Presets Dropdown */}
        <div className="relative hidden md:block" ref={presetsRef}>
          <button
            onClick={() => setIsPresetsOpen(!isPresetsOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#7C8CA3] hover:text-[#F7FAFC] bg-[#0A1422] hover:bg-[#101B2D] border border-[#1A2A3F] rounded-lg transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#19C5FF]" />
            <span>Presets</span>
            <ChevronDown className="w-3 h-3 text-[#52627A]" />
          </button>

          {isPresetsOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-60 bg-[#0A1422] border border-[#1A2A3F] rounded-lg shadow-2xl py-1 z-50 animate-in fade-in">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-[#52627A] border-b border-[#1A2A3F]">
                Indicator Setups
              </div>
              {STANDARD_INDICATOR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onSelectPreset?.(preset.id);
                    setIsPresetsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#101B2D] transition-colors"
                >
                  <div className="text-xs font-semibold text-[#F7FAFC]">{preset.name}</div>
                  <div className="text-[10px] text-[#7C8CA3]">{preset.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Alerts Button */}
        {onOpenAlerts && (
          <button
            onClick={onOpenAlerts}
            className="p-1.5 rounded-lg bg-[#0A1422] hover:bg-[#101B2D] border border-[#1A2A3F] text-[#7C8CA3] hover:text-[#F7FAFC] transition"
            title="Price & Indicator Alerts"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
}
