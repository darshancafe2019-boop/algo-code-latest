"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  LineChart,
  BrainCircuit,
  Zap,
  MoreHorizontal,
  Star,
  Layers,
  ChevronDown,
  Info,
  Code,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { MarketInstrument } from "@/types/market-universe";
import { formatPrice, formatVolume } from "@/lib/formatters";

interface SelectedInstrumentActionBarProps {
  instrument: MarketInstrument | null;
  isInWatchlist: boolean;
  onToggleWatchlist: () => void;
  onOpenChart: () => void;
  onOpenAnalysis: () => void;
  onOpenTrade: () => void;
  onOpenDetails: () => void;
  onOpenStrategy: () => void;
  onOpenOptions?: (symbol: string) => void;
  onOpenFutures?: (symbol: string) => void;
}

export function SelectedInstrumentActionBar({
  instrument,
  isInWatchlist,
  onToggleWatchlist,
  onOpenChart,
  onOpenAnalysis,
  onOpenTrade,
  onOpenDetails,
  onOpenStrategy,
  onOpenOptions,
  onOpenFutures,
}: SelectedInstrumentActionBarProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!instrument) return null;

  const sym = instrument.canonical_symbol || instrument.provider_symbol || instrument.symbol || "UNKNOWN";
  const currSymbol = instrument.currency === "INR" ? "₹" : "$";
  const priceStr = formatPrice(instrument.last_price, currSymbol, undefined, "—");
  const volumeStr = formatVolume(instrument.volume_24h, currSymbol, "—");
  const isPositive = (instrument.change_24h || 0) >= 0;

  const hasOptions =
    Boolean((instrument as any).options_enabled) ||
    instrument.asset_class === "Options" ||
    ["NIFTY", "BANKNIFTY", "FINNIFTY", "RELIANCE", "TCS", "INFY", "AAPL", "TSLA", "NVDA", "BTC", "ETH"].some((k) =>
      sym.toUpperCase().includes(k)
    );

  const hasFutures =
    Boolean((instrument as any).futures_enabled) ||
    instrument.asset_class === "Futures" ||
    sym.includes("USDT") ||
    sym.includes("PERP") ||
    sym.includes("FUT");

  return (
    <div className="sticky bottom-4 z-40 bg-[#0B111E]/95 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-3.5 sm:p-4 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-bottom duration-200 font-sans">
      {/* Left: Instrument Metadata & Live Prices */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {/* Star Button */}
        <button
          onClick={onToggleWatchlist}
          className={`p-1.5 rounded-lg border transition-colors ${
            isInWatchlist
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-[#141E33] border-slate-700 text-slate-400 hover:text-slate-200"
          }`}
          title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
        >
          <Star className={`w-4 h-4 ${isInWatchlist ? "fill-current" : ""}`} />
        </button>

        {/* Symbol & Exchange */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm sm:text-base font-mono">{sym}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 uppercase font-bold border border-slate-700">
              {instrument.exchange || "GLOBAL"}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-sans block truncate max-w-xs">
            {instrument.company_name || instrument.asset_class}
          </span>
        </div>

        <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />

        {/* Live Price & Change */}
        <div className="flex items-center gap-3 font-mono">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Price</div>
            <div className="text-sm font-bold text-white">{priceStr}</div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">24H</div>
            <div className={`text-xs font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}{instrument.change_24h?.toFixed(2) || "0.00"}%
            </div>
          </div>

          <div className="hidden md:block">
            <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Volume</div>
            <div className="text-xs text-slate-300 font-bold">{volumeStr}</div>
          </div>
        </div>
      </div>

      {/* Right: Clean Contextual Action Buttons */}
      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {/* Chart Button */}
        <button
          onClick={onOpenChart}
          className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#141E33] hover:bg-[#1C2A47] text-slate-200 border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-1.5 shadow-sm"
        >
          <LineChart className="w-3.5 h-3.5 text-cyan-400" />
          <span>Chart</span>
        </button>

        {/* Analyze Button */}
        <button
          onClick={onOpenAnalysis}
          className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#141E33] hover:bg-[#1C2A47] text-slate-200 border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-1.5 shadow-sm"
        >
          <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
          <span>Analyze</span>
        </button>

        {/* Trade Button (Contextual Order Ticket) */}
        <button
          onClick={onOpenTrade}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Trade</span>
        </button>

        {/* More Dropdown (•••) */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`p-2 text-xs rounded-xl border transition-all ${
              isMoreOpen
                ? "bg-[#1E293B] text-white border-cyan-500/50"
                : "bg-[#141E33] hover:bg-[#1E293B] text-slate-300 border-slate-700 hover:border-slate-600"
            }`}
            title="More actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMoreOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-52 bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-150 font-sans">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase font-mono border-b border-slate-800 mb-1">
                Context Actions
              </div>

              <button
                onClick={() => {
                  onToggleWatchlist();
                  setIsMoreOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-slate-200 hover:text-amber-400 transition-colors flex items-center gap-2"
              >
                <Star className={`w-4 h-4 ${isInWatchlist ? "text-amber-400 fill-current" : "text-slate-400"}`} />
                <span>{isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}</span>
              </button>

              <button
                onClick={() => {
                  onOpenDetails();
                  setIsMoreOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-slate-200 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Instrument Details</span>
              </button>

              <button
                onClick={() => {
                  onOpenStrategy();
                  setIsMoreOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-slate-200 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                <Code className="w-4 h-4 text-emerald-400" />
                <span>Strategy Builder</span>
              </button>

              {/* Context-aware derivatives */}
              {hasFutures && onOpenFutures && (
                <button
                  onClick={() => {
                    onOpenFutures(sym);
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-slate-200 hover:text-cyan-400 transition-colors flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span>Futures Command</span>
                </button>
              )}

              {hasOptions && onOpenOptions && (
                <button
                  onClick={() => {
                    onOpenOptions(sym);
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#1E293B] text-slate-200 hover:text-cyan-400 transition-colors flex items-center gap-2"
                >
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Option Chain</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
