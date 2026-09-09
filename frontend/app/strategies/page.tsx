"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { StrategyBuilder } from "@/components/strategy/StrategyBuilder";
import { StrategyVolumeStar } from "@/components/strategy/StrategyVolumeStar";
import { Code2 } from "lucide-react";

export default function StrategiesPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get("tab") === "studio" ? "STUDIO" : "STRATEGY";
  const [activeStrategyView, setActiveStrategyView] = useState<"STRATEGY" | "STUDIO">(initialTab);

  return (
    <DirectPageLayout activeTab="strategies">
      <div className="flex flex-col h-full bg-[#080B11]">
        {/* Top Controls */}
        <div className="px-4 py-2 bg-[#0B101D] border-b border-[#1A2333] flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-0.5 bg-[#121927] border border-[#1E293B] rounded-lg">
            <button
              onClick={() => setActiveStrategyView("STRATEGY")}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                activeStrategyView === "STRATEGY"
                  ? "bg-[#1E293B] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Strategy Engine
            </button>

            <button
              onClick={() => setActiveStrategyView("STUDIO")}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                activeStrategyView === "STUDIO"
                  ? "bg-[#1E293B] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              Studio & IDE
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE STRATEGY EXECUTION</span>
          </div>
        </div>

        {/* Active Strategy View */}
        <div className="flex-1 overflow-hidden">
          {activeStrategyView === "STRATEGY" ? (
            <StrategyVolumeStar />
          ) : (
            <StrategyBuilder />
          )}
        </div>
      </div>
    </DirectPageLayout>
  );
}

