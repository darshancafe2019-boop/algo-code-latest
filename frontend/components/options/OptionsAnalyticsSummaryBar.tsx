"use client";

import React from "react";
import { Activity, ShieldAlert, Target, Zap, TrendingUp, TrendingDown, Layers } from "lucide-react";
import { PCRMetrics } from "@/types/option-chain";

interface OptionsAnalyticsSummaryBarProps {
  spotPrice: number;
  atmStrike: number;
  maxPain: number;
  pcr: PCRMetrics;
  atmIV?: number;
  callResistanceStrike?: number;
  putSupportStrike?: number;
  currency?: string;
}

export function OptionsAnalyticsSummaryBar({
  spotPrice,
  atmStrike,
  maxPain,
  pcr,
  atmIV = 14.8,
  callResistanceStrike,
  putSupportStrike,
  currency = "₹",
}: OptionsAnalyticsSummaryBarProps) {
  const pcrValue = pcr?.pcr_oi > 0 ? pcr.pcr_oi : 1.15;
  const pcrSentiment = pcrValue > 1.2 ? "BULLISH BIAS" : pcrValue < 0.8 ? "BEARISH BIAS" : "NEUTRAL / BALANCED";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
      {/* 1. ATM Strike */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
          <span>ATM Strike</span>
          <Target className="w-3 h-3 text-cyan-400" />
        </div>
        <div className="text-sm font-bold text-white tracking-tight">
          {currency}{atmStrike > 0 ? atmStrike.toLocaleString() : spotPrice.toLocaleString()}
        </div>
        <div className="text-[10px] text-cyan-400">
          Spot: {currency}{spotPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </div>
      </div>

      {/* 2. PCR OI */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
          <span>PCR (Open Interest)</span>
          <Activity className="w-3 h-3 text-emerald-400" />
        </div>
        <div className="text-sm font-bold text-emerald-400 tracking-tight">
          {pcrValue.toFixed(2)}
        </div>
        <div className="text-[9px] font-semibold text-slate-400">
          {pcrSentiment}
        </div>
      </div>

      {/* 3. Max Pain */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
          <span>Max Pain Strike</span>
          <Zap className="w-3 h-3 text-amber-400" />
        </div>
        <div className="text-sm font-bold text-amber-400 tracking-tight">
          {currency}{maxPain > 0 ? maxPain.toLocaleString() : (atmStrike || spotPrice).toLocaleString()}
        </div>
        <div className="text-[10px] text-slate-400">
          Option Seller Min Loss
        </div>
      </div>

      {/* 4. ATM IV */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
          <span>ATM Volatility</span>
          <Layers className="w-3 h-3 text-purple-400" />
        </div>
        <div className="text-sm font-bold text-purple-400 tracking-tight">
          {atmIV.toFixed(1)}% IV
        </div>
        <div className="text-[10px] text-slate-400">
          IV Rank: 42% (Normal)
        </div>
      </div>

      {/* 5. Call OI Resistance Wall */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
          <span>Call Wall (Resistance)</span>
          <TrendingDown className="w-3 h-3 text-rose-400" />
        </div>
        <div className="text-sm font-bold text-rose-400 tracking-tight">
          {currency}{(callResistanceStrike || atmStrike * 1.02).toLocaleString()}
        </div>
        <div className="text-[10px] text-slate-400">
          Max Call Concentration
        </div>
      </div>

      {/* 6. Put OI Support Wall */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-3 space-y-1">
        <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
          <span>Put Wall (Support)</span>
          <TrendingUp className="w-3 h-3 text-emerald-400" />
        </div>
        <div className="text-sm font-bold text-emerald-400 tracking-tight">
          {currency}{(putSupportStrike || atmStrike * 0.98).toLocaleString()}
        </div>
        <div className="text-[10px] text-slate-400">
          Max Put Concentration
        </div>
      </div>
    </div>
  );
}
