"use client";

import React, { useState, useMemo } from "react";
import {
  Shield,
  Percent,
  Sliders,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  DollarSign,
  Info,
  Clock,
  Crosshair,
  Lock,
  Layers,
  Activity,
} from "lucide-react";
import { StrategyIdeRisk, StrategyIdeExit } from "@/types/strategy-ide";

interface StrategyRiskSettingsProps {
  risk: StrategyIdeRisk;
  exit: StrategyIdeExit;
  onUpdateRisk: (updated: Partial<StrategyIdeRisk>) => void;
  onUpdateExit: (updated: Partial<StrategyIdeExit>) => void;
  botCapital?: {
    allocated: number;
    currency?: string;
    botName?: string;
  };
}

export function StrategyRiskSettings({
  risk,
  exit,
  onUpdateRisk,
  onUpdateExit,
  botCapital,
}: StrategyRiskSettingsProps) {
  const [isAdvancedExitOpen, setIsAdvancedExitOpen] = useState(false);
  const [isAdvancedLogicOpen, setIsAdvancedLogicOpen] = useState(false);

  // Live Risk:Reward Ratio calculation
  const riskRewardRatio = useMemo(() => {
    const sl = exit.stop_loss_value || 1.0;
    const tp = exit.take_profit_value || 2.0;
    if (sl <= 0) return "1 : ∞";
    const ratio = Math.round((tp / sl) * 100) / 100;
    return `1 : ${ratio}`;
  }, [exit.stop_loss_value, exit.take_profit_value]);

  const effectiveCapital = botCapital?.allocated || risk.capital || 10000;
  const currencySymbol = botCapital?.currency === "INR" ? "₹" : "$";
  const maxRiskMonetary = Math.round((effectiveCapital * (risk.risk_per_trade_pct || 1.0)) / 100);

  return (
    <section className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 font-sans select-none text-xs">
      
      {/* 1. Header & Closed-Bar Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#142B21] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-sm">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>EXIT & RISK</span>
            </h3>
            <p className="text-[11px] text-[#8BA596]">Deterministic capital preservation rules</p>
          </div>
        </div>

        {/* Closed-Bar Execution Invariant Badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0C1713] border border-[#1A3127] text-[#8BA596] text-[10px] font-mono"
          title="Strategy evaluates completed candles only."
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-[#55C98A]" />
          <span className="text-white font-bold">✓ Closed-Bar Signals</span>
        </div>
      </div>

      {/* 2. Primary 5-Metric Simple Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
        
        {/* 1. Stop Loss % */}
        <div className="bg-[#060D0A] border border-[#14271F] rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[#8BA596] font-semibold">Stop Loss</span>
            <span className="text-red-400 font-bold">-{exit.stop_loss_value || 1.0}%</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step={0.1}
              min={0.1}
              max={50}
              value={exit.stop_loss_value || 1.0}
              onChange={(e) => onUpdateExit({ stop_loss_value: parseFloat(e.target.value) || 1.0 })}
              className="w-full bg-[#09110E] border border-[#1A3127] rounded-lg px-2.5 py-1 text-xs text-red-400 font-bold focus:outline-none focus:border-red-500"
            />
            <span className="text-[#8BA596]">%</span>
          </div>
        </div>

        {/* 2. Take Profit % */}
        <div className="bg-[#060D0A] border border-[#14271F] rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[#8BA596] font-semibold">Take Profit</span>
            <span className="text-[#55C98A] font-bold">+{exit.take_profit_value || 2.0}%</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step={0.1}
              min={0.1}
              max={200}
              value={exit.take_profit_value || 2.0}
              onChange={(e) => onUpdateExit({ take_profit_value: parseFloat(e.target.value) || 2.0 })}
              className="w-full bg-[#09110E] border border-[#1A3127] rounded-lg px-2.5 py-1 text-xs text-[#55C98A] font-bold focus:outline-none focus:border-[#55C98A]"
            />
            <span className="text-[#8BA596]">%</span>
          </div>
        </div>

        {/* 3. Trailing Stop Toggle */}
        <div className="bg-[#060D0A] border border-[#14271F] rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[#8BA596] font-semibold">Trailing Stop</span>
            <button
              type="button"
              onClick={() => onUpdateExit({ trailing_stop_enabled: !exit.trailing_stop_enabled })}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                exit.trailing_stop_enabled
                  ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60"
                  : "bg-[#09110E] text-[#607D6E] border border-[#14271F]"
              }`}
            >
              {exit.trailing_stop_enabled ? "ON" : "OFF"}
            </button>
          </div>
          <div className="text-[10px] text-[#607D6E] pt-1">
            {exit.trailing_stop_enabled ? "Dynamic trail active" : "Fixed Stop Loss"}
          </div>
        </div>

        {/* 4. Risk / Trade % */}
        <div className="bg-[#060D0A] border border-[#14271F] rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[#8BA596] font-semibold">Risk / Trade</span>
            <span className="text-white font-bold">{risk.risk_per_trade_pct || 1.0}%</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step={0.1}
              min={0.1}
              max={10}
              value={risk.risk_per_trade_pct || 1.0}
              onChange={(e) => onUpdateRisk({ risk_per_trade_pct: parseFloat(e.target.value) || 1.0 })}
              className="w-full bg-[#09110E] border border-[#1A3127] rounded-lg px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-[#55C98A]"
            />
            <span className="text-[#8BA596]">%</span>
          </div>
        </div>

        {/* 5. R:R Ratio */}
        <div className="bg-[#060D0A] border border-[#14271F] rounded-xl p-3 space-y-1.5 flex flex-col justify-between">
          <span className="text-[11px] text-[#8BA596] font-semibold">R:R Ratio</span>
          <span className="text-sm text-cyan-400 font-bold">{riskRewardRatio}</span>
          <span className="text-[9px] text-[#607D6E] font-mono">
            Max Risk: {currencySymbol}{maxRiskMonetary}
          </span>
        </div>

      </div>

      {/* 3. Trailing Stop Expanded Controls (Only when ON) */}
      {exit.trailing_stop_enabled && (
        <div className="bg-[#060D0A] border border-[#14271F] rounded-xl p-3.5 space-y-2 animate-fadeIn font-mono text-xs">
          <span className="text-xs font-bold text-[#55C98A] uppercase">Trailing Stop Configuration</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-[11px] text-[#8BA596]">Trailing Distance (%)</span>
              <input
                type="number"
                step={0.1}
                min={0.1}
                max={20}
                value={exit.trailing_stop_callback || 0.5}
                onChange={(e) => onUpdateExit({ trailing_stop_callback: parseFloat(e.target.value) || 0.5 })}
                className="w-full bg-[#09110E] border border-[#1A3127] rounded-lg px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-[#55C98A]"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-[#8BA596]">Activate After Gain (%)</span>
              <input
                type="number"
                step={0.1}
                min={0.1}
                max={50}
                value={exit.trailing_stop_activation || 1.0}
                onChange={(e) => onUpdateExit({ trailing_stop_activation: parseFloat(e.target.value) || 1.0 })}
                className="w-full bg-[#09110E] border border-[#1A3127] rounded-lg px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-[#55C98A]"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Collapsible Advanced Exit Settings */}
      <div className="border-t border-[#142B21] pt-2">
        <button
          type="button"
          onClick={() => setIsAdvancedExitOpen(!isAdvancedExitOpen)}
          className="w-full flex items-center justify-between text-xs font-bold text-[#8BA596] hover:text-white transition-colors"
        >
          <span>Advanced Exit Settings</span>
          {isAdvancedExitOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {isAdvancedExitOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 font-mono text-xs animate-fadeIn">
            <div className="space-y-1">
              <span className="text-[11px] text-[#8BA596]">Max Position Size (%)</span>
              <input
                type="number"
                min={1}
                max={100}
                value={risk.max_position_size_pct || 25}
                onChange={(e) => onUpdateRisk({ max_position_size_pct: parseFloat(e.target.value) || 25 })}
                className="w-full bg-[#060D0A] border border-[#14271F] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#55C98A]"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-[#8BA596]">Max Daily Loss ($)</span>
              <input
                type="number"
                min={10}
                max={50000}
                value={risk.max_daily_loss || 500}
                onChange={(e) => onUpdateRisk({ max_daily_loss: parseFloat(e.target.value) || 500 })}
                className="w-full bg-[#060D0A] border border-[#14271F] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#55C98A]"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-[#8BA596]">Cooldown Bars After Exit</span>
              <input
                type="number"
                min={0}
                max={50}
                value={risk.cooldown_bars || 3}
                onChange={(e) => onUpdateRisk({ cooldown_bars: parseInt(e.target.value) || 3 })}
                className="w-full bg-[#060D0A] border border-[#14271F] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#55C98A]"
              />
            </div>
          </div>
        )}
      </div>

    </section>
  );
}
