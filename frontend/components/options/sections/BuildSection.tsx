"use client";

import React, { useState } from "react";
import { useOptionsMarketContext } from "@/context/OptionsMarketContext";
import { StrategyPayoffChart } from "../StrategyPayoffChart";
import { ScenarioAnalysisTable } from "../ScenarioAnalysisTable";
import {
  Layers,
  Search,
  Sliders,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Unlock,
  Trash2,
  Plus,
  TrendingUp,
  TrendingDown,
  Activity,
  Play,
  Percent,
  Compass,
} from "lucide-react";

const STRATEGY_CATEGORIES = [
  "All",
  "Single Leg",
  "Vertical Spreads",
  "Volatility",
  "Winged Spreads",
  "Ratio & Backspreads",
  "Time Spreads",
  "Covered Combinations",
] as const;

const ALL_24_PRESETS = [
  { id: "long-call", name: "Long Call", category: "Single Leg", outlook: "BULLISH", risk: "DEFINED_RISK", desc: "Buy Call for defined-risk upside speculation" },
  { id: "long-put", name: "Long Put", category: "Single Leg", outlook: "BEARISH", risk: "DEFINED_RISK", desc: "Buy Put for defined-risk downside protection or speculation" },
  { id: "short-call", name: "Short Call (Naked)", category: "Single Leg", outlook: "BEARISH", risk: "UNDEFINED_RISK", desc: "Sell naked Call for premium collection" },
  { id: "short-put", name: "Short Put (Naked)", category: "Single Leg", outlook: "BULLISH", risk: "UNDEFINED_RISK", desc: "Sell naked Put for premium collection" },
  { id: "cash-secured-put", name: "Cash-Secured Put", category: "Single Leg", outlook: "NEUTRAL", risk: "DEFINED_RISK", desc: "Sell Put fully backed by 100% cash buffer" },
  { id: "bull-call-spread", name: "Bull Call Spread", category: "Vertical Spreads", outlook: "BULLISH", risk: "DEFINED_RISK", desc: "Buy lower strike Call, sell higher strike Call" },
  { id: "bear-put-spread", name: "Bear Put Spread", category: "Vertical Spreads", outlook: "BEARISH", risk: "DEFINED_RISK", desc: "Buy higher strike Put, sell lower strike Put" },
  { id: "bull-put-spread", name: "Bull Put Spread (Credit)", category: "Vertical Spreads", outlook: "BULLISH", risk: "DEFINED_RISK", desc: "Sell higher Put, buy lower Put for net credit" },
  { id: "bear-call-spread", name: "Bear Call Spread (Credit)", category: "Vertical Spreads", outlook: "BEARISH", risk: "DEFINED_RISK", desc: "Sell lower Call, buy higher Call for net credit" },
  { id: "short-iron-condor", name: "Short Iron Condor", category: "Winged Spreads", outlook: "NEUTRAL", risk: "DEFINED_RISK", desc: "Sell OTM Call Spread and OTM Put Spread for credit" },
  { id: "long-straddle", name: "Long Straddle", category: "Volatility", outlook: "VOLATILE", risk: "DEFINED_RISK", desc: "Buy ATM Call + ATM Put for explosive move" },
  { id: "long-strangle", name: "Long Strangle", category: "Volatility", outlook: "VOLATILE", risk: "DEFINED_RISK", desc: "Buy OTM Call + OTM Put for large breakout" },
  { id: "short-straddle", name: "Short Straddle", category: "Volatility", outlook: "NEUTRAL", risk: "UNDEFINED_RISK", desc: "Sell ATM Call + ATM Put for theta decay" },
  { id: "short-strangle", name: "Short Strangle", category: "Volatility", outlook: "NEUTRAL", risk: "UNDEFINED_RISK", desc: "Sell OTM Call + OTM Put for theta decay" },
  { id: "long-butterfly", name: "Long Butterfly (Call)", category: "Winged Spreads", outlook: "NEUTRAL", risk: "DEFINED_RISK", desc: "Buy 1 Low, Sell 2 Mid, Buy 1 High Strike" },
  { id: "long-condor", name: "Long Condor", category: "Winged Spreads", outlook: "NEUTRAL", risk: "DEFINED_RISK", desc: "4-strike defined-risk neutral spread" },
  { id: "ratio-front-spread", name: "Ratio Front Spread", category: "Ratio & Backspreads", outlook: "NEUTRAL", risk: "UNDEFINED_RISK", desc: "Buy 1 ITM, Sell 2 OTM Calls for credit" },
  { id: "call-backspread", name: "Call Backspread", category: "Ratio & Backspreads", outlook: "BULLISH", risk: "DEFINED_RISK", desc: "Sell 1 ITM Call, Buy 2 OTM Calls for huge upside" },
  { id: "long-calendar-spread", name: "Long Calendar Spread", category: "Time Spreads", outlook: "NEUTRAL", risk: "DEFINED_RISK", desc: "Sell near-term expiry, Buy far-term expiry" },
  { id: "diagonal-spread", name: "Diagonal Spread", category: "Time Spreads", outlook: "BULLISH", risk: "DEFINED_RISK", desc: "Different strikes and different expiries" },
  { id: "covered-call", name: "Covered Call", category: "Covered Combinations", outlook: "BULLISH", risk: "DEFINED_RISK", desc: "Long Underlying + Sell OTM Call" },
  { id: "collar", name: "Collar", category: "Covered Combinations", outlook: "NEUTRAL", risk: "DEFINED_RISK", desc: "Long Underlying + Buy Put + Sell Call" },
  { id: "long-combination", name: "Long Combination", category: "Covered Combinations", outlook: "BULLISH", risk: "UNDEFINED_RISK", desc: "Synthetic Long: Buy Call + Sell Put" },
  { id: "covered-combination", name: "Covered Combination", category: "Covered Combinations", outlook: "NEUTRAL", risk: "DEFINED_RISK", desc: "Long Underlying + Short Straddle overlay" },
];

export function BuildSection() {
  const {
    builderStep,
    setBuilderStep,
    selectedUnderlying,
    spotPrice,
    availableExpiries,
    selectedExpiry,
    setSelectedExpiry,
    selectedStrategyId,
    setSelectedStrategyId,
    draftLegs,
    addDraftLeg,
    removeDraftLeg,
    updateDraftLeg,
    isContractLocked,
    setIsContractLocked,
    strategyEvaluation,
    riskParameters,
    updateRiskParameters,
    executePaperStrategy,
    executionMode,
  } = useOptionsMarketContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [strikeSelectionMode, setStrikeSelectionMode] = useState<"STRIKE" | "PREMIUM" | "DELTA" | "MONEYNESS">("STRIKE");

  // Step 1: Filtered Presets
  const filteredPresets = ALL_24_PRESETS.filter((p) => {
    const matchesCategory = categoryFilter === "All" || p.category === categoryFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Step 2: Strike ladder for live contracts
  const step = selectedUnderlying.step;
  const atm = Math.round(spotPrice / step) * step;
  const strikeLadder = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((offset) => {
    const k = atm + offset * step;
    const isAtm = offset === 0;
    const callLtp = Math.max(5, (spotPrice - k > 0 ? spotPrice - k : 0) + spotPrice * 0.015 * Math.exp(-Math.abs(offset) * 0.25));
    const putLtp = Math.max(5, (k - spotPrice > 0 ? k - spotPrice : 0) + spotPrice * 0.015 * Math.exp(-Math.abs(offset) * 0.25));
    return {
      strike: k,
      isAtm,
      callBid: Math.round(callLtp * 0.98 * 10) / 10,
      callAsk: Math.round(callLtp * 1.02 * 10) / 10,
      callLtp: Math.round(callLtp * 10) / 10,
      callDelta: Math.round((0.50 - offset * 0.08) * 100) / 100,
      putBid: Math.round(putLtp * 0.98 * 10) / 10,
      putAsk: Math.round(putLtp * 1.02 * 10) / 10,
      putLtp: Math.round(putLtp * 10) / 10,
      putDelta: Math.round((-0.50 - offset * 0.08) * 100) / 100,
    };
  });

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* 4-Step Progress Ribbon */}
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-2.5 shadow-xl flex flex-wrap items-center justify-between gap-2">
        {[
          { step: 1, label: "1. Market & Strategy", desc: "Select structure" },
          { step: 2, label: "2. Contracts & Premium", desc: "Pick strikes & legs" },
          { step: 3, label: "3. Risk & Exit Rules", desc: "Capital & stops" },
          { step: 4, label: "4. Review & Execute", desc: "Greeks, payoff & fills" },
        ].map((s) => {
          const isActive = builderStep === s.step;
          const isPassed = builderStep > s.step;
          return (
            <button
              key={s.step}
              onClick={() => {
                if (s.step === 4) setIsContractLocked(true);
                setBuilderStep(s.step as any);
              }}
              className={`flex-1 min-w-[140px] p-2 rounded-xl text-left transition border ${
                isActive
                  ? "bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 border-cyan-500/50 shadow-md"
                  : isPassed
                  ? "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                  : "bg-slate-950/40 border-slate-850 text-slate-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-extrabold text-xs ${isActive ? "text-cyan-300" : isPassed ? "text-emerald-400" : "text-slate-400"}`}>
                  {s.label}
                </span>
                {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{s.desc}</div>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* STEP 1: MARKET & SEARCHABLE STRATEGY SELECTOR                        */}
      {/* ===================================================================== */}
      {builderStep === 1 && (
        <div className="space-y-4">
          {/* Search & Category Filter */}
          <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search 24 standard strategies (e.g. Iron Condor, Bull Call Spread)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold placeholder:text-slate-500 text-xs focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Mode:</span>
                <span className="px-2.5 py-1 rounded-xl bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-extrabold text-[11px]">
                  Manual &amp; Signal-Confirmed
                </span>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
              <span className="text-slate-400 text-[10px] mr-1">Category:</span>
              {STRATEGY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                    categoryFilter === cat
                      ? "bg-cyan-500 text-slate-950 font-extrabold shadow-sm"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 24 Strategy Preset Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPresets.map((strat) => {
              const isSelected = selectedStrategyId === strat.id;
              const isBull = strat.outlook === "BULLISH";
              const isBear = strat.outlook === "BEARISH";
              const isNeutral = strat.outlook === "NEUTRAL";

              return (
                <div
                  key={strat.id}
                  onClick={() => setSelectedStrategyId(strat.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition space-y-2 relative overflow-hidden ${
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-500/10"
                      : "bg-[#080E1E] border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-extrabold text-xs">{strat.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-black ${
                        isBull
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                          : isBear
                          ? "bg-rose-950 text-rose-400 border border-rose-500/30"
                          : isNeutral
                          ? "bg-indigo-950 text-indigo-300 border border-indigo-500/30"
                          : "bg-amber-950 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {strat.outlook}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">{strat.desc}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                    <span className="text-slate-500">{strat.category}</span>
                    <span
                      className={`font-bold ${
                        strat.risk === "DEFINED_RISK" ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {strat.risk === "DEFINED_RISK" ? "✓ Defined Risk" : "⚠ Undefined Risk"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setBuilderStep(2)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold transition shadow-lg shadow-cyan-500/20"
            >
              <span>Proceed to Contracts &amp; Premiums</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: CONTRACTS, PREMIUMS & SELECTED LEGS                          */}
      {/* ===================================================================== */}
      {builderStep === 2 && (
        <div className="space-y-4">
          {/* Contracts Controls & Selected Legs List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 6 Cols: Selected Legs Configuration */}
            <div className="lg:col-span-6 bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-extrabold text-white text-xs uppercase">
                    Configured Strategy Legs ({draftLegs.length})
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsContractLocked(!isContractLocked)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border transition ${
                      isContractLocked
                        ? "bg-amber-950 text-amber-300 border-amber-500/40"
                        : "bg-slate-900 text-slate-400 border-slate-800"
                    }`}
                  >
                    {isContractLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    <span>{isContractLocked ? "Contracts Locked" : "Auto-Strike Sync"}</span>
                  </button>

                  <button
                    onClick={() =>
                      addDraftLeg({
                        action: "BUY",
                        option_type: "CALL",
                        strike: spotPrice,
                        expiry: selectedExpiry,
                        premium: 100.0,
                        quantity: 1,
                      })
                    }
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 font-bold text-[10px]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Custom Leg</span>
                  </button>
                </div>
              </div>

              {/* Legs Table */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {draftLegs.map((leg, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    {/* Action & Type */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={leg.action}
                        onChange={(e) => updateDraftLeg(i, { action: e.target.value as any })}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black border ${
                          leg.action === "BUY"
                            ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                            : "bg-rose-950 text-rose-300 border-rose-500/40"
                        }`}
                      >
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                      </select>

                      <select
                        value={leg.option_type}
                        onChange={(e) => updateDraftLeg(i, { option_type: e.target.value as any })}
                        className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-white font-extrabold text-[10px]"
                      >
                        <option value="CALL">CALL (CE)</option>
                        <option value="PUT">PUT (PE)</option>
                      </select>
                    </div>

                    {/* Strike & Premium */}
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="text-[9px] text-slate-500 block">Strike</span>
                        <input
                          type="number"
                          value={leg.strike}
                          onChange={(e) => updateDraftLeg(i, { strike: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-white font-extrabold text-xs"
                        />
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-500 block">
                          {leg.action === "BUY" ? "Ask (Conservative)" : "Bid (Conservative)"}
                        </span>
                        <input
                          type="number"
                          value={leg.premium}
                          onChange={(e) => updateDraftLeg(i, { premium: parseFloat(e.target.value) || 0 })}
                          className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-extrabold text-xs"
                        />
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-500 block">Qty</span>
                        <input
                          type="number"
                          value={leg.quantity}
                          onChange={(e) => updateDraftLeg(i, { quantity: parseFloat(e.target.value) || 1 })}
                          className="w-12 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-white font-extrabold text-xs"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => removeDraftLeg(i)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition"
                      title="Remove Leg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Net Cash Flow Summary */}
              {strategyEvaluation && (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Net Flow: </span>
                    <span className="text-white font-black">{strategyEvaluation.nature}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-cyan-300 font-black text-sm">
                      {selectedUnderlying.currencySymbol}{strategyEvaluation.net_premium.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Estimated Entry Cost</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right 6 Cols: Live Option Chain Quick Selector */}
            <div className="lg:col-span-6 bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 overflow-x-auto">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <h4 className="text-white font-bold text-xs uppercase">
                  Option Ladder ({selectedUnderlying.symbol} • ATM: {atm})
                </h4>
                <span className="text-[10px] text-slate-400">Click +B / +S to append</span>
              </div>

              <table className="w-full text-center border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-1 px-1 text-left">Call Bid/Ask</th>
                    <th className="py-1 px-2 text-cyan-400 font-bold">Strike</th>
                    <th className="py-1 px-1 text-right">Put Bid/Ask</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {strikeLadder.map((row) => (
                    <tr key={row.strike} className={`hover:bg-slate-900/60 ${row.isAtm ? "bg-cyan-950/20 font-bold" : ""}`}>
                      {/* Call Column */}
                      <td className="py-1.5 px-1 text-left">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              addDraftLeg({
                                action: "BUY",
                                option_type: "CALL",
                                strike: row.strike,
                                expiry: selectedExpiry,
                                premium: row.callAsk,
                                quantity: 1,
                              })
                            }
                            className="px-1 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-bold"
                          >
                            +B {row.callAsk}
                          </button>
                          <button
                            onClick={() =>
                              addDraftLeg({
                                action: "SELL",
                                option_type: "CALL",
                                strike: row.strike,
                                expiry: selectedExpiry,
                                premium: row.callBid,
                                quantity: 1,
                              })
                            }
                            className="px-1 py-0.5 rounded bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-bold"
                          >
                            +S {row.callBid}
                          </button>
                        </div>
                      </td>

                      {/* Strike */}
                      <td className="py-1.5 px-2 font-extrabold text-white bg-slate-900/80">
                        {row.strike}
                      </td>

                      {/* Put Column */}
                      <td className="py-1.5 px-1 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              addDraftLeg({
                                action: "BUY",
                                option_type: "PUT",
                                strike: row.strike,
                                expiry: selectedExpiry,
                                premium: row.putAsk,
                                quantity: 1,
                              })
                            }
                            className="px-1 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-bold"
                          >
                            +B {row.putAsk}
                          </button>
                          <button
                            onClick={() =>
                              addDraftLeg({
                                action: "SELL",
                                option_type: "PUT",
                                strike: row.strike,
                                expiry: selectedExpiry,
                                premium: row.putBid,
                                quantity: 1,
                              })
                            }
                            className="px-1 py-0.5 rounded bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-bold"
                          >
                            +S {row.putBid}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setBuilderStep(1)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Strategy</span>
            </button>

            <button
              onClick={() => setBuilderStep(3)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold transition shadow-lg shadow-cyan-500/20"
            >
              <span>Proceed to Risk &amp; Exit Rules</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 3: RISK & EXIT PARAMETERS                                        */}
      {/* ===================================================================== */}
      {builderStep === 3 && (
        <div className="space-y-4">
          <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
            <h3 className="font-extrabold text-white text-xs uppercase pb-2 border-b border-slate-800 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              Capital Sizing &amp; Automated Exit Controls
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Capital & Lots */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold">Allocated Capital ({selectedUnderlying.currencySymbol})</label>
                <input
                  type="number"
                  value={riskParameters.allocatedCapital}
                  onChange={(e) => updateRiskParameters({ allocatedCapital: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-extrabold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold">Strategy Lots (Multi: {selectedUnderlying.multiplier})</label>
                <input
                  type="number"
                  min="1"
                  value={riskParameters.lots}
                  onChange={(e) => updateRiskParameters({ lots: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-extrabold"
                />
              </div>

              {/* Stop Loss & Profit Target */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold">Stop Loss (% of Debit / Margin)</label>
                <input
                  type="number"
                  value={riskParameters.stopLossPct}
                  onChange={(e) => updateRiskParameters({ stopLossPct: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-rose-400 font-extrabold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold">Profit Target (%)</label>
                <input
                  type="number"
                  value={riskParameters.profitTargetPct}
                  onChange={(e) => updateRiskParameters({ profitTargetPct: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-extrabold"
                />
              </div>

              {/* Trailing Stop & Expiry Exit */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold">Trailing Stop Activation (%)</label>
                <input
                  type="number"
                  value={riskParameters.trailingStopPct}
                  onChange={(e) => updateRiskParameters({ trailingStopPct: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-extrabold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold">Time / Expiry Exit (DTE)</label>
                <input
                  type="number"
                  value={riskParameters.timeExitDte}
                  onChange={(e) => updateRiskParameters({ timeExitDte: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-extrabold"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setBuilderStep(2)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Contracts</span>
            </button>

            <button
              onClick={() => {
                setIsContractLocked(true);
                setBuilderStep(4);
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold transition shadow-lg shadow-cyan-500/20"
            >
              <span>Lock Contracts &amp; Review Strategy</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 4: REVIEW & EXECUTE                                              */}
      {/* ===================================================================== */}
      {builderStep === 4 && strategyEvaluation && (
        <div className="space-y-4">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl">
              <div className="text-[10px] text-slate-400">Net Premium Flow</div>
              <div className="font-black text-sm text-cyan-300">
                {selectedUnderlying.currencySymbol}{strategyEvaluation.net_premium.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400">{strategyEvaluation.nature}</div>
            </div>

            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl">
              <div className="text-[10px] text-slate-400">Max Profit</div>
              <div className="font-extrabold text-sm text-emerald-400">
                {strategyEvaluation.max_profit === null
                  ? "Unlimited"
                  : `${selectedUnderlying.currencySymbol}${strategyEvaluation.max_profit.toLocaleString()}`}
              </div>
              <div className="text-[10px] text-slate-400">Defined Cap</div>
            </div>

            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl">
              <div className="text-[10px] text-slate-400">Max Loss</div>
              <div className="font-extrabold text-sm text-rose-400">
                {strategyEvaluation.max_loss === null
                  ? "Undefined (Tail Risk)"
                  : `${selectedUnderlying.currencySymbol}${strategyEvaluation.max_loss.toLocaleString()}`}
              </div>
              <div className="text-[10px] text-slate-400">Worst Case Scenario</div>
            </div>

            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl">
              <div className="text-[10px] text-slate-400">Breakeven(s)</div>
              <div className="font-extrabold text-sm text-white">
                {strategyEvaluation.breakevens.map((b) => `${selectedUnderlying.currencySymbol}${b}`).join(", ") || "N/A"}
              </div>
              <div className="text-[10px] text-slate-400">At Expiry Zero P&L</div>
            </div>

            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl">
              <div className="text-[10px] text-slate-400">Position Delta (&Delta;)</div>
              <div className="font-extrabold text-sm text-cyan-400">
                {strategyEvaluation.aggregate_greeks?.delta ?? 0.0}
              </div>
              <div className="text-[10px] text-slate-400">
                &Gamma;: {strategyEvaluation.aggregate_greeks?.gamma ?? 0.0}
              </div>
            </div>

            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl">
              <div className="text-[10px] text-slate-400">Theta Decay (&Theta;)</div>
              <div className="font-extrabold text-sm text-rose-400">
                {selectedUnderlying.currencySymbol}{strategyEvaluation.aggregate_greeks?.theta ?? 0.0}/day
              </div>
              <div className="text-[10px] text-slate-400">
                &Nu;: {strategyEvaluation.aggregate_greeks?.vega ?? 0.0}
              </div>
            </div>
          </div>

          {/* Payoff Visualizer & Scenario Analysis Table */}
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

          {/* Navigation & Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setBuilderStep(3)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Risk Rules</span>
            </button>

            <button
              onClick={executePaperStrategy}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-black transition shadow-lg shadow-cyan-500/20 text-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Execute Strategy in Paper Sandbox</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
