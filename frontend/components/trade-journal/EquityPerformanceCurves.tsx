"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Activity,
  Layers,
  Calendar,
  BarChart3,
  Percent,
} from "lucide-react";

export function EquityPerformanceCurves() {
  const [timeframe, setTimeframe] = useState<string>("30D");
  const [curveType, setCurveType] = useState<"equity" | "pnl" | "drawdown">("equity");

  const timeframes = ["1D", "7D", "30D", "3M", "6M", "1Y", "ALL TIME"];

  // Mock performance data points
  const points = [
    { label: "Aug 01", equity: 10000.0, pnl: 0.0, drawdown: 0.0 },
    { label: "Aug 04", equity: 10240.0, pnl: 240.0, drawdown: 0.0 },
    { label: "Aug 08", equity: 10180.0, pnl: 180.0, drawdown: 0.58 },
    { label: "Aug 12", equity: 10650.0, pnl: 650.0, drawdown: 0.0 },
    { label: "Aug 15", equity: 10890.0, pnl: 890.0, drawdown: 0.0 },
    { label: "Aug 18", equity: 11420.5, pnl: 1420.5, drawdown: 0.0 },
  ];

  return (
    <div className="bg-[#0D1914] border border-[#294238] rounded-2xl p-4 sm:p-5 shadow-xl select-none font-sans space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1B3328] pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#07110D] p-1 rounded-xl border border-[#1B3328] text-xs font-mono">
            <button
              onClick={() => setCurveType("equity")}
              className={`px-3 py-1 rounded-lg font-bold uppercase transition-all ${
                curveType === "equity"
                  ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-sm"
                  : "text-[#A8BDB0] hover:text-white"
              }`}
            >
              Equity Curve
            </button>
            <button
              onClick={() => setCurveType("pnl")}
              className={`px-3 py-1 rounded-lg font-bold uppercase transition-all ${
                curveType === "pnl"
                  ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-sm"
                  : "text-[#A8BDB0] hover:text-white"
              }`}
            >
              Cumulative P&L
            </button>
            <button
              onClick={() => setCurveType("drawdown")}
              className={`px-3 py-1 rounded-lg font-bold uppercase transition-all ${
                curveType === "drawdown"
                  ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-sm"
                  : "text-[#A8BDB0] hover:text-white"
              }`}
            >
              Drawdown
            </button>
          </div>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center gap-1 bg-[#07110D] p-1 rounded-xl border border-[#1B3328] text-xs font-mono">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                timeframe === tf
                  ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40"
                  : "text-[#70877A] hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Visual SVG Curve */}
      <div className="relative h-44 w-full flex flex-col justify-between pt-2">
        <svg className="w-full h-36 overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#55C98A" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#55C98A" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <polygon
            points="0,100 0,80 100,65 200,70 300,45 400,30 500,10 500,100"
            fill="url(#curveGradient)"
          />

          {/* Stroke Line */}
          <polyline
            fill="none"
            stroke="#55C98A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points="0,80 100,65 200,70 300,45 400,30 500,10"
          />

          {/* Point Dots */}
          {[
            { x: 0, y: 80 },
            { x: 100, y: 65 },
            { x: 200, y: 70 },
            { x: 300, y: 45 },
            { x: 400, y: 30 },
            { x: 500, y: 10 },
          ].map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill="#0D1914" stroke="#55C98A" strokeWidth="2" />
          ))}
        </svg>

        {/* X-Axis Labels */}
        <div className="flex justify-between text-[10px] text-[#70877A] font-mono border-t border-[#1B3328] pt-2">
          {points.map((p, idx) => (
            <span key={idx}>{p.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
