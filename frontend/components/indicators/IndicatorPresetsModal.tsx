"use client";

import React, { useState } from "react";
import { X, Sparkles, Check, ArrowRight, ShieldAlert, Layers } from "lucide-react";
import { IndicatorProfile } from "@/types/indicator";

interface IndicatorPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: IndicatorProfile[];
  onApplyProfile: (profileId: string, mode: "REPLACE" | "MERGE") => void;
}

const DEFAULT_PRESETS: IndicatorProfile[] = [
  {
    profile_id: "trend_following_default",
    name: "Trend Confluence",
    description: "EMA 20/50/200 structural alignment with ADX > 25 trend confirmation and VWAP filter.",
    category: "Trend",
    version: "v1.4",
    indicators_count: 5,
    weights_summary: { "EMA 20": 20, "EMA 50": 20, "EMA 200": 20, "ADX": 20, "VWAP": 20 },
    conditions_summary: ["Price > EMA 200", "EMA 20 > EMA 50", "ADX(14) >= 25", "Price > Session VWAP"],
  },
  {
    profile_id: "scalper_momentum",
    name: "Scalping Momentum",
    description: "Fast EMA 9/20 crossovers, RSI 14 threshold breach, and volume spike confirmation.",
    category: "Scalping",
    version: "v2.1",
    indicators_count: 5,
    weights_summary: { "EMA 9": 25, "EMA 20": 25, "RSI": 20, "MACD": 15, "Volume": 15 },
    conditions_summary: ["EMA 9 Crosses EMA 20", "RSI > 55", "MACD Hist > 0", "Volume > 1.2x 20SMA"],
  },
  {
    profile_id: "breakout_hunter",
    name: "Breakout Hunter",
    description: "Bollinger Band squeeze expansion, Breakout Levels, and ATR volatility expansion.",
    category: "Breakout",
    version: "v1.2",
    indicators_count: 4,
    weights_summary: { "Bollinger Bands": 30, "Breakout Levels": 30, "ATR": 20, "Volume": 20 },
    conditions_summary: ["Close outside Bollinger Bands", "High/Low Breakout Triggered", "Volume Expansion"],
  },
  {
    profile_id: "mean_reversion_pro",
    name: "Mean Reversion",
    description: "Overextended RSI extremes, Stochastic %K/%D crossover, and Bollinger Band bounces.",
    category: "Mean Reversion",
    version: "v1.8",
    indicators_count: 4,
    weights_summary: { "RSI": 30, "Stochastic": 30, "Bollinger Bands": 25, "MFI": 15 },
    conditions_summary: ["RSI <= 30 (Oversold) or >= 70 (Overbought)", "Stoch %K Cross %D in Extremes", "Band Touch"],
  },
];

export function IndicatorPresetsModal({
  isOpen,
  onClose,
  profiles,
  onApplyProfile,
}: IndicatorPresetsModalProps) {
  const presetList = profiles && profiles.length > 0 ? profiles : DEFAULT_PRESETS;
  const [selectedId, setSelectedId] = useState<string>(presetList[0]?.profile_id || "trend_following_default");
  const [applyMode, setApplyMode] = useState<"REPLACE" | "MERGE">("REPLACE");
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  const activePreset = presetList.find((p) => p.profile_id === selectedId) || presetList[0];

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyProfile(activePreset.profile_id, applyMode);
    setShowConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B111E] border border-[#1E293B] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#1E293B] bg-[#080D17] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-sans">
                Indicator Strategy Presets
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Select curated quantitative profile or merge with active indicators
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: 2-Column (Preset List Left | Preset Preview Right) */}
        <div className="grid grid-cols-1 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 p-0 max-h-[60vh] overflow-y-auto">
          {/* Left Column: Preset Buttons (2/5) */}
          <div className="sm:col-span-2 p-3 space-y-1.5 bg-[#080D17]/50">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase font-mono">
              Available Presets
            </div>
            {presetList.map((preset) => {
              const isSelected = preset.profile_id === selectedId;
              return (
                <button
                  key={preset.profile_id}
                  onClick={() => setSelectedId(preset.profile_id)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex flex-col gap-0.5 border ${
                    isSelected
                      ? "bg-[#141E33] text-white border-cyan-500/50 shadow-md shadow-cyan-950/30"
                      : "bg-transparent hover:bg-[#141E33]/50 text-slate-300 border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs font-sans">{preset.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {preset.indicators_count} ind
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 line-clamp-1 font-sans">
                    {preset.category}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Column: Preset Preview (3/5) */}
          <div className="sm:col-span-3 p-5 space-y-4 bg-[#0B111E]">
            {activePreset && (
              <>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white font-sans">
                      {activePreset.name}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      {activePreset.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 font-sans">
                    {activePreset.description}
                  </p>
                </div>

                {/* Included Conditions Preview */}
                {activePreset.conditions_summary && activePreset.conditions_summary.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase font-mono">
                      Strategy Rules & Conditions:
                    </div>
                    <div className="space-y-1.5">
                      {activePreset.conditions_summary.map((cond, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs font-mono text-slate-200 bg-[#141E33] p-2 rounded-lg border border-slate-800"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{cond}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safety Option: Replace vs Merge */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase font-mono">
                    Application Mode:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setApplyMode("REPLACE")}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        applyMode === "REPLACE"
                          ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                          : "bg-[#141E33] border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div className="font-bold text-xs font-sans">Replace Current</div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                        Overwrites active list
                      </div>
                    </button>

                    <button
                      onClick={() => setApplyMode("MERGE")}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        applyMode === "MERGE"
                          ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                          : "bg-[#141E33] border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div className="font-bold text-xs font-sans">Merge Setup</div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                        Keeps current active
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1E293B] bg-[#080D17] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold font-sans transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-sans transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Apply {activePreset?.name}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
