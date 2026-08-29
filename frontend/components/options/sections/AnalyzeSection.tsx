"use client";

import React, { useState } from "react";
import { useOptionsMarketContext } from "@/context/OptionsMarketContext";
import { OptionChainTab } from "../tabs/OptionChainTab";
import { PairsTradingTab } from "../tabs/PairsTradingTab";
import { PairOptionsTab } from "../tabs/PairOptionsTab";
import { StrategyPayoffChart } from "../StrategyPayoffChart";
import { ScenarioAnalysisTable } from "../ScenarioAnalysisTable";
import {
  BarChart2,
  Zap,
  Shield,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  Percent
} from "lucide-react";

export function AnalyzeSection() {
  const {
    selectedUnderlying,
    spotPrice,
    strategyEvaluation,
    draftLegs,
    selectedPair,
    setSelectedPair,
    setPairOptionStructure,
    setActiveSection,
    addDraftLeg,
  } = useOptionsMarketContext();

  const [analyzeSubTab, setAnalyzeSubTab] = useState<"chain" | "payoff" | "pairs">("chain");

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Sub-Navigation Bar for Analyze */}
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-2 shadow-xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setAnalyzeSubTab("chain")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition ${
              analyzeSubTab === "chain"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Option Chain Ladder</span>
          </button>

          <button
            onClick={() => setAnalyzeSubTab("payoff")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition ${
              analyzeSubTab === "payoff"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Strategy Payoff &amp; Scenarios</span>
          </button>

          <button
            onClick={() => setAnalyzeSubTab("pairs")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition ${
              analyzeSubTab === "pairs"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Pairs Trading &amp; Overlays</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 px-2">
          Analyzing: <b className="text-white">{selectedUnderlying.name}</b> ({selectedUnderlying.currencySymbol}{spotPrice.toLocaleString()})
        </div>
      </div>

      {/* SUB-VIEW 1: OPTION CHAIN */}
      {analyzeSubTab === "chain" && (
        <OptionChainTab
          underlying={selectedUnderlying.symbol}
          spotPrice={spotPrice}
          currencySymbol={selectedUnderlying.currencySymbol}
          onAddLegToBuilder={(leg) => {
            addDraftLeg(leg);
            setActiveSection("build");
          }}
        />
      )}

      {/* SUB-VIEW 2: PAYOFF & SCENARIOS */}
      {analyzeSubTab === "payoff" && (
        <div className="space-y-4">
          {strategyEvaluation ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7">
                <StrategyPayoffChart evaluation={strategyEvaluation} />
              </div>
              <div className="lg:col-span-5">
                <ScenarioAnalysisTable
                  spotPrice={spotPrice}
                  legs={draftLegs}
                  currencySymbol={selectedUnderlying.currencySymbol}
                />
              </div>
            </div>
          ) : (
            <div className="w-full h-48 flex items-center justify-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500 font-mono text-xs">
              No strategy configured in builder. Go to Build to select or configure a strategy.
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: PAIRS TRADING WITH INTEGRATED OPTION OVERLAYS */}
      {analyzeSubTab === "pairs" && (
        <div className="space-y-4">
          <PairsTradingTab
            onSelectPairForOptions={(pair) => {
              setSelectedPair(pair);
            }}
          />

          {/* Integrated Option Overlay Details Card for Selected Pair */}
          {selectedPair && (
            <div className="pt-2 border-t border-slate-800">
              <PairOptionsTab
                selectedPair={selectedPair}
                currencySymbol={selectedUnderlying.currencySymbol}
                onExecutePairStructure={(struct) => {
                  setPairOptionStructure(struct);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
