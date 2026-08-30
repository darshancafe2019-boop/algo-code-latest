"use client";

import React, { useState } from "react";
import { X, Shield, Zap, Send, TrendingUp, TrendingDown, Layers, Calculator } from "lucide-react";
import { OptionContractQuote } from "@/types/option-chain";
import { getExpiryDisplay } from "@/lib/expiry-utils";

interface SelectedOptionInspectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  strike: number | null;
  optionType: "CE" | "PE" | null;
  quote: OptionContractQuote | null;
  underlying: string;
  expiry: string;
  spotPrice: number;
  currency?: string;
  onExecuteOrder?: (side: "BUY" | "SELL", lots: number) => void;
}

export function SelectedOptionInspectionDrawer({
  isOpen,
  onClose,
  strike,
  optionType,
  quote,
  underlying,
  expiry,
  spotPrice,
  currency = "₹",
  onExecuteOrder,
}: SelectedOptionInspectionDrawerProps) {
  const [lots, setLots] = useState(1);
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");

  if (!isOpen || !strike || !optionType || !quote) return null;

  const lotSize = underlying.includes("NIFTY") ? 50 : underlying.includes("BANKNIFTY") ? 15 : 1;
  const totalQty = lots * lotSize;
  const totalPremium = totalQty * (quote.ltp || 0);

  const isCall = optionType === "CE";
  const intrinsic = isCall ? Math.max(0, spotPrice - strike) : Math.max(0, strike - spotPrice);
  const timeValue = Math.max(0, (quote.ltp || 0) - intrinsic);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh] font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${
                isCall
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              }`}
            >
              {optionType}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {underlying} {currency}{strike.toLocaleString()} {isCall ? "CALL (CE)" : "PUT (PE)"}
              </h2>
              <p className="text-xs text-slate-400">
                Expiry: {getExpiryDisplay(expiry)} • Lot Size: {lotSize}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pricing & Liquidity Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3">
            <div className="text-[10px] text-slate-400 uppercase">Last Traded Price (LTP)</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {currency}{quote.ltp?.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Bid: {currency}{quote.bid?.toFixed(1)} • Ask: {currency}{quote.ask?.toFixed(1)}
            </div>
          </div>

          <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3">
            <div className="text-[10px] text-slate-400 uppercase">Implied Volatility (IV)</div>
            <div className="text-lg font-bold text-purple-400 mt-0.5">
              {quote.iv ? `${quote.iv.toFixed(1)}%` : "N/A"}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              OI: {((quote.open_interest || 0) / 1000).toFixed(1)}k contracts
            </div>
          </div>
        </div>

        {/* Intrinsic vs Time Value Breakdown */}
        <div className="bg-[#080D17] border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-400">
            <span>Intrinsic Value:</span>
            <span className="text-white font-bold">{currency}{intrinsic.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Time / Extrinsic Value:</span>
            <span className="text-amber-400 font-bold">{currency}{timeValue.toFixed(2)}</span>
          </div>
        </div>

        {/* Black-Scholes Greeks Suite */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Black-Scholes Analytical Greeks</div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-[#141E33] border border-slate-800 rounded-lg p-2">
              <div className="text-[9px] text-slate-400">DELTA (Δ)</div>
              <div className="font-bold text-cyan-400 mt-0.5">{quote.delta?.toFixed(2) || "0.00"}</div>
            </div>
            <div className="bg-[#141E33] border border-slate-800 rounded-lg p-2">
              <div className="text-[9px] text-slate-400">GAMMA (Γ)</div>
              <div className="font-bold text-emerald-400 mt-0.5">{quote.gamma?.toFixed(4) || "0.0000"}</div>
            </div>
            <div className="bg-[#141E33] border border-slate-800 rounded-lg p-2">
              <div className="text-[9px] text-slate-400">THETA (θ)</div>
              <div className="font-bold text-rose-400 mt-0.5">{quote.theta?.toFixed(1) || "0.0"}/day</div>
            </div>
            <div className="bg-[#141E33] border border-slate-800 rounded-lg p-2">
              <div className="text-[9px] text-slate-400">VEGA (ν)</div>
              <div className="font-bold text-purple-400 mt-0.5">{quote.vega?.toFixed(1) || "0.0"}</div>
            </div>
          </div>
        </div>

        {/* Order Sizing Controls */}
        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Action:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOrderSide("BUY")}
                className={`px-3 py-1 rounded font-bold transition-all ${
                  orderSide === "BUY" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                BUY / LONG
              </button>
              <button
                onClick={() => setOrderSide("SELL")}
                className={`px-3 py-1 rounded font-bold transition-all ${
                  orderSide === "SELL" ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                SELL / SHORT
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-slate-400">Lots ({lotSize} Qty/Lot):</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={lots}
                onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-[#0B111E] border border-slate-700 rounded px-2 py-1 text-center text-white font-bold"
              />
              <span className="text-slate-400 font-bold">= {totalQty} Units</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800 font-bold">
            <span className="text-slate-400">Total Premium:</span>
            <span className="text-cyan-400 text-sm">
              {currency}{totalPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Execution Trigger */}
        <button
          onClick={() => {
            onExecuteOrder?.(orderSide, lots);
            onClose();
          }}
          className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg uppercase tracking-wider flex items-center justify-center gap-2 ${
            orderSide === "BUY"
              ? "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-950/40"
              : "bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white shadow-rose-950/40"
          }`}
        >
          <Send className="w-4 h-4" />
          <span>
            EXECUTE {orderSide} {lots} LOTS ({currency}{totalPremium.toFixed(2)})
          </span>
        </button>
      </div>
    </div>
  );
}
