"use client";

import React, { useState, useMemo } from "react";
import { StockCandle } from "../types/stocks";
import { formatStockCurrency } from "../utils/formatting";

interface StockChartProps {
  candles: StockCandle[];
  currency?: string;
  isPositive?: boolean;
}

export const StockChart: React.FC<StockChartProps> = ({
  candles,
  currency = "INR",
  isPositive = true,
}) => {
  const [timeframe, setTimeframe] = useState<string>("15m");
  const [hoveredCandle, setHoveredCandle] = useState<StockCandle | null>(null);

  const timeframes = ["1m", "5m", "15m", "1h", "1d"];

  // Compute min/max for SVG scaling
  const { minPrice, maxPrice, points } = useMemo(() => {
    if (!candles || candles.length === 0) {
      return { minPrice: 0, maxPrice: 100, points: "" };
    }
    const prices = candles.map((c) => c.close);
    const min = Math.min(...prices) * 0.998;
    const max = Math.max(...prices) * 1.002;
    const range = max - min || 1;

    const width = 380;
    const height = 140;

    const pts = candles
      .map((c, idx) => {
        const x = (idx / (candles.length - 1 || 1)) * width;
        const y = height - ((c.close - min) / range) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return { minPrice: min, maxPrice: max, points: pts };
  }, [candles]);

  const activeCandle = hoveredCandle || (candles && candles.length > 0 ? candles[candles.length - 1] : null);
  const chartStroke = isPositive ? "#10b981" : "#f43f5e";
  const chartFill = isPositive ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)";

  return (
    <div className="space-y-3 font-mono">
      {/* Timeframe & Live Hover Tooltip */}
      <div className="flex items-center justify-between">
        <div className="text-[11px]">
          <span className="text-slate-500 text-[10px] uppercase block">Price</span>
          <span className="text-white font-bold">
            {activeCandle ? formatStockCurrency(activeCandle.close, currency) : "—"}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                timeframe === tf
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Interactive Chart Canvas */}
      <div className="h-44 w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between relative overflow-hidden">
        {candles && candles.length > 1 ? (
          <>
            <svg
              viewBox="0 0 380 140"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartStroke} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={chartStroke} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area Fill */}
              <polygon
                points={`0,140 ${points} 380,140`}
                fill="url(#stockGradient)"
              />

              {/* Line Stroke */}
              <polyline
                fill="none"
                stroke={chartStroke}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>

            {/* Scale Min / Max */}
            <div className="flex justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-800/40">
              <span>Low: {formatStockCurrency(minPrice, currency)}</span>
              <span>High: {formatStockCurrency(maxPrice, currency)}</span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
            Historical price action stream loading...
          </div>
        )}
      </div>
    </div>
  );
};
