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
  | "sage";

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
    "inline-flex items-center font-mono font-bold rounded-lg border transition-colors select-none";

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[10px] gap-1",
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  const variantClasses = {
    profit: "bg-[#39B978]/15 text-[#39B978] border-[#39B978]/40",
    loss: "bg-[#E26D6D]/15 text-[#E26D6D] border-[#E26D6D]/40",
    warning: "bg-[#D9A441]/15 text-[#D9A441] border-[#D9A441]/40",
    info: "bg-[#62B8C4]/15 text-[#62B8C4] border-[#62B8C4]/40",
    live: "bg-[#55C98A]/15 text-[#55C98A] border-[#55C98A]/40",
    paper: "bg-[#6699A6]/15 text-[#6699A6] border-[#6699A6]/40",
    halted: "bg-[#C95454]/15 text-[#C95454] border-[#C95454]/40",
    neutral: "bg-[#12221B] text-[#A8BDB0] border-[#294238]",
    leaf: "bg-[#2E7D5B]/20 text-[#55C98A] border-[#2E7D5B]/50",
    sage: "bg-[#1B3328] text-[#78A88A] border-[#2E7D5B]/30",
  };

  const dotColorClasses = {
    profit: "bg-[#39B978]",
    loss: "bg-[#E26D6D]",
    warning: "bg-[#D9A441]",
    info: "bg-[#62B8C4]",
    live: "bg-[#55C98A]",
    paper: "bg-[#6699A6]",
    halted: "bg-[#C95454]",
    neutral: "bg-[#8CA49A]",
    leaf: "bg-[#55C98A]",
    sage: "bg-[#78A88A]",
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
    LIVE: { color: "bg-[#55C98A]", text: "text-[#55C98A]", label: "LIVE", pulse: true },
    DELAYED: { color: "bg-[#D9A441]", text: "text-[#D9A441]", label: "DELAYED", pulse: false },
    STALE: { color: "bg-[#E26D6D]", text: "text-[#E26D6D]", label: "STALE", pulse: true },
    DISCONNECTED: { color: "bg-[#8CA49A]", text: "text-[#8CA49A]", label: "DISCONNECTED", pulse: false },
    HALTED: { color: "bg-[#C95454]", text: "text-[#C95454]", label: "HALTED", pulse: true },
    SAFE: { color: "bg-[#55C98A]", text: "text-[#55C98A]", label: "SAFE", pulse: false },
    WARNING: { color: "bg-[#D9A441]", text: "text-[#D9A441]", label: "WARNING", pulse: false },
    DANGER: { color: "bg-[#E26D6D]", text: "text-[#E26D6D]", label: "DANGER", pulse: true },
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
