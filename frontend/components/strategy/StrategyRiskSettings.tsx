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
  Activity
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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Live Risk:Reward Ratio calculation
  const riskRewardRatio = useMemo(() => {
    const sl = exit.stop_loss_value || 1.0;
    const tp = exit.take_profit_value || 2.0;
    if (sl <= 0) return "1 : ∞";
    const ratio = Math.round((tp / sl) * 100) / 100;
    return `1 : ${ratio}`;
  }, [exit.stop_loss_value, exit.take_profit_value]);

  // Bot capital awareness estimation
  const effectiveCapital = botCapital?.allocated || risk.capital || 10000;
  const currencySymbol = botCapital?.currency === "INR" ? "₹" : "$";
  const maxRiskMonetary = Math.round((effectiveCapital * (risk.risk_per_trade_pct || 1.0)) / 100);
  const maxLossMonetary = Math.round((effectiveCapital * (exit.stop_loss_value || 1.0)) / 100);

  return (
    <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 font-sans select-none text-xs">
      
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#142B21] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-sm">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>Exit & Risk Controls</span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-[#142B21] text-[#55C98A] border border-[#275841] font-mono">
                DETERMINISTIC PRE-TRADE DEFENSE
              </span>
            </h3>
          </div>
        </div>

        {/* Closed-Bar Execution Invariant Badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0C1713] border border-[#1A3127] text-[#8BA596] text-[10px] font-mono"
          title="Zero Lookahead Bias: Signals are evaluated strictly using completed candles only."
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-[#55C98A]" />
          <span className="text-white font-bold">Closed-bar execution</span>
        </div>
      </div>

      {/* Primary Always-Visible Basics (4 Columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* 1. Stop Loss % */}
        <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[#8BA596] font-semibold">Stop Loss (%)</span>
            <span className="text-red-400 font-mono font-bold">-{exit.stop_loss_value || 1.0}%</span>
          </div>
          <input
            type="number"
            step={0.1}
            min={0.1}
            max={50}
            value={exit.stop_loss_value || 1.0}
            onChange={(e) => onUpdateExit({ stop_loss_value: parseFloat(e.target.value) || 1.0 })}
            className="w-full bg-[#060D0A] border border-[#1A3127] rounded-lg px-2.5 py-1.5 text-xs text-red-400 font-mono font-bold focus:outline-none focus:border-red-500"
          />
          <span className="text-[9px] text-[#607D6E] font-mono block">
            Est. Loss: {currencySymbol}{maxLossMonetary.toLocaleString()}
          </span>
        </div>

        {/* 2. Take Profit % */}
        <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[#8BA596] font-semibold">Take Profit (%)</span>
            <span className="text-[#55C98A] font-mono font-bold">+{exit.take_profit_value || 2.0}%</span>
          </div>
          <input
            type="number"
            step={0.1}
            min={0.1}
            max={200}
            value={exit.take_profit_value || 2.0}
            onChange={(e) => onUpdateExit({ take_profit_value: parseFloat(e.target.value) || 2.0 })}
            className="w-full bg-[#060D0A] border border-[#1A3127] rounded-lg px-2.5 py-1.5 text-xs text-[#55C98A] font-mono font-bold focus:outline-none focus:border-[#55C98A]"
          />
          <span className="text-[9px] text-cyan-400 font-mono font-bold block">
            R:R Ratio = {riskRewardRatio}
          </span>
        </div>

        {/* 3. Trailing Stop Loss */}
        <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[#8BA596] font-semibold">Trailing Stop</span>
            <button
              type="button"
              onClick={() => onUpdateExit({ trailing_stop_enabled: !exit.trailing_stop_enabled })}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                exit.trailing_stop_enabled
                  ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60"
                  : "bg-[#060D0A] text-[#607D6E] border border-[#14271F]"
              }`}
            >
              {exit.trailing_stop_enabled ? "ON" : "OFF"}
            </button>
          </div>
          {exit.trailing_stop_enabled ? (
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <input
                type="number"
                step={0.1}
                value={exit.trailing_stop_callback || 0.5}
                onChange={(e) => onUpdateExit({ trailing_stop_callback: parseFloat(e.target.value) || 0.5 })}
                placeholder="Trail %"
                title="Trailing distance %"
                className="w-full bg-[#060D0A] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white font-mono"
              />
              <input
                type="number"
                step={0.1}
                value={exit.trailing_stop_activation || 1.0}
                onChange={(e) => onUpdateExit({ trailing_stop_activation: parseFloat(e.target.value) || 1.0 })}
                placeholder="Act %"
                title="Activation profit %"
                className="w-full bg-[#060D0A] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white font-mono"
              />
            </div>
          ) : (
            <p className="text-[10px] text-[#607D6E] pt-1">Disabled</p>
          )}
          <span className="text-[9px] text-[#607D6E] font-mono block">
            {exit.trailing_stop_enabled ? `Trail ${exit.trailing_stop_callback || 0.5}% after +${exit.trailing_stop_activation || 1.0}%` : "Fixed bracket only"}
          </span>
        </div>

        {/* 4. Risk Per Trade % */}
        <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[#8BA596] font-semibold">Risk / Trade</span>
            <span className="text-cyan-400 font-mono font-bold">{risk.risk_per_trade_pct || 1.0}%</span>
          </div>
          <input
            type="number"
            step={0.25}
            min={0.1}
            max={10}
            value={risk.risk_per_trade_pct || 1.0}
            onChange={(e) => onUpdateRisk({ risk_per_trade_pct: parseFloat(e.target.value) || 1.0 })}
            className="w-full bg-[#060D0A] border border-[#1A3127] rounded-lg px-2.5 py-1.5 text-xs text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
          />
          <span className="text-[9px] text-[#607D6E] font-mono block">
            Budget: {currencySymbol}{maxRiskMonetary.toLocaleString()}
          </span>
        </div>

      </div>

      {/* Bot Capital Awareness Banner */}
      <div className="bg-[#060D0A] border border-[#14271F] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5 text-[#55C98A]" />
          <span className="text-[#8BA596]">Capital Awareness:</span>
          <span className="text-white font-bold">
            {currencySymbol}{effectiveCapital.toLocaleString()} {botCapital?.botName ? `(${botCapital.botName})` : "Base Capital"}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[#8BA596]">
          <div>
            <span>Risk Budget: </span>
            <span className="text-cyan-400 font-bold">{currencySymbol}{maxRiskMonetary.toLocaleString()}</span>
          </div>
          <div>
            <span>Max Capital Drawdown: </span>
            <span className="text-yellow-400 font-bold">{risk.max_drawdown_pct || 5.0}%</span>
          </div>
        </div>
      </div>

      {/* Advanced Exit Settings Accordion */}
      <div className="border-t border-[#142B21] pt-2">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="text-xs font-bold text-[#8BA596] hover:text-white flex items-center gap-1.5 transition-colors"
        >
          {isAdvancedOpen ? <ChevronUp className="h-3.5 w-3.5 text-[#55C98A]" /> : <ChevronDown className="h-3.5 w-3.5" />}
          <span>Advanced Exit Settings</span>
        </button>

        {isAdvancedOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 animate-fadeIn">
            
            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-3 space-y-1.5">
              <label className="text-[11px] text-[#8BA596] font-semibold">Exit Stop Method</label>
              <select
                value={exit.stop_loss_type || "PERCENT"}
                onChange={(e) => onUpdateExit({ stop_loss_type: e.target.value as any })}
                className="w-full bg-[#060D0A] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="PERCENT">Fixed Percentage (%)</option>
                <option value="ATR">Average True Range (ATR Multiplier)</option>
                <option value="FIXED_PRICE">Fixed Price Boundary</option>
              </select>
            </div>

            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-3 space-y-1.5">
              <label className="text-[11px] text-[#8BA596] font-semibold">Max Daily Loss ($)</label>
              <input
                type="number"
                value={risk.max_daily_loss || 500}
                onChange={(e) => onUpdateRisk({ max_daily_loss: parseFloat(e.target.value) || 500 })}
                className="w-full bg-[#060D0A] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white font-mono"
              />
            </div>

            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-3 space-y-1.5">
              <label className="text-[11px] text-[#8BA596] font-semibold">Cooldown Bars After Exit</label>
              <input
                type="number"
                min={0}
                max={50}
                value={risk.cooldown_bars || 3}
                onChange={(e) => onUpdateRisk({ cooldown_bars: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#060D0A] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white font-mono"
              />
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
