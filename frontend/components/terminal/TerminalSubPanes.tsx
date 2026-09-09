"use client";

import React, { useRef, useEffect } from "react";
import { Eye, EyeOff, Settings, X, Plus } from "lucide-react";
import { CandleData } from "@/lib/indicators/types";
import { IndicatorResult } from "@/lib/indicators/types";

export interface SubPaneConfig {
  id: string;
  type: "volume" | "rsi" | "macd" | "adx" | "cvd";
  title: string;
  height: number;
  hidden: boolean;
  color?: string;
}

interface TerminalSubPanesProps {
  panes: SubPaneConfig[];
  candles: CandleData[];
  indicatorResults: Map<string, IndicatorResult<any>>;
  onToggleHide: (paneId: string) => void;
  onRemovePane: (paneId: string) => void;
  onConfigurePane: (paneId: string) => void;
  onAddPane?: () => void;
  viewStartIndex: number;
  viewEndIndex: number;
  hoverIndex: number | null;
}

export function TerminalSubPanes({
  panes,
  candles,
  indicatorResults,
  onToggleHide,
  onRemovePane,
  onConfigurePane,
  onAddPane,
  viewStartIndex,
  viewEndIndex,
  hoverIndex,
}: TerminalSubPanesProps) {
  if (panes.length === 0) return null;

  return (
    <div className="flex flex-col border-t border-[#2A2E39] bg-[#0F1116] select-none shrink-0 font-sans">
      {panes.map((pane) => (
        <SubPaneCanvasItem
          key={pane.id}
          pane={pane}
          candles={candles}
          result={indicatorResults.get(pane.type)}
          onToggleHide={() => onToggleHide(pane.id)}
          onRemove={() => onRemovePane(pane.id)}
          onConfigure={() => onConfigurePane(pane.id)}
          viewStartIndex={viewStartIndex}
          viewEndIndex={viewEndIndex}
          hoverIndex={hoverIndex}
        />
      ))}
    </div>
  );
}

interface SubPaneCanvasItemProps {
  pane: SubPaneConfig;
  candles: CandleData[];
  result?: IndicatorResult<any>;
  onToggleHide: () => void;
  onRemove: () => void;
  onConfigure: () => void;
  viewStartIndex: number;
  viewEndIndex: number;
  hoverIndex: number | null;
}

function SubPaneCanvasItem({
  pane,
  candles,
  result,
  onToggleHide,
  onRemove,
  onConfigure,
  viewStartIndex,
  viewEndIndex,
  hoverIndex,
}: SubPaneCanvasItemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Render Subpane Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || pane.hidden) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = pane.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Background and subtle grid
    ctx.fillStyle = "#131722";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#1E222D";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Horizontal grid lines
    ctx.beginPath();
    ctx.moveTo(0, height * 0.3);
    ctx.lineTo(width - 60, height * 0.3);
    ctx.moveTo(0, height * 0.7);
    ctx.lineTo(width - 60, height * 0.7);
    ctx.stroke();
    ctx.setLineDash([]);

    const visibleCandles = candles.slice(viewStartIndex, viewEndIndex + 1);
    if (visibleCandles.length === 0) return;

    const chartWidth = width - 60; // right price margin
    const candleWidth = chartWidth / visibleCandles.length;

    // Draw Sub-indicator Data
    if (pane.type === "rsi") {
      drawRSI(ctx, result, visibleCandles, viewStartIndex, chartWidth, height, candleWidth);
    } else if (pane.type === "macd") {
      drawMACD(ctx, result, visibleCandles, viewStartIndex, chartWidth, height, candleWidth);
    } else if (pane.type === "volume") {
      drawVolume(ctx, result, visibleCandles, viewStartIndex, chartWidth, height, candleWidth);
    } else if (pane.type === "adx") {
      drawADX(ctx, result, visibleCandles, viewStartIndex, chartWidth, height, candleWidth);
    } else if (pane.type === "cvd") {
      drawCVD(ctx, result, visibleCandles, viewStartIndex, chartWidth, height, candleWidth);
    }

    // Right Scale Bar
    ctx.fillStyle = "#1E222D";
    ctx.fillRect(chartWidth, 0, 60, height);
    ctx.strokeStyle = "#2A2E39";
    ctx.strokeRect(chartWidth, 0, 60, height);
  }, [pane, candles, result, viewStartIndex, viewEndIndex]);

  // Compute live value for header readout
  let latestReadout = "";
  if (result?.latest) {
    if (pane.type === "rsi") {
      const rsiVal = (result.latest as any).rsi;
      latestReadout = typeof rsiVal === "number" ? rsiVal.toFixed(2) : "—";
    } else if (pane.type === "macd") {
      const macd = (result.latest as any).macd;
      const sig = (result.latest as any).signal;
      const hist = (result.latest as any).histogram;
      latestReadout = `MACD: ${macd?.toFixed(2) || "—"} Sig: ${sig?.toFixed(2) || "—"} Hist: ${hist?.toFixed(2) || "—"}`;
    } else if (pane.type === "volume") {
      const vol = (result.latest as any).volume;
      const sma = (result.latest as any).volumeSMA;
      latestReadout = `Vol: ${vol ? vol.toLocaleString() : "—"} SMA: ${sma ? sma.toLocaleString() : "—"}`;
    } else if (pane.type === "adx") {
      const adx = (result.latest as any).adx;
      const pdi = (result.latest as any).plusDI;
      const mdi = (result.latest as any).minusDI;
      latestReadout = `ADX: ${adx?.toFixed(1) || "—"} +DI: ${pdi?.toFixed(1) || "—"} -DI: ${mdi?.toFixed(1) || "—"}`;
    } else if (pane.type === "cvd") {
      const cvd = (result.latest as any).cvd;
      latestReadout = `CVD: ${cvd ? cvd.toLocaleString() : "—"}`;
    }
  }

  return (
    <div ref={containerRef} className="relative border-b border-[#2A2E39]">
      {/* Subpane Header Bar */}
      <div className="absolute left-2 top-1.5 z-10 flex items-center gap-2 bg-[#131722]/80 backdrop-blur-sm px-2 py-0.5 rounded border border-[#2A2E39] text-[11px] font-mono">
        <span className="font-bold text-[#D1D4DC]">{pane.title}</span>
        {latestReadout && <span className="text-[#2962FF] font-semibold tabular-nums">{latestReadout}</span>}

        <div className="flex items-center gap-1 ml-2 border-l border-[#2A2E39] pl-1.5 text-[#787B86]">
          <button onClick={onToggleHide} className="hover:text-[#D1D4DC]" title={pane.hidden ? "Show" : "Hide"}>
            {pane.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
          <button onClick={onConfigure} className="hover:text-[#D1D4DC]" title="Configure Parameters">
            <Settings className="w-3 h-3" />
          </button>
          <button onClick={onRemove} className="hover:text-[#EF5350]" title="Remove Subpane">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      {!pane.hidden ? (
        <canvas ref={canvasRef} className="block w-full cursor-crosshair" style={{ height: `${pane.height}px` }} />
      ) : (
        <div className="h-6 flex items-center px-3 text-[10px] text-[#787B86] font-mono italic">
          {pane.title} (Hidden)
        </div>
      )}
    </div>
  );
}

// ── Rendering Helpers ────────────────────────────────────────────────────────

function drawRSI(
  ctx: CanvasRenderingContext2D,
  result: any,
  candles: CandleData[],
  startIndex: number,
  width: number,
  height: number,
  candleWidth: number
) {
  const series = result?.series || [];
  if (series.length === 0) return;

  // 70 and 30 Lines
  const y70 = height * 0.3;
  const y30 = height * 0.7;

  ctx.fillStyle = "rgba(41, 98, 255, 0.05)";
  ctx.fillRect(0, y70, width, y30 - y70);

  ctx.strokeStyle = "rgba(239, 83, 80, 0.4)";
  ctx.beginPath();
  ctx.moveTo(0, y70);
  ctx.lineTo(width, y70);
  ctx.stroke();

  ctx.strokeStyle = "rgba(38, 166, 154, 0.4)";
  ctx.beginPath();
  ctx.moveTo(0, y30);
  ctx.lineTo(width, y30);
  ctx.stroke();

  // RSI Line
  ctx.strokeStyle = "#9C27B0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  let started = false;
  for (let i = 0; i < candles.length; i++) {
    const dataIdx = startIndex + i;
    const item = series[dataIdx];
    if (item && item.rsi !== null && typeof item.rsi === "number") {
      const x = i * candleWidth + candleWidth / 2;
      const y = height - (item.rsi / 100) * height;
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

function drawMACD(
  ctx: CanvasRenderingContext2D,
  result: any,
  candles: CandleData[],
  startIndex: number,
  width: number,
  height: number,
  candleWidth: number
) {
  const series = result?.series || [];
  if (series.length === 0) return;

  const midY = height / 2;
  ctx.strokeStyle = "rgba(120, 123, 134, 0.3)";
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(width, midY);
  ctx.stroke();

  // Draw Histogram Bars
  for (let i = 0; i < candles.length; i++) {
    const dataIdx = startIndex + i;
    const item = series[dataIdx];
    if (item && item.histogram !== null) {
      const x = i * candleWidth + candleWidth * 0.15;
      const barW = candleWidth * 0.7;
      const barH = (item.histogram / 50) * (height / 2);
      ctx.fillStyle = item.histogram >= 0 ? "rgba(38, 166, 154, 0.6)" : "rgba(239, 83, 80, 0.6)";
      ctx.fillRect(x, midY - barH, barW, barH);
    }
  }

  // Draw MACD Line
  ctx.strokeStyle = "#2962FF";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < candles.length; i++) {
    const dataIdx = startIndex + i;
    const item = series[dataIdx];
    if (item && item.macd !== null) {
      const x = i * candleWidth + candleWidth / 2;
      const y = midY - (item.macd / 50) * (height / 2);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  }
  ctx.stroke();

  // Draw Signal Line
  ctx.strokeStyle = "#FFA726";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  started = false;
  for (let i = 0; i < candles.length; i++) {
    const dataIdx = startIndex + i;
    const item = series[dataIdx];
    if (item && item.signal !== null) {
      const x = i * candleWidth + candleWidth / 2;
      const y = midY - (item.signal / 50) * (height / 2);
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

function drawVolume(
  ctx: CanvasRenderingContext2D,
  result: any,
  candles: CandleData[],
  startIndex: number,
  width: number,
  height: number,
  candleWidth: number
) {
  let maxVol = 1;
  for (let i = 0; i < candles.length; i++) {
    const vol = candles[i].volume || 0;
    if (vol > maxVol) maxVol = vol;
  }

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const x = i * candleWidth + candleWidth * 0.15;
    const barW = candleWidth * 0.7;
    const barH = (c.volume / maxVol) * (height * 0.85);
    const isBull = c.close >= c.open;

    ctx.fillStyle = isBull ? "rgba(38, 166, 154, 0.7)" : "rgba(239, 83, 80, 0.7)";
    ctx.fillRect(x, height - barH, barW, barH);
  }
}

function drawADX(
  ctx: CanvasRenderingContext2D,
  result: any,
  candles: CandleData[],
  startIndex: number,
  width: number,
  height: number,
  candleWidth: number
) {
  const series = result?.series || [];
  if (series.length === 0) return;

  // 25 Level Threshold Line
  const y25 = height - (25 / 100) * height;
  ctx.strokeStyle = "rgba(120, 123, 134, 0.4)";
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(0, y25);
  ctx.lineTo(width, y25);
  ctx.stroke();
  ctx.setLineDash([]);

  // ADX Line
  ctx.strokeStyle = "#AB47BC";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < candles.length; i++) {
    const dataIdx = startIndex + i;
    const item = series[dataIdx];
    if (item && item.adx !== null) {
      const x = i * candleWidth + candleWidth / 2;
      const y = height - (item.adx / 100) * height;
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

function drawCVD(
  ctx: CanvasRenderingContext2D,
  result: any,
  candles: CandleData[],
  startIndex: number,
  width: number,
  height: number,
  candleWidth: number
) {
  const series = result?.series || [];
  if (series.length === 0) return;

  const midY = height / 2;
  ctx.strokeStyle = "#00E676";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < candles.length; i++) {
    const dataIdx = startIndex + i;
    const item = series[dataIdx];
    if (item && item.cvd !== null) {
      const x = i * candleWidth + candleWidth / 2;
      const y = midY - (item.cvd / 5000) * (height / 2);
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
