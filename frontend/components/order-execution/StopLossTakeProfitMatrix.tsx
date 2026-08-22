"use client";

import React from "react";
import { Shield, Target, TrendingUp, TrendingDown, Percent, ArrowRight } from "lucide-react";
import { OrderSide } from "@/types/order-execution";

interface StopLossTakeProfitMatrixProps {
  orderSide: OrderSide;
  currentPrice: number;
  stopLoss: string;
  onChangeStopLoss: (val: string) => void;
  takeProfit: string;
  onChangeTakeProfit: (val: string) => void;
  maxRiskUsd: number;
  potentialProfitUsd: number;
  riskRewardRatio: number | string;
  onApplyRRRatio?: (ratio: number) => void;
}

export function StopLossTakeProfitMatrix({
  orderSide,
  currentPrice,
  stopLoss,
  onChangeStopLoss,
  takeProfit,
  onChangeTakeProfit,
  maxRiskUsd,
  potentialProfitUsd,
  riskRewardRatio,
  onApplyRRRatio,
}: StopLossTakeProfitMatrixProps) {
  const isBuy = orderSide === "BUY";

  const safePrice = Number(currentPrice) || 64500.0;
  const safeMaxRisk = Number(maxRiskUsd) || 0;
  const safeProfit = Number(potentialProfitUsd) || 0;

  const handlePercentSL = (pct: number) => {
    if (safePrice <= 0) return;
    const factor = isBuy ? 1 - pct / 100 : 1 + pct / 100;
    onChangeStopLoss((safePrice * factor).toFixed(2));
  };

  const handlePercentTP = (pct: number) => {
    if (safePrice <= 0) return;
    const factor = isBuy ? 1 + pct / 100 : 1 - pct / 100;
    onChangeTakeProfit((safePrice * factor).toFixed(2));
  };

  const quickRRs = [1.5, 2.0, 3.0, 4.0];

  return (
    <div className="bg-[#141E33] border border-[#1E293B] rounded-2xl p-4 space-y-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>Stop Loss & Take Profit Protection</span>
        </div>
        <div className="text-xs font-bold text-cyan-400 bg-[#0B111E] px-2 py-0.5 rounded border border-slate-700">
          R:R 1 : {riskRewardRatio}
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Stop Loss Card */}
        <div className="bg-[#0B111E] border border-red-950/60 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-red-400 font-bold flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Stop Loss
            </span>
            <span className="text-red-400 font-bold">
              -${safeMaxRisk.toFixed(2)}
            </span>
          </div>

          <input
            type="number"
            step="any"
            value={stopLoss}
            onChange={(e) => onChangeStopLoss(e.target.value)}
            className="w-full bg-[#141E33] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-red-500"
            placeholder={isBuy ? (safePrice * 0.98).toFixed(2) : (safePrice * 1.02).toFixed(2)}
          />

          <div className="flex items-center gap-1">
            {[1, 2, 3, 5].map((pct) => (
              <button
                key={pct}
                onClick={() => handlePercentSL(pct)}
                className="flex-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold"
              >
                -{pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Take Profit Card */}
        <div className="bg-[#0B111E] border border-emerald-950/60 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> Take Profit
            </span>
            <span className="text-emerald-400 font-bold">
              +${safeProfit.toFixed(2)}
            </span>
          </div>

          <input
            type="number"
            step="any"
            value={takeProfit}
            onChange={(e) => onChangeTakeProfit(e.target.value)}
            className="w-full bg-[#141E33] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-emerald-500"
            placeholder={isBuy ? (safePrice * 1.04).toFixed(2) : (safePrice * 0.96).toFixed(2)}
          />

          <div className="flex items-center gap-1">
            {[2, 4, 6, 10].map((pct) => (
              <button
                key={pct}
                onClick={() => handlePercentTP(pct)}
                className="flex-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold"
              >
                +{pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Risk:Reward Presets */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
        <span>Set Target by Risk:Reward Ratio:</span>
        <div className="flex items-center gap-1">
          {quickRRs.map((r) => (
            <button
              key={r}
              onClick={() => onApplyRRRatio?.(r)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold"
            >
              1:{r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
