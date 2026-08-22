"use client";

import React, { useState } from "react";
import { LineChart } from "lucide-react";
import { EquityCurvePoint } from "@/types/pnl-analytics";
import { formatNumber, formatPrice, formatPercent, formatPnL, toNumeric } from "@/lib/formatters";

interface InteractiveEquityCurvePanelProps {
  data?: EquityCurvePoint[];
  peakEquity?: number;
  currentEquity?: number;
  highWaterMark?: number;
  maxDrawdownPct?: number;
  currency?: string;
}

export function InteractiveEquityCurvePanel({
  data,
  peakEquity = 10450.25,
  currentEquity = 10450.25,
  highWaterMark = 10450.25,
  maxDrawdownPct = 1.45,
  currency = "$",
}: InteractiveEquityCurvePanelProps) {
  const [hoveredPoint, setHoveredPoint] = useState<EquityCurvePoint | null>(null);

  const points = Array.isArray(data) && data.length > 0 ? data : [
    { timestamp: "09:30", equity: 10000.0, high_water_mark: 10000.0, drawdown_pct: 0.0, realized_pnl: 0.0, unrealized_pnl: 0.0 },
    { timestamp: "10:30", equity: 10120.0, high_water_mark: 10120.0, drawdown_pct: 0.0, realized_pnl: 120.0, unrealized_pnl: 0.0 },
    { timestamp: "11:30", equity: 10080.0, high_water_mark: 10120.0, drawdown_pct: 0.39, realized_pnl: 120.0, unrealized_pnl: -40.0 },
    { timestamp: "12:30", equity: 10245.0, high_water_mark: 10245.0, drawdown_pct: 0.0, realized_pnl: 245.0, unrealized_pnl: 0.0 },
    { timestamp: "13:30", equity: 10380.0, high_water_mark: 10380.0, drawdown_pct: 0.0, realized_pnl: 380.0, unrealized_pnl: 0.0 },
    { timestamp: "14:30", equity: 10350.0, high_water_mark: 10380.0, drawdown_pct: 0.28, realized_pnl: 380.0, unrealized_pnl: -30.0 },
    { timestamp: "15:30", equity: 10450.25, high_water_mark: 10450.25, drawdown_pct: 0.0, realized_pnl: 450.25, unrealized_pnl: 0.0 },
  ];

  const minEq = Math.min(...points.map((p) => toNumeric(p.equity) ?? 10000)) * 0.995;
  const maxEq = Math.max(...points.map((p) => toNumeric(p.high_water_mark ?? p.equity) ?? 10450)) * 1.005;
  const range = maxEq - minEq || 1;

  const svgWidth = 800;
  const svgHeight = 220;

  // Generate SVG path coordinates safely
  const coords = points.map((p, idx) => {
    const eq = toNumeric(p.equity) ?? 10000;
    const hwm = toNumeric(p.high_water_mark) ?? eq;
    const x = (idx / (points.length - 1 || 1)) * (svgWidth - 40) + 20;
    const y = svgHeight - 30 - ((eq - minEq) / range) * (svgHeight - 60);
    const hwmY = svgHeight - 30 - ((hwm - minEq) / range) * (svgHeight - 60);
    return { x, y, hwmY, point: p };
  });

  const pathD = coords.reduce((acc, c, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${c.x} ${c.y}`, "");
  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${svgHeight - 20} L ${coords[0].x} ${svgHeight - 20} Z`;
  const hwmPathD = coords.reduce((acc, c, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${c.x} ${c.hwmY}`, "");

  const hwmVal = toNumeric(highWaterMark) ?? 10450.25;
  const curVal = toNumeric(currentEquity) ?? 10450.25;
  const distanceFromPeak = hwmVal > 0 ? ((curVal - hwmVal) / hwmVal) * 100 : 0;

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
      {/* Header & High Water Mark Telemetry */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <LineChart className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              PORTFOLIO EQUITY TIMELINE & HIGH WATER MARK
            </h2>
            <p className="text-xs text-slate-400">Audited equity progression with peak recovery and drawdown visualization</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">High Water Mark</div>
            <div className="text-sm font-bold text-white">
              {formatPrice(highWaterMark, currency, 2)}
            </div>
          </div>

          <div className="border-l border-slate-700 pl-3">
            <div className="text-[10px] text-slate-400 uppercase">Distance From Peak</div>
            <div className={`text-sm font-bold ${distanceFromPeak >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {distanceFromPeak >= 0 ? "0.00% (At Peak)" : formatPercent(distanceFromPeak, 2)}
            </div>
          </div>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-56 select-none"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="20" y1="30" x2={svgWidth - 20} y2="30" stroke="#1E293B" strokeDasharray="3 3" />
          <line x1="20" y1={svgHeight / 2} x2={svgWidth - 20} y2={svgHeight / 2} stroke="#1E293B" strokeDasharray="3 3" />
          <line x1="20" y1={svgHeight - 30} x2={svgWidth - 20} y2={svgHeight - 30} stroke="#1E293B" />

          {/* High Water Mark Baseline (Dashed Gold) */}
          <path d={hwmPathD} fill="none" stroke="#eab308" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />

          {/* Area under equity curve */}
          <path d={areaD} fill="url(#equityGradient)" />

          {/* Main Equity Curve Line */}
          <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive Plot Points */}
          {coords.map((c, idx) => (
            <g key={idx}>
              <circle
                cx={c.x}
                cy={c.y}
                r={hoveredPoint === c.point ? 6 : 3.5}
                fill={hoveredPoint === c.point ? "#22d3ee" : "#06b6d4"}
                stroke="#0B111E"
                strokeWidth="2"
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredPoint(c.point)}
              />
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Box */}
        {hoveredPoint && (
          <div className="absolute top-2 right-4 bg-[#141E33] border border-cyan-500/40 rounded-xl p-3 shadow-xl text-xs space-y-1 z-10 pointer-events-none">
            <div className="text-[10px] text-slate-400">{hoveredPoint.timestamp}</div>
            <div className="text-sm font-bold text-white">
              Equity: {formatPrice(hoveredPoint.equity, currency, 2)}
            </div>
            <div className="text-[10px] text-emerald-400">
              P&L: +{formatPrice(hoveredPoint.realized_pnl, currency, 2)}
            </div>
            <div className="text-[10px] text-amber-400">
              Drawdown: -{formatPercent(hoveredPoint.drawdown_pct, 2)}
            </div>
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-400" />
            <span className="text-cyan-300 font-bold">Portfolio Equity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-yellow-400 border-dashed" />
            <span className="text-yellow-400 font-bold">High Water Mark (Peak Baseline)</span>
          </div>
        </div>
        <div>
          Max Drawdown: <strong className="text-rose-400">-{formatPercent(maxDrawdownPct, 2)}</strong>
        </div>
      </div>
    </div>
  );
}
