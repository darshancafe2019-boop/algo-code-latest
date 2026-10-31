"use client";

import React, { useState } from "react";
import { GitBranch, Plus, Trash2, CheckCircle2, Bot, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrategyRule {
  id: string;
  indicator: string;
  condition: string;
  weight: number;
  operator: "AND" | "OR";
}

export function StrategyComposerView() {
  const [strategyName, setStrategyName] = useState("Alpha Confluence Momentum V3");
  const [confluenceThreshold, setConfluenceThreshold] = useState(75);
  const [rules, setRules] = useState<StrategyRule[]>([
    { id: "r-1", indicator: "EMA 9 / 21 Crossover", condition: "Fast > Slow", weight: 35, operator: "AND" },
    { id: "r-2", indicator: "Supertrend (10, 3)", condition: "Direction == BUY", weight: 30, operator: "AND" },
    { id: "r-3", indicator: "RSI (14)", condition: "Value between 45 and 65", weight: 20, operator: "AND" },
    { id: "r-4", indicator: "Volume SMA (20)", condition: "Volume > 1.25x SMA", weight: 15, operator: "AND" },
  ]);

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      {
        id: `r-${Date.now()}`,
        indicator: "MACD Signal Line",
        condition: "Histogram > 0",
        weight: 15,
        operator: "AND",
      },
    ]);
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const totalWeight = rules.reduce((acc, r) => acc + r.weight, 0);

  return (
    <div className="space-y-3">
      {/* Composer Header */}
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-[#00F0FF]" />
          <h2 className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">QUANT STRATEGY COMPOSER</h2>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30">
            Multi-Indicator Confluence Builder
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addRule}
            className="px-2.5 py-1 rounded bg-[#06101B] border border-[#10263A] text-[#00F0FF] hover:bg-[#0E1E34] text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Add Indicator Rule</span>
          </button>
        </div>
      </div>

      {/* Main Settings + Rules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left 2 Cols: Rules Table */}
        <div className="lg:col-span-2 rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#10263A]">
            <span className="text-[11px] font-bold text-[#F8FAFC] uppercase">Composite Confluence Rules</span>
            <span className={cn("text-[10px] font-mono font-bold", totalWeight === 100 ? "text-[#00E89A]" : "text-amber-400")}>
              Total Weight: {totalWeight}% {totalWeight === 100 ? "✓" : "(Target: 100%)"}
            </span>
          </div>

          <div className="space-y-2">
            {rules.map((r, idx) => (
              <div key={r.id} className="p-2.5 rounded bg-[#06101B] border border-[#10263A] flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="px-1.5 py-0.5 rounded bg-[#0A1422] text-[#7D8EA5] font-mono text-[9px] border border-[#10263A]">
                    {idx === 0 ? "IF" : r.operator}
                  </span>
                  <div className="min-w-0">
                    <span className="font-semibold text-[#F8FAFC] block truncate">{r.indicator}</span>
                    <span className="text-[9px] font-mono text-[#00F0FF]">{r.condition}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-[#7D8EA5] uppercase">Weight:</span>
                    <span className="font-mono text-[#00E89A] font-bold text-[10px]">{r.weight}%</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRule(r.id)}
                    className="p-1 text-[#7D8EA5] hover:text-[#FF3B5C] transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Execution Settings & Export */}
        <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-[11px] font-bold text-[#F8FAFC] uppercase block pb-2 mb-2 border-b border-[#10263A]">
              Execution Triggers
            </span>

            <div className="space-y-2.5 text-[11px]">
              <div>
                <label className="block text-[10px] font-mono text-[#7D8EA5] uppercase mb-1">Strategy Name</label>
                <input
                  type="text"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] font-mono bg-[#06101B] border border-[#10263A] rounded text-[#F8FAFC] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-[#7D8EA5] font-mono uppercase">Confluence Threshold:</span>
                  <span className="text-[#00E89A] font-mono font-bold">{confluenceThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={confluenceThreshold}
                  onChange={(e) => setConfluenceThreshold(Number(e.target.value))}
                  className="w-full accent-[#00F0FF] cursor-pointer"
                />
              </div>

              <div className="p-2 rounded bg-[#06101B] border border-[#10263A] text-[10px] space-y-1">
                <div className="flex items-center justify-between text-[#7D8EA5]">
                  <span>Execution Action:</span>
                  <span className="text-[#00E89A] font-mono font-bold">DISPATCH ORDER</span>
                </div>
                <div className="flex items-center justify-between text-[#7D8EA5]">
                  <span>Risk Enforcement:</span>
                  <span className="text-[#22D3EE] font-mono font-bold">Pre-Trade Hard Stop</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#10263A]">
            <button
              type="button"
              className="w-full py-1.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/25 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Deploy Strategy as Bot</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

