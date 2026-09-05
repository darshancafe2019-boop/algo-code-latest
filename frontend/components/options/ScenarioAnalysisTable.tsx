"use client";

import React from "react";
import { OptionLeg, StrategyEvaluationResult } from "@/types/options-workstation";

export interface ScenarioAnalysisTableProps {
  evaluation?: StrategyEvaluationResult | null;
  legs?: OptionLeg[];
  spotPrice?: number;
  currencySymbol?: string;
}

export function ScenarioAnalysisTable(props: ScenarioAnalysisTableProps) {
  const currencySymbol = props.currencySymbol || "₹";
  const legs = props.legs || props.evaluation?.legs || [];
  const spot = props.spotPrice || props.evaluation?.spot_price || 0;
  const netCashFlow = props.evaluation?.net_cash_flow ?? (
    legs.reduce((acc, l) => acc + (l.action === "SELL" ? 1 : -1) * l.premium * l.quantity * (l.multiplier || 1), 0)
  );

  if (legs.length === 0 || spot <= 0) {
    return null;
  }

  const shifts = [-0.20, -0.15, -0.10, -0.05, -0.02, 0.0, 0.02, 0.05, 0.10, 0.15, 0.20];

  const calcPnlAtPrice = (pVal: number) => {
    let val = netCashFlow;
    for (const leg of legs) {
      const mult = leg.action === "BUY" ? 1.0 : -1.0;
      const legMult = leg.multiplier || 1.0;
      const qty = leg.quantity;
      if (leg.option_type === "STOCK") {
        val += mult * (pVal - leg.strike) * qty * legMult;
      } else if (leg.option_type === "CALL" || leg.option_type === "CE") {
        val += mult * Math.max(0, pVal - leg.strike) * qty * legMult;
      } else {
        val += mult * Math.max(0, leg.strike - pVal) * qty * legMult;
      }
    }
    return val;
  };

  return (
    <div className="w-full bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl font-mono text-xs overflow-x-auto">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-slate-200 font-bold text-sm">
          Price Shift Scenario Matrix (At Expiry)
        </h4>
        <span className="text-slate-400 text-[11px]">
          Spot: {currencySymbol}{spot.toLocaleString()}
        </span>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
            <th className="py-2 px-3">Shift (%)</th>
            <th className="py-2 px-3">Underlying Price</th>
            <th className="py-2 px-3">Net P&L ({currencySymbol})</th>
            <th className="py-2 px-3">ROI (%)</th>
            <th className="py-2 px-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-850">
          {shifts.map((s, idx) => {
            const simPrice = spot * (1.0 + s);
            const pnl = calcPnlAtPrice(simPrice);
            const isSpot = Math.abs(s) < 0.001;
            const isProfit = pnl > 0;
            const netCost = props.evaluation?.net_premium || Math.abs(netCashFlow) || 1.0;
            const roi = (pnl / netCost) * 100.0;

            return (
              <tr
                key={`shift-${s}-${idx}`}
                className={`hover:bg-slate-900/60 transition ${
                  isSpot ? "bg-cyan-950/30 font-bold border-l-2 border-cyan-400" : ""
                }`}
              >
                <td className="py-2 px-3 text-slate-300">
                  {s > 0 ? `+${(s * 100).toFixed(0)}%` : `${(s * 100).toFixed(0)}%`}
                  {isSpot && <span className="ml-1 text-cyan-400 font-extrabold">(Spot)</span>}
                </td>
                <td className="py-2 px-3 text-white font-bold">
                  {currencySymbol}{simPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td
                  className={`py-2 px-3 font-extrabold ${
                    pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {pnl >= 0 ? "+" : ""}
                  {currencySymbol}{pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td
                  className={`py-2 px-3 font-bold ${
                    roi >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {roi >= 0 ? "+" : ""}
                  {roi.toFixed(1)}%
                </td>
                <td className="py-2 px-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      pnl > 0
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : pnl < 0
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {pnl > 0 ? "PROFIT" : pnl < 0 ? "LOSS" : "BREAKEVEN"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
