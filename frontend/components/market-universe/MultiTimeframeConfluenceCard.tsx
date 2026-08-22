"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { MultiTimeframeConfluenceState } from "@/types/market-universe";

interface MultiTimeframeConfluenceCardProps {
  symbol: string;
  confluenceState?: MultiTimeframeConfluenceState;
}

export function MultiTimeframeConfluenceCard({
  symbol,
  confluenceState,
}: MultiTimeframeConfluenceCardProps) {
  const state: MultiTimeframeConfluenceState = confluenceState || {
    symbol: symbol || "BTC/USDT",
    aggregate_score: 82.6,
    aggregate_direction: "BUY",
    regime: "TRENDING",
    regime_factors: [
      "ADX > 25 (Trend Strength Confirmed)",
      "EMA 9 ($65,400) > EMA 21 ($64,800) > EMA 200 ($62,100)",
      "Volume Expanding on Upside Candles",
      "RSI 58.5 in Bullish Momentum Zone",
    ],
    timeframes: [
      { timeframe: "5m", label: "5M Entry", direction: "BUY", score: 84.0, conditions: ["EMA 9 > EMA 21", "VWAP Support"], status: "CONFIRMED" },
      { timeframe: "15m", label: "15M Confirmation", direction: "BUY", score: 88.5, conditions: ["RSI 58.5 > 50", "MACD Histogram +"], status: "CONFIRMED" },
      { timeframe: "1h", label: "1H Trend", direction: "BUY", score: 91.2, conditions: ["Price > EMA 200", "Volume POC Holding"], status: "CONFIRMED" },
      { timeframe: "4h", label: "4H Macro", direction: "BUY", score: 76.0, conditions: ["Higher Lows Established", "ADX 28.4"], status: "CONFIRMED" },
    ],
  };

  const isBuy = state.aggregate_direction === "BUY";

  return (
    <div className="bg-[#0D1914] border border-[#294238] rounded-2xl p-4 sm:p-5 shadow-xl select-none font-sans space-y-4">
      {/* Top Header: Symbol, Direction & Score */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1B3328] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Multi-Timeframe Confluence Engine
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#07110D] text-[#55C98A] border border-[#1B3328]">
                {symbol}
              </span>
            </div>
            <p className="text-[11px] text-[#A8BDB0]">
              Hierarchical timeframe cross-validation & statistical regime detection.
            </p>
          </div>
        </div>

        {/* Aggregate Signal Badge */}
        <div className="flex items-center gap-2 font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-[#123C2A] border border-[#39B978]/40 flex items-center gap-2">
            <span className="text-[10px] text-[#70877A] uppercase font-bold">Aggregate:</span>
            <span className="text-xs font-bold text-[#55C98A] flex items-center gap-1">
              {isBuy ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {state.aggregate_direction} ({state.aggregate_score.toFixed(1)}%)
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#07110D] border border-[#1B3328] text-cyan-300 text-xs font-bold">
            <span>Regime: </span>
            <span className="uppercase">{state.regime}</span>
          </div>
        </div>
      </div>

      {/* 4 Multi-Timeframe Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
        {state.timeframes.map((tf, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-[#07110D] border border-[#1B3328] hover:border-[#2E7D5B] transition-colors space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white uppercase">{tf.label}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#123C2A] text-[#55C98A] font-bold">
                {tf.direction} ({tf.score.toFixed(0)}%)
              </span>
            </div>

            {/* Condition bullets */}
            <div className="space-y-1 text-[10px] text-[#A8BDB0] font-sans pt-1 border-t border-[#1B3328]">
              {tf.conditions.map((cond, cIdx) => (
                <div key={cIdx} className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-[#55C98A] shrink-0" />
                  <span>{cond}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Regime Explanation Engine */}
      <div className="p-3 rounded-xl bg-[#07110D] border border-[#1B3328] text-xs font-mono space-y-1">
        <span className="text-[10px] text-[#70877A] uppercase font-bold block">
          Mathematical Regime Attribution Factors:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-[#A8BDB0]">
          {state.regime_factors.map((f, idx) => (
            <p key={idx}>• {f}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
