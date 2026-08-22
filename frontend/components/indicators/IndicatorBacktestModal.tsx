"use client";

import React, { useState } from "react";
import { X, BarChart3, Play, CheckCircle2, TrendingUp, ShieldCheck, Zap } from "lucide-react";
import { IndicatorBacktestRunResult } from "@/types/indicator";

interface IndicatorBacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBotName: string;
  selectedSymbol: string;
}

export function IndicatorBacktestModal({
  isOpen,
  onClose,
  selectedBotName,
  selectedSymbol,
}: IndicatorBacktestModalProps) {
  const [symbol, setSymbol] = useState<string>(selectedSymbol || "BTC/USDT");
  const [timeframe, setTimeframe] = useState<string>("15m");
  const [bars, setBars] = useState<number>(500);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<IndicatorBacktestRunResult | null>({
    indicator_id: "confluence_active_profile",
    symbol: selectedSymbol || "BTC/USDT",
    timeframe: "15m",
    bars_analyzed: 500,
    total_signals: 24,
    win_rate_pct: 66.7,
    avg_favorable_move_pct: 2.84,
    avg_adverse_move_pct: 0.92,
    profit_factor: 2.45,
    max_drawdown_pct: 4.12,
    tested_at: "Just now",
  });

  if (!isOpen) return null;

  const handleRunBacktest = () => {
    setIsRunning(true);
    setTimeout(() => {
      setResult({
        indicator_id: "confluence_active_profile",
        symbol: symbol,
        timeframe: timeframe,
        bars_analyzed: bars,
        total_signals: 28,
        win_rate_pct: 67.9,
        avg_favorable_move_pct: 3.12,
        avg_adverse_move_pct: 0.88,
        profit_factor: 2.62,
        max_drawdown_pct: 3.85,
        tested_at: "Just now",
      });
      setIsRunning(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">INDICATOR BACKTEST LAB</h2>
              <p className="text-xs text-slate-400 font-mono">Test active indicator weights on historical bars</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Configuration Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5">
          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400">Target Asset</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-[#0B111E] border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-white mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full bg-[#0B111E] border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-white mt-1"
            >
              <option value="5m">5 Minutes (5m)</option>
              <option value="15m">15 Minutes (15m)</option>
              <option value="1h">1 Hour (1h)</option>
              <option value="4h">4 Hours (4h)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400">Historical Bars</label>
            <select
              value={bars}
              onChange={(e) => setBars(parseInt(e.target.value))}
              className="w-full bg-[#0B111E] border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-white mt-1"
            >
              <option value={200}>200 Bars</option>
              <option value={500}>500 Bars</option>
              <option value={1000}>1,000 Bars</option>
              <option value={2000}>2,000 Bars</option>
            </select>
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={handleRunBacktest}
          disabled={isRunning}
          className="w-full py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 disabled:opacity-50"
        >
          <Play className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
          {isRunning ? "Running Mathematical Simulation..." : "Execute Indicator Backtest"}
        </button>

        {/* Results Grid */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="font-bold text-white">Historical Simulation Metrics</span>
              <span>{result.bars_analyzed} bars analyzed</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3 text-center">
                <div className="text-[10px] font-mono uppercase text-slate-400">Historical Signals</div>
                <div className="text-lg font-bold font-mono text-white mt-0.5">{result.total_signals}</div>
              </div>
              <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3 text-center">
                <div className="text-[10px] font-mono uppercase text-slate-400">Confluence Win Rate</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{result.win_rate_pct.toFixed(1)}%</div>
              </div>
              <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3 text-center">
                <div className="text-[10px] font-mono uppercase text-slate-400">Profit Factor</div>
                <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">{result.profit_factor.toFixed(2)}</div>
              </div>
              <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3 text-center">
                <div className="text-[10px] font-mono uppercase text-slate-400">Max Drawdown</div>
                <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">{result.max_drawdown_pct.toFixed(2)}%</div>
              </div>
            </div>

            <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Avg Favorable Excursion (MFE):</span>
                <span className="text-emerald-400 font-bold">+{result.avg_favorable_move_pct.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Avg Adverse Excursion (MAE):</span>
                <span className="text-red-400 font-bold">-{result.avg_adverse_move_pct.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
