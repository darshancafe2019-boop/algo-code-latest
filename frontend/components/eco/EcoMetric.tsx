"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EcoMetricProps {
  label: string;
  value: string | number;
  subValue?: string;
  changePct?: number;
  changeLabel?: string;
  icon?: React.ElementType;
  variant?: "default" | "profit" | "loss" | "highlight";
  className?: string;
}

export function EcoMetric({
  label,
  value,
  subValue,
  changePct,
  changeLabel,
  icon: Icon,
  variant = "default",
  className = "",
}: EcoMetricProps) {
  const isPositive = changePct !== undefined && changePct > 0;
  const isNegative = changePct !== undefined && changePct < 0;

  const variantBorderClasses = {
    default: "border-[#1A2A3F] bg-[#0A1422]",
    profit: "border-[#00E890]/30 bg-[#0A1422]",
    loss: "border-[#FF3B5C]/30 bg-[#0A1422]",
    highlight: "border-[#22D3EE]/40 bg-[#0D1727]",
  };

  return (
    <div
      className={`p-3.5 rounded-xl border ${variantBorderClasses[variant]} font-sans select-none space-y-2 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#7C8CA3] block tracking-wide">
          {label}
        </span>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-[#07101A] border border-[#1A2A3F] text-[#22D3EE]">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <div className="space-y-0.5">
        <div className="text-xl font-bold font-mono text-[#F7FAFC] tracking-tight tabular-nums">
          {value}
        </div>
        {(subValue || changePct !== undefined) && (
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {changePct !== undefined && (
              <span
                className={`inline-flex items-center gap-0.5 font-bold tabular-nums ${
                  isPositive
                    ? "text-[#00E890]"
                    : isNegative
                    ? "text-[#FF3B5C]"
                    : "text-[#7C8CA3]"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : isNegative ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                {isPositive ? `+${changePct}%` : `${changePct}%`}
              </span>
            )}
            {changeLabel && (
              <span className="text-[10px] text-[#52627A]">{changeLabel}</span>
            )}
            {subValue && (
              <span className="text-[11px] text-[#7C8CA3]">{subValue}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function EcoProgress({
  value = 50,
  max = 100,
  variant = "leaf",
  size = "md",
  className = "",
}: {
  value?: number;
  max?: number;
  variant?: "leaf" | "profit" | "loss" | "warning" | "cyan";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    sm: "h-1",
    md: "h-1.5",
    lg: "h-2.5",
  };

  const variantGradients = {
    leaf: "bg-gradient-to-r from-[#2563EB] to-[#22D3EE]",
    profit: "bg-gradient-to-r from-[#166534] to-[#00E890]",
    loss: "bg-gradient-to-r from-[#991B1B] to-[#FF3B5C]",
    warning: "bg-gradient-to-r from-[#92400E] to-[#F59E0B]",
    cyan: "bg-gradient-to-r from-[#0E7490] to-[#22D3EE]",
  };

  return (
    <div
      className={`w-full bg-[#07101A] border border-[#1A2A3F] rounded-full overflow-hidden ${sizeClasses[size]} ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${variantGradients[variant]}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
