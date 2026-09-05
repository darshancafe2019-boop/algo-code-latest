"use client";

import React, { memo } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export const HeaderBrand = memo(function HeaderBrand() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 pr-3 border-r border-[var(--theme-border-subtle)] group focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded-lg select-none"
      aria-label="Alpha Algo Quant Terminal Dashboard"
    >
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500/20 via-blue-600/10 to-transparent border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:border-sky-400/60 transition-colors shadow-xs">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[11px] font-black tracking-wider text-slate-100 uppercase font-mono group-hover:text-white transition-colors">
          ALPHA<span className="text-sky-400">.ALGO</span>
        </span>
        <span className="text-[7.5px] tracking-widest text-slate-400 uppercase font-mono font-medium">
          QUANT TERMINAL
        </span>
      </div>
    </Link>
  );
});
