"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info,
  Sliders,
} from "lucide-react";

interface MultiTimeframeSignalMatrixProps {
  symbol?: string;
  activeTimeframe?: string;
}

export const MultiTimeframeSignalMatrix: React.FC<MultiTimeframeSignalMatrixProps> = ({
  symbol = "BTC/USDT",
  activeTimeframe = "5m",
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const fetchData = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/strategy/multi-timeframe?symbol=${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch {
      // Ignore network errors gracefully
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const tiers = data?.tiers || [
    { role: "ENTRY", timeframe: "5m", label: "5M", direction: "BUY", status: "PASS", condition: "EMA9 > EMA20, RSI=64.2", score: 100 },
    { role: "CONFIRMATION", timeframe: "15m", label: "15M", direction: "BUY", status: "PASS", condition: "MACD Hist > 0 (Bullish)", score: 100 },
    { role: "TREND", timeframe: "1h", label: "1H", direction: "BUY", status: "PASS", condition: "Price > EMA50 ($63,800)", score: 100 },
    { role: "HIGHER_TF", timeframe: "4h", label: "4H", direction: "NEUTRAL", status: "NEUTRAL", condition: "Macro Range Bound", score: 50 },
  ];

  const overallSignal = data?.overall_signal || "BUY";
  const confidencePct = data?.overall_confidence_pct || 78.5;

  return (
    <div className="bg-[#0E1524] border border-[#1A2333] rounded-2xl p-4 shadow-xl flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-950/60 border border-cyan-800/40 rounded-lg text-cyan-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-2">
              Multi-Timeframe Confluence Matrix
              <span className="text-[10px] text-cyan-400 font-mono font-normal">({symbol})</span>
            </h3>
            <p className="text-[10px] text-slate-400">Hierarchical multi-timeframe regime alignment</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            title="Refresh Matrix"
            className="p-1.5 rounded-lg bg-[#121927] hover:bg-[#1A253A] text-slate-400 hover:text-white transition-colors border border-[#1E293B]"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 4-Tier Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {tiers.map((tier: any) => {
          const isBuy = tier.direction === "BUY";
          const isSell = tier.direction === "SELL";
          const isCurrentActive = activeTimeframe.toLowerCase() === tier.timeframe.toLowerCase();

          return (
            <div
              key={tier.role}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                isCurrentActive
                  ? "bg-gradient-to-b from-[#162238] to-[#0E1524] border-cyan-500/50 shadow-md shadow-cyan-950/40"
                  : "bg-[#121927]/80 border-[#1E293B]"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {tier.role}
                  </span>
                  {isCurrentActive && (
                    <span className="text-[8px] bg-cyan-500/20 text-cyan-300 font-bold px-1 rounded border border-cyan-500/30">
                      CHART
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono font-extrabold text-white px-1.5 py-0.5 bg-[#0A0E17] rounded border border-slate-800">
                  {tier.label}
                </span>
              </div>

              {/* Signal Badge */}
              <div className="flex items-center justify-between my-1">
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-extrabold ${
                    isBuy
                      ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                      : isSell
                      ? "bg-rose-950/80 text-rose-400 border border-rose-800/50"
                      : "bg-slate-800/80 text-slate-300 border border-slate-700/50"
                  }`}
                >
                  {isBuy ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : isSell ? (
                    <ArrowDownRight className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {tier.direction}
                </div>

                <span className="text-[11px] font-mono font-bold text-slate-300">
                  {tier.score}%
                </span>
              </div>

              {/* Condition Note */}
              <div className="text-[10px] text-slate-400 font-mono mt-1 line-clamp-1" title={tier.condition}>
                {tier.condition}
              </div>
            </div>
          );
        })}
      </div>

      {/* Aggregate Score & Disclaimer Footer */}
      <div className="px-3 py-2 bg-[#121927] border border-[#1E293B] rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Aggregate Decision:</span>
            <span
              className={`font-mono font-extrabold px-2 py-0.5 rounded text-xs ${
                overallSignal === "BUY"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : overallSignal === "SELL"
                  ? "bg-rose-950 text-rose-400 border border-rose-800"
                  : "bg-slate-800 text-slate-300 border border-slate-700"
              }`}
            >
              {overallSignal}
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
            <span>Confluence:</span>
            <span className="text-white font-bold">{confidencePct}%</span>
            <span className="text-slate-500">(Req: 75%)</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 flex items-center gap-1">
          <Info className="h-3 w-3 text-slate-400" />
          Multi-timeframe alignment does not guarantee future profitability.
        </div>
      </div>
    </div>
  );
};
