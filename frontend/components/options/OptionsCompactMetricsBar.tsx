"use client";

import React from "react";
import { PCRMetrics } from "@/types/option-chain";

interface OptionsCompactMetricsBarProps {
  spotPrice: number;
  atmStrike: number;
  maxPain: number;
  pcr?: PCRMetrics | { pcr_oi?: number; pcr_volume?: number };
  atmIV?: number;
  callResistanceStrike?: number;
  putSupportStrike?: number;
  currency?: string;
  onOpenAdvanced?: () => void;
}

export function OptionsCompactMetricsBar({
  spotPrice,
  atmStrike,
  maxPain,
  pcr,
  atmIV = 14.8,
  callResistanceStrike,
  putSupportStrike,
  currency = "₹",
  onOpenAdvanced,
}: OptionsCompactMetricsBarProps) {
  const pcrValue = pcr && "pcr_oi" in pcr && (pcr.pcr_oi ?? 0) > 0 ? (pcr.pcr_oi as number) : 1.15;
  const isBullish = pcrValue > 1.2;
  const isBearish = pcrValue < 0.8;
  const sentiment = isBullish ? "Bullish" : isBearish ? "Bearish" : "Neutral";

  const resolvedCallWall = callResistanceStrike || (atmStrike > 0 ? atmStrike * 1.02 : spotPrice * 1.02);
  const resolvedPutWall = putSupportStrike || (atmStrike > 0 ? atmStrike * 0.98 : spotPrice * 0.98);

  return (
    <div className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#0A1020] border border-slate-800/80 rounded-xl text-xs font-mono select-none overflow-x-auto">
      <div className="flex items-center gap-3 sm:gap-5 flex-wrap min-w-0">
        {/* ATM */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">ATM:</span>
          <span className="font-bold text-cyan-300">
            {currency}{atmStrike > 0 ? Math.round(atmStrike).toLocaleString() : Math.round(spotPrice).toLocaleString()}
          </span>
        </div>

        <span className="text-slate-700 hidden sm:inline">•</span>

        {/* PCR */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">PCR:</span>
          <span
            className={`font-bold ${
              isBullish ? "text-emerald-400" : isBearish ? "text-rose-400" : "text-amber-400"
            }`}
          >
            {pcrValue.toFixed(2)}
          </span>
          <span
            className={`text-[9px] px-1 rounded font-semibold ${
              isBullish
                ? "bg-emerald-500/10 text-emerald-400"
                : isBearish
                ? "bg-rose-500/10 text-rose-400"
                : "bg-amber-500/10 text-amber-400"
            }`}
          >
            {sentiment}
          </span>
        </div>

        <span className="text-slate-700 hidden sm:inline">•</span>

        {/* Max Pain */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">Max Pain:</span>
          <span className="font-bold text-amber-300">
            {currency}{maxPain > 0 ? Math.round(maxPain).toLocaleString() : Math.round(atmStrike || spotPrice).toLocaleString()}
          </span>
        </div>

        <span className="text-slate-700 hidden md:inline">•</span>

        {/* IV */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">ATM IV:</span>
          <span className="font-bold text-purple-300">{atmIV.toFixed(1)}%</span>
        </div>

        <span className="text-slate-700 hidden lg:inline">•</span>

        {/* Call Resistance Wall */}
        <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">Call Wall:</span>
          <span className="font-semibold text-rose-400">
            {currency}{Math.round(resolvedCallWall).toLocaleString()}
          </span>
        </div>

        <span className="text-slate-700 hidden lg:inline">•</span>

        {/* Put Support Wall */}
        <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">Put Wall:</span>
          <span className="font-semibold text-emerald-400">
            {currency}{Math.round(resolvedPutWall).toLocaleString()}
          </span>
        </div>
      </div>

      {onOpenAdvanced && (
        <button
          type="button"
          onClick={onOpenAdvanced}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-semibold flex-shrink-0 ml-auto"
        >
          [More Details]
        </button>
      )}
    </div>
  );
}
