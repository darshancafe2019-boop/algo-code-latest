"use client";

import React from "react";
import {
  Compass,
  Activity,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Layers,
  Zap,
  RefreshCw,
  Coins,
  Shield,
  ArrowRight,
} from "lucide-react";
import { useStrategyStore } from "@/lib/strategies/strategyStore";
import { REGIME_STRATEGY_MAP, MarketRegimeType } from "@/lib/strategies/regimeEngine";
import { CRYPTO_30_STRATEGIES } from "@/lib/strategies/crypto30Strategies";

export function StrategyRegimeView() {
  const { regimeState, setSelectedCategory, setActiveViewTab } = useStrategyStore();

  const allRegimes: MarketRegimeType[] = [
    "TRENDING",
    "RANGING",
    "BREAKOUT / EXPANSION",
    "HIGH VOLATILITY",
    "LOW VOLATILITY",
    "STRUCTURAL REVERSAL",
  ];

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0B0F19] border border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-900/40">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Market Regime Classification Engine
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                ACTIVE REGIME: {regimeState.regime}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Detects macro quantitative state to identify eligible strategy candidates. Individual rules still must independently pass.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-[#0E1628] border border-[#1A2840]">
            <span className="text-[10px] text-slate-400 block">CONFIDENCE SCORE</span>
            <span className="font-bold text-emerald-400">{regimeState.confidenceScore}%</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0E1628] border border-[#1A2840]">
            <span className="text-[10px] text-slate-400 block">CANDIDATE POOL</span>
            <span className="font-bold text-cyan-300">{regimeState.candidateStrategiesCount} Strategies Eligible</span>
          </div>
        </div>
      </div>

      {/* Active Quantitative Indicator Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-[#0C1220] border border-[#1E2E4A] space-y-1 font-mono text-xs">
          <span className="text-[10px] text-slate-400 block">ADX TREND STRENGTH</span>
          <span className="text-base font-bold text-cyan-300">{regimeState.metrics.adx.toFixed(1)}</span>
          <span className="text-[10px] text-slate-500 block">&gt; 25 indicates trending</span>
        </div>

        <div className="p-3 rounded-xl bg-[#0C1220] border border-[#1E2E4A] space-y-1 font-mono text-xs">
          <span className="text-[10px] text-slate-400 block">BANDWIDTH PERCENTILE</span>
          <span className="text-base font-bold text-amber-300">{regimeState.metrics.bandwidthPercentile}th Pct</span>
          <span className="text-[10px] text-slate-500 block">&lt; 15% is squeeze</span>
        </div>

        <div className="p-3 rounded-xl bg-[#0C1220] border border-[#1E2E4A] space-y-1 font-mono text-xs">
          <span className="text-[10px] text-slate-400 block">ATR VOLATILITY</span>
          <span className="text-base font-bold text-white">{regimeState.metrics.atrPercentile}th Pct</span>
          <span className="text-[10px] text-slate-500 block">Relative 14-period range</span>
        </div>

        <div className="p-3 rounded-xl bg-[#0C1220] border border-[#1E2E4A] space-y-1 font-mono text-xs">
          <span className="text-[10px] text-slate-400 block">RSI MOMENTUM</span>
          <span className="text-base font-bold text-emerald-400">{regimeState.metrics.rsi.toFixed(1)}</span>
          <span className="text-[10px] text-slate-500 block">Balanced zone (40-60)</span>
        </div>

        <div className="p-3 rounded-xl bg-[#0C1220] border border-[#1E2E4A] space-y-1 font-mono text-xs">
          <span className="text-[10px] text-slate-400 block">VOLUME FLOW</span>
          <span className="text-base font-bold text-cyan-400">{regimeState.metrics.volumeTrend}</span>
          <span className="text-[10px] text-slate-500 block">Normalized session flow</span>
        </div>

        <div className="p-3 rounded-xl bg-[#0C1220] border border-[#1E2E4A] space-y-1 font-mono text-xs">
          <span className="text-[10px] text-slate-400 block">LIQUIDITY SCORE</span>
          <span className="text-base font-bold text-emerald-400">{regimeState.metrics.liquidityScore}/100</span>
          <span className="text-[10px] text-slate-500 block">Tight spreads verified</span>
        </div>
      </div>

      {/* Regimes Matrix with Candidate Strategies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allRegimes.map((regime) => {
          const isActive = regimeState.regime === regime;
          const candidateNums = REGIME_STRATEGY_MAP[regime] || [];
          const candidateStrats = CRYPTO_30_STRATEGIES.filter((s) => candidateNums.includes(s.number));

          return (
            <div
              key={regime}
              className={`p-5 rounded-2xl border transition-all space-y-3 ${
                isActive
                  ? "bg-[#0E182A] border-amber-500/50 shadow-xl shadow-amber-950/30"
                  : "bg-[#090E1A] border-[#1A253C] opacity-80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                  {regime}
                </span>
                {isActive && (
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 text-[10px] font-mono font-bold border border-amber-800 animate-pulse">
                    CURRENT STATE
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400">
                {candidateNums.length} candidate strategies mapped to this market phase.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#16233B]">
                {candidateStrats.map((strat) => (
                  <span
                    key={strat.number}
                    className={`px-2 py-1 rounded text-[11px] font-mono font-semibold ${
                      isActive
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-[#141E30] text-slate-300 border border-[#202E48]"
                    }`}
                  >
                    #{strat.number} {strat.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
