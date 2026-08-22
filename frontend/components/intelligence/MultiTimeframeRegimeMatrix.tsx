"use client";

import React, { useState } from "react";
import {
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Activity,
  BarChart2,
  Sliders,
  X,
  Radio,
  ExternalLink,
} from "lucide-react";
import { TimeframeMatrixResponse, TimeframeMatrixItem } from "@/types/intelligence";

interface MultiTimeframeRegimeMatrixProps {
  matrixData?: TimeframeMatrixResponse | null;
  symbol?: string;
}

export function MultiTimeframeRegimeMatrix({
  matrixData,
  symbol = "BTC/USDT",
}: MultiTimeframeRegimeMatrixProps) {
  const [selectedTf, setSelectedTf] = useState<TimeframeMatrixItem | null>(null);

  const defaultMatrix: TimeframeMatrixItem[] = [
    { timeframe: "1m", direction: "BULLISH", score: 68, rsi: 58.4, ema_trend: "BULLISH", macd_hist: 1.2, close: 65420.0 },
    { timeframe: "5m", direction: "BULLISH", score: 78, rsi: 62.1, ema_trend: "BULLISH", macd_hist: 3.5, close: 65420.0 },
    { timeframe: "15m", direction: "NEUTRAL", score: 54, rsi: 58.5, ema_trend: "BULLISH", macd_hist: 0.8, close: 65420.0 },
    { timeframe: "1h", direction: "BULLISH", score: 88, rsi: 65.2, ema_trend: "BULLISH", macd_hist: 14.2, close: 65420.0 },
    { timeframe: "4h", direction: "BULLISH", score: 82, rsi: 61.8, ema_trend: "BULLISH", macd_hist: 28.6, close: 65420.0 },
    { timeframe: "1d", direction: "NEUTRAL", score: 58, rsi: 52.4, ema_trend: "NEUTRAL", macd_hist: -1.4, close: 65420.0 },
  ];

  const matrix = matrixData?.matrix || defaultMatrix;
  const overallRegime = matrixData?.overall_regime || "BULLISH CONFLUENCE";
  const alignmentText = matrixData?.alignment || "4 / 6 Bullish Aligned";
  const conflict = matrixData?.conflict || "15m consolidation inside higher-timeframe 1h/4h structural bull trend.";

  const getDirectionBadge = (dir: string) => {
    switch (dir) {
      case "BULLISH":
        return {
          bg: "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/30",
          icon: <TrendingUp className="h-3.5 w-3.5" />,
          label: "BULLISH",
        };
      case "BEARISH":
        return {
          bg: "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/30",
          icon: <TrendingDown className="h-3.5 w-3.5" />,
          label: "BEARISH",
        };
      case "NEUTRAL":
      default:
        return {
          bg: "bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] border-[var(--theme-border-subtle)]",
          icon: <Minus className="h-3.5 w-3.5" />,
          label: "NEUTRAL",
        };
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl font-sans select-none space-y-4">
      {/* 1. Header with Overall Alignment State */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border-subtle)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--theme-text-primary)] uppercase tracking-wider">
                Multi-Timeframe Regime Heatmap
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-[var(--theme-elevated)] text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] font-bold">
                {symbol}
              </span>
            </div>
            <p className="text-[11px] text-[var(--theme-text-secondary)] mt-0.5">
              Hierarchical 6-timeframe trend, momentum, and statistical regime cross-validation.
            </p>
          </div>
        </div>

        {/* Alignment Summary Badges */}
        <div className="flex items-center gap-2 font-mono flex-wrap">
          <div className="px-3 py-1 rounded-xl bg-[var(--theme-profit)]/15 border border-[var(--theme-profit)]/30 text-[var(--theme-profit)] text-xs font-bold flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{overallRegime}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-xs font-bold text-[var(--theme-text-primary)]">
            <span className="text-[var(--theme-text-muted)] text-[10px] uppercase mr-1">Status:</span>
            <span>{alignmentText}</span>
          </div>
        </div>
      </div>

      {/* 2. Full-Width 6-Timeframe Responsive Grid (Uses minmax(0, 1fr)) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 font-mono text-xs">
        {matrix.map((tfItem, idx) => {
          const badge = getDirectionBadge(tfItem.direction);
          const isSelected = selectedTf?.timeframe === tfItem.timeframe;

          return (
            <div
              key={idx}
              onClick={() => setSelectedTf(isSelected ? null : tfItem)}
              className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-3 relative group ${
                isSelected
                  ? "bg-[var(--theme-accent)]/10 border-[var(--theme-accent)] ring-1 ring-[var(--theme-accent)]"
                  : "bg-[var(--theme-elevated)] border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)]"
              }`}
            >
              {/* Top: Timeframe & Direction */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[var(--theme-text-primary)] uppercase">
                  {tfItem.timeframe}
                </span>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border flex items-center gap-1 ${badge.bg}`}>
                  {badge.icon}
                  {badge.label}
                </span>
              </div>

              {/* Middle Metrics */}
              <div className="space-y-1.5 text-[11px]">
                {/* Score Progress */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--theme-text-muted)] mb-1">
                    <span>SCORE</span>
                    <span className="font-bold text-[var(--theme-text-primary)] tabular-nums">{tfItem.score}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--theme-surface)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        tfItem.score >= 75
                          ? "bg-[var(--theme-profit)]"
                          : tfItem.score >= 50
                          ? "bg-[var(--theme-warning)]"
                          : "bg-[var(--theme-loss)]"
                      }`}
                      style={{ width: `${tfItem.score}%` }}
                    />
                  </div>
                </div>

                {/* RSI & MACD */}
                <div className="flex items-center justify-between pt-1 border-t border-[var(--theme-border-subtle)]">
                  <span className="text-[var(--theme-text-muted)] text-[10px]">RSI(14):</span>
                  <span className={`font-bold tabular-nums ${
                    (tfItem.rsi ?? 50) > 60
                      ? "text-[var(--theme-profit)]"
                      : (tfItem.rsi ?? 50) < 40
                      ? "text-[var(--theme-loss)]"
                      : "text-[var(--theme-warning)]"
                  }`}>
                    {tfItem.rsi?.toFixed(1)}
                  </span>
                </div>

                {/* EMA Trend */}
                <div className="flex items-center justify-between">
                  <span className="text-[var(--theme-text-muted)] text-[10px]">EMA:</span>
                  <span className="font-bold text-[var(--theme-text-primary)] text-[10px] truncate max-w-[80px]">
                    {tfItem.ema_trend || "9>21"}
                  </span>
                </div>
              </div>

              {/* Bottom: Click to Inspect Detail */}
              <div className="text-[9px] text-[var(--theme-accent)] flex items-center justify-between pt-1 border-t border-[var(--theme-border-subtle)]">
                <span>INSPECT TF</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Conflict / Confluence Note */}
      <div className="p-3 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--theme-accent)]" />
          <span className="text-[10px] font-bold text-[var(--theme-text-secondary)] uppercase">
            REGIME SYNTHESIS:
          </span>
          <span className="text-[11px] text-[var(--theme-text-primary)]">
            {conflict}
          </span>
        </div>
      </div>

      {/* 4. Expandable Timeframe Detail Drawer */}
      {selectedTf && (
        <div className="p-4 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-accent)]/50 space-y-3 font-mono text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-[var(--theme-text-primary)] uppercase">
                {selectedTf.timeframe} Quantitative Deep Dive
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] font-bold">
                {symbol}
              </span>
            </div>
            <button
              onClick={() => setSelectedTf(null)}
              className="p-1 rounded-lg hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div className="p-2.5 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)]">
              <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Close Price</span>
              <span className="font-bold text-[var(--theme-text-primary)] tabular-nums">
                ${selectedTf.close?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)]">
              <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">RSI(14) Momentum</span>
              <span className="font-bold text-[var(--theme-profit)] tabular-nums">
                {selectedTf.rsi?.toFixed(2)} (Bullish Expansion)
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)]">
              <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">MACD Histogram</span>
              <span className="font-bold text-[var(--theme-profit)] tabular-nums">
                +{selectedTf.macd_hist?.toFixed(2)}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)]">
              <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">EMA Trend Alignment</span>
              <span className="font-bold text-[var(--theme-accent)]">
                {selectedTf.ema_trend}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
