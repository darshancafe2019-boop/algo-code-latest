"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { CandleData, IndicatorResult } from "@/lib/indicators/types";
import { DrawingToolType } from "./TerminalLeftToolbar";
import { formatPrice, formatPercent } from "@/lib/formatters";

export interface ChartDrawingItem {
  id: string;
  type: DrawingToolType;
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
  price1?: number;
  price2?: number;
  time1?: number;
  time2?: number;
  color?: string;
  text?: string;
}

export interface StrategyLevel {
  id: string;
  label: string;
  type: "ENTRY" | "STOP_LOSS" | "TARGET" | "ZONE";
  price: number;
  price2?: number;
  color?: string;
}

interface TerminalChartProps {
  symbol: string;
  timeframe: string;
  candles: CandleData[];
  livePrice?: number;
  indicatorResults?: Map<string, IndicatorResult<any>>;
  activeTool?: DrawingToolType;
  strategyLevels?: StrategyLevel[];
  drawings?: ChartDrawingItem[];
  onAddDrawing?: (drawing: ChartDrawingItem) => void;
  drawingsHidden?: boolean;
  drawingsLocked?: boolean;
  onViewRangeChange?: (startIndex: number, endIndex: number) => void;
  onHoverIndexChange?: (index: number | null) => void;
}

const RIGHT_PRICE_MARGIN = 75;
const BOTTOM_TIME_MARGIN = 26;

export function TerminalChart({
  symbol,
  timeframe,
  candles = [],
  livePrice,
  indicatorResults = new Map(),
  activeTool = "crosshair",
  strategyLevels = [],
  drawings = [],
  onAddDrawing,
  drawingsHidden = false,
  drawingsLocked = false,
  onViewRangeChange,
  onHoverIndexChange,
}: TerminalChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Visible Window State (Panning & Zooming)
  const [visibleBarsCount, setVisibleBarsCount] = useState(80);
  const [scrollOffset, setScrollOffset] = useState(0); // 0 = latest at right edge

  // Interactive Mouse State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Drawing creation in progress
  const [currentDrawing, setCurrentDrawing] = useState<Partial<ChartDrawingItem> | null>(null);

  // Calculate visible range indices
  const totalCandles = candles.length;
  const endIndex = Math.min(totalCandles - 1, totalCandles - 1 - scrollOffset);
  const startIndex = Math.max(0, endIndex - visibleBarsCount + 1);
  const visibleCandles = useMemo(
    () => candles.slice(startIndex, endIndex + 1),
    [candles, startIndex, endIndex]
  );

  // Notify parent of view range
  useEffect(() => {
    if (onViewRangeChange) {
      onViewRangeChange(startIndex, endIndex);
    }
  }, [startIndex, endIndex, onViewRangeChange]);

  // Find min and max price in visible window
  const { minPrice, maxPrice } = useMemo(() => {
    if (visibleCandles.length === 0) return { minPrice: 100, maxPrice: 110 };
    let min = Infinity;
    let max = -Infinity;

    for (const c of visibleCandles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    }

    // Expand min/max by 5% margin
    const margin = (max - min) * 0.08 || 1;
    return { minPrice: min - margin, maxPrice: max + margin };
  }, [visibleCandles]);

  // Coordinate conversion helpers
  const priceToY = useCallback(
    (price: number, chartHeight: number) => {
      if (maxPrice === minPrice) return chartHeight / 2;
      return chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
    },
    [minPrice, maxPrice]
  );

  const yToPrice = useCallback(
    (y: number, chartHeight: number) => {
      if (chartHeight === 0) return minPrice;
      const ratio = (chartHeight - y) / chartHeight;
      return minPrice + ratio * (maxPrice - minPrice);
    },
    [minPrice, maxPrice]
  );

  const indexToX = useCallback(
    (idx: number, chartWidth: number) => {
      const count = visibleCandles.length || 1;
      const barWidth = chartWidth / count;
      return (idx - startIndex) * barWidth + barWidth / 2;
    },
    [startIndex, visibleCandles.length]
  );

  // Hovered candle index
  const hoveredCandle = useMemo(() => {
    if (!mousePos || !containerRef.current || visibleCandles.length === 0) return null;
    const chartWidth = containerRef.current.clientWidth - RIGHT_PRICE_MARGIN;
    if (mousePos.x < 0 || mousePos.x > chartWidth) return null;

    const count = visibleCandles.length;
    const barWidth = chartWidth / count;
    const relIdx = Math.floor(mousePos.x / barWidth);
    const clampedRelIdx = Math.max(0, Math.min(count - 1, relIdx));
    return visibleCandles[clampedRelIdx] || null;
  }, [mousePos, visibleCandles]);

  // Render Canvas Chart
  const renderChart = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const totalWidth = container.clientWidth;
    const totalHeight = container.clientHeight;

    canvas.width = totalWidth * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${totalHeight}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalWidth, totalHeight);

    const chartWidth = totalWidth - RIGHT_PRICE_MARGIN;
    const chartHeight = totalHeight - BOTTOM_TIME_MARGIN;

    // 1. Background
    ctx.fillStyle = "#0F1116";
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // 2. Subtle Grid Lines
    ctx.strokeStyle = "#171B26";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Horizontal price grid lines
    const gridSteps = 6;
    for (let i = 1; i < gridSteps; i++) {
      const y = (chartHeight / gridSteps) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
    }

    // Vertical time grid lines
    const timeGridSteps = 7;
    for (let i = 1; i < timeGridSteps; i++) {
      const x = (chartWidth / timeGridSteps) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, chartHeight);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    if (visibleCandles.length === 0) {
      ctx.fillStyle = "#787B86";
      ctx.font = "12px sans-serif";
      ctx.fillText("Awaiting Market Candlesticks...", chartWidth / 2 - 80, chartHeight / 2);
      return;
    }

    const count = visibleCandles.length;
    const barWidth = chartWidth / count;
    const candleBodyWidth = Math.max(1.5, barWidth * 0.72);

    // 3. Render Volume Histogram at base of chart
    let maxVol = 1;
    for (const c of visibleCandles) {
      if (c.volume && c.volume > maxVol) maxVol = c.volume;
    }
    const maxVolHeight = chartHeight * 0.18;

    for (let i = 0; i < count; i++) {
      const c = visibleCandles[i];
      const x = i * barWidth + barWidth / 2;
      const vol = c.volume || 0;
      const volH = (vol / maxVol) * maxVolHeight;
      const isBull = c.close >= c.open;

      ctx.fillStyle = isBull ? "rgba(38, 166, 154, 0.2)" : "rgba(239, 83, 80, 0.2)";
      ctx.fillRect(x - candleBodyWidth / 2, chartHeight - volH, candleBodyWidth, volH);
    }

    // 4. Render Candlesticks
    for (let i = 0; i < count; i++) {
      const c = visibleCandles[i];
      const x = i * barWidth + barWidth / 2;

      const openY = priceToY(c.open, chartHeight);
      const closeY = priceToY(c.close, chartHeight);
      const highY = priceToY(c.high, chartHeight);
      const lowY = priceToY(c.low, chartHeight);

      const isBull = c.close >= c.open;
      const candleColor = isBull ? "#26A69A" : "#EF5350";

      // Wick
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = candleColor;
      const topY = Math.min(openY, closeY);
      const bodyH = Math.max(1, Math.abs(closeY - openY));
      ctx.fillRect(x - candleBodyWidth / 2, topY, candleBodyWidth, bodyH);
    }

    // 5. Render Central Indicator Overlays (EMA, SMA, VWAP, Supertrend)
    renderIndicatorOverlays(ctx, indicatorResults, candles, startIndex, count, barWidth, chartHeight, priceToY);

    // 6. Render Strategy Levels (Entry, Stop Loss, Target Zones)
    for (const lvl of strategyLevels) {
      const y = priceToY(lvl.price, chartHeight);
      const color =
        lvl.color ||
        (lvl.type === "ENTRY" ? "#2962FF" : lvl.type === "STOP_LOSS" ? "#EF5350" : "#26A69A");

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label on right axis
      ctx.fillStyle = color;
      ctx.fillRect(chartWidth, y - 9, RIGHT_PRICE_MARGIN - 2, 18);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 10px monospace";
      ctx.fillText(`${lvl.label} ${lvl.price.toFixed(1)}`, chartWidth + 4, y + 4);
    }

    // 7. Render Drawings
    if (!drawingsHidden) {
      renderUserDrawings(ctx, drawings, currentDrawing, chartWidth, chartHeight, priceToY, indexToX, startIndex);
    }

    // 8. Latest Live Price Dotted Line & Right Marker
    const curPrice = livePrice || visibleCandles[visibleCandles.length - 1]?.close;
    if (curPrice) {
      const curY = priceToY(curPrice, chartHeight);
      const isCurBull = visibleCandles[visibleCandles.length - 1]?.close >= visibleCandles[visibleCandles.length - 1]?.open;
      const markerColor = isCurBull ? "#26A69A" : "#EF5350";

      ctx.strokeStyle = markerColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, curY);
      ctx.lineTo(chartWidth, curY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right price badge
      ctx.fillStyle = markerColor;
      ctx.fillRect(chartWidth, curY - 10, RIGHT_PRICE_MARGIN, 20);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 11px monospace";
      ctx.fillText(curPrice.toFixed(2), chartWidth + 6, curY + 4);
    }

    // 9. Right Price Scale Background & Text
    ctx.fillStyle = "#131722";
    ctx.fillRect(chartWidth, 0, RIGHT_PRICE_MARGIN, chartHeight);
    ctx.strokeStyle = "#2A2E39";
    ctx.beginPath();
    ctx.moveTo(chartWidth, 0);
    ctx.lineTo(chartWidth, chartHeight);
    ctx.stroke();

    ctx.fillStyle = "#787B86";
    ctx.font = "11px monospace";
    for (let i = 1; i < gridSteps; i++) {
      const y = (chartHeight / gridSteps) * i;
      const p = yToPrice(y, chartHeight);
      ctx.fillText(p.toFixed(2), chartWidth + 8, y + 4);
    }

    // 10. Bottom Time Scale Background & Text
    ctx.fillStyle = "#131722";
    ctx.fillRect(0, chartHeight, totalWidth, BOTTOM_TIME_MARGIN);
    ctx.strokeStyle = "#2A2E39";
    ctx.beginPath();
    ctx.moveTo(0, chartHeight);
    ctx.lineTo(totalWidth, chartHeight);
    ctx.stroke();

    ctx.fillStyle = "#787B86";
    ctx.font = "10px monospace";
    const timeStep = Math.max(1, Math.floor(count / 6));
    for (let i = 0; i < count; i += timeStep) {
      const c = visibleCandles[i];
      const x = i * barWidth + barWidth / 2;
      const dateStr = new Date(c.timestamp || (c as any).time || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      ctx.fillText(dateStr, x - 18, chartHeight + 17);
    }

    // 11. Crosshair Hover Lines
    if (mousePos && mousePos.x <= chartWidth && mousePos.y <= chartHeight) {
      ctx.strokeStyle = "rgba(209, 212, 220, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, chartHeight);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(chartWidth, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price Tag on Right Axis
      const hoverPrice = yToPrice(mousePos.y, chartHeight);
      ctx.fillStyle = "#2962FF";
      ctx.fillRect(chartWidth, mousePos.y - 10, RIGHT_PRICE_MARGIN, 20);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 11px monospace";
      ctx.fillText(hoverPrice.toFixed(2), chartWidth + 6, mousePos.y + 4);
    }
  }, [
    visibleCandles,
    candles,
    livePrice,
    indicatorResults,
    strategyLevels,
    drawings,
    currentDrawing,
    drawingsHidden,
    mousePos,
    priceToY,
    yToPrice,
    indexToX,
    startIndex,
  ]);

  // Trigger render on animation frame
  useEffect(() => {
    renderChart();
  }, [renderChart]);

  // Window Resize Observer
  useEffect(() => {
    const handleResize = () => renderChart();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderChart]);

  // ── Mouse & Wheel Handlers ──────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "crosshair") {
      setIsDragging(true);
      setDragStartX(x);
      setDragStartOffset(scrollOffset);
    } else if (!drawingsLocked && onAddDrawing) {
      // Start drawing tool
      setCurrentDrawing({
        id: `draw_${Date.now()}`,
        type: activeTool,
        x1: x,
        y1: y,
        x2: x,
        y2: y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    if (isDragging) {
      const deltaX = x - dragStartX;
      const chartWidth = (rect.width || 800) - RIGHT_PRICE_MARGIN;
      const barWidth = chartWidth / visibleBarsCount;
      const deltaBars = Math.round(deltaX / barWidth);
      const newOffset = Math.max(0, Math.min(candles.length - visibleBarsCount, dragStartOffset + deltaBars));
      setScrollOffset(newOffset);
    } else if (currentDrawing) {
      setCurrentDrawing((prev) => (prev ? { ...prev, x2: x, y2: y } : null));
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    } else if (currentDrawing && onAddDrawing) {
      if (currentDrawing.x1 !== undefined && currentDrawing.x2 !== undefined) {
        onAddDrawing(currentDrawing as ChartDrawingItem);
      }
      setCurrentDrawing(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const newCount = Math.max(15, Math.min(300, Math.round(visibleBarsCount * zoomFactor)));
    setVisibleBarsCount(newCount);
  };

  // Active OHLCV Header Readout
  const activeBar = hoveredCandle || visibleCandles[visibleCandles.length - 1];
  const barChange = activeBar ? activeBar.close - activeBar.open : 0;
  const barChangePct = activeBar && activeBar.open > 0 ? (barChange / activeBar.open) * 100 : 0;
  const isBarBull = barChange >= 0;

  return (
    <div ref={containerRef} className="relative w-full h-full flex-1 overflow-hidden select-none bg-[#0F1116]">
      {/* Top-Left OHLCV & Indicator Header Readout */}
      {activeBar && (
        <div className="absolute top-2 left-3 z-10 flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums pointer-events-none bg-[#131722]/85 backdrop-blur-sm px-2.5 py-1 rounded border border-[#2A2E39] shadow-md">
          <span className="font-bold text-[#D1D4DC]">{symbol}</span>
          <span className="text-[#787B86]">{timeframe}</span>

          <span className="text-[#787B86]">O:</span>
          <span className="text-[#D1D4DC] font-semibold">{activeBar.open.toFixed(2)}</span>

          <span className="text-[#787B86]">H:</span>
          <span className="text-[#D1D4DC] font-semibold">{activeBar.high.toFixed(2)}</span>

          <span className="text-[#787B86]">L:</span>
          <span className="text-[#D1D4DC] font-semibold">{activeBar.low.toFixed(2)}</span>

          <span className="text-[#787B86]">C:</span>
          <span className={`font-semibold ${isBarBull ? "text-[#26A69A]" : "text-[#EF5350]"}`}>
            {activeBar.close.toFixed(2)}
          </span>

          <span className={`font-bold ml-1 ${isBarBull ? "text-[#26A69A]" : "text-[#EF5350]"}`}>
            {isBarBull ? "+" : ""}{barChange.toFixed(2)} ({isBarBull ? "+" : ""}{barChangePct.toFixed(2)}%)
          </span>

          {activeBar.volume && (
            <>
              <span className="text-[#787B86] ml-2">Vol:</span>
              <span className="text-[#D1D4DC]">{activeBar.volume.toLocaleString()}</span>
            </>
          )}
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setMousePos(null);
        }}
        onWheel={handleWheel}
        className={`block w-full h-full ${
          activeTool === "crosshair" ? (isDragging ? "cursor-grabbing" : "cursor-crosshair") : "cursor-crosshair"
        }`}
      />
    </div>
  );
}

// ── Overlay Render Functions ─────────────────────────────────────────────────

function renderIndicatorOverlays(
  ctx: CanvasRenderingContext2D,
  indicatorResults: Map<string, IndicatorResult<any>>,
  candles: CandleData[],
  startIndex: number,
  count: number,
  barWidth: number,
  chartHeight: number,
  priceToY: (p: number, h: number) => number
) {
  // 1. EMA Overlay
  const emaRes = indicatorResults.get("ema");
  if (emaRes && emaRes.series) {
    ctx.strokeStyle = "#FFA726";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;

    for (let i = 0; i < count; i++) {
      const idx = startIndex + i;
      const item = emaRes.series[idx];
      if (item && item.ema !== null && typeof item.ema === "number") {
        const x = i * barWidth + barWidth / 2;
        const y = priceToY(item.ema, chartHeight);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();
  }

  // 2. SMA Overlay
  const smaRes = indicatorResults.get("sma");
  if (smaRes && smaRes.series) {
    ctx.strokeStyle = "#42A5F5";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;

    for (let i = 0; i < count; i++) {
      const idx = startIndex + i;
      const item = smaRes.series[idx];
      if (item && item.sma !== null && typeof item.sma === "number") {
        const x = i * barWidth + barWidth / 2;
        const y = priceToY(item.sma, chartHeight);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();
  }

  // 3. VWAP Overlay
  const vwapRes = indicatorResults.get("vwap");
  if (vwapRes && vwapRes.series) {
    ctx.strokeStyle = "#26C6DA";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    let started = false;

    for (let i = 0; i < count; i++) {
      const idx = startIndex + i;
      const item = vwapRes.series[idx];
      if (item && item.vwap !== null && typeof item.vwap === "number") {
        const x = i * barWidth + barWidth / 2;
        const y = priceToY(item.vwap, chartHeight);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();
  }

  // 4. Supertrend Overlay
  const supertrendRes = indicatorResults.get("supertrend");
  if (supertrendRes && supertrendRes.series) {
    for (let i = 0; i < count; i++) {
      const idx = startIndex + i;
      const item = supertrendRes.series[idx];
      if (item && item.supertrend !== null) {
        const x = i * barWidth + barWidth / 2;
        const y = priceToY(item.supertrend, chartHeight);
        const color = item.direction === 1 ? "#26A69A" : "#EF5350";

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 5. Bollinger Bands Overlay
  const bbRes = indicatorResults.get("bollinger");
  if (bbRes && bbRes.series) {
    ctx.strokeStyle = "rgba(41, 98, 255, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    let started = false;

    for (let i = 0; i < count; i++) {
      const idx = startIndex + i;
      const item = bbRes.series[idx];
      if (item && item.upper !== null) {
        const x = i * barWidth + barWidth / 2;
        const y = priceToY(item.upper, chartHeight);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    ctx.beginPath();
    started = false;
    for (let i = 0; i < count; i++) {
      const idx = startIndex + i;
      const item = bbRes.series[idx];
      if (item && item.lower !== null) {
        const x = i * barWidth + barWidth / 2;
        const y = priceToY(item.lower, chartHeight);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();
  }
}

function renderUserDrawings(
  ctx: CanvasRenderingContext2D,
  drawings: ChartDrawingItem[],
  currentDrawing: Partial<ChartDrawingItem> | null,
  chartWidth: number,
  chartHeight: number,
  priceToY: (p: number, h: number) => number,
  indexToX: (idx: number, w: number) => number,
  startIndex: number
) {
  const allDrawings = currentDrawing ? [...drawings, currentDrawing as ChartDrawingItem] : drawings;

  for (const d of allDrawings) {
    ctx.strokeStyle = d.color || "#2962FF";
    ctx.fillStyle = d.color || "#2962FF";
    ctx.lineWidth = 1.5;

    if (d.type === "trendline" && d.x2 !== undefined && d.y2 !== undefined) {
      ctx.beginPath();
      ctx.moveTo(d.x1, d.y1);
      ctx.lineTo(d.x2, d.y2);
      ctx.stroke();
    } else if (d.type === "horizontal") {
      ctx.beginPath();
      ctx.moveTo(0, d.y1);
      ctx.lineTo(chartWidth, d.y1);
      ctx.stroke();
    } else if (d.type === "vertical") {
      ctx.beginPath();
      ctx.moveTo(d.x1, 0);
      ctx.lineTo(d.x1, chartHeight);
      ctx.stroke();
    } else if (d.type === "rectangle" && d.x2 !== undefined && d.y2 !== undefined) {
      ctx.fillStyle = "rgba(41, 98, 255, 0.15)";
      ctx.fillRect(d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1);
      ctx.strokeRect(d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1);
    } else if (d.type === "fibonacci" && d.x2 !== undefined && d.y2 !== undefined) {
      const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
      const diffY = d.y2 - d.y1;

      for (const lvl of fibLevels) {
        const curY = d.y1 + diffY * lvl;
        ctx.strokeStyle = lvl === 0.5 || lvl === 0.618 ? "#FFA726" : "rgba(41, 98, 255, 0.6)";
        ctx.beginPath();
        ctx.moveTo(d.x1, curY);
        ctx.lineTo(d.x2, curY);
        ctx.stroke();

        ctx.fillStyle = "#D1D4DC";
        ctx.font = "9px monospace";
        ctx.fillText(`Fib ${lvl.toFixed(3)}`, d.x1 + 4, curY - 3);
      }
    } else if (d.type === "measure" && d.x2 !== undefined && d.y2 !== undefined) {
      ctx.fillStyle = "rgba(38, 166, 154, 0.2)";
      ctx.fillRect(d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1);
      ctx.strokeRect(d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 10px monospace";
      ctx.fillText(`Δ: ${Math.abs(d.y2 - d.y1).toFixed(0)}px`, d.x1 + 6, d.y1 + 14);
    }
  }
}
