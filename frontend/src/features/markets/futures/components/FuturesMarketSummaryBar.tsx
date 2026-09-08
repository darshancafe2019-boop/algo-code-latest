"use client";

import React from "react";
import { Activity, DollarSign, Flame, Layers } from "lucide-react";

interface FuturesMarketSummaryBarProps {
  totalVolumeUsd?: number;
  totalOpenInterestUsd?: number;
  avgFundingRateApr?: number | string;
  onOpenDetails?: () => void;
}

export function FuturesMarketSummaryBar({
  totalVolumeUsd = 13_780_000_000,
  totalOpenInterestUsd = 6_103_000_000,
  avgFundingRateApr = 13.14,
  onOpenDetails,
}: FuturesMarketSummaryBarProps) {
  const volumeFormatted =
    totalVolumeUsd >= 1e9
      ? `$${(totalVolumeUsd / 1e9).toFixed(2)}B`
      : totalVolumeUsd >= 1e6
      ? `$${(totalVolumeUsd / 1e6).toFixed(2)}M`
      : `$${totalVolumeUsd.toLocaleString()}`;

  const oiFormatted =
    totalOpenInterestUsd >= 1e9
      ? `$${(totalOpenInterestUsd / 1e9).toFixed(2)}B`
      : totalOpenInterestUsd >= 1e6
      ? `$${(totalOpenInterestUsd / 1e6).toFixed(2)}M`
      : `$${totalOpenInterestUsd.toLocaleString()}`;

  const fundingVal =
    typeof avgFundingRateApr === "number"
      ? `${avgFundingRateApr >= 0 ? "+" : ""}${avgFundingRateApr.toFixed(2)}%`
      : String(avgFundingRateApr);

  return (
    <div className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-[#0A1022] border border-slate-800 rounded-xl font-mono text-xs select-none overflow-x-auto shadow-md">
      <div className="flex items-center gap-4 sm:gap-8 flex-wrap min-w-0">
        {/* 1. 24H VOLUME */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">24H Volume:</span>
          <span className="text-sm font-bold text-white tracking-tight">{volumeFormatted}</span>
        </div>

        <span className="text-slate-700 hidden sm:inline">•</span>

        {/* 2. OPEN INTEREST */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">Open Interest:</span>
          <span className="text-sm font-bold text-cyan-300 tracking-tight">{oiFormatted}</span>
        </div>

        <span className="text-slate-700 hidden sm:inline">•</span>

        {/* 3. FUNDING */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">Funding (APR):</span>
          <span className="text-sm font-bold text-emerald-400 tracking-tight">{fundingVal}</span>
        </div>
      </div>

      {onOpenDetails && (
        <button
          type="button"
          onClick={onOpenDetails}
          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold underline flex-shrink-0 ml-auto"
        >
          [Details]
        </button>
      )}
    </div>
  );
}
