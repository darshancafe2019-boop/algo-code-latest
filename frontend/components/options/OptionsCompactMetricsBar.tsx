"use client";

import React from "react";
import { PCRMetrics } from "@/types/option-chain";

interface OptionsCompactMetricsBarProps {
  spotPrice: number;
  atmStrike?: number | null;
  maxPain?: number | null;
  pcr?: PCRMetrics | { pcr_oi?: number | null; pcr_volume?: number | null } | null;
  atmIV?: number | null;
  callResistanceStrike?: number | null;
  putSupportStrike?: number | null;
  currency?: string;
  dataStatus?: "LIVE" | "DATA INCOMPLETE" | "STALE" | string;
  latencyMs?: number;
  onOpenAdvanced?: () => void;
}

export function OptionsCompactMetricsBar({
  spotPrice,
  atmStrike,
  maxPain,
  pcr,
  atmIV,
  callResistanceStrike,
  putSupportStrike,
  currency = "₹",
  dataStatus = "LIVE",
  latencyMs = 16,
  onOpenAdvanced,
}: OptionsCompactMetricsBarProps) {
  // Extract PCR safely without fake fallback
  const rawPcr = pcr && typeof pcr === "object" ? ("pcr_oi" in pcr ? pcr.pcr_oi : (pcr as any).pcr_oi) : null;
  const pcrValue = rawPcr !== null && rawPcr !== undefined && !isNaN(Number(rawPcr)) && Number(rawPcr) > 0 ? Number(rawPcr) : null;

  const isBullish = pcrValue !== null && pcrValue > 1.2;
  const isBearish = pcrValue !== null && pcrValue < 0.8;
  const sentiment = pcrValue !== null ? (isBullish ? "Bullish" : isBearish ? "Bearish" : "Neutral") : null;

  const isDataLive = dataStatus === "LIVE";
  const isDataIncomplete = dataStatus === "DATA INCOMPLETE";

  return (
    <div className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-[#0A1020] border border-slate-800/80 rounded-xl text-xs font-mono select-none overflow-x-auto">
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap min-w-0">
        {/* ATM */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">ATM:</span>
          <span className="font-bold text-cyan-300">
            {atmStrike !== null && atmStrike !== undefined && atmStrike > 0
              ? `${currency}${Math.round(atmStrike).toLocaleString()}`
              : spotPrice > 0
              ? `${currency}${Math.round(spotPrice).toLocaleString()}`
              : "—"}
          </span>
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${
              isDataLive
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : isDataIncomplete
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isDataLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            {dataStatus}
          </span>
        </div>

        <span className="text-slate-700 hidden sm:inline">•</span>

        {/* PCR */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">PCR:</span>
          {pcrValue !== null ? (
            <>
              <span
                className={`font-bold ${
                  isBullish ? "text-emerald-400" : isBearish ? "text-rose-400" : "text-amber-400"
                }`}
              >
                {pcrValue.toFixed(2)}
              </span>
              {sentiment && (
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
              )}
            </>
          ) : (
            <span className="text-slate-500 font-semibold">—</span>
          )}
        </div>

        <span className="text-slate-700 hidden sm:inline">•</span>

        {/* Max Pain */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">Max Pain:</span>
          <span className="font-bold text-amber-300">
            {maxPain !== null && maxPain !== undefined && maxPain > 0
              ? `${currency}${Math.round(maxPain).toLocaleString()}`
              : "—"}
          </span>
        </div>

        <span className="text-slate-700 hidden md:inline">•</span>

        {/* ATM IV */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">ATM IV:</span>
          <span className="font-bold text-purple-300">
            {atmIV !== null && atmIV !== undefined && atmIV > 0 ? `${atmIV.toFixed(1)}%` : "—"}
          </span>
        </div>

        <span className="text-slate-700 hidden lg:inline">•</span>

        {/* Call Resistance Wall */}
        <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">Call Wall:</span>
          <span className="font-semibold text-rose-400">
            {callResistanceStrike !== null && callResistanceStrike !== undefined && callResistanceStrike > 0
              ? `${currency}${Math.round(callResistanceStrike).toLocaleString()}`
              : "—"}
          </span>
        </div>

        <span className="text-slate-700 hidden lg:inline">•</span>

        {/* Put Support Wall */}
        <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">Put Wall:</span>
          <span className="font-semibold text-emerald-400">
            {putSupportStrike !== null && putSupportStrike !== undefined && putSupportStrike > 0
              ? `${currency}${Math.round(putSupportStrike).toLocaleString()}`
              : "—"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
        <span className="text-[10px] text-slate-500 hidden sm:inline">
          {latencyMs > 0 ? `${latencyMs}ms` : "Live"}
        </span>
        {onOpenAdvanced && (
          <button
            type="button"
            onClick={onOpenAdvanced}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-semibold"
          >
            [Advanced]
          </button>
        )}
      </div>
    </div>
  );
}
