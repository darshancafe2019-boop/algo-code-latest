"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
  shortcutHint?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
  onClear,
  shortcutHint,
}: SearchInputProps) {
  return (
    <div className={cn("relative flex items-center min-w-0", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52627A] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] focus:border-[#22D3EE] text-[#F7FAFC] placeholder-[#52627A] rounded-lg pl-9 pr-8 text-xs font-mono transition-colors focus:outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            onClear?.();
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#52627A] hover:text-[#F7FAFC] p-0.5 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : shortcutHint ? (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#52627A] bg-[#07101A] px-1.5 py-0.5 rounded border border-[#1A2A3F] pointer-events-none">
          {shortcutHint}
        </span>
      ) : null}
    </div>
  );
}
