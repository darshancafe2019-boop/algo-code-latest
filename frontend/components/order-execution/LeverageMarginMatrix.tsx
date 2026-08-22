"use client";

import React from "react";
import { Gauge, ShieldCheck, AlertCircle, Coins, DollarSign } from "lucide-react";

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
    <div className="bg-[#141E33] border border-[#1E293B] rounded-2xl p-4 space-y-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase">
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          <span>Leverage & Capital Margin</span>
        </div>
        <span className="text-cyan-400 font-bold text-xs bg-[#0B111E] px-2 py-0.5 rounded border border-slate-700">
          {leverage}x Leverage
        </span>
      </div>

      {/* Leverage Slider & Stepper */}
      <div className="space-y-1.5">
        <input
          type="range"
          min={1}
          max={maxLeverage}
          step={1}
          value={leverage}
          onChange={(e) => onChangeLeverage(parseInt(e.target.value))}
          className="w-full accent-cyan-400 bg-slate-800"
        />

        <div className="flex items-center justify-between gap-1">
          {quickLeverages.map((lev) => (
            <button
              key={lev}
              onClick={() => onChangeLeverage(lev)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                leverage === lev
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "bg-[#0B111E] text-slate-400 hover:text-white"
              }`}
            >
              {lev}x
            </button>
          ))}
        </div>
      </div>

      {/* Margin Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800">
        <div className="bg-[#0B111E] border border-slate-800 rounded-xl p-2.5">
          <div className="text-[10px] text-slate-400 uppercase">Required Margin</div>
          <div className="text-sm font-bold text-white mt-0.5">
            ${requiredMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-[10px] mt-0.5 ${isHighMargin ? "text-amber-400" : "text-emerald-400"}`}>
            {(Number(marginUtilizationPct) || 0).toFixed(1)}% of Capital
          </div>
        </div>

        <div className="bg-[#0B111E] border border-slate-800 rounded-xl p-2.5">
          <div className="text-[10px] text-slate-400 uppercase">Available Capital</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">
            ${availableMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Remaining: ${(Math.max(0, availableMargin - requiredMargin)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Liquidation Estimate if Leveraged */}
      {leverage > 1 && liquidationPrice && (
        <div className="flex items-center justify-between text-[11px] bg-red-950/40 border border-red-900/50 rounded-lg p-2 text-red-300">
          <span>Estimated Liquidation:</span>
          <span className="font-bold font-mono">${liquidationPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      )}
    </div>
  );
}
