"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, BarChart2, Flame, Sliders, Activity, Cpu } from "lucide-react";
import { OptionStrikeRow } from "@/types/option-chain";

// Sub components
import { OpenInterestHeatmapView } from "./OpenInterestHeatmapView";
import { ImpliedVolatilitySkewView } from "./ImpliedVolatilitySkewView";
import { MultiLegStrategyBuilder } from "./MultiLegStrategyBuilder";
import { OptionsScannerView } from "./OptionsScannerView";

interface OptionsAdvancedCollapsibleProps {
  strikes: OptionStrikeRow[];
  spotPrice: number;
  atmStrike: number;
  selectedExpiry: string;
  currency?: string;
  environment: "PAPER" | "LIVE";
  onSelectOption: (strike: number, type: "CE" | "PE", quote: any) => void;
  isOpenDefault?: boolean;
}

export function OptionsAdvancedCollapsible({
  strikes,
  spotPrice,
  atmStrike,
  selectedExpiry,
  currency = "₹",
  environment,
  onSelectOption,
  isOpenDefault = false,
}: OptionsAdvancedCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  const [activeTab, setActiveTab] = useState<"HEATMAP" | "SKEW" | "STRATEGY" | "SCANNER">("HEATMAP");

  return (
    <div className="bg-[#080E1C] border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs">
      {/* Expand / Collapse Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#0C1428] hover:bg-slate-800/80 transition text-slate-300 font-bold"
      >
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-black">ADVANCED ANALYTICS & STRATEGIES</span>
          <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">
            (OI Heatmap • IV Skew • 18+ Strategy Presets • Scanner)
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>{isOpen ? "Collapse" : "Expand"}</span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expandable Content Body */}
      {isOpen && (
        <div className="p-4 space-y-4 border-t border-slate-800 bg-[#060A14]">
          {/* Sub-tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: "HEATMAP", label: "OI Heatmap", icon: Flame },
              { id: "SKEW", label: "IV Smile & Skew", icon: BarChart2 },
              { id: "STRATEGY", label: "Strategy Builder", icon: Sliders },
              { id: "SCANNER", label: "Options Scanner", icon: Activity },
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
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20"
                      : "bg-slate-900/80 text-slate-400 hover:text-white border-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Sub-tab View */}
          <div className="pt-2">
            {activeTab === "HEATMAP" && (
              <OpenInterestHeatmapView strikes={strikes} spotPrice={spotPrice} currency={currency} />
            )}

            {activeTab === "SKEW" && (
              <ImpliedVolatilitySkewView strikes={strikes} spotPrice={spotPrice} currency={currency} />
            )}

            {activeTab === "STRATEGY" && (
              <MultiLegStrategyBuilder
                spotPrice={spotPrice}
                atmStrike={atmStrike}
                selectedExpiry={selectedExpiry}
                currency={currency}
                onExecuteStrategy={(payoff) => {
                  // Strategy execution callback
                }}
              />
            )}

            {activeTab === "SCANNER" && (
              <OptionsScannerView
                strikes={strikes}
                spotPrice={spotPrice}
                currency={currency}
                onSelectOption={onSelectOption}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
