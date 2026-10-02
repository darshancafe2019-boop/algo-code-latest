"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Activity,
  Layers,
  Calendar,
  BarChart3,
  Percent,
} from "lucide-react";

interface EquityPoint {
  label: string;
  equity: number;
  pnl: number;
  drawdown: number;
}

export function EquityPerformanceCurves() {
  const [timeframe, setTimeframe] = useState("30D");
  const [curveType, setCurveType] = useState<"equity" | "pnl" | "drawdown">("equity");

  const timeframes = ["1D", "7D", "30D", "3M", "6M", "1Y", "ALL TIME"];

  // Dynamic performance data query
  const { data: pnlData } = useQuery({
    queryKey: ["equityCurvesData", timeframe],
    queryFn: async () => {
      const res = await fetch(`/api/pnl/accounting?timeframe=${encodeURIComponent(timeframe)}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.timeline || json.data || [];
    },
    refetchInterval: 15000,
  });

  const rawTimeline: any[] = pnlData || [];
  const points: EquityPoint[] = rawTimeline.map((item: any, idx: number) => ({
    label: item.date || item.label || `T-${idx + 1}`,
    equity: Number(item.equity || item.balance || 0),
    pnl: Number(item.pnl || item.cumulative_pnl || 0),
    drawdown: Number(item.drawdown || 0),
  }));

  const hasData = points.length > 1;

  // Normalize points for SVG rendering
  const minVal = points.length > 0 ? Math.min(...points.map((p) => p.equity)) : 0;
  const maxVal = points.length > 0 ? Math.max(...points.map((p) => p.equity)) : 100;
  const range = maxVal - minVal > 0 ? maxVal - minVal : 1;

  const svgPoints = points.map((p, idx) => {
    const x = Math.round((idx / Math.max(1, points.length - 1)) * 500);
    const y = Math.round(90 - ((p.equity - minVal) / range) * 80);
    return { x, y, label: p.label };
  });

  const polylineStr = svgPoints.map((pt) => `${pt.x},${pt.y}`).join(" ");
  const polygonStr = svgPoints.length > 0 ? `0,100 ${polylineStr} 500,100` : "";

  return (
    <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-2xl p-4 sm:p-5 shadow-xl select-none font-sans space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#122033] pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#07101A] p-1 rounded-xl border border-[#122033] text-xs font-mono">
            <button
              onClick={() => setCurveType("equity")}
              className={`px-3 py-1 rounded-lg font-bold uppercase transition-all ${
                curveType === "equity"
                  ? "bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border border-[#00E890]/40 shadow-sm"
                  : "text-[#7C8CA3] hover:text-white"
              }`}
            >
              Equity Curve
            </button>
            <button
              onClick={() => setCurveType("pnl")}
              className={`px-3 py-1 rounded-lg font-bold uppercase transition-all ${
                curveType === "pnl"
                  ? "bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border border-[#00E890]/40 shadow-sm"
                  : "text-[#7C8CA3] hover:text-white"
              }`}
            >
              Cumulative P&L
            </button>
            <button
              onClick={() => setCurveType("drawdown")}
              className={`px-3 py-1 rounded-lg font-bold uppercase transition-all ${
                curveType === "drawdown"
                  ? "bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border border-[#00E890]/40 shadow-sm"
                  : "text-[#7C8CA3] hover:text-white"
              }`}
            >
              Drawdown
            </button>
          </div>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center gap-1 bg-[#07101A] p-1 rounded-xl border border-[#122033] text-xs font-mono">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                timeframe === tf
                  ? "bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border border-[#00E890]/40"
                  : "text-[#52627A] hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Visual SVG Curve or Empty State */}
      {!hasData ? (
        <div className="h-44 w-full flex items-center justify-center text-slate-500 font-mono text-xs">
          No historical equity progression recorded for selected window ({timeframe}).
        </div>
      ) : (
        <div className="relative h-44 w-full flex flex-col justify-between pt-2">
          <svg className="w-full h-36 overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
            <defs>
              <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Area Fill */}
            <polygon points={polygonStr} fill="url(#curveGradient)" />

            {/* Stroke Line */}
            <polyline
              fill="none"
              stroke="#22D3EE"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylineStr}
            />

            {/* Point Dots */}
            {svgPoints.map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill="#0A1422" stroke="#22D3EE" strokeWidth="2" />
            ))}
          </svg>

          {/* X-Axis Labels */}
          <div className="flex justify-between text-[10px] text-[#52627A] font-mono border-t border-[#122033] pt-2">
            {points.map((p, idx) => (
              <span key={idx}>{p.label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
