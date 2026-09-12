"use client";

import React from "react";
import { Shield, TrendingUp, AlertTriangle, Zap, Percent, Sliders } from "lucide-react";
import { FuturesBuilderConfig } from "@/types/strategy-builder";

interface StrategyFuturesStudioProps {
  config: FuturesBuilderConfig;
  symbol: string;
  onUpdateConfig: (updated: Partial<FuturesBuilderConfig>) => void;
}

export function StrategyFuturesStudio({ config, symbol, onUpdateConfig }: StrategyFuturesStudioProps) {
  const leverage = config.leverage || 5;

  return (
    <div className="bg-[#0A1422] border border-[#12304A] rounded-xl p-3.5 sm:p-4 shadow-sm space-y-3.5 font-sans select-none text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#12304A] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/30">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
              <span>FUTURES & PERPETUAL DERIVATIVES CONFIG</span>
            </h3>
            <p className="text-[11px] text-[#7D8EA5]">
              Configure perpetual basis, leverage tiers, liquidation buffers, and funding rate checks
            </p>
          </div>
        </div>
      </div>

      {/* Inputs Grid: Leverage, Margin Mode, Contract */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        {/* Leverage Slider */}
        <div className="space-y-2 bg-[#0C1727] p-3 rounded-lg border border-[#12304A]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#F8FAFC]">Contract Leverage</label>
            <span className="text-xs font-mono font-bold text-[#22D3EE] px-2 py-0.5 rounded bg-[#0A1422] border border-[#12304A]">
              {leverage}x
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={leverage}
            onChange={(e) => onUpdateConfig({ leverage: parseInt(e.target.value) })}
            className="w-full accent-[#22D3EE] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#7D8EA5]">
            <span>1x (Spot Eq)</span>
            <span>10x</span>
            <span>25x</span>
            <span>50x Max</span>
          </div>
        </div>

        {/* Margin Mode */}
        <div className="space-y-2 bg-[#0C1727] p-3 rounded-lg border border-[#12304A]">
          <label className="text-xs font-bold text-[#F8FAFC] block">Margin Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onUpdateConfig({ margin_mode: "ISOLATED" })}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                config.margin_mode === "ISOLATED"
                  ? "bg-[#168BFF] text-white"
                  : "bg-[#0A1422] text-[#7D8EA5] hover:text-[#F8FAFC] border border-[#12304A]"
              }`}
            >
              ISOLATED
            </button>
            <button
              type="button"
              onClick={() => onUpdateConfig({ margin_mode: "CROSS" })}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                config.margin_mode === "CROSS"
                  ? "bg-[#168BFF] text-white"
                  : "bg-[#0A1422] text-[#7D8EA5] hover:text-[#F8FAFC] border border-[#12304A]"
              }`}
            >
              CROSS
            </button>
          </div>
          <span className="text-[10px] text-[#7D8EA5] block leading-tight">
            {config.margin_mode === "ISOLATED"
              ? "Limits risk strictly to the margin allocated to this position."
              : "Shares account balance across open positions to prevent liquidation."}
          </span>
        </div>

        {/* Contract Type & Basis */}
        <div className="space-y-2 bg-[#0C1727] p-3 rounded-lg border border-[#12304A]">
          <label className="text-xs font-bold text-[#F8FAFC] block">Contract Specifications</label>
          <div className="text-[11px] space-y-1 text-[#B7C6D8]">
            <div className="flex justify-between">
              <span className="text-[#7D8EA5]">Underlying:</span>
              <span className="font-bold text-[#F8FAFC]">{symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7D8EA5]">Funding Rate:</span>
              <span className="text-[#00E89A] font-bold">+0.0082% (8h)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7D8EA5]">Annualized Basis:</span>
              <span className="text-[#22D3EE] font-bold">+4.12%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
