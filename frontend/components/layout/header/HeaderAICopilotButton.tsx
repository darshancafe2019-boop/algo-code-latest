"use client";

import React, { memo } from "react";
import { Sparkles } from "lucide-react";
import { useUIStore } from "@/lib/store/useUIStore";

export const HeaderAICopilotButton = memo(function HeaderAICopilotButton() {
  const { setAICopilotOpen } = useUIStore();

  return (
    <button
      type="button"
      onClick={() => setAICopilotOpen(true)}
      aria-label="Open AI Copilot market intelligence (⌘J)"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200 border border-purple-500/30 hover:border-purple-500/50 font-bold font-mono text-xs transition-all cursor-pointer shadow-xs active:scale-95 group focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-400 select-none"
      title="Open AI Market Copilot (⌘J)"
    >
      <Sparkles className="h-3.5 w-3.5 text-purple-400 group-hover:rotate-12 transition-transform" />
      <span className="text-[11px]">AI</span>
      <kbd className="hidden lg:inline px-1 py-0.2 bg-purple-950/60 border border-purple-500/30 rounded text-[9px] text-purple-300">
        ⌘J
      </kbd>
    </button>
  );
});
