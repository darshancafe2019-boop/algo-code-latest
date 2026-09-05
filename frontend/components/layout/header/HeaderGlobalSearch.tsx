"use client";

import React, { memo } from "react";
import { Search } from "lucide-react";

interface HeaderGlobalSearchProps {
  onOpenSearch?: () => void;
}

export const HeaderGlobalSearch = memo(function HeaderGlobalSearch({
  onOpenSearch,
}: HeaderGlobalSearchProps) {
  return (
    <button
      type="button"
      onClick={onOpenSearch}
      aria-label="Search markets, orders, positions, bots (⌘K)"
      className="hidden md:flex items-center gap-2.5 px-3 py-1 bg-[var(--theme-elevated)]/50 hover:bg-[var(--theme-elevated)] border border-[var(--theme-border)] hover:border-sky-500/40 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200 transition-all w-full max-w-xs shadow-inner cursor-pointer group focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500"
    >
      <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-sky-400 transition-colors shrink-0" />
      <span className="truncate text-slate-400 group-hover:text-slate-300 transition-colors text-[11px] flex-1 text-left">
        Search markets, orders, positions...
      </span>
      <kbd className="px-1.5 py-0.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded text-[9.5px] text-slate-400 font-semibold shadow-xs shrink-0">
        ⌘K
      </kbd>
    </button>
  );
});
