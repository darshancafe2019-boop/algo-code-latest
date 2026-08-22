"use client";

import React from "react";

interface EcoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "leaf" | "moss" | "outline" | "danger" | "warning" | "ghost";
  size?: "xs" | "sm" | "md" | "lg";
  icon?: React.ElementType;
  iconPosition?: "left" | "right";
  glow?: boolean;
  isLoading?: boolean;
}

export function EcoButton({
  children,
  variant = "leaf",
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
    "inline-flex items-center justify-center font-bold font-mono rounded-xl transition-all duration-150 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";

  const sizeClasses = {
    xs: "px-2.5 py-1 text-[11px] gap-1.5",
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-xs gap-2",
    lg: "px-5 py-2.5 text-sm gap-2.5",
  };

  const variantClasses = {
    leaf: "bg-[#2E7D5B] hover:bg-[#39B978] text-[#07110D] shadow-md hover:shadow-lg border border-[#39B978]/60",
    moss: "bg-[#123C2A] hover:bg-[#1B4D36] text-[#E8F3EC] border border-[#294238]",
    outline: "bg-transparent hover:bg-[#12221B] text-[#A8BDB0] hover:text-[#E8F3EC] border border-[#294238]",
    danger: "bg-[#E26D6D]/15 hover:bg-[#E26D6D]/25 text-[#E26D6D] border border-[#E26D6D]/40",
    warning: "bg-[#D9A441]/15 hover:bg-[#D9A441]/25 text-[#D9A441] border border-[#D9A441]/40",
    ghost: "bg-transparent hover:bg-[#12221B]/60 text-[#A8BDB0] hover:text-[#E8F3EC] border border-transparent",
  };

  const glowClass = glow && variant === "leaf" ? "glow-leaf" : "";

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
