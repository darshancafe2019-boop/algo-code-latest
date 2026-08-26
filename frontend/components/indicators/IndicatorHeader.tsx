"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Sliders,
  MoreHorizontal,
  RefreshCw,
  BarChart3,
  GitCompare,
  Activity,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown
} from "lucide-react";

interface IndicatorHeaderProps {
  symbol: string;
  onSelectSymbol: (sym: string) => void;
  timeframe: string;
  onSelectTimeframe: (tf: string) => void;
  activeCount: number;
  totalCount: number;
  isLive: boolean;
  isSyncing: boolean;
  onRefresh: () => void;
  onOpenAddModal: () => void;
  onOpenPresets: () => void;
  onOpenBacktest: () => void;
  onOpenCompare: () => void;
  onOpenDiagnostics: () => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  onResetAll: () => void;
}

const SUPPORTED_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];
const POPULAR_SYMBOLS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "NIFTY"];

export function IndicatorHeader({
  symbol,
  onSelectSymbol,
  timeframe,
  onSelectTimeframe,
  activeCount,
  totalCount,
  isLive,
  isSyncing,
  onRefresh,
  onOpenAddModal,
  onOpenPresets,
  onOpenBacktest,
  onOpenCompare,
  onOpenDiagnostics,
  onEnableAll,
  onDisableAll,
  onResetAll,
}: IndicatorHeaderProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const symbolDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
      if (symbolDropdownRef.current && !symbolDropdownRef.current.contains(event.target as Node)) {
        setIsSymbolDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Title & Quick Market / Timeframe Controls */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 font-sans">
                Indicators
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold tracking-wider rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                PRO ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Live quantitative indicators and deterministic confluence signals
            </p>
          </div>

          <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />

          {/* Market / Symbol Selector */}
          <div className="relative" ref={symbolDropdownRef}>
            <button
              onClick={() => setIsSymbolDropdownOpen(!isSymbolDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141E33] border border-slate-700 hover:border-cyan-500/50 text-xs font-mono font-bold text-white transition-all shadow-sm"
              title="Change Market / Symbol"
            >
              <span className="text-slate-400 font-sans text-[11px]">Market:</span>
              <span className="text-cyan-400">{symbol}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isSymbolDropdownOpen && (
              <div className="absolute left-0 mt-1 w-40 bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl z-30 py-1 font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase font-sans border-b border-slate-800">
                  Select Market
                </div>
                {POPULAR_SYMBOLS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onSelectSymbol(s);
                      setIsSymbolDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#1E293B] transition-colors flex items-center justify-between ${
                      s === symbol ? "text-cyan-400 font-bold bg-cyan-500/10" : "text-slate-200"
                    }`}
                  >
                    <span>{s}</span>
                    {s === symbol && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timeframe Selector Pills */}
          <div className="flex items-center gap-1 bg-[#141E33] border border-slate-800 p-0.5 rounded-xl">
            {SUPPORTED_TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => onSelectTimeframe(tf)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                  tf === timeframe
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Live Data Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isLive ? "LIVE" : "DATA"}</span>
          </div>

          {/* Active Count Badge */}
          <div className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold">
            <span>{activeCount} Active</span>
          </div>
        </div>

        {/* Right: Primary Action Buttons */}
        <div className="flex items-center gap-2 self-end lg:self-center">
          {/* Add Indicator */}
          <button
            onClick={onOpenAddModal}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-sans transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Indicator</span>
          </button>

          {/* Presets Button */}
          <button
            onClick={onOpenPresets}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#141E33] hover:bg-[#1C2A47] text-slate-200 border border-slate-700 hover:border-slate-600 font-sans transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Presets</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isSyncing}
            className="p-2 text-xs rounded-xl bg-[#141E33] hover:bg-[#1E293B] text-slate-300 border border-slate-700 hover:border-slate-600 transition-all disabled:opacity-50"
            title="Recalculate live indicators"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          {/* Secondary Actions Dropdown (••• More) */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={`p-2 text-xs rounded-xl border transition-all ${
                isMoreOpen
                  ? "bg-[#1E293B] text-white border-cyan-500/50"
                  : "bg-[#141E33] hover:bg-[#1E293B] text-slate-300 border-slate-700 hover:border-slate-600"
              }`}
              title="More Actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMoreOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl z-40 py-1.5 font-sans text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase font-mono border-b border-slate-800 mb-1">
                  Analysis & Testing
                </div>
                <button
                  onClick={() => {
                    onOpenBacktest();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-slate-200 hover:text-cyan-400 transition-colors flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>Backtest Indicators</span>
                </button>
                <button
                  onClick={() => {
                    onOpenCompare();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-slate-200 hover:text-cyan-400 transition-colors flex items-center gap-2"
                >
                  <GitCompare className="w-4 h-4 text-cyan-400" />
                  <span>Compare Indicators</span>
                </button>
                <button
                  onClick={() => {
                    onOpenDiagnostics();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-slate-200 hover:text-cyan-400 transition-colors flex items-center gap-2"
                >
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span>Engine Diagnostics</span>
                </button>

                <div className="border-t border-slate-800 my-1" />
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase font-mono border-b border-slate-800 mb-1">
                  Bulk Actions
                </div>
                <button
                  onClick={() => {
                    onEnableAll();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-emerald-400 transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enable All</span>
                </button>
                <button
                  onClick={() => {
                    onDisableAll();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-red-400 transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Disable All</span>
                </button>
                <button
                  onClick={() => {
                    onResetAll();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Overrides</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
