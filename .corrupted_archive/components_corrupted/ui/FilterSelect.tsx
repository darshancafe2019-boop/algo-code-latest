"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
  badge?: string;
}

interface FilterSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[] | string[];
  size?: "sm" | "md";
  className?: string;
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  size = "md",
  className,
}: FilterSelectProps) {
  const normOptions: FilterOption[] = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  return (
    <div className={cn("inline-flex items-center gap-1.5 font-mono select-none", className)}>
      {label && (
        <span className="text-[10px] sm:text-[11px] font-medium text-[#7C8CA3] uppercase tracking-wider shrink-0">
          {label}:
        </span>
      )}
      <div className="relative inline-block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "appearance-none bg-[#101827] border border-[#213047] hover:border-[#31445E] focus:border-[#22C7E8] text-[#F4F7FA] rounded font-mono transition-colors focus:outline-none cursor-pointer pr-6 pl-2.5",
            size === "sm" ? "py-0.5 text-[10px]" : "py-1 text-xs"
          )}
        >
          {normOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0E1624] text-[#F4F7FA]">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#52627A] pointer-events-none" />
      </div>
    </div>
  );
}
