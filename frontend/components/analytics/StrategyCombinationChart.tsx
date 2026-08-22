"use client";

import React from "react";
import { StrategyCombo } from "@/types/analytics";
import { Layers, CheckCircle2, XCircle, DollarSign } from "lucide-react";

interface Props {
  data?: StrategyCombo[];
}

export function StrategyCombinationChart({ data = [] }: Props) {
  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length === 0) {
    return (
      <div className="p-5 rounded-xl bg-[#121824] border border-[#1E293B] flex flex-col items-center justify-center min-h-[250px] text-xs text-slate-400">
        No strategy combination metrics available.
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl bg-[#121824] border border-[#1E293B] shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4 border-b border-[#1E293B] pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white">Strategy Combination & Synergy Breakdown</h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">Wins, Losses & Net P&L</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-[#0B0F17] text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#1E293B]">
            <tr>
              <th className="py-2 px-3">Strategy</th>
              <th className="py-2 px-3 text-right">Winning Trades</th>
              <th className="py-2 px-3 text-right">Losing Trades</th>
              <th className="py-2 px-3 text-right">Net Realized P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A2333]">
            {safeData.map((item, idx) => {
              const pnl = Number(item?.pnl) || 0;
              const isPos = pnl >= 0;
              return (
                <tr key={item?.strategy || `strat-row-${idx}`} className="hover:bg-[#162032] transition-colors">
                  <td className="py-2 px-3 font-bold text-white">{item?.strategy || "Unknown"}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                    {item?.wins ?? 0}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-red-400">
                    {item?.losses ?? 0}
                  </td>
                  <td className={`py-2 px-3 text-right font-mono font-bold ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                    {isPos ? "+" : ""}${pnl.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
