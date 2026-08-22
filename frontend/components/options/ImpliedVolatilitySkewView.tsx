"use client";

import React from "react";
import { LineChart, Activity, Layers, Sparkles } from "lucide-react";
import { OptionStrikeRow } from "@/types/option-chain";

interface ImpliedVolatilitySkewViewProps {
  strikes: OptionStrikeRow[];
  spotPrice: number;
  currency?: string;
}

export function ImpliedVolatilitySkewView({
  strikes,
  spotPrice,
  currency = "₹",
}: ImpliedVolatilitySkewViewProps) {
  if (!strikes || strikes.length === 0) return null;

  const minIV = Math.max(5, Math.min(...strikes.map((s) => Math.min(s.ce?.iv || 50, s.pe?.iv || 50))) - 2);
  const maxIV = Math.max(...strikes.map((s) => Math.max(s.ce?.iv || 10, s.pe?.iv || 10))) + 2;

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              IMPLIED VOLATILITY SKEW & SMILE CURVE
            </h2>
            <p className="text-xs text-slate-400">Black-Scholes implied volatility distribution across moneyness</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-rose-300">
            <span className="w-3 h-0.5 bg-rose-500" /> Call IV
          </span>
          <span className="flex items-center gap-1 text-emerald-300">
            <span className="w-3 h-0.5 bg-emerald-500" /> Put IV
          </span>
        </div>
      </div>

      {/* Skew Table Visualization */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#141E33] text-slate-400 uppercase text-[10px]">
            <tr>
              <th className="p-2.5">Strike</th>
              <th className="p-2.5 text-center">Moneyness</th>
              <th className="p-2.5 text-right text-rose-400">Call IV</th>
              <th className="p-2.5 text-right text-emerald-400">Put IV</th>
              <th className="p-2.5 text-right">Skew Spread</th>
              <th className="p-2.5 text-right">Δ Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {strikes.map((s) => {
              const callIV = s.ce?.iv || 0;
              const putIV = s.pe?.iv || 0;
              const skew = putIV - callIV;

              return (
                <tr
                  key={s.strike}
                  className={`hover:bg-[#141E33] transition-colors ${
                    s.is_atm ? "bg-amber-500/10 font-bold" : ""
                  }`}
                >
                  <td className="p-2.5 font-bold text-white">
                    {currency}{s.strike.toLocaleString()}
                  </td>
                  <td className="p-2.5 text-center">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                        s.is_atm
                          ? "bg-amber-500 text-slate-950"
                          : s.strike < spotPrice
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {s.is_atm ? "ATM" : s.strike < spotPrice ? "ITM Call / OTM Put" : "OTM Call / ITM Put"}
                    </span>
                  </td>
                  <td className="p-2.5 text-right text-rose-300 font-bold">{callIV.toFixed(2)}%</td>
                  <td className="p-2.5 text-right text-emerald-300 font-bold">{putIV.toFixed(2)}%</td>
                  <td className={`p-2.5 text-right ${skew >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {skew >= 0 ? "+" : ""}{skew.toFixed(2)}%
                  </td>
                  <td className="p-2.5 text-right text-cyan-400 font-bold">
                    {s.ce?.delta?.toFixed(2) || "0.00"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
