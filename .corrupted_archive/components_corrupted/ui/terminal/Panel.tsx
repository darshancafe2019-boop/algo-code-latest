"use client";

import React from "react";

export interface PanelProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  elevated?: boolean;
  interactive?: boolean;
  notch?: boolean;
  compact?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  icon: Icon,
  status,
  actions,
  children,
  className = "",
  headerClassName = "",
  bodyClassName = "",
  elevated = false,
  interactive = false,
  notch = true,
  compact = false,
}) => {
  const baseBg = elevated ? "bg-[#0A1426] border-[#1F3150]" : "bg-[#07101F] border-[#162238]";
  const hoverClass = interactive ? "transition-all duration-150 hover:border-cyan-500/40 hover:shadow-[0_0_20px_-3px_rgba(0,229,255,0.12)]" : "";

  return (
    <div
      className={`relative rounded-lg border ${baseBg} ${hoverClass} shadow-lg overflow-hidden flex flex-col ${className}`}
    >
      {/* Top Accent Tech Notch */}
      {notch && (
        <div className="absolute top-0 left-4 h-[2px] w-12 bg-gradient-to-r from-cyan-400 via-cyan-500/80 to-transparent z-10" />
      )}

      {/* Header */}
      {(title || Icon || status || actions) && (
        <div
          className={`flex items-center justify-between border-b border-[#162238]/80 ${
            compact ? "px-3 py-2" : "px-4 py-2.5"
          } bg-[#050B18]/60 backdrop-blur-md ${headerClassName}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <div className="text-xs font-mono font-bold tracking-wide uppercase text-slate-100 flex items-center gap-2 truncate">
                  {title}
                </div>
              )}
              {subtitle && (
                <div className="text-[10px] text-slate-400 truncate">{subtitle}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {status && <div>{status}</div>}
            {actions && <div className="flex items-center gap-1.5">{actions}</div>}
          </div>
        </div>
      )}

      {/* Body */}
      <div className={`flex-1 ${compact ? "p-3" : "p-4"} ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};
