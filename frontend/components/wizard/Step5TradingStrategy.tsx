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
      {/* Header Info Banner */}
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-[#0B1528] via-[#09101F] to-[#0D182E] p-6 shadow-xl flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-sm">
          <Cpu className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wide">
              Step 5 — Trading Strategy Engine
            </h3>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              30 QUANT ALGORITHMS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
            Select the high-level quantitative trading engine. The system automatically verifies market feed compatibility against {draft.broker} capabilities.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: 30 Strategies List */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-5 shadow-xl space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search 30 quantitative models..."
              className="w-full rounded-xl border border-slate-800 bg-[#070D1A] pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs sm:text-sm font-mono px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer font-bold ${
                  selectedCategory === cat
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 scrollbar-none">
            {filteredStrategies.map((strat) => {
              const isSelected = activeStrategy?.id === strat.id;
              return (
                <button
                  key={strat.id}
                  type="button"
                  onClick={() => selectStrategy(strat)}
                  className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-cyan-500/60 bg-gradient-to-r from-blue-600/20 via-indigo-600/10 to-transparent text-white ring-1 ring-cyan-400/40 shadow-lg shadow-blue-950/40"
                      : "border-slate-800/80 bg-[#070D1A] text-slate-300 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-mono font-bold text-white">{strat.name}</span>
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-cyan-300 font-bold">
                      {strat.category}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 mt-2 line-clamp-2 leading-relaxed font-sans">
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
            <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-6 shadow-xl space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
                <div>
                  <h4 className="text-base sm:text-lg font-mono font-bold text-white">{activeStrategy.name}</h4>
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
                      {activeStrategy.category}
                    </span>
                    <span className="text-xs sm:text-sm font-mono text-slate-300">
                      Target: <strong className="text-emerald-400">{draft.contract?.symbol || draft.underlying}</strong>
                    </span>
                  </div>
                </div>

                {draft.trading_strategy.compatible ? (
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3.5 py-1.5 rounded-full shadow-sm">
                    <CheckCircle2 className="h-4 w-4" /> DATA COMPATIBLE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-mono font-bold text-rose-400 bg-rose-950/60 border border-rose-500/40 px-3.5 py-1.5 rounded-full shadow-sm">
                    <AlertTriangle className="h-4 w-4" /> STRATEGY_NOT_COMPATIBLE
                  </span>
                )}
              </div>

              {!draft.trading_strategy.compatible && (
                <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/30 text-xs sm:text-sm font-mono text-rose-300 flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400" />
                  <span>{draft.trading_strategy.compatibility_reason}</span>
                </div>
              )}

              {/* Logic Rules Definition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm font-mono">
                <div className="p-4 rounded-xl border border-slate-800/80 bg-[#070D1A] space-y-2 shadow-inner">
                  <span className="text-emerald-400 text-xs uppercase font-bold block flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> ENTRY TRIGGER
                  </span>
                  <p className="text-slate-200 leading-relaxed font-sans text-xs sm:text-sm">{activeStrategy.entry_logic}</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-800/80 bg-[#070D1A] space-y-2 shadow-inner">
                  <span className="text-cyan-400 text-xs uppercase font-bold block flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" /> EXIT / STOP TRIGGER
                  </span>
                  <p className="text-slate-200 leading-relaxed font-sans text-xs sm:text-sm">{activeStrategy.exit_logic}</p>
                </div>
              </div>

              {/* Configurable Parameters */}
              <div className="space-y-3.5 pt-3 border-t border-slate-800/80">
                <h5 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-cyan-400" />
                  Strategy Hyperparameters
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {Object.entries(draft.trading_strategy.parameters).map(([key, val]) => {
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
                            className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-3.5 py-2.5 text-xs sm:text-sm font-mono text-white focus:border-cyan-500 focus:outline-none"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Combined Rule Pipeline Preview */}
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-[#070D1A] space-y-2 shadow-inner">
                <span className="text-xs font-mono uppercase font-bold text-cyan-300 block">
                  COMBINED DECISION PIPELINE (STRATEGY + INDICATORS):
                </span>
                <div className="text-xs sm:text-sm font-mono text-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>Primary Model:</span> {activeStrategy.name} ({draft.timeframe})
                  </div>
                  {draft.indicators.map((ind) => (
                    <div key={ind.id} className="flex items-center gap-2 text-slate-300 pl-3">
                      <span className="text-cyan-400 font-bold">{ind.logical_operator}</span>
                      <span>
                        {ind.indicator_name} ({ind.timeframe}) {ind.operator} {ind.target_value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-sm font-mono text-slate-400 border border-dashed border-slate-800/80 rounded-2xl bg-[#070D1A]/50">
              Select a strategy from the left panel to configure its execution logic.
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-5 border-t border-slate-800/80">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-xl border border-slate-800 bg-[#0B1426] hover:bg-slate-800 px-6 py-3 text-xs sm:text-sm font-mono font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
        >
          ← Return to Step 4
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!draft.trading_strategy?.compatible}
          className={`inline-flex items-center gap-2 rounded-xl px-7 py-3 text-xs sm:text-sm font-mono font-bold text-white shadow-lg transition-all active:scale-95 ${
            draft.trading_strategy?.compatible
              ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-blue-600/30 cursor-pointer font-black"
              : "bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed opacity-50"
          }`}
        >
          <span>Continue to Step 6: Risk Management</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
