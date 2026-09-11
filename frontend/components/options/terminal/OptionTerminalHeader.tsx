"use client";

import React from "react";
import {
  Activity,
  Zap,
  RefreshCw,
  Clock,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  ChevronDown,
} from "lucide-react";
import { MarketSessionStatus } from "@/types/option-terminal";
import { formatIndianCurrency } from "@/lib/options/options-analytics-engine";

interface OptionTerminalHeaderProps {
  underlying: string;
  onChangeUnderlying: (val: string) => void;
  spotPrice: number;
  spotChange: number;
  spotChangePercent: number;
  marketStatus: MarketSessionStatus;
  selectedExpiry: string;
  onChangeExpiry: (exp: string) => void;
  availableExpiries: Array<{ expiry: string; daysToExpiry: number; label: string; isWeekly: boolean }>;
  source: string;
  onChangeSource?: (src: string) => void;
  isSourceLocked?: boolean;
  environment: "LIVE" | "PAPER";
  onChangeEnvironment?: (env: "LIVE" | "PAPER") => void;
  freshnessStatus: "LIVE" | "RECENT" | "STALE" | "OFFLINE";
  dataAgeMs: number;
  latencyMs: number;
  isFetching: boolean;
  onRefresh: () => void;
}

const UNDERLYING_PRESETS = [
  { group: "NSE Indices", items: ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX"] },
  { group: "NSE Equities", items: ["RELIANCE", "HDFCBANK", "ICICIBANK", "TCS", "INFY", "TATAMOTORS", "SBIN"] },
  { group: "Crypto Derivatives", items: ["BTC", "ETH", "SOL", "XRP"] },
];

export const OptionTerminalHeader: React.FC<OptionTerminalHeaderProps> = ({
  underlying,
  onChangeUnderlying,
  spotPrice,
  spotChange,
  spotChangePercent,
  marketStatus,
  selectedExpiry,
  onChangeExpiry,
  availableExpiries,
  source,
  onChangeSource,
  isSourceLocked = false,
  environment,
  onChangeEnvironment,
  freshnessStatus,
  dataAgeMs,
  latencyMs,
  isFetching,
  onRefresh,
}) => {
  const isPositive = spotChange >= 0;
  const isCrypto = ["BTC", "ETH", "SOL", "XRP"].includes(underlying);
  const currency = isCrypto ? "$" : "₹";

  const getMarketStatusBadge = () => {
    switch (marketStatus) {
      case "OPEN":
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            MARKET OPEN
          </span>
        );
      case "PRE_OPEN":
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300">
            <Clock className="w-3 h-3" />
            PRE-OPEN (IST)
          </span>
        );
      case "POST_MARKET":
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-[10px] font-mono font-bold text-sky-300">
            <Clock className="w-3 h-3" />
            POST-MARKET
          </span>
        );
      case "CLOSED":
      default:
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            MARKET CLOSED
          </span>
        );
    }
  };

  const getConnectionBadge = () => {
    if (freshnessStatus === "LIVE") {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE ({latencyMs}ms)
        </span>
      );
    }
    if (freshnessStatus === "STALE") {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          STALE ({Math.round(dataAgeMs / 1000)}s)
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        OFFLINE
      </span>
    );
  };

  return (
    <header className="bg-[#090E17] border border-slate-800/90 rounded-xl px-3 py-2 text-slate-100 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Underlying Selector + Live Spot Ticker */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Underlying dropdown */}
          <div className="relative">
            <select
              value={underlying}
              onChange={(e) => onChangeUnderlying(e.target.value)}
              className="bg-[#0E1726] border border-cyan-500/40 text-cyan-300 font-mono font-bold text-sm rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
            >
              {UNDERLYING_PRESETS.map((grp) => (
                <optgroup key={grp.group} label={grp.group} className="bg-slate-900 text-slate-300">
                  {grp.items.map((item) => (
                    <option key={item} value={item} className="bg-slate-900 text-white font-mono">
                      {item}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Spot Price and Daily Change */}
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-lg font-extrabold text-white tracking-tight">
              {formatIndianCurrency(spotPrice, currency)}
            </span>
            <div
              className={`flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded ${
                isPositive ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
              }`}
            >
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>
                {isPositive ? "+" : ""}
                {spotChange.toFixed(2)} ({isPositive ? "+" : ""}
                {spotChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Market Status (IST Clock) */}
          <div className="hidden sm:block">{getMarketStatusBadge()}</div>
        </div>

        {/* Right: Expiry + Mode + Telemetry + Refresh */}
        <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
          {/* Expiry Selector */}
          <div className="flex items-center gap-1.5 bg-[#0E1726] border border-slate-700/80 rounded-lg px-2.5 py-1">
            <span className="text-[10px] text-slate-400 uppercase">EXPIRY:</span>
            <select
              value={selectedExpiry}
              onChange={(e) => onChangeExpiry(e.target.value)}
              className="bg-transparent text-white font-bold font-mono outline-none cursor-pointer text-xs"
            >
              {availableExpiries.map((exp) => (
                <option key={exp.expiry} value={exp.expiry} className="bg-slate-900 text-white">
                  {exp.label} {exp.isWeekly ? "• W" : "• M"}
                </option>
              ))}
            </select>
          </div>

          {/* Source / Broker Provider */}
          {onChangeSource && !isSourceLocked && (
            <select
              value={source}
              onChange={(e) => onChangeSource(e.target.value)}
              className="bg-[#0E1726] border border-slate-700/80 text-purple-300 font-bold rounded-lg px-2 py-1 outline-none cursor-pointer text-xs"
            >
              <option value="ALL">ALL PROVIDERS</option>
              <option value="DHAN">DHAN HQ v2</option>
              <option value="UPSTOX">UPSTOX v3</option>
              <option value="DELTA_INDIA">DELTA INDIA</option>
              <option value="BINANCE">BINANCE</option>
              <option value="PAPER_SIMULATOR">PAPER SIMULATOR</option>
            </select>
          )}

          {/* Data Mode / Environment */}
          {onChangeEnvironment && (
            <button
              type="button"
              onClick={() => onChangeEnvironment(environment === "LIVE" ? "PAPER" : "LIVE")}
              className={`px-2 py-1 rounded-lg font-bold text-[10px] transition border ${
                environment === "LIVE"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
              }`}
            >
              {environment === "LIVE" ? "DATA: LIVE" : "DATA: PAPER"}
            </button>
          )}

          {/* Connection status badge */}
          {getConnectionBadge()}

          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Option Chain"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
