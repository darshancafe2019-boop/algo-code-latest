"use client";

import React, { useState } from "react";
import {
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Activity,
  ShieldCheck,
  TrendingUp,
  BarChart2
} from "lucide-react";
import { MarketSummaryData } from "@/types/indicator";

interface MarketSummaryCardProps {
  summary?: MarketSummaryData | null;
}

export function MarketSummaryCard({ summary }: MarketSummaryCardProps) {
  const [showWhy, setShowWhy] = useState(false);

  const defaultSummary: MarketSummaryData = {
    decision: "LONG",
    bull_score: 66.7,
    bear_score: 16.7,
    confluence_pct: 66.7,
    regime: "TRENDING_BULL",
    volatility: "NORMAL",
    bias: "BULLISH BIAS",
    threshold_long: 75.0,
    threshold_short: 75.0,
    contributing_factors: [
      "EMA 20 > EMA 50 Structural Alignment",
      "Price > Session VWAP ($78,610.00)",
      "MACD Histogram Expanding above Signal Line",
      "Volume > 1.2x 20-period Volume Average",
    ],
    opposing_factors: [
      "RSI (58.4) below strong breakout threshold (65.0)",
    ],
  };

  const data = summary || defaultSummary;
  const bullPct = Math.round(data.bull_score || 0);
  const bearPct = Math.round(data.bear_score || 0);
  const neutralPct = Math.max(0, 100 - bullPct - bearPct);

  const isBullish = data.decision === "LONG" || bullPct > bearPct;
  const isBearish = data.decision === "SHORT" || bearPct > bullPct;

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
            Market Summary
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold uppercase">
            {data.regime.replace("_", " ")}
          </span>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold uppercase">
            Vol: {data.volatility}
          </span>
        </div>
      </div>

      {/* Grid of 4 Core Qualitative Signals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-sans">
        {/* 1. Trend */}
        <div className="p-3 rounded-xl bg-[#141E33] border border-slate-800 space-y-0.5">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Trend</div>
          <div className={`font-bold text-sm ${isBullish ? "text-emerald-400" : isBearish ? "text-red-400" : "text-slate-200"}`}>
            {isBullish ? "BULLISH" : isBearish ? "BEARISH" : "NEUTRAL"}
          </div>
        </div>

        {/* 2. Momentum */}
        <div className="p-3 rounded-xl bg-[#141E33] border border-slate-800 space-y-0.5">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Momentum</div>
          <div className="font-bold text-sm text-cyan-400">
            {bullPct >= 50 ? "BULLISH" : bearPct >= 50 ? "BEARISH" : "NEUTRAL"}
          </div>
        </div>

        {/* 3. Volume */}
        <div className="p-3 rounded-xl bg-[#141E33] border border-slate-800 space-y-0.5">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Volume</div>
          <div className="font-bold text-sm text-slate-200">
            {data.volatility === "HIGH" ? "ELEVATED" : "NORMAL"}
          </div>
        </div>

        {/* 4. Overall Bias */}
        <div className="p-3 rounded-xl bg-[#141E33] border border-slate-800 space-y-0.5">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Overall Bias</div>
          <div className={`font-bold text-sm ${
            data.decision === "LONG" ? "text-emerald-400" : data.decision === "SHORT" ? "text-red-400" : "text-amber-400"
          }`}>
            {data.bias || (isBullish ? "BULLISH BIAS" : isBearish ? "BEARISH BIAS" : "NEUTRAL")}
          </div>
        </div>
      </div>

      {/* Confluence Percentage Bar */}
      <div className="space-y-2 pt-2 border-t border-slate-850">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white font-sans text-xs">Indicator Confluence</span>
            <span className="text-[11px] text-slate-400">
              (Bullish {bullPct}% • Bearish {bearPct}% • Neutral {neutralPct}%)
            </span>
          </div>

          <button
            onClick={() => setShowWhy(!showWhy)}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 font-sans flex items-center gap-1 transition-colors"
          >
            <span>Why?</span>
            {showWhy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Multi-segment Confluence Bar */}
        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden flex">
          <div
            style={{ width: `${bullPct}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`Bullish Confluence: ${bullPct}%`}
          />
          <div
            style={{ width: `${neutralPct}%` }}
            className="bg-slate-600 transition-all duration-500"
            title={`Neutral: ${neutralPct}%`}
          />
          <div
            style={{ width: `${bearPct}%` }}
            className="bg-red-500 transition-all duration-500"
            title={`Bearish Confluence: ${bearPct}%`}
          />
        </div>
      </div>

      {/* Expandable "Why?" Contributing Factors Breakdown */}
      {showWhy && (
        <div className="p-4 rounded-xl bg-[#080D17] border border-slate-800 space-y-3 animate-in fade-in duration-150 text-xs font-sans">
          {data.contributing_factors && data.contributing_factors.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-emerald-400 font-mono uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Supporting Factors (Bullish Alignment):</span>
              </div>
              <div className="space-y-1 pl-5">
                {data.contributing_factors.map((factor, i) => (
                  <div key={i} className="text-slate-300 font-mono text-[11px]">
                    ✓ {factor}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.opposing_factors && data.opposing_factors.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-850">
              <div className="text-[11px] font-bold text-amber-400 font-mono uppercase flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                <span>Opposing / Incomplete Factors:</span>
              </div>
              <div className="space-y-1 pl-5">
                {data.opposing_factors.map((factor, i) => (
                  <div key={i} className="text-slate-400 font-mono text-[11px]">
                    ✕ {factor}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
