"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Sliders, Clock, Tag } from "lucide-react";
import { StrategyIdeRule, RuleTimeframe } from "@/types/strategy-ide";

interface StrategyRuleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: StrategyIdeRule | null;
  onSave: (updated: StrategyIdeRule) => void;
}

const OPERATORS = [
  { value: ">", label: "Greater Than (>)" },
  { value: "<", label: "Less Than (<)" },
  { value: ">=", label: "Greater or Equal (>=)" },
  { value: "<=", label: "Less or Equal (<=)" },
  { value: "==", label: "Equals (==)" },
  { value: "!=", label: "Not Equal (!=)" },
  { value: "crosses_above", label: "Crosses Above (↗)" },
  { value: "crosses_below", label: "Crosses Below (↘)" },
];

const TIMEFRAMES: RuleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];

export function StrategyRuleEditModal({
  isOpen,
  onClose,
  rule,
  onSave,
}: StrategyRuleEditModalProps) {
  const [left, setLeft] = useState("");
  const [leftLabel, setLeftLabel] = useState("");
  const [op, setOp] = useState<any>(">");
  const [right, setRight] = useState("");
  const [timeframe, setTimeframe] = useState<RuleTimeframe>("15m");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (rule) {
      setLeft(rule.left || "");
      setLeftLabel(rule.leftLabel || rule.left || "");
      setOp(rule.op || ">");
      setRight(rule.right || "");
      setTimeframe(rule.timeframe || "15m");
      setDescription(rule.description || "");
    }
  }, [rule]);

  if (!isOpen || !rule) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...rule,
      left,
      leftLabel: leftLabel || left,
      op,
      right,
      rightLabel: right,
      timeframe,
      description,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150 font-sans text-slate-200 text-xs">
      <div className="w-full max-w-md bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#12304A] bg-[#0C1727] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Edit Condition Parameters</h3>
              <p className="text-[10px] text-slate-400 font-mono">Fine-tune indicator rule thresholds</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleFormSubmit} className="p-4 space-y-3.5 font-mono">
          {/* Timeframe */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>Timeframe</span>
            </label>
            <div className="flex items-center gap-1">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`flex-1 py-1 rounded text-[10px] font-bold border transition ${
                    timeframe === tf
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold"
                      : "bg-[#06101B] text-slate-400 border-[#12304A] hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Left Operand */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">Left Indicator / Price Field</label>
            <input
              type="text"
              value={left}
              onChange={(e) => setLeft(e.target.value)}
              placeholder="e.g. close, rsi_14, ema_9"
              className="w-full bg-[#06101B] border border-[#12304A] focus:border-cyan-500 rounded-xl p-2 text-white text-xs outline-none"
              required
            />
          </div>

          {/* Operator */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">Comparison Operator</label>
            <select
              value={op}
              onChange={(e) => setOp(e.target.value as any)}
              className="w-full bg-[#06101B] border border-[#12304A] focus:border-cyan-500 rounded-xl p-2 text-white text-xs outline-none"
            >
              {OPERATORS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Right Operand */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">Right Indicator / Fixed Threshold Value</label>
            <input
              type="text"
              value={right}
              onChange={(e) => setRight(e.target.value)}
              placeholder="e.g. 55, ema_21, ema_200, 0"
              className="w-full bg-[#06101B] border border-[#12304A] focus:border-cyan-500 rounded-xl p-2 text-white text-xs outline-none"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-500" />
              <span>Label / Description (Optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Fast Trend Alignment Trigger"
              className="w-full bg-[#06101B] border border-[#12304A] focus:border-cyan-500 rounded-xl p-2 text-slate-300 text-xs outline-none"
            />
          </div>

          {/* Preview String */}
          <div className="p-2.5 bg-[#06101B] rounded-xl border border-[#12304A] text-[11px] text-slate-300 flex items-center justify-between">
            <span className="text-slate-500 text-[10px]">Rule Preview:</span>
            <span className="font-bold text-cyan-300 truncate ml-2">
              [{timeframe.toUpperCase()}] {left} {op} {right}
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#12304A]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-[#12304A] text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
