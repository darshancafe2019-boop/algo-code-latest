"use client";

import React from "react";

export type TerminalButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "success"
  | "ghost"
  | "outline";

export interface TerminalButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TerminalButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: React.ComponentType<{ className?: string }>;
  iconPosition?: "left" | "right";
  isLoading?: boolean;
  pulse?: boolean;
}

export const TerminalButton: React.FC<TerminalButtonProps> = ({
  children,
  variant = "secondary",
  size = "sm",
  icon: Icon,
  iconPosition = "left",
  isLoading = false,
  pulse = false,
  className = "",
  disabled,
  ...props
}) => {
  let styleClasses = "";

  switch (variant) {
    case "primary":
      styleClasses =
        "bg-cyan-500 text-slate-950 font-bold border border-cyan-400 hover:bg-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.25)] active:translate-y-0.5";
      break;
    case "secondary":
      styleClasses =
        "bg-[#0A1426] text-slate-200 border border-[#1F3150] hover:bg-[#0E1E38] hover:border-cyan-500/40 hover:text-white";
      break;
    case "danger":
      styleClasses =
        "bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.15)]";
      break;
    case "success":
      styleClasses =
        "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.15)]";
      break;
    case "outline":
      styleClasses =
        "bg-transparent text-slate-300 border border-[#162238] hover:border-cyan-500/40 hover:text-cyan-300";
      break;
    case "ghost":
      styleClasses =
        "bg-transparent text-slate-400 hover:bg-[#0A1426] hover:text-slate-200 border border-transparent";
      break;
  }

  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-1 text-xs gap-1.5"
      : size === "lg"
      ? "px-4 py-2 text-sm gap-2"
      : "px-3 py-1.5 text-xs gap-2";

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded font-mono font-bold tracking-wide transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${sizeClasses} ${styleClasses} ${
        pulse ? "animate-pulse" : ""
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        Icon && iconPosition === "left" && <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      )}
      <span>{children}</span>
      {!isLoading && Icon && iconPosition === "right" && (
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      )}
    </button>
  );
};
