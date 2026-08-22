"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Calculator,
  DollarSign,
  Percent,
  Sliders,
  RefreshCw,
  Zap,
  TrendingUp,
  Shield,
  Layers,
} from "lucide-react";
import { PositionSizeResult } from "@/types/risk";

export function PositionSizingEngine() {
  const [assetClass, setAssetClass] = useState<"crypto" | "indian_stocks" | "options" | "futures">("crypto");
  const [capital, setCapital] = useState<number>(10000.0);
  const [riskPct, setRiskPct] = useState<number>(1.0);
  const [entryPrice, setEntryPrice] = useState<number>(65420.0);
  const [stopLoss, setStopLoss] = useState<number>(64200.0);
  const [targetPrice, setTargetPrice] = useState<number>(67860.0);
  const [lotSize, setLotSize] = useState<number>(1);
  const [leverage, setLeverage] = useState<number>(1.0);
  const [feesPct, setFeesPct] = useState<number>(0.075);
  const [slippagePct, setSlippagePct] = useState<number>(0.05);

  const [calcResult, setCalcResult] = useState<PositionSizeResult | null>(null);

  // Position Sizing Calculation Mutation
  const calculateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        capital,
        risk_percentage: riskPct,
        entry_price: entryPrice,
        stop_loss: stopLoss,
        target_price: targetPrice,
        lot_size: lotSize,
        leverage,
        asset_class: assetClass,
        fees_pct: feesPct,
        slippage_pct: slippagePct,
      };

      const res = await fetch("/api/risk/position-size", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: (data: PositionSizeResult) => {
      setCalcResult(data);
    },
  });

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Quantitative Position Sizing Engine
          </h3>
          <p className="text-[11px] text-[#A8BDB0]">
            Calculate mathematical position sizing, margin requirements, lot-step rounding, and fee buffers.
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded font-mono font-bold uppercase bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
          Risk-Constrained Volatility Sizing
        </span>
      </div>

      {/* Calculator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs font-mono">
        {/* Left: Input Configuration Form (7 cols) */}
        <div className="lg:col-span-7 bg-[#0D1914] border border-[#1B3328] rounded-2xl p-4 space-y-3.5">
          {/* Asset Class Selector */}
          <div className="space-y-1">
            <label className="text-[10px] text-[#70877A] font-bold block">Asset Class</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["crypto", "indian_stocks", "options", "futures"] as const).map((ac) => (
                <button
                  key={ac}
                  type="button"
                  onClick={() => setAssetClass(ac)}
                  className={`py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    assetClass === ac
                      ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-sm"
                      : "bg-[#07110D] text-[#A8BDB0] border border-[#1B3328]"
                  }`}
                >
                  {ac.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-[#70877A] font-bold block">Total Capital ($)</label>
              <input
                type="number"
                value={capital}
                onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#07110D] border border-[#1B3328] rounded-lg p-2 text-white font-bold focus:outline-none focus:border-[#55C98A]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#70877A] font-bold block">Risk Per Trade (%)</label>
              <input
                type="number"
                step={0.1}
                value={riskPct}
                onChange={(e) => setRiskPct(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#07110D] border border-[#1B3328] rounded-lg p-2 text-cyan-300 font-bold focus:outline-none focus:border-[#55C98A]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#70877A] font-bold block">Leverage Multiplier</label>
              <input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(parseFloat(e.target.value) || 1)}
                className="w-full bg-[#07110D] border border-[#1B3328] rounded-lg p-2 text-purple-300 font-bold focus:outline-none focus:border-[#55C98A]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#70877A] font-bold block">Entry Price ($)</label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#07110D] border border-[#1B3328] rounded-lg p-2 text-white font-bold focus:outline-none focus:border-[#55C98A]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#70877A] font-bold block">Stop Loss Price ($)</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#07110D] border border-[#1B3328] rounded-lg p-2 text-red-400 font-bold focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#70877A] font-bold block">Target Price ($)</label>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#07110D] border border-[#1B3328] rounded-lg p-2 text-[#55C98A] font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            onClick={() => calculateMutation.mutate()}
            disabled={calculateMutation.isPending}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
          >
            {calculateMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            <span>Calculate Sizing & Risk Parameters</span>
          </button>
        </div>

        {/* Right: Calculated Sizing Output (5 cols) */}
        <div className="lg:col-span-5 bg-[#0D1914] border border-[#1B3328] rounded-2xl p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#1B3328] pb-2 flex items-center justify-between">
              <span>Risk Sizing Output</span>
              <span className="text-[10px] text-[#55C98A]">Fixed Fractional</span>
            </h4>

            {calcResult ? (
              <div className="space-y-2.5 text-xs animate-fadeIn">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#07110D] border border-[#1B3328]">
                    <span className="text-[10px] text-[#70877A] block">Target Quantity</span>
                    <span className="text-sm font-bold text-[#55C98A]">{calcResult.position_quantity} Units</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#07110D] border border-[#1B3328]">
                    <span className="text-[10px] text-[#70877A] block">Max Risk Dollars</span>
                    <span className="text-sm font-bold text-red-400">${calcResult.risk_amount.toFixed(2)}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#07110D] border border-[#1B3328]">
                    <span className="text-[10px] text-[#70877A] block">Notional Exposure</span>
                    <span className="text-sm font-bold text-white">${calcResult.notional_value.toLocaleString()}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#07110D] border border-[#1B3328]">
                    <span className="text-[10px] text-[#70877A] block">Required Margin</span>
                    <span className="text-sm font-bold text-cyan-300">${calcResult.margin_required.toFixed(2)}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#07110D] border border-[#1B3328]">
                    <span className="text-[10px] text-[#70877A] block">Potential Profit</span>
                    <span className="text-sm font-bold text-[#55C98A]">
                      +${calcResult.potential_profit ? calcResult.potential_profit.toFixed(2) : ((targetPrice - entryPrice) * calcResult.position_quantity).toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#07110D] border border-[#1B3328]">
                    <span className="text-[10px] text-[#70877A] block">Risk / Reward (R:R)</span>
                    <span className="text-sm font-bold text-purple-300">
                      1 : {calcResult.risk_reward_ratio ? calcResult.risk_reward_ratio.toFixed(2) : ((targetPrice - entryPrice) / Math.max(1, entryPrice - stopLoss)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {calcResult.is_capital_capped && (
                  <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 text-[11px]">
                    ⚠️ Quantity capped by capital/margin availability limit ({calcResult.cap_reason || "Max Allocation"}).
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-[#70877A] text-xs">
                Configure parameters and click calculate to compute risk-adjusted sizing.
              </div>
            )}
          </div>

          <p className="text-[10px] text-[#70877A] font-sans pt-2 border-t border-[#1B3328]">
            * Calculations reflect simulated outcomes. Slippage and execution venue fees will adjust realized P&L.
          </p>
        </div>
      </div>
    </div>
  );
}
