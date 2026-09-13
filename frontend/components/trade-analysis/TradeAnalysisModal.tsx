"use client";

import React from "react";
import { X, Activity } from "lucide-react";
import { TradeAnalysisDashboard } from "./TradeAnalysisDashboard";
import { TradeAnalysisInstrument } from "./TradeAnalysisTypes";

interface TradeAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  instrument?: Partial<TradeAnalysisInstrument>;
}

export function TradeAnalysisModal({
  isOpen,
  onClose,
  instrument,
}: TradeAnalysisModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-6xl bg-[#050C16] border border-[#16375A] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#07111F] border-b border-[#0F2236] shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#22D3EE]" />
            <span className="font-black text-xs text-[#F8FAFC] tracking-wider uppercase">
              Pre-Trade Setup Analysis & Validation
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#7D8EA5] hover:text-white hover:bg-[#0E2036] transition-colors cursor-pointer"
            title="Close Modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Dashboard Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-thin">
          <TradeAnalysisDashboard
            initialInstrument={instrument}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
