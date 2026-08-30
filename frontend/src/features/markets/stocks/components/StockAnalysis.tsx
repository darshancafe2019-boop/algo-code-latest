"use client";

import React from "react";
import { StockAnalysisResult } from "../types/stocks";
import { getTrendColor } from "../utils/stock-colors";
import { Sparkles, ShieldCheck, Gauge, Layers, Info } from "lucide-react";

interface StockAnalysisProps {
  analysis?: StockAnalysisResult;
}

export const StockAnalysis: React.FC<StockAnalysisProps> = ({ analysis }) => {
  if (!analysis) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs">
        No quantitative analysis calculated for this instrument.
      </div>
    );
  }

  const trendStyle = getTrendColor(analysis.directional_bias);

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Primary Score & Bias Banner */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Quant.OS Quantitative Score</span>
          </div>
          <span className="text-[10px] text-slate-500">{analysis.timeframe.toUpperCase()} Timeframe</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-3xl font-black text-white tracking-tight">
              {analysis.overall_score.toFixed(0)}
              <span className="text-xs text-slate-500 font-normal ml-1">/ 100</span>
            </div>
            <div className="mt-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] border ${trendStyle.bg} ${trendStyle.text} ${trendStyle.border}`}>
                {analysis.directional_bias.replace("_", " ")}
              </span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="flex items-center gap-1 justify-end text-slate-400 text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{analysis.confidence_score.toFixed(0)}% Confidence</span>
            </div>
            <div className="text-[10px] text-slate-500">
              {analysis.data_points_used} Data Points Used
            </div>
          </div>
        </div>
      </div>

      {/* Human-Readable Rationale Explanation */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px]">
          <Info className="w-3.5 h-3.5" />
          <span>Analysis Summary</span>
        </div>
        <p className="text-slate-300 text-xs leading-relaxed">
          {analysis.summary_explanation}
        </p>
      </div>

      {/* Factor Breakdown Grid */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Factor Breakdown</span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 block">Technical Score</span>
            <div className="flex items-baseline justify-between">
              <span className="text-white font-bold">{analysis.technical_score.toFixed(0)}</span>
              <span className="text-[10px] text-slate-500">/100</span>
            </div>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 block">Momentum Score</span>
            <div className="flex items-baseline justify-between">
              <span className="text-cyan-400 font-bold">{analysis.momentum_score.toFixed(0)}</span>
              <span className="text-[10px] text-slate-500">/100</span>
            </div>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 block">Liquidity Score</span>
            <div className="flex items-baseline justify-between">
              <span className="text-emerald-400 font-bold">{analysis.liquidity_score.toFixed(0)}</span>
              <span className="text-[10px] text-slate-500">/100</span>
            </div>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 block">Risk Score</span>
            <div className="flex items-baseline justify-between">
              <span className="text-amber-400 font-bold">{analysis.risk_score.toFixed(0)}</span>
              <span className="text-[10px] text-slate-500">/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Indicators Used Chips */}
      {analysis.indicators_used.length > 0 && (
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Indicators Evaluated</span>
          <div className="flex flex-wrap gap-1.5">
            {analysis.indicators_used.map((ind, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-800 border border-slate-700 text-slate-300"
              >
                {ind}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Latency & Timestamp Telemetry */}
      <div className="text-[10px] text-slate-500 flex items-center justify-between px-1">
        <span>Deterministic v2.0 Engine</span>
        <span>Calculated in {analysis.calculation_latency_ms}ms</span>
      </div>
    </div>
  );
};
