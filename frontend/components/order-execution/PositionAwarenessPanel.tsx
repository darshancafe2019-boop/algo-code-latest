"use client";

import React, { useState } from "react";
import { Layers, XOctagon, RefreshCcw } from "lucide-react";
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
    <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-3 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#F7FAFC]">
          <Layers className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span>POSITION IMPACT & LEDGER STATE</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
            hasPosition
              ? currentDir === "LONG"
                ? "bg-[#00E890]/15 text-[#00E890] border border-[#00E890]/30"
                : "bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30"
              : "bg-[#101B2D] text-[#7C8CA3]"
          }`}
        >
          {hasPosition ? `${currentDir} ${currentQty}` : "FLAT (NO POSITION)"}
        </span>
      </div>

      {/* Position Comparison Strip */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#07101A] border border-[#1A2A3F] rounded-lg p-2.5">
          <div className="text-[10px] text-[#7C8CA3] uppercase">Current Position</div>
          <div className="text-sm font-bold text-[#F7FAFC] mt-0.5 font-mono tabular-nums">
            {hasPosition ? `${currentQty} ${position?.symbol}` : "0.00 Units"}
          </div>
          {hasPosition && (
            <div className={`text-[10px] mt-0.5 font-mono tabular-nums ${pnl >= 0 ? "text-[#00E890]" : "text-[#FF3B5C]"}`}>
              P&L: {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ({pnlPct.toFixed(2)}%)
            </div>
          )}
        </div>

        <div className="bg-[#07101A] border border-[#1A2A3F] rounded-lg p-2.5">
          <div className="text-[10px] text-[#7C8CA3] uppercase">Projected After Fill</div>
          <div className="text-sm font-bold text-[#22D3EE] mt-0.5 font-mono tabular-nums">
            {projectedDir} {projectedQty.toFixed(4)}
          </div>
          <div className="text-[10px] text-[#7C8CA3] mt-0.5">
            {newOrderSide === "BUY" ? "+Adding Long" : "+Adding Short"}
          </div>
        </div>
      </div>

      {/* Quick Position Actions if Active */}
      {hasPosition && (
        <div className="flex items-center gap-2 pt-1 border-t border-[#1A2A3F]">
          <button
            onClick={() => setShowCloseModal(true)}
            className="flex-1 py-1.5 rounded-lg bg-[#FF3B5C]/15 hover:bg-[#FF3B5C]/25 text-[#FF3B5C] border border-[#FF3B5C]/30 text-xs font-semibold transition-all flex items-center justify-center gap-1"
          >
            <XOctagon className="w-3.5 h-3.5" />
            Close Position
          </button>
          <button
            onClick={onReversePosition}
            disabled={isProcessing}
            className="flex-1 py-1.5 rounded-lg bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#F59E0B] border border-[#F59E0B]/30 text-xs font-semibold transition-all flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Reverse Position
          </button>
        </div>
      )}

      {/* Close Position Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#F7FAFC]">Confirm Square-Off Position</h3>
            <p className="text-xs text-[#7C8CA3]">
              Are you sure you want to close your active position of <strong className="text-[#22D3EE] font-mono">{currentDir} {currentQty} {position?.symbol}</strong>?
            </p>
            <div className="bg-[#07101A] border border-[#1A2A3F] rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between text-[#7C8CA3]">
                <span>Unrealized Net P&L:</span>
                <span className={`font-mono tabular-nums font-bold ${pnl >= 0 ? "text-[#00E890]" : "text-[#FF3B5C]"}`}>
                  {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1A2A3F]">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-3 py-1.5 rounded-lg bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] text-[#7C8CA3] hover:text-[#F7FAFC] text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClosePosition();
                  setShowCloseModal(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#FF3B5C] hover:bg-[#dc2626] text-white text-xs font-semibold shadow-sm"
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

