"use client";

import React from "react";
import { Sliders, RotateCcw, TrendingUp, TrendingDown, Minus, Check, Power, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { IndicatorConfigItem } from "@/types/indicator";

interface IndicatorLibraryCardProps {
  indicator: IndicatorConfigItem;
  onConfigure: (ind: IndicatorConfigItem) => void;
  onToggleEnable: (id: string, enabled: boolean) => void;
  onResetOverride: (id: string) => void;
  isSaving?: boolean;
}

export function IndicatorLibraryCard({
  indicator,
  onConfigure,
  onToggleEnable,
  onResetOverride,
  isSaving,
}: IndicatorLibraryCardProps) {
  const isEnabled = indicator.enabled;
  const isOverride = indicator.effective_source === "BOT OVERRIDE";
  const formattedVal = indicator.current_value !== undefined && indicator.current_value !== null
    ? typeof indicator.current_value === "number"
      ? indicator.current_value.toFixed(2)
      : String(indicator.current_value)
    : "N/A";

  const formattedPrev = indicator.previous_value !== undefined && indicator.previous_value !== null
    ? typeof indicator.previous_value === "number"
      ? indicator.previous_value.toFixed(2)
      : String(indicator.previous_value)
    : null;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 p-4 space-y-3.5 flex flex-col justify-between ${
        isEnabled
          ? "bg-[#0B111E] border-[#1E293B] hover:border-cyan-500/50 shadow-lg shadow-black/40"
          : "bg-[#080D17] border-slate-900 opacity-60 hover:opacity-90"
      }`}
    >
      {/* Top Row: Category, Name, Enable Switch */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#141E33] text-cyan-400 border border-cyan-500/30">
            {indicator.category}
          </span>
          <div className="flex items-center gap-1.5">
            {isOverride && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                OVERRIDE
              </span>
            )}
            <button
              onClick={() => onToggleEnable(indicator.indicator_id, !isEnabled)}
              className={`p-1.5 rounded-lg border transition-all ${
                isEnabled
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30"
                  : "bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300"
              }`}
              title={isEnabled ? "Disable indicator" : "Enable indicator"}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <h3 className="text-sm font-bold text-white tracking-tight line-clamp-1">
          {indicator.name}
        </h3>
        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
          {indicator.description || "Quantitative mathematical model indicator."}
        </p>
      </div>

      {/* Value & Signal Display */}
      <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-400">Current Value</span>
          <span className="text-white font-bold text-xs">{formattedVal}</span>
        </div>
        {formattedPrev && (
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Previous Bar</span>
            <span>{formattedPrev}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-slate-800">
          <span className="text-slate-400">Signal Trigger</span>
          <span
            className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
              indicator.signal === "BUY"
                ? "bg-emerald-500/20 text-emerald-400"
                : indicator.signal === "SELL"
                ? "bg-red-500/20 text-red-400"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {indicator.signal || "NEUTRAL"}
          </span>
        </div>
      </div>

      {/* Parameters & Weight Bar */}
      <div className="space-y-1.5 text-[11px] font-mono">
        <div className="flex items-center justify-between text-slate-400">
          <span>Timeframe / Weight</span>
          <span className="text-cyan-400 font-bold">
            {indicator.timeframe || "15m"} • {indicator.weight || 15}%
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-cyan-500 h-full rounded-full"
            style={{ width: `${Math.min(indicator.weight * 3, 100)}%` }}
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-900">
        {isOverride && (
          <button
            onClick={() => onResetOverride(indicator.indicator_id)}
            className="text-[10px] font-mono text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-all"
            title="Reset to bot profile default"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
        <button
          onClick={() => onConfigure(indicator)}
          className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1E293B] hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-all flex items-center gap-1.5"
        >
          <Sliders className="w-3.5 h-3.5" />
          Configure
        </button>
      </div>
    </div>
  );
}
