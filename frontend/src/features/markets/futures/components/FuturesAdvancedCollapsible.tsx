"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Flame, BarChart2, Zap } from "lucide-react";
import { CanonicalFuturesContract, FundingHeatmapItem } from "../types/futures";
import { FundingRateHeatmap } from "./FundingRateHeatmap";
import { BasisArbitrageMatrix } from "./BasisArbitrageMatrix";
import { FuturesHealthView } from "./FuturesHealthView";

interface FuturesAdvancedCollapsibleProps {
  contracts?: CanonicalFuturesContract[];
  heatmapData?: FundingHeatmapItem[];
  isHeatmapLoading?: boolean;
  isOpenDefault?: boolean;
}

export function FuturesAdvancedCollapsible({
  contracts = [],
  heatmapData = [],
  isHeatmapLoading = false,
  isOpenDefault = false,
}: FuturesAdvancedCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  const [activeTab, setActiveTab] = useState<"HEATMAP" | "BASIS" | "HEALTH">("HEATMAP");

  return (
    <div className="w-full bg-[#080E1C] border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs select-none">
      {/* Header Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#0C1428] hover:bg-slate-800/80 transition text-slate-300 font-bold"
      >
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-black">ADVANCED FUTURES ANALYTICS</span>
          <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">
            (Funding Heatmap • Basis Arbitrage Matrix • Multi-Feed Diagnostics)
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>{isOpen ? "Collapse" : "Expand"}</span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expandable Body */}
      {isOpen && (
        <div className="p-4 space-y-4 border-t border-slate-800 bg-[#060A14]">
          {/* Sub tabs */}
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
            {[
              { id: "HEATMAP", label: "Funding Heatmap", icon: Flame },
              { id: "BASIS", label: "Basis & Arbitrage", icon: BarChart2 },
              { id: "HEALTH", label: "Feed Telemetry", icon: Zap },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition text-xs border ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm"
                      : "bg-slate-900 text-slate-400 hover:text-white border-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Views */}
          <div className="pt-2">
            {activeTab === "HEATMAP" && (
              <FundingRateHeatmap data={heatmapData} isLoading={isHeatmapLoading} />
            )}
            {activeTab === "BASIS" && <BasisArbitrageMatrix contracts={contracts} />}
            {activeTab === "HEALTH" && <FuturesHealthView />}
          </div>
        </div>
      )}
    </div>
  );
}
