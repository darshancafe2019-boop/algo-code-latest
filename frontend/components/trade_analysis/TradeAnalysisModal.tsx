"use client";

import React from "react";
import { X } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#090d16] border border-[#1e293b] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
          <h2 className="text-lg font-bold text-white tracking-wide">Trade Analytics & Risk Breakdown</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <TradeAnalysisDashboard initialInstrument={instrument} />
      </div>
    </div>
  );
}
