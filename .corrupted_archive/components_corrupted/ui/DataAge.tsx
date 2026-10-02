"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface DataAgeProps {
  timestamp?: number | string | Date | null;
  latencyMs?: number | null;
  showIcon?: boolean;
  className?: string;
}

export function DataAge({
  timestamp,
  latencyMs,
  showIcon = true,
  className,
}: DataAgeProps) {
  const [ageText, setAgeText] = useState<string>("—");

  useEffect(() => {
    if (latencyMs !== undefined && latencyMs !== null) {
      setAgeText(`${Math.round(latencyMs)} ms`);
      return;
    }

    if (!timestamp) {
      setAgeText("—");
      return;
    }

    const update = () => {
      const ts = typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime();
      if (isNaN(ts)) {
        setAgeText("—");
        return;
      }
      const diffMs = Math.max(0, Date.now() - ts);
      if (diffMs < 1000) {
        setAgeText(`${diffMs} ms`);
      } else if (diffMs < 60000) {
        setAgeText(`${Math.round(diffMs / 1000)}s ago`);
      } else {
        setAgeText(`${Math.round(diffMs / 60000)}m ago`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timestamp, latencyMs]);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] text-[#7C8CA3] select-none shrink-0",
        className
      )}
    >
      {showIcon && <Clock className="h-2.5 w-2.5 text-[#52627A]" />}
      <span>{ageText}</span>
    </span>
  );
}
