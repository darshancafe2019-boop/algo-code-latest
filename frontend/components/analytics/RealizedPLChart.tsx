"use client";

import React from "react";
import { RealizedPnLSymbol } from "@/types/analytics";
import { DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";

interface Props {
  data?: RealizedPnLSymbol[];
}

export function RealizedPLChart({ data = [] }: Props) {
  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length === 0) {
    return (
      <div className="p-5 rounded-xl bg-[#121824] border border-[#1E293B] flex flex-col items-center justify-center min-h-[250px] text-xs text-slate-400">
        No symbol P&L records found in current history.
      </div>
    );
  }

  const totalPnL = safeData.reduce((acc, curr) => acc + (Number(curr?.pnl) || 0), 0);

  return (
    <div className="p-5 rounded-xl bg-[#121824] border border-[#1E293B] shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4 border-b border-[#1E293B] pb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Realized P&L by Symbol</h3>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Total Net:</span>
          <span className={`font-bold ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-[#0B0F17] text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#1E293B]">
            <tr>
              <th className="py-2 px-3">Symbol</th>
              <th className="py-2 px-3 text-right">Trades</th>
              <th className="py-2 px-3 text-right">Realized P&L</th>
              <th className="py-2 px-3 text-right">Performance Ratio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A2333]">
            {safeData.map((item, idx) => {
              const pnl = Number(item?.pnl) || 0;
              const isPos = pnl >= 0;
              const maxPnL = Math.max(...safeData.map((d) => Math.abs(Number(d?.pnl) || 0)), 1);
              const barWidth = Math.min(100, Math.round((Math.abs(pnl) / maxPnL) * 100));

              return (
                <tr key={item?.symbol || `pnl-row-${idx}`} className="hover:bg-[#162032] transition-colors">
                  <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                    {isPos ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                    )}
                    <span>{item?.symbol || "Unknown"}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">
                    {item?.trades ?? "-"}
                  </td>
                  <td className={`py-2 px-3 text-right font-mono font-bold ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                    {isPos ? "+" : ""}${pnl.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isPos ? "bg-emerald-500" : "bg-red-500"}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
                        {barWidth}%
                      </span>
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
