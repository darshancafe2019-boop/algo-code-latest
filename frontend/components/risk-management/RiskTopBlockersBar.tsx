"use client";

import React from "react";
import { ShieldAlert, AlertTriangle, ArrowRight, BarChart2 } from "lucide-react";
import { RiskAnalytics } from "@/types/risk";

interface RiskTopBlockersBarProps {
  analytics?: RiskAnalytics;
  onFilterByGate?: (gate: string) => void;
}

export function RiskTopBlockersBar({ analytics, onFilterByGate }: RiskTopBlockersBarProps) {
  const topGates = analytics?.top_blocking_gates || [
    { gate: "Single-Asset Concentration", count: 14 },
    { gate: "Position Size Safety", count: 8 },
    { gate: "Margin Utilization", count: 5 },
    { gate: "Data Freshness", count: 3 },
    { gate: "Daily Loss Limit", count: 2 },
  ];

  if (topGates.length === 0) return null;

  return (
    <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-3.5 shadow-xl select-none font-sans space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-400" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
            Top Blocking Safety Gates
          </span>
          <span className="text-[10px] text-slate-400 font-sans">
            (Frequent pre-trade risk defenses)
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          Click gate to isolate forensic events
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
        {topGates.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onFilterByGate && onFilterByGate(item.gate)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#070D14] border border-[#1E293B] hover:border-rose-800 text-slate-300 hover:text-rose-300 transition-all text-[11px]"
          >
            <span className="text-slate-400 font-bold">{idx + 1}.</span>
            <span className="font-semibold text-slate-200">{item.gate}</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-[10px] font-bold">
              {item.count} blocks
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
