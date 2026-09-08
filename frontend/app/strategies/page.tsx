"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { StrategyBuilder } from "@/components/strategy/StrategyBuilder";
import { StrategyVolumeStar } from "@/components/strategy/StrategyVolumeStar";
import { Layers, Code2, Sparkles } from "lucide-react";

export default function StrategiesPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get("tab") === "studio" ? "STUDIO" : "VOLUME_STAR";
  const [activeStrategyView, setActiveStrategyView] = useState<"VOLUME_STAR" | "STUDIO">(initialTab);

  return (
    <DirectPageLayout activeTab="strategies">
      <div className="flex flex-col h-full bg-[#080B11]">
        {/* Top Strategy Department Mode Switcher */}
        <div className="px-5 py-2.5 bg-[#0B101D] border-b border-[#1A2333] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStrategyView("VOLUME_STAR")}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-black tracking-wider transition-all flex items-center gap-2 ${
                activeStrategyView === "VOLUME_STAR"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/50"
                  : "bg-[#121927] text-slate-400 hover:text-white border border-[#1E293B]"
              }`}
            >
              <Layers className="h-4 w-4" />
              VOLUME STAR COCKPIT
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                5M NATIVE
              </span>
            </button>

            <button
              onClick={() => setActiveStrategyView("STUDIO")}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-black tracking-wider transition-all flex items-center gap-2 ${
                activeStrategyView === "STUDIO"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-950/50"
                  : "bg-[#121927] text-slate-400 hover:text-white border border-[#1E293B]"
              }`}
            >
              <Code2 className="h-4 w-4" />
              VISUAL STRATEGY STUDIO & IDE
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>DEPARTMENT: STRATEGIES & MARKET FLOW</span>
          </div>
        </div>

        {/* Active Strategy View */}
        <div className="flex-1 overflow-hidden">
          {activeStrategyView === "VOLUME_STAR" ? (
            <StrategyVolumeStar />
          ) : (
            <StrategyBuilder />
          )}
        </div>
      </div>
    </DirectPageLayout>
  );
}

