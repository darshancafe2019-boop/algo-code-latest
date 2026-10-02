"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  rows?: number;
  className?: string;
}

export function LoadingState({
  message = "Loading data stream...",
  rows = 4,
  className,
}: LoadingStateProps) {
  return (
    <div className={cn("p-4 space-y-3 w-full animate-pulse", className)}>
      <div className="flex items-center gap-2 text-xs font-mono text-[#22C7E8]">
        <div className="h-3.5 w-3.5 rounded-full border-2 border-[#22C7E8] border-t-transparent animate-spin" />
        <span>{message}</span>
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-full bg-[#101827] rounded border border-[#213047]/60"
          />
        ))}
      </div>
    </div>
  );
}
