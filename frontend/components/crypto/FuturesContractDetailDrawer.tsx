"use client";

import React from "react";
import {
  X,
  ExternalLink,
  Layers,
  Clock,
  Activity,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  Cpu,
} from "lucide-react";
import { CanonicalFuturesContract } from "@/types/futures-terminal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contract: CanonicalFuturesContract | null;
}

export function FuturesContractDetailDrawer({ isOpen, onClose, contract }: Props) {
  if (!isOpen || !contract) return null;

  const isPositiveBasis = (contract.basis || 0) >= 0;
  const isPositiveFunding = (contract.funding_rate_pct || 0) >= 0;
  const isPositiveChange = (contract.change_24h || 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-in Panel */}
      <div className="relative w-full max-w-md bg-[#0B101B] border-l border-slate-800 p-6 flex flex-col z-50 text-slate-100 shadow-2xl overflow-y-auto font-mono text-xs select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Contract Details
              </h3>
              <p className="text-[11px] text-slate-400">
                {contract.canonical_symbol || contract.display_symbol}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#131B2A] hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Badge Strip */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              contract.exchange === "BINANCE"
                ? "bg-amber-950/40 text-amber-300 border-amber-500/30"
                : contract.exchange === "BYBIT"
                ? "bg-orange-950/40 text-orange-300 border-orange-500/30"
                : contract.exchange === "OKX"
                ? "bg-blue-950/40 text-blue-300 border-blue-500/30"
                : "bg-purple-950/40 text-purple-300 border-purple-500/30"
            }`}
          >
            {contract.exchange}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-blue-950/50 text-blue-300 border border-blue-500/20">
            {contract.is_perpetual ? "PERPETUAL" : "DATED FUTURES"}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {contract.settlement_asset.replace("_LINEAR", "-M").replace("_INVERSE", "-M")}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-500/20">
            {contract.status || "LIVE"}
          </span>
        </div>

        {/* Core Pricing Grid */}
        <div className="bg-[#131B2A] rounded-xl p-3 border border-slate-800 space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Last Price</span>
            <span className="text-sm font-bold text-white">
              ${(Number(contract.last_price) || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Mark Price</span>
            <span className="text-slate-200 font-semibold">
              ${(Number(contract.mark_price) || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Index Price</span>
            <span className="text-slate-200 font-semibold">
              ${(Number(contract.index_price) || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-slate-400">24H Change</span>
            <span className={`font-bold flex items-center gap-1 ${isPositiveChange ? "text-emerald-400" : "text-rose-400"}`}>
              {isPositiveChange ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositiveChange ? `+${(contract.change_24h || 0).toFixed(2)}%` : `${(contract.change_24h || 0).toFixed(2)}%`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">24H High / Low</span>
            <span className="text-slate-300 text-[11px]">
              ${(contract.high_24h || 0).toLocaleString()} / ${(contract.low_24h || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Derivatives & Term Metrics */}
        <div className="space-y-3 mb-4">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            Derivatives Analytics
          </span>

          <div className="bg-[#131B2A] rounded-xl p-3 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Funding Rate</span>
              <span className={`font-bold ${isPositiveFunding ? "text-emerald-400" : "text-rose-400"}`}>
                {isPositiveFunding ? `+${(contract.funding_rate_pct || 0).toFixed(4)}%` : `${(contract.funding_rate_pct || 0).toFixed(4)}%`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Funding Countdown</span>
              <span className="text-slate-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {contract.funding_countdown || "04:00:00"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Basis ($ / %)</span>
              <span className={isPositiveBasis ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                {isPositiveBasis ? `+$${(contract.basis || 0).toFixed(2)}` : `-$${Math.abs(contract.basis || 0).toFixed(2)}`} ({isPositiveBasis ? `+${(contract.basis_pct || 0).toFixed(3)}%` : `${(contract.basis_pct || 0).toFixed(3)}%`})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Annualized Basis APR</span>
              <span className="text-slate-200">
                {(contract.annualized_basis_pct || 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Open Interest (USD)</span>
              <span className="text-slate-200 font-bold">
                ${((contract.open_interest_usd || 0) / 1_000_000).toFixed(2)}M
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Open Interest (Base)</span>
              <span className="text-slate-300">
                {(contract.open_interest || 0).toLocaleString()} {contract.underlying}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">24H Volume</span>
              <span className="text-slate-300">
                ${((contract.volume_24h || 0) / 1_000_000).toFixed(2)}M
              </span>
            </div>
          </div>
        </div>

        {/* Contract Specifications */}
        <div className="space-y-3 mb-6">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            Execution Specifications
          </span>

          <div className="bg-[#131B2A] rounded-xl p-3 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tick Size</span>
              <span className="text-slate-200 font-mono">${contract.tick_size || 0.1}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Min Quantity / Step</span>
              <span className="text-slate-200 font-mono">{contract.min_quantity || 0.001} {contract.underlying}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Max Supported Leverage</span>
              <span className="text-blue-400 font-bold">{contract.max_leverage || 50}x</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Supported Margin Modes</span>
              <span className="text-slate-200">ISOLATED, CROSS</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Feed Data Latency</span>
              <span className="text-emerald-400 font-semibold">{contract.data_age_ms || 42}ms</span>
            </div>
          </div>
        </div>

        {/* Footer Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-auto py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors text-xs uppercase"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
}
