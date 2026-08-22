"use client";

import React, { useState } from "react";
import { Layers, TrendingUp, TrendingDown, XOctagon, RefreshCcw, CheckCircle2 } from "lucide-react";
import { PositionSnapshot, OrderSide } from "@/types/order-execution";

interface PositionAwarenessPanelProps {
  position?: PositionSnapshot | null;
  newOrderSide: OrderSide;
  newOrderQty: number;
  onClosePosition: () => void;
  onReversePosition: () => void;
  isProcessing?: boolean;
}

export function PositionAwarenessPanel({
  position,
  newOrderSide,
  newOrderQty,
  onClosePosition,
  onReversePosition,
  isProcessing,
}: PositionAwarenessPanelProps) {
  const [showCloseModal, setShowCloseModal] = useState(false);

  const hasPosition = Boolean(position && Number(position.quantity || 0) > 0 && position.direction !== "FLAT");
  const currentQty = Number(hasPosition ? position?.quantity : 0) || 0;
  const currentDir = hasPosition ? (position?.direction || "LONG") : "FLAT";
  const pnl = Number(hasPosition ? position?.unrealized_pnl : 0) || 0;
  const pnlPct = Number(hasPosition ? position?.unrealized_pnl_pct : 0) || 0;

  // Projected position calculation
  let projectedQty = 0;
  let projectedDir = currentDir;
  if (!hasPosition) {
    projectedQty = newOrderQty;
    projectedDir = newOrderSide === "BUY" ? "LONG" : "SHORT";
  } else {
    if (currentDir === "LONG") {
      projectedQty = newOrderSide === "BUY" ? currentQty + newOrderQty : Math.max(0, currentQty - newOrderQty);
      projectedDir = newOrderSide === "BUY" || currentQty > newOrderQty ? "LONG" : newOrderQty > currentQty ? "SHORT" : "FLAT";
    } else {
      projectedQty = newOrderSide === "SELL" ? currentQty + newOrderQty : Math.max(0, currentQty - newOrderQty);
      projectedDir = newOrderSide === "SELL" || currentQty > newOrderQty ? "SHORT" : newOrderQty > currentQty ? "LONG" : "FLAT";
    }
  }

  return (
    <div className="bg-[#141E33] border border-[#1E293B] rounded-2xl p-4 space-y-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Position Impact & Ledger State</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            hasPosition
              ? currentDir === "LONG"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-red-500/20 text-red-400"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {hasPosition ? `${currentDir} ${currentQty}` : "FLAT (NO POSITION)"}
        </span>
      </div>

      {/* Position Comparison Strip */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#0B111E] border border-slate-800 rounded-xl p-2.5">
          <div className="text-[10px] text-slate-400 uppercase">Current Position</div>
          <div className="text-sm font-bold text-white mt-0.5">
            {hasPosition ? `${currentQty} ${position.symbol}` : "0.00 Units"}
          </div>
          {hasPosition && (
            <div className={`text-[10px] mt-0.5 ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              P&L: {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ({pnlPct.toFixed(2)}%)
            </div>
          )}
        </div>

        <div className="bg-[#0B111E] border border-slate-800 rounded-xl p-2.5">
          <div className="text-[10px] text-slate-400 uppercase">Projected After Fill</div>
          <div className="text-sm font-bold text-cyan-400 mt-0.5">
            {projectedDir} {projectedQty.toFixed(4)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {newOrderSide === "BUY" ? "+Adding Long" : "+Adding Short"}
          </div>
        </div>
      </div>

      {/* Quick Position Actions if Active */}
      {hasPosition && (
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
          <button
            onClick={() => setShowCloseModal(true)}
            className="flex-1 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1"
          >
            <XOctagon className="w-3.5 h-3.5" />
            Close Position
          </button>
          <button
            onClick={onReversePosition}
            disabled={isProcessing}
            className="flex-1 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Reverse Position
          </button>
        </div>
      )}

      {/* Close Position Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Confirm Square-Off Position</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to close your active position of <strong className="text-cyan-400">{currentDir} {currentQty} {position?.symbol}</strong>?
            </p>
            <div className="bg-[#141E33] border border-slate-800 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Unrealized Net P&L:</span>
                <span className={pnl >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                  {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClosePosition();
                  setShowCloseModal(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Confirm Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
