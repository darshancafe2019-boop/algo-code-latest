"use client";

import React from "react";
import { useOptionsMarketContext } from "@/context/OptionsMarketContext";
import {
  Globe,
  Compass,
  Activity,
  Shield,
  RefreshCw,
  Clock,
  CheckCircle2,
  Lock,
  ChevronDown,
} from "lucide-react";

export function OptionsMarketHeader() {
  const {
    market,
    setMarket,
    selectedUnderlying,
    underlyingsList,
    setSelectedUnderlyingSymbol,
    spotPrice,
    quoteAgeSeconds,
    dataStatus,
    executionMode,
    setExecutionMode,
    accountStatus,
    providerName,
    brokerName,
    availableExpiries,
    selectedExpiry,
    setSelectedExpiry,
    refreshMarketSnapshot,
  } = useOptionsMarketContext();

  return (
    <header className="sticky top-0 z-30 bg-[#080E1E]/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-3.5 shadow-2xl space-y-3 font-mono text-xs">
      {/* Top Row: Brand + Market / Underlying Selector + Live Normalized Spot + Separate Status Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Market & Underlying Picker */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
            <div className="p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-white text-sm tracking-tight flex items-center gap-1.5">
                Quant.OS Options
              </div>
              <div className="text-[10px] text-slate-400">Multi-Market Workstation</div>
            </div>
          </div>

          {/* Market Universe Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            {(["India", "Global", "Crypto"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                  market === m
                    ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Underlying Select Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedUnderlying.symbol}
              onChange={(e) => setSelectedUnderlyingSymbol(e.target.value)}
              className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-white font-extrabold text-xs focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              {underlyingsList.map((u) => (
                <option key={u.symbol} value={u.symbol}>
                  {u.name} ({u.symbol}) • {u.exchange}
                </option>
              ))}
            </select>
            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-bold">
              {selectedUnderlying.assetClass}
            </span>
          </div>
        </div>

        {/* Center: Live Normalized Spot Price & Quote Age */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-slate-400 text-[11px] font-bold">Spot:</span>
            </div>
            <span className="text-white font-extrabold text-sm tracking-wide">
              {selectedUnderlying.currencySymbol}{spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {quoteAgeSeconds}s ago
            </span>
          </div>

          {/* Expiry Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Expiry:</span>
            <select
              value={selectedExpiry}
              onChange={(e) => setSelectedExpiry(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-bold text-xs"
            >
              {availableExpiries.map((exp) => (
                <option key={exp} value={exp}>
                  {exp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Distinct Split Badges (Data vs Execution) & Mode Toggle */}
        <div className="flex items-center gap-2">
          {/* Data Feed Badge */}
          <div
            className={`px-2.5 py-1 rounded-xl border flex items-center gap-1 text-[10px] font-black ${
              dataStatus === "LIVE"
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : dataStatus === "DELAYED"
                ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                : "bg-rose-950/60 border-rose-500/40 text-rose-300"
            }`}
            title={`Data Provider: ${providerName}`}
          >
            <Activity className="w-3 h-3" />
            <span>DATA: {dataStatus}</span>
          </div>

          {/* Execution Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setExecutionMode("PAPER")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition ${
                executionMode === "PAPER"
                  ? "bg-cyan-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Virtual Paper Execution Sandbox"
            >
              EXEC: PAPER
            </button>
            <button
              onClick={() => setExecutionMode("LIVE")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition ${
                executionMode === "LIVE"
                  ? "bg-rose-600 text-white shadow-md animate-pulse"
                  : "text-slate-400 hover:text-rose-400"
              }`}
              title="Live Broker Order Routing (2FA / Lock Gate)"
            >
              EXEC: LIVE
            </button>
          </div>

          {/* Account Status Badge */}
          <div
            className={`px-2 py-1 rounded-xl border text-[10px] font-bold ${
              accountStatus === "CONNECTED"
                ? "bg-slate-900 border-slate-700 text-slate-300"
                : "bg-amber-950 border-amber-500/30 text-amber-300"
            }`}
            title={`Connected Broker: ${brokerName}`}
          >
            {brokerName}
          </div>

          <button
            onClick={refreshMarketSnapshot}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh Quotes"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
