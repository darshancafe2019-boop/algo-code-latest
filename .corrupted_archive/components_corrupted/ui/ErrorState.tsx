"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Telemetry Unavailable",
  error = "Failed to synchronize with quantitative broker stream.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg border border-[#F2556A]/30 bg-[#F2556A]/10 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
        className
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <AlertCircle className="h-4 w-4 text-[#F2556A] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h5 className="text-xs font-semibold text-[#F2556A] font-sans">{title}</h5>
          <p className="text-[11px] text-slate-300 font-mono break-all">{error}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101827] border border-[#213047] text-xs font-mono text-[#F4F7FA] hover:border-[#22C7E8] transition-colors shrink-0 cursor-pointer"
        >
          <RefreshCw className="h-3 w-3 text-[#22C7E8]" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
