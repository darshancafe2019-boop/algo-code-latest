"use client";

import React from "react";
import { Plus, Sliders, CheckCircle2, XCircle, AlertCircle, ArrowUpRight, ArrowDownRight, Minus, Power, Trash2 } from "lucide-react";
import { IndicatorConfigItem } from "@/types/indicator";

interface ActiveIndicatorsTableProps {
  indicators: IndicatorConfigItem[];
  onConfigure: (indicator: IndicatorConfigItem) => void;
  onToggleEnable: (id: string, enabled: boolean) => void;
  onOpenAddModal: () => void;
  isLoading?: boolean;
}

export function ActiveIndicatorsTable({
  indicators,
  onConfigure,
  onToggleEnable,
  onOpenAddModal,
  isLoading,
}: ActiveIndicatorsTableProps) {
  const activeList = indicators.filter((ind) => ind.enabled);

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Title Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
            Active Indicators
          </h2>
          <span className="text-xs font-mono text-slate-400">
            ({activeList.length} Active)
          </span>
        </div>

        <button
          onClick={onOpenAddModal}
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 font-sans flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Indicator</span>
        </button>
      </div>

      {/* Table of Active Indicators */}
      {activeList.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Indicator</th>
                <th className="py-2.5 px-3">Timeframe</th>
                <th className="py-2.5 px-3 text-right">Latest Value</th>
                <th className="py-2.5 px-3">Signal / Condition</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {activeList.map((ind) => {
                const signal = ind.current_signal || "NEUTRAL";
                const isBullish = signal.toUpperCase().includes("BULL") || signal === "BUY";
                const isBearish = signal.toUpperCase().includes("BEAR") || signal === "SELL";
                const valStr = ind.formatted_value || (ind.current_value !== undefined && ind.current_value !== null ? String(ind.current_value) : "—");

                return (
                  <tr
                    key={ind.id || ind.indicator_id}
                    onClick={() => onConfigure(ind)}
                    className="hover:bg-[#141E33]/70 transition-colors cursor-pointer group"
                  >
                    {/* Indicator Name & Category */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                          {ind.name || ind.indicator_id}
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                          {ind.category}
                        </span>
                      </div>
                      {ind.current_reason && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                          {ind.current_reason}
                        </div>
                      )}
                    </td>

                    {/* Timeframe */}
                    <td className="py-3 px-3 font-mono text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-[#141E33] border border-slate-700 text-[11px] font-bold">
                        {ind.timeframe || "15m"}
                      </span>
                    </td>

                    {/* Latest Value */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-white text-sm">
                      {valStr}
                    </td>

                    {/* Signal / Condition Badge */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                          isBullish
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : isBearish
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : "bg-slate-800/80 text-slate-300 border-slate-700"
                        }`}
                      >
                        {isBullish ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : isBearish ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                        <span>{signal}</span>
                      </span>
                    </td>

                    {/* Health Status */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Healthy</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onConfigure(ind)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#1E293B] hover:bg-cyan-500 hover:text-slate-950 text-slate-300 font-sans transition-all flex items-center gap-1"
                          title="Configure parameters"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Configure</span>
                        </button>
                        <button
                          onClick={() => onToggleEnable(ind.id || ind.indicator_id, false)}
                          className="p-1.5 text-xs rounded-lg bg-[#1E293B] hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                          title="Disable indicator"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl bg-[#080D17] space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-800/80 text-slate-400 mx-auto flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white font-sans">No Active Indicators</div>
            <p className="text-xs text-slate-400 mt-0.5">
              Add technical indicators to start generating quantitative confluence signals.
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-sans transition-all inline-flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Indicator</span>
          </button>
        </div>
      )}

      {/* Footer Quick Action */}
      {activeList.length > 0 && (
        <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            {activeList.length} models active • Confluence calculated on closed candle
          </span>
          <button
            onClick={onOpenAddModal}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#141E33] hover:bg-[#1C2A47] text-cyan-400 border border-cyan-500/30 font-sans transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Indicator</span>
          </button>
        </div>
      )}
    </div>
  );
}
