"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type TradingModeType = "PAPER" | "SHADOW" | "LIVE" | "BACKTEST" | string;

interface ModeBadgeProps {
  mode: TradingModeType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ModeBadge({ mode, size = "md", className }: ModeBadgeProps) {
  const norm = (mode || "PAPER").toUpperCase().trim();

  let style = "bg-[#22C7E8]/10 text-[#22C7E8] border-[#22C7E8]/40";

  if (norm === "LIVE") {
    style = "bg-[#F2556A]/15 text-[#F2556A] border-[#F2556A]/50 font-bold shadow-[0_0_12px_rgba(242,85,106,0.2)]";
  } else if (norm === "SHADOW") {
    style = "bg-[#9B7BFF]/15 text-[#9B7BFF] border-[#9B7BFF]/40 font-semibold";
  } else if (norm === "BACKTEST") {
    style = "bg-slate-700/30 text-slate-300 border-slate-600/40";
  }

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-[11px] px-2.5 py-0.5",
    lg: "text-xs px-3 py-1",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono rounded border uppercase tracking-wider select-none shrink-0",
        sizeClasses[size],
        style,
        className
      )}
    >
      {norm}
    </span>
  );
}
