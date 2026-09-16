"use client";

import { formatMoney } from "@/lib/formatters";
import React, { useState } from "react";
import {
  X,
  Percent,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CryptoStrategyBuilderDrawerProps {
  isOpen: boolean;
  template: string;
  selectedUnderlying: string;
  onClose: () => void;
  onExecuteStrategy?: (strategy: any) => void;
}

export const CryptoStrategyBuilderDrawer: React.FC<CryptoStrategyBuilderDrawerProps> = ({
  isOpen,
  template,
  selectedUnderlying,
  onClose,
  onExecuteStrategy,
}) => {
  const [legsCount, setLegsCount] = useState<number>(2);
  const [contractsQty, setContractsQty] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const spotPrice = selectedUnderlying === "BTC" ? 64250 : selectedUnderlying === "ETH" ? 3450 : 152;

  const handleExecute = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      setFeedback(`Paper strategy for ${selectedUnderlying} (${template}) executed successfully.`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-[#050e1d] border-l border-[#143e69] shadow-2xl flex flex-col h-full z-10 text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#0f2d4e] bg-[#07192f]">
          <div>
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-[#00D4FF]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                OPTION STRATEGY BUILDER
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              {selectedUnderlying} • {template.replace(/_/g, " ")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#050e1d] hover:bg-[#0c284a] text-slate-400 hover:text-white border border-[#143e69] transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans">
          {/* Strategy Summary */}
          <div className="bg-[#07192f] border border-[#143e69] rounded-xl p-4 space-y-3 font-mono">
            <span className="font-bold text-sm text-cyan-300 font-sans">Configured Legs</span>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-[#050e1d] border border-[#103456]">
                <div>
                  <span className="font-bold text-emerald-400">+1 BUY CALL</span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    Strike: {formatMoney(spotPrice, "$")} (ATM)
                  </span>
                </div>
                <span className="text-slate-200">$1,420.00</span>
              </div>

              {template.includes("SPREAD") || template.includes("STRADDLE") || template.includes("STRANGLE") ? (
                <div className="flex items-center justify-between p-2 rounded bg-[#050e1d] border border-[#103456]">
                  <div>
                    <span className="font-bold text-rose-400">
                      {template.includes("STRADDLE") || template.includes("STRANGLE") ? "+1 BUY PUT" : "-1 SELL CALL"}
                    </span>
                    <span className="text-slate-400 text-[11px] block mt-0.5">
                      Strike: {formatMoney(spotPrice + 1000, "$")} (OTM)
                    </span>
                  </div>
                  <span className="text-slate-200">$890.00</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Payoff & Risk Profile */}
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="bg-[#07192f] p-3 rounded-xl border border-[#143e69]">
              <span className="text-slate-500 text-[10px] block">MAX PROFIT</span>
              <span className="text-emerald-400 font-bold text-sm mt-1 block">
                {template.includes("SPREAD") ? "$1,000.00" : "Unlimited"}
              </span>
            </div>

            <div className="bg-[#07192f] p-3 rounded-xl border border-[#143e69]">
              <span className="text-slate-500 text-[10px] block">MAX RISK</span>
              <span className="text-rose-400 font-bold text-sm mt-1 block">$530.00</span>
            </div>

            <div className="bg-[#07192f] p-3 rounded-xl border border-[#143e69]">
              <span className="text-slate-500 text-[10px] block">NET DELTA</span>
              <span className="text-cyan-300 font-bold text-sm mt-1 block">+0.28</span>
            </div>

            <div className="bg-[#07192f] p-3 rounded-xl border border-[#143e69]">
              <span className="text-slate-500 text-[10px] block">BREAKEVEN</span>
              <span className="text-white font-bold text-sm mt-1 block">
                {formatMoney(spotPrice + 530, "$")}
              </span>
            </div>
          </div>

          {feedback && (
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
              {feedback}
            </div>
          )}

          {/* Execute Button */}
          <button
            onClick={handleExecute}
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider font-mono transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            {isSubmitting ? "ROUTING MULTI-LEG ORDER..." : "EXECUTE PAPER STRATEGY"}
          </button>
        </div>
      </div>
    </div>
  );
};
