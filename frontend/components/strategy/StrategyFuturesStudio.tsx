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
    <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 font-sans select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1A2333] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-950 text-teal-400 border border-teal-800">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Futures & Perpetual Derivatives Studio
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800 font-mono">
                Leverage & Margin Safety
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Configure perpetual contracts, leverage tiers, liquidation buffer boundaries, and funding rate checks.
            </p>
          </div>
        </div>
      </div>

      {/* Inputs Grid: Leverage, Margin Mode, Contract */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Leverage Slider */}
        <div className="space-y-2 bg-[#121927] p-3.5 rounded-xl border border-[#1E293B]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">Contract Leverage</label>
            <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
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
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>1x (Spot Eq)</span>
            <span>10x</span>
            <span>25x</span>
            <span>50x Max</span>
          </div>
        </div>

        {/* Margin Mode */}
        <div className="space-y-2 bg-[#121927] p-3.5 rounded-xl border border-[#1E293B]">
          <label className="text-xs font-bold text-slate-300 block">Margin Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdateConfig({ margin_mode: "ISOLATED" })}
              className={`py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                config.margin_mode === "ISOLATED"
                  ? "bg-cyan-600 text-white shadow-md"
                  : "bg-[#0A0E17] text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              ISOLATED
            </button>
            <button
              onClick={() => onUpdateConfig({ margin_mode: "CROSS" })}
              className={`py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                config.margin_mode === "CROSS"
                  ? "bg-cyan-600 text-white shadow-md"
                  : "bg-[#0A0E17] text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              CROSS
            </button>
          </div>
          <span className="text-[10px] text-slate-400 block">
            {config.margin_mode === "ISOLATED"
              ? "Limits maximum risk strictly to the margin allocated to this position."
              : "Shares margin balance across all open positions to prevent premature liquidation."}
          </span>
        </div>

        {/* Contract Type & Basis */}
        <div className="space-y-2 bg-[#121927] p-3.5 rounded-xl border border-[#1E293B]">
          <label className="text-xs font-bold text-slate-300 block">Contract Specifications</label>
          <div className="text-[11px] font-mono space-y-1 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Contract:</span>
              <span className="text-cyan-400 font-bold">{symbol || "BTC/USDT"}:PERP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Est. Funding:</span>
              <span className="text-emerald-400 font-bold">+0.0100% / 8h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Liq Distance:</span>
              <span className="text-purple-400 font-bold">~{(100 / Math.max(1, Number(leverage) || 1)).toFixed(1)}% price drop</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
