"use client";

import React from "react";
import {
  Calendar,
  Layers,
  Filter,
  RefreshCw,
  Download,
  TrendingUp,
  Cpu,
  Shield,
  Activity,
  DollarSign,
  ChevronDown,
  Globe,
  Check,
} from "lucide-react";

export interface JournalFilterState {
  period: string;
  broker: string;
  account: string;
  mode: string;
  asset: string;
  market: string;
  strategy: string;
  setup: string;
  direction: string;
  currency: string;
}

interface JournalFilterBarProps {
  filters: JournalFilterState;
  onChangeFilter: <K extends keyof JournalFilterState>(key: K, value: JournalFilterState[K]) => void;
  onResetFilters: () => void;
  onRefresh: () => void;
  isFetching?: boolean;
  onExportCsv?: () => void;
  activeView: string;
  onChangeView: (view: string) => void;
}

export const PERIOD_OPTIONS = [
  { id: "TODAY", label: "Today" },
  { id: "7D", label: "7 Days" },
  { id: "30D", label: "30 Days" },
  { id: "THIS_MONTH", label: "This Month" },
  { id: "LAST_MONTH", label: "Last Month" },
  { id: "3M", label: "3 Months" },
  { id: "6M", label: "6 Months" },
  { id: "YTD", label: "YTD" },
  { id: "1Y", label: "1 Year" },
  { id: "ALL", label: "All Time" },
];

export const BROKER_OPTIONS = [
  { id: "ALL", label: "All Accounts" },
  { id: "DHAN", label: "Dhan HQ" },
  { id: "UPSTOX", label: "Upstox Pro" },
  { id: "DELTA", label: "Delta Exchange India" },
  { id: "BINANCE", label: "Binance Global" },
  { id: "PAPER", label: "Paper Simulator" },
];

export const MODE_OPTIONS = [
  { id: "ALL", label: "All Modes" },
  { id: "PAPER", label: "Paper Mode" },
  { id: "SHADOW", label: "Shadow Mode" },
  { id: "LIVE", label: "Live Mode" },
];

export const ASSET_OPTIONS = [
  { id: "ALL", label: "All Assets" },
  { id: "OPTIONS", label: "Options" },
  { id: "FUTURES", label: "Futures" },
  { id: "STOCKS", label: "Stocks / Equity" },
  { id: "CRYPTO", label: "Crypto" },
  { id: "FOREX", label: "Forex" },
  { id: "COMMODITIES", label: "Commodities" },
];

export const MARKET_OPTIONS = [
  { id: "ALL", label: "All Markets" },
  { id: "INDIAN_EQUITY", label: "Indian Equity" },
  { id: "INDIAN_OPTIONS", label: "Indian Options" },
  { id: "INDIAN_FUTURES", label: "Indian Futures" },
  { id: "CRYPTO", label: "Crypto Derivatives" },
  { id: "FOREX", label: "Global FX" },
  { id: "COMMODITIES", label: "MCX Commodities" },
  { id: "GLOBAL", label: "CME / Global" },
];

export const STRATEGY_OPTIONS = [
  { id: "ALL", label: "All Strategies" },
  { id: "EMA_MACD_VP", label: "EMA MACD Volume" },
  { id: "Breakout Hunter", label: "Breakout Hunter" },
  { id: "Trend Confluence", label: "Trend Confluence" },
  { id: "Iron Condor Scalper", label: "Iron Condor Scalper" },
  { id: "Funding Carry Arbitrage", label: "Funding Carry Arbitrage" },
  { id: "Mean Reversion", label: "Mean Reversion" },
];

export const SETUP_OPTIONS = [
  { id: "ALL", label: "All Setups" },
  { id: "Breakout", label: "Breakout" },
  { id: "Pullback", label: "Pullback" },
  { id: "Reversal", label: "Reversal" },
  { id: "Range", label: "Range" },
  { id: "Squeeze", label: "Squeeze" },
  { id: "Momentum", label: "Momentum" },
  { id: "Mean Reversion", label: "Mean Reversion" },
];

export const CURRENCY_OPTIONS = [
  { id: "INR", symbol: "₹", label: "INR (₹)" },
  { id: "USD", symbol: "$", label: "USD ($)" },
  { id: "USDT", symbol: "₮", label: "USDT (₮)" },
  { id: "EUR", symbol: "€", label: "EUR (€)" },
  { id: "GBP", symbol: "£", label: "GBP (£)" },
];

export function JournalFilterBar({
  filters,
  onChangeFilter,
  onResetFilters,
  onRefresh,
  isFetching = false,
  onExportCsv,
  activeView,
  onChangeView,
}: JournalFilterBarProps) {
  return (
    <div className="bg-[#0b101b]/95 border border-[#1e293b] rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl select-none font-mono space-y-3.5">
      {/* 1. Top Section: Title, View Switcher & Action Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-[#1e293b]/80 pb-3">
        {/* Title & Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-inner">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-wider uppercase">
                QUANT.OS P&L COMMAND CENTER
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                AUTHORITATIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Spreadsheet Trading Journal • Multi-Broker Consolidated Ledger
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#070b12] p-1 rounded-xl border border-slate-800/80">
          {[
            { id: "JOURNAL", label: "TRADING JOURNAL" },
            { id: "EQUITY_CURVE", label: "EQUITY CURVE" },
            { id: "CALENDAR_HEATMAP", label: "CALENDAR HEATMAP" },
            { id: "ATTRIBUTION", label: "ATTRIBUTION" },
            { id: "CAPITAL_SEGREGATION", label: "CAPITAL LEDGER" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChangeView(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === tab.id
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Buttons: Refresh & Export */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          <button
            onClick={onRefresh}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs border border-slate-700 transition active:scale-95 disabled:opacity-50"
            title="Refresh All Real Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-sky-400" : ""}`} />
            <span className="hidden sm:inline">Sync Data</span>
          </button>

          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs border border-emerald-500/30 transition active:scale-95"
              title="Export Full CSV Ledger"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Bottom Section: 10 Comprehensive Filter Dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2 text-xs">
        {/* Period */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Period</label>
          <div className="relative">
            <select
              value={filters.period}
              onChange={(e) => onChangeFilter("period", e.target.value)}
              className="w-full bg-[#0e1626] border border-slate-700/80 hover:border-sky-500/60 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 appearance-none focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Broker */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Broker</label>
          <div className="relative">
            <select
              value={filters.broker}
              onChange={(e) => onChangeFilter("broker", e.target.value)}
              className="w-full bg-[#0e1626] border border-slate-700/80 hover:border-sky-500/60 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 appearance-none focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              {BROKER_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Mode */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Mode</label>
          <div className="relative">
            <select
              value={filters.mode}
              onChange={(e) => onChangeFilter("mode", e.target.value)}
              className="w-full bg-[#0e1626] border border-slate-700/80 hover:border-sky-500/60 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 appearance-none focus:outline-none focus:border-sky-400 cursor-pointer font-bold"
            >
              {MODE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Asset */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Asset</label>
          <div className="relative">
            <select
              value={filters.asset}
              onChange={(e) => onChangeFilter("asset", e.target.value)}
              className="w-full bg-[#0e1626] border border-slate-700/80 hover:border-sky-500/60 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 appearance-none focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              {ASSET_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Market */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Market</label>
          <div className="relative">
            <select
              value={filters.market}
              onChange={(e) => onChangeFilter("market", e.target.value)}
              className="w-full bg-[#0e1626] border border-slate-700/80 hover:border-sky-500/60 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 appearance-none focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              {MARKET_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Strategy */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Strategy</label>
          <div className="relative">
            <select
              value={filters.strategy}
              onChange={(e) => onChangeFilter("strategy", e.target.value)}
              className="w-full bg-[#0e1626] border border-slate-700/80 hover:border-sky-500/60 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 appearance-none focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              {STRATEGY_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Setup */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Setup</label>
          <div className="relative">
            <select
              value={filters.setup}
              onChange={(e) => onChangeFilter("setup", e.target.value)}
              className="w-full bg-[#0e1626] border border-slate-700/80 hover:border-sky-500/60 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 appearance-none focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              {SETUP_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Direction */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Direction</label>
          <div className="relative">
            <select
              value={filters.direction}
              onChange={(e) => onChangeFilter("direction", e.target.value)}
              className="w-full bg-[#0e1626] border border-slate-700/80 hover:border-sky-500/60 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 appearance-none focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              <option value="ALL">All (Long & Short)</option>
              <option value="LONG">Long (Buy)</option>
              <option value="SHORT">Short (Sell)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Account */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Account</label>
          <div className="relative">
            <select
              value={filters.account}
              onChange={(e) => onChangeFilter("account", e.target.value)}
              className="w-full bg-[#0e1626] border border-slate-700/80 hover:border-sky-500/60 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 appearance-none focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              <option value="ALL">All Accounts</option>
              <option value="ACC-01">Primary (ACC-01)</option>
              <option value="ACC-02">Derivatives (ACC-02)</option>
              <option value="ACC-03">Crypto (ACC-03)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Currency */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Currency</label>
          <div className="relative">
            <select
              value={filters.currency}
              onChange={(e) => onChangeFilter("currency", e.target.value)}
              className="w-full bg-[#0e1626] border border-slate-700/80 hover:border-sky-500/60 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 appearance-none focus:outline-none focus:border-sky-400 cursor-pointer font-bold text-sky-400"
            >
              {CURRENCY_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
