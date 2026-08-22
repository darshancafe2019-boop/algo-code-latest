"use client";

import React from "react";
import { Gauge, CheckCircle2, XCircle, AlertCircle, ArrowUpRight, ArrowDownRight, ShieldCheck, Compass } from "lucide-react";
import { ConfluenceEvaluation } from "@/types/indicator";

interface ConfluenceScoreGaugeProps {
  evaluation?: ConfluenceEvaluation;
}

export function ConfluenceScoreGauge({ evaluation }: ConfluenceScoreGaugeProps) {
  const defaultEval: ConfluenceEvaluation = {
    overall_score_pct: 82.6,
    direction: "BUY",
    bull_score_pct: 82.6,
    bear_score_pct: 17.4,
    neutral_score_pct: 0.0,
    market_regime: "TRENDING",
    adx: 28.4,
    positive_factors: [
      "EMA 9 > EMA 21 > EMA 200 Structural Bull Alignment (+25% weight)",
      "RSI (14) = 54.2 with Bullish Momentum Slope (+20% weight)",
      "MACD Histogram Expanding above Zero Signal (+20% weight)",
      "Session VWAP: Price Trading Above Band 1 (+17.6% weight)",
    ],
    negative_factors: [
      "Volume Profile: Approaching Local Resistance at $60,200 (-10% weight)",
      "ATR 14: Minor Volatility Compression (-7.4% weight)",
    ],
    decision: "EXECUTE BUY",
  };

  const data = evaluation || defaultEval;
  const isBuy = data.direction === "BUY";
  const isSell = data.direction === "SELL";

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            QUANTITATIVE CONFLUENCE ENGINE & REGIME
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <Compass className="w-3 h-3" />
            REGIME: {data.market_regime} (ADX {data.adx.toFixed(1)})
          </span>
        </div>
      </div>

      {/* Main Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Bull Score */}
        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">Bullish Confluence</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
              {data.bull_score_pct.toFixed(1)}%
            </div>
            <div className="text-[10px] text-emerald-500 font-mono mt-0.5">Active Long Bias</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* 2. Bear Score */}
        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">Bearish Confluence</div>
            <div className="text-2xl font-bold font-mono text-red-400 mt-0.5">
              {data.bear_score_pct.toFixed(1)}%
            </div>
            <div className="text-[10px] text-red-500 font-mono mt-0.5">Active Short Resistance</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/30">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        {/* 3. Decision */}
        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">Strategy Decision Gate</div>
            <div className={`text-base font-bold font-mono mt-0.5 ${
              isBuy ? "text-emerald-400" : isSell ? "text-red-400" : "text-amber-400"
            }`}>
              {data.decision}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Threshold: 75.0%</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Weight Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span className="text-emerald-400 font-bold">Bullish: {data.bull_score_pct.toFixed(1)}%</span>
          <span className="text-red-400 font-bold">Bearish: {data.bear_score_pct.toFixed(1)}%</span>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex border border-slate-700">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${data.bull_score_pct}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-red-500 to-rose-600 transition-all duration-500"
            style={{ width: `${data.bear_score_pct}%` }}
          />
        </div>
      </div>

      {/* Plain-English Factor Attribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
        {/* Positive Factors */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono uppercase">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Contributing Bullish Factors ({data.positive_factors.length})
          </div>
          <div className="space-y-1">
            {data.positive_factors.map((factor, idx) => (
              <div key={idx} className="text-[11px] bg-[#141E33] border border-emerald-900/40 rounded-lg p-2 text-slate-200 font-mono">
                {factor}
              </div>
            ))}
          </div>
        </div>

        {/* Negative / Counter Factors */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-red-400 flex items-center gap-1.5 font-mono uppercase">
            <XCircle className="w-3.5 h-3.5" />
            Counter / Resistance Factors ({data.negative_factors.length})
          </div>
          <div className="space-y-1">
            {data.negative_factors.map((factor, idx) => (
              <div key={idx} className="text-[11px] bg-[#141E33] border border-red-900/40 rounded-lg p-2 text-slate-300 font-mono">
                {factor}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
