"use client";

import React, { memo } from "react";
import { BarChartItem } from "@/types/portfolio-intelligence";

interface HorizontalBarChartProps {
  items: BarChartItem[];
  className?: string;
  maxBarHeight?: number;
}

export const HorizontalBarChart = memo(function HorizontalBarChart({
  items,
  className = "",
}: HorizontalBarChartProps) {
  // Find max absolute value to scale bars proportionally
  const maxAbsValue = Math.max(...items.map((i) => Math.abs(i.value)), 1);

  return (
    <div className={`w-full space-y-2 select-none ${className}`}>
      {items.map((item, idx) => {
        const barWidth = Math.max(Math.min((Math.abs(item.value) / maxAbsValue) * 100, 100), 4);
        const isPos = item.isPositive;

        return (
          <div key={idx} className="group flex items-center justify-between gap-2 text-[11px]">
            {/* Label */}
            <div className="w-[84px] shrink-0 text-slate-300 font-medium truncate group-hover:text-white transition-colors">
              {item.label}
            </div>

            {/* Bar Track & Fill */}
            <div className="flex-1 h-3 rounded-sm bg-[#081827] overflow-hidden relative flex items-center">
              <div
                className={`h-full rounded-sm transition-all duration-300 ${
                  isPos
                    ? "bg-gradient-to-r from-[#00E890]/40 to-[#00E890]"
                    : "bg-gradient-to-r from-[#FF3B5C]/40 to-[#FF3B5C]"
                }`}
                style={{ width: `${barWidth}%` }}
              />
            </div>

            {/* Formatted Value */}
            <div
              className={`w-[60px] shrink-0 text-right font-mono font-semibold tabular-nums ${
                isPos ? "text-[#00E890]" : "text-[#FF3B5C]"
              }`}
            >
              {item.formattedValue}
            </div>
          </div>
        );
      })}
    </div>
  );
});
