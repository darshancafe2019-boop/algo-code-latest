"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  BarChart3,
  Flame,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";
import { OptionTerminalSnapshot } from "@/types/option-terminal";
import {
  formatIndianQuantity,
  formatIndianCurrency,
} from "@/lib/options/options-analytics-engine";

interface OptionMarketSummaryCardsProps {
  snapshot: OptionTerminalSnapshot | null;
  currency?: string;
}

export const OptionMarketSummaryCards: React.FC<OptionMarketSummaryCardsProps> = ({
  snapshot,
  currency = "₹",
}) => {
  if (!snapshot) return null;

  const pcr = snapshot.pcr;
  const flow = snapshot.flowSummary;
  const isPcrBullish = (pcr.pcrOI || 0) >= 1.0;
  const isFlowBullish = flow.overallSentiment === "BULLISH";

  const totalOI = (pcr.totalCallOI || 0) + (pcr.totalPutOI || 0);
  const totalVolume = (pcr.totalCallVolume || 0) + (pcr.totalPutVolume || 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-xs">
      {/* 1. CALL OI */}
      <div className="p-2.5 rounded-xl bg-[#090E17] border border-slate-800/90 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>CALL OI</span>
          <span className="text-rose-400 text-[9px] font-bold">CE RES</span>
        </div>
        <div className="text-sm font-extrabold text-rose-300 mt-1">
          {formatIndianQuantity(pcr.totalCallOI)}
        </div>
        <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
          <span>ΔOI</span>
          <span className={pcr.totalCallOIChange >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {pcr.totalCallOIChange >= 0 ? "+" : ""}
            {formatIndianQuantity(pcr.totalCallOIChange)}
          </span>
        </div>
      </div>

      {/* 2. PUT OI */}
      <div className="p-2.5 rounded-xl bg-[#090E17] border border-slate-800/90 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>PUT OI</span>
          <span className="text-emerald-400 text-[9px] font-bold">PE SUP</span>
        </div>
        <div className="text-sm font-extrabold text-emerald-300 mt-1">
          {formatIndianQuantity(pcr.totalPutOI)}
        </div>
        <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
          <span>ΔOI</span>
          <span className={pcr.totalPutOIChange >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {pcr.totalPutOIChange >= 0 ? "+" : ""}
            {formatIndianQuantity(pcr.totalPutOIChange)}
          </span>
        </div>
      </div>

      {/* 3. PCR (Put-Call Ratio) */}
      <div className="p-2.5 rounded-xl bg-[#090E17] border border-slate-800/90 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>PCR (OI)</span>
          <span
            className={`text-[9px] font-bold px-1 rounded ${
              isPcrBullish ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
            }`}
          >
            {isPcrBullish ? "BULLISH" : "BEARISH"}
          </span>
        </div>
        <div className={`text-sm font-extrabold mt-1 ${isPcrBullish ? "text-emerald-400" : "text-amber-400"}`}>
          {pcr.pcrOI !== null ? pcr.pcrOI.toFixed(2) : "N/A"}
        </div>
        <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
          <span>Vol PCR</span>
          <span className="text-slate-200">{pcr.pcrVolume !== null ? pcr.pcrVolume.toFixed(2) : "N/A"}</span>
        </div>
      </div>

      {/* 4. MAX PAIN */}
      <div className="p-2.5 rounded-xl bg-[#090E17] border border-slate-800/90 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>MAX PAIN</span>
          <Target className="w-3 h-3 text-cyan-400" />
        </div>
        <div className="text-sm font-extrabold text-cyan-300 mt-1">
          {snapshot.maxPain !== null ? snapshot.maxPain.toLocaleString("en-IN") : "N/A"}
        </div>
        <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
          <span>Spot Diff</span>
          <span className={snapshot.spotVsMaxPainDistance && snapshot.spotVsMaxPainDistance > 0 ? "text-emerald-400" : "text-rose-400"}>
            {snapshot.spotVsMaxPainDistance !== null
              ? `${snapshot.spotVsMaxPainDistance > 0 ? "+" : ""}${snapshot.spotVsMaxPainDistance}`
              : "N/A"}
          </span>
        </div>
      </div>

      {/* 5. ATM STRIKE & IV */}
      <div className="p-2.5 rounded-xl bg-[#090E17] border border-slate-800/90 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>ATM STRIKE</span>
          <span className="text-purple-400 text-[9px] font-bold">IV {snapshot.atmIV || "14.5"}%</span>
        </div>
        <div className="text-sm font-extrabold text-purple-300 mt-1">
          {snapshot.atmStrike.toLocaleString("en-IN")}
        </div>
        <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
          <span>Total OI</span>
          <span className="text-slate-300">{formatIndianQuantity(totalOI)}</span>
        </div>
      </div>

      {/* 6. CALL / PUT FLOW TURNOVER */}
      <div className="p-2.5 rounded-xl bg-[#090E17] border border-slate-800/90 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>OPTIONS FLOW</span>
          <Activity className="w-3 h-3 text-cyan-400" />
        </div>
        <div className="text-sm font-extrabold text-slate-100 mt-1">
          {formatIndianCurrency(flow.totalFlowTurnover, currency)}
        </div>
        <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
          <span className="text-emerald-400">{flow.bullishPercentage}% Bull</span>
          <span className="text-rose-400">{flow.bearishPercentage}% Bear</span>
        </div>
      </div>

      {/* 7. FLOW SENTIMENT CONFIDENCE */}
      <div className="p-2.5 rounded-xl bg-[#090E17] border border-slate-800/90 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>FLOW SIGNAL</span>
          <Sparkles className="w-3 h-3 text-amber-400" />
        </div>
        <div
          className={`text-sm font-extrabold mt-1 ${
            flow.overallSentiment === "BULLISH"
              ? "text-emerald-400"
              : flow.overallSentiment === "BEARISH"
              ? "text-rose-400"
              : "text-slate-300"
          }`}
        >
          {flow.overallSentiment} ({flow.confidence}%)
        </div>
        <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
          <span>Classification</span>
          <span className="text-cyan-300 text-[9px] font-bold">Rule-Based</span>
        </div>
      </div>

      {/* 8. UNUSUAL ACTIVITY DETECTOR */}
      <div className="p-2.5 rounded-xl bg-[#090E17] border border-slate-800/90 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>UNUSUAL ACTIVITY</span>
          <Flame className="w-3 h-3 text-orange-400 animate-pulse" />
        </div>
        <div className="text-sm font-extrabold text-orange-300 mt-1">
          {flow.unusualTradeCount} Anomalies
        </div>
        <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
          <span>Vol / OI Spike</span>
          <span className="text-orange-400 font-bold">&gt; 3.0x</span>
        </div>
      </div>
    </div>
  );
};
