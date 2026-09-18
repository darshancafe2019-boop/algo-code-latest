"use client";

import React from "react";
import { formatMoney } from "@/lib/formatters";
import { Activity, Globe, DollarSign, Flame, Layers } from "lucide-react";

interface FuturesMarketSummaryBarProps {
  totalVolumeUsd?: number | null;
  totalOpenInterestUsd?: number | null;
  indiaVolumeInr?: number | null;
  indiaOiInr?: number | null;
  cryptoVolumeUsd?: number | null;
  cryptoOiUsd?: number | null;
  globalVolumeUsd?: number | null;
  globalOiUsd?: number | null;
  avgFundingRateApr?: number | string | null;
  onOpenDetails?: () => void;
}

export function FuturesMarketSummaryBar({
  totalVolumeUsd,
  totalOpenInterestUsd,
  indiaVolumeInr,
  indiaOiInr,
  cryptoVolumeUsd,
  cryptoOiUsd,
  globalVolumeUsd,
  globalOiUsd,
  avgFundingRateApr,
  onOpenDetails,
}: FuturesMarketSummaryBarProps) {
  // Format regional metrics
  const formatUsd = (val?: number | null) => {
    if (val == null || val <= 0) return "—";
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return formatMoney(val, "$");
  };

  const formatInr = (val?: number | null) => {
    if (val == null || val <= 0) return "—";
    if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
    if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`;
    return formatMoney(val, "₹");
  };

  const fundingVal =
    avgFundingRateApr != null && avgFundingRateApr !== ""
      ? typeof avgFundingRateApr === "number"
        ? `${avgFundingRateApr >= 0 ? "+" : ""}${avgFundingRateApr.toFixed(2)}%`
        : String(avgFundingRateApr)
      : "—";

  return (
    <div className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-[#0A1022] border border-slate-800 rounded-xl font-mono text-xs select-none overflow-x-auto shadow-md">
      <div className="flex items-center gap-4 sm:gap-6 flex-wrap min-w-0">
        {/* 1. CRYPTO DERIVATIVES */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-amber-400/90 uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
            CRYPTO
          </span>
          <span className="text-slate-400 text-[11px]">Vol:</span>
          <span className="font-bold text-white">{formatUsd(cryptoVolumeUsd)}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 text-[11px]">OI:</span>
          <span className="font-bold text-cyan-300">{formatUsd(cryptoOiUsd)}</span>
        </div>

        <span className="text-slate-700 hidden md:inline">|</span>

        {/* 2. INDIA NSE DERIVATIVES */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-emerald-400/90 uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
            INDIA (NSE)
          </span>
          <span className="text-slate-400 text-[11px]">Vol:</span>
          <span className="font-bold text-white">{formatInr(indiaVolumeInr)}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 text-[11px]">OI:</span>
          <span className="font-bold text-emerald-300">{formatInr(indiaOiInr)}</span>
        </div>

        <span className="text-slate-700 hidden md:inline">|</span>

        {/* 3. PERP FUNDING (APR) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Perp Funding APR:</span>
          <span className={`font-bold ${fundingVal !== "—" ? "text-emerald-400" : "text-slate-500"}`}>
            {fundingVal}
          </span>
        </div>

        {/* 4. TOTAL NORMALIZED NOTIONAL */}
        {totalVolumeUsd != null && totalVolumeUsd > 0 && (
          <>
            <span className="text-slate-700 hidden lg:inline">|</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Notional:</span>
              <span className="font-bold text-slate-200">{formatUsd(totalVolumeUsd)}</span>
            </div>
          </>
        )}
      </div>

      {onOpenDetails && (
        <button
          type="button"
          onClick={onOpenDetails}
          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold underline flex-shrink-0 ml-auto"
        >
          [View Metrics]
        </button>
      )}
    </div>
  );
}
