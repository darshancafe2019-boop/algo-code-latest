"use client";

import React from "react";

export type EcoBadgeVariant =
  | "profit"
  | "loss"
  | "warning"
  | "info"
  | "live"
  | "paper"
  | "halted"
  | "neutral"
  | "leaf"
  | "sage"
  | "cyan";

interface EcoBadgeProps {
  children: React.ReactNode;
  variant?: EcoBadgeVariant;
  size?: "xs" | "sm" | "md";
  dot?: boolean;
  pulse?: boolean;
  className?: string;
  icon?: React.ElementType;
}

export function EcoBadge({
  children,
  variant = "neutral",
  size = "sm",
  dot = false,
  pulse = false,
  className = "",
  icon: Icon,
}: EcoBadgeProps) {
  const baseClasses =
    "inline-flex items-center font-mono font-bold rounded-md border transition-colors select-none";

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[10px] gap-1",
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  const variantClasses = {
    profit: "bg-[#00E890]/15 text-[#00E890] border-[#00E890]/30",
    loss: "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30",
    warning: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
    info: "bg-[#19C5FF]/15 text-[#19C5FF] border-[#19C5FF]/30",
    live: "bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/30",
    paper: "bg-[#19C5FF]/15 text-[#19C5FF] border-[#19C5FF]/30",
    halted: "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30",
    neutral: "bg-[#101B2D] text-[#7C8CA3] border-[#1A2A3F]",
    leaf: "bg-[#2563EB]/15 text-[#19C5FF] border-[#2563EB]/30",
    sage: "bg-[#101B2D] text-[#7C8CA3] border-[#1A2A3F]",
    cyan: "bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/30",
  };

  const dotColorClasses = {
    profit: "bg-[#00E890]",
    loss: "bg-[#FF3B5C]",
    warning: "bg-[#F59E0B]",
    info: "bg-[#19C5FF]",
    live: "bg-[#F43F5E]",
    paper: "bg-[#19C5FF]",
    halted: "bg-[#FF3B5C]",
    neutral: "bg-[#52627A]",
    leaf: "bg-[#19C5FF]",
    sage: "bg-[#52627A]",
    cyan: "bg-[#22D3EE]",
  };

  return (
    <span
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColorClasses[variant]} ${
            pulse ? "animate-pulse" : ""
          }`}
        />
      )}
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}

export function EcoStatusDot({
  status = "LIVE",
  showLabel = true,
  className = "",
}: {
  status: "LIVE" | "DELAYED" | "STALE" | "DISCONNECTED" | "HALTED" | "SAFE" | "WARNING" | "DANGER";
  showLabel?: boolean;
  className?: string;
}) {
  const statusConfig = {
    LIVE: { color: "bg-[#00E890]", text: "text-[#00E890]", label: "LIVE", pulse: true },
    DELAYED: { color: "bg-[#F59E0B]", text: "text-[#F59E0B]", label: "DELAYED", pulse: false },
    STALE: { color: "bg-[#FF3B5C]", text: "text-[#FF3B5C]", label: "STALE", pulse: true },
    DISCONNECTED: { color: "bg-[#52627A]", text: "text-[#52627A]", label: "DISCONNECTED", pulse: false },
    HALTED: { color: "bg-[#FF3B5C]", text: "text-[#FF3B5C]", label: "HALTED", pulse: true },
    SAFE: { color: "bg-[#00E890]", text: "text-[#00E890]", label: "SAFE", pulse: false },
    WARNING: { color: "bg-[#F59E0B]", text: "text-[#F59E0B]", label: "WARNING", pulse: false },
    DANGER: { color: "bg-[#FF3B5C]", text: "text-[#FF3B5C]", label: "DANGER", pulse: true },
  };

  const current = statusConfig[status] || statusConfig.LIVE;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs ${className}`}
      aria-label={`Status: ${current.label}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${current.color} ${
          current.pulse ? "animate-pulse" : ""
        }`}
      />
      {showLabel && <span className={`font-bold ${current.text}`}>{current.label}</span>}
    </span>
  );
}
