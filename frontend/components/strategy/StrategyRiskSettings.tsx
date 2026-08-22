"use client";

import React from "react";
import {
  Shield,
  AlertTriangle,
  Lock,
  TrendingDown,
  Clock,
  Crosshair,
  Sliders,
  DollarSign,
  Percent,
} from "lucide-react";
import { StrategyRiskConfig } from "@/types/strategy-builder";

interface StrategyRiskSettingsProps {
  risk: StrategyRiskConfig;
  onUpdateRisk: (updated: Partial<StrategyRiskConfig>) => void;
}

export function StrategyRiskSettings({ risk, onUpdateRisk }: StrategyRiskSettingsProps) {
  return (
    <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-5 font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1A2333] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-950 text-red-400 border border-red-800">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Universal Risk & Execution Safeguards
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-mono">
                Mandatory Pre-Trade Defense
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Configure capital protection, stop losses, profit targets, drawdown caps, and auto square-off rules.
            </p>
          </div>
        </div>
      </div>

      {/* 3-Column Risk Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Section 1: Capital & Sizing */}
        <div className="bg-[#121927] border border-[#1E293B] rounded-xl p-3.5 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-cyan-400">
            <DollarSign className="h-3.5 w-3.5" />
            Capital & Position Sizing
          </h4>

          {/* Allocated Capital */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium flex justify-between">
              <span>Allocated Capital ($)</span>
            </label>
            <input
              type="number"
              value={risk.capital}
              onChange={(e) => onUpdateRisk({ capital: parseFloat(e.target.value) || 0 })}
              className="w-full bg-[#0A0E17] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Risk Per Trade % */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Risk Per Trade:</span>
              <span className="text-cyan-400 font-bold font-mono">{risk.risk_per_trade_pct}%</span>
            </div>
            <input
              type="range"
              min={0.25}
              max={5.0}
              step={0.25}
              value={risk.risk_per_trade_pct}
              onChange={(e) => onUpdateRisk({ risk_per_trade_pct: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>0.25% (Conservative)</span>
              <span>1.0% (Standard)</span>
              <span>5.0% (Hard Cap)</span>
            </div>
          </div>

          {/* Max Position Size % */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Max Position Size (% Equity)</label>
            <input
              type="number"
              value={risk.max_position_size_pct}
              onChange={(e) => onUpdateRisk({ max_position_size_pct: parseFloat(e.target.value) || 20 })}
              className="w-full bg-[#0A0E17] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Section 2: Stop Loss & Take Profit */}
        <div className="bg-[#121927] border border-[#1E293B] rounded-xl p-3.5 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-red-400">
            <Crosshair className="h-3.5 w-3.5" />
            Stop Loss & Take Profit
          </h4>

          {/* Stop Loss Model */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Stop Loss Method</label>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={risk.stop_loss_type}
                onChange={(e) => onUpdateRisk({ stop_loss_type: e.target.value as any })}
                className="bg-[#0A0E17] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-red-500"
              >
                <option value="ATR">ATR Multiplier</option>
                <option value="PERCENT">Fixed % Drop</option>
                <option value="FIXED_PRICE">Fixed Price ($)</option>
              </select>

              <input
                type="number"
                step={0.1}
                value={risk.stop_loss_value}
                onChange={(e) => onUpdateRisk({ stop_loss_value: parseFloat(e.target.value) || 0 })}
                placeholder="Multiplier / Value"
                className="bg-[#0A0E17] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-red-400 font-mono font-bold focus:outline-none focus:border-red-500"
              />
            </div>
            <span className="text-[10px] text-slate-500">
              {risk.stop_loss_type === "ATR" ? "Adaptive volatility stop at 1.5x 14-period ATR." : "Static percentage stop."}
            </span>
          </div>

          {/* Take Profit Model */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Take Profit Target</label>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={risk.take_profit_type}
                onChange={(e) => onUpdateRisk({ take_profit_type: e.target.value as any })}
                className="bg-[#0A0E17] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="RR_RATIO">Risk:Reward Multiple</option>
                <option value="ATR">ATR Multiple</option>
                <option value="PERCENT">Fixed % Gain</option>
              </select>

              <input
                type="number"
                step={0.1}
                value={risk.take_profit_value}
                onChange={(e) => onUpdateRisk({ take_profit_value: parseFloat(e.target.value) || 0 })}
                placeholder="Value"
                className="bg-[#0A0E17] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Trailing Stop */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <label className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
              <span>Enable Trailing Stop</span>
            </label>
            <input
              type="checkbox"
              checked={risk.trailing_stop_enabled}
              onChange={(e) => onUpdateRisk({ trailing_stop_enabled: e.target.checked })}
              className="accent-cyan-400 rounded h-4 w-4 cursor-pointer"
            />
          </div>
        </div>

        {/* Section 3: Portfolio Defense & Circuit Breakers */}
        <div className="bg-[#121927] border border-[#1E293B] rounded-xl p-3.5 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Circuit Breakers & Hard Caps
          </h4>

          {/* Max Daily Loss */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Max Daily Loss Cap ($)</label>
            <input
              type="number"
              value={risk.max_daily_loss}
              onChange={(e) => onUpdateRisk({ max_daily_loss: parseFloat(e.target.value) || 0 })}
              className="w-full bg-[#0A0E17] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Max Drawdown */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Max Account Drawdown Limit (%)</label>
            <input
              type="number"
              value={risk.max_drawdown_pct}
              onChange={(e) => onUpdateRisk({ max_drawdown_pct: parseFloat(e.target.value) || 0 })}
              className="w-full bg-[#0A0E17] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Auto Square-off Time */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-slate-400 font-medium">Intraday Auto Square-Off</label>
              <input
                type="checkbox"
                checked={risk.auto_square_off_enabled}
                onChange={(e) => onUpdateRisk({ auto_square_off_enabled: e.target.checked })}
                className="accent-cyan-400 rounded h-3.5 w-3.5"
              />
            </div>
            <input
              type="text"
              value={risk.auto_square_off_time}
              onChange={(e) => onUpdateRisk({ auto_square_off_time: e.target.value })}
              placeholder="e.g. 15:15 IST / 23:55 UTC"
              className="w-full bg-[#0A0E17] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
