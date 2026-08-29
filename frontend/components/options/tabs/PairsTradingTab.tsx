"use client";

import React, { useState, useEffect } from "react";
import {
  PairCandidate,
  PairAnalysisResult,
  NeutralizationMode,
  PairEntryDirection,
} from "@/types/pairs-trading";
import { PairSpreadChart } from "../PairSpreadChart";
import {
  Activity,
  Zap,
  Sliders,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Send,
  Shield,
  Layers
} from "lucide-react";

export interface PairsTradingTabProps {
  onExecutePairTrade?: (payload: any) => void;
  onSelectPairForOptions?: (pair: PairAnalysisResult) => void;
}

export function PairsTradingTab({
  onExecutePairTrade,
  onSelectPairForOptions,
}: PairsTradingTabProps) {
  const [marketFilter, setMarketFilter] = useState<string>("ALL");
  const [scannedPairs, setScannedPairs] = useState<PairAnalysisResult[]>([]);
  const [selectedPair, setSelectedPair] = useState<PairAnalysisResult | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [sizingMode, setSizingMode] = useState<NeutralizationMode>("REGRESSION_HEDGE_RATIO");
  const [allocatedCapital, setAllocatedCapital] = useState<number>(25000);

  const runPairScan = React.useCallback(async () => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/options/pairs/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market: marketFilter,
          lookback: 180,
          min_correlation: 0.60,
          max_half_life: 90.0,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.pairs || [];
        setScannedPairs(list);
        if (list.length > 0) {
          setSelectedPair(list[0]);
        }
      }
    } catch (err) {
      console.error("Pair scan failed:", err);
    } finally {
      setIsScanning(false);
    }
  }, [marketFilter]);

  // Scan pairs on mount and market filter change
  useEffect(() => {
    runPairScan();
  }, [runPairScan]);

  const handleSelectPair = async (pairId: string) => {
    try {
      const res = await fetch("/api/options/pairs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pair_id: pairId, lookback: 180 }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedPair(data.analysis);
      }
    } catch (err) {
      console.error("Pair analyze error:", err);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Filter & Universe Bar */}
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-bold">Universe:</span>
          {(["ALL", "India", "Global", "Crypto"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMarketFilter(m)}
              className={`px-3 py-1 rounded-xl font-bold transition ${
                marketFilter === m
                  ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {m === "ALL" ? "All Markets" : m}
            </button>
          ))}
        </div>

        <button
          onClick={runPairScan}
          disabled={isScanning}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-900/40 font-bold transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
          <span>{isScanning ? "Scanning Matrix..." : "Rescan Universe"}</span>
        </button>
      </div>

      {/* Main Grid: Left Pairs Scanner Table | Right Selected Pair Deep-Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 5 Cols: Scanned Ranked Pairs List */}
        <div className="lg:col-span-5 bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-slate-200 font-bold uppercase text-[11px] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Cointegrated Candidates ({scannedPairs.length})
            </h3>
            <span className="text-slate-400 text-[10px]">Ranked by Stability Score</span>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {scannedPairs.map((p) => {
              const isSelected = selectedPair?.pair_id === p.pair_id;
              const isLongA = p.suggested_direction === "LONG_A_SHORT_B";
              const isShortA = p.suggested_direction === "SHORT_A_LONG_B";

              return (
                <div
                  key={p.pair_id}
                  onClick={() => handleSelectPair(p.pair_id)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-500/60 shadow-lg"
                      : "bg-slate-900/70 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-extrabold text-white text-sm">
                      {p.symbol_a} / {p.symbol_b}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 text-[10px]">
                        {p.market}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-black">
                        Score: {p.composite_rank_score}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-400 mb-2">
                    <div>
                      <span>Corr:</span> <b className="text-slate-200">{p.correlation}</b>
                    </div>
                    <div>
                      <span>&beta; OLS:</span> <b className="text-cyan-400">{p.hedge_ratio}</b>
                    </div>
                    <div>
                      <span>ADF p:</span>{" "}
                      <b className={p.adf_pvalue < 0.05 ? "text-emerald-400" : "text-amber-400"}>
                        {p.adf_pvalue}
                      </b>
                    </div>
                    <div>
                      <span>Half-Life:</span> <b className="text-slate-200">{p.half_life_days}d</b>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">Z-Score:</span>
                      <span
                        className={`font-black text-xs ${
                          p.current_zscore >= 2.0
                            ? "text-rose-400"
                            : p.current_zscore <= -2.0
                            ? "text-emerald-400"
                            : "text-slate-300"
                        }`}
                      >
                        {p.current_zscore.toFixed(2)}σ
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        isLongA
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                          : isShortA
                          ? "bg-rose-950 text-rose-300 border border-rose-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isLongA
                        ? `BUY ${p.symbol_a} / SELL ${p.symbol_b}`
                        : isShortA
                        ? `SELL ${p.symbol_a} / BUY ${p.symbol_b}`
                        : "FLAT (Equilibrium)"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 7 Cols: Detailed Cointegration Metrics & Spread Chart */}
        <div className="lg:col-span-7 space-y-4">
          {selectedPair && (
            <>
              {/* Statistical Diagnostic Card */}
              <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-white font-extrabold text-base">
                      {selectedPair.symbol_a} &amp; {selectedPair.symbol_b} Diagnostic
                    </h3>
                    <div className="text-slate-400 text-[11px]">
                      Asset Class: {selectedPair.asset_class} | Regime:{" "}
                      <span className="text-cyan-400 font-bold">{selectedPair.regime}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectPairForOptions?.(selectedPair)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-extrabold hover:from-cyan-400 hover:to-indigo-400 transition shadow-lg shadow-cyan-500/20"
                  >
                    <span>Build Pair with Options</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 6 Key Statistical Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Engle-Granger Cointegration</div>
                    <div className="font-extrabold text-sm text-white">
                      p = {selectedPair.cointegration_pvalue}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-bold">
                      {selectedPair.is_cointegrated ? "✓ Cointegrated (95%)" : "✗ Not Cointegrated"}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">ADF Stationarity on Spread</div>
                    <div className="font-extrabold text-sm text-white">
                      t = {selectedPair.adf_statistic}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-bold">
                      {selectedPair.is_stationary ? "✓ Stationary Series" : "✗ Unit Root Non-Stationary"}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">OLS Hedge Ratio (&beta;)</div>
                    <div className="font-extrabold text-sm text-cyan-400">
                      {selectedPair.hedge_ratio}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Rolling 30d: {selectedPair.rolling_hedge_ratio_30d}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Mean Reversion Half-Life</div>
                    <div className="font-extrabold text-sm text-white">
                      {selectedPair.half_life_days} Days
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Crossings: {selectedPair.mean_crossings_count}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">R-Squared &amp; Correlation</div>
                    <div className="font-extrabold text-sm text-white">
                      R² = {selectedPair.r_squared}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Pearson r = {selectedPair.correlation}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Parameter Stability</div>
                    <div className="font-extrabold text-sm text-emerald-400">
                      {selectedPair.parameter_stability_pct}%
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Annual Turnover: {selectedPair.estimated_annual_turnover}x
                    </div>
                  </div>
                </div>

                {/* Neutralization & Execution Bar */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Neutralization:</span>
                    <select
                      value={sizingMode}
                      onChange={(e) => setSizingMode(e.target.value as any)}
                      className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 font-bold"
                    >
                      <option value="REGRESSION_HEDGE_RATIO">Regression Hedge Ratio (β)</option>
                      <option value="DOLLAR_NEUTRAL">Dollar Neutral (50/50)</option>
                      <option value="BETA_NEUTRAL">Beta Neutral</option>
                      <option value="VOLATILITY_NEUTRAL">Volatility Neutral</option>
                      <option value="EQUAL_QUANTITY">Equal Quantity (1:1)</option>
                    </select>

                    <span className="text-slate-400 text-[11px] ml-2">Capital:</span>
                    <input
                      type="number"
                      value={allocatedCapital}
                      onChange={(e) => setAllocatedCapital(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
                    />
                  </div>

                  <button
                    onClick={() =>
                      onExecutePairTrade?.({
                        pair_id: selectedPair.pair_id,
                        symbol_a: selectedPair.symbol_a,
                        symbol_b: selectedPair.symbol_b,
                        direction: selectedPair.suggested_direction,
                        hedge_ratio: selectedPair.hedge_ratio,
                        allocated_capital: allocatedCapital,
                        sizing_mode: sizingMode,
                      })
                    }
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold transition shadow-md shadow-cyan-500/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Execute Pair Order</span>
                  </button>
                </div>
              </div>

              {/* Spread & Z-Score Chart */}
              <PairSpreadChart analysis={selectedPair} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
