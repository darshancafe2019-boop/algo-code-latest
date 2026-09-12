"use client";

import React from "react";
import { Gauge } from "lucide-react";

interface LeverageMarginMatrixProps {
  leverage: number;
  onChangeLeverage: (lev: number) => void;
  requiredMargin: number;
  availableMargin: number;
  notionalValue: number;
  liquidationPrice?: number;
  maxLeverage?: number;
}

export function LeverageMarginMatrix({
  leverage,
  onChangeLeverage,
  requiredMargin,
  availableMargin = 10000.0,
  notionalValue,
  liquidationPrice,
  maxLeverage = 20,
}: LeverageMarginMatrixProps) {
  const marginUtilizationPct = availableMargin > 0 ? (requiredMargin / availableMargin) * 100 : 0;
  const isHighMargin = marginUtilizationPct > 50.0;

  const quickLeverages = [1, 2, 5, 10, 20];

  return (
    <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-3 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#F7FAFC]">
          <Gauge className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span>LEVERAGE & CAPITAL MARGIN</span>
        </div>
        <span className="text-[#22D3EE] font-semibold text-xs bg-[#07101A] px-2 py-0.5 rounded-md border border-[#1A2A3F] font-mono">
          {leverage}x Leverage
        </span>
      </div>

      {/* Leverage Slider & Stepper */}
      <div className="space-y-2">
        <input
          type="range"
          min={1}
          max={maxLeverage}
          step={1}
          value={leverage}
          onChange={(e) => onChangeLeverage(parseInt(e.target.value))}
          className="w-full accent-[#22D3EE] bg-[#0D1727] h-1.5 rounded-lg appearance-none cursor-pointer"
        />

        <div className="flex items-center justify-between gap-1.5">
          {quickLeverages.map((lev) => (
            <button
              key={lev}
              onClick={() => onChangeLeverage(lev)}
              className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all ${
                leverage === lev
                  ? "bg-[#2563EB] text-white"
                  : "bg-[#0D1727] border border-[#1A2A3F] text-[#7C8CA3] hover:text-[#F7FAFC] hover:border-[#29415F]"
              }`}
            >
              {lev}x
            </button>
          ))}
        </div>
      </div>

      {/* Margin Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#1A2A3F]">
        <div className="bg-[#07101A] border border-[#1A2A3F] rounded-lg p-2.5">
          <div className="text-[10px] text-[#7C8CA3] uppercase">Required Margin</div>
          <div className="text-sm font-bold text-[#F7FAFC] mt-0.5 font-mono tabular-nums">
            ${requiredMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-[10px] mt-0.5 font-mono ${isHighMargin ? "text-[#F59E0B]" : "text-[#00E890]"}`}>
            {(Number(marginUtilizationPct) || 0).toFixed(1)}% of Capital
          </div>
        </div>

        <div className="bg-[#07101A] border border-[#1A2A3F] rounded-lg p-2.5">
          <div className="text-[10px] text-[#7C8CA3] uppercase">Available Capital</div>
          <div className="text-sm font-bold text-[#00E890] mt-0.5 font-mono tabular-nums">
            ${availableMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#7C8CA3] mt-0.5 font-mono tabular-nums">
            Remaining: ${(Math.max(0, availableMargin - requiredMargin)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Liquidation Estimate if Leveraged */}
      {leverage > 1 && liquidationPrice && (
        <div className="flex items-center justify-between text-xs bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 rounded-lg p-2 text-[#FF3B5C]">
          <span className="text-[#7C8CA3]">Estimated Liquidation:</span>
          <span className="font-semibold font-mono tabular-nums">${liquidationPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      )}
    </div>
  );
}

