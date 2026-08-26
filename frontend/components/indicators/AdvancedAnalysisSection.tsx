"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Layers, Activity, BarChart3, GitCompare, Clock, CheckCircle2, Shield } from "lucide-react";
import { MultiTimeframeIndicatorMatrix } from "./MultiTimeframeIndicatorMatrix";
import { IndicatorDiagnosticsPanel } from "./IndicatorDiagnosticsPanel";

interface AdvancedAnalysisSectionProps {
  symbol: string;
  onOpenBacktest: () => void;
  onOpenCompare: () => void;
}

export function AdvancedAnalysisSection({
  symbol,
  onOpenBacktest,
  onOpenCompare,
}: AdvancedAnalysisSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"mtf" | "diagnostics" | "tools">("mtf");

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl shadow-xl overflow-hidden transition-all">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-[#141E33]/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
            Advanced Analysis
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
            Multi-Timeframe • Diagnostics • Compare • Backtest
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 font-sans">
          <span>{isExpanded ? "Hide Details" : "Show Details"}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 sm:p-5 border-t border-slate-800 space-y-4 animate-in fade-in duration-200">
          {/* Sub-navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setActiveTab("mtf")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "mtf"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40"
                  : "bg-[#141E33] text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Multi-Timeframe Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab("diagnostics")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "diagnostics"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40"
                  : "bg-[#141E33] text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Engine Diagnostics</span>
            </button>

            <button
              onClick={() => setActiveTab("tools")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "tools"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40"
                  : "bg-[#141E33] text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Quantitative Lab</span>
            </button>
          </div>

          {/* TAB 1: Multi-Timeframe Analysis */}
          {activeTab === "mtf" && (
            <div className="space-y-2">
              <MultiTimeframeIndicatorMatrix symbol={symbol} />
            </div>
          )}

          {/* TAB 2: Engine Diagnostics */}
          {activeTab === "diagnostics" && (
            <div className="space-y-2">
              <IndicatorDiagnosticsPanel />
            </div>
          )}

          {/* TAB 3: Tools & Backtesting */}
          {activeTab === "tools" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Backtest Trigger Card */}
              <div className="p-4 rounded-xl bg-[#141E33] border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <div className="font-bold text-sm text-white font-sans">
                    Indicator Historical Backtesting
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-sans">
                  Simulate individual indicator predictive performance and win rate over historical candles without lookahead bias.
                </p>
                <button
                  onClick={onOpenBacktest}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-sans transition-all"
                >
                  Launch Backtester
                </button>
              </div>

              {/* Compare Trigger Card */}
              <div className="p-4 rounded-xl bg-[#141E33] border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-cyan-400" />
                  <div className="font-bold text-sm text-white font-sans">
                    Cross-Indicator Comparison
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-sans">
                  Overlay and compare multiple indicators (e.g. EMA 20 vs EMA 50 vs VWAP) to evaluate correlation and lag.
                </p>
                <button
                  onClick={onOpenCompare}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold font-sans transition-all"
                >
                  Compare Models
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
