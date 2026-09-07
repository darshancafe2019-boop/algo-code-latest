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
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#101827] border border-[#213047] hover:border-[#31445E] focus:border-[#22C7E8] text-[#F4F7FA] placeholder-[#64748B] rounded-md pl-8 pr-8 py-1 text-xs font-mono transition-colors focus:outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            onClear?.();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F4F7FA] p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      ) : shortcutHint ? (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#64748B] bg-[#0E1624] px-1 py-0.5 rounded border border-[#213047]/60 pointer-events-none">
          {shortcutHint}
        </span>
      ) : null}
    </div>
  );
}
