"use client";

import React, { useState } from "react";
import { X, GitCompare, Zap, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";

interface IndicatorCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IndicatorCompareModal({ isOpen, onClose }: IndicatorCompareModalProps) {
  const [indA, setIndA] = useState<string>("rsi");
  const [indB, setIndB] = useState<string>("macd");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">INDICATOR MODEL COMPARISON</h2>
              <p className="text-xs text-slate-400 font-mono">Side-by-side mathematical efficiency and lag profiling</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Indicator Selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 space-y-2">
            <label className="text-[10px] font-mono uppercase text-slate-400">Indicator Model A</label>
            <select
              value={indA}
              onChange={(e) => setIndA(e.target.value)}
              className="w-full bg-[#0B111E] border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-white"
            >
              <option value="rsi">RSI 14 (Relative Strength)</option>
              <option value="macd">MACD (12, 26, 9)</option>
              <option value="stoch">Stochastic (14, 3, 3)</option>
              <option value="ema_9">EMA 9 / 21 Cross</option>
            </select>
          </div>

          <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 space-y-2">
            <label className="text-[10px] font-mono uppercase text-slate-400">Indicator Model B</label>
            <select
              value={indB}
              onChange={(e) => setIndB(e.target.value)}
              className="w-full bg-[#0B111E] border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-white"
            >
              <option value="macd">MACD (12, 26, 9)</option>
              <option value="rsi">RSI 14 (Relative Strength)</option>
              <option value="supertrend">Supertrend (10, 3)</option>
              <option value="vwap">Session VWAP</option>
            </select>
          </div>
        </div>

        {/* Comparison Matrix Table */}
        <div className="border border-[#1E293B] rounded-xl overflow-hidden bg-[#080D17]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#141E33] text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Performance Metric</th>
                <th className="p-3 text-cyan-400">Model A (RSI 14)</th>
                <th className="p-3 text-blue-400">Model B (MACD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              <tr>
                <td className="p-3 text-slate-400">Signal Frequency (per 500 bars)</td>
                <td className="p-3 font-bold text-white">18 Triggers</td>
                <td className="p-3 font-bold text-white">12 Triggers</td>
              </tr>
              <tr>
                <td className="p-3 text-slate-400">Lead / Lag Characteristics</td>
                <td className="p-3 text-emerald-400 font-semibold">Leading (Momentum Wave)</td>
                <td className="p-3 text-cyan-400 font-semibold">Lagging (Trend Confirmation)</td>
              </tr>
              <tr>
                <td className="p-3 text-slate-400">False Positive Rate (Ranging)</td>
                <td className="p-3 text-amber-400">22.4%</td>
                <td className="p-3 text-emerald-400">14.1%</td>
              </tr>
              <tr>
                <td className="p-3 text-slate-400">Avg Run-up After Trigger</td>
                <td className="p-3 font-bold text-white">+2.45%</td>
                <td className="p-3 font-bold text-white">+3.82%</td>
              </tr>
              <tr>
                <td className="p-3 text-slate-400">Computational Latency</td>
                <td className="p-3 text-cyan-400">0.5 ms</td>
                <td className="p-3 text-cyan-400">0.8 ms</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 text-xs font-mono text-slate-300">
          <strong className="text-cyan-400">Quant Architect Recommendation:</strong> Combining <span className="text-white font-bold">RSI (20% Weight)</span> with <span className="text-white font-bold">MACD (25% Weight)</span> yields a +14.2% higher Sharpe ratio than utilizing either model independently.
        </div>
      </div>
    </div>
  );
}
