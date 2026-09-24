"use client";

import React, { useState, useId, memo } from "react";
import { ChartSegment } from "@/types/portfolio-intelligence";

interface DonutChartProps {
  segments: ChartSegment[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerSubtitle?: string;
  centerValueClass?: string;
  centerSubtitleClass?: string;
  showTooltip?: boolean;
  animate?: boolean;
  className?: string;
}

export const DonutChart = memo(function DonutChart({
  segments,
  size = 140,
  thickness = 18,
  centerValue,
  centerSubtitle,
  centerValueClass = "text-[12px] font-bold text-[#F8FAFC]",
  centerSubtitleClass = "text-[10px] text-[#7D8EA5]",
  showTooltip = true,
  className = "",
}: DonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const uniqueId = useId();

  const totalValue = segments.reduce((acc, s) => acc + (s.value || 0), 0);
  const safeTotal = totalValue > 0 ? totalValue : 1;

  const radius = (size - thickness) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute SVG arc segments
  let accumulatedAngle = -90; // Start from top 12 o'clock

  const paths = segments.map((segment, index) => {
    const fraction = (segment.value || 0) / safeTotal;
    const angle = fraction * 360;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + angle;
    accumulatedAngle += angle;

    const isHovered = hoveredIndex === index;
    const currentRadius = isHovered ? radius + 1.5 : radius;
    const currentThickness = isHovered ? thickness + 3 : thickness;

    // Convert polar to cartesian
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const rOuter = currentRadius + currentThickness / 2;
    const rInner = currentRadius - currentThickness / 2;

    const x1 = center + rOuter * Math.cos(startRad);
    const y1 = center + rOuter * Math.sin(startRad);
    const x2 = center + rOuter * Math.cos(endRad);
    const y2 = center + rOuter * Math.sin(endRad);

    const x3 = center + rInner * Math.cos(endRad);
    const y3 = center + rInner * Math.sin(endRad);
    const x4 = center + rInner * Math.cos(startRad);
    const y4 = center + rInner * Math.sin(startRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    // Build annular sector path
    // If only one segment or 360 degrees:
    let d: string;
    if (fraction >= 0.999) {
      d = `
        M ${center - rOuter}, ${center}
        a ${rOuter},${rOuter} 0 1,0 ${rOuter * 2},0
        a ${rOuter},${rOuter} 0 1,0 -${rOuter * 2},0
        M ${center - rInner}, ${center}
        a ${rInner},${rInner} 0 1,1 ${rInner * 2},0
        a ${rInner},${rInner} 0 1,1 -${rInner * 2},0
      `;
    } else {
      d = [
        `M ${x1} ${y1}`,
        `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
        "Z",
      ].join(" ");
    }

    return {
      ...segment,
      pathData: d,
      index,
      isHovered,
    };
  });

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        aria-label="Donut Chart"
      >
        <defs>
          <filter id={`glow-${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#16C6F4" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Empty background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#0D1E30"
          strokeWidth={thickness}
        />

        {/* Dynamic Segments */}
        {paths.map((p) => (
          <path
            key={p.index}
            d={p.pathData}
            fill={p.color}
            stroke="#061A2A"
            strokeWidth={1.5}
            strokeLinejoin="round"
            className="transition-all duration-150 cursor-pointer"
            style={{
              filter: p.isHovered ? `drop-shadow(0 0 6px ${p.color}88)` : "none",
              opacity: hoveredIndex !== null && !p.isHovered ? 0.75 : 1,
            }}
            onMouseEnter={() => setHoveredIndex(p.index)}
          />
        ))}
      </svg>

      {/* Central Rupee / Subtitle Label */}
      {(centerValue || centerSubtitle) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          {centerValue && (
            <span className={`${centerValueClass} leading-tight tracking-tight`}>
              {centerValue}
            </span>
          )}
          {centerSubtitle && (
            <span className={`${centerSubtitleClass} leading-none mt-0.5 font-medium`}>
              {centerSubtitle}
            </span>
          )}
        </div>
      )}

      {/* Floating Hover Tooltip */}
      {showTooltip && hoveredIndex !== null && segments[hoveredIndex] && (
        <div
          className="absolute z-30 pointer-events-none px-2 py-1 rounded bg-[#030D18] border border-[#16C6F4]/40 shadow-xl shadow-black/80 text-[10px] whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${Math.min(Math.max(mousePos.x - 40, 0), size - 80)}px`,
            top: `${Math.max(mousePos.y - 34, -10)}px`,
          }}
        >
          <div className="flex items-center gap-1.5 font-semibold text-slate-100">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: segments[hoveredIndex].color }}
            />
            <span>{segments[hoveredIndex].name}</span>
            <span className="text-[#16C6F4] font-mono">
              {segments[hoveredIndex].percentage}%
            </span>
          </div>
          {segments[hoveredIndex].pnl !== undefined && (
            <div className="text-[9px] font-mono mt-0.5 text-slate-400">
              P&L:{" "}
              <span
                className={
                  segments[hoveredIndex].pnl! >= 0 ? "text-[#00E890]" : "text-[#FF3B5C]"
                }
              >
                {segments[hoveredIndex].pnl! >= 0 ? "+" : ""}
                {segments[hoveredIndex].pnl}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
