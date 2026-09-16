"use client";

import React from "react";
import {
  Percent,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CryptoStrategiesTabProps {
  selectedUnderlying: string;
  onOpenBuilder: (template: string) => void;
}

export const CryptoStrategiesTab: React.FC<CryptoStrategiesTabProps> = ({
  selectedUnderlying,
  onOpenBuilder,
}) => {
  const templates = [
    { id: "LONG_CALL", name: "Long Call", outlook: "Bullish", legs: 1, maxProfit: "Unlimited", maxLoss: "Premium Paid", icon: TrendingUp, color: "text-emerald-400" },
    { id: "LONG_PUT", name: "Long Put", outlook: "Bearish", legs: 1, maxProfit: "Substantial", maxLoss: "Premium Paid", icon: TrendingDown, color: "text-rose-400" },
    { id: "BULL_CALL", name: "Bull Call Spread", outlook: "Moderate Bullish", legs: 2, maxProfit: "Capped (Width - Net Debit)", maxLoss: "Net Debit", icon: TrendingUp, color: "text-emerald-300" },
    { id: "BEAR_PUT", name: "Bear Put Spread", outlook: "Moderate Bearish", legs: 2, maxProfit: "Capped (Width - Net Debit)", maxLoss: "Net Debit", icon: TrendingDown, color: "text-rose-300" },
    { id: "STRADDLE", name: "Long Straddle", outlook: "High Volatility", legs: 2, maxProfit: "Unlimited", maxLoss: "Total Premium Paid", icon: Sparkles, color: "text-purple-300" },
    { id: "STRANGLE", name: "Long Strangle", outlook: "Extreme Volatility", legs: 2, maxProfit: "Unlimited", maxLoss: "Total Premium Paid", icon: Sparkles, color: "text-cyan-300" },
    { id: "IRON_CONDOR", name: "Iron Condor", outlook: "Range-Bound", legs: 4, maxProfit: "Net Credit", maxLoss: "Wing Width - Net Credit", icon: Layers, color: "text-amber-300" },
    { id: "CUSTOM", name: "Custom Multi-Leg", outlook: "Any Regime", legs: "1-4", maxProfit: "Dynamic", maxLoss: "Dynamic", icon: Percent, color: "text-blue-300" },
  ];

  return (
    <div className="space-y-4 select-none">
      <div className="bg-[#050e1d] border border-[#12365a] rounded-xl p-4 shadow-md flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            {selectedUnderlying} MULTI-LEG OPTION STRATEGY TEMPLATES
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a strategy preset to configure strikes, payoff curves, Greeks, and paper execute.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {templates.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <div
              key={tpl.id}
              onClick={() => onOpenBuilder(tpl.id)}
              className="bg-[#050e1d] border border-[#12365a] hover:border-[#00D4FF]/60 rounded-xl p-4 flex flex-col justify-between transition-all cursor-pointer group shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#0d2847]">
                  <span className="font-bold text-sm text-white group-hover:text-[#00D4FF] transition-colors">
                    {tpl.name}
                  </span>
                  <Icon className={cn("h-4 w-4", tpl.color)} />
                </div>

                <div className="space-y-1.5 my-3 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px]">OUTLOOK:</span>
                    <span className="text-slate-200 font-bold">{tpl.outlook}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px]">LEGS:</span>
                    <span className="text-cyan-300 font-bold">{tpl.legs}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px]">MAX PROFIT:</span>
                    <span className="text-emerald-400 font-bold text-[11px]">{tpl.maxProfit}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px]">MAX LOSS:</span>
                    <span className="text-rose-400 font-bold text-[11px]">{tpl.maxLoss}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#0d2847] flex items-center justify-between text-xs font-bold text-[#00D4FF] group-hover:text-white transition-colors">
                <span>Configure & Payoff</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
