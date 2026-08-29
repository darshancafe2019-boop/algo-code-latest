"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Maximize2, BarChart2, TrendingUp, Sparkles } from "lucide-react";
import { MarketInstrument } from "@/types/market-universe";
import { formatPrice, formatVolume, formatPercent } from "@/lib/formatters";

interface InstrumentMiniChartProps {
  instrument: MarketInstrument;
  height?: number;
}

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function InstrumentMiniChart({ instrument, height = 240 }: InstrumentMiniChartProps) {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<string>("1h");
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  const sym = instrument.canonical_symbol || instrument.symbol || "UNKNOWN";
  const currSymbol = instrument.currency === "INR" ? "₹" : "$";
  const basePrice = instrument.last_price || 100;
  const high24h = instrument.high_24h || basePrice * 1.03;
  const low24h = instrument.low_24h || basePrice * 0.97;
  const changePct = instrument.change_pct_24h ?? 0;

  // Generate deterministic, realistic OHLC candles based on instrument price action
  const candles: Candle[] = useMemo(() => {
    const list: Candle[] = [];
    const count = timeframe === "1m" ? 40 : timeframe === "5m" ? 36 : timeframe === "1h" ? 30 : 24;
    let current = basePrice * (1 - (changePct / 100) * 0.8);
    const range = Math.max(high24h - low24h, basePrice * 0.02);
    const stepVolatility = range / count;

    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const seed = Math.sin((i + 1) * 1.7) * Math.cos((i + 2) * 0.9);
      const delta = isLast ? basePrice - current : seed * stepVolatility * 1.2;
      const open = current;
      const close = isLast ? basePrice : open + delta;
      const high = Math.max(open, close) + Math.abs(seed * stepVolatility * 0.8);
      const low = Math.min(open, close) - Math.abs(seed * stepVolatility * 0.8);
      const volume = Math.floor(1000 + Math.abs(seed) * 8500);

      list.push({
        time: `${i * 15}m`,
        open,
        high,
        low,
        close,
        volume,
      });
      current = close;
    }
    return list;
  }, [basePrice, high24h, low24h, changePct, timeframe]);

  // Compute scale boundaries
  const minPrice = useMemo(() => Math.min(...candles.map((c) => c.low)) * 0.998, [candles]);
  const maxPrice = useMemo(() => Math.max(...candles.map((c) => c.high)) * 1.002, [candles]);
  const priceRange = maxPrice - minPrice || 1;
  const maxVol = useMemo(() => Math.max(...candles.map((c) => c.volume)) || 1, [candles]);

  const activeCandle = hoveredCandle || candles[candles.length - 1];

  return (
    <div className="space-y-2.5 select-none font-mono">
      {/* Timeframe Bar & Active Candle Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Active Candle OHLC */}
        {activeCandle && (
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span>O: <strong className="text-white">{formatPrice(activeCandle.open, currSymbol)}</strong></span>
            <span>H: <strong className="text-emerald-400">{formatPrice(activeCandle.high, currSymbol)}</strong></span>
            <span>L: <strong className="text-rose-400">{formatPrice(activeCandle.low, currSymbol)}</strong></span>
            <span>C: <strong className="text-cyan-300">{formatPrice(activeCandle.close, currSymbol)}</strong></span>
          </div>
        )}

        {/* Timeframes */}
        <div className="flex items-center gap-1 bg-[#080E20] p-0.5 rounded-lg border border-slate-800 shrink-0">
          {(["1m", "5m", "15m", "1h", "4h", "1D"] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition ${
                timeframe === tf
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Candlestick & Volume Chart Canvas */}
      <div
        className="w-full bg-[#070C1B] rounded-xl border border-slate-800/80 p-2 relative overflow-hidden group/chart"
        style={{ height }}
        onMouseLeave={() => setHoveredCandle(null)}
      >
        <svg className="w-full h-full" viewBox="0 0 320 200" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="50" x2="320" y2="50" stroke="#1E293B" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1="0" y1="100" x2="320" y2="100" stroke="#1E293B" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1="0" y1="150" x2="320" y2="150" stroke="#1E293B" strokeWidth="0.5" strokeDasharray="3 3" />

          {/* Candlesticks & Volume */}
          {candles.map((c, idx) => {
            const candleWidth = 6;
            const slotWidth = 320 / candles.length;
            const x = idx * slotWidth + slotWidth / 2;
            const isGreen = c.close >= c.open;
            const strokeColor = isGreen ? "#34D399" : "#F87171";
            const fillColor = isGreen ? "#10B981" : "#EF4444";

            // Price Y mapping (Canvas 0 to 150)
            const yHigh = 150 - ((c.high - minPrice) / priceRange) * 140;
            const yLow = 150 - ((c.low - minPrice) / priceRange) * 140;
            const yOpen = 150 - ((c.open - minPrice) / priceRange) * 140;
            const yClose = 150 - ((c.close - minPrice) / priceRange) * 140;
            const bodyY = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1.5);

            // Volume Y mapping (Canvas 160 to 195)
            const volHeight = (c.volume / maxVol) * 35;
            const volY = 195 - volHeight;

            return (
              <g
                key={idx}
                className="cursor-crosshair transition-opacity hover:opacity-80"
                onMouseEnter={() => setHoveredCandle(c)}
              >
                {/* Volume Bar */}
                <rect
                  x={x - candleWidth / 2}
                  y={volY}
                  width={candleWidth}
                  height={volHeight}
                  fill={fillColor}
                  opacity="0.35"
                />

                {/* Wick */}
                <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={strokeColor} strokeWidth="1" />

                {/* Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyY}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={fillColor}
                  rx="0.5"
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Price Tag */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[9px] text-cyan-400 font-bold">
          {formatPrice(basePrice, currSymbol)}
        </div>
      </div>

      {/* Action to launch full chart */}
      <button
        type="button"
        onClick={() => router.push(`/charts?symbol=${encodeURIComponent(sym)}`)}
        className="w-full py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold text-xs transition border border-cyan-500/30 flex items-center justify-center gap-1.5"
      >
        <Maximize2 className="w-3.5 h-3.5" />
        <span>Open Full Screen Studio Chart</span>
      </button>
    </div>
  );
}
