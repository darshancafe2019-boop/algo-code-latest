"use client";

import React, { memo } from "react";

interface ProgressBarProps {
  value: number; // 0 - 100
  max?: number;
  height?: number;
  color?: string;
  trackColor?: string;
  className?: string;
}

export const ProgressBar = memo(function ProgressBar({
  value,
  max = 100,
  height = 4,
  color = "bg-[#16C6F4]",
  trackColor = "bg-[#0B2135]",
  className = "",
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={`w-full rounded-full overflow-hidden ${trackColor} ${className}`}
      style={{ height }}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
});
