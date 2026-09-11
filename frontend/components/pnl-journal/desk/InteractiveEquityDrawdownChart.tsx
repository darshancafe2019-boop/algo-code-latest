"use client";

import React, { useState, useMemo } from "react";
import { TrendingUp, ShieldAlert, Maximize2, Activity } from "lucide-react";
import { EquityCurvePoint } from "@/types/pnl-journal";

interface InteractiveEquityDrawdownChartProps {
  equityCurve: EquityCurvePoint[];
  currencySymbol?: string;
  initialCapital?: number;
}

export const InteractiveEquityDrawdownChart: React.FC<InteractiveEquityDrawdownChartProps> = ({
  equityCurve,
  currencySymbol = "₹",
  initialCapital = 1000000,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<"EQUITY" | "DRAWDOWN" | "DUAL">("DUAL");

  // Fallback points if empty
  const points = useMemo(() => {
    if (!equityCurve || equityCurve.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      return [
        {
          timestamp: today,
          equity: initialCapital,
          realizedEquity: initialCapital,
          cashBalance: initialCapital,
          marginUsed: 0,
          drawdownAmount: 0,
          drawdownPercent: 0,
          highWaterMark: initialCapital,
          dailyNetPnl: 0,
        },
      ];
    }
    return equityCurve;
  }, [equityCurve, initialCapital]);

  const minEquity = Math.min(...points.map((p) => p.equity), initialCapital * 0.95);
  const maxEquity = Math.max(...points.map((p) => Math.max(p.equity, p.highWaterMark)), initialCapital * 1.05);
  const maxDrawdown = Math.max(...points.map((p) => p.drawdownPercent), 5);

  const chartWidth = 900;
  const equityChartHeight = 220;
  const ddChartHeight = 90;
  const padding = { top: 20, right: 30, bottom: 25, left: 60 };

  // Calculate SVG paths
  const equityPointsStr = useMemo(() => {
    if (points.length < 2) return "";
    return points
      .map((p, idx) => {
        const x = padding.left + (idx / (points.length - 1)) * (chartWidth - padding.left - padding.right);
        const y =
          padding.top +
          (1 - (p.equity - minEquity) / (maxEquity - minEquity || 1)) *
            (equityChartHeight - padding.top - padding.bottom);
        return `${x},${y}`;
      })
      .join(" ");
  }, [points, minEquity, maxEquity]);

  const hwmPointsStr = useMemo(() => {
    if (points.length < 2) return "";
    return points
      .map((p, idx) => {
        const x = padding.left + (idx / (points.length - 1)) * (chartWidth - padding.left - padding.right);
        const y =
          padding.top +
          (1 - (p.highWaterMark - minEquity) / (maxEquity - minEquity || 1)) *
            (equityChartHeight - padding.top - padding.bottom);
        return `${x},${y}`;
      })
      .join(" ");
  }, [points, minEquity, maxEquity]);

  const drawdownAreaStr = useMemo(() => {
    if (points.length < 2) return "";
    const coords = points.map((p, idx) => {
      const x = padding.left + (idx / (points.length - 1)) * (chartWidth - padding.left - padding.right);
      const y = (p.drawdownPercent / (maxDrawdown || 1)) * (ddChartHeight - 20) + 10;
      return `${x},${y}`;
    });
    const firstX = padding.left;
    const lastX = chartWidth - padding.right;
    return `${firstX},10 ${coords.join(" ")} ${lastX},10`;
  }, [points, maxDrawdown]);

  const activePoint = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1];

  const formatMoney = (val: number) => {
    return `${val < 0 ? "-" : ""}${currencySymbol}${Math.abs(val).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-md flex flex-col gap-3">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Equity Curve & High-Water Mark
              {activePoint && (
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  {formatMoney(activePoint.equity)}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Cumulative compounded portfolio value with continuous underwater drawdown tracking
            </p>
          </div>
        </div>

        {/* View toggles & Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-400 rounded-full" />
              <span className="text-slate-300">Equity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-cyan-400/60 stroke-dashed rounded-full" />
              <span className="text-slate-400">High-Water</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-rose-500/40 rounded-sm" />
              <span className="text-rose-400">Drawdown</span>
            </div>
          </div>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveView("DUAL")}
              className={`px-2 py-0.5 rounded ${
                activeView === "DUAL" ? "bg-cyan-600 text-white font-bold" : "text-slate-400"
              }`}
            >
              Dual
            </button>
            <button
              type="button"
              onClick={() => setActiveView("EQUITY")}
              className={`px-2 py-0.5 rounded ${
                activeView === "EQUITY" ? "bg-cyan-600 text-white font-bold" : "text-slate-400"
              }`}
            >
              Equity Only
            </button>
            <button
              type="button"
              onClick={() => setActiveView("DRAWDOWN")}
              className={`px-2 py-0.5 rounded ${
                activeView === "DRAWDOWN" ? "bg-cyan-600 text-white font-bold" : "text-slate-400"
              }`}
            >
              Drawdown
            </button>
          </div>
        </div>
      </div>

      {/* Hover Inspection Stats Strip */}
      {activePoint && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/80 border border-slate-800/80 rounded-lg px-3 py-2 text-xs font-mono">
          <div>
            <span className="text-slate-500">Date: </span>
            <span className="text-slate-200 font-semibold">{activePoint.timestamp}</span>
          </div>
          <div>
            <span className="text-slate-500">Equity: </span>
            <span className="text-emerald-400 font-bold">{formatMoney(activePoint.equity)}</span>
          </div>
          <div>
            <span className="text-slate-500">Daily PnL: </span>
            <span className={activePoint.dailyNetPnl >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              {activePoint.dailyNetPnl >= 0 ? "+" : ""}{formatMoney(activePoint.dailyNetPnl)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Drawdown: </span>
            <span className="text-rose-400 font-bold">
              -{activePoint.drawdownPercent.toFixed(2)}% ({formatMoney(activePoint.drawdownAmount)})
            </span>
          </div>
        </div>
      )}

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden bg-slate-950/50 rounded-lg border border-slate-800/60 p-2">
        <svg
          viewBox={`0 0 ${chartWidth} ${
            activeView === "DUAL" ? equityChartHeight + ddChartHeight + 10 : activeView === "EQUITY" ? equityChartHeight : ddChartHeight
          }`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * chartWidth;
            const usableWidth = chartWidth - padding.left - padding.right;
            const ratio = Math.max(0, Math.min(1, (mouseX - padding.left) / usableWidth));
            const idx = Math.round(ratio * (points.length - 1));
            setHoverIndex(idx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="drawdownGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Equity Chart */}
          {(activeView === "EQUITY" || activeView === "DUAL") && (
            <g>
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((lvl, i) => {
                const y = padding.top + lvl * (equityChartHeight - padding.top - padding.bottom);
                const val = maxEquity - lvl * (maxEquity - minEquity);
                return (
                  <g key={`grid-eq-${i}`}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="#334155"
                      strokeDasharray="3 3"
                      strokeWidth="0.5"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3}
                      fill="#64748B"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {formatMoney(val)}
                    </text>
                  </g>
                );
              })}

              {/* Area Fill */}
              {equityPointsStr && (
                <polygon
                  points={`${padding.left},${equityChartHeight - padding.bottom} ${equityPointsStr} ${
                    chartWidth - padding.right
                  },${equityChartHeight - padding.bottom}`}
                  fill="url(#equityGrad)"
                />
              )}

              {/* High Water Mark Line */}
              {hwmPointsStr && (
                <polyline
                  points={hwmPointsStr}
                  fill="none"
                  stroke="#06B6D4"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
              )}

              {/* Equity Line */}
              {equityPointsStr && (
                <polyline
                  points={equityPointsStr}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          )}

          {/* Drawdown Underwater Chart */}
          {(activeView === "DRAWDOWN" || activeView === "DUAL") && (
            <g
              transform={
                activeView === "DUAL" ? `translate(0, ${equityChartHeight + 10})` : undefined
              }
            >
              {/* Zero baseline */}
              <line
                x1={padding.left}
                y1="10"
                x2={chartWidth - padding.right}
                y2="10"
                stroke="#64748B"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y="13"
                fill="#64748B"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                0%
              </text>
              <text
                x={padding.left - 8}
                y={ddChartHeight - 10}
                fill="#F43F5E"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                -{maxDrawdown.toFixed(0)}%
              </text>

              {/* Drawdown Polygon */}
              {drawdownAreaStr && (
                <polygon points={drawdownAreaStr} fill="url(#drawdownGrad)" stroke="#F43F5E" strokeWidth="1.5" />
              )}
            </g>
          )}

          {/* Hover Crosshair */}
          {hoverIndex !== null && points.length > 1 && (
            <g>
              {(() => {
                const x =
                  padding.left +
                  (hoverIndex / (points.length - 1)) * (chartWidth - padding.left - padding.right);
                return (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={
                      activeView === "DUAL"
                        ? equityChartHeight + ddChartHeight
                        : activeView === "EQUITY"
                        ? equityChartHeight - padding.bottom
                        : ddChartHeight
                    }
                    stroke="#38BDF8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                );
              })()}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
