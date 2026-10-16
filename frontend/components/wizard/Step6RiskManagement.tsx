"use client";

import React from "react";
import { BotWizardDraft, RiskConfig } from "./types";
import {
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Clock,
  Zap,
  Lock,
  Flame,
  ArrowRight,
} from "lucide-react";

interface Step6Props {
  draft: BotWizardDraft;
  updateDraft: (updates: Partial<BotWizardDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Step6RiskManagement({ draft, updateDraft, onNext, onPrev }: Step6Props) {
  const risk = draft.risk;

  const updateRisk = (updates: Partial<RiskConfig>) => {
    updateDraft({
      risk: {
        ...draft.risk,
        ...updates,
      },
    });
  };

  const isIndia = draft.market_type.includes("INDIA");
  const currencySymbol = isIndia ? "₹" : "$";

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Info Banner */}
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-[#0B1528] via-[#09101F] to-[#0D182E] p-6 shadow-xl flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-sm">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wide">
              Step 6 — Multi-Layered Risk Management Engine
            </h3>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              DETERMINISTIC GUARDS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
            Every order intent evaluated by the strategy engine MUST pass strict risk gates, slippage limits, and portfolio circuit breakers before reaching the exchange.
          </p>
        </div>
      </div>

      {/* Risk Engine Pipeline Visualizer */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0B1426]/90 p-5 shadow-lg backdrop-blur-md">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-300 mb-3 font-bold flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
          AUTHORITATIVE ORDER INTENT VALIDATION FLOW:
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-mono">
          <div className="px-4 py-2.5 rounded-xl bg-[#070D1A] border border-slate-800 text-slate-200 font-bold shadow-inner">
            1. Strategy Signal
          </div>
          <ArrowRight className="h-5 w-5 text-cyan-400" />
          <div className="px-4 py-2.5 rounded-xl bg-[#070D1A] border border-slate-800 text-slate-200 font-bold shadow-inner">
            2. Fresh Market Quote
          </div>
          <ArrowRight className="h-5 w-5 text-cyan-400" />
          <div className="px-4 py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/50 text-cyan-300 font-bold shadow-md shadow-blue-950/40">
            3. Risk Engine Validation
          </div>
          <ArrowRight className="h-5 w-5 text-cyan-400" />
          <div className="px-4 py-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 font-bold shadow-inner">
            4. Broker Order Route
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Stop Loss & Protection */}
        <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
            <ShieldAlert className="h-5 w-5 text-rose-400" />
            <h4 className="text-sm sm:text-base font-mono font-bold uppercase tracking-wider text-white">
              Stop Loss & Capital Protection
            </h4>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-mono text-slate-200 mb-1.5 font-bold uppercase">
              Stop Loss Mode
            </label>
            <select
              value={risk.stop_loss_mode}
              onChange={(e) => updateRisk({ stop_loss_mode: e.target.value as any })}
              className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-xs sm:text-sm font-mono font-bold text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="PERCENTAGE">PERCENTAGE (%)</option>
              <option value="FIXED_POINTS">FIXED POINTS / TICKS</option>
              <option value="ATR">ATR MULTIPLIER (DYNAMIC)</option>
              <option value="PREMIUM_PCT">PREMIUM % (OPTIONS)</option>
              <option value="SWING_HIGH_LOW">SWING HIGH / LOW</option>
              <option value="INDICATOR_BASED">INDICATOR BASED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-mono text-slate-200 mb-1.5 font-bold uppercase">
              Stop Loss Threshold ({risk.stop_loss_mode === "PERCENTAGE" ? "%" : risk.stop_loss_mode === "ATR" ? "x ATR" : currencySymbol})
            </label>
            <input
              type="number"
              step="any"
              value={risk.stop_loss_value}
              onChange={(e) => updateRisk({ stop_loss_value: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-sm sm:text-base font-mono font-black text-rose-400 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-mono text-slate-200 mb-1.5 font-bold uppercase">
              Trailing Stop Mode
            </label>
            <select
              value={risk.trailing_stop_mode}
              onChange={(e) => updateRisk({ trailing_stop_mode: e.target.value as any })}
              className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-xs sm:text-sm font-mono font-bold text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="OFF">OFF (DISABLED)</option>
              <option value="POINTS">POINTS / TICKS</option>
              <option value="PERCENTAGE">PERCENTAGE (%)</option>
              <option value="ATR">ATR STEP</option>
              <option value="STEP_TRAILING">STEP TRAILING</option>
            </select>
          </div>

          {risk.trailing_stop_mode !== "OFF" && (
            <div>
              <label className="block text-xs sm:text-sm font-mono text-slate-200 mb-1.5 font-bold uppercase">
                Trailing Step Value
              </label>
              <input
                type="number"
                step="any"
                value={risk.trailing_stop_value}
                onChange={(e) => updateRisk({ trailing_stop_value: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-sm sm:text-base font-mono font-black text-amber-400 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Card 2: Profit Targets & Style */}
        <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
            <Zap className="h-5 w-5 text-emerald-400" />
            <h4 className="text-sm sm:text-base font-mono font-bold uppercase tracking-wider text-white">
              Target & Execution Style
            </h4>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-mono text-slate-200 mb-1.5 font-bold uppercase">
              Take Profit Mode
            </label>
            <select
              value={risk.take_profit_mode}
              onChange={(e) => updateRisk({ take_profit_mode: e.target.value as any })}
              className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-xs sm:text-sm font-mono font-bold text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="PERCENTAGE">PERCENTAGE (%)</option>
              <option value="FIXED_POINTS">FIXED POINTS / TICKS</option>
              <option value="RISK_REWARD">RISK REWARD RATIO (R:R)</option>
              <option value="TARGET_LEVEL">TECHNICAL TARGET LEVEL</option>
              <option value="INDICATOR_BASED">INDICATOR BASED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-mono text-slate-200 mb-1.5 font-bold uppercase">
              Take Profit Threshold ({risk.take_profit_mode === "RISK_REWARD" ? "R:R Ratio" : risk.take_profit_mode === "PERCENTAGE" ? "%" : currencySymbol})
            </label>
            <input
              type="number"
              step="any"
              value={risk.take_profit_value}
              onChange={(e) => updateRisk({ take_profit_value: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-sm sm:text-base font-mono font-black text-emerald-400 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-mono text-slate-200 mb-1.5 font-bold uppercase">
              Trading Style Profile
            </label>
            <select
              value={risk.trading_style}
              onChange={(e) => updateRisk({ trading_style: e.target.value as any })}
              className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-xs sm:text-sm font-mono font-bold text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="SCALPING">SCALPING (FAST TURNOVER)</option>
              <option value="INTRADAY">INTRADAY (AUTO SQUARE-OFF)</option>
              <option value="SWING">SWING (MULTI-DAY)</option>
              <option value="POSITIONAL">POSITIONAL (LONG-TERM)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-mono text-slate-200 mb-1.5 font-bold uppercase">
              Order Route Type
            </label>
            <select
              value={risk.order_type}
              onChange={(e) => updateRisk({ order_type: e.target.value as any })}
              className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-xs sm:text-sm font-mono font-bold text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="MARKET">MARKET (IMMEDIATE EXECUTION)</option>
              <option value="LIMIT">LIMIT (MAKER ONLY / SPREAD CAPTURE)</option>
              <option value="STOP">STOP LOSS MARKET</option>
              <option value="STOP_LIMIT">STOP LIMIT</option>
            </select>
          </div>
        </div>

        {/* Card 3: Account Exposure & Circuit Breakers */}
        <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
            <Lock className="h-5 w-5 text-cyan-400" />
            <h4 className="text-sm sm:text-base font-mono font-bold uppercase tracking-wider text-white">
              Exposure Limits & Guardrails
            </h4>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-mono text-slate-200 mb-1.5 font-bold uppercase">
              Max Daily Loss Circuit Breaker ({currencySymbol})
            </label>
            <input
              type="number"
              step="any"
              value={risk.max_daily_loss}
              onChange={(e) => updateRisk({ max_daily_loss: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-sm sm:text-base font-mono font-black text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-mono text-slate-200 mb-1.5 font-bold uppercase">
              Max Drawdown Limit (%)
            </label>
            <input
              type="number"
              step="any"
              value={risk.max_drawdown_pct}
              onChange={(e) => updateRisk({ max_drawdown_pct: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-sm sm:text-base font-mono font-black text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs sm:text-sm font-mono text-slate-200 mb-1.5 font-bold uppercase">
                Max Trades/Day
              </label>
              <input
                type="number"
                value={risk.max_trades_per_day}
                onChange={(e) => updateRisk({ max_trades_per_day: parseInt(e.target.value) || 1 })}
                className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-sm sm:text-base font-mono font-black text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-mono text-slate-200 mb-1.5 font-bold uppercase">
                Max Open Positions
              </label>
              <input
                type="number"
                value={risk.max_open_positions}
                onChange={(e) => updateRisk({ max_open_positions: parseInt(e.target.value) || 1 })}
                className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-sm sm:text-base font-mono font-black text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {risk.trading_style === "INTRADAY" && (
            <div>
              <label className="block text-xs sm:text-sm font-mono text-slate-200 mb-1.5 font-bold uppercase">
                Auto Square-Off Session Time (Exchange Local)
              </label>
              <input
                type="text"
                value={risk.auto_square_off_time}
                onChange={(e) => updateRisk({ auto_square_off_time: e.target.value })}
                placeholder="15:15"
                className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-sm sm:text-base font-mono font-black text-amber-400 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-5 border-t border-slate-800/80">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-xl border border-slate-800 bg-[#0B1426] hover:bg-slate-800 px-6 py-3 text-xs sm:text-sm font-mono font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
        >
          ← Return to Step 5
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 px-7 py-3 text-xs sm:text-sm font-mono font-black text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
        >
          <span>Continue to Step 7: Review & Deploy</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
