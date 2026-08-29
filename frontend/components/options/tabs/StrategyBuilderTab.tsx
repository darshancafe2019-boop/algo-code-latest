"use client";

import React, { useState, useEffect } from "react";
import {
  StrategyEvaluationResult,
  OptionLeg,
  StrategyMetadata
} from "@/types/options-workstation";
import { StrategyPayoffChart } from "../StrategyPayoffChart";
import { ScenarioAnalysisTable } from "../ScenarioAnalysisTable";
import {
  Plus,
  Trash2,
  Sliders,
  Layers,
  Activity,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Info
} from "lucide-react";

export interface StrategyBuilderTabProps {
  underlying: string;
  spotPrice: number;
  currencySymbol: string;
  onExecutePaperTrade?: (payload: any) => void;
  onRunValidation?: (legs: OptionLeg[]) => void;
}

const STRATEGY_PRESETS = [
  { id: "long-call", name: "Long Call", category: "Single Leg", outlook: "BULLISH" },
  { id: "long-put", name: "Long Put", category: "Single Leg", outlook: "BEARISH" },
  { id: "short-call", name: "Short Call", category: "Single Leg", outlook: "BEARISH" },
  { id: "short-put", name: "Short Put", category: "Single Leg", outlook: "BULLISH" },
  { id: "cash-secured-put", name: "Cash-Secured Put", category: "Single Leg", outlook: "BULLISH" },
  { id: "bull-call-spread", name: "Bull Call Spread", category: "Vertical Spreads", outlook: "BULLISH" },
  { id: "bear-put-spread", name: "Bear Put Spread", category: "Vertical Spreads", outlook: "BEARISH" },
  { id: "bull-put-spread", name: "Bull Put Spread", category: "Vertical Spreads", outlook: "BULLISH" },
  { id: "bear-call-spread", name: "Bear Call Spread", category: "Vertical Spreads", outlook: "BEARISH" },
  { id: "short-iron-condor", name: "Short Iron Condor", category: "Iron Condors & Butterflies", outlook: "NEUTRAL" },
  { id: "ratio-front-spread", name: "Ratio Front Spread", category: "Ratio Spreads", outlook: "NEUTRAL" },
  { id: "call-backspread", name: "Call Backspread", category: "Ratio Spreads", outlook: "VOLATILE" },
  { id: "long-straddle", name: "Long Straddle", category: "Volatility", outlook: "VOLATILE" },
  { id: "long-strangle", name: "Long Strangle", category: "Volatility", outlook: "VOLATILE" },
  { id: "short-straddle", name: "Short Straddle", category: "Volatility", outlook: "NEUTRAL" },
  { id: "short-strangle", name: "Short Strangle", category: "Volatility", outlook: "NEUTRAL" },
  { id: "long-butterfly", name: "Long Butterfly", category: "Iron Condors & Butterflies", outlook: "NEUTRAL" },
  { id: "long-condor", name: "Long Condor", category: "Iron Condors & Butterflies", outlook: "NEUTRAL" },
  { id: "long-calendar-spread", name: "Long Calendar Spread", category: "Time Spreads", outlook: "NEUTRAL" },
  { id: "diagonal-spread", name: "Diagonal Spread", category: "Time Spreads", outlook: "BULLISH" },
  { id: "covered-call", name: "Covered Call", category: "Underlying Combinations", outlook: "BULLISH" },
  { id: "long-combination", name: "Long Combination", category: "Underlying Combinations", outlook: "BULLISH" },
  { id: "collar", name: "Collar", category: "Underlying Combinations", outlook: "BULLISH" },
  { id: "covered-combination", name: "Covered Combination", category: "Underlying Combinations", outlook: "NEUTRAL" },
];

export function StrategyBuilderTab({
  underlying = "NIFTY",
  spotPrice = 24800,
  currencySymbol = "₹",
  onExecutePaperTrade,
  onRunValidation,
}: StrategyBuilderTabProps) {
  const [selectedStrategyId, setSelectedStrategyId] = useState("bull-call-spread");
  const [lots, setLots] = useState(1);
  const [legs, setLegs] = useState<OptionLeg[]>([]);
  const [evaluation, setEvaluation] = useState<StrategyEvaluationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load preset on strategy selection
  useEffect(() => {
    const step = spotPrice > 10000 ? 50 : spotPrice > 1000 ? 10 : 2.5;
    const atm = Math.round(spotPrice / step) * step;

    if (selectedStrategyId === "bull-call-spread") {
      setLegs([
        { action: "BUY", option_type: "CALL", strike: atm, expiry: "28-SEP-2026", premium: spotPrice * 0.025, quantity: 1, delta: 0.52, gamma: 0.001, theta: -12.5, vega: 24 },
        { action: "SELL", option_type: "CALL", strike: atm + step * 2, expiry: "28-SEP-2026", premium: spotPrice * 0.012, quantity: 1, delta: -0.28, gamma: -0.0008, theta: 8.0, vega: -16 },
      ]);
    } else if (selectedStrategyId === "short-iron-condor") {
      setLegs([
        { action: "BUY", option_type: "PUT", strike: atm - step * 3, expiry: "28-SEP-2026", premium: spotPrice * 0.006, quantity: 1, delta: -0.12 },
        { action: "SELL", option_type: "PUT", strike: atm - step, expiry: "28-SEP-2026", premium: spotPrice * 0.018, quantity: 1, delta: 0.30 },
        { action: "SELL", option_type: "CALL", strike: atm + step, expiry: "28-SEP-2026", premium: spotPrice * 0.018, quantity: 1, delta: -0.30 },
        { action: "BUY", option_type: "CALL", strike: atm + step * 3, expiry: "28-SEP-2026", premium: spotPrice * 0.006, quantity: 1, delta: 0.12 },
      ]);
    } else if (selectedStrategyId === "long-straddle") {
      setLegs([
        { action: "BUY", option_type: "CALL", strike: atm, expiry: "28-SEP-2026", premium: spotPrice * 0.028, quantity: 1, delta: 0.50 },
        { action: "BUY", option_type: "PUT", strike: atm, expiry: "28-SEP-2026", premium: spotPrice * 0.028, quantity: 1, delta: -0.50 },
      ]);
    } else if (selectedStrategyId === "covered-call") {
      setLegs([
        { action: "BUY", option_type: "STOCK", strike: spotPrice, expiry: "SPOT", premium: spotPrice, quantity: 1, delta: 1.0 },
        { action: "SELL", option_type: "CALL", strike: atm + step, expiry: "28-SEP-2026", premium: spotPrice * 0.020, quantity: 1, delta: -0.35 },
      ]);
    } else {
      // Default single leg Long Call
      setLegs([
        { action: "BUY", option_type: "CALL", strike: atm, expiry: "28-SEP-2026", premium: spotPrice * 0.030, quantity: 1, delta: 0.50 },
      ]);
    }
  }, [selectedStrategyId, spotPrice]);

  const evaluateCurrentStrategy = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/options/strategy/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy_name: selectedStrategyId,
          underlying,
          spot_price: spotPrice,
          legs,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvaluation(data);
      }
    } catch (err) {
      console.error("Evaluation error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [legs, selectedStrategyId, spotPrice, underlying]);

  // Evaluate strategy payoff curve whenever legs change
  useEffect(() => {
    if (legs.length === 0) return;
    evaluateCurrentStrategy();
  }, [evaluateCurrentStrategy, legs.length]);

  const handleAddLeg = () => {
    const step = spotPrice > 10000 ? 50 : 10;
    const atm = Math.round(spotPrice / step) * step;
    setLegs([
      ...legs,
      {
        action: "BUY",
        option_type: "CALL",
        strike: atm,
        expiry: "28-SEP-2026",
        premium: spotPrice * 0.02,
        quantity: 1,
        delta: 0.5,
      },
    ]);
  };

  const handleRemoveLeg = (idx: number) => {
    setLegs(legs.filter((_, i) => i !== idx));
  };

  const handleUpdateLeg = (idx: number, field: keyof OptionLeg, val: any) => {
    const updated = [...legs];
    updated[idx] = { ...updated[idx], [field]: val };
    setLegs(updated);
  };

  return (
    <div className="space-y-4">
      {/* Strategy Preset Selector Ribbon */}
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl">
        <div className="flex items-center justify-between gap-2 mb-2 font-mono text-xs">
          <span className="text-slate-400 font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            24 Visual Guide Strategy Templates:
          </span>
          <span className="text-cyan-400 font-extrabold text-[11px]">
            {STRATEGY_PRESETS.find((s) => s.id === selectedStrategyId)?.category || "All"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto pr-1">
          {STRATEGY_PRESETS.map((strat) => (
            <button
              key={strat.id}
              onClick={() => setSelectedStrategyId(strat.id)}
              className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition flex items-center gap-1 ${
                selectedStrategyId === strat.id
                  ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                  : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <span>{strat.name}</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-black ${
                  strat.outlook === "BULLISH"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                    : strat.outlook === "BEARISH"
                    ? "bg-rose-950 text-rose-400 border border-rose-500/30"
                    : strat.outlook === "VOLATILE"
                    ? "bg-purple-950 text-purple-400 border border-purple-500/30"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {strat.outlook[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Legs Editor on Left, Payoff on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 5 Cols: Multi-Leg Editor */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="font-mono text-xs font-bold text-slate-200 uppercase">
                  Configured Legs ({legs.length}/6)
                </h3>
              </div>
              <button
                onClick={handleAddLeg}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/40 text-xs font-mono font-bold transition"
              >
                <Plus className="w-3 h-3" />
                <span>Add Leg</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {legs.map((leg, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 font-mono text-xs space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={leg.action}
                        onChange={(e) => handleUpdateLeg(idx, "action", e.target.value)}
                        className={`px-2 py-0.5 rounded font-black text-xs border ${
                          leg.action === "BUY"
                            ? "bg-emerald-950 text-emerald-400 border-emerald-600"
                            : "bg-rose-950 text-rose-400 border-rose-600"
                        }`}
                      >
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                      </select>

                      <select
                        value={leg.option_type}
                        onChange={(e) => handleUpdateLeg(idx, "option_type", e.target.value)}
                        className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200 font-bold"
                      >
                        <option value="CALL">CE (Call)</option>
                        <option value="PUT">PE (Put)</option>
                        <option value="STOCK">Underlying</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleRemoveLeg(idx)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                      title="Remove Leg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Strike</label>
                      <input
                        type="number"
                        value={leg.strike}
                        onChange={(e) => handleUpdateLeg(idx, "strike", parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Premium</label>
                      <input
                        type="number"
                        step="0.1"
                        value={leg.premium}
                        onChange={(e) => handleUpdateLeg(idx, "premium", parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Qty (Ratio)</label>
                      <input
                        type="number"
                        min="1"
                        value={leg.quantity}
                        onChange={(e) => handleUpdateLeg(idx, "quantity", parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Strategy Summary Pills */}
            {evaluation && (
              <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Net Cost/Credit</div>
                  <div
                    className={`font-black text-sm ${
                      evaluation.nature === "NET DEBIT" ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {evaluation.nature}: {currencySymbol}{evaluation.net_premium.toLocaleString()}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Req. Margin</div>
                  <div className="font-black text-sm text-cyan-400">
                    {currencySymbol}{evaluation.required_margin.toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Aggregate Greeks Card */}
          {evaluation?.aggregate_greeks && (
            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl font-mono text-xs">
              <div className="flex items-center gap-1.5 mb-2 text-slate-400 font-bold text-[11px]">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                Aggregate Strategy Greeks:
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">&Delta; Delta</div>
                  <div className="font-bold text-white text-xs">{evaluation.aggregate_greeks.delta.toFixed(2)}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">&Gamma; Gamma</div>
                  <div className="font-bold text-white text-xs">{evaluation.aggregate_greeks.gamma.toFixed(4)}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">&Theta; Theta</div>
                  <div className="font-bold text-rose-400 text-xs">{evaluation.aggregate_greeks.theta.toFixed(1)}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">&Nu; Vega</div>
                  <div className="font-bold text-indigo-400 text-xs">{evaluation.aggregate_greeks.vega.toFixed(1)}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">&Rho; Rho</div>
                  <div className="font-bold text-slate-300 text-xs">{evaluation.aggregate_greeks.rho.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 7 Cols: Interactive Payoff Chart & Scenario Table */}
        <div className="lg:col-span-7 space-y-4">
          {evaluation && (
            <StrategyPayoffChart
              payoffCurve={evaluation.payoff_curve}
              spotPrice={spotPrice}
              breakevens={evaluation.breakevens}
              maxProfit={evaluation.max_profit}
              maxLoss={evaluation.max_loss}
              currencySymbol={currencySymbol}
              underlyingName={underlying}
            />
          )}

          {evaluation && (
            <ScenarioAnalysisTable evaluation={evaluation} currencySymbol={currencySymbol} />
          )}
        </div>
      </div>
    </div>
  );
}
