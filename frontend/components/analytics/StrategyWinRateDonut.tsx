"use client";

import React from "react";
import { StrategyWinRate } from "@/types/analytics";
import { Cpu, Award, Zap } from "lucide-react";
import { formatPercent } from "@/lib/formatters";

interface Props {
  data?: StrategyWinRate[];
}

export function StrategyWinRateDonut({ data = [] }: Props) {
  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length === 0) {
    return (
      <div className="p-5 rounded-xl bg-[#121824] border border-[#1E293B] flex flex-col items-center justify-center min-h-[250px] text-xs text-slate-400">
        No strategy win rate data available.
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl bg-[#121824] border border-[#1E293B] shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4 border-b border-[#1E293B] pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Strategy Win Rate Ranking</h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">{safeData.length} Strategies</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-[#0B0F17] text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#1E293B]">
            <tr>
              <th className="py-2 px-3">Strategy</th>
              <th className="py-2 px-3 text-right">Trades</th>
              <th className="py-2 px-3 text-right">Win Rate %</th>
              <th className="py-2 px-3 text-right">Win Rate Visual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A2333]">
            {safeData.map((item) => {
              const isHigh = item.win_rate >= 60;
              return (
                <tr key={item.strategy} className="hover:bg-[#162032] transition-colors">
                  <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{item.strategy}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">
                    {item.total_trades}
                  </td>
                  <td className={`py-2 px-3 text-right font-mono font-bold ${(item.win_rate || 0) >= 60 ? "text-emerald-400" : "text-amber-400"}`}>
                    {formatPercent(item.win_rate, 1)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isHigh ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: `${Math.min(100, Math.max(0, item.win_rate))}%` }}
                        />
                      </div>
                    </div>
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
