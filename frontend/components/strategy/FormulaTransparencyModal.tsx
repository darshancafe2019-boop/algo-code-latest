"use client";

import React from "react";
import { X, HelpCircle, Calculator, ShieldCheck, DollarSign, Activity } from "lucide-react";
import { ComprehensiveProfitMetrics } from "@/lib/derivatives/profitEngine";

interface FormulaTransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: ComprehensiveProfitMetrics;
  strategyName: string;
}

export const FormulaTransparencyModal: React.FC<FormulaTransparencyModalProps> = ({
  isOpen,
  onClose,
  metrics,
  strategyName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0B1118] border border-[#1E293B] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#0F172A]/50">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#38BDF8]" />
            <h3 className="font-mono font-bold text-sm text-white uppercase tracking-wider">
              Financial Formula & Payoff Transparency — {strategyName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 text-[#94A3B8] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Max Profit */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider">
                Maximum Theoretical Profit
              </span>
              <span className="text-xs font-mono text-white font-bold">
                {metrics.isUnlimitedProfit || metrics.maxProfit === null ? "UNLIMITED" : `${metrics.currency} ${metrics.maxProfit?.toLocaleString()}`}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] font-mono leading-relaxed bg-black/40 p-2.5 rounded-lg border border-white/5 mt-2">
              {metrics.formulaMaxProfit || "Derived from strike width, net premium flow, and contract multipliers."}
            </p>
          </div>

          {/* Max Loss */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono font-bold text-[#EF4444] uppercase tracking-wider">
                Maximum Risk / Max Loss
              </span>
              <span className="text-xs font-mono text-white font-bold">
                {metrics.maxLoss === null ? "UNDEFINED RISK" : `${metrics.currency} ${metrics.maxLoss?.toLocaleString()}`}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] font-mono leading-relaxed bg-black/40 p-2.5 rounded-lg border border-white/5 mt-2">
              {metrics.formulaMaxLoss || "Exact mathematical debit paid or maximum wing adverse move."}
            </p>
          </div>

          {/* Breakeven */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono font-bold text-[#38BDF8] uppercase tracking-wider">
                Expiration Breakeven Price(s)
              </span>
              <span className="text-xs font-mono text-white font-bold">
                {metrics.breakevenPoints.length > 0
                  ? metrics.breakevenPoints.map((b) => `${metrics.currency} ${b.toLocaleString()}`).join(", ")
                  : "N/A"}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] font-mono leading-relaxed bg-black/40 p-2.5 rounded-lg border border-white/5 mt-2">
              {metrics.formulaBreakeven || "Zero-crossing point where strategy gross intrinsic profit equals net costs."}
            </p>
          </div>

          {/* Margin & Capital */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono font-bold text-[#F59E0B] uppercase tracking-wider">
                Required Margin & Capital
              </span>
              <span className="text-xs font-mono text-white font-bold">
                {metrics.currency} {metrics.marginRequired.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] font-mono leading-relaxed bg-black/40 p-2.5 rounded-lg border border-white/5 mt-2">
              {metrics.formulaMargin || "SPAN + Exposure margin for short positions; 100% premium for long positions."}
            </p>
          </div>

          {/* Fees & Slippage Breakdown */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
            <span className="text-xs font-mono font-bold text-[#94A3B8] uppercase tracking-wider block mb-2">
              Transaction Costs & Slippage Impact
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                <div className="text-[10px] text-[#64748B]">Brokerage</div>
                <div className="text-xs font-mono font-bold text-white mt-0.5">
                  {metrics.currency} {metrics.estimatedBrokerage.toFixed(2)}
                </div>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                <div className="text-[10px] text-[#64748B]">Taxes & STT</div>
                <div className="text-xs font-mono font-bold text-white mt-0.5">
                  {metrics.currency} {metrics.estimatedTaxes.toFixed(2)}
                </div>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                <div className="text-[10px] text-[#64748B]">Est. Slippage</div>
                <div className="text-xs font-mono font-bold text-white mt-0.5">
                  {metrics.currency} {metrics.estimatedSlippage.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1E293B] bg-[#0F172A]/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-black font-mono font-bold text-xs rounded-xl transition-all shadow-md"
          >
            Close Formula Inspection
          </button>
        </div>
      </div>
    </div>
  );
};
