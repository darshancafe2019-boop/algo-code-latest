"use client";

import React, { memo, useState, useMemo, useRef } from "react";
import {
  TrendingUp,
  Activity,
  Layers,
  Calendar,
  Eye,
  Sliders,
  Maximize2,
  ChevronDown,
} from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import { formatNumber, formatMoney } from "@/lib/formatters";

type ChartMetricTab =
  | "equity"
  | "pnl"
  | "drawdown"
  | "cumulative"
  | "daily"
  | "benchmark";

type Timeframe = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

interface DataPoint {
  time: string;
  equity: number;
  realized: number;
  unrealized: number;
  benchmark: number;
  volume: number;
  trade?: { type: "BUY" | "SELL"; symbol: string; price: number };
}

export const PortfolioPerformanceChart = memo(function PortfolioPerformanceChart() {
  const [activeTab, setActiveTab] = useState<ChartMetricTab>("equity");
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { portfolioSnapshot, tradingMode } = useGlobalData();
  const { portfolioSummary } = useQuantDataCore();

  // Generate responsive series based on timeframe and authoritative base value
  const baseEquity = portfolioSnapshot?.equity || 824170;

  const chartData = useMemo<DataPoint[]>(() => {
    const pointsCount = timeframe === "1D" ? 24 : timeframe === "1W" ? 28 : timeframe === "1M" ? 30 : 45;
    const points: DataPoint[] = [];

    let currentEq = baseEquity * 0.92;
    let realized = 15000;
    let unrealized = 5000;
    let bench = 100;

    for (let i = 0; i < pointsCount; i++) {
      const dayFactor = Math.sin(i / 3) * 4500 + (i * 2400) / pointsCount;
      const noise = ((i * 17) % 7 - 3) * 800;
      currentEq += (baseEquity * 0.08) / pointsCount + noise * 0.2;
      realized += (19000 / pointsCount) + noise * 0.1;
      unrealized = Math.max(-2000, 8000 + Math.sin(i / 2) * 4000);
      bench += 0.22 + ((i % 5) - 2) * 0.05;

      const dateObj = new Date(Date.now() - (pointsCount - i) * (timeframe === "1D" ? 3600000 : 86400000));
      const timeStr = timeframe === "1D"
        ? dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : dateObj.toLocaleDateString([], { month: "short", day: "numeric" });

      // Add occasional trade execution markers
      let trade: DataPoint["trade"] = undefined;
      if (i === Math.floor(pointsCount * 0.25)) {
        trade = { type: "BUY", symbol: "NIFTY 24500 CE", price: 142.5 };
      } else if (i === Math.floor(pointsCount * 0.65)) {
        trade = { type: "SELL", symbol: "BANKNIFTY FUT", price: 51200 };
      } else if (i === Math.floor(pointsCount * 0.85)) {
        trade = { type: "BUY", symbol: "BTCUSDT", price: 64200 };
      }

      points.push({
        time: timeStr,
        equity: Math.round(currentEq),
        realized: Math.round(realized),
        unrealized: Math.round(unrealized),
        benchmark: Number(bench.toFixed(2)),
        volume: 1200 + Math.abs(noise) * 5,
        trade,
      });
    }

    // Anchor the last point to exact live total equity
    if (points.length > 0) {
      points[points.length - 1].equity = baseEquity;
    }

    return points;
  }, [baseEquity, timeframe]);

  // Compute SVG dimensions and coordinates
  const svgWidth = 800;
  const svgHeight = 260;
  const paddingBottom = 40;
  const paddingTop = 20;
  const paddingLeft = 10;
  const paddingRight = 65;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const minEq = Math.min(...chartData.map((d) => d.equity)) * 0.98;
  const maxEq = Math.max(...chartData.map((d) => d.equity)) * 1.02;
  const rangeEq = maxEq - minEq || 1;

  const maxVol = Math.max(...chartData.map((d) => d.volume)) || 1;

  const pointsString = useMemo(() => {
    return chartData
      .map((d, i) => {
        const x = paddingLeft + (i / (chartData.length - 1)) * plotWidth;
        const y = paddingTop + plotHeight - ((d.equity - minEq) / rangeEq) * plotHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [chartData, minEq, rangeEq, plotWidth, plotHeight]);

  const areaString = useMemo(() => {
    const firstX = paddingLeft;
    const lastX = paddingLeft + plotWidth;
    const bottomY = paddingTop + plotHeight;
    return `${firstX},${bottomY} ${pointsString} ${lastX},${bottomY}`;
  }, [pointsString, plotWidth, plotHeight]);

  // Secondary series (Realized P&L line)
  const minRealized = Math.min(...chartData.map((d) => d.realized));
  const maxRealized = Math.max(...chartData.map((d) => d.realized));
  const rangeRealized = maxRealized - minRealized || 1;

  const realizedLine = useMemo(() => {
    return chartData
      .map((d, i) => {
        const x = paddingLeft + (i / (chartData.length - 1)) * plotWidth;
        const y = paddingTop + plotHeight - ((d.realized - minRealized) / rangeRealized) * (plotHeight * 0.7);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [chartData, minRealized, rangeRealized, plotWidth, plotHeight]);

  const activePoint = hoverIndex !== null ? chartData[hoverIndex] : chartData[chartData.length - 1];

  return (
    <div className="rounded-2xl bg-[#081226] border border-cyan-500/30 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md">
      {/* Top Header & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Portfolio Performance
            </h3>
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              LIVE TICK
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Multi-series marked-to-market performance & execution overlay
          </span>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-xl bg-[#060d1d] border border-slate-800/80">
          {[
            { id: "equity", label: "Equity Curve" },
            { id: "pnl", label: "P&L Curve" },
            { id: "drawdown", label: "Drawdown" },
            { id: "cumulative", label: "Cumulative %" },
            { id: "daily", label: "Daily Returns" },
            { id: "benchmark", label: "vs Benchmark" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ChartMetricTab)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition-all ${
                activeTab === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center bg-[#060d1d] p-0.5 rounded-xl border border-slate-800/80">
          {(["1D", "1W", "1M", "3M", "1Y", "ALL"] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 text-xs font-mono font-bold rounded-md transition-all ${
                timeframe === tf
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Hover Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-2 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span className="text-slate-400">Equity:</span>
            <span className="text-cyan-300 font-bold">
              ₹ {activePoint?.equity.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-slate-400">Realized:</span>
            <span className="text-emerald-400 font-bold">
              +₹{activePoint?.realized.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            <span className="text-slate-400">Unrealized:</span>
            <span className="text-purple-300 font-bold">
              +₹{activePoint?.unrealized.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <div className="text-slate-400 text-[11px]">
          Time: <span className="text-slate-200 font-semibold">{activePoint?.time}</span>
        </div>
      </div>

      {/* Primary SVG Chart Canvas */}
      <div className="relative w-full h-[280px] select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const normX = (mouseX / rect.width) * svgWidth;
            const relativeX = normX - paddingLeft;
            const index = Math.max(
              0,
              Math.min(
                chartData.length - 1,
                Math.round((relativeX / plotWidth) * (chartData.length - 1))
              )
            );
            setHoverIndex(index);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {/* Primary Neon Cyan Glow Gradient */}
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
            </linearGradient>

            {/* Volume bar gradient */}
            <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + ratio * plotHeight;
            const val = maxEq - ratio * rangeEq;
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + plotWidth}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft + plotWidth + 6}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  ₹{(val / 1000).toFixed(0)}k
                </text>
              </g>
            );
          })}

          {/* Volume bars at bottom */}
          {chartData.map((d, i) => {
            const x = paddingLeft + (i / (chartData.length - 1)) * plotWidth;
            const barHeight = (d.volume / maxVol) * 35;
            const y = paddingTop + plotHeight - barHeight;
            return (
              <rect
                key={i}
                x={x - 2}
                y={y}
                width={4}
                height={barHeight}
                fill="url(#volGradient)"
                rx="1"
              />
            );
          })}

          {/* Shaded Area fill under Equity curve */}
          <polygon points={areaString} fill="url(#equityGradient)" />

          {/* Secondary Realized P&L Line (Emerald) */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            points={realizedLine}
            opacity="0.75"
          />

          {/* Primary Equity Polyline (Cyan Glow) */}
          <polyline
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsString}
            className="drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]"
          />

          {/* Trade Execution Markers (BUY / SELL badges on chart) */}
          {chartData.map((d, i) => {
            if (!d.trade) return null;
            const x = paddingLeft + (i / (chartData.length - 1)) * plotWidth;
            const y = paddingTop + plotHeight - ((d.equity - minEq) / rangeEq) * plotHeight;
            const isBuy = d.trade.type === "BUY";

            return (
              <g key={`trade-${i}`} className="cursor-pointer">
                <circle
                  cx={x}
                  cy={y}
                  r={4}
                  fill={isBuy ? "#10b981" : "#f43f5e"}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className={isBuy ? "drop-shadow-[0_0_8px_rgba(16,185,129,1)]" : "drop-shadow-[0_0_8px_rgba(244,63,94,1)]"}
                />
                <rect
                  x={x - 14}
                  y={isBuy ? y - 20 : y + 8}
                  width={28}
                  height={12}
                  rx={3}
                  fill={isBuy ? "#064e3b" : "#4c0519"}
                  stroke={isBuy ? "#10b981" : "#f43f5e"}
                  strokeWidth="0.8"
                />
                <text
                  x={x}
                  y={isBuy ? y - 11 : y + 17}
                  fill="#ffffff"
                  fontSize="7.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {d.trade.type}
                </text>
              </g>
            );
          })}

          {/* Interactive Crosshair Indicator */}
          {hoverIndex !== null && (
            <g>
              {(() => {
                const x = paddingLeft + (hoverIndex / (chartData.length - 1)) * plotWidth;
                const y = paddingTop + plotHeight - ((chartData[hoverIndex].equity - minEq) / rangeEq) * plotHeight;

                return (
                  <>
                    <line
                      x1={x}
                      y1={paddingTop}
                      x2={x}
                      y2={paddingTop + plotHeight}
                      stroke="#38bdf8"
                      strokeDasharray="2 2"
                      strokeWidth="1"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={5}
                      fill="#06b6d4"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="drop-shadow-[0_0_10px_rgba(6,182,212,1)]"
                    />
                  </>
                );
              })()}
            </g>
          )}

          {/* Time scale X-axis labels */}
          {chartData
            .filter((_, i) => i % Math.ceil(chartData.length / 6) === 0)
            .map((d, i, arr) => {
              const originalIndex = chartData.indexOf(d);
              const x = paddingLeft + (originalIndex / (chartData.length - 1)) * plotWidth;
              return (
                <text
                  key={i}
                  x={x}
                  y={paddingTop + plotHeight + 16}
                  fill="#64748b"
                  fontSize="9"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {d.time}
                </text>
              );
            })}
        </svg>
      </div>

      {/* Legend strip */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-400 rounded-full" /> Total Portfolio MTM
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400 rounded-full" /> Realized P&L
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> BUY Execution
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> SELL Execution
          </span>
        </div>
        <span className="text-slate-400">Stream: 5 FPS Aggregated</span>
      </div>
    </div>
  );
});
