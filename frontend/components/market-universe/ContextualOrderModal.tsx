"use client";

import React from "react";
import { X, Zap, ShieldCheck } from "lucide-react";
import { MarketInstrument } from "@/types/market-universe";
import { OrderExecutionCenter } from "@/components/order-execution/OrderExecutionCenter";

interface ContextualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  instrument: MarketInstrument | null;
}

export function ContextualOrderModal({
  isOpen,
  onClose,
  instrument,
}: ContextualOrderModalProps) {
  if (!isOpen || !instrument) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B111E] border border-[#1E293B] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 font-sans">
        {/* Header */}
        <div className="p-4 border-b border-[#1E293B] bg-[#080D17] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Contextual Order Ticket • {instrument.canonical_symbol || instrument.symbol}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Authoritative mark execution with 12-stage Universal Risk Engine validation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order Execution Center */}
        <div className="p-4 max-h-[80vh] overflow-y-auto">
          <OrderExecutionCenter
            initialInstrument={instrument}
            initialPrice={instrument.last_price || 0}
          />
        </div>
      </div>
    </div>
  );
}
