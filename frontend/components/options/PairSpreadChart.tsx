"use client";

import React, { useState } from "react";
import { PairAnalysisResult } from "@/types/pairs-trading";

export interface PairSpreadChartProps {
  analysis: PairAnalysisResult;
}

export function PairSpreadChart({ analysis }: PairSpreadChartProps) {
  const [viewMode, setViewMode] = useState<"zscore" | "spread">("zscore");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const zSeries = analysis?.zscore_series || [];
  const sSeries = analysis?.spread_series || [];
  const timestamps = analysis?.timestamps || [];

  if (zSeries.length < 2) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500 font-mono text-xs">
        Insufficient time-series data for spread charting.
      </div>
    );
  }

  const series = viewMode === "zscore" ? zSeries : sSeries;
  const n = series.length;

  const minVal = viewMode === "zscore" ? Math.min(-3.5, ...series) : Math.min(...series);
  const maxVal = viewMode === "zscore" ? Math.max(3.5, ...series) : Math.max(...series);

  const width = 800;
  const height = 260;
  const padding = { top: 25, right: 30, bottom: 35, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const getX = (idx: number) => {
    return padding.left + (idx / Math.max(1, n - 1)) * chartW;
  };

  const getY = (val: number) => {
    return (
      padding.top +
      chartH -
      ((val - minVal) / Math.max(0.001, maxVal - minVal)) * chartH
    );
  };

  const zeroY = getY(0);
  const upperEntryY = getY(2.0);
  const lowerEntryY = getY(-2.0);
  const upperExitY = getY(0.5);
  const lowerExitY = getY(-0.5);

  const pathD = series
    .map((val, idx) => {
      const x = getX(idx);
      const y = getY(val);
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const curVal = series[series.length - 1];
  const hoveredVal = hoverIndex !== null ? series[hoverIndex] : null;
  const hoveredTs = hoverIndex !== null ? timestamps[hoverIndex] : null;

  return (
    <div className="w-full bg-[#080E1E] border border-slate-800/90 rounded-2xl p-4 shadow-xl relative overflow-hidden">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold">Spread Dynamics:</span>
          <span className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 font-extrabold text-[11px]">
            {analysis.symbol_a} vs {analysis.symbol_b}
          </span>
          <span className="text-slate-400 text-[11px]">
            (Hedge Ratio &beta;: <b className="text-cyan-400">{analysis.hedge_ratio}</b>)
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode("zscore")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              viewMode === "zscore"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Z-Score
          </button>
          <button
            onClick={() => setViewMode("spread")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              viewMode === "spread"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Residual Spread ($)
          </button>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * width;
            const boundedX = Math.max(padding.left, Math.min(width - padding.right, mouseX));
            const idx = Math.round(((boundedX - padding.left) / chartW) * (n - 1));
            setHoverIndex(Math.max(0, Math.min(n - 1, idx)));
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Z-Score Reference Threshold Bands */}
          {viewMode === "zscore" && (
            <>
              {/* Upper Short Threshold +2.0 sigma */}
              <line
                x1={padding.left}
                y1={upperEntryY}
                x2={width - padding.right}
                y2={upperEntryY}
                stroke="#F43F5E"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text
                x={width - padding.right - 4}
                y={upperEntryY - 4}
                fill="#F43F5E"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                +2.0σ Short Spread Entry
              </text>

              {/* Lower Long Threshold -2.0 sigma */}
              <line
                x1={padding.left}
                y1={lowerEntryY}
                x2={width - padding.right}
                y2={lowerEntryY}
                stroke="#10B981"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text
                x={width - padding.right - 4}
                y={lowerEntryY + 12}
                fill="#10B981"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                -2.0σ Long Spread Entry
              </text>

              {/* Exit Bounds (+/- 0.5 sigma) */}
              <line
                x1={padding.left}
                y1={upperExitY}
                x2={width - padding.right}
                y2={upperExitY}
                stroke="#F59E0B"
                strokeWidth="1"
                strokeDasharray="2 4"
                strokeOpacity="0.6"
              />
              <line
                x1={padding.left}
                y1={lowerExitY}
                x2={width - padding.right}
                y2={lowerExitY}
                stroke="#F59E0B"
                strokeWidth="1"
                strokeDasharray="2 4"
                strokeOpacity="0.6"
              />
            </>
          )}

          {/* Zero Line (Mean) */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="#94A3B8"
            strokeWidth="1.5"
          />
          <text
            x={padding.left - 6}
            y={zeroY + 3}
            fill="#94A3B8"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="end"
          >
            0.0
          </text>

          {/* Series Curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current Latest Point Marker */}
          <circle
            cx={getX(n - 1)}
            cy={getY(curVal)}
            r="5"
            fill={
              viewMode === "zscore"
                ? curVal >= 2.0
                  ? "#F43F5E"
                  : curVal <= -2.0
                  ? "#10B981"
                  : "#38BDF8"
                : "#38BDF8"
            }
            stroke="#FFFFFF"
            strokeWidth="2"
          />

          {/* Interactive Hover Marker */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={height - padding.bottom}
                stroke="#94A3B8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(series[hoverIndex])}
                r="5"
                fill="#FBBF24"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Bottom Time Labels */}
          {timestamps.length > 0 && (
            <>
              <text
                x={padding.left}
                y={height - 8}
                fill="#64748B"
                fontSize="9"
                fontFamily="monospace"
              >
                {timestamps[0]}
              </text>
              <text
                x={width - padding.right}
                y={height - 8}
                fill="#64748B"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                {timestamps[timestamps.length - 1]}
              </text>
            </>
          )}
        </svg>

        {/* Hover Tooltip */}
        {hoveredVal !== null && (
          <div className="absolute z-20 top-2 right-2 bg-slate-900/95 border border-cyan-500/40 rounded-xl p-2 shadow-2xl backdrop-blur-md font-mono text-xs pointer-events-none">
            <div className="text-slate-400 text-[10px]">{hoveredTs || "Time"}</div>
            <div className="text-white font-extrabold text-sm">
              {viewMode === "zscore" ? `Z-Score: ${hoveredVal.toFixed(2)}σ` : `Spread: $${hoveredVal.toFixed(2)}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
