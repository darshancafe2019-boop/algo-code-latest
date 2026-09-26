"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  Move,
  Crosshair,
  RotateCcw,
} from "lucide-react";
import { CanonicalFuturesContract } from "../types/futures";

interface FuturesInteractiveChartProps {
  contract: CanonicalFuturesContract | null;
  livePrice?: number;
  onSetStopLoss?: (price: string) => void;
  onSetTakeProfit?: (price: string) => void;
  initialStopLoss?: string;
  initialTakeProfit?: string;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function FuturesInteractiveChart({
  contract,
  livePrice,
  onSetStopLoss,
  onSetTakeProfit,
  initialStopLoss = "",
  initialTakeProfit = "",
}: FuturesInteractiveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Timeframe
  const [timeframe, setTimeframe] = useState<"1m" | "5m" | "15m" | "1H" | "1D">("5m");
  const [interactionMode, setInteractionMode] = useState<"PAN" | "CROSSHAIR">("PAN");

  // Indicators toggle
  const [showEma9, setShowEma9] = useState(true);
  const [showEma21, setShowEma21] = useState(true);
  const [showVwap, setShowVwap] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  // Draggable SL & TP levels
  const [draggedLevel, setDraggedLevel] = useState<"SL" | "TP" | null>(null);
  const [slPrice, setSlPrice] = useState<number | null>(
    initialStopLoss ? parseFloat(initialStopLoss) : null
  );
  const [tpPrice, setTpPrice] = useState<number | null>(
    initialTakeProfit ? parseFloat(initialTakeProfit) : null
  );

  // Panning & Zooming
  const [visibleBars, setVisibleBars] = useState(60);
  const [scrollOffset, setScrollOffset] = useState(0); // 0 = rightmost (latest)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const basePrice = livePrice || contract?.last_price || contract?.mark_price || 23140.5;

  // Generate realistic historical candle dataset centered on the contract's price
  const baseCandles = useMemo<Candle[]>(() => {
    const list: Candle[] = [];
    const count = 150;
    const now = Date.now();
    const stepMs =
      timeframe === "1m"
        ? 60000
        : timeframe === "5m"
        ? 300000
        : timeframe === "15m"
        ? 900000
        : timeframe === "1H"
        ? 3600000
        : 86400000;

    let current = basePrice * 0.985;
    const volatility = basePrice * 0.0018;

    for (let i = count; i >= 0; i--) {
      const t = now - i * stepMs;
      const change = (Math.sin(i / 6) * 0.6 + (Math.random() - 0.49) * 1.5) * volatility;
      const open = current;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.8;
      const low = Math.min(open, close) - Math.random() * volatility * 0.8;
      const volume = Math.floor(50000 + Math.random() * 200000);

      list.push({ time: t, open, high, low, close, volume });
      current = close;
    }

    // Anchor latest candle to authentic livePrice
    if (list.length > 0 && livePrice) {
      const last = list[list.length - 1];
      last.close = livePrice;
      last.high = Math.max(last.high, livePrice);
      last.low = Math.min(last.low, livePrice);
    }

    return list;
  }, [basePrice, timeframe, livePrice]);

  // Compute indicators
  const ema9 = useMemo(() => {
    const k = 2 / (9 + 1);
    const result: (number | null)[] = [];
    let prev: number | null = null;
    baseCandles.forEach((c, idx) => {
      if (idx < 8) {
        result.push(null);
        return;
      }
      if (prev === null) {
        let sum = 0;
        for (let j = 0; j < 9; j++) sum += baseCandles[idx - j].close;
        prev = sum / 9;
        result.push(prev);
      } else {
        prev = c.close * k + prev * (1 - k);
        result.push(prev);
      }
    });
    return result;
  }, [baseCandles]);

  const ema21 = useMemo(() => {
    const k = 2 / (21 + 1);
    const result: (number | null)[] = [];
    let prev: number | null = null;
    baseCandles.forEach((c, idx) => {
      if (idx < 20) {
        result.push(null);
        return;
      }
      if (prev === null) {
        let sum = 0;
        for (let j = 0; j < 21; j++) sum += baseCandles[idx - j].close;
        prev = sum / 21;
        result.push(prev);
      } else {
        prev = c.close * k + prev * (1 - k);
        result.push(prev);
      }
    });
    return result;
  }, [baseCandles]);

  const vwap = useMemo(() => {
    let cumVol = 0;
    let cumVolPrice = 0;
    return baseCandles.map((c) => {
      const typical = (c.high + c.low + c.close) / 3;
      cumVol += c.volume;
      cumVolPrice += typical * c.volume;
      return cumVol > 0 ? cumVolPrice / cumVol : c.close;
    });
  }, [baseCandles]);

  // Visible Window Calculation
  const totalCount = baseCandles.length;
  const endIndex = Math.min(totalCount - 1, totalCount - 1 - scrollOffset);
  const startIndex = Math.max(0, endIndex - visibleBars + 1);

  const visibleCandles = useMemo(
    () => baseCandles.slice(startIndex, endIndex + 1),
    [baseCandles, startIndex, endIndex]
  );

  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (visibleCandles.length === 0) return { minPrice: 100, maxPrice: 110, maxVolume: 100 };
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;
    visibleCandles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });
    const padding = (max - min) * 0.08 || 1;
    return { minPrice: min - padding, maxPrice: max + padding, maxVolume: maxVol };
  }, [visibleCandles]);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const rightMargin = 65;
    const bottomMargin = 24;
    const chartWidth = width - rightMargin;
    const chartHeight = height - bottomMargin;

    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#080E1C");
    bgGrad.addColorStop(1, "#030712");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    const priceSteps = 6;
    for (let i = 0; i <= priceSteps; i++) {
      const y = (chartHeight / priceSteps) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      const priceVal = maxPrice - ((maxPrice - minPrice) / priceSteps) * i;
      ctx.fillStyle = "#64748B";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(priceVal.toFixed(1), chartWidth + 6, y + 3);
    }

    if (visibleCandles.length === 0) return;

    const candleWidth = chartWidth / visibleCandles.length;
    const bodyWidth = Math.max(2, candleWidth * 0.7);

    const priceToY = (p: number) => {
      if (maxPrice === minPrice) return chartHeight / 2;
      return chartHeight - ((p - minPrice) / (maxPrice - minPrice)) * chartHeight;
    };

    // Draw Volume Bars
    if (showVolume && maxVolume > 0) {
      const volHeightMax = chartHeight * 0.22;
      visibleCandles.forEach((c, idx) => {
        const x = idx * candleWidth + candleWidth / 2;
        const vHeight = (c.volume / maxVolume) * volHeightMax;
        const y = chartHeight - vHeight;
        const isUp = c.close >= c.open;
        ctx.fillStyle = isUp ? "rgba(16, 185, 129, 0.22)" : "rgba(244, 63, 94, 0.22)";
        ctx.fillRect(x - bodyWidth / 2, y, bodyWidth, vHeight);
      });
    }

    // Draw EMAs & VWAP
    const drawLineSeries = (data: (number | null)[], color: string, widthPx = 1.5) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = widthPx;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < visibleCandles.length; i++) {
        const globalIdx = startIndex + i;
        const val = data[globalIdx];
        if (val !== null && val !== undefined) {
          const x = i * candleWidth + candleWidth / 2;
          const y = priceToY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    };

    if (showVwap) drawLineSeries(vwap, "#EAB308", 1.5);
    if (showEma9) drawLineSeries(ema9, "#00D4FF", 1.5);
    if (showEma21) drawLineSeries(ema21, "#F43F5E", 1.5);

    // Draw Candlesticks
    visibleCandles.forEach((c, idx) => {
      const x = idx * candleWidth + candleWidth / 2;
      const isUp = c.close >= c.open;
      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);

      const color = isUp ? "#10B981" : "#F43F5E";

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const topY = Math.min(openY, closeY);
      const bodyH = Math.max(1.5, Math.abs(closeY - openY));
      ctx.fillStyle = color;
      ctx.fillRect(x - bodyWidth / 2, topY, bodyWidth, bodyH);
    });

    // Draw Draggable SL Line
    if (slPrice !== null && slPrice >= minPrice && slPrice <= maxPrice) {
      const slY = priceToY(slPrice);
      ctx.strokeStyle = "#F43F5E";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, slY);
      ctx.lineTo(chartWidth, slY);
      ctx.stroke();
      ctx.setLineDash([]);

      // SL Badge Handle
      ctx.fillStyle = "#F43F5E";
      ctx.fillRect(chartWidth + 2, slY - 8, 58, 16);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`SL: ${slPrice.toFixed(1)}`, chartWidth + 31, slY + 3);
    }

    // Draw Draggable TP Line
    if (tpPrice !== null && tpPrice >= minPrice && tpPrice <= maxPrice) {
      const tpY = priceToY(tpPrice);
      ctx.strokeStyle = "#10B981";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, tpY);
      ctx.lineTo(chartWidth, tpY);
      ctx.stroke();
      ctx.setLineDash([]);

      // TP Badge Handle
      ctx.fillStyle = "#10B981";
      ctx.fillRect(chartWidth + 2, tpY - 8, 58, 16);
      ctx.fillStyle = "#022c22";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`TP: ${tpPrice.toFixed(1)}`, chartWidth + 31, tpY + 3);
    }

    // Live Price Line
    if (livePrice) {
      const liveY = priceToY(livePrice);
      ctx.strokeStyle = "#00D4FF";
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, liveY);
      ctx.lineTo(chartWidth, liveY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Live Badge
      ctx.fillStyle = "#00D4FF";
      ctx.fillRect(chartWidth + 2, liveY - 8, 60, 16);
      ctx.fillStyle = "#080E1C";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(livePrice.toFixed(1), chartWidth + 32, liveY + 3);
    }

    // Crosshair rendering
    if (mousePos && mousePos.x >= 0 && mousePos.x <= chartWidth && mousePos.y >= 0 && mousePos.y <= chartHeight) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;

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

      // Price badge on Y axis
      const hoveredPrice = maxPrice - (mousePos.y / chartHeight) * (maxPrice - minPrice);
      ctx.fillStyle = "#334155";
      ctx.fillRect(chartWidth + 2, mousePos.y - 8, 60, 16);
      ctx.fillStyle = "#F8FAFC";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(hoveredPrice.toFixed(1), chartWidth + 32, mousePos.y + 3);
    }
  }, [
    visibleCandles,
    minPrice,
    maxPrice,
    maxVolume,
    showVolume,
    showEma9,
    showEma21,
    showVwap,
    ema9,
    ema21,
    vwap,
    startIndex,
    slPrice,
    tpPrice,
    livePrice,
    mousePos,
  ]);

  // Resize canvas to element client dimensions
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // ----------------------------------------------------
  // DRAG & PAN HANDLERS
  // ----------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if user clicked near SL or TP handle on the right
    const chartHeight = rect.height - 24;
    const priceFromY = (yPos: number) => maxPrice - (yPos / chartHeight) * (maxPrice - minPrice);

    if (x > rect.width - 65) {
      if (slPrice !== null && Math.abs(priceFromY(y) - slPrice) < (maxPrice - minPrice) * 0.05) {
        setDraggedLevel("SL");
        return;
      }
      if (tpPrice !== null && Math.abs(priceFromY(y) - tpPrice) < (maxPrice - minPrice) * 0.05) {
        setDraggedLevel("TP");
        return;
      }
    }

    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartOffset(scrollOffset);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const chartHeight = rect.height - 24;
    const priceFromY = (yPos: number) => maxPrice - (yPos / chartHeight) * (maxPrice - minPrice);

    // If dragging SL or TP level
    if (draggedLevel === "SL") {
      const newPrice = Math.round(priceFromY(y) * 10) / 10;
      setSlPrice(newPrice);
      if (onSetStopLoss) onSetStopLoss(newPrice.toFixed(1));
      return;
    }
    if (draggedLevel === "TP") {
      const newPrice = Math.round(priceFromY(y) * 10) / 10;
      setTpPrice(newPrice);
      if (onSetTakeProfit) onSetTakeProfit(newPrice.toFixed(1));
      return;
    }

    // If panning chart horizontally
    if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      const candleWidth = (rect.width - 65) / visibleBars;
      const barsDelta = Math.round(deltaX / candleWidth);
      const newOffset = Math.max(
        0,
        Math.min(totalCount - visibleBars, dragStartOffset + barsDelta)
      );
      setScrollOffset(newOffset);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedLevel(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomIn = e.deltaY < 0;
    setVisibleBars((prev) => {
      const step = 6;
      if (zoomIn) return Math.max(20, prev - step);
      return Math.min(totalCount, prev + step);
    });
  };

  // Touch Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStartX(e.touches[0].clientX);
      setDragStartOffset(scrollOffset);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const deltaX = e.touches[0].clientX - dragStartX;
    const candleWidth = (rect.width - 65) / visibleBars;
    const barsDelta = Math.round(deltaX / candleWidth);
    const newOffset = Math.max(
      0,
      Math.min(totalCount - visibleBars, dragStartOffset + barsDelta)
    );
    setScrollOffset(newOffset);
  };

  const resetView = () => {
    setScrollOffset(0);
    setVisibleBars(60);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#06101B] rounded-xl border border-[#12304A] overflow-hidden font-mono text-xs">
      {/* 1. Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#080E1C] border-b border-[#12304A]">
        {/* Timeframe & Mode */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#020617] rounded-lg p-0.5 border border-slate-800">
            {(["1m", "5m", "15m", "1H", "1D"] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  timeframe === tf
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-[#020617] rounded-lg p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => setInteractionMode("PAN")}
              title="Drag & Pan Chart Mode"
              className={`p-1 rounded text-[10px] flex items-center gap-1 font-bold ${
                interactionMode === "PAN"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Move className="w-3 h-3" />
              <span className="hidden sm:inline">Drag / Pan</span>
            </button>
            <button
              type="button"
              onClick={() => setInteractionMode("CROSSHAIR")}
              title="Crosshair Inspection Mode"
              className={`p-1 rounded text-[10px] flex items-center gap-1 font-bold ${
                interactionMode === "CROSSHAIR"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Crosshair className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Indicators & Reset Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowEma9(!showEma9)}
            className={`px-1.5 py-0.5 rounded text-[10px] border ${
              showEma9
                ? "bg-cyan-950/60 border-cyan-500/40 text-cyan-300"
                : "border-slate-800 text-slate-500"
            }`}
          >
            EMA 9
          </button>
          <button
            type="button"
            onClick={() => setShowEma21(!showEma21)}
            className={`px-1.5 py-0.5 rounded text-[10px] border ${
              showEma21
                ? "bg-rose-950/60 border-rose-500/40 text-rose-300"
                : "border-slate-800 text-slate-500"
            }`}
          >
            EMA 21
          </button>
          <button
            type="button"
            onClick={() => setShowVwap(!showVwap)}
            className={`px-1.5 py-0.5 rounded text-[10px] border ${
              showVwap
                ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                : "border-slate-800 text-slate-500"
            }`}
          >
            VWAP
          </button>

          <button
            type="button"
            onClick={resetView}
            title="Reset Chart View to Live"
            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Interactive Canvas Area */}
      <div
        ref={containerRef}
        className={`relative flex-1 w-full min-h-[280px] select-none ${
          interactionMode === "PAN"
            ? isDragging
              ? "cursor-grabbing"
              : "cursor-grab"
            : "cursor-crosshair"
        }`}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          className="absolute inset-0 w-full h-full block"
        />

        {/* Drag Guidance Tooltip */}
        <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-950/80 border border-slate-800 text-[10px] text-slate-300 shadow">
          <Move className="w-3 h-3 text-cyan-400" />
          <span>Click & Drag to pan timeline | Scroll to zoom</span>
        </div>
      </div>

      {/* 3. Drag Timeline Scrubber & Order Targets Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#080E1C] border-t border-[#12304A] text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          <span>Timeline Scrubber:</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, totalCount - visibleBars)}
            value={scrollOffset}
            onChange={(e) => setScrollOffset(parseInt(e.target.value, 10))}
            className="w-28 sm:w-36 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <span className="tabular-nums text-cyan-400">
            {scrollOffset === 0 ? "LIVE" : `-${scrollOffset} bars`}
          </span>
        </div>

        {/* Quick SL / TP Staging */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const target = Math.round((basePrice * 0.99) * 10) / 10;
              setSlPrice(target);
              if (onSetStopLoss) onSetStopLoss(target.toFixed(1));
            }}
            className="px-2 py-0.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-600/40 text-rose-300 rounded font-bold transition"
          >
            + Drag SL (-1%)
          </button>
          <button
            type="button"
            onClick={() => {
              const target = Math.round((basePrice * 1.02) * 10) / 10;
              setTpPrice(target);
              if (onSetTakeProfit) onSetTakeProfit(target.toFixed(1));
            }}
            className="px-2 py-0.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 rounded font-bold transition"
          >
            + Drag TP (+2%)
          </button>
        </div>
      </div>
    </div>
  );
}
