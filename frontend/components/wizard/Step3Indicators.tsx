"use client";

import React, { useEffect, useState } from "react";
import { BotWizardDraft, IndicatorCondition } from "./types";
import { api } from "../../lib/api";
import {
  Sliders,
  Plus,
  Trash2,
  Settings2,
  CheckCircle2,
  Zap,
  Layers,
  Sparkles,
  HelpCircle,
} from "lucide-react";

interface Step3Props {
  draft: BotWizardDraft;
  updateDraft: (updates: Partial<BotWizardDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Step3Indicators({ draft, updateDraft, onNext, onPrev }: Step3Props) {
  const [registry, setRegistry] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [editingCondition, setEditingCondition] = useState<IndicatorCondition | null>(null);

  useEffect(() => {
    const fetchIndicators = async () => {
      setLoading(true);
      try {
        const list = await api.getIndicatorRegistry();
        setRegistry(list || []);
      } catch (err) {
        console.error("Failed to load indicator registry", err);
      } finally {
        setLoading(false);
      }
    };
    fetchIndicators();
  }, []);

  const categories = ["ALL", "TREND", "MOMENTUM", "VOLATILITY", "VOLUME", "STRUCTURE", "OPTIONS"];

  const filteredIndicators = registry.filter((ind) => {
    if (selectedCategory === "ALL") return true;
    const cat = (ind.category || "").toUpperCase().replace(/\s+/g, "_");
    return cat === selectedCategory || (ind.category || "").toUpperCase() === selectedCategory;
  });

  const addIndicator = (ind: any) => {
    const defaultParams: Record<string, any> = {};
    if (Array.isArray(ind.parameters)) {
      ind.parameters.forEach((p: any) => {
        defaultParams[p.name] = p.default;
      });
    } else if (ind.default_params && typeof ind.default_params === "object") {
      Object.assign(defaultParams, ind.default_params);
    } else if (ind.params && typeof ind.params === "object") {
      Object.assign(defaultParams, ind.params);
    }

    const newCond: IndicatorCondition = {
      id: `${ind.id}_${Date.now()}`,
      indicator_id: ind.id,
      indicator_name: ind.name,
      timeframe: draft.timeframe || "5m",
      params: defaultParams,
      operator: "GREATER_THAN",
      target_type: "VALUE",
      target_value: (ind.id || "").toLowerCase().includes("rsi") ? 50 : 0,
      logical_operator: "AND",
    };

    updateDraft({
      indicators: [...draft.indicators, newCond],
    });
  };

  const removeCondition = (id: string) => {
    updateDraft({
      indicators: draft.indicators.filter((c) => c.id !== id),
    });
  };

  const updateCondition = (id: string, updates: Partial<IndicatorCondition>) => {
    updateDraft({
      indicators: draft.indicators.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Info Banner */}
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-[#0B1528] via-[#09101F] to-[#0D182E] p-6 shadow-xl flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-sm">
          <Sliders className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wide">
              Step 3 — Technical Indicators & Signal Rules
            </h3>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              ALGORITHMIC FILTERS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
            Construct multi-timeframe quantitative entry and exit conditions. Indicators are calculated deterministically on live streaming candle feeds from {draft.broker}.
          </p>
        </div>
      </div>

      {/* Active Rules Pipeline */}
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h4 className="text-sm sm:text-base font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            Configured Signal Rules ({draft.indicators.length})
          </h4>
          <span className="text-xs sm:text-sm font-mono text-slate-300">
            Evaluating Target: <strong className="text-emerald-400">{draft.contract?.symbol || draft.underlying}</strong>
          </span>
        </div>

        {draft.indicators.length === 0 ? (
          <div className="py-12 text-center text-sm sm:text-base font-mono text-slate-300 border border-dashed border-slate-800/80 rounded-2xl bg-[#070D1A]/60">
            No indicators active. Select indicators from the registry below to add automated execution conditions.
          </div>
        ) : (
          <div className="space-y-3">
            {draft.indicators.map((cond, idx) => (
              <div
                key={cond.id}
                className="p-4 rounded-xl border border-slate-800/90 bg-[#070D1A] flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-mono shadow-inner"
              >
                {/* Logic Connector */}
                {idx > 0 && (
                  <select
                    value={cond.logical_operator}
                    onChange={(e) =>
                      updateCondition(cond.id, { logical_operator: e.target.value as any })
                    }
                    className="rounded-lg bg-blue-600/20 border border-blue-500/40 px-3 py-1.5 text-xs sm:text-sm font-bold text-cyan-300 focus:outline-none"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                    <option value="NOT">NOT</option>
                  </select>
                )}

                {/* Indicator Name & Timeframe */}
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-white bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm">
                    {cond.indicator_name}
                  </span>
                  <select
                    value={cond.timeframe}
                    onChange={(e) => updateCondition(cond.id, { timeframe: e.target.value })}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs sm:text-sm text-slate-200 focus:outline-none font-bold"
                  >
                    {["1m", "3m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"].map((tf) => (
                      <option key={tf} value={tf}>
                        {tf}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Operator */}
                <select
                  value={cond.operator}
                  onChange={(e) => updateCondition(cond.id, { operator: e.target.value as any })}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-xs sm:text-sm text-cyan-300 font-bold focus:outline-none"
                >
                  <option value="GREATER_THAN">GREATER THAN (&gt;)</option>
                  <option value="LESS_THAN">LESS THAN (&lt;)</option>
                  <option value="CROSS_ABOVE">CROSSES ABOVE ↑</option>
                  <option value="CROSS_BELOW">CROSSES BELOW ↓</option>
                  <option value="EQUAL">EQUALS (==)</option>
                  <option value="ABOVE">ABOVE</option>
                  <option value="BELOW">BELOW</option>
                </select>

                {/* Target Value / Target Type */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={cond.target_value ?? 0}
                    onChange={(e) =>
                      updateCondition(cond.id, { target_value: parseFloat(e.target.value) || 0 })
                    }
                    className="w-28 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs sm:text-sm text-white font-black text-right focus:outline-none font-mono"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCondition(cond)}
                    className="p-2.5 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                    title="Configure Indicator Parameters"
                  >
                    <Settings2 className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCondition(cond.id)}
                    className="p-2.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Remove Rule"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Indicator Selection Grid */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B1426]/90 p-4 rounded-2xl border border-slate-800/80 shadow-lg">
          <h4 className="text-sm sm:text-base font-mono font-bold uppercase tracking-wider text-white">
            Available Indicator Library
          </h4>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs sm:text-sm font-mono font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredIndicators.map((ind) => (
            <div
              key={ind.id}
              className="p-5 rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] hover:border-cyan-500/50 transition-all flex flex-col justify-between shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm sm:text-base font-mono font-bold text-white">{ind.name}</span>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-cyan-300 font-bold">
                    {ind.category}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-2.5 leading-relaxed font-sans">{ind.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 truncate max-w-[130px]">
                  {Array.isArray(ind.parameters) && ind.parameters.length > 0
                    ? ind.parameters.slice(0, 2).map((p: any) => `${p.label || p.name}:${p.default}`).join(", ")
                    : ind.default_params && typeof ind.default_params === "object"
                    ? Object.entries(ind.default_params).slice(0, 2).map(([k, v]) => `${k}:${v}`).join(", ")
                    : ind.params && typeof ind.params === "object"
                    ? Object.entries(ind.params).slice(0, 2).map(([k, v]) => `${k}:${v}`).join(", ")
                    : "Default"}
                </span>
                <button
                  type="button"
                  onClick={() => addIndicator(ind)}
                  className="text-xs sm:text-sm font-mono font-bold px-3.5 py-2 rounded-xl bg-blue-600/10 text-cyan-300 hover:bg-blue-600 hover:text-white border border-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Add Rule
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Parameter Edit Modal */}
      {editingCondition && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B1426] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-mono font-bold text-white">
                Configure {editingCondition.indicator_name} Parameters
              </h3>
              <button
                type="button"
                onClick={() => setEditingCondition(null)}
                className="text-slate-400 hover:text-white text-sm font-mono cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3">
              {Object.entries(editingCondition.params || {}).map(([key, val]) => {
                const isBool = typeof val === "boolean";
                return (
                  <div key={key}>
                    <label className="block text-xs sm:text-sm font-mono text-slate-200 mb-1.5 capitalize font-bold">
                      {key.replace(/_/g, " ")}:
                    </label>
                    {isBool ? (
                      <button
                        type="button"
                        onClick={() => {
                          const updatedParams = {
                            ...(editingCondition.params || {}),
                            [key]: !val,
                          };
                          setEditingCondition({
                            ...editingCondition,
                            params: updatedParams,
                          });
                        }}
                        className={`w-full py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-mono font-bold border transition-colors flex items-center justify-between cursor-pointer ${
                          val
                            ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-400"
                            : "bg-slate-900 border-slate-800 text-slate-400"
                        }`}
                      >
                        <span>{key.replace(/_/g, " ")}</span>
                        <span className="text-xs uppercase font-bold">{val ? "ENABLED" : "DISABLED"}</span>
                      </button>
                    ) : (
                      <input
                        type="number"
                        step="any"
                        value={val !== undefined && val !== null ? String(val) : ""}
                        onChange={(e) => {
                          const num = parseFloat(e.target.value);
                          const updatedParams = {
                            ...(editingCondition.params || {}),
                            [key]: isNaN(num) ? e.target.value : num,
                          };
                          setEditingCondition({
                            ...editingCondition,
                            params: updatedParams,
                          });
                        }}
                        className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-3.5 py-2.5 text-xs sm:text-sm font-mono text-white focus:border-cyan-500 focus:outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  updateCondition(editingCondition.id, { params: editingCondition.params });
                  setEditingCondition(null);
                }}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-mono font-bold text-white hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer shadow-md"
              >
                Save Parameters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-5 border-t border-slate-800/80">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-xl border border-slate-800 bg-[#0B1426] hover:bg-slate-800 px-6 py-3 text-xs sm:text-sm font-mono font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
        >
          ← Return to Step 2
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 px-7 py-3 text-xs sm:text-sm font-mono font-black text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
        >
          <span>Continue to Step 4: Option Strategies</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
