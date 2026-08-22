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
    default: "border-[#294238] bg-[#0D1914]",
    profit: "border-[#39B978]/40 bg-[#0B1F17]/80",
    loss: "border-[#E26D6D]/40 bg-[#191010]/80",
    highlight: "border-[#2E7D5B]/60 bg-[#12221B]",
  };

  return (
    <div
      className={`p-4 rounded-2xl border ${variantBorderClasses[variant]} font-sans select-none space-y-2 shadow-lg ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-mono tracking-wider text-[#70877A] block">
          {label}
        </span>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-[#07110D] border border-[#1B3328] text-[#78A88A]">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-xl font-extrabold font-mono text-[#E8F3EC] tracking-tight">
          {value}
        </div>
        {(subValue || changePct !== undefined) && (
          <div className="flex items-center gap-2 text-xs font-mono">
            {changePct !== undefined && (
              <span
                className={`inline-flex items-center gap-0.5 font-bold ${
                  isPositive
                    ? "text-[#39B978]"
                    : isNegative
                    ? "text-[#E26D6D]"
                    : "text-[#70877A]"
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
              <span className="text-[10px] text-[#70877A]">{changeLabel}</span>
            )}
            {subValue && (
              <span className="text-[10px] text-[#A8BDB0]">{subValue}</span>
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
    leaf: "bg-gradient-to-r from-[#123C2A] to-[#55C98A]",
    profit: "bg-gradient-to-r from-[#123C2A] to-[#39B978]",
    loss: "bg-gradient-to-r from-[#3A1818] to-[#E26D6D]",
    warning: "bg-gradient-to-r from-[#33250E] to-[#D9A441]",
    cyan: "bg-gradient-to-r from-[#0F2D35] to-[#62B8C4]",
  };

  return (
    <div
      className={`w-full bg-[#07110D] border border-[#1B3328] rounded-full overflow-hidden ${sizeClasses[size]} ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${variantGradients[variant]}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
