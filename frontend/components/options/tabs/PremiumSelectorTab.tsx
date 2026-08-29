"use client";

import React, { useState } from "react";
import { Sliders, Filter, Lock, CheckCircle, Search, ArrowRight, Shield } from "lucide-react";

export interface PremiumSelectorTabProps {
  underlying: string;
  spotPrice: number;
  currencySymbol: string;
  onSelectContract?: (contract: any) => void;
}

export function PremiumSelectorTab({
  underlying = "NIFTY",
  spotPrice = 24800,
  currencySymbol = "₹",
  onSelectContract,
}: PremiumSelectorTabProps) {
  const [searchMode, setSearchMode] = useState<"exact" | "closest" | "range" | "delta">("closest");
  const [targetPremium, setTargetPremium] = useState<number>(150);
  const [minPremium, setMinPremium] = useState<number>(100);
  const [maxPremium, setMaxPremium] = useState<number>(200);
  const [targetDelta, setTargetDelta] = useState<number>(0.30);
  const [optionTypeFilter, setOptionTypeFilter] = useState<"ALL" | "CE" | "PE">("ALL");
  const [isContractLocked, setIsContractLocked] = useState<boolean>(true);

  // Generate dynamic strike candidates with conservative bid/ask pricing
  const step = spotPrice > 10000 ? 50 : 10;
  const atm = Math.round(spotPrice / step) * step;

  const candidateStrikes = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].flatMap((offset) => {
    const k = atm + offset * step;
    const isCallItm = k < spotPrice;
    const isPutItm = k > spotPrice;

    // Approximated premiums
    const callTheo = Math.max(10, (spotPrice - k > 0 ? spotPrice - k : 0) + spotPrice * 0.015 * Math.exp(-Math.abs(offset) * 0.25));
    const putTheo = Math.max(10, (k - spotPrice > 0 ? k - spotPrice : 0) + spotPrice * 0.015 * Math.exp(-Math.abs(offset) * 0.25));

    return [
      {
        contract_id: `${underlying}-${k}-CE`,
        underlying,
        strike: k,
        option_type: "CE",
        moneyness: offset === 0 ? "ATM" : isCallItm ? "ITM" : "OTM",
        theoretical_price: round2(callTheo),
        bid_price: round2(callTheo * 0.98), // Conservative sell fill
        ask_price: round2(callTheo * 1.02), // Conservative buy fill
        delta: round2(0.50 - offset * 0.07),
        iv: 14.5 + Math.abs(offset) * 0.3,
        volume: 45000 - Math.abs(offset) * 3000,
        oi: 120000 - Math.abs(offset) * 7000,
      },
      {
        contract_id: `${underlying}-${k}-PE`,
        underlying,
        strike: k,
        option_type: "PE",
        moneyness: offset === 0 ? "ATM" : isPutItm ? "ITM" : "OTM",
        theoretical_price: round2(putTheo),
        bid_price: round2(putTheo * 0.98),
        ask_price: round2(putTheo * 1.02),
        delta: round2(-0.50 - offset * 0.07),
        iv: 15.2 + Math.abs(offset) * 0.4,
        volume: 52000 - Math.abs(offset) * 3200,
        oi: 135000 - Math.abs(offset) * 8000,
      },
    ];
  });

  function round2(v: number) {
    return Math.round(v * 100) / 100;
  }

  // Filter candidates based on active search criteria
  const filteredContracts = candidateStrikes.filter((c) => {
    if (optionTypeFilter !== "ALL" && c.option_type !== optionTypeFilter) {
      return false;
    }

    if (searchMode === "exact") {
      return Math.abs(c.ask_price - targetPremium) <= 15;
    } else if (searchMode === "range") {
      return c.ask_price >= minPremium && c.ask_price <= maxPremium;
    } else if (searchMode === "delta") {
      return Math.abs(Math.abs(c.delta) - targetDelta) <= 0.10;
    }
    // Closest mode
    return Math.abs(c.ask_price - targetPremium) <= 80;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Control Panel */}
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <h3 className="font-mono text-xs font-bold text-slate-200 uppercase">
              Select by Premium / Delta Filters
            </h3>
          </div>

          {/* Contract Lock Toggle */}
          <button
            onClick={() => setIsContractLocked(!isContractLocked)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-xs font-bold transition ${
              isContractLocked
                ? "bg-amber-950/60 border border-amber-500/40 text-amber-300"
                : "bg-slate-900 border border-slate-850 text-slate-400"
            }`}
            title="When active, contract IDs stay locked on review without strike shifting"
          >
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Contract Lock: {isContractLocked ? "LOCKED" : "FLOATING"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
          {/* Filter Mode */}
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block">Filter Mode</label>
            <select
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 font-bold"
            >
              <option value="closest">Closest to Premium</option>
              <option value="exact">Exact Target Premium</option>
              <option value="range">Premium Range (Min-Max)</option>
              <option value="delta">Target Option Delta</option>
            </select>
          </div>

          {/* Target Premium / Delta Inputs */}
          {searchMode === "range" ? (
            <>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Min Premium ({currencySymbol})</label>
                <input
                  type="number"
                  value={minPremium}
                  onChange={(e) => setMinPremium(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Max Premium ({currencySymbol})</label>
                <input
                  type="number"
                  value={maxPremium}
                  onChange={(e) => setMaxPremium(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                />
              </div>
            </>
          ) : searchMode === "delta" ? (
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Target Delta (|&Delta;|)</label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="0.95"
                value={targetDelta}
                onChange={(e) => setTargetDelta(parseFloat(e.target.value) || 0.3)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-bold"
              />
            </div>
          ) : (
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Target Premium ({currencySymbol})</label>
              <input
                type="number"
                value={targetPremium}
                onChange={(e) => setTargetPremium(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-bold"
              />
            </div>
          )}

          {/* Option Type Filter */}
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block">Option Type</label>
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
              {(["ALL", "CE", "PE"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setOptionTypeFilter(t)}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                    optionTypeFilter === t
                      ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t === "ALL" ? "All" : t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Matching Contracts Table */}
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl font-mono text-xs overflow-x-auto">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <h4 className="text-slate-200 font-bold">
              Matching Filter Contracts ({filteredContracts.length})
            </h4>
          </div>
          <span className="text-slate-400 text-[11px]">
            Conservative Fills: Buy = Ask | Sell = Bid
          </span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
              <th className="py-2.5 px-3">Contract ID</th>
              <th className="py-2.5 px-3">Strike</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Moneyness</th>
              <th className="py-2.5 px-3 text-right">Conservative Bid</th>
              <th className="py-2.5 px-3 text-right">Conservative Ask</th>
              <th className="py-2.5 px-3 text-right">&Delta; Delta</th>
              <th className="py-2.5 px-3 text-right">IV (%)</th>
              <th className="py-2.5 px-3 text-right">Open Interest</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {filteredContracts.map((c) => (
              <tr key={c.contract_id} className="hover:bg-slate-900/60 transition">
                <td className="py-2.5 px-3 text-white font-bold">{c.contract_id}</td>
                <td className="py-2.5 px-3 text-cyan-300 font-bold">{currencySymbol}{c.strike}</td>
                <td className="py-2.5 px-3">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                      c.option_type === "CE"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-950 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {c.option_type}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="text-slate-300 text-[10px]">{c.moneyness}</span>
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                  {currencySymbol}{c.bid_price.toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right text-rose-400 font-bold">
                  {currencySymbol}{c.ask_price.toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-200">{c.delta.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right text-slate-400">{c.iv.toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right text-slate-300">{c.oi.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-center">
                  <button
                    onClick={() => onSelectContract?.(c)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/40 text-[11px] font-bold transition flex items-center gap-1 mx-auto"
                  >
                    <span>Use Strike</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
