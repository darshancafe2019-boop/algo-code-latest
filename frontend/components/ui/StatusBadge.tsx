"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type InstitutionalStatus =
  | "LIVE"
  | "PAPER"
  | "SHADOW"
  | "CONNECTING"
  | "READY"
  | "DEGRADED"
  | "STALE"
  | "MARKET CLOSED"
  | "AUTH REQUIRED"
  | "TOKEN EXPIRED"
  | "DATA PLAN INACTIVE"
  | "RISK BLOCKED"
  | "RECONCILIATION REQUIRED"
  | "BACKEND UNAVAILABLE"
  | "DISCONNECTED"
  | "ACTIVE"
  | "PAUSED"
  | "STOPPED"
  | "ERROR"
  | "HEALTHY"
  | "ONLINE"
  | "OFFLINE"
  | string;

interface StatusBadgeProps {
  status: InstitutionalStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({
  status,
  size = "md",
  className,
  showDot = true,
}: StatusBadgeProps) {
  const norm = (status || "").toUpperCase().trim();

  let dotColor = "bg-slate-400";
  let bgBorderText = "bg-[#101827] text-slate-300 border-[#213047]";

  if (["LIVE", "READY", "HEALTHY", "ACTIVE", "ONLINE"].includes(norm)) {
    dotColor = "bg-[#22C983]";
    bgBorderText = "bg-[#22C983]/10 text-[#22C983] border-[#22C983]/30";
  } else if (["PAPER"].includes(norm)) {
    dotColor = "bg-[#22C7E8]";
    bgBorderText = "bg-[#22C7E8]/10 text-[#22C7E8] border-[#22C7E8]/30";
  } else if (["SHADOW"].includes(norm)) {
    dotColor = "bg-[#9B7BFF]";
    bgBorderText = "bg-[#9B7BFF]/10 text-[#9B7BFF] border-[#9B7BFF]/30";
  } else if (["CONNECTING", "PAUSED", "STALE", "MARKET CLOSED", "RECONCILIATION REQUIRED"].includes(norm)) {
    dotColor = "bg-[#F2B84B]";
    bgBorderText = "bg-[#F2B84B]/10 text-[#F2B84B] border-[#F2B84B]/30";
  } else if (
    [
      "DEGRADED",
      "AUTH REQUIRED",
      "TOKEN EXPIRED",
      "DATA PLAN INACTIVE",
      "RISK BLOCKED",
      "BACKEND UNAVAILABLE",
      "DISCONNECTED",
      "STOPPED",
      "ERROR",
      "OFFLINE",
    ].includes(norm)
  ) {
    dotColor = "bg-[#F2556A]";
    bgBorderText = "bg-[#F2556A]/10 text-[#F2556A] border-[#F2556A]/30";
  }

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-[11px] px-2 py-0.5 gap-1.5",
    lg: "text-xs px-2.5 py-1 gap-2",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono font-medium rounded-md border tracking-tight select-none shrink-0",
        sizeClasses[size],
        bgBorderText,
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            "rounded-full shrink-0",
            size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
            dotColor,
            norm === "CONNECTING" && "animate-pulse"
          )}
        />
      )}
      <span>{norm || "UNKNOWN"}</span>
    </span>
  );
}
