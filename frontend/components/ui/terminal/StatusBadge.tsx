"use client";

import React from "react";

export type TerminalBadgeVariant =
  | "live"
  | "paper"
  | "connecting"
  | "reconnecting"
  | "offline"
  | "synced"
  | "error"
  | "warning"
  | "bullish"
  | "bearish"
  | "neutral"
  | "atm"
  | "call"
  | "put"
  | "cyan";

export interface StatusBadgeProps {
  variant?: TerminalBadgeVariant;
  label?: React.ReactNode;
  pulse?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant = "live",
  label,
  pulse = false,
  size = "sm",
  className = "",
}) => {
  let styleClasses = "bg-slate-900/80 text-slate-300 border-slate-750";
  let dotColor = "bg-slate-400";
  let defaultLabel = label;

  switch (variant) {
    case "live":
      styleClasses = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]";
      dotColor = "bg-emerald-400";
      defaultLabel = defaultLabel || "LIVE";
      break;
    case "paper":
      styleClasses = "bg-cyan-500/10 text-cyan-300 border-cyan-500/30 shadow-[0_0_10px_rgba(0,229,255,0.15)]";
      dotColor = "bg-cyan-400";
      defaultLabel = defaultLabel || "PAPER";
      break;
    case "connecting":
    case "reconnecting":
      styleClasses = "bg-amber-500/10 text-amber-300 border-amber-500/30";
      dotColor = "bg-amber-400";
      defaultLabel = defaultLabel || (variant === "connecting" ? "CONNECTING" : "RECONNECTING");
      break;
    case "offline":
    case "error":
      styleClasses = "bg-rose-500/10 text-rose-400 border-rose-500/30";
      dotColor = "bg-rose-400";
      defaultLabel = defaultLabel || "OFFLINE";
      break;
    case "synced":
      styleClasses = "bg-blue-500/10 text-blue-300 border-blue-500/30";
      dotColor = "bg-blue-400";
      defaultLabel = defaultLabel || "SYNCED";
      break;
    case "warning":
      styleClasses = "bg-amber-500/10 text-amber-300 border-amber-500/30";
      dotColor = "bg-amber-400";
      defaultLabel = defaultLabel || "WARNING";
      break;
    case "bullish":
      styleClasses = "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
      dotColor = "bg-emerald-400";
      defaultLabel = defaultLabel || "BULLISH";
      break;
    case "bearish":
      styleClasses = "bg-rose-500/15 text-rose-300 border-rose-500/40";
      dotColor = "bg-rose-400";
      defaultLabel = defaultLabel || "BEARISH";
      break;
    case "neutral":
      styleClasses = "bg-slate-800 text-slate-400 border-slate-700";
      dotColor = "bg-slate-400";
      defaultLabel = defaultLabel || "NEUTRAL";
      break;
    case "atm":
      styleClasses = "bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(0,229,255,0.25)]";
      dotColor = "bg-cyan-400";
      defaultLabel = defaultLabel || "ATM";
      break;
    case "call":
      styleClasses = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      dotColor = "bg-emerald-400";
      defaultLabel = defaultLabel || "CALL";
      break;
    case "put":
      styleClasses = "bg-rose-500/15 text-rose-300 border-rose-500/30";
      dotColor = "bg-rose-400";
      defaultLabel = defaultLabel || "PUT";
      break;
    case "cyan":
      styleClasses = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      dotColor = "bg-cyan-400";
      defaultLabel = defaultLabel || "";
      break;
  }

  const paddingClass = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono font-bold tracking-wider uppercase border ${paddingClass} ${styleClasses} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dotColor} ${
          pulse || variant === "live" || variant === "reconnecting" ? "animate-pulse" : ""
        }`}
      />
      <span>{defaultLabel}</span>
    </span>
  );
};
