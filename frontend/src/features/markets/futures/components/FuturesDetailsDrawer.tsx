"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Zap,
  Shield,
  Bot,
  Activity,
  Sliders,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { CanonicalFuturesContract, LiquidationCalcResult } from "../types/futures";
import { useFuturesStore } from "../state/futures-store";
import { calculateLiquidation } from "../api/futures-api";
import { useUIStore } from "@/lib/store/useUIStore";

interface FuturesDetailsDrawerProps {
  contract: CanonicalFuturesContract | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FuturesDetailsDrawer({ contract, isOpen, onClose }: FuturesDetailsDrawerProps) {
  const { leverage, setLeverage, marginMode, setMarginMode, orderSide, setOrderSide } = useFuturesStore();
  const { setAICopilotOpen, setActiveSymbol } = useUIStore();

  const [orderQty, setOrderQty] = useState<number>(0.1);
  const [liqResult, setLiqResult] = useState<LiquidationCalcResult | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  useEffect(() => {
    if (contract) {
      calculateLiquidation({
        side: orderSide,
        entryPrice: contract.mark_price,
        leverage: leverage,
      }).then(setLiqResult);
    }
  }, [contract, leverage, orderSide]);

  if (!isOpen || !contract) return null;

  const handleExecuteOrder = async () => {
    setOrderStatus("Submitting order to paper execution engine...");
    setTimeout(() => {
      setOrderStatus(`✅ Market ${orderSide} order executed for ${orderQty} ${contract.underlying} at $${contract.mark_price}!`);
      setTimeout(() => setOrderStatus(null), 4000);
    }, 600);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0B132B] border-l border-slate-800 shadow-2xl p-5 flex flex-col font-sans text-slate-300 text-xs animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-bold text-xs text-cyan-400 font-mono">
            {contract.underlying.substring(0, 3)}
          </div>
          <div>
            <h3 className="font-bold text-white font-mono text-sm">{contract.symbol}</h3>
            <span className="text-[10px] text-slate-400 font-mono">
              {contract.venue} • {contract.contract_type}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 no-scrollbar">
        {/* Status banner */}
        {orderStatus && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs animate-in fade-in">
            {orderStatus}
          </div>
        )}

        {/* Quick Market Snapshot */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 font-mono">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Mark Price</span>
            <span className="font-bold text-white text-sm">${contract.mark_price.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Index Price</span>
            <span className="font-bold text-slate-300 text-sm">${contract.index_price.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">24h Change</span>
            <span className={contract.change_24h_pct >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
              {contract.change_24h_pct >= 0 ? `+${contract.change_24h_pct}%` : `${contract.change_24h_pct}%`}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Open Interest</span>
            <span className="font-bold text-cyan-400">${(contract.open_interest_usd / 1e6).toFixed(1)}M</span>
          </div>
        </div>

        {/* Leverage & Margin Controls */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between font-mono">
            <span className="text-xs font-bold text-white">Leverage: {leverage}x</span>
            <div className="flex items-center gap-1">
              {["ISOLATED", "CROSS"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMarginMode(m as any)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition border ${
                    marginMode === m
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <input
            type="range"
            min="1"
            max={contract.max_leverage}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>1x</span>
            <span>25x</span>
            <span>50x</span>
            <span>{contract.max_leverage}x</span>
          </div>
        </div>

        {/* Liquidation Risk Calculator */}
        {liqResult && (
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 uppercase font-bold">Estimated Liquidation</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  liqResult.riskLevel === "SAFE"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                    : liqResult.riskLevel === "MODERATE"
                    ? "bg-yellow-950 text-yellow-400 border border-yellow-500/30"
                    : "bg-red-950 text-red-400 border border-red-500/30"
                }`}
              >
                {liqResult.riskLevel} RISK
              </span>
            </div>

            <div className="flex justify-between text-xs pt-1">
              <span className="text-slate-400">Liquidation Price:</span>
              <span className="text-red-400 font-bold">${liqResult.liquidationPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Distance to Liquidation:</span>
              <span className="text-white font-bold">{liqResult.liquidationDistancePct}%</span>
            </div>
          </div>
        )}

        {/* Quick Order Form */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3 font-mono">
          <span className="text-[11px] text-slate-400 uppercase font-bold block">Quick Order Placement</span>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOrderSide("BUY")}
              className={`py-2 rounded-xl font-bold transition text-xs border ${
                orderSide === "BUY"
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              LONG / BUY
            </button>
            <button
              onClick={() => setOrderSide("SELL")}
              className={`py-2 rounded-xl font-bold transition text-xs border ${
                orderSide === "SELL"
                  ? "bg-red-600 text-white border-red-500 shadow-md"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              SHORT / SELL
            </button>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Contract Quantity</label>
            <input
              type="number"
              step="0.01"
              value={orderQty}
              onChange={(e) => setOrderQty(Math.max(0.001, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={handleExecuteOrder}
            className={`w-full py-2.5 rounded-xl font-bold text-xs transition active:scale-98 shadow-lg ${
              orderSide === "BUY"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500"
                : "bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500"
            }`}
          >
            Execute {orderSide} ({leverage}x)
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0 font-mono text-[11px]">
        <button
          onClick={() => {
            setActiveSymbol(contract.symbol);
            setAICopilotOpen(true);
            onClose();
          }}
          className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-bold transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Launch AI Copilot (⌘J)</span>
        </button>
      </div>
    </div>
  );
}
