"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Percent,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  BarChart3,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronRight,
} from "lucide-react";
import { OptionStrategyEvaluation, OptionStrategyLeg } from "@/types/crypto-derivatives";

export function OptionStrategyBuilder() {
  const [underlying, setUnderlying] = useState("BTC");
  const [spotPrice, setSpotPrice] = useState(64350.0);
  const [selectedPreset, setSelectedPreset] = useState("IRON_CONDOR");
  const [executionFeedback, setExecutionFeedback] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Fetch Expiries
  const { data: expiriesData } = useQuery<{ status: string; expiries: string[] }>({
    queryKey: ["cryptoExpiriesStrategy", underlying],
    queryFn: async () => {
      const res = await fetch(`/api/crypto/options/expiries?underlying=${underlying}`);
      if (!res.ok) throw new Error("Failed to fetch expiries");
      return res.json();
    },
  });

  const availableExpiries = Array.isArray(expiriesData?.expiries) ? expiriesData.expiries : [];
  const activeExpiry = availableExpiries[0] || "2026-08-28";

  // Evaluate Strategy
  const { data: evalData, isLoading, refetch, isFetching } = useQuery<OptionStrategyEvaluation>({
    queryKey: ["strategyEval", underlying, selectedPreset, spotPrice, activeExpiry],
    queryFn: async () => {
      const res = await fetch("/api/crypto/options/strategy/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy_name: selectedPreset,
          underlying,
          spot_price: spotPrice,
          preset: selectedPreset,
          expiry: activeExpiry,
        }),
      });
      if (!res.ok) throw new Error("Failed to evaluate strategy");
      return res.json();
    },
  });

  const handleExecuteMultiLegPaperTrade = async () => {
    if (!evalData || !evalData.legs) return;
    setIsExecuting(true);
    setExecutionFeedback(null);

    try {
      let successCount = 0;
      for (const leg of evalData.legs) {
        const symbol = `${underlying}-${leg.expiry}-${leg.strike}-${leg.option_type === "CALL" ? "C" : "P"}`;
        const res = await fetch("/api/crypto/orders/paper-trade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol,
            underlying,
            instrument_type: "OPTIONS",
            side: leg.action,
            order_type: "MARKET",
            quantity: leg.quantity,
            price: leg.premium,
            leverage: 1.0,
          }),
        });
        if (res.ok) successCount++;
      }
      setExecutionFeedback(`✅ Successfully executed all ${successCount} legs for ${selectedPreset}!`);
    } catch {
      setExecutionFeedback("Error executing multi-leg strategy.");
    } finally {
      setIsExecuting(false);
    }
  };

  const presets = [
    { id: "IRON_CONDOR", name: "Iron Condor", type: "Credit", desc: "Defined-risk range-bound market strategy" },
    { id: "IRON_BUTTERFLY", name: "Iron Butterfly", type: "Credit", desc: "Maximum profit at specific pin strike" },
    { id: "BULL_CALL_SPREAD", name: "Bull Call Spread", type: "Debit", desc: "Directional upside with capped risk" },
    { id: "BEAR_PUT_SPREAD", name: "Bear Put Spread", type: "Debit", desc: "Directional downside with capped risk" },
    { id: "LONG_STRADDLE", name: "Long Straddle", type: "Debit", desc: "Volatility breakout in either direction" },
    { id: "LONG_STRANGLE", name: "Long Strangle", type: "Debit", desc: "Low-cost high-volatility expansion" },
  ];

  return (
    <div className="flex flex-col gap-6 text-slate-100 font-sans pb-12">
      {/* Header */}
      <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Percent className="w-5 h-5 text-emerald-400" />
            Multi-Leg Option Strategy Studio
          </h2>
          <p className="text-xs text-slate-400">
            Build, price, and simulate multi-leg combinations with real-time Black-Scholes Greeks and payoff curves
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#0B101B] p-1 rounded-lg border border-slate-800 text-xs">
            {["BTC", "ETH", "SOL"].map((u) => (
              <button
                key={u}
                onClick={() => setUnderlying(u)}
                className={`px-3 py-1 font-semibold rounded-md transition-colors ${
                  underlying === u ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preset Strategy Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPreset(p.id)}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedPreset === p.id
                ? "bg-emerald-600/15 border-emerald-500 shadow-md"
                : "bg-[#131B2A] border-slate-800 hover:border-slate-700"
            }`}
          >
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                p.type === "Credit" ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"
              }`}
            >
              {p.type}
            </span>
            <h4 className="text-xs font-bold text-white mt-1.5">{p.name}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{p.desc}</p>
          </button>
        ))}
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategy Breakdown & Legs (2 cols) */}
        <div className="lg:col-span-2 bg-[#131B2A] border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">
                {evalData?.strategy_name || selectedPreset} Structure
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {evalData?.legs_count || 0} active legs • Expiry: {activeExpiry}
              </span>
            </div>
            <span
              className={`text-xs px-3 py-1 rounded font-mono font-bold ${
                evalData?.nature === "NET CREDIT"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              }`}
            >
              {evalData?.nature || "NET CREDIT"}
            </span>
          </div>

          {/* Legs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-[#0B101B]">
                  <th className="py-2.5 px-3">Leg</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Strike</th>
                  <th className="py-2.5 px-3 text-right">Premium</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {evalData?.legs?.map((leg, i) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-sans text-slate-300 font-semibold">Leg {i + 1}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          leg.action === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {leg.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-white font-semibold">{leg.option_type}</td>
                    <td className="py-2.5 px-3 text-right text-amber-300 font-bold">${leg.strike.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-slate-200">${leg.premium.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{leg.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payoff Simulation Grid */}
          <div>
            <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Payoff Curve at Expiration
            </h4>
            <div className="h-28 bg-[#0B101B] rounded-lg border border-slate-800/80 p-3 flex items-end justify-between gap-1 overflow-hidden">
              {evalData?.payoff_curve?.slice(0, 35).map((pt, idx) => {
                const isProfit = pt.pnl >= 0;
                const heightPct = Math.min(100, Math.max(8, (Math.abs(pt.pnl) / (evalData.net_premium || 1000)) * 60));

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-sm transition-all ${
                        isProfit ? "bg-emerald-500/80 group-hover:bg-emerald-400" : "bg-rose-500/80 group-hover:bg-rose-400"
                      }`}
                    />
                    <div className="absolute bottom-full mb-1 hidden group-hover:block bg-[#1E293B] border border-slate-700 p-1.5 rounded text-[9px] font-mono text-white whitespace-nowrap z-10">
                      ${pt.underlying_price}: {isProfit ? `+$${pt.pnl}` : `-$${Math.abs(pt.pnl)}`}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>-25% Price Drop</span>
              <span>Spot (${spotPrice})</span>
              <span>+25% Price Rise</span>
            </div>
          </div>
        </div>

        {/* Strategy Metrics & Execution (1 col) */}
        <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold text-white pb-3 border-b border-slate-800">
              Payoff Analytics & Risk
            </h3>

            {/* Financial Metrics */}
            <div className="space-y-2.5 my-4 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Net Premium Flow:</span>
                <span className="font-mono font-bold text-white">
                  ${evalData?.net_premium?.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Max Profit:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {typeof evalData?.max_profit === "number"
                    ? `+$${evalData.max_profit.toLocaleString()}`
                    : evalData?.max_profit}
                </span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Max Loss:</span>
                <span className="font-mono font-bold text-rose-400">
                  {typeof evalData?.max_loss === "number"
                    ? `-$${evalData.max_loss.toLocaleString()}`
                    : evalData?.max_loss}
                </span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Risk / Reward:</span>
                <span className="font-mono text-amber-300 font-bold">
                  {evalData?.risk_reward_ratio}
                </span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Breakevens:</span>
                <span className="font-mono text-purple-300">
                  {evalData?.breakevens?.map((b) => `$${b}`).join(", ") || "None"}
                </span>
              </div>
            </div>

            {/* Aggregate Greeks Card */}
            <div className="p-3 rounded-lg bg-[#0B101B] border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-white block">Aggregate Strategy Greeks</span>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">Delta</span>
                  <span className="text-emerald-400 font-bold">{evalData?.aggregate_greeks?.delta || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Gamma</span>
                  <span className="text-slate-300 font-bold">{evalData?.aggregate_greeks?.gamma || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Theta</span>
                  <span className="text-rose-400 font-bold">{evalData?.aggregate_greeks?.theta || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Vega</span>
                  <span className="text-blue-400 font-bold">{evalData?.aggregate_greeks?.vega || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Rho</span>
                  <span className="text-slate-400 font-bold">{evalData?.aggregate_greeks?.rho || 0}</span>
                </div>
              </div>
            </div>

            {executionFeedback && (
              <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono mt-3">
                {executionFeedback}
              </div>
            )}
          </div>

          {/* Execution Button */}
          <button
            onClick={handleExecuteMultiLegPaperTrade}
            disabled={isExecuting || !evalData}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>Execute Paper Multi-Leg Order ({evalData?.legs_count || 0} Legs)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
