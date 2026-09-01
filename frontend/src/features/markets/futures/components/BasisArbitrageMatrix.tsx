"use client";

import React from "react";
import { CanonicalFuturesContract } from "../types/futures";
import { Zap, Activity, ArrowRight, ShieldCheck } from "lucide-react";

interface BasisArbitrageMatrixProps {
  contracts: CanonicalFuturesContract[];
}

export function BasisArbitrageMatrix({ contracts }: BasisArbitrageMatrixProps) {
  const basisContracts = contracts.filter((c) => c.basis !== undefined);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-[#0B132B] border border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs font-sans">
        <div>
          <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            Spot vs. Futures Cash-and-Carry Basis Matrix
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Identify contango premiums and backwardation discounts for delta-neutral arbitrage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
            DELTA-NEUTRAL READY
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
        {basisContracts.map((c) => {
          const b = c.basis!;
          const isContango = b.regime === "CONTANGO";

          return (
            <div
              key={c.symbol}
              className="p-4 rounded-2xl bg-[#0B132B] border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{c.symbol}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isContango
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                      : "bg-purple-950 text-purple-400 border border-purple-500/30"
                  }`}
                >
                  {b.regime}
                </span>
              </div>

              <div className="space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Spot Reference</span>
                  <span className="text-slate-200 font-bold">${b.spot_price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Futures Price</span>
                  <span className="text-white font-bold">${b.futures_price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Spread (Basis)</span>
                  <span className={b.basis_absolute >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                    {b.basis_absolute >= 0 ? `+$${b.basis_absolute}` : `-$${Math.abs(b.basis_absolute)}`} ({b.basis_percentage}%)
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 text-slate-300 font-bold">
                  <span>Annualized Basis Yield</span>
                  <span className="text-cyan-400 text-sm">+{b.annualized_basis}% APR</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
