"use client";

import React from "react";
import {
  Trash2,
  Copy,
  Power,
  Clock,
  ArrowRight,
  TrendingUp,
  Sliders,
  ChevronDown,
  Info,
} from "lucide-react";
import { VisualRule, RuleTimeframe } from "@/types/strategy-builder";

interface StrategyRuleCardProps {
  rule: VisualRule;
  index: number;
  totalCount: number;
  conjunction: "AND" | "OR";
  mode: "simple" | "advanced";
  onUpdate: (updated: Partial<VisualRule>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function StrategyRuleCard({
  rule,
  index,
  totalCount,
  conjunction,
  mode,
  onUpdate,
  onDelete,
  onDuplicate,
}: StrategyRuleCardProps) {
  const timeframes: RuleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"];

  const indicatorOptions = [
    { value: "close", label: "Close Price", simple: "Close Price" },
    { value: "open", label: "Open Price", simple: "Open Price" },
    { value: "high", label: "High Price", simple: "High Price" },
    { value: "low", label: "Low Price", simple: "Low Price" },
    { value: "vwap", label: "VWAP", simple: "VWAP" },
    { value: "ema_9", label: "EMA (9)", simple: "Fast EMA (9)" },
    { value: "ema_20", label: "EMA (20)", simple: "EMA (20)" },
    { value: "ema_21", label: "EMA (21)", simple: "EMA (21)" },
    { value: "ema_50", label: "EMA (50)", simple: "Mid EMA (50)" },
    { value: "ema_200", label: "EMA (200)", simple: "Trend Baseline EMA (200)" },
    { value: "sma_20", label: "SMA (20)", simple: "SMA (20)" },
    { value: "sma_50", label: "SMA (50)", simple: "SMA (50)" },
    { value: "sma_200", label: "SMA (200)", simple: "SMA (200)" },
    { value: "rsi_14", label: "RSI (14)", simple: "RSI (14)" },
    { value: "macd_line", label: "MACD Line", simple: "MACD Line" },
    { value: "macd_signal", label: "MACD Signal", simple: "MACD Signal" },
    { value: "macd_hist", label: "MACD Histogram", simple: "MACD Histogram" },
    { value: "stoch_k", label: "Stochastic %K", simple: "Stochastic %K" },
    { value: "bb_upper", label: "Bollinger Upper Band", simple: "Bollinger Upper" },
    { value: "bb_lower", label: "Bollinger Lower Band", simple: "Bollinger Lower" },
    { value: "atr_14", label: "ATR (14)", simple: "Volatility ATR (14)" },
    { value: "adx", label: "ADX Strength", simple: "ADX Trend Strength" },
    { value: "supertrend", label: "Supertrend Line", simple: "Supertrend Line" },
    { value: "volume", label: "Volume", simple: "Volume" },
    { value: "volume_sma_20", label: "Volume 20-SMA", simple: "Average Volume (20)" },
    { value: "vp_poc", label: "Volume Profile POC", simple: "Volume Profile POC" },
    { value: "vp_vah", label: "Volume Profile VAH", simple: "Value Area High (VAH)" },
    { value: "vp_val", label: "Volume Profile VAL", simple: "Value Area Low (VAL)" },
    { value: "pivot_p", label: "Pivot Point (P)", simple: "Daily Pivot (P)" },
    { value: "pivot_r1", label: "Pivot Resistance (R1)", simple: "Pivot Resistance (R1)" },
    { value: "pivot_s1", label: "Pivot Support (S1)", simple: "Pivot Support (S1)" },
    { value: "iv_rank", label: "IV Rank %", simple: "IV Rank %" },
    { value: "pcr", label: "Put-Call Ratio (PCR)", simple: "Put-Call Ratio (PCR)" },
    { value: "delta", label: "Option Delta (Δ)", simple: "Option Delta (Δ)" },
    { value: "funding_rate_pct", label: "Funding Rate %", simple: "Funding Rate %" },
    { value: "basis_pct", label: "Futures Basis %", simple: "Futures Basis %" },
    { value: "stop_loss", label: "Stop Loss", simple: "Stop Loss" },
    { value: "take_profit", label: "Take Profit", simple: "Take Profit" },
  ];

  const operatorOptions = [
    { value: ">", label: "Greater Than (>)", simple: "is ABOVE (>)" },
    { value: "<", label: "Less Than (<)", simple: "is BELOW (<)" },
    { value: "crosses_above", label: "Crosses Above (↗)", simple: "CROSSES ABOVE (↗)" },
    { value: "crosses_below", label: "Crosses Below (↘)", simple: "CROSSES BELOW (↘)" },
    { value: ">=", label: "Greater or Equal (>=)", simple: "is at least (>=)" },
    { value: "<=", label: "Less or Equal (<=)", simple: "is at most (<=)" },
    { value: "==", label: "Equals (==)", simple: "EQUALS (==)" },
    { value: "!=", label: "Not Equals (!=)", simple: "NOT EQUAL (!=)" },
  ];

  const leftDisplay = indicatorOptions.find((o) => o.value === rule.left)?.simple || rule.left;
  const opDisplay = operatorOptions.find((o) => o.value === rule.op)?.simple || rule.op;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        rule.enabled
          ? "bg-[#121927] border-[#1E293B] hover:border-cyan-500/40 shadow-md"
          : "bg-[#0A0E17]/60 border-slate-800/40 opacity-60"
      }`}
    >
      <div className="p-3.5 space-y-3">
        {/* Top Header: Logic Connector, Timeframe Tag, and Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
          {/* Connector Badge (IF / AND / OR) */}
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                index === 0
                  ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                  : rule.conjunction === "OR" || conjunction === "OR"
                  ? "bg-amber-950 text-amber-400 border border-amber-800"
                  : "bg-emerald-950 text-emerald-400 border border-emerald-800"
              }`}
            >
              {index === 0 ? "IF" : rule.conjunction || conjunction}
            </span>

            {/* Multi-Timeframe Selector Tag */}
            <div className="flex items-center gap-1 bg-[#0A0E17] px-2 py-0.5 rounded-lg border border-slate-800 text-[11px]">
              <Clock className="h-3 w-3 text-cyan-400" />
              <select
                value={rule.timeframe || "15m"}
                onChange={(e) => onUpdate({ timeframe: e.target.value as RuleTimeframe })}
                className="bg-transparent font-mono font-bold text-cyan-300 focus:outline-none cursor-pointer"
              >
                {timeframes.map((tf) => (
                  <option key={tf} value={tf} className="bg-[#0A0E17] text-white">
                    {tf.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Category / Description */}
            {rule.category && (
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline-block">
                [{rule.category}]
              </span>
            )}
          </div>

          {/* Action Icons (Enable/Disable, Duplicate, Delete) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onUpdate({ enabled: !rule.enabled })}
              title={rule.enabled ? "Disable Rule" : "Enable Rule"}
              className={`p-1.5 rounded-lg transition-colors ${
                rule.enabled ? "text-emerald-400 hover:bg-emerald-950/60" : "text-slate-500 hover:bg-slate-800"
              }`}
            >
              <Power className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={onDuplicate}
              title="Duplicate Rule"
              className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-[#162032] rounded-lg transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>

            {totalCount > 1 && (
              <button
                onClick={onDelete}
                title="Delete Rule"
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Rule Expression Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          {/* Left Operand */}
          <div className="sm:col-span-4">
            <label className="text-[10px] text-slate-400 font-medium block mb-1">Left Indicator / Price</label>
            <select
              value={rule.left}
              onChange={(e) => onUpdate({ left: e.target.value })}
              className="w-full bg-[#0A0E17] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
            >
              {indicatorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {mode === "simple" ? opt.simple : opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Operator */}
          <div className="sm:col-span-4">
            <label className="text-[10px] text-slate-400 font-medium block mb-1">Condition Operator</label>
            <select
              value={rule.op}
              onChange={(e) => onUpdate({ op: e.target.value })}
              className="w-full bg-[#0A0E17] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
            >
              {operatorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {mode === "simple" ? opt.simple : opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Right Operand */}
          <div className="sm:col-span-4">
            <label className="text-[10px] text-slate-400 font-medium block mb-1">Reference / Threshold</label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={rule.right}
                onChange={(e) => onUpdate({ right: e.target.value })}
                placeholder="e.g. 50, ema_21, 1.5 * atr"
                className="w-full bg-[#0A0E17] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-[#55C98A] focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Human Readable Summary Line */}
        <div className="text-[11px] text-slate-400 font-mono bg-[#0A0E17]/80 p-2 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-cyan-400 font-bold">[{rule.timeframe || "15m"}]</span>
            <span className="text-white font-medium">{leftDisplay}</span>
            <span className="text-cyan-300 font-bold">{opDisplay}</span>
            <span className="text-emerald-400 font-bold">{rule.right}</span>
          </div>
          <span className="text-[10px] text-slate-500 uppercase">
            {rule.enabled ? "Active" : "Bypassed"}
          </span>
        </div>
      </div>
    </div>
  );
}
