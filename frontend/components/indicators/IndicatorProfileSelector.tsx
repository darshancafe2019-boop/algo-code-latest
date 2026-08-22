"use client";

import React, { useState } from "react";
import { Sparkles, Check, Copy, History, Layers, ShieldAlert, ArrowRight } from "lucide-react";
import { IndicatorProfile } from "@/types/indicator";

interface IndicatorProfileSelectorProps {
  profiles: IndicatorProfile[];
  activeProfileId?: string;
  selectedBotName: string;
  onApplyProfile: (profileId: string) => void;
  onSaveCustomProfile: (name: string) => void;
}

export function IndicatorProfileSelector({
  profiles,
  activeProfileId = "trend_following_default",
  selectedBotName,
  onApplyProfile,
  onSaveCustomProfile,
}: IndicatorProfileSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>(activeProfileId);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);

  const defaultProfiles: IndicatorProfile[] = [
    {
      profile_id: "conservative_trend",
      name: "Conservative Trend",
      description: "EMA 20/50/200 structural alignment with ADX > 25 trend confirmation.",
      category: "Trend",
      version: "v1.4",
      indicators_count: 5,
      weights_summary: { "EMA 200": 30, "EMA 50": 25, "ADX": 25, "RSI": 20 },
      conditions_summary: ["Price > EMA 200", "EMA 20 > EMA 50", "ADX(14) > 25", "RSI between 45-65"],
    },
    {
      profile_id: "scalper_momentum",
      name: "Scalping Momentum",
      description: "Fast EMA 9/21 crossovers + RSI 14 threshold + Volume spikes on 5m.",
      category: "Scalping",
      version: "v2.1",
      indicators_count: 6,
      weights_summary: { "EMA 9/21": 35, "RSI": 25, "Volume MA": 20, "MACD": 20 },
      conditions_summary: ["EMA 9 Crosses EMA 21", "RSI > 52", "Volume > 1.5x 20SMA", "MACD Histogram Expanding"],
    },
    {
      profile_id: "breakout_hunter",
      name: "Breakout Hunter",
      description: "Bollinger Band squeeze expansion + Volume Profile Point of Control breakouts.",
      category: "Breakout",
      version: "v1.2",
      indicators_count: 5,
      weights_summary: { "Bollinger Bands": 30, "Volume Profile": 30, "ATR": 20, "OBV": 20 },
      conditions_summary: ["Price Closes Outside Upper BB", "BandWidth > 15%", "Close > POC Value Area", "ATR Spike"],
    },
    {
      profile_id: "mean_reversion_pro",
      name: "Mean Reversion Pro",
      description: "Overextended RSI + Stochastic + Keltner Channel mean reversion triggers.",
      category: "Mean Reversion",
      version: "v1.8",
      indicators_count: 5,
      weights_summary: { "RSI": 30, "Stochastic": 30, "Keltner Channels": 20, "CCI": 20 },
      conditions_summary: ["RSI < 28 or > 72", "Stochastic %K Cross %D in Extremes", "Price touches Outer Keltner Band"],
    },
    {
      profile_id: "multi_timeframe_matrix",
      name: "Multi-Timeframe Confluence",
      description: "4-tier timeframe synchronization (5m Entry + 15m Trend + 1h Macro).",
      category: "Multi-Timeframe",
      version: "v3.0",
      indicators_count: 7,
      weights_summary: { "1H Macro": 30, "15M Trend": 30, "5M Entry": 25, "Volume": 15 },
      conditions_summary: ["1H EMA200 Trend Filter", "15M MACD Direction", "5M RSI Pullback Entry", "Volume Confirmed"],
    },
  ];

  const profileList = profiles && profiles.length > 0 ? profiles : defaultProfiles;

  const handleSelectToApply = (profileId: string) => {
    setPendingProfileId(profileId);
    setShowConfirmModal(true);
  };

  const handleConfirmApply = () => {
    if (pendingProfileId) {
      onApplyProfile(pendingProfileId);
      setSelectedPreset(pendingProfileId);
    }
    setShowConfirmModal(false);
    setPendingProfileId(null);
  };

  const currentProfile = profileList.find((p) => p.profile_id === selectedPreset) || profileList[0];

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Preset Tabs Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            PRESET INDICATOR PROFILES
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">
            (Isolated to {selectedBotName})
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Active Profile: <span className="text-cyan-400 font-semibold">{currentProfile.name}</span> ({currentProfile.version || "v1.0"})
        </div>
      </div>

      {/* Preset Pill Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {profileList.map((p) => {
          const isSelected = p.profile_id === selectedPreset;
          return (
            <button
              key={p.profile_id}
              onClick={() => setSelectedPreset(p.profile_id)}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? "bg-[#142342] border-cyan-500 shadow-md shadow-cyan-950/30"
                  : "bg-[#141E33] border-[#1E293B] hover:border-slate-700 hover:bg-[#1A2640]"
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-white truncate">{p.name}</span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </div>
              <div className="text-[10px] text-slate-400 line-clamp-1">{p.category}</div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
                <span>{p.indicators_count || 5} Indicators</span>
                <span className="text-cyan-400">{p.version || "v1.0"}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Preset Details & One-Click Apply */}
      {currentProfile && (
        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">{currentProfile.name}</h3>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {currentProfile.category}
              </span>
            </div>
            <p className="text-xs text-slate-300">{currentProfile.description}</p>
            {currentProfile.conditions_summary && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {currentProfile.conditions_summary.map((cond, idx) => (
                  <span key={idx} className="text-[10px] font-mono bg-[#0B111E] border border-slate-700 px-2 py-0.5 rounded text-slate-300">
                    ✓ {cond}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={() => handleSelectToApply(currentProfile.profile_id)}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-950/50"
            >
              <Check className="w-4 h-4" />
              Apply to {selectedBotName}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Profile Assignment</h3>
                <p className="text-xs text-slate-400">Target: {selectedBotName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Applying <strong className="text-cyan-400">{currentProfile.name}</strong> will update indicator weights and parameters for <strong>{selectedBotName}</strong>. Other active bots will remain completely isolated and unaffected.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#141E33] hover:bg-[#1C2A47] text-slate-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApply}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all"
              >
                Confirm & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
