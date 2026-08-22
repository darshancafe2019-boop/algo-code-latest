"use client";

import React from "react";
import { TrendingUp, TrendingDown, Clock, ShieldAlert } from "lucide-react";
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
    <div className="space-y-3">
      {/* Side Selector (BUY vs SELL) */}
      <div className="grid grid-cols-2 gap-2 font-mono">
        <button
          onClick={() => onChangeSide("BUY")}
          className={`py-2.5 rounded-xl font-bold uppercase transition-all flex items-center justify-center gap-2 text-xs shadow-md ${
            isBuy
              ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-emerald-950/40 border border-emerald-400/40"
              : "bg-[#141E33] text-slate-400 border border-[#1E293B] hover:text-slate-200"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>BUY / LONG</span>
        </button>

        <button
          onClick={() => onChangeSide("SELL")}
          className={`py-2.5 rounded-xl font-bold uppercase transition-all flex items-center justify-center gap-2 text-xs shadow-md ${
            !isBuy
              ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-rose-950/40 border border-rose-400/40"
              : "bg-[#141E33] text-slate-400 border border-[#1E293B] hover:text-slate-200"
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>SELL / SHORT</span>
        </button>
      </div>

      {/* Order Type Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-800/80">
        {orderTypes.map((type) => {
          const isSelected = orderType === type.key;
          return (
            <button
              key={type.key}
              onClick={() => onChangeOrderType(type.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/30"
                  : "bg-[#141E33] text-slate-400 hover:text-slate-200 hover:bg-[#1A2640]"
              }`}
            >
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Dynamic Price Inputs based on Order Type */}
      {(orderType === "LIMIT" || orderType === "STOP_LIMIT" || orderType === "BRACKET") && (
        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3 space-y-1.5 font-mono text-xs">
          <label className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
            <span>Limit Price</span>
            <span className="text-cyan-400 cursor-pointer" onClick={() => onChangeLimitPrice(currentPrice.toString())}>
              Use LTP (${currentPrice.toLocaleString()})
            </span>
          </label>
          <input
            type="number"
            step="any"
            value={limitPrice}
            onChange={(e) => onChangeLimitPrice(e.target.value)}
            className="w-full bg-[#0B111E] border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
          />
        </div>
      )}

      {(orderType === "STOP" || orderType === "STOP_LIMIT") && (
        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3 space-y-1.5 font-mono text-xs">
          <label className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
            <span>Stop Trigger Price</span>
            <span className="text-amber-400">Triggers order when market hits price</span>
          </label>
          <input
            type="number"
            step="any"
            value={stopPrice}
            onChange={(e) => onChangeStopPrice(e.target.value)}
            className="w-full bg-[#0B111E] border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
          />
        </div>
      )}
    </div>
  );
}
