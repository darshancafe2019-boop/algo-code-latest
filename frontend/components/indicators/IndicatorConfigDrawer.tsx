"use client";

import React, { useState, useEffect } from "react";
import { X, Save, RotateCcw, Sliders, CheckCircle2, History, Layers, Zap } from "lucide-react";
import { IndicatorConfigItem } from "@/types/indicator";

interface IndicatorConfigDrawerProps {
  indicator: IndicatorConfigItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (indicatorId: string, enabled: boolean, weight: number, parameters: Record<string, any>) => void;
  onReset: (indicatorId: string) => void;
  isSaving?: boolean;
}

export function IndicatorConfigDrawer({
  indicator,
  isOpen,
  onClose,
  onSave,
  onReset,
  isSaving,
}: IndicatorConfigDrawerProps) {
  const [activeTab, setActiveTab] = useState<"inputs" | "signals" | "weight" | "history">("inputs");
  const [enabled, setEnabled] = useState<boolean>(true);
  const [weight, setWeight] = useState<number>(15);
  const [timeframe, setTimeframe] = useState<string>("15m");
  const [params, setParams] = useState<Record<string, any>>({});
  const [saveFeedback, setSaveFeedback] = useState<boolean>(false);

  useEffect(() => {
    if (indicator) {
      setEnabled(indicator.enabled);
      setWeight(indicator.weight || 15);
      setTimeframe(indicator.timeframe || "15m");
      setParams(indicator.parameters || {});
    }
  }, [indicator]);

  if (!isOpen || !indicator) return null;

  const handleParamChange = (key: string, val: any) => {
    setParams((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    onSave(indicator.indicator_id, enabled, weight, params);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="bg-[#0B111E] border-l border-[#1E293B] w-full max-w-lg h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#1E293B] space-y-3 bg-[#080D17]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {indicator.category}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {indicator.indicator_id} ({indicator.version || "v1.0"})
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">{indicator.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{indicator.description}</p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 pt-2 border-t border-slate-800/80">
            {(["inputs", "signals", "weight", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold capitalize transition-all ${
                  activeTab === tab
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40"
                    : "bg-[#141E33] text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Drawer Body */}
        <div className="p-5 space-y-4 flex-1">
          {/* TAB 1: INPUTS */}
          {activeTab === "inputs" && (
            <div className="space-y-4">
              <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  Mathematical Parameters
                </div>

                {Object.entries(params).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-mono text-slate-300 capitalize flex items-center justify-between">
                      <span>{key.replace(/_/g, " ")}</span>
                      <span className="text-cyan-400 font-bold">{String(val)}</span>
                    </label>
                    {typeof val === "number" ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={1}
                          max={key.includes("period") || key.includes("length") ? 200 : 100}
                          step={key.includes("mult") || key.includes("step") ? 0.1 : 1}
                          value={val}
                          onChange={(e) => handleParamChange(key, parseFloat(e.target.value))}
                          className="w-full accent-cyan-400 bg-slate-800"
                        />
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => handleParamChange(key, parseFloat(e.target.value))}
                          className="w-20 bg-[#0B111E] border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white text-right"
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={String(val)}
                        onChange={(e) => handleParamChange(key, e.target.value)}
                        className="w-full bg-[#0B111E] border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Timeframe & Source */}
              <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Calculation Timeframe
                </div>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full bg-[#0B111E] border border-slate-700 text-white text-xs font-mono rounded-lg px-3 py-2"
                >
                  <option value="1m">1 Minute (1m)</option>
                  <option value="5m">5 Minutes (5m)</option>
                  <option value="15m">15 Minutes (15m - Default)</option>
                  <option value="30m">30 Minutes (30m)</option>
                  <option value="1h">1 Hour (1h)</option>
                  <option value="4h">4 Hours (4h)</option>
                  <option value="1d">1 Day (1d)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 2: SIGNALS */}
          {activeTab === "signals" && (
            <div className="space-y-4">
              <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Signal Trigger Logic
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="accent-cyan-400 w-4 h-4 rounded"
                    />
                    <span>Active in Strategy Confluence Evaluation</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="accent-cyan-400 w-4 h-4 rounded"
                    />
                    <span>Allow Long / Bullish Triggers</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="accent-cyan-400 w-4 h-4 rounded"
                    />
                    <span>Allow Short / Bearish Triggers</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WEIGHT */}
          {activeTab === "weight" && (
            <div className="space-y-4">
              <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Confluence Weight Contribution
                  </div>
                  <span className="text-cyan-400 font-bold font-mono text-sm">{weight}%</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Defines the mathematical impact of this indicator in the overall Confluence Score calculation.
                </p>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={weight}
                  onChange={(e) => setWeight(parseInt(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          )}

          {/* TAB 4: HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-2 font-mono text-xs">
              <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between text-slate-200">
                  <span className="font-bold text-cyan-400">v1.2 (Active)</span>
                  <span className="text-[10px] text-slate-500">Today, 14:30 UTC</span>
                </div>
                <p className="text-[11px] text-slate-400">Length: {params.length || 14}, Weight: {weight}%</p>
              </div>
              <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3 space-y-1 opacity-70">
                <div className="flex items-center justify-between text-slate-200">
                  <span className="font-bold text-slate-400">v1.1 (Preset Default)</span>
                  <span className="text-[10px] text-slate-500">Yesterday</span>
                </div>
                <p className="text-[11px] text-slate-400">Length: 14, Weight: 15%</p>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#1E293B] bg-[#080D17] flex items-center justify-between gap-3">
          <button
            onClick={() => onReset(indicator.indicator_id)}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#141E33] hover:bg-[#1C2A47] text-slate-400 hover:text-amber-400 border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Default
          </button>

          <div className="flex items-center gap-2">
            {saveFeedback && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Saved!
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-950/40 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
