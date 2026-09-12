"use client";

import React, { memo, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TopSearchBarProps {
  onOpenSearch?: () => void;
  className?: string;
}

export const TopSearchBar = memo(function TopSearchBar({
  onOpenSearch,
  className,
}: TopSearchBarProps) {
  const [shortcutLabel, setShortcutLabel] = useState("Ctrl K");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);
      setShortcutLabel(isMac ? "⌘K" : "Ctrl K");
    }
  }, []);

  return (
    <button
      type="button"
      onClick={onOpenSearch}
      aria-label="Search symbols, orders, bots (Ctrl+K)"
      className={cn(
        "h-[38px] w-full max-w-[400px] min-w-[200px] md:w-[320px] lg:w-[400px] px-3 flex items-center justify-between gap-2.5 rounded-lg border transition-all duration-200 cursor-pointer select-none",
        "bg-[#0A1422] hover:bg-[#0F1C2F] border-[#16324A] hover:border-[#168BFF]/50 focus:border-[#22D3EE] text-[#7D8EA5] hover:text-[#F8FAFC] group shadow-inner focus:outline-none",
        className
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
        <Search className="h-4 w-4 text-[#7D8EA5] group-hover:text-[#22D3EE] transition-colors shrink-0" />
        <span
          className="text-[12px] font-medium text-[#7D8EA5] group-hover:text-[#B7C6D8] transition-colors truncate block text-left"
          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          Search symbols, orders, bots...
        </span>
      </div>

      <kbd className="h-5 px-1.5 flex items-center justify-center bg-[#040A12] border border-[#16324A] rounded text-[10px] font-mono text-[#7D8EA5] group-hover:text-[#B7C6D8] group-hover:border-[#168BFF]/40 shrink-0 shadow-xs">
        {shortcutLabel}
      </kbd>
    </button>
  );
});
