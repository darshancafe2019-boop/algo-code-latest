"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type MetricVariant =
  | "default"
  | "positive"
  | "negative"
  | "warning"
  | "info"
  | "strategy"
  | "health";

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  change?: string | number;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ComponentType<{ className?: string }>;
  variant?: MetricVariant;
  statusBadge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  tooltip?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeType,
  icon: Icon,
  variant = "default",
  statusBadge,
  onClick,
  className,
  tooltip,
}: MetricCardProps) {
  const isClickable = Boolean(onClick);

  const borderVariantMap: Record<MetricVariant, string> = {
    default: "border-[#213047] hover:border-[#31445E]",
    positive: "border-[#22C983]/30 hover:border-[#22C983]/60",
    negative: "border-[#F2556A]/30 hover:border-[#F2556A]/60",
    warning: "border-[#F2B84B]/30 hover:border-[#F2B84B]/60",
    info: "border-[#4EA1FF]/30 hover:border-[#4EA1FF]/60",
    strategy: "border-[#9B7BFF]/30 hover:border-[#9B7BFF]/60",
    health: "border-[#22C983]/30 hover:border-[#22C983]/60",
  };

  const textVariantMap: Record<MetricVariant, string> = {
    default: "text-[#F4F7FA]",
    positive: "text-[#22C983]",
    negative: "text-[#F2556A]",
    warning: "text-[#F2B84B]",
    info: "text-[#4EA1FF]",
    strategy: "text-[#9B7BFF]",
    health: "text-[#22C983]",
  };

  return (
    <div
      onClick={onClick}
      title={tooltip}
      className={cn(
        "bg-[#101827] rounded-lg p-3 sm:p-3.5 border transition-all duration-150 relative overflow-hidden flex flex-col justify-between select-none min-w-0",
        borderVariantMap[variant],
        isClickable && "cursor-pointer hover:bg-[#142138] hover:shadow-md",
        className
      )}
    >
      {/* Top row: Title + Icon/Status */}
      <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
        <span className="text-[11px] sm:text-xs font-medium text-[#7C8CA3] uppercase tracking-wider truncate">
          {title}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {statusBadge}
          {Icon && (
            <Icon className="h-3.5 w-3.5 text-[#52627A]" />
          )}
        </div>
      </div>

      {/* Center: Value */}
      <div className="flex items-baseline gap-2 min-w-0">
        <div
          className={cn(
            "text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums truncate",
            textVariantMap[variant]
          )}
        >
          {value !== undefined && value !== null && value !== "" ? value : "—"}
        </div>
      </div>

      {/* Bottom row: Subtitle or Change */}
      {(subtitle || change !== undefined) && (
        <div className="mt-1.5 flex items-center justify-between text-[11px] min-w-0 pt-1 border-t border-[#213047]/50 font-mono">
          {subtitle && (
            <span className="text-[#52627A] truncate">{subtitle}</span>
          )}
          {change !== undefined && (
            <span
              className={cn(
                "tabular-nums font-semibold shrink-0 ml-auto",
                changeType === "positive" || (typeof change === "number" && change > 0)
                  ? "text-[#22C983]"
                  : changeType === "negative" || (typeof change === "number" && change < 0)
                  ? "text-[#F2556A]"
                  : "text-[#7C8CA3]"
              )}
            >
              {typeof change === "number" && change > 0 ? `+${change}` : change}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
