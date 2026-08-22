"use client";

import React from "react";
import { OpenClosedDonutData } from "@/types/analytics";
import { Layers, Activity, CheckCircle2 } from "lucide-react";

interface Props {
  data: OpenClosedDonutData;
}

export function OpenClosedDonut({ data }: Props) {
  const total = (data.open || 0) + (data.closed || 0);
  const openPct = total > 0 ? Math.round((data.open / total) * 100) : 0;
  const closedPct = total > 0 ? 100 - openPct : 100;

  return (
    <div className="p-5 rounded-xl bg-[#121824] border border-[#1E293B] shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4 border-b border-[#1E293B] pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white">Open vs Closed Trades</h3>
        </div>
        <span className="text-[11px] font-mono text-purple-400 font-bold">{data.open} Active</span>
      </div>

      <div className="space-y-4 py-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Total Lifecycle Trades</span>
          <span className="text-white font-bold text-sm">{total}</span>
        </div>

        {/* Dual Progress Bar */}
        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
          <div
            className="bg-purple-500 transition-all duration-500"
            style={{ width: `${openPct}%` }}
            title={`Open Positions: ${data.open} (${openPct}%)`}
          />
          <div
            className="bg-cyan-400 transition-all duration-500"
            style={{ width: `${closedPct}%` }}
            title={`Closed Trades: ${data.closed} (${closedPct}%)`}
          />
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-900/40 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-purple-300 uppercase font-bold">Open Positions</div>
              <div className="text-base font-bold font-mono text-purple-200">{data.open}</div>
            </div>
            <span className="text-xs font-mono text-purple-400 font-bold">{openPct}%</span>
          </div>

          <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-900/40 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-cyan-300 uppercase font-bold">Closed Trades</div>
              <div className="text-base font-bold font-mono text-cyan-200">{data.closed}</div>
            </div>
            <span className="text-xs font-mono text-cyan-400 font-bold">{closedPct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
