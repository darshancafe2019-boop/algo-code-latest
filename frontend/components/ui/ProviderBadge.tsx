"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type ProviderName =
  | "BINANCE"
  | "DELTA"
  | "DHAN"
  | "UPSTOX"
  | "CME"
  | "GLOBAL"
  | "PAPER SIM"
  | "NSE"
  | string;

interface ProviderBadgeProps {
  provider: ProviderName;
  size?: "sm" | "md";
  className?: string;
}

export function ProviderBadge({
  provider,
  size = "md",
  className,
}: ProviderBadgeProps) {
  const norm = (provider || "UNKNOWN").toUpperCase().trim();

  let badgeStyle = "bg-[#121C2C] text-slate-300 border-[#213047]";

  if (norm.includes("BINANCE")) {
    badgeStyle = "bg-amber-500/10 text-amber-400 border-amber-500/30";
  } else if (norm.includes("DELTA")) {
    badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  } else if (norm.includes("DHAN")) {
    badgeStyle = "bg-purple-500/10 text-purple-300 border-purple-500/30";
  } else if (norm.includes("UPSTOX")) {
    badgeStyle = "bg-blue-500/10 text-blue-400 border-blue-500/30";
  } else if (norm.includes("PAPER") || norm.includes("SIM")) {
    badgeStyle = "bg-[#22C7E8]/10 text-[#22C7E8] border-[#22C7E8]/30";
  } else if (norm.includes("CME") || norm.includes("GLOBAL")) {
    badgeStyle = "bg-cyan-500/10 text-cyan-300 border-cyan-500/30";
  }

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-[11px] px-2 py-0.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono font-semibold rounded border tracking-wider uppercase select-none shrink-0",
        sizeClasses[size],
        badgeStyle,
        className
      )}
    >
      {norm}
    </span>
  );
}
