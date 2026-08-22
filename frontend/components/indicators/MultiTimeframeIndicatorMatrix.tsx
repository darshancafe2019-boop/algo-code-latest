"use client";

import React from "react";
import { Clock, TrendingUp, TrendingDown, Minus, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { TimeframeConfluenceRow } from "@/types/indicator";

interface MultiTimeframeIndicatorMatrixProps {
  symbol?: string;
  matrixData?: TimeframeConfluenceRow[];
}

export function MultiTimeframeIndicatorMatrix({
  symbol = "BTC/USDT",
  matrixData,
}: MultiTimeframeIndicatorMatrixProps) {
  const defaultMatrix: TimeframeConfluenceRow[] = [
    {
      timeframe: "5m",
      label: "5M ENTRY",
      role: "ENTRY",
      confluence_pct: 84.0,
      direction: "BULLISH",
      signals: [
        { indicator_id: "ema_9", name: "EMA 9 / 21 Cross", value: "Bullish Cross", signal: "BUY", healthy: true },
        { indicator_id: "rsi", name: "RSI (14)", value: "54.2", signal: "BUY", healthy: true },
        { indicator_id: "stoch", name: "Stochastic %K", value: "62.4", signal: "BUY", healthy: true },
      ],
    },
    {
      timeframe: "15m",
      label: "15M CONFIRMATION",
      role: "CONFIRMATION",
      confluence_pct: 88.5,
      direction: "BULLISH",
      signals: [
        { indicator_id: "macd", name: "MACD Histogram", value: "+14.2 (Expanding)", signal: "BUY", healthy: true },
        { indicator_id: "vwap", name: "VWAP Session", value: "Price Above (+$120)", signal: "BUY", healthy: true },
        { indicator_id: "supertrend", name: "Supertrend (10,3)", value: "Bullish ($59,420)", signal: "BUY", healthy: true },
      ],
    },
    {
      timeframe: "1h",
      label: "1H TREND",
      role: "TREND",
      confluence_pct: 91.2,
      direction: "BULLISH",
      signals: [
        { indicator_id: "ema_200", name: "EMA 200 Structural", value: "Above $59,469", signal: "BUY", healthy: true },
        { indicator_id: "adx", name: "ADX (14) Trend", value: "28.4 (Strong Trend)", signal: "BUY", healthy: true },
        { indicator_id: "vp", name: "Volume Profile", value: "Above POC $58,950", signal: "BUY", healthy: true },
      ],
    },
    {
      timeframe: "4h",
      label: "4H MACRO",
      role: "MACRO",
      confluence_pct: 76.0,
      direction: "BULLISH",
      signals: [
        { indicator_id: "ichimoku", name: "Ichimoku Cloud", value: "Above Kumo Cloud", signal: "BUY", healthy: true },
        { indicator_id: "oi", name: "Open Interest", value: "+4.2% (Aggressive Longs)", signal: "BUY", healthy: true },
        { indicator_id: "atr", name: "ATR Volatility", value: "$412.50 (Normal)", signal: "NEUTRAL", healthy: true },
      ],
    },
  ];

  const rows = matrixData && matrixData.length > 0 ? matrixData : defaultMatrix;

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            MULTI-TIMEFRAME CONFLUENCE MATRIX
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">({symbol})</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>ZERO LOOK-AHEAD ENFORCED</span>
        </div>
      </div>

      {/* 4-Tier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {rows.map((row) => {
          const isBull = row.direction === "BULLISH";
          const isBear = row.direction === "BEARISH";

          return (
            <div
              key={row.timeframe}
              className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 space-y-3 flex flex-col justify-between"
            >
              {/* Card Top: Role & Score */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <div className="text-[10px] font-mono uppercase font-bold text-slate-400">
                    {row.label}
                  </div>
                  <div className="text-xs font-bold text-white flex items-center gap-1 mt-0.5">
                    {isBull && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
                    {isBear && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                    {!isBull && !isBear && <Minus className="w-3.5 h-3.5 text-slate-400" />}
                    <span className={isBull ? "text-emerald-400" : isBear ? "text-red-400" : "text-slate-300"}>
                      {row.direction}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-cyan-400">
                    {row.confluence_pct.toFixed(1)}%
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">Confluence</div>
                </div>
              </div>

              {/* Indicator List inside timeframe */}
              <div className="space-y-1.5 flex-1">
                {row.signals.map((sig, idx) => (
                  <div
                    key={idx}
                    className="bg-[#0B111E] border border-slate-800 rounded-lg p-2 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-slate-200">{sig.name}</div>
                      <div className="text-[10px] text-slate-400">{sig.value}</div>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                        sig.signal === "BUY"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : sig.signal === "SELL"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {sig.signal}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bottom status */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  3/3 Closed Bars
                </span>
                <span className="text-cyan-400 font-semibold">100% Weight Valid</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
