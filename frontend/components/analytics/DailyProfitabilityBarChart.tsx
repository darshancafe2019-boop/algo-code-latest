"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  DailyProfitabilityBar,
  ChartMetricType,
  ChartViewMode,
} from "@/types/pnl-analytics";
import { BarHoverTooltip } from "./BarHoverTooltip";
import { formatPrice, formatPercent, formatPnL } from "@/lib/formatters";

interface DailyProfitabilityBarChartProps {
  bars: DailyProfitabilityBar[];
  metric?: ChartMetricType;
  viewMode?: ChartViewMode;
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
  currency?: string;
  tradingMode?: "PAPER" | "LIVE";
  showHwmOverlay?: boolean;
  showEquityOverlay?: boolean;
  startingEquity?: number;
}

export function DailyProfitabilityBarChart({
  bars = [],
  metric = "NET_PNL",
  viewMode = "DAILY_BARS",
  selectedDate = null,
  onSelectDate,
  currency = "$",
  tradingMode = "PAPER",
  showHwmOverlay = true,
  showEquityOverlay = true,
  startingEquity = 50000.0,
}: DailyProfitabilityBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(900);
  const [hoveredBar, setHoveredBar] = useState<DailyProfitabilityBar | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Measure container responsive width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Dimensions
  const svgWidth = Math.max(320, containerWidth);
  const svgHeight = viewMode === "DRAWDOWN" ? 220 : 300;
  const padding = { top: 25, bottom: 40, left: 65, right: viewMode === "EQUITY_AND_DAILY" ? 65 : 20 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Extract Metric Value for a Bar
  const getMetricValue = useCallback(
    (b: DailyProfitabilityBar): number => {
      switch (metric) {
        case "RETURN_PCT":
          return b.returnPct;
        case "GROSS_PNL":
          return b.grossPnl;
        case "REALIZED_PNL":
          return b.realizedPnl;
        case "UNREALIZED_CHANGE":
          return b.unrealizedChange;
        case "FEES":
          return -(b.fees + b.commissions);
        case "DRAWDOWN":
          return -Math.abs(b.drawdown);
        case "TRADES":
          return b.trades;
        case "NET_PNL":
        default:
          return b.netPnl;
      }
    },
    [metric]
  );

  // Calculate Scales
  const { minVal, maxVal, zeroY, valRange } = useMemo(() => {
    if (bars.length === 0) {
      return { minVal: -100, maxVal: 100, zeroY: padding.top + plotHeight / 2, valRange: 200 };
    }
    const vals = bars.map(getMetricValue);
    let min = Math.min(0, ...vals);
    let max = Math.max(0, ...vals);

    // Provide buffer
    if (min === 0 && max === 0) {
      min = -50;
      max = 50;
    } else {
      const buffer = Math.max(10, (max - min) * 0.12);
      min -= buffer;
      max += buffer;
    }

    const range = max - min || 1.0;
    // Y position where value is 0.0
    const zeroRatio = (0 - min) / range;
    const y0 = padding.top + plotHeight - zeroRatio * plotHeight;

    return { minVal: min, maxVal: max, zeroY: y0, valRange: range };
  }, [bars, getMetricValue, padding.top, plotHeight]);

  // Equity Scale for Overlay Modes
  const { minEquity, maxEquity, equityRange } = useMemo(() => {
    if (bars.length === 0) return { minEquity: startingEquity, maxEquity: startingEquity + 100, equityRange: 100 };
    const eqVals = bars.map((b) => b.closingEquity);
    const hwmVals = bars.map((b) => b.highWaterMark);
    let min = Math.min(...eqVals, startingEquity) * 0.998;
    let max = Math.max(...hwmVals, ...eqVals, startingEquity) * 1.002;
    if (min >= max) {
      min = startingEquity * 0.95;
      max = startingEquity * 1.05;
    }
    return { minEquity: min, maxEquity: max, equityRange: max - min || 1.0 };
  }, [bars, startingEquity]);

  // Compute Bar Layout Coordinates
  const barLayouts = useMemo(() => {
    const count = bars.length;
    if (count === 0) return [];

    const totalSlotWidth = plotWidth / count;
    const barWidth = Math.max(4, Math.min(48, totalSlotWidth * 0.75));

    return bars.map((bar, idx) => {
      const val = getMetricValue(bar);
      const centerX = padding.left + idx * totalSlotWidth + totalSlotWidth / 2;
      const x = centerX - barWidth / 2;

      // Coordinate from value
      const valRatio = (val - minVal) / valRange;
      const targetY = padding.top + plotHeight - valRatio * plotHeight;

      const y = Math.min(zeroY, targetY);
      const height = Math.max(2, Math.abs(targetY - zeroY));

      // Right axis equity points for overlay mode
      const eqRatio = (bar.closingEquity - minEquity) / equityRange;
      const equityY = padding.top + plotHeight - eqRatio * plotHeight;

      const hwmRatio = (bar.highWaterMark - minEquity) / equityRange;
      const hwmY = padding.top + plotHeight - hwmRatio * plotHeight;

      const isPositive = val > 0.001;
      const isNegative = val < -0.001;
      const isFlat = !isPositive && !isNegative;

      // Color mapping with intensity
      let fillColor = "#64748B"; // Neutral Slate
      let strokeColor = "#475569";

      if (isPositive) {
        // Emerald spectrum based on intensity
        const int = bar.intensity || 0.7;
        if (int > 0.8) {
          fillColor = "#10B981"; // Strong Emerald
          strokeColor = "#059669";
        } else if (int > 0.5) {
          fillColor = "#34D399"; // Medium Emerald
          strokeColor = "#10B981";
        } else {
          fillColor = "#6EE7B7"; // Soft Emerald
          strokeColor = "#34D399";
        }
      } else if (isNegative) {
        // Red spectrum based on intensity
        const int = bar.intensity || 0.7;
        if (int > 0.8) {
          fillColor = "#EF4444"; // Strong Red
          strokeColor = "#DC2626";
        } else if (int > 0.5) {
          fillColor = "#F87171"; // Medium Red
          strokeColor = "#EF4444";
        } else {
          fillColor = "#FCA5A5"; // Soft Red
          strokeColor = "#F87171";
        }
      }

      const isSelected = selectedDate === bar.date;
      const isIncomplete = bar.status === "INCOMPLETE";
      const isUnreconciled = bar.reconciliationStatus === "UNRECONCILED";

      return {
        bar,
        index: idx,
        x,
        y,
        width: barWidth,
        height,
        centerX,
        targetY,
        equityY,
        hwmY,
        val,
        isPositive,
        isNegative,
        isFlat,
        fillColor,
        strokeColor,
        isSelected,
        isIncomplete,
        isUnreconciled,
      };
    });
  }, [bars, plotWidth, padding.left, padding.top, plotHeight, minVal, valRange, zeroY, minEquity, equityRange, getMetricValue, selectedDate]);

  // Equity & HWM SVG Polyline strings
  const equityLinePath = useMemo(() => {
    if (barLayouts.length === 0) return "";
    return barLayouts.map((b, i) => `${i === 0 ? "M" : "L"} ${b.centerX.toFixed(1)} ${b.equityY.toFixed(1)}`).join(" ");
  }, [barLayouts]);

  const hwmLinePath = useMemo(() => {
    if (barLayouts.length === 0) return "";
    return barLayouts.map((b, i) => `${i === 0 ? "M" : "L"} ${b.centerX.toFixed(1)} ${b.hwmY.toFixed(1)}`).join(" ");
  }, [barLayouts]);

  // Pure Cumulative Equity Area Path for CUMULATIVE_EQUITY mode
  const pureEquityAreaPath = useMemo(() => {
    if (barLayouts.length === 0) return "";
    const firstX = barLayouts[0].centerX.toFixed(1);
    const lastX = barLayouts[barLayouts.length - 1].centerX.toFixed(1);
    const bottomY = (padding.top + plotHeight).toFixed(1);
    return `${equityLinePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [barLayouts, equityLinePath, padding.top, plotHeight]);

  // Y-Axis Tick Marks (5 evenly spaced steps)
  const yTicks = useMemo(() => {
    const ticks = [];
    const step = valRange / 4;
    for (let i = 0; i <= 4; i++) {
      const val = minVal + step * i;
      const y = padding.top + plotHeight - ((val - minVal) / valRange) * plotHeight;
      let label = `${val >= 0 ? "+" : ""}${val.toFixed(0)}`;
      if (metric === "RETURN_PCT") {
        label = `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
      } else if (metric === "TRADES") {
        label = `${Math.round(val)}`;
      } else {
        label = formatPnL(val, currency, 0).formatted;
      }
      ticks.push({ val, y, label });
    }
    return ticks;
  }, [minVal, valRange, padding.top, plotHeight, metric, currency]);

  // Right Y-Axis Equity Ticks for Dual Axis mode
  const rightEquityTicks = useMemo(() => {
    if (viewMode !== "EQUITY_AND_DAILY") return [];
    const ticks = [];
    const step = equityRange / 4;
    for (let i = 0; i <= 4; i++) {
      const eqVal = minEquity + step * i;
      const y = padding.top + plotHeight - ((eqVal - minEquity) / equityRange) * plotHeight;
      ticks.push({ eqVal, y, label: formatPrice(eqVal, currency, 0) });
    }
    return ticks;
  }, [viewMode, minEquity, equityRange, padding.top, plotHeight, currency]);

  // X-Axis Date Tick Labels
  const xTicks = useMemo(() => {
    if (barLayouts.length === 0) return [];
    const count = barLayouts.length;
    const stepIdx = Math.max(1, Math.floor(count / Math.min(8, Math.max(2, Math.floor(svgWidth / 110)))));
    const ticks = [];
    for (let i = 0; i < count; i += stepIdx) {
      const b = barLayouts[i];
      ticks.push({ label: b.bar.displayDate, x: b.centerX });
    }
    // Always include last bar date if far enough
    const lastBar = barLayouts[count - 1];
    if (ticks.length > 0 && Math.abs(ticks[ticks.length - 1].x - lastBar.centerX) > 60) {
      ticks.push({ label: lastBar.bar.displayDate, x: lastBar.centerX });
    }
    return ticks;
  }, [barLayouts, svgWidth]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (bars.length === 0) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const nextIdx = Math.min(bars.length - 1, focusedIndex + 1);
        setFocusedIndex(nextIdx);
        setHoveredBar(bars[nextIdx]);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prevIdx = Math.max(0, focusedIndex - 1);
        setFocusedIndex(prevIdx);
        setHoveredBar(bars[prevIdx]);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < bars.length) {
          onSelectDate?.(bars[focusedIndex].date);
        }
      }
    },
    [bars, focusedIndex, onSelectDate]
  );

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative w-full select-none outline-none font-mono focus:ring-1 focus:ring-cyan-500/40 rounded-xl"
      aria-label="Daily profitability bar chart. Use arrow keys to navigate days, Enter to open day analysis."
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        className="w-full h-auto overflow-visible block"
        onMouseLeave={() => setHoveredBar(null)}
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DC2626" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="pureEquityAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
          </linearGradient>
          {/* Selected Glow Filter */}
          <filter id="glowSelect" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal Background Reference Lines */}
        <g className="grid-lines opacity-30">
          {yTicks.map((t, idx) => (
            <line
              key={idx}
              x1={padding.left}
              y1={t.y}
              x2={svgWidth - padding.right}
              y2={t.y}
              stroke="#334155"
              strokeDasharray="2,3"
              strokeWidth="1"
            />
          ))}
        </g>

        {/* Prominent Zero Baseline */}
        <line
          x1={padding.left}
          y1={zeroY}
          x2={svgWidth - padding.right}
          y2={zeroY}
          stroke="#475569"
          strokeWidth="1.5"
          strokeDasharray="none"
        />

        {/* Mode: Pure Cumulative Equity Chart */}
        {viewMode === "CUMULATIVE_EQUITY" && (
          <g className="cumulative-equity-view">
            <path d={pureEquityAreaPath} fill="url(#pureEquityAreaGrad)" />
            <path d={equityLinePath} fill="none" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" />
            {showHwmOverlay && (
              <path d={hwmLinePath} fill="none" stroke="#EAB308" strokeWidth="1.5" strokeDasharray="3,3" />
            )}
            {/* Interactive Points on Equity Curve */}
            {barLayouts.map((b) => (
              <circle
                key={b.bar.date}
                cx={b.centerX}
                cy={b.equityY}
                r={b.isSelected ? 5 : 3.5}
                fill={b.isSelected ? "#38BDF8" : "#080D18"}
                stroke={b.isSelected ? "#38BDF8" : "#06B6D4"}
                strokeWidth={b.isSelected ? 3 : 2}
                className="cursor-pointer transition-all hover:scale-125"
                onClick={() => onSelectDate?.(b.bar.date)}
                onMouseEnter={(e) => {
                  setHoveredBar(b.bar);
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) setHoverPos({ x: b.centerX, y: b.equityY });
                }}
              />
            ))}
          </g>
        )}

        {/* Mode: Daily / Weekly / Monthly Profitability Bars & Overlays */}
        {viewMode !== "CUMULATIVE_EQUITY" && (
          <g className="bars-layer">
            {barLayouts.map((b) => {
              // Rounded outward end caps: top rounded for positive, bottom rounded for negative
              const radius = Math.min(4, b.width / 2);
              const isTopRounded = b.isPositive;
              const isBottomRounded = b.isNegative;

              // Path with rounded caps
              const rx = b.x;
              const ry = b.y;
              const rw = b.width;
              const rh = Math.max(2, b.height);

              let barPath = "";
              if (isTopRounded) {
                barPath = `M ${rx} ${ry + rh} L ${rx} ${ry + radius} Q ${rx} ${ry} ${rx + radius} ${ry} L ${rx + rw - radius} ${ry} Q ${rx + rw} ${ry} ${rx + rw} ${ry + radius} L ${rx + rw} ${ry + rh} Z`;
              } else if (isBottomRounded) {
                barPath = `M ${rx} ${ry} L ${rx + rw} ${ry} L ${rx + rw} ${ry + rh - radius} Q ${rx + rw} ${ry + rh} ${rx + rw - radius} ${ry + rh} L ${rx + radius} ${ry + rh} Q ${rx} ${ry + rh} ${rx} ${ry + rh - radius} Z`;
              } else {
                barPath = `M ${rx} ${ry} L ${rx + rw} ${ry} L ${rx + rw} ${ry + rh} L ${rx} ${ry + rh} Z`;
              }

              return (
                <g key={b.bar.date} className="bar-item">
                  {/* Active Selection Glow Ring */}
                  {b.isSelected && (
                    <rect
                      x={b.x - 4}
                      y={b.y - 4}
                      width={b.width + 8}
                      height={b.height + 8}
                      rx={6}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="2"
                      filter="url(#glowSelect)"
                      className="animate-pulse"
                    />
                  )}

                  {/* Main Profitability Bar */}
                  <path
                    d={barPath}
                    fill={b.fillColor}
                    fillOpacity={b.isIncomplete ? 0.55 : 0.9}
                    stroke={b.isUnreconciled ? "#F59E0B" : b.isSelected ? "#38BDF8" : b.strokeColor}
                    strokeWidth={b.isSelected || b.isUnreconciled ? 2 : 1}
                    strokeDasharray={b.isIncomplete ? "3,2" : "none"}
                    className="cursor-pointer transition-all duration-150 hover:brightness-125 focus:brightness-125"
                    onClick={() => onSelectDate?.(b.bar.date)}
                    onMouseEnter={(e) => {
                      setHoveredBar(b.bar);
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect) setHoverPos({ x: b.centerX, y: b.y });
                    }}
                  />

                  {/* Unreconciled Amber Warning Dot */}
                  {b.isUnreconciled && (
                    <circle
                      cx={b.centerX}
                      cy={b.isPositive ? b.y - 6 : b.y + b.height + 6}
                      r={3}
                      fill="#F59E0B"
                    />
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* Overlay: Equity + Daily P&L Mode Lines */}
        {viewMode === "EQUITY_AND_DAILY" && (
          <g className="equity-overlay-lines pointer-events-none">
            {/* Stepped High Water Mark Line */}
            {showHwmOverlay && (
              <path d={hwmLinePath} fill="none" stroke="#EAB308" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.8" />
            )}
            {/* Thin Cyan Cumulative Equity Line */}
            {showEquityOverlay && (
              <path d={equityLinePath} fill="none" stroke="#06B6D4" strokeWidth="2.2" strokeLinecap="round" opacity="0.95" />
            )}
          </g>
        )}

        {/* Left Y-Axis Labels (Bar Metric) */}
        <g className="y-axis-labels text-[10px] fill-slate-400 font-mono">
          {yTicks.map((t, idx) => (
            <text key={idx} x={padding.left - 8} y={t.y + 3.5} textAnchor="end">
              {t.label}
            </text>
          ))}
        </g>

        {/* Right Y-Axis Labels (Dual Axis for Equity) */}
        {viewMode === "EQUITY_AND_DAILY" && (
          <g className="right-y-axis-labels text-[10px] fill-cyan-400/90 font-mono">
            {rightEquityTicks.map((t, idx) => (
              <text key={idx} x={svgWidth - padding.right + 8} y={t.y + 3.5} textAnchor="start">
                {t.label}
              </text>
            ))}
          </g>
        )}

        {/* X-Axis Date Labels */}
        <g className="x-axis-labels text-[10px] fill-slate-400 font-mono">
          {xTicks.map((t, idx) => (
            <text key={idx} x={t.x} y={svgHeight - 12} textAnchor="middle">
              {t.label}
            </text>
          ))}
        </g>
      </svg>

      {/* Floating Rich Tooltip */}
      {hoveredBar && (
        <BarHoverTooltip
          bar={hoveredBar}
          metric={metric}
          currency={currency}
          tradingMode={tradingMode}
          x={hoverPos.x}
          y={hoverPos.y}
          containerWidth={svgWidth}
        />
      )}
    </div>
  );
}
