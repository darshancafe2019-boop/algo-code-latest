"use client";

import React, { useEffect, useState } from "react";
import { BotWizardDraft, StrategyConfig } from "./types";
import { api } from "../../lib/api";
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Sliders,
  Sparkles,
  Search,
  Filter,
} from "lucide-react";

interface Step5Props {
  draft: BotWizardDraft;
  updateDraft: (updates: Partial<BotWizardDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Step5TradingStrategy({ draft, updateDraft, onNext, onPrev }: Step5Props) {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [activeStrategy, setActiveStrategy] = useState<any | null>(null);

  useEffect(() => {
    const loadStrategies = async () => {
      setLoading(true);
      try {
        const list = await api.getTradingStrategies();
        setStrategies(list || []);

        if (draft.trading_strategy) {
          const match = list.find((s: any) => s.id === draft.trading_strategy?.strategy_id);
          if (match) setActiveStrategy(match);
        } else if (list && list.length > 0) {
          selectStrategy(list[0]);
        }
      } catch (err) {
        console.error("Failed to load trading strategies", err);
      } finally {
        setLoading(false);
      }
    };
    loadStrategies();
  }, []);

  const selectStrategy = (strat: any) => {
    setActiveStrategy(strat);

    // Check compatibility with selected market and broker
    let compatible = true;
    let compatibilityReason = "";

    if (strat.required_data?.includes("OPEN_INTEREST") && draft.market_type === "INDIA_STOCK") {
      compatible = false;
      compatibilityReason = "Open Interest data is not available on cash equity stocks.";
    }

    if (strat.required_data?.includes("SPOT_AND_FUTURES_BASIS") && !draft.market_type.includes("FUTURE")) {
      compatible = false;
      compatibilityReason = "Basis Extreme Reversal requires simultaneous Spot + Futures contracts.";
    }

    const defaultParams: Record<string, any> = {};
    if (strat.parameters && typeof strat.parameters === "object") {
      Object.assign(defaultParams, strat.parameters);
    } else if (strat.default_params && typeof strat.default_params === "object") {
      Object.assign(defaultParams, strat.default_params);
    }

    const stratConfig: StrategyConfig = {
      strategy_id: strat.id,
      strategy_name: strat.name,
      category: strat.category,
      timeframe: draft.timeframe || "5m",
      parameters: defaultParams,
      entry_logic: strat.entry_logic || "",
      exit_logic: strat.exit_logic || "",
      compatible,
      compatibility_reason: compatibilityReason,
    };

    updateDraft({ trading_strategy: stratConfig });
  };

  const categories = ["ALL", "TREND", "MOMENTUM", "BREAKOUT", "MEAN_REVERSION", "VOLUME", "REGIME"];

  const filteredStrategies = strategies.filter((s) => {
    const sCat = (s.category || "").toUpperCase().replace(/[\s&]+/g, "_");
    const matchesCat =
      selectedCategory === "ALL" ||
      sCat === selectedCategory ||
      (s.category || "").toUpperCase() === selectedCategory;
    const matchesSearch =
      (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-4 sm:p-5 flex items-start gap-4">
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-2 text-blue-400">
          <Cpu className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Step 5 — Algorithmic Trading Strategy Engine</h3>
          <p className="text-xs text-slate-400 mt-1">
            Choose from 30 production trading models. Strategy logic connects strictly to the real selected contract and indicator filters.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: 30 Strategies List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search 30 strategies..."
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white font-bold"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
            {filteredStrategies.map((strat) => {
              const isSelected = activeStrategy?.id === strat.id;
              return (
                <button
                  key={strat.id}
                  type="button"
                  onClick={() => selectStrategy(strat)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-600/20 text-white ring-1 ring-blue-500"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white">{strat.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {strat.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {strat.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Active Strategy Configuration & Rules */}
        <div className="lg:col-span-7 space-y-4">
          {activeStrategy && draft.trading_strategy ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <h4 className="text-sm font-mono font-bold text-white">{activeStrategy.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      {activeStrategy.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Target: <strong className="text-emerald-400">{draft.contract?.symbol || draft.underlying}</strong>
                    </span>
                  </div>
                </div>

                {draft.trading_strategy.compatible ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded">
                    <CheckCircle2 className="h-3.5 w-3.5" /> DATA COMPATIBLE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-red-400 bg-red-950/40 border border-red-500/30 px-2 py-1 rounded">
                    <AlertTriangle className="h-3.5 w-3.5" /> STRATEGY_NOT_COMPATIBLE
                  </span>
                )}
              </div>

              {!draft.trading_strategy.compatible && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/30 text-xs font-mono text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{draft.trading_strategy.compatibility_reason}</span>
                </div>
              )}

              {/* Logic Rules Definition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/80 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">ENTRY TRIGGER</span>
                  <p className="text-slate-300 leading-snug">{activeStrategy.entry_logic}</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/80 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">EXIT / STOP TRIGGER</span>
                  <p className="text-slate-300 leading-snug">{activeStrategy.exit_logic}</p>
                </div>
              </div>

              {/* Configurable Parameters */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-blue-400" />
                  Strategy Hyperparameters
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(draft.trading_strategy.parameters).map(([key, val]) => {
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
                              const updated = {
                                ...draft.trading_strategy!.parameters,
                                [key]: !val,
                              };
                              updateDraft({
                                trading_strategy: {
                                  ...draft.trading_strategy!,
                                  parameters: updated,
                                },
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
                              const updated = {
                                ...draft.trading_strategy!.parameters,
                                [key]: isNaN(num) ? e.target.value : num,
                              };
                              updateDraft({
                                trading_strategy: {
                                  ...draft.trading_strategy!,
                                  parameters: updated,
                                },
                              });
                            }}
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Combined Rule Pipeline Preview */}
              <div className="p-3.5 rounded-lg border border-blue-500/20 bg-blue-950/20 space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-blue-300 block">
                  COMBINED DECISION PIPELINE (STRATEGY + INDICATORS):
                </span>
                <div className="text-xs font-mono text-slate-300 space-y-1">
                  <div className="flex items-center gap-1 text-emerald-400 font-bold">
                    <span>1.</span> {activeStrategy.name} ({draft.timeframe})
                  </div>
                  {draft.indicators.map((ind, i) => (
                    <div key={ind.id} className="flex items-center gap-1 text-slate-300">
                      <span className="text-blue-400 font-bold">{ind.logical_operator}</span>
                      <span>
                        {ind.indicator_name} ({ind.timeframe}) {ind.operator} {ind.target_value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
              Select a strategy from the left panel to configure its execution logic.
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-lg border border-slate-800 bg-slate-900 px-5 py-2.5 text-xs font-mono font-bold text-slate-300 hover:text-white transition-colors"
        >
          ← Back: Step 4
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!draft.trading_strategy?.compatible}
          className={`rounded-lg px-6 py-2.5 text-xs font-mono font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
            draft.trading_strategy?.compatible
              ? "bg-blue-600 hover:bg-blue-500 cursor-pointer"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          Proceed to Step 6: Risk Management →
        </button>
      </div>
    </div>
  );
}
