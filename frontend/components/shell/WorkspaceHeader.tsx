"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { DataAge } from "@/components/ui/DataAge";

interface WorkspaceHeaderProps {
  title: string;
  subtitle?: string;
  category?: string;
  source?: string;
  account?: string;
  mode?: string;
  lastUpdated?: number | string | Date;
  latencyMs?: number;
  actions?: React.ReactNode;
  className?: string;
}

export function WorkspaceHeader({
  title,
  subtitle,
  category,
  source = "ALL PROVIDERS",
  account = "ba_primary",
  mode = "PAPER",
  lastUpdated,
  latencyMs,
  actions,
  className,
}: WorkspaceHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-3 border-b border-[#213047] select-none",
        className
      )}
    >
      {/* Title & Metadata Subtitle */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          {category && (
            <span className="text-[10px] font-mono font-bold text-[#22C7E8] uppercase tracking-wider bg-[#22C7E8]/10 px-1.5 py-0.5 rounded border border-[#22C7E8]/30">
              {category}
            </span>
          )}
          <h1 className="text-base sm:text-lg md:text-xl font-bold font-mono tracking-tight text-[#F4F7FA] uppercase">
            {title}
          </h1>
          {source && (
            <ProviderBadge provider={source} size="sm" />
          )}
          {mode && (
            <ModeBadge mode={mode} size="sm" />
          )}
        </div>

        {/* Subtitle & Telemetry Bar */}
        <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-[#7C8CA3] flex-wrap">
          {subtitle && <span className="text-[#7C8CA3]">{subtitle}</span>}
          {account && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[#52627A]">
              <span>ACCOUNT:</span>
              <span className="text-slate-300 font-semibold">{account}</span>
            </span>
          )}
          {(lastUpdated || latencyMs !== undefined) && (
            <span className="inline-flex items-center gap-1 text-[#52627A]">
              <span>LATENCY:</span>
              <DataAge timestamp={lastUpdated} latencyMs={latencyMs} />
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
