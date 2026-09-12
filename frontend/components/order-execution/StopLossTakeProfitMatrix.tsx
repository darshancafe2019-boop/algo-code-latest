"use client";

import React from "react";
import { Shield, Target } from "lucide-react";
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
    <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-3 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#F7FAFC]">
          <Shield className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span>STOP LOSS & TAKE PROFIT PROTECTION</span>
        </div>
        <div className="text-xs font-semibold text-[#22D3EE] bg-[#07101A] px-2 py-0.5 rounded-md border border-[#1A2A3F] font-mono">
          R:R 1 : {riskRewardRatio}
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Stop Loss Card */}
        <div className="bg-[#07101A] border border-[#1A2A3F] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#FF3B5C] font-semibold flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Stop Loss
            </span>
            <span className="text-[#FF3B5C] font-semibold font-mono tabular-nums">
              -${safeMaxRisk.toFixed(2)}
            </span>
          </div>

          <input
            type="number"
            step="any"
            value={stopLoss}
            onChange={(e) => onChangeStopLoss(e.target.value)}
            className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-md px-2.5 py-1.5 text-[#F7FAFC] font-semibold text-xs font-mono tabular-nums focus:outline-none focus:border-[#FF3B5C]"
            placeholder={isBuy ? (safePrice * 0.98).toFixed(2) : (safePrice * 1.02).toFixed(2)}
          />

          <div className="flex items-center gap-1">
            {[1, 2, 3, 5].map((pct) => (
              <button
                key={pct}
                onClick={() => handlePercentSL(pct)}
                className="flex-1 py-1 rounded bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] text-[10px] text-[#7C8CA3] hover:text-[#F7FAFC] font-semibold font-mono"
              >
                -{pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Take Profit Card */}
        <div className="bg-[#07101A] border border-[#1A2A3F] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#00E890] font-semibold flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> Take Profit
            </span>
            <span className="text-[#00E890] font-semibold font-mono tabular-nums">
              +${safeProfit.toFixed(2)}
            </span>
          </div>

          <input
            type="number"
            step="any"
            value={takeProfit}
            onChange={(e) => onChangeTakeProfit(e.target.value)}
            className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-md px-2.5 py-1.5 text-[#F7FAFC] font-semibold text-xs font-mono tabular-nums focus:outline-none focus:border-[#00E890]"
            placeholder={isBuy ? (safePrice * 1.04).toFixed(2) : (safePrice * 0.96).toFixed(2)}
          />

          <div className="flex items-center gap-1">
            {[2, 4, 6, 10].map((pct) => (
              <button
                key={pct}
                onClick={() => handlePercentTP(pct)}
                className="flex-1 py-1 rounded bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] text-[10px] text-[#7C8CA3] hover:text-[#F7FAFC] font-semibold font-mono"
              >
                +{pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Risk:Reward Presets */}
      <div className="flex items-center justify-between text-[10px] text-[#7C8CA3] pt-1.5 border-t border-[#1A2A3F]">
        <span>Set Target by Risk:Reward Ratio:</span>
        <div className="flex items-center gap-1">
          {quickRRs.map((r) => (
            <button
              key={r}
              onClick={() => onApplyRRRatio?.(r)}
              className="px-2 py-0.5 rounded-md bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] text-[#22D3EE] font-semibold"
            >
              1:{r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

