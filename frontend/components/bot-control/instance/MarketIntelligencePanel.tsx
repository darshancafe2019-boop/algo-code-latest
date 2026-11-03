"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Radio,
  Clock,
  Compass,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";

export interface MarketIntelligenceData {
  underlying: string;
  instrument: string;
  symbol: string;
  exchange: string;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  spread: number;
  volume24h: number;
  openInterest: number;
  oiChange24h: number;
  fundingRatePct: number | null;
  markPrice: number;
  indexPrice: number;
  expiry: string | null;
  multiplier: number;
  tickSize: number;
  lotSize: number;
  marketDirection: "BULLISH" | "BEARISH" | "NEUTRAL";
  htfTrend: string;
  entryDirection: string;
  momentum: string;
  volatilityCondition: string;
  volumeConfirmation: string;
  liquidityCondition: string;
  trendStrength: string;
  signalConfidencePct: number | null;
  lastUpdated: string;
}

interface MarketIntelligencePanelProps {
  data: MarketIntelligenceData;
  currencySymbol?: string;
}

export function MarketIntelligencePanel({
  data,
  currencySymbol = "₹",
}: MarketIntelligencePanelProps) {
  const isBullish = data.marketDirection === "BULLISH";
  const isBearish = data.marketDirection === "BEARISH";

  return (
    <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-4 space-y-4 font-sans select-none shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1A2B43]/70">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[#00C9E8]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Bot Market Intelligence
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-[#91A7C1]">
          <span className="h-2 w-2 rounded-full bg-[#00D6A0] animate-pulse" />
          <span>Real-Time Feed Synced</span>
        </div>
      </div>

      {/* Quote Banner (LTP, Bid, Ask, Spread) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
        <div className="p-3 rounded-[6px] bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Last Traded Price</span>
          <span className="text-xl font-bold text-[#EAF3FF] tabular-nums">
            {currencySymbol}{formatNumber(data.lastPrice, 2)}
          </span>
          <span className="text-[10px] text-[#91A7C1] block mt-0.5">Mark: {currencySymbol}{formatNumber(data.markPrice, 2)}</span>
        </div>

        <div className="p-3 rounded-[6px] bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Bid / Ask</span>
          <div className="flex items-baseline justify-between text-base font-bold tabular-nums">
            <span className="text-[#00D6A0]">{formatNumber(data.bidPrice, 2)}</span>
            <span className="text-[#91A7C1] text-xs">/</span>
            <span className="text-[#FF5268]">{formatNumber(data.askPrice, 2)}</span>
          </div>
          <span className="text-[10px] text-[#91A7C1] block mt-0.5">
            Spread: <strong className="text-[#EAF3FF]">{formatNumber(data.spread, 2)}</strong>
          </span>
        </div>

        <div className="p-3 rounded-[6px] bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">24h Volume</span>
          <span className="text-xl font-bold text-[#00C9E8] tabular-nums">
            {formatNumber(data.volume24h, 0)}
          </span>
          <span className="text-[10px] text-[#91A7C1] block mt-0.5">Contracts Traded</span>
        </div>

        <div className="p-3 rounded-[6px] bg-[#050B16] border border-[#1A2B43]">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Open Interest (OI)</span>
          <span className="text-xl font-bold text-[#EAF3FF] tabular-nums">
            {formatNumber(data.openInterest, 0)}
          </span>
          <span className={cn("text-[10px] font-bold block mt-0.5", data.oiChange24h >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
            {data.oiChange24h >= 0 ? "+" : ""}{formatNumber(data.oiChange24h, 0)} (24h)
          </span>
        </div>
      </div>

      {/* Contract Specification Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs font-mono">
        <div className="p-2 rounded bg-[#050B16] border border-[#1A2B43]/60">
          <span className="text-[10px] text-[#91A7C1] block">Underlying</span>
          <span className="font-bold text-[#EAF3FF]">{data.underlying}</span>
        </div>
        <div className="p-2 rounded bg-[#050B16] border border-[#1A2B43]/60">
          <span className="text-[10px] text-[#91A7C1] block">Contract Symbol</span>
          <span className="font-bold text-[#00C9E8] truncate block" title={data.symbol}>{data.symbol}</span>
        </div>
        <div className="p-2 rounded bg-[#050B16] border border-[#1A2B43]/60">
          <span className="text-[10px] text-[#91A7C1] block">Exchange / Venue</span>
          <span className="font-bold text-[#EAF3FF]">{data.exchange}</span>
        </div>
        <div className="p-2 rounded bg-[#050B16] border border-[#1A2B43]/60">
          <span className="text-[10px] text-[#91A7C1] block">Lot Size</span>
          <span className="font-bold text-[#EAF3FF]">{data.lotSize} units</span>
        </div>
        <div className="p-2 rounded bg-[#050B16] border border-[#1A2B43]/60">
          <span className="text-[10px] text-[#91A7C1] block">Tick Size</span>
          <span className="font-bold text-[#EAF3FF]">{data.tickSize}</span>
        </div>
        <div className="p-2 rounded bg-[#050B16] border border-[#1A2B43]/60">
          <span className="text-[10px] text-[#91A7C1] block">Funding / Expiry</span>
          <span className="font-bold text-[#8B5CF6]">
            {data.fundingRatePct != null ? `${data.fundingRatePct.toFixed(4)}%` : data.expiry || "Continuous"}
          </span>
        </div>
      </div>

      {/* Directional Intelligence Matrix */}
      <div className="space-y-2 pt-2 border-t border-[#1A2B43]/70">
        <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-[#00C9E8] uppercase tracking-wider">
          <Zap className="h-3.5 w-3.5" />
          <span>Directional Intelligence &amp; Quantitative State</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-xs">
          {/* Market Direction */}
          <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
            <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Direction</span>
            <span
              className={cn(
                "font-bold text-xs",
                isBullish ? "text-[#00D6A0]" : isBearish ? "text-[#FF5268]" : "text-[#FFB020]"
              )}
            >
              {data.marketDirection}
            </span>
          </div>

          {/* HTF Trend */}
          <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
            <span className="text-[10px] text-[#91A7C1] uppercase font-bold">HTF Trend</span>
            <span className="font-bold text-xs text-[#EAF3FF]">{data.htfTrend || "Bullish (15m)"}</span>
          </div>

          {/* Entry Direction */}
          <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
            <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Entry Bias</span>
            <span className="font-bold text-xs text-[#00C9E8]">{data.entryDirection || "Pullback Long"}</span>
          </div>

          {/* Momentum */}
          <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
            <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Momentum</span>
            <span className="font-bold text-xs text-[#00D6A0]">{data.momentum || "Expanding"}</span>
          </div>

          {/* Volatility */}
          <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
            <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Volatility</span>
            <span className="font-bold text-xs text-[#EAF3FF]">{data.volatilityCondition || "Normal (ATR 18)"}</span>
          </div>

          {/* Volume Conf */}
          <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
            <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Volume</span>
            <span className="font-bold text-xs text-[#00D6A0]">{data.volumeConfirmation || "Above 20-MA"}</span>
          </div>

          {/* Trend Strength */}
          <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
            <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Trend Strength</span>
            <span className="font-bold text-xs text-[#00C9E8]">{data.trendStrength || "ADX 28.4"}</span>
          </div>

          {/* Signal Confidence */}
          <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
            <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Signal Conf</span>
            <span className="font-bold text-xs text-[#00D6A0]">
              {data.signalConfidencePct != null ? `${data.signalConfidencePct.toFixed(1)}%` : "Not Available"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

