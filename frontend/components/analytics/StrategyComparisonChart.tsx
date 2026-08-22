"use client";

import React, { useState } from "react";
import { StrategyWinRate, StrategyCombo } from "@/types/analytics";
import { Sliders, ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import { formatPercent, formatPrice } from "@/lib/formatters";

interface Props {
  winRates?: StrategyWinRate[];
  combos?: StrategyCombo[];
}

export function StrategyComparisonChart({ winRates = [], combos = [] }: Props) {
  const [sortKey, setSortKey] = useState<"win_rate" | "pnl" | "total_trades">("win_rate");

  const safeWinRates = Array.isArray(winRates) ? winRates : [];
  const safeCombos = Array.isArray(combos) ? combos : [];

  if (safeWinRates.length === 0) {
    return (
      <div className="p-5 rounded-xl bg-[#121824] border border-[#1E293B] flex flex-col items-center justify-center min-h-[250px] text-xs text-slate-400">
        No comparative strategy performance data available.
      </div>
    );
  }

  const merged = safeWinRates.map((wr) => {
    const cb = safeCombos.find((c) => c && c.strategy === wr.strategy);
    return {
      strategy: wr.strategy,
      win_rate: Number(wr.win_rate) || 0,
      pnl: cb ? Number(cb.pnl) || 0 : 0,
      total_trades: Number(wr.total_trades) || 0,
    };
  });

  const sorted = [...merged].sort((a, b) => (Number((b as any)[sortKey]) || 0) - (Number((a as any)[sortKey]) || 0));

  return (
    <div className="p-5 rounded-xl bg-[#121824] border border-[#1E293B] shadow-xl flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between mb-4 border-b border-[#1E293B] pb-3 gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Strategy Comparative Performance Matrix</h3>
        </div>

        <div className="flex items-center gap-1 bg-[#0B0F17] p-1 rounded-lg border border-[#1E293B]">
          <button
            onClick={() => setSortKey("win_rate")}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
              sortKey === "win_rate" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-400"
            }`}
          >
            Win Rate
          </button>
          <button
            onClick={() => setSortKey("pnl")}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
              sortKey === "pnl" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-400"
            }`}
          >
            Net P&L
          </button>
          <button
            onClick={() => setSortKey("total_trades")}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
              sortKey === "total_trades" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-400"
            }`}
          >
            Volume
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-[#0B0F17] text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#1E293B]">
            <tr>
              <th className="py-2 px-3">Strategy Name</th>
              <th className="py-2 px-3 text-right">Trades</th>
              <th className="py-2 px-3 text-right">Win Rate %</th>
              <th className="py-2 px-3 text-right">Net Realized P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A2333]">
            {sorted.map((item) => {
              const isPos = item.pnl >= 0;
              return (
                <tr key={item.strategy} className="hover:bg-[#162032] transition-colors">
                  <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{item.strategy}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">
                    {item.total_trades}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-cyan-300">
                    {formatPercent(item.win_rate, 1)}
                  </td>
                  <td className={`py-2 px-3 text-right font-mono font-bold ${(item.pnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatPrice(item.pnl, "$", 2)}
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
