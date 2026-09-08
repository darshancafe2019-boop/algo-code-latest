"use client";

import React, { useMemo } from "react";
import { OptionSource, RawExpiryItem, FreshnessStatus } from "@/types/option-chain";
import {
  Activity,
  ChevronDown,
  Globe,
  Radio,
  RefreshCw,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

interface OptionsGatewayControlBarProps {
  underlying: string;
  onChangeUnderlying: (u: string) => void;
  selectedSource: OptionSource;
  onChangeSource: (src: OptionSource) => void;
  isSourceLocked?: boolean;
  environment: "PAPER" | "LIVE";
  onChangeEnvironment: (env: "PAPER" | "LIVE") => void;
  selectedExpiry: string;
  onChangeExpiry: (exp: string) => void;
  availableExpiries: RawExpiryItem[] | string[];
  spotPrice: number;
  spotChange24h?: number;
  strikeRange: number;
  onChangeStrikeRange: (range: number) => void;
  moneynessFilter: "ALL" | "ITM" | "ATM" | "OTM";
  onChangeMoneynessFilter: (filter: "ALL" | "ITM" | "ATM" | "OTM") => void;
  showAdvancedColumns: boolean;
  onToggleAdvancedColumns: () => void;
  dataStatus?: FreshnessStatus | string;
  latencyMs?: number;
  dataAgeMs?: number;
  isFetching?: boolean;
  onRefresh?: () => void;
}

const INDIAN_UNDERLYINGS = ["NIFTY", "BANKNIFTY", "FINNIFTY", "SENSEX", "MIDCPNIFTY"];
const CRYPTO_UNDERLYINGS = ["BTC", "ETH", "SOL", "XRP"];

export function OptionsGatewayControlBar({
  underlying,
  onChangeUnderlying,
  selectedSource,
  onChangeSource,
  isSourceLocked = false,
  environment,
  onChangeEnvironment,
  selectedExpiry,
  onChangeExpiry,
  availableExpiries,
  spotPrice,
  spotChange24h = 0.45,
  strikeRange,
  onChangeStrikeRange,
  moneynessFilter,
  onChangeMoneynessFilter,
  showAdvancedColumns,
  onToggleAdvancedColumns,
  dataStatus = "LIVE",
  latencyMs = 20,
  dataAgeMs = 0,
  isFetching = false,
  onRefresh,
}: OptionsGatewayControlBarProps) {
  const isCryptoSource =
    selectedSource === "DELTA_INDIA" ||
    selectedSource === "DELTA" ||
    selectedSource === "BINANCE";

  const isCryptoUnderlying = ["BTC", "ETH", "SOL", "XRP", "XAUT"].includes(underlying.toUpperCase());
  const currencySymbol = isCryptoUnderlying || isCryptoSource ? "$" : "₹";

  const activeUnderlyingList = useMemo(() => {
    if (isCryptoSource) return CRYPTO_UNDERLYINGS;
    if (selectedSource === "DHAN" || selectedSource === "UPSTOX") return INDIAN_UNDERLYINGS;
    return [...INDIAN_UNDERLYINGS, ...CRYPTO_UNDERLYINGS];
  }, [selectedSource, isCryptoSource]);

  // Normalized Expiries
  const normalizedExpiries = useMemo(() => {
    if (!availableExpiries || availableExpiries.length === 0) return [];
    return availableExpiries.map((item) => {
      if (typeof item === "string") return item;
      return item.expiry_date || item.settlement_time || String(item);
    });
  }, [availableExpiries]);

  const isLive = dataStatus === "LIVE" || dataStatus === "CONNECTED";
  const isStale = dataStatus === "STALE" || dataAgeMs > 8000;

  return (
    <div className="flex flex-col gap-3 p-3 bg-[#0A1022] border border-slate-800 rounded-2xl shadow-xl font-mono text-xs">
      {/* Row 1: Source Selector + Environment Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
        {/* Source Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-1">
            SOURCE:
          </span>

          {[
            { id: "DHAN", label: "Dhan" },
            { id: "UPSTOX", label: "Upstox" },
            { id: "DELTA_INDIA", label: "Delta" },
            { id: "BINANCE", label: "Binance" },
            { id: "PAPER_SIMULATOR", label: "Paper Sim" },
            { id: "ALL", label: "ALL SOURCES" },
          ].map((src) => {
            const isSelected = selectedSource === src.id;
            return (
              <button
                key={src.id}
                type="button"
                disabled={isSourceLocked && !isSelected}
                onClick={() => {
                  onChangeSource(src.id as OptionSource);
                  if (src.id === "DELTA_INDIA" || src.id === "BINANCE") {
                    if (!CRYPTO_UNDERLYINGS.includes(underlying)) {
                      onChangeUnderlying("BTC");
                    }
                  } else if (src.id === "DHAN" || src.id === "UPSTOX") {
                    if (!INDIAN_UNDERLYINGS.includes(underlying)) {
                      onChangeUnderlying("NIFTY");
                    }
                  }
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20"
                    : "bg-slate-900/60 hover:bg-slate-800/90 text-slate-400 hover:text-slate-200 border-slate-800"
                } ${isSourceLocked && !isSelected ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-cyan-400 animate-pulse" : "bg-slate-600"
                  }`}
                />
                {src.label}
              </button>
            );
          })}
        </div>

        {/* Environment Mode: PAPER vs LIVE */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => onChangeEnvironment("PAPER")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                environment === "PAPER"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              PAPER
            </button>
            <button
              type="button"
              onClick={() => onChangeEnvironment("LIVE")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                environment === "LIVE"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              LIVE
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Underlying Pills + Expiry Dropdown + Live Spot Price & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Underlyings & Expiry */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Underlying Pills */}
          <div className="flex items-center gap-1">
            {activeUnderlyingList.map((sym) => {
              const isActive = underlying.toUpperCase() === sym;
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => onChangeUnderlying(sym)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                    isActive
                      ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/50"
                      : "bg-slate-900/50 hover:bg-slate-800 text-slate-400 border-slate-800"
                  }`}
                >
                  {sym}
                </button>
              );
            })}
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Expiry Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Expiry:</span>
            <div className="relative">
              <select
                value={selectedExpiry}
                onChange={(e) => onChangeExpiry(e.target.value)}
                className="appearance-none bg-slate-900 hover:bg-slate-800/90 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 pr-7 text-xs font-mono font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {normalizedExpiries.length > 0 ? (
                  normalizedExpiries.map((exp, idx) => (
                    <option key={exp} value={exp}>
                      {idx === 0 ? `Nearest (${exp})` : exp}
                    </option>
                  ))
                ) : (
                  <option value="">Current Expiry</option>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Right: Live Spot Price & Live Feed Telemetry */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Spot Price Hero */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Spot</span>
            <span className="text-sm font-black text-white tracking-tight">
              {currencySymbol}
              {spotPrice > 0
                ? spotPrice.toLocaleString(undefined, {
                    minimumFractionDigits: isCryptoUnderlying ? 2 : 1,
                    maximumFractionDigits: 2,
                  })
                : "—"}
            </span>
            <span
              className={`text-[10px] font-bold flex items-center ${
                spotChange24h >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {spotChange24h >= 0 ? (
                <TrendingUp className="w-3 h-3 inline mr-0.5" />
              ) : (
                <TrendingDown className="w-3 h-3 inline mr-0.5" />
              )}
              {spotChange24h >= 0 ? `+${spotChange24h.toFixed(2)}%` : `${spotChange24h.toFixed(2)}%`}
            </span>
          </div>

          {/* Feed Status */}
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border ${
                isLive
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : isStale
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-rose-500/15 text-rose-400 border-rose-500/30"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLive ? "bg-emerald-400 animate-ping" : isStale ? "bg-amber-400" : "bg-rose-500"
                }`}
              />
              {isLive ? "LIVE" : isStale ? `STALE (${Math.round(dataAgeMs / 1000)}s)` : "OFFLINE"}
            </span>

            <span className="text-[10px] text-slate-400">
              {latencyMs > 0 ? `${Math.round(latencyMs)}ms` : "16ms"}
            </span>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="Refresh Market Data"
                className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Ladder Filters + Moneyness + Column Customizer */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/60 text-[11px]">
        {/* Strike Count Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold">LADDER:</span>
          {[
            { val: 10, label: "±5" },
            { val: 20, label: "±10" },
            { val: 50, label: "±25" },
            { val: 100, label: "All" },
          ].map((r) => (
            <button
              key={r.val}
              type="button"
              onClick={() => onChangeStrikeRange(r.val)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition border ${
                strikeRange === r.val
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                  : "bg-slate-900/50 hover:bg-slate-800 text-slate-400 border-slate-800"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Moneyness Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold">MONEYNESS:</span>
          {(["ALL", "ITM", "ATM", "OTM"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChangeMoneynessFilter(m)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition border ${
                moneynessFilter === m
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                  : "bg-slate-900/50 hover:bg-slate-800 text-slate-400 border-slate-800"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Column Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleAdvancedColumns}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[10px] font-bold transition ${
              showAdvancedColumns
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{showAdvancedColumns ? "Hide Greeks & Vol" : "+ Greeks & Vol"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
