"use client";

import React from "react";

interface EcoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "leaf" | "moss" | "outline" | "danger" | "warning" | "ghost" | "primary" | "cyan";
  size?: "xs" | "sm" | "md" | "lg";
  icon?: React.ElementType;
  iconPosition?: "left" | "right";
  glow?: boolean;
  isLoading?: boolean;
}

export function EcoButton({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  glow = false,
  isLoading = false,
  className = "",
  disabled,
  ...props
}: EcoButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-bold font-mono rounded-lg transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed";

  const sizeClasses = {
    xs: "px-2.5 py-1 text-[11px] gap-1.5",
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-xs gap-2",
    lg: "px-5 py-2.5 text-sm gap-2.5",
  };

  const variantClasses = {
    primary: "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md border border-[#3B82F6]/60",
    leaf: "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md border border-[#3B82F6]/60",
    cyan: "bg-[#22D3EE] hover:bg-[#06B6D4] text-black shadow-md border border-[#22D3EE]",
    moss: "bg-[#101B2D] hover:bg-[#1A2A3F] text-[#F7FAFC] border border-[#1A2A3F]",
    outline: "bg-[#07101A] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#F7FAFC] border border-[#1A2A3F]",
    danger: "bg-[#FF3B5C]/15 hover:bg-[#FF3B5C]/25 text-[#FF3B5C] border border-[#FF3B5C]/40",
    warning: "bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#F59E0B] border border-[#F59E0B]/40",
    ghost: "bg-transparent hover:bg-[#101B2D]/60 text-[#7C8CA3] hover:text-[#F7FAFC] border border-transparent",
  };

  const glowClass = glow ? "shadow-[0_0_15px_rgba(34,211,238,0.25)] border-[#22D3EE]/80" : "";

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${glowClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-3.5 w-3.5 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        <>
          {Icon && iconPosition === "left" && <Icon className="h-3.5 w-3.5 shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === "right" && <Icon className="h-3.5 w-3.5 shrink-0" />}
        </>
      )}
    </button>
  );
}
