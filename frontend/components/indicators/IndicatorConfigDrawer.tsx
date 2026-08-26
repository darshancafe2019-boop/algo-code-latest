"use client";

import React, { useState, useEffect } from "react";
import { X, Save, RotateCcw, Sliders, CheckCircle2, History, Layers, Zap, AlertTriangle, Trash2 } from "lucide-react";
import { IndicatorConfigItem } from "@/types/indicator";

interface IndicatorConfigDrawerProps {
  indicator: IndicatorConfigItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (indicatorId: string, enabled: boolean, weight: number, parameters: Record<string, any>) => void;
  onReset: (indicatorId: string) => void;
  onDelete?: (indicatorId: string) => void;
  isSaving?: boolean;
}

const SUPPORTED_PRICE_SOURCES = [
  { value: "close", label: "Close Price" },
  { value: "open", label: "Open Price" },
  { value: "high", label: "High Price" },
  { value: "low", label: "Low Price" },
  { value: "hl2", label: "HL2 (High + Low) / 2" },
  { value: "hlc3", label: "HLC3 (High + Low + Close) / 3" },
  { value: "ohlc4", label: "OHLC4 (Open + High + Low + Close) / 4" },
];

export function IndicatorConfigDrawer({
  indicator,
  isOpen,
  onClose,
  onSave,
  onReset,
  onDelete,
  isSaving,
}: IndicatorConfigDrawerProps) {
  const [activeTab, setActiveTab] = useState<"inputs" | "signals" | "weight" | "history">("inputs");
  const [enabled, setEnabled] = useState<boolean>(true);
  const [weight, setWeight] = useState<number>(15);
  const [timeframe, setTimeframe] = useState<string>("15m");
  const [source, setSource] = useState<string>("close");
  const [useClosedCandle, setUseClosedCandle] = useState<boolean>(true);
  const [params, setParams] = useState<Record<string, any>>({});
  const [saveFeedback, setSaveFeedback] = useState<boolean>(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState<boolean>(false);

  useEffect(() => {
    if (indicator) {
      setEnabled(indicator.enabled);
      setWeight(indicator.weight || 15);
      setTimeframe(indicator.timeframe || "15m");
      const p = indicator.parameters || {};
      setParams(p);
      setSource(p.source || "close");
      setUseClosedCandle(p.use_closed_candle !== false);
      setShowDeleteWarning(false);
    }
  }, [indicator]);

  if (!isOpen || !indicator) return null;

  const handleParamChange = (key: string, val: any) => {
    setParams((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    const updatedParams = {
      ...params,
      source,
      use_closed_candle: useClosedCandle,
      timeframe,
    };
    onSave(indicator.indicator_id, enabled, weight, updatedParams);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2500);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(indicator.indicator_id);
      setShowDeleteWarning(false);
      onClose();
    }
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
            <h2 className="text-lg font-bold text-white tracking-tight font-sans">{indicator.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">{indicator.description}</p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 pt-2 border-t border-slate-850">
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
            <div className="space-y-4 font-sans text-xs">
              {/* Mathematical Parameters */}
              <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  Mathematical Parameters
                </div>

                {Object.entries(params).map(([key, val]) => {
                  if (key === "source" || key === "use_closed_candle" || key === "timeframe") return null;
                  return (
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
                  );
                })}
              </div>

              {/* Price Source & Timeframe */}
              <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Source & Bar Execution Rules
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300">Price Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-[#0B111E] border border-slate-700 text-white text-xs font-mono rounded-lg px-3 py-2"
                  >
                    {SUPPORTED_PRICE_SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300">Calculation Timeframe</label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full bg-[#0B111E] border border-slate-700 text-white text-xs font-mono rounded-lg px-3 py-2"
                  >
                    <option value="1m">1 Minute (1m)</option>
                    <option value="5m">5 Minutes (5m)</option>
                    <option value="15m">15 Minutes (15m)</option>
                    <option value="30m">30 Minutes (30m)</option>
                    <option value="1h">1 Hour (1h)</option>
                    <option value="4h">4 Hours (4h)</option>
                    <option value="1d">1 Day (1d)</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={useClosedCandle}
                      onChange={(e) => setUseClosedCandle(e.target.checked)}
                      className="accent-cyan-400 w-4 h-4 rounded"
                    />
                    <span>Evaluate strictly on closed candle (Zero repainting)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SIGNALS */}
          {activeTab === "signals" && (
            <div className="space-y-4 font-sans text-xs">
              <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Signal Trigger Logic
                </div>
                <div className="space-y-2.5 text-xs text-slate-300">
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
            <div className="space-y-4 font-sans text-xs">
              <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Confluence Weight Contribution
                  </div>
                  <span className="text-cyan-400 font-bold font-mono text-sm">{weight}%</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Determines the mathematical weight of this indicator in the overall Confluence Score calculation.
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
                  <span className="text-[10px] text-slate-500">Live Config</span>
                </div>
                <p className="text-[11px] text-slate-400">Timeframe: {timeframe}, Source: {source}, Weight: {weight}%</p>
              </div>
            </div>
          )}

          {/* Dependency Warning Dialog if triggered */}
          {showDeleteWarning && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs text-amber-400 font-sans">
                    Strategy Dependency Notice
                  </div>
                  <p className="text-xs text-slate-300 font-sans mt-0.5">
                    {indicator.name} is currently used in active confluence scoring. Disabling it will immediately update the strategy signal calculation.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowDeleteWarning(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-slate-950 text-xs font-bold"
                >
                  Remove Anyway
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#1E293B] bg-[#080D17] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReset(indicator.indicator_id)}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#141E33] hover:bg-[#1C2A47] text-slate-400 hover:text-amber-400 border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {onDelete && !showDeleteWarning && (
              <button
                onClick={() => setShowDeleteWarning(true)}
                className="p-2 text-xs rounded-lg bg-[#141E33] hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition-all"
                title="Remove indicator"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {saveFeedback && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Applied!
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-sans transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
