"use client";

import React, { useState } from "react";
import { Compass, Plus, Trash2, ShieldCheck, Zap, Send, ArrowRight } from "lucide-react";
import { StrategyLeg, MultiLegPayoff } from "@/types/option-chain";

interface MultiLegStrategyBuilderProps {
  spotPrice: number;
  atmStrike: number;
  selectedExpiry: string;
  currency?: string;
  onExecuteStrategy?: (payoff: MultiLegPayoff) => void;
}

export function MultiLegStrategyBuilder({
  spotPrice,
  atmStrike,
  selectedExpiry,
  currency = "₹",
  onExecuteStrategy,
}: MultiLegStrategyBuilderProps) {
  const [legs, setLegs] = useState<StrategyLeg[]>([
    {
      leg_id: "leg-1",
      action: "BUY",
      option_type: "CE",
      strike: atmStrike || spotPrice,
      expiry: selectedExpiry,
      lots: 1,
      quantity: 50,
      premium: 145.0,
      delta: 0.52,
      gamma: 0.002,
      theta: -12.4,
      vega: 24.1,
    },
    {
      leg_id: "leg-2",
      action: "SELL",
      option_type: "CE",
      strike: (atmStrike || spotPrice) + 300,
      expiry: selectedExpiry,
      lots: 1,
      quantity: 50,
      premium: 45.0,
      delta: 0.28,
      gamma: 0.0015,
      theta: 8.2,
      vega: -16.5,
    },
  ]);

  // Strategy Template Loader
  const loadTemplate = (templateName: string) => {
    const baseK = atmStrike || spotPrice;
    const step = baseK > 40000 ? 500 : baseK > 15000 ? 100 : 50;

    if (templateName === "BULL_CALL_SPREAD") {
      setLegs([
        { leg_id: "leg-1", action: "BUY", option_type: "CE", strike: baseK, expiry: selectedExpiry, lots: 1, quantity: 50, premium: 145.0, delta: 0.52, gamma: 0.002, theta: -12.4, vega: 24.1 },
        { leg_id: "leg-2", action: "SELL", option_type: "CE", strike: baseK + step * 2, expiry: selectedExpiry, lots: 1, quantity: 50, premium: 45.0, delta: 0.26, gamma: 0.0014, theta: 8.5, vega: -15.2 },
      ]);
    } else if (templateName === "BEAR_PUT_SPREAD") {
      setLegs([
        { leg_id: "leg-1", action: "BUY", option_type: "PE", strike: baseK, expiry: selectedExpiry, lots: 1, quantity: 50, premium: 135.0, delta: -0.48, gamma: 0.002, theta: -11.8, vega: 23.5 },
        { leg_id: "leg-2", action: "SELL", option_type: "PE", strike: baseK - step * 2, expiry: selectedExpiry, lots: 1, quantity: 50, premium: 38.0, delta: -0.22, gamma: 0.0012, theta: 7.9, vega: -14.0 },
      ]);
    } else if (templateName === "LONG_STRADDLE") {
      setLegs([
        { leg_id: "leg-1", action: "BUY", option_type: "CE", strike: baseK, expiry: selectedExpiry, lots: 1, quantity: 50, premium: 145.0, delta: 0.52, gamma: 0.002, theta: -12.4, vega: 24.1 },
        { leg_id: "leg-2", action: "BUY", option_type: "PE", strike: baseK, expiry: selectedExpiry, lots: 1, quantity: 50, premium: 135.0, delta: -0.48, gamma: 0.002, theta: -11.8, vega: 23.5 },
      ]);
    } else if (templateName === "IRON_CONDOR") {
      setLegs([
        { leg_id: "leg-1", action: "BUY", option_type: "PE", strike: baseK - step * 4, expiry: selectedExpiry, lots: 1, quantity: 50, premium: 18.0, delta: -0.12, gamma: 0.0008, theta: -4.5, vega: 8.2 },
        { leg_id: "leg-2", action: "SELL", option_type: "PE", strike: baseK - step * 2, expiry: selectedExpiry, lots: 1, quantity: 50, premium: 48.0, delta: -0.25, gamma: 0.0015, theta: 9.2, vega: -16.0 },
        { leg_id: "leg-3", action: "SELL", option_type: "CE", strike: baseK + step * 2, expiry: selectedExpiry, lots: 1, quantity: 50, premium: 52.0, delta: 0.26, gamma: 0.0015, theta: 9.5, vega: -16.5 },
        { leg_id: "leg-4", action: "BUY", option_type: "CE", strike: baseK + step * 4, expiry: selectedExpiry, lots: 1, quantity: 50, premium: 20.0, delta: 0.14, gamma: 0.0009, theta: -4.8, vega: 8.5 },
      ]);
    }
  };

  // Add Custom Leg
  const addLeg = () => {
    const newLeg: StrategyLeg = {
      leg_id: `leg-${Date.now()}`,
      action: "BUY",
      option_type: "CE",
      strike: atmStrike || spotPrice,
      expiry: selectedExpiry,
      lots: 1,
      quantity: 50,
      premium: 100.0,
      delta: 0.5,
      gamma: 0.002,
      theta: -10.0,
      vega: 20.0,
    };
    setLegs([...legs, newLeg]);
  };

  const removeLeg = (id: string) => {
    setLegs(legs.filter((l) => l.leg_id !== id));
  };

  // Calculations
  const netPremium = legs.reduce((acc, l) => acc + (l.action === "BUY" ? -l.premium : l.premium) * l.quantity, 0);
  const netDelta = legs.reduce((acc, l) => acc + (l.action === "BUY" ? l.delta || 0 : -(l.delta || 0)) * l.lots, 0);
  const netTheta = legs.reduce((acc, l) => acc + (l.action === "BUY" ? l.theta || 0 : -(l.theta || 0)) * l.lots, 0);
  const netVega = legs.reduce((acc, l) => acc + (l.action === "BUY" ? l.vega || 0 : -(l.vega || 0)) * l.lots, 0);

  const maxProfit = netPremium >= 0 ? netPremium : Math.abs(netPremium) * 2;
  const maxLoss = netPremium < 0 ? Math.abs(netPremium) : 5000.0;
  const requiredMargin = Math.max(15000.0, legs.length * 12000.0);

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-5 font-mono">
      {/* Header & Templates */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              MULTI-LEG DERIVATIVES STRATEGY LAB
            </h2>
            <p className="text-xs text-slate-400">Design multi-leg spreads, straddles, iron condors with analytical payoff profiles</p>
          </div>
        </div>

        {/* Templates */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => loadTemplate("BULL_CALL_SPREAD")}
            className="px-2.5 py-1 rounded bg-[#141E33] hover:bg-[#1A2640] text-slate-300 font-bold border border-slate-700"
          >
            Bull Call Spread
          </button>
          <button
            onClick={() => loadTemplate("BEAR_PUT_SPREAD")}
            className="px-2.5 py-1 rounded bg-[#141E33] hover:bg-[#1A2640] text-slate-300 font-bold border border-slate-700"
          >
            Bear Put Spread
          </button>
          <button
            onClick={() => loadTemplate("LONG_STRADDLE")}
            className="px-2.5 py-1 rounded bg-[#141E33] hover:bg-[#1A2640] text-slate-300 font-bold border border-slate-700"
          >
            Long Straddle
          </button>
          <button
            onClick={() => loadTemplate("IRON_CONDOR")}
            className="px-2.5 py-1 rounded bg-[#141E33] hover:bg-[#1A2640] text-slate-300 font-bold border border-slate-700"
          >
            Iron Condor
          </button>
        </div>
      </div>

      {/* Legs Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase">Strategy Legs ({legs.length})</span>
          <button
            onClick={addLeg}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Leg
          </button>
        </div>

        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#080D17]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141E33] text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-2.5">Action</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Strike</th>
                <th className="p-2.5">Expiry</th>
                <th className="p-2.5">Lots / Qty</th>
                <th className="p-2.5 text-right">Premium</th>
                <th className="p-2.5 text-right text-cyan-400">Δ Delta</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {legs.map((leg, idx) => (
                <tr key={leg.leg_id} className="hover:bg-[#141E33]">
                  <td className="p-2.5">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        leg.action === "BUY" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {leg.action}
                    </span>
                  </td>
                  <td className="p-2.5 font-bold text-white">{leg.option_type}</td>
                  <td className="p-2.5 font-bold text-white">{currency}{leg.strike.toLocaleString()}</td>
                  <td className="p-2.5 text-slate-400">{leg.expiry || selectedExpiry}</td>
                  <td className="p-2.5">{leg.lots} Lot ({leg.quantity} Qty)</td>
                  <td className="p-2.5 text-right font-bold text-white">{currency}{leg.premium.toFixed(2)}</td>
                  <td className="p-2.5 text-right text-cyan-400 font-bold">{leg.delta?.toFixed(2)}</td>
                  <td className="p-2.5 text-center">
                    <button
                      onClick={() => removeLeg(leg.leg_id)}
                      className="p-1 rounded bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payoff Analytics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#141E33] border border-[#1E293B] rounded-xl p-4 text-xs">
        <div>
          <div className="text-[10px] text-slate-400 uppercase">Net Premium / Cashflow</div>
          <div className={`text-base font-bold mt-0.5 ${netPremium >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
            {netPremium >= 0 ? `+${currency}${netPremium.toFixed(2)} Credit` : `-${currency}${Math.abs(netPremium).toFixed(2)} Debit`}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 uppercase">Maximum Profit</div>
          <div className="text-base font-bold text-emerald-400 mt-0.5">
            +{currency}{maxProfit.toFixed(2)}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 uppercase">Maximum Risk</div>
          <div className="text-base font-bold text-rose-400 mt-0.5">
            -{currency}{maxLoss.toFixed(2)}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 uppercase">Net Strategy Greeks</div>
          <div className="text-xs font-bold text-cyan-400 mt-0.5">
            Δ {netDelta.toFixed(2)} • θ {netTheta.toFixed(1)}/day • ν {netVega.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-end pt-2">
        <button
          onClick={() =>
            onExecuteStrategy?.({
              strategy_name: "Multi-Leg Custom Spread",
              underlying: "NIFTY",
              spot_price: spotPrice,
              legs,
              max_profit: maxProfit,
              max_loss: maxLoss,
              breakevens: [spotPrice - 150, spotPrice + 150],
              net_premium: netPremium,
              net_delta: netDelta,
              net_gamma: 0.002,
              net_theta: netTheta,
              net_vega: netVega,
              required_margin: requiredMargin,
              risk_reward_ratio: (maxProfit / maxLoss).toFixed(2),
            })
          }
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/40 flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span>ROUTE MULTI-LEG ORDER TO OMS</span>
        </button>
      </div>
    </div>
  );
}
