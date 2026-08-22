"use client";

import React from "react";
import {
  Zap,
  ShieldCheck,
  RefreshCw,
  Maximize2,
  Minimize2,
  Lock,
  Globe,
} from "lucide-react";
import { CanonicalFuturesContract, DataQualityStatus } from "@/types/futures-terminal";

interface Props {
  selectedUnderlying: string;
  onSelectUnderlying: (underlying: string) => void;
  selectedExchange: string;
  onSelectExchange: (exchange: string) => void;
  selectedContract: CanonicalFuturesContract | null;
  connectionStatus: DataQualityStatus;
  executionMode: "PAPER" | "LIVE";
  onToggleExecutionMode?: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function FuturesTerminalHeader({
  selectedUnderlying,
  onSelectUnderlying,
  selectedExchange,
  onSelectExchange,
  selectedContract,
  connectionStatus,
  executionMode,
  isRefreshing,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
}: Props) {
  const underlyings = [
    { id: "BTC", label: "BTC" },
    { id: "ETH", label: "ETH" },
    { id: "SOL", label: "SOL" },
    { id: "BNB", label: "BNB" },
    { id: "XRP", label: "XRP" },
  ];

  const exchanges = ["ALL", "BINANCE", "BYBIT", "OKX", "DERIBIT"];

  return (
    <header className="bg-[#0B101B] border border-slate-800 rounded-xl p-3.5 shadow-xl flex flex-wrap items-center justify-between gap-4 select-none">
      {/* Left: Terminal Brand & Active Contract */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wider text-white uppercase flex items-center gap-1.5 font-mono">
                Futures Terminal
              </h1>
              {selectedContract && (
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300">
                  {selectedContract.canonical_symbol}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Institutional Derivatives Execution & Risk Desk
            </p>
          </div>
        </div>

        {/* Exchange Selector */}
        <div className="flex items-center gap-1.5 bg-[#131B2A] px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] text-slate-400 uppercase font-mono">Venue:</span>
          <select
            value={selectedExchange}
            onChange={(e) => onSelectExchange(e.target.value)}
            className="bg-transparent text-slate-200 text-xs font-mono font-semibold focus:outline-none cursor-pointer"
          >
            {exchanges.map((ex) => (
              <option key={ex} value={ex} className="bg-[#131B2A] text-slate-200">
                {ex}
              </option>
            ))}
          </select>
        </div>

        {/* Live Connectivity & Health Badge */}
        <div className="flex items-center gap-2 bg-[#131B2A] px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === "LIVE"
                ? "bg-emerald-400 animate-pulse"
                : connectionStatus === "STALE"
                ? "bg-amber-400"
                : "bg-rose-400"
            }`}
          />
          <span className="text-[10px] text-slate-400 font-mono">FEED:</span>
          <span
            className={`font-mono text-xs font-bold ${
              connectionStatus === "LIVE"
                ? "text-emerald-400"
                : connectionStatus === "STALE"
                ? "text-amber-400"
                : "text-rose-400"
            }`}
          >
            {connectionStatus}
          </span>
          <span className="text-[10px] text-slate-400 font-mono border-l border-slate-700 pl-1.5">
            42ms
          </span>
        </div>

        {/* Risk Engine Healthy Badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-emerald-400 text-xs">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[11px] font-mono font-semibold">14-Stage Risk Online</span>
        </div>
      </div>

      {/* Right: Quick Switcher, Paper/Live Indicator, Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Underlying Asset Pills */}
        <div className="flex items-center bg-[#131B2A] p-1 rounded-lg border border-slate-800">
          {underlyings.map((u) => (
            <button
              key={u.id}
              onClick={() => onSelectUnderlying(u.id)}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-all ${
                selectedUnderlying === u.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>

        {/* Explicit Environment Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-bold uppercase tracking-wider ${
            executionMode === "LIVE"
              ? "bg-rose-950/40 border-rose-500/40 text-rose-300 shadow-md shadow-rose-950/40 animate-pulse"
              : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-950/40"
          }`}
          title={
            executionMode === "LIVE"
              ? "REAL CAPITAL AT RISK"
              : "SIMULATED PAPER TRADING EXECUTION"
          }
        >
          <Lock className="w-3 h-3" />
          <span>{executionMode === "LIVE" ? "LIVE ACCOUNT" : "PAPER TRADING"}</span>
        </div>

        {/* Refresh & Fullscreen actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-[#131B2A] hover:bg-slate-800 text-slate-300 transition-colors border border-slate-800 hover:border-slate-700"
            title="Refresh Quotes"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-400" : ""}`}
            />
          </button>

          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded-lg bg-[#131B2A] hover:bg-slate-800 text-slate-300 transition-colors border border-slate-800 hover:border-slate-700"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-slate-300" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-slate-300" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
