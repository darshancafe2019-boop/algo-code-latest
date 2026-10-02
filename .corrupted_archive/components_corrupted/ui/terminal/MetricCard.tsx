"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  subvalue?: React.ReactNode;
  change?: number | null;
  changeLabel?: string;
  prefix?: string;
  suffix?: string;
  icon?: React.ComponentType<{ className?: string }>;
  status?: "positive" | "negative" | "warning" | "neutral" | "cyan";
  onClick?: () => void;
  className?: string;
  badge?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subvalue,
  change,
  changeLabel,
  prefix,
  suffix,
  icon: Icon,
  status,
  onClick,
  className = "",
  badge,
}) => {
  const isInteractive = Boolean(onClick);

  let statusColor = "text-slate-100";
  if (status === "positive" || (change !== undefined && change !== null && change > 0)) {
    statusColor = "text-emerald-400";
  } else if (status === "negative" || (change !== undefined && change !== null && change < 0)) {
    statusColor = "text-rose-400";
  } else if (status === "warning") {
    statusColor = "text-amber-400";
  } else if (status === "cyan") {
    statusColor = "text-cyan-400";
  }

  return (
    <div
      onClick={onClick}
      className={`relative rounded-lg border border-[#162238] bg-[#07101F] p-3.5 shadow-md flex flex-col justify-between transition-all duration-150 ${
        isInteractive
          ? "cursor-pointer hover:border-cyan-500/40 hover:bg-[#0A1426] hover:shadow-[0_0_16px_-2px_rgba(0,229,255,0.12)] hover:-translate-y-0.5"
          : ""
      } ${className}`}
    >
      {/* Top row: Label & Icon / Badge */}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-2">
        <span className="font-mono uppercase tracking-wider text-[11px] font-medium text-slate-400 truncate">
          {label}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {badge}
          {Icon && (
            <div className="w-6 h-6 rounded bg-[#0A1426] border border-[#162238] flex items-center justify-center text-slate-400">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>

      {/* Main value */}
      <div className="flex items-baseline gap-1 my-0.5">
        {prefix && <span className="text-sm font-mono text-slate-400">{prefix}</span>}
        <div className={`text-xl sm:text-2xl font-extrabold font-mono tabular-nums tracking-tight ${statusColor} truncate`}>
          {value}
        </div>
        {suffix && <span className="text-xs font-mono text-slate-400">{suffix}</span>}
      </div>

      {/* Bottom row: Subvalue & Change indicator */}
      {(subvalue || change !== undefined || changeLabel) && (
        <div className="mt-2 pt-2 border-t border-[#162238]/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
          {subvalue ? <div className="truncate">{subvalue}</div> : <div />}

          {change !== undefined && change !== null && (
            <div
              className={`flex items-center gap-0.5 font-bold flex-shrink-0 ${
                change > 0
                  ? "text-emerald-400"
                  : change < 0
                  ? "text-rose-400"
                  : "text-slate-400"
              }`}
            >
              {change > 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : change < 0 ? (
                <ArrowDownRight className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              <span>
                {change > 0 ? "+" : ""}
                {change.toFixed(2)}%
              </span>
              {changeLabel && <span className="text-slate-500 ml-1 font-normal">{changeLabel}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
