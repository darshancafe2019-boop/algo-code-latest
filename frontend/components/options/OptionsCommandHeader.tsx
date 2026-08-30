"use client";

import React from "react";
import {
  Layers,
  Calendar,
  Radio,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Table,
  Flame,
  LineChart,
  ShieldCheck,
  Compass,
  Sliders,
} from "lucide-react";
import { RawExpiryItem } from "@/types/option-chain";
import { normalizeExpiriesList, formatDaysToExpiryLabel } from "@/lib/expiry-utils";

interface OptionsCommandHeaderProps {
  underlying: string;
  onChangeUnderlying: (u: string) => void;
  selectedExpiry: string;
  onChangeExpiry: (exp: string) => void;
  availableExpiries: RawExpiryItem[];
  spotPrice: number;
  spotChange24h?: number;
  strikeRange: number;
  onChangeStrikeRange: (r: number) => void;
  viewMode: "table" | "heatmap" | "skew" | "strategy" | "scanner";
  onChangeViewMode: (mode: "table" | "heatmap" | "skew" | "strategy" | "scanner") => void;
  dataStatus?: string;
  latencyMs?: number;
  isFetching?: boolean;
  onRefresh?: () => void;
}

export function OptionsCommandHeader({
  underlying,
  onChangeUnderlying,
  selectedExpiry,
  onChangeExpiry,
  availableExpiries,
  spotPrice,
  spotChange24h = 1.85,
  strikeRange,
  onChangeStrikeRange,
  viewMode,
  onChangeViewMode,
  dataStatus = "LIVE",
  latencyMs = 28,
  isFetching,
  onRefresh,
}: OptionsCommandHeaderProps) {
  const underlyingsList = [
    { id: "BTC", name: "BTC / USD (Delta)", category: "Crypto", currency: "$" },
    { id: "ETH", name: "ETH / USD (Delta)", category: "Crypto", currency: "$" },
    { id: "XAUT", name: "XAUT / USD (Delta)", category: "Crypto", currency: "$" },
    { id: "NIFTY", name: "NIFTY 50", category: "Index", currency: "₹" },
    { id: "BANKNIFTY", name: "BANK NIFTY", category: "Index", currency: "₹" },
    { id: "FINNIFTY", name: "FINNIFTY", category: "Index", currency: "₹" },
    { id: "SENSEX", name: "SENSEX", category: "Index", currency: "₹" },
    { id: "RELIANCE", name: "RELIANCE", category: "Stock", currency: "₹" },
    { id: "TCS", name: "TCS", category: "Stock", currency: "₹" },
  ];

  const currentObj = underlyingsList.find((u) => u.id === underlying) || underlyingsList[0];
  const isPositive = spotChange24h >= 0;

  // Normalized Expiries Presentation Options
  const normalizedExpiries = React.useMemo(() => {
    return normalizeExpiriesList(availableExpiries, underlying);
  }, [availableExpiries, underlying]);

  const activeExpiryOpt = normalizedExpiries.find(
    (e) => e.value === selectedExpiry || e.dateString === selectedExpiry
  );

  // Calculate Days to Expiry (DTE)
  let daysToExpiry = typeof activeExpiryOpt?.daysToExpiry === "number" ? Math.round(activeExpiryOpt.daysToExpiry) : 0;
  if (daysToExpiry === 0 && selectedExpiry) {
    try {
      const expDate = new Date(selectedExpiry);
      const now = new Date();
      daysToExpiry = Math.max(0, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    } catch {
      daysToExpiry = 0;
    }
  }

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Top Bar: Title, Underlying Pills, Live Telemetry */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Title & Underlying Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  LIVE OPTION CHAIN & DERIVATIVES COMMAND CENTER
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  BLACK-SCHOLES GREEKS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Institutional strike-centered ladder, open interest analytics, and multi-leg strategy engine
              </p>
            </div>
          </div>
        </div>

        {/* Live Spot Quote & Telemetry */}
        <div className="flex items-center gap-4 bg-[#141E33] border border-[#1E293B] rounded-xl p-2.5 px-4 text-xs font-mono">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Underlying Spot</div>
            <div className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>{currentObj.currency}{spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={`text-xs font-semibold flex items-center ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? "+" : ""}{spotChange24h}%
              </span>
            </div>
          </div>

          <div className="border-l border-slate-700 pl-3 hidden sm:block">
            <div className="text-[10px] text-slate-400 uppercase">Feed Status</div>
            <div className="text-cyan-400 font-bold flex items-center gap-1">
              <Radio className="w-3 h-3 text-cyan-400" />
              <span>{dataStatus} ({latencyMs}ms)</span>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isFetching}
            className="p-1.5 rounded-lg bg-[#0B111E] hover:bg-slate-800 text-slate-300 transition-all disabled:opacity-50"
            title="Refresh option chain"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Underlying Selector Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-b border-slate-800/80 pt-2">
        {underlyingsList.map((u) => {
          const isSelected = underlying === u.id;
          return (
            <button
              key={u.id}
              onClick={() => onChangeUnderlying(u.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isSelected
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40"
                  : "bg-[#141E33] text-slate-400 hover:text-slate-200 hover:bg-[#1A2640]"
              }`}
            >
              <span>{u.name}</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-normal ${
                isSelected ? "bg-slate-950/30 text-slate-950" : "bg-slate-800 text-slate-400"
              }`}>
                {u.category}
              </span>
            </button>
          );
        })}
      </div>

      {/* Expiry Selector, Strike Range, and View Modes */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-1 text-xs font-mono">
        {/* Expiry Dropdown & DTE */}
        <div className="flex items-center gap-2">
          <label className="text-slate-400 flex items-center gap-1 uppercase text-[10px]">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            Expiry:
          </label>
          <select
            value={selectedExpiry}
            onChange={(e) => onChangeExpiry(e.target.value)}
            className="bg-[#141E33] border border-slate-700 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-bold"
          >
            {normalizedExpiries && normalizedExpiries.length > 0 ? (
              normalizedExpiries.map((opt) => (
                <option key={opt.key} value={opt.value}>
                  {opt.label}
                </option>
              ))
            ) : (
              <option value="">Syncing Expiries...</option>
            )}
          </select>
          {daysToExpiry > 0 && (
            <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-semibold text-[10px]">
              {daysToExpiry} Days to Expiry
            </span>
          )}
        </div>

        {/* Strike Range & View Mode Switcher */}
        <div className="flex items-center gap-3">
          {/* Strike Range */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase">Strikes:</span>
            {[10, 20, 50, 100].map((num) => (
              <button
                key={num}
                onClick={() => onChangeStrikeRange(num)}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                  strikeRange === num
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-[#141E33] text-slate-400 hover:text-white"
                }`}
              >
                ±{num / 2}
              </button>
            ))}
          </div>

          {/* View Modes */}
          <div className="flex items-center bg-[#141E33] border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => onChangeViewMode("table")}
              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                viewMode === "table" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
              title="Strike-centered ladder table"
            >
              <Table className="w-3 h-3" />
              Ladder
            </button>

            <button
              onClick={() => onChangeViewMode("heatmap")}
              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                viewMode === "heatmap" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
              title="Open interest heatmap"
            >
              <Flame className="w-3 h-3" />
              OI Heatmap
            </button>

            <button
              onClick={() => onChangeViewMode("skew")}
              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                viewMode === "skew" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
              title="Implied volatility smile and skew"
            >
              <LineChart className="w-3 h-3" />
              IV Skew
            </button>

            <button
              onClick={() => onChangeViewMode("strategy")}
              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                viewMode === "strategy" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
              title="Multi-leg strategy builder & payoff analyzer"
            >
              <Compass className="w-3 h-3" />
              Strategy Lab
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
