"use client";

import React from "react";

interface EcoPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "subtle";
  glow?: boolean;
}

export function EcoPanel({
  children,
  className = "",
  variant = "default",
  glow = false,
  ...props
}: EcoPanelProps) {
  const baseClasses =
    "rounded-xl border transition-all duration-200 overflow-hidden";

  const variantClasses = {
    default: "bg-[#0A1422] border-[#1A2A3F] shadow-lg backdrop-blur-md",
    elevated: "bg-[#101B2D] border-[#2563EB]/40 shadow-xl backdrop-blur-lg",
    subtle: "bg-[#07101A]/80 border-[#122033] shadow-md",
  };

  const glowClass = glow ? "border-[#22D3EE]/70 shadow-[0_0_15px_rgba(34,211,238,0.15)]" : "";

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${glowClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function EcoPanelHeader({
  children,
  className = "",
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`px-4 py-3.5 border-b border-[#122033] flex flex-wrap items-center justify-between gap-3 bg-[#07101A] ${className}`}
    >
      {title ? (
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="p-2 rounded-lg bg-[#22D3EE]/10 border border-[#22D3EE]/30 text-[#22D3EE]">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div>
            <h3 className="text-xs font-bold text-[#F7FAFC] tracking-wide uppercase flex items-center gap-2">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-[#7C8CA3] mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      ) : (
        children
      )}
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function EcoPanelToolbar({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-4 py-2 bg-[#060B14] border-b border-[#122033] flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#7C8CA3] ${className}`}
    >
      {children}
    </div>
  );
}

export function EcoPanelContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-4 text-[#F7FAFC] ${className}`}>{children}</div>;
}

export function EcoPanelFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-4 py-3 border-t border-[#122033] bg-[#06101B] flex flex-wrap items-center justify-between gap-3 text-xs text-[#52627A] font-mono ${className}`}
    >
      {children}
    </div>
  );
}
