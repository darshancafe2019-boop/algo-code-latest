"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  LineChart,
  Layers,
  Sparkles,
  BookmarkPlus,
  BookmarkCheck,
  Zap,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Code
} from "lucide-react";
import { MarketInstrument } from "@/types/market-universe";

interface ContextualActionBarProps {
  instrument: MarketInstrument | null;
  isInWatchlist?: boolean;
  onToggleWatchlist?: () => void;
  onOpenAnalysis?: () => void;
  onOpenOptions?: (underlying: string) => void;
  onOpenFutures?: (underlying: string) => void;
}

export function ContextualActionBar({
  instrument,
  isInWatchlist = false,
  onToggleWatchlist,
  onOpenAnalysis,
  onOpenOptions,
  onOpenFutures,
}: ContextualActionBarProps) {
  if (!instrument) {
    return (
      <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-4 flex items-center justify-between font-mono text-xs text-slate-400">
        <span>Select an instrument from the table or search to open contextual actions.</span>
      </div>
    );
  }

  const sym = instrument.canonical_symbol || instrument.symbol || instrument.instrument_id;
  const isCrypto = instrument.asset_class?.toLowerCase().includes("crypto");
  const isOptionAvailable = Boolean(instrument.option_type || instrument.asset_class?.toLowerCase().includes("opt") || instrument.symbol?.includes("NIFTY"));
  const isFuturesAvailable = isCrypto || Boolean(instrument.expiry || instrument.asset_class?.toLowerCase().includes("fut"));

  return (
    <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-4 shadow-xl select-none font-sans space-y-3">
      {/* 1. Header with Selected Instrument Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E293B] pb-3 font-mono">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-100 uppercase">{sym}</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#162231] border border-[#1E293B] text-slate-300">
                {instrument.exchange}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800 text-cyan-300">
                {instrument.asset_class}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">{instrument.company_name || instrument.display_symbol}</span>
          </div>
        </div>

        {/* Live Price & Change Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-sm font-black text-slate-100 block">
              {instrument.currency === "INR" ? "₹" : "$"}
              {instrument.last_price ? instrument.last_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
            </span>
            <span
              className={`text-[10px] font-bold ${
                (instrument.change_24h || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {(instrument.change_24h || 0) >= 0 ? "+" : ""}
              {(instrument.change_24h || 0).toFixed(2)}%
            </span>
          </div>

          {/* Add / Remove Watchlist Button */}
          <button
            onClick={onToggleWatchlist}
            className={`p-2 rounded-xl border transition-all ${
              isInWatchlist
                ? "bg-amber-950/60 border-amber-800 text-amber-400 hover:bg-amber-900/60"
                : "bg-[#070D14] border-[#1E293B] text-slate-400 hover:text-cyan-300 hover:border-cyan-700"
            }`}
            title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            {isInWatchlist ? <BookmarkCheck className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 2. Contextual Action Shortcuts Strip */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        {/* Open Interactive Chart */}
        <Link
          href={`/charts?symbol=${encodeURIComponent(sym)}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#070D14] hover:bg-[#162231] border border-[#1E293B] text-slate-200 hover:text-cyan-300 transition-colors"
        >
          <LineChart className="h-3.5 w-3.5 text-cyan-400" />
          <span>Open Chart</span>
        </Link>

        {/* Open Strategy Builder IDE */}
        <Link
          href={`/strategy-builder?symbol=${encodeURIComponent(sym)}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#070D14] hover:bg-[#162231] border border-[#1E293B] text-slate-200 hover:text-purple-300 transition-colors"
        >
          <Code className="h-3.5 w-3.5 text-purple-400" />
          <span>Open Strategy</span>
        </Link>

        {/* Open Intelligence Drawer / Diagnostic */}
        <button
          onClick={onOpenAnalysis}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800 text-cyan-200 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span>Open Intelligence</span>
        </button>

        {/* Open Futures Terminal (If applicable) */}
        {isFuturesAvailable && (
          <Link
            href={isCrypto ? `/crypto/futures?symbol=${encodeURIComponent(sym)}` : `/crypto/futures`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#070D14] hover:bg-[#162231] border border-[#1E293B] text-slate-200 hover:text-amber-300 transition-colors"
          >
            <Layers className="h-3.5 w-3.5 text-amber-400" />
            <span>Open Futures</span>
          </Link>
        )}

        {/* Open Options Chains (If applicable) */}
        {isOptionAvailable && (
          <Link
            href={`/options?underlying=${encodeURIComponent(sym)}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#070D14] hover:bg-[#162231] border border-[#1E293B] text-slate-200 hover:text-emerald-300 transition-colors"
          >
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <span>Open Options</span>
          </Link>
        )}

        {/* Open Paper Order Ticket */}
        <Link
          href={`/paper-trading?symbol=${encodeURIComponent(sym)}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800 text-emerald-200 font-bold transition-colors ml-auto"
        >
          <Zap className="h-3.5 w-3.5 text-emerald-400" />
          <span>Open Order Ticket (Paper)</span>
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
