"use client";

import React, { useState } from "react";
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
  FileText,
  DollarSign,
  Globe,
  Volume2,
  VolumeX,
  Sliders,
  Download,
} from "lucide-react";

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
  rate: number; // multiplier relative to USD
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "USD", symbol: "$", label: "USD ($)", rate: 1.0 },
  { code: "INR", symbol: "₹", label: "INR (₹)", rate: 83.5 },
  { code: "EUR", symbol: "€", label: "EUR (€)", rate: 0.92 },
  { code: "GBP", symbol: "£", label: "GBP (£)", rate: 0.78 },
  { code: "BTC", symbol: "₿", label: "BTC (₿)", rate: 0.0000153 },
  { code: "ETH", symbol: "Ξ", label: "ETH (Ξ)", rate: 0.000292 },
];

interface LivePnLCommandHeaderProps {
  timeframe: string;
  onChangeTimeframe: (tf: string) => void;
  botFilter: string;
  onChangeBotFilter: (bot: string) => void;
  strategyFilter: string;
  onChangeStrategyFilter: (st: string) => void;
  tradingMode: "PAPER" | "LIVE";
  onToggleTradingMode: () => void;
  selectedCurrency: CurrencyOption;
  onChangeCurrency: (c: CurrencyOption) => void;
  brokerStatus?: string;
  dataStatus?: string;
  latencyMs?: number;
  isFetching?: boolean;
  onRefresh?: () => void;
  onOpenExporter?: () => void;
  audioChimesEnabled?: boolean;
  onToggleAudioChimes?: () => void;
}

export function LivePnLCommandHeader({
  timeframe,
  onChangeTimeframe,
  botFilter,
  onChangeBotFilter,
  strategyFilter,
  onChangeStrategyFilter,
  tradingMode,
  onToggleTradingMode,
  selectedCurrency,
  onChangeCurrency,
  brokerStatus = "CONNECTED",
  dataStatus = "LIVE",
  latencyMs = 24,
  isFetching,
  onRefresh,
  onOpenExporter,
  audioChimesEnabled = true,
  onToggleAudioChimes,
}: LivePnLCommandHeaderProps) {
  const timeframes = ["1D", "7D", "30D", "3M", "6M", "1Y", "YTD", "ALL"];
  const isLive = tradingMode === "LIVE";

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 font-mono select-none">
      {/* Top Bar: Title & Telemetry Strip */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Title & Terminal Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-white tracking-tight uppercase">
                QUANTOS INSTITUTIONAL P&L TERMINAL
              </h1>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  isLive
                    ? "bg-red-950 text-red-400 border border-red-800"
                    : "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40"
                }`}
              >
                ● {tradingMode}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-950 text-cyan-400 border border-cyan-800 hidden sm:inline-block">
                AUDITED MTM
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Authoritative financial accounting, high-water mark equity tracking, and multi-asset attribution
            </p>
          </div>
        </div>

        {/* Right Telemetry Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Multi-Currency Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#141E33] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedCurrency.code}
              onChange={(e) => {
                const found = CURRENCY_OPTIONS.find((c) => c.code === e.target.value);
                if (found) onChangeCurrency(found);
              }}
              className="bg-transparent text-white font-extrabold focus:outline-none cursor-pointer text-xs"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code} className="bg-[#0B111E] text-white">
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switcher */}
          <button
            type="button"
            onClick={onToggleTradingMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              isLive
                ? "bg-red-950/60 hover:bg-red-900 text-red-300 border-red-800"
                : "bg-[#123C2A] hover:bg-[#1B4D36] text-[#55C98A] border-[#39B978]/40"
            }`}
          >
            Switch to {isLive ? "PAPER" : "LIVE"}
          </button>

          {/* Institutional Statement Export Button */}
          <button
            type="button"
            onClick={onOpenExporter}
            className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 hover:text-white border border-cyan-800 text-xs font-bold transition flex items-center gap-1.5"
            title="Generate Official P&L Statement & Download CSV"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Statement</span>
          </button>

          {/* Audio Chime Toggle */}
          {onToggleAudioChimes && (
            <button
              type="button"
              onClick={onToggleAudioChimes}
              className={`p-2 rounded-xl border transition ${
                audioChimesEnabled
                  ? "bg-[#123C2A] text-emerald-400 border-emerald-600/40"
                  : "bg-[#141E33] text-slate-500 border-slate-700"
              }`}
              title={audioChimesEnabled ? "Audio chimes active for wins" : "Audio chimes muted"}
            >
              {audioChimesEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="p-2 rounded-xl bg-[#141E33] hover:bg-slate-800 text-slate-300 border border-slate-700 transition disabled:opacity-50"
            title="Refresh P&L and Account State"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Control Bar: Timeframe Range Buttons & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
        {/* Timeframe Range Selector */}
        <div className="flex items-center gap-1 bg-[#141E33] border border-slate-700 rounded-xl p-1 overflow-x-auto">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onChangeTimeframe(tf)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                timeframe === tf
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Bot & Strategy Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
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
              <option value="bot-4" className="bg-[#0B111E]">Delta Crypto Options Scalper (bot-4)</option>
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
              <option value="Delta Gamma Scalper" className="bg-[#0B111E]">Delta Gamma Scalper</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
