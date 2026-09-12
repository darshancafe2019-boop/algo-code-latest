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
  | "CONNECTED"
  | "DISABLED"
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

  let dotColor = "bg-[#52627A]";
  let bgBorderText = "bg-[#0D1727] text-[#7C8CA3] border-[#1A2A3F]";

  if (["LIVE", "READY", "HEALTHY", "ACTIVE", "ONLINE", "CONNECTED", "OPEN"].includes(norm)) {
    dotColor = "bg-[#00E890]";
    bgBorderText = "bg-[#00E890]/10 text-[#00E890] border-[#00E890]/30";
  } else if (["PAPER"].includes(norm)) {
    dotColor = "bg-[#19C5FF]";
    bgBorderText = "bg-[#19C5FF]/10 text-[#19C5FF] border-[#19C5FF]/30";
  } else if (["CONNECTING"].includes(norm)) {
    dotColor = "bg-[#19C5FF]";
    bgBorderText = "bg-[#19C5FF]/10 text-[#19C5FF] border-[#19C5FF]/30";
  } else if (["SHADOW"].includes(norm)) {
    dotColor = "bg-[#A78BFA]";
    bgBorderText = "bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/30";
  } else if (["STALE", "PAUSED", "LIVE LOCKED", "MARKET CLOSED", "RECONCILIATION REQUIRED"].includes(norm)) {
    dotColor = "bg-[#F59E0B]";
    bgBorderText = "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30";
  } else if (["DEGRADED"].includes(norm)) {
    dotColor = "bg-[#F97316]";
    bgBorderText = "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/30";
  } else if (
    [
      "AUTH REQUIRED",
      "AUTH_FAILED",
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
    dotColor = "bg-[#FF3B5C]";
    bgBorderText = "bg-[#FF3B5C]/10 text-[#FF3B5C] border-[#FF3B5C]/30";
  } else if (["DISABLED"].includes(norm)) {
    dotColor = "bg-[#52627A]";
    bgBorderText = "bg-[#0D1727] text-[#52627A] border-[#1A2A3F]";
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
