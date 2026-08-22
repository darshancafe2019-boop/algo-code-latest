"use client";

import React from "react";
import { Calculator, Percent, DollarSign, Layers } from "lucide-react";
import { QuantityMode } from "@/types/order-execution";

interface QuantitySizingCalculatorProps {
  quantity: string;
  onChangeQuantity: (qty: string) => void;
  quantityMode: QuantityMode;
  onChangeQuantityMode: (mode: QuantityMode) => void;
  notionalValue: number;
  currentPrice: number;
  availableCapital?: number;
  onApplyRiskSizing?: (riskPct: number) => void;
}

export function QuantitySizingCalculator({
  quantity,
  onChangeQuantity,
  quantityMode,
  onChangeQuantityMode,
  notionalValue,
  currentPrice,
  availableCapital = 10000.0,
  onApplyRiskSizing,
}: QuantitySizingCalculatorProps) {
  const quickSizes = [
    { label: "25%", mult: 0.25 },
    { label: "50%", mult: 0.50 },
    { label: "75%", mult: 0.75 },
    { label: "100%", mult: 1.00 },
  ];

  const handleQuickPercent = (mult: number) => {
    if (currentPrice <= 0) return;
    const targetNotional = availableCapital * mult;
    const calculatedQty = (targetNotional / currentPrice).toFixed(4);
    onChangeQuantity(calculatedQty);
  };

  return (
    <div className="bg-[#141E33] border border-[#1E293B] rounded-2xl p-4 space-y-3 font-mono">
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase">
          <Calculator className="w-3.5 h-3.5 text-cyan-400" />
          <span>Position Sizing & Quantity</span>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-[#0B111E] border border-slate-700 rounded-lg p-0.5 text-[10px]">
          {(["UNITS", "LOTS", "NOTIONAL"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onChangeQuantityMode(mode)}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                quantityMode === mode
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Main Quantity Input */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Order Size ({quantityMode})</span>
          <span className="text-cyan-400 font-bold">
            Notional: ${notionalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="relative">
          <input
            type="number"
            step="any"
            min="0.0001"
            value={quantity}
            onChange={(e) => onChangeQuantity(e.target.value)}
            className="w-full bg-[#0B111E] border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
            placeholder="0.05"
          />
        </div>
      </div>

      {/* Quick Capital Allocation Buttons */}
      <div className="flex items-center justify-between gap-1.5 pt-1">
        {quickSizes.map((btn) => (
          <button
            key={btn.label}
            onClick={() => handleQuickPercent(btn.mult)}
            className="flex-1 py-1 rounded-lg bg-[#0B111E] hover:bg-[#1A2640] border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-cyan-400 transition-all"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Risk-Based Sizing Presets */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
        <span>Risk-Based Sizing:</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onApplyRiskSizing?.(0.5)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold"
          >
            0.5% Risk
          </button>
          <button
            onClick={() => onApplyRiskSizing?.(1.0)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold"
          >
            1.0% Risk
          </button>
          <button
            onClick={() => onApplyRiskSizing?.(2.0)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold"
          >
            2.0% Risk
          </button>
        </div>
      </div>
    </div>
  );
}
