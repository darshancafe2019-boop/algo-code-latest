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
      {/* Header */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-4 sm:p-5 flex items-start gap-4">
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-2 text-blue-400">
          <Sliders className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Step 3 — Technical Indicators & Signal Rules</h3>
          <p className="text-xs text-slate-400 mt-1">
            Build multi-timeframe quantitative signal rules. All indicator mathematics execute on real live candle streams from {draft.broker}.
          </p>
        </div>
      </div>

      {/* Active Rules Pipeline */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-400" />
            Configured Signal Rules ({draft.indicators.length})
          </h4>
          <span className="text-[11px] font-mono text-slate-400">
            Evaluating on: <strong className="text-emerald-400">{draft.contract?.symbol || draft.underlying}</strong>
          </span>
        </div>

        {draft.indicators.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No indicators added yet. Select indicators from the registry below to construct entry/exit filters.
          </div>
        ) : (
          <div className="space-y-3">
            {draft.indicators.map((cond, idx) => (
              <div
                key={cond.id}
                className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
              >
                {/* Logic Connector */}
                {idx > 0 && (
                  <select
                    value={cond.logical_operator}
                    onChange={(e) =>
                      updateCondition(cond.id, { logical_operator: e.target.value as any })
                    }
                    className="rounded bg-blue-600/20 border border-blue-500/40 px-2 py-1 text-xs font-bold text-blue-300 focus:outline-none"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                    <option value="NOT">NOT</option>
                  </select>
                )}

                {/* Indicator Name & Timeframe */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded">
                    {cond.indicator_name}
                  </span>
                  <select
                    value={cond.timeframe}
                    onChange={(e) => updateCondition(cond.id, { timeframe: e.target.value })}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 focus:outline-none"
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
                  className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-blue-300 font-bold focus:outline-none"
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
                    className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white font-bold text-right focus:outline-none font-mono"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCondition(cond)}
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Configure Indicator Parameters"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCondition(cond.id)}
                    className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors"
                    title="Remove Rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Indicator Selection Grid */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Available Indicator Library
          </h4>
          <div className="flex items-center gap-1 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded transition-colors ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white font-bold"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredIndicators.map((ind) => (
            <div
              key={ind.id}
              className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">{ind.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {ind.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">{ind.description}</p>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">
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
                  className="text-xs font-mono px-2.5 py-1 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-500/30 flex items-center gap-1 transition-all"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Parameter Edit Modal */}
      {editingCondition && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-mono font-bold text-white">
                Configure {editingCondition.indicator_name} Parameters
              </h3>
              <button
                type="button"
                onClick={() => setEditingCondition(null)}
                className="text-slate-500 hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3">
              {Object.entries(editingCondition.params || {}).map(([key, val]) => {
                const isBool = typeof val === "boolean";
                return (
                  <div key={key}>
                    <label className="block text-xs font-mono text-slate-400 mb-1 capitalize">
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
                        className={`w-full py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-colors flex items-center justify-between ${
                          val
                            ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-400"
                            : "bg-slate-900 border-slate-800 text-slate-400"
                        }`}
                      >
                        <span>{key.replace(/_/g, " ")}</span>
                        <span className="text-[10px] uppercase font-bold">{val ? "ENABLED" : "DISABLED"}</span>
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
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
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
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-mono font-bold text-white hover:bg-blue-500 transition-colors"
              >
                Save Parameters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-lg border border-slate-800 bg-slate-900 px-5 py-2.5 text-xs font-mono font-bold text-slate-300 hover:text-white transition-colors"
        >
          ← Back: Step 2
        </button>

        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-mono font-bold text-white shadow-lg hover:bg-blue-500 transition-all flex items-center gap-2"
        >
          Proceed to Step 4: Option Strategies →
        </button>
      </div>
    </div>
  );
}
