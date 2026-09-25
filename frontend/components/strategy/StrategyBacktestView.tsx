"use client";

import React, { useState } from "react";
import {
  FlaskConical,
  Play,
  RotateCcw,
  TrendingUp,
  BarChart2,
  Calendar,
  Sliders,
  DollarSign,
  Percent,
  Layers,
  ArrowRight,
  Shield,
  Clock,
  Zap,
} from "lucide-react";
import { useStrategyStore } from "@/lib/strategies/strategyStore";
import { CRYPTO_30_STRATEGIES, CryptoStrategyDefinition } from "@/lib/strategies/crypto30Strategies";
import { formatMoney } from "@/lib/formatters";

export function StrategyBacktestView() {
  const {
    strategies,
    selectedStrategyId,
    backtestResults,
    activeBacktestRunning,
    runBacktestForStrategy,
    setSelectedStrategyId,
  } = useStrategyStore();

  const activeStrategy =
    strategies.find((s) => s.id === selectedStrategyId) || strategies[0];

  const [instrument, setInstrument] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState(activeStrategy.primaryTimeframe || "4H");
  const [initialCapital, setInitialCapital] = useState(100000);
  const [riskPct, setRiskPct] = useState(0.5);
  const [leverage, setLeverage] = useState(1);
  const [directionFilter, setDirectionFilter] = useState<"BOTH" | "LONG_ONLY" | "SHORT_ONLY">("BOTH");

  const results = backtestResults[activeStrategy.number];

  const handleRunBacktest = () => {
    runBacktestForStrategy(activeStrategy.number, {
      instrument,
      timeframe,
      initialCapital,
      riskPctPerTrade: riskPct,
      leverage,
      directionFilter,
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0B0F19] border border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-900/40">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Quantitative Backtest Lab
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                DATASET: BACKTEST ONLY
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Deterministic historical simulation with fee, slippage, and funding cost accounting.
            </p>
          </div>
        </div>

        {/* Strategy Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={activeStrategy.id}
            onChange={(e) => setSelectedStrategyId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#121A2B] border border-[#223552] text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
          >
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.number} {s.name} ({s.category})
              </option>
            ))}
          </select>

          <button
            onClick={handleRunBacktest}
            disabled={activeBacktestRunning}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono font-bold shadow-lg shadow-cyan-950/40 transition disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{activeBacktestRunning ? "SIMULATING..." : "RUN BACKTEST"}</span>
          </button>
        </div>
      </div>

      {/* Backtest Configuration Parameters Box */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-xl bg-[#090E1A] border border-[#1E293B]">
        <div>
          <label className="text-[10px] font-mono text-slate-400 block mb-1">INSTRUMENT</label>
          <select
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            className="w-full px-2.5 py-1 rounded-lg bg-[#060A14] border border-[#1A2840] text-xs font-mono text-white"
          >
            <option value="BTCUSDT">BTCUSDT</option>
            <option value="ETHUSDT">ETHUSDT</option>
            <option value="SOLUSDT">SOLUSDT</option>
            <option value="AVAXUSDT">AVAXUSDT</option>
            <option value="NEARUSDT">NEARUSDT</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-mono text-slate-400 block mb-1">TIMEFRAME</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="w-full px-2.5 py-1 rounded-lg bg-[#060A14] border border-[#1A2840] text-xs font-mono text-white"
          >
            <option value="15m">15m</option>
            <option value="1H">1H</option>
            <option value="4H">4H</option>
            <option value="1D">1D</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-mono text-slate-400 block mb-1">INITIAL CAPITAL ($)</label>
          <input
            type="number"
            value={initialCapital}
            onChange={(e) => setInitialCapital(Number(e.target.value))}
            className="w-full px-2.5 py-1 rounded-lg bg-[#060A14] border border-[#1A2840] text-xs font-mono text-white"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono text-slate-400 block mb-1">RISK PER TRADE (%)</label>
          <input
            type="number"
            step="0.1"
            value={riskPct}
            onChange={(e) => setRiskPct(Number(e.target.value))}
            className="w-full px-2.5 py-1 rounded-lg bg-[#060A14] border border-[#1A2840] text-xs font-mono text-cyan-300"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono text-slate-400 block mb-1">LEVERAGE</label>
          <select
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full px-2.5 py-1 rounded-lg bg-[#060A14] border border-[#1A2840] text-xs font-mono text-white"
          >
            <option value={1}>1x (Spot / Spot Margin)</option>
            <option value={2}>2x (Low Risk)</option>
            <option value={3}>3x (Moderate)</option>
            <option value={5}>5x (Derivatives)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-mono text-slate-400 block mb-1">DIRECTION FILTER</label>
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value as any)}
            className="w-full px-2.5 py-1 rounded-lg bg-[#060A14] border border-[#1A2840] text-xs font-mono text-white"
          >
            <option value="BOTH">Both (Long & Short)</option>
            <option value="LONG_ONLY">Long Only</option>
            <option value="SHORT_ONLY">Short Only</option>
          </select>
        </div>
      </div>

      {results && (
        <>
          {/* Key Executive KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0D1526] border border-[#1E293B] space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">NET P&L</span>
              <span className={`text-base font-mono font-bold ${results.netPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {results.netPnl >= 0 ? "+" : ""}{formatMoney(results.netPnl)}
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">
                {results.netReturnPct >= 0 ? "+" : ""}{results.netReturnPct}% Return
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0D1526] border border-[#1E293B] space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">WIN RATE</span>
              <span className="text-base font-mono font-bold text-cyan-300">
                {results.winRatePct}%
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">
                {results.winningTrades}W / {results.losingTrades}L ({results.totalTrades} Trades)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0D1526] border border-[#1E293B] space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">PROFIT FACTOR</span>
              <span className="text-base font-mono font-bold text-emerald-400">
                {results.profitFactor}
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">
                Win/Loss Ratio: {results.winLossRatio}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0D1526] border border-[#1E293B] space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">MAX DRAWDOWN</span>
              <span className="text-base font-mono font-bold text-red-400">
                -{results.maxDrawdownPct}%
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">
                -{formatMoney(results.maxDrawdownAmount)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0D1526] border border-[#1E293B] space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">AVERAGE / TOTAL R</span>
              <span className="text-base font-mono font-bold text-amber-300">
                +{results.averageR}R
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">
                Total: +{results.totalR}R
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0D1526] border border-[#1E293B] space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">TOTAL FRICTION</span>
              <span className="text-base font-mono font-bold text-slate-300">
                {formatMoney(results.totalFeesPaid + results.totalSlippageCost + results.totalFundingPaid)}
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">
                Fees: {formatMoney(results.totalFeesPaid)} | Slip: {formatMoney(results.totalSlippageCost)}
              </span>
            </div>
          </div>

          {/* Equity Curve Visual Graph */}
          <div className="p-5 rounded-2xl bg-[#0B0F19] border border-[#1E293B] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Backtested Equity Curve & Drawdown Profile
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Final Capital: <strong className="text-cyan-300">{formatMoney(results.finalEquity)}</strong>
              </span>
            </div>

            {/* Custom SVG Equity Curve Canvas */}
            <div className="h-48 w-full relative bg-[#060A14] rounded-xl border border-[#182338] p-3 flex flex-col justify-between overflow-hidden">
              <div className="absolute inset-0 flex flex-col justify-between p-3 opacity-10 pointer-events-none">
                <div className="w-full border-b border-cyan-400" />
                <div className="w-full border-b border-cyan-400" />
                <div className="w-full border-b border-cyan-400" />
              </div>

              {/* SVG Polyline */}
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Draw curve points */}
                {(() => {
                  const points = results.equityCurve;
                  if (points.length < 2) return null;
                  const minEq = Math.min(...points.map((p) => p.equity)) * 0.98;
                  const maxEq = Math.max(...points.map((p) => p.equity)) * 1.02;
                  const range = maxEq - minEq || 1;

                  const polylineCoords = points
                    .map((p, idx) => {
                      const x = (idx / (points.length - 1)) * 500;
                      const y = 100 - ((p.equity - minEq) / range) * 90 - 5;
                      return `${x},${y}`;
                    })
                    .join(" ");

                  return (
                    <>
                      <polygon
                        points={`0,100 ${polylineCoords} 500,100`}
                        fill="url(#equityGrad)"
                      />
                      <polyline
                        points={polylineCoords}
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  );
                })()}
              </svg>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-[#121A2A]">
                <span>{results.equityCurve[0]?.timestamp?.substring(0, 10) || "Start"}</span>
                <span>Simulation: {results.totalTrades} Executed Trades</span>
                <span>{results.equityCurve[results.equityCurve.length - 1]?.timestamp?.substring(0, 10) || "End"}</span>
              </div>
            </div>
          </div>

          {/* R-Distribution & Monthly Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* R-Multiple Distribution */}
            <div className="p-4 rounded-xl bg-[#090E1A] border border-[#1E293B] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white uppercase">
                  R-Multiple Distribution
                </span>
                <span className="text-[10px] font-mono text-cyan-400">Total R: +{results.totalR}R</span>
              </div>

              <div className="space-y-2">
                {results.rDistribution.map((r, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>{r.rBucket}</span>
                      <span>{r.count} trades</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#121A2B] overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${(r.count / results.totalTrades) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Returns */}
            <div className="p-4 rounded-xl bg-[#090E1A] border border-[#1E293B] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white uppercase">
                  Monthly Performance Breakdown
                </span>
                <span className="text-[10px] font-mono text-emerald-400">Aggregated Net P&L</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {results.monthlyPerformance.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#0E1628] border border-[#1A253C] text-xs font-mono"
                  >
                    <span className="text-slate-300 font-bold">{m.month}</span>
                    <span className="text-slate-400">{m.trades} trades</span>
                    <span className={m.netPnl >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                      {m.netPnl >= 0 ? "+" : ""}{formatMoney(m.netPnl)} ({m.returnPct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
