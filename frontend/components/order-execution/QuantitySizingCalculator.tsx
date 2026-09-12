"use client";

import React from "react";
import { Calculator } from "lucide-react";
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
    <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-3 font-sans">
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#F7FAFC]">
          <Calculator className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span>POSITION SIZING & QUANTITY</span>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-[#07101A] border border-[#1A2A3F] rounded-lg p-0.5 text-[10px]">
          {(["UNITS", "LOTS", "NOTIONAL"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onChangeQuantityMode(mode)}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                quantityMode === mode
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-[#7C8CA3] hover:text-[#F7FAFC]"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Main Quantity Input */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-[#7C8CA3]">
          <span>Order Size ({quantityMode})</span>
          <span className="text-[#22D3EE] font-semibold font-mono tabular-nums">
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
            className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-3 py-2 text-sm font-semibold text-[#F7FAFC] font-mono tabular-nums focus:outline-none focus:border-[#22D3EE]"
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
            className="flex-1 py-1 rounded-md bg-[#0D1727] hover:bg-[#101B2D] border border-[#1A2A3F] hover:border-[#29415F] text-[11px] font-semibold text-[#7C8CA3] hover:text-[#F7FAFC] transition-all font-mono"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Risk-Based Sizing Presets */}
      <div className="flex items-center justify-between text-[10px] text-[#7C8CA3] pt-1.5 border-t border-[#1A2A3F]">
        <span>Risk-Based Sizing:</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onApplyRiskSizing?.(0.5)}
            className="px-2 py-0.5 rounded-md bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] text-[#22D3EE] font-semibold text-[10px]"
          >
            0.5% Risk
          </button>
          <button
            onClick={() => onApplyRiskSizing?.(1.0)}
            className="px-2 py-0.5 rounded-md bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] text-[#00E890] font-semibold text-[10px]"
          >
            1.0% Risk
          </button>
          <button
            onClick={() => onApplyRiskSizing?.(2.0)}
            className="px-2 py-0.5 rounded-md bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] text-[#F59E0B] font-semibold text-[10px]"
          >
            2.0% Risk
          </button>
        </div>
      </div>
    </div>
  );
}

