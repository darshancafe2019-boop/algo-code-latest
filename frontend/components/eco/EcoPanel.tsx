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
    "rounded-2xl border transition-all duration-200 overflow-hidden";

  const variantClasses = {
    default: "bg-[#0D1914]/90 border-[#294238] shadow-xl backdrop-blur-md",
    elevated: "bg-[#12221B]/95 border-[#2E7D5B]/40 shadow-2xl backdrop-blur-lg",
    subtle: "bg-[#0B1F17]/60 border-[#1B3328] shadow-md",
  };

  const glowClass = glow ? "glow-leaf border-[#2E7D5B]/70" : "";

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
      className={`px-5 py-4 border-b border-[#1B3328] flex flex-wrap items-center justify-between gap-3 bg-[#0B1F17]/40 ${className}`}
    >
      {title ? (
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 rounded-xl bg-[#123C2A]/60 border border-[#2E7D5B]/40 text-[#55C98A]">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold text-[#E8F3EC] tracking-wide flex items-center gap-2">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[#A8BDB0]/80 mt-0.5">{subtitle}</p>
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
      className={`px-5 py-2.5 bg-[#07110D]/60 border-b border-[#1B3328] flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#A8BDB0] ${className}`}
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
  return <div className={`p-5 text-[#E8F3EC] ${className}`}>{children}</div>;
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
      className={`px-5 py-3 border-t border-[#1B3328] bg-[#07110D]/40 flex flex-wrap items-center justify-between gap-3 text-xs text-[#70877A] font-mono ${className}`}
    >
      {children}
    </div>
  );
}
