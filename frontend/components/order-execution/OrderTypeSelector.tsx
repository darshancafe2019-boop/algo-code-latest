"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { OrderSide, OrderType } from "@/types/order-execution";

interface OrderTypeSelectorProps {
  orderSide: OrderSide;
  onChangeSide: (side: OrderSide) => void;
  orderType: OrderType;
  onChangeOrderType: (type: OrderType) => void;
  limitPrice: string;
  onChangeLimitPrice: (val: string) => void;
  stopPrice: string;
  onChangeStopPrice: (val: string) => void;
  currentPrice: number;
}

export function OrderTypeSelector({
  orderSide,
  onChangeSide,
  orderType,
  onChangeOrderType,
  limitPrice,
  onChangeLimitPrice,
  stopPrice,
  onChangeStopPrice,
  currentPrice,
}: OrderTypeSelectorProps) {
  const isBuy = orderSide === "BUY";

  const orderTypes: { key: OrderType; label: string }[] = [
    { key: "MARKET", label: "MARKET" },
    { key: "LIMIT", label: "LIMIT" },
    { key: "STOP", label: "STOP" },
    { key: "STOP_LIMIT", label: "STOP-LIMIT" },
    { key: "TRAILING_STOP", label: "TRAILING STOP" },
    { key: "BRACKET", label: "BRACKET / OCO" },
  ];

  return (
    <div className="space-y-3 font-sans">
      {/* Side Selector (BUY vs SELL) - Segmented institutional control */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-[#07101A] rounded-lg border border-[#1A2A3F]">
        <button
          onClick={() => onChangeSide("BUY")}
          className={`py-2 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 text-xs ${
            isBuy
              ? "bg-[#00E890]/15 border border-[#00E890]/40 text-[#00E890]"
              : "text-[#7C8CA3] hover:text-[#F7FAFC]"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>BUY / LONG</span>
        </button>

        <button
          onClick={() => onChangeSide("SELL")}
          className={`py-2 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 text-xs ${
            !isBuy
              ? "bg-[#FF3B5C]/15 border border-[#FF3B5C]/40 text-[#FF3B5C]"
              : "text-[#7C8CA3] hover:text-[#F7FAFC]"
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>SELL / SHORT</span>
        </button>
      </div>

      {/* Order Type Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#1A2A3F]">
        {orderTypes.map((type) => {
          const isSelected = orderType === type.key;
          return (
            <button
              key={type.key}
              onClick={() => onChangeOrderType(type.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "bg-[#0D1727] border border-[#1A2A3F] text-[#7C8CA3] hover:text-[#F7FAFC] hover:border-[#29415F]"
              }`}
            >
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Dynamic Price Inputs based on Order Type */}
      {(orderType === "LIMIT" || orderType === "STOP_LIMIT" || orderType === "BRACKET") && (
        <div className="bg-[#07101A] border border-[#1A2A3F] rounded-lg p-3 space-y-1.5 text-xs">
          <label className="text-[10px] text-[#7C8CA3] uppercase flex items-center justify-between">
            <span>Limit Price</span>
            <span className="text-[#22D3EE] cursor-pointer hover:underline font-mono" onClick={() => onChangeLimitPrice(currentPrice.toString())}>
              Use LTP (${currentPrice.toLocaleString()})
            </span>
          </label>
          <input
            type="number"
            step="any"
            value={limitPrice}
            onChange={(e) => onChangeLimitPrice(e.target.value)}
            className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-md px-3 py-2 text-[#F7FAFC] font-semibold font-mono tabular-nums focus:outline-none focus:border-[#22D3EE]"
          />
        </div>
      )}

      {(orderType === "STOP" || orderType === "STOP_LIMIT") && (
        <div className="bg-[#07101A] border border-[#1A2A3F] rounded-lg p-3 space-y-1.5 text-xs">
          <label className="text-[10px] text-[#7C8CA3] uppercase flex items-center justify-between">
            <span>Stop Trigger Price</span>
            <span className="text-[#F59E0B]">Triggers order when market hits price</span>
          </label>
          <input
            type="number"
            step="any"
            value={stopPrice}
            onChange={(e) => onChangeStopPrice(e.target.value)}
            className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-md px-3 py-2 text-[#F7FAFC] font-semibold font-mono tabular-nums focus:outline-none focus:border-[#22D3EE]"
          />
        </div>
      )}
    </div>
  );
}

