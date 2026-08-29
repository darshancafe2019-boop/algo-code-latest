"use client";

import React, { useState } from "react";
import { PayoffPoint, StrategyEvaluationResult } from "@/types/options-workstation";

export interface StrategyPayoffChartProps {
  evaluation?: StrategyEvaluationResult | null;
  payoffCurve?: PayoffPoint[];
  spotPrice?: number;
  breakevens?: number[];
  maxProfit?: number | "UNLIMITED" | null;
  maxLoss?: number | "UNLIMITED" | null;
  currencySymbol?: string;
  underlyingName?: string;
}

export function StrategyPayoffChart(props: StrategyPayoffChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const evaluation = props.evaluation;
  const payoffCurve = props.payoffCurve || evaluation?.payoff_curve || [];
  const spotPrice = props.spotPrice || evaluation?.spot_price || 0;
  const breakevens = props.breakevens || evaluation?.breakevens || [];
  const maxProfit = props.maxProfit !== undefined ? props.maxProfit : (evaluation?.max_profit ?? "UNLIMITED");
  const maxLoss = props.maxLoss !== undefined ? props.maxLoss : (evaluation?.max_loss ?? "UNLIMITED");
  const currencySymbol = props.currencySymbol || "₹";
  const underlyingName = props.underlyingName || evaluation?.underlying || "UNDERLYING";

  if (!payoffCurve || payoffCurve.length < 2) {
    return (
      <div className="w-full h-72 flex items-center justify-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500 font-mono text-xs">
        No payoff curve data available. Configure strategy legs to simulate payoff.
      </div>
    );
  }

  const prices = payoffCurve.map((p) => p.underlying_price);
  const pnls = payoffCurve.map((p) => p.pnl);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minPnl = Math.min(...pnls);
  const maxPnl = Math.max(...pnls);

  // Pad P&L bounds for visual clarity
  const pnlRange = Math.max(10, maxPnl - minPnl);
  const lowerPnl = Math.min(0, minPnl - pnlRange * 0.1);
  const upperPnl = Math.max(0, maxPnl + pnlRange * 0.1);

  const width = 800;
  const height = 300;
  const padding = { top: 30, right: 30, bottom: 40, left: 60 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const getX = (price: number) => {
    return (
      padding.left +
      ((price - minPrice) / Math.max(1, maxPrice - minPrice)) * chartW
    );
  };

  const getY = (pnl: number) => {
    return (
      padding.top +
      chartH -
      ((pnl - lowerPnl) / Math.max(1, upperPnl - lowerPnl)) * chartH
    );
  };

  const zeroY = getY(0);

  // Generate SVG path for line
  const pathD = payoffCurve
    .map((pt, idx) => {
      const x = getX(pt.underlying_price);
      const y = getY(pt.pnl);
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  // Generate SVG path for area above/below zero
  const areaD = `${pathD} L ${getX(prices[prices.length - 1]).toFixed(1)} ${zeroY.toFixed(1)} L ${getX(prices[0]).toFixed(1)} ${zeroY.toFixed(1)} Z`;

  const hoveredPoint = hoverIndex !== null ? payoffCurve[hoverIndex] : null;

  return (
    <div className="w-full bg-[#080E1E] border border-slate-800/90 rounded-2xl p-4 shadow-xl relative overflow-hidden">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 font-mono">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-bold">Payoff Profile:</span>
          <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 font-extrabold text-[11px]">
            {underlyingName} @ {currencySymbol}{spotPrice.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Max Profit:</span>
            <span className="text-emerald-400 font-bold">
              {maxProfit === "UNLIMITED"
                ? "UNLIMITED"
                : `${currencySymbol}${Number(maxProfit).toLocaleString()}`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Max Loss:</span>
            <span className="text-rose-400 font-bold">
              {maxLoss === "UNLIMITED"
                ? "UNLIMITED"
                : `${currencySymbol}${Number(maxLoss).toLocaleString()}`}
            </span>
          </div>

          {breakevens.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">B/E:</span>
              <span className="text-amber-400 font-bold">
                {breakevens.map((b) => `${currencySymbol}${b}`).join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * width;
            const boundedX = Math.max(padding.left, Math.min(width - padding.right, mouseX));
            const priceVal = minPrice + ((boundedX - padding.left) / chartW) * (maxPrice - minPrice);

            // Find closest index
            let closestIdx = 0;
            let minDiff = Infinity;
            prices.forEach((p, idx) => {
              const diff = Math.abs(p - priceVal);
              if (diff < minDiff) {
                minDiff = diff;
                closestIdx = idx;
              }
            });
            setHoverIndex(closestIdx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="profitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="#475569"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Shaded Area */}
          <path d={areaD} fill="url(#profitGrad)" />

          {/* Main Payoff Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#06B6D4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Spot Price Marker */}
          {spotPrice >= minPrice && spotPrice <= maxPrice && (
            <g>
              <line
                x1={getX(spotPrice)}
                y1={padding.top}
                x2={getX(spotPrice)}
                y2={height - padding.bottom}
                stroke="#F59E0B"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={getX(spotPrice)}
                cy={getY(
                  payoffCurve[Math.floor(payoffCurve.length / 2)]?.pnl || 0
                )}
                r="4"
                fill="#F59E0B"
              />
              <text
                x={getX(spotPrice)}
                y={padding.top - 8}
                fill="#F59E0B"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                Spot: {currencySymbol}{spotPrice}
              </text>
            </g>
          )}

          {/* Breakeven Markers */}
          {breakevens.map((be, i) => (
            <g key={i}>
              <line
                x1={getX(be)}
                y1={zeroY - 12}
                x2={getX(be)}
                y2={zeroY + 12}
                stroke="#E2E8F0"
                strokeWidth="2"
              />
              <circle cx={getX(be)} cy={zeroY} r="3" fill="#E2E8F0" />
              <text
                x={getX(be)}
                y={zeroY + 22}
                fill="#CBD5E1"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="middle"
              >
                BE: {be}
              </text>
            </g>
          ))}

          {/* Interactive Hover Point */}
          {hoveredPoint && (
            <g>
              <line
                x1={getX(hoveredPoint.underlying_price)}
                y1={padding.top}
                x2={getX(hoveredPoint.underlying_price)}
                y2={height - padding.bottom}
                stroke="#38BDF8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoveredPoint.underlying_price)}
                cy={getY(hoveredPoint.pnl)}
                r="5"
                fill={hoveredPoint.pnl >= 0 ? "#10B981" : "#F43F5E"}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Axis Labels */}
          <text
            x={padding.left}
            y={height - 12}
            fill="#64748B"
            fontSize="10"
            fontFamily="monospace"
          >
            {currencySymbol}{minPrice.toFixed(0)}
          </text>
          <text
            x={width - padding.right}
            y={height - 12}
            fill="#64748B"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="end"
          >
            {currencySymbol}{maxPrice.toFixed(0)}
          </text>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            className="absolute z-20 top-4 right-4 bg-slate-900/95 border border-cyan-500/40 rounded-xl p-2.5 shadow-2xl backdrop-blur-md font-mono text-xs pointer-events-none"
          >
            <div className="text-slate-400 text-[10px]">At Underlying Price:</div>
            <div className="text-white font-extrabold text-sm mb-1">
              {currencySymbol}{hoveredPoint.underlying_price.toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[10px]">Net P&L:</span>
              <span
                className={`font-black text-xs ${
                  hoveredPoint.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {hoveredPoint.pnl >= 0 ? "+" : ""}
                {currencySymbol}{hoveredPoint.pnl.toLocaleString()} ({hoveredPoint.pnl_pct}%)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
