"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  Plus,
  Trash2,
  Code,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  StrategyIdeDefinition,
  StrategyIdeRule,
  RuleTimeframe,
  RuleOperator,
} from "@/types/strategy-ide";

interface StrategyRuleCanvasProps {
  strategy: StrategyIdeDefinition;
  onUpdateStrategy: (fields: Partial<StrategyIdeDefinition>) => void;
  onUpdateRule: (
    groupKey: "setup" | "confirmation" | "trigger",
    ruleId: string,
    updated: Partial<StrategyIdeRule>
  ) => void;
  onDeleteRule: (groupKey: "setup" | "confirmation" | "trigger", ruleId: string) => void;
  onAddRule: (groupKey: "setup" | "confirmation" | "trigger") => void;
  compiledExpression: string;
}

const TIMEFRAMES: RuleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];

const OPERATORS: { value: RuleOperator; label: string }[] = [
  { value: ">", label: "> (Greater Than)" },
  { value: "<", label: "< (Less Than)" },
  { value: ">=", label: ">= (Greater or Equal)" },
  { value: "<=", label: "<= (Less or Equal)" },
  { value: "==", label: "== (Equal)" },
  { value: "!=", label: "!= (Not Equal)" },
  { value: "crosses_above", label: "Crosses Above ↑" },
  { value: "crosses_below", label: "Crosses Below ↓" },
  { value: "in_range", label: "In Range" },
];

function RuleGroupSection({
  title,
  badgeText,
  badgeColor,
  groupKey,
  description,
  strategy,
  onUpdateStrategy,
  onUpdateRule,
  onDeleteRule,
  onAddRule,
}: {
  title: string;
  badgeText: string;
  badgeColor: string;
  groupKey: "setup" | "confirmation" | "trigger";
  description: string;
  strategy: StrategyIdeDefinition;
  onUpdateStrategy: (fields: Partial<StrategyIdeDefinition>) => void;
  onUpdateRule: (
    groupKey: "setup" | "confirmation" | "trigger",
    ruleId: string,
    updated: Partial<StrategyIdeRule>
  ) => void;
  onDeleteRule: (groupKey: "setup" | "confirmation" | "trigger", ruleId: string) => void;
  onAddRule: (groupKey: "setup" | "confirmation" | "trigger") => void;
}) {
  const group = strategy.entry[groupKey];
  const rules = group?.rules || [];

  return (
    <div className="p-3 sm:p-4 rounded-2xl bg-[#070D14] border border-[#172234] space-y-3 shadow-md">
      {/* Group Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#131E2E] pb-2.5">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${badgeColor}`}>
            {badgeText}
          </span>
          <h4 className="text-xs sm:text-sm font-bold text-slate-100">{title}</h4>
          <span className="text-[11px] text-slate-500 hidden sm:inline">• {description}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* AND / OR toggle */}
          <div className="flex items-center bg-[#0B131E] border border-[#1E293B] rounded-lg p-0.5 text-[10px] font-bold">
            <button
              onClick={() => {
                const updatedEntry = { ...strategy.entry };
                updatedEntry[groupKey].conjunction = "AND";
                onUpdateStrategy({ entry: updatedEntry });
              }}
              className={`px-2 py-0.5 rounded ${
                group?.conjunction === "AND" ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ALL (AND)
            </button>
            <button
              onClick={() => {
                const updatedEntry = { ...strategy.entry };
                updatedEntry[groupKey].conjunction = "OR";
                onUpdateStrategy({ entry: updatedEntry });
              }}
              className={`px-2 py-0.5 rounded ${
                group?.conjunction === "OR" ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ANY (OR)
            </button>
          </div>

          <button
            onClick={() => onAddRule(groupKey)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#111C2E] hover:bg-[#18263E] text-cyan-300 border border-cyan-800/60 text-xs font-semibold transition-all"
          >
            <Plus className="h-3 w-3" />
            <span>Add Condition</span>
          </button>
        </div>
      </div>

      {/* Rule Items */}
      <div className="space-y-2">
        {rules.map((r) => (
          <div
            key={r.id}
            className={`p-2.5 rounded-xl border transition-all ${
              r.enabled
                ? "bg-[#0B131E] border-[#1E293B] hover:border-slate-600"
                : "bg-[#0B131E]/40 border-slate-800 opacity-60"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              {/* Timeframe Select */}
              <div className="flex items-center gap-1 bg-[#070D14] border border-[#1E293B] rounded-lg px-2 py-1">
                <span className="text-[10px] text-slate-500 font-bold">TF:</span>
                <select
                  value={r.timeframe}
                  onChange={(e) =>
                    onUpdateRule(groupKey, r.id, { timeframe: e.target.value as RuleTimeframe })
                  }
                  className="bg-transparent font-mono text-cyan-400 font-bold focus:outline-none cursor-pointer text-xs"
                >
                  {TIMEFRAMES.map((tf) => (
                    <option key={tf} value={tf} className="bg-[#0B131E]">
                      {tf.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Left Operand */}
              <input
                type="text"
                value={r.left}
                onChange={(e) => onUpdateRule(groupKey, r.id, { left: e.target.value, leftLabel: e.target.value })}
                placeholder="Indicator / Price..."
                className="px-2.5 py-1 rounded-lg bg-[#070D14] border border-[#1E293B] text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400 min-w-[110px] flex-1 max-w-[160px]"
              />

              {/* Operator */}
              <select
                value={r.op}
                onChange={(e) => onUpdateRule(groupKey, r.id, { op: e.target.value })}
                className="px-2.5 py-1 rounded-lg bg-[#070D14] border border-[#1E293B] text-amber-300 font-bold focus:outline-none focus:border-cyan-400 text-xs cursor-pointer"
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value} className="bg-[#0B131E]">
                    {op.label}
                  </option>
                ))}
              </select>

              {/* Right Operand */}
              <input
                type="text"
                value={r.right}
                onChange={(e) => onUpdateRule(groupKey, r.id, { right: e.target.value, rightLabel: e.target.value })}
                placeholder="Threshold / Benchmark..."
                className="px-2.5 py-1 rounded-lg bg-[#070D14] border border-[#1E293B] text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400 min-w-[110px] flex-1 max-w-[160px]"
              />

              {/* Actions: Enable / Delete */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onUpdateRule(groupKey, r.id, { enabled: !r.enabled })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    r.enabled
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {r.enabled ? "ACTIVE" : "MUTED"}
                </button>
                <button
                  onClick={() => onDeleteRule(groupKey, r.id)}
                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="p-3 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
            No conditions in {title}. Click &quot;+ Add Condition&quot; or select from Library.
          </div>
        )}
      </div>
    </div>
  );
}

export function StrategyRuleCanvas({
  strategy,
  onUpdateStrategy,
  onUpdateRule,
  onDeleteRule,
  onAddRule,
  compiledExpression,
}: StrategyRuleCanvasProps) {
  const [nlPrompt, setNlPrompt] = useState("");
  const [isNlOpen, setIsNlOpen] = useState(false);
  const [copiedExpr, setCopiedExpr] = useState(false);

  const handleCopyExpression = () => {
    navigator.clipboard.writeText(compiledExpression);
    setCopiedExpr(true);
    setTimeout(() => setCopiedExpr(false), 2000);
  };

  const handleNlGenerate = () => {
    if (!nlPrompt.trim()) return;
    const text = nlPrompt.toLowerCase();
    const isShort = text.includes("short") || text.includes("sell") || text.includes("bearish");
    const direction = isShort ? "SHORT" : "LONG";

    const setupRules: StrategyIdeRule[] = [];
    const confirmRules: StrategyIdeRule[] = [];
    const triggerRules: StrategyIdeRule[] = [];

    // Macro Setup Check
    if (text.includes("ema 200") || text.includes("ema200")) {
      setupRules.push({
        id: `nl-setup-${Date.now()}-1`,
        timeframe: text.includes("1h") ? "1h" : "15m",
        left: "close",
        leftLabel: "Close Price",
        op: isShort ? "<" : ">",
        right: "ema_200",
        rightLabel: "EMA 200",
        category: "TREND",
        enabled: true,
        description: "Macro Baseline Trend Filter",
      });
    }

    if (text.includes("vwap")) {
      setupRules.push({
        id: `nl-setup-${Date.now()}-2`,
        timeframe: "15m",
        left: "close",
        leftLabel: "Close Price",
        op: isShort ? "<" : ">",
        right: "vwap",
        rightLabel: "Session VWAP",
        category: "PRICE",
        enabled: true,
        description: "Session VWAP Regime Filter",
      });
    }

    // Confirmation Check
    if (text.includes("rsi")) {
      confirmRules.push({
        id: `nl-conf-${Date.now()}-1`,
        timeframe: "15m",
        left: "rsi_14",
        leftLabel: "RSI (14)",
        op: isShort ? "<" : ">",
        right: isShort ? "45" : "50",
        rightLabel: isShort ? "45.0" : "50.0",
        category: "MOMENTUM",
        enabled: true,
        description: "Momentum Threshold Filter",
      });
    }

    // Trigger Check
    if (text.includes("ema 9") || text.includes("ema 21") || text.includes("cross")) {
      triggerRules.push({
        id: `nl-trig-${Date.now()}-1`,
        timeframe: "15m",
        left: "ema_9",
        leftLabel: "EMA 9",
        op: isShort ? "crosses_below" : "crosses_above",
        right: "ema_21",
        rightLabel: "EMA 21",
        category: "TREND",
        enabled: true,
        description: "Fast EMA Momentum Trigger",
      });
    } else if (text.includes("bollinger") || text.includes("lower band")) {
      triggerRules.push({
        id: `nl-trig-${Date.now()}-2`,
        timeframe: "15m",
        left: "close",
        leftLabel: "Close",
        op: "<=",
        right: "bb_lower",
        rightLabel: "Bollinger Lower Band",
        category: "VOLATILITY",
        enabled: true,
        description: "Band Contact Breakout Trigger",
      });
    } else {
      triggerRules.push({
        id: `nl-trig-${Date.now()}-3`,
        timeframe: "15m",
        left: "ema_9",
        leftLabel: "EMA 9",
        op: isShort ? "crosses_below" : "crosses_above",
        right: "ema_21",
        rightLabel: "EMA 21",
        category: "TREND",
        enabled: true,
        description: "Trend Momentum Timing Trigger",
      });
    }

    onUpdateStrategy({
      name: nlPrompt.slice(0, 45) + (nlPrompt.length > 45 ? "..." : ""),
      description: nlPrompt,
      direction: direction as any,
      entry: {
        setup: { conjunction: "AND", rules: setupRules.length ? setupRules : strategy.entry.setup.rules },
        confirmation: { conjunction: "AND", rules: confirmRules.length ? confirmRules : strategy.entry.confirmation.rules },
        trigger: { conjunction: "AND", rules: triggerRules },
      },
    });

    setIsNlOpen(false);
    setNlPrompt("");
  };

  return (
    <div className="flex-1 bg-[#0B131E] border border-[#1E293B] rounded-2xl p-3 sm:p-4 space-y-4 shadow-2xl flex flex-col">
      {/* Natural Language Strategy Assistant Accordion */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0E1B2D] to-[#122238] border border-cyan-900/60 p-3 sm:p-3.5 shadow-md">
        <div
          onClick={() => setIsNlOpen(!isNlOpen)}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              Natural Language Strategy Generator
              <span className="text-[10px] px-2 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                AI Rule Compiler
              </span>
            </h3>
          </div>
          <button className="text-slate-400 hover:text-slate-200">
            {isNlOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {isNlOpen && (
          <div className="mt-3 space-y-2.5 pt-2 border-t border-[#1C2C42]">
            <div className="flex gap-2">
              <input
                type="text"
                value={nlPrompt}
                onChange={(e) => setNlPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNlGenerate()}
                placeholder="e.g., Buy BTC when 1H Close is above EMA 200, 15M EMA 9 crosses above EMA 21, and 15M RSI is above 50..."
                className="flex-1 px-3 py-2 rounded-xl bg-[#070D14] border border-[#1E293B] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleNlGenerate}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-900/30 transition-all flex items-center gap-1.5"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Compile to AST</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-400">
              <span className="font-semibold text-slate-500">Quick Samples:</span>
              <button
                onClick={() =>
                  setNlPrompt(
                    "Buy BTC when 1H Close is above EMA 200, 15M EMA 9 crosses above EMA 21, and 15M RSI is above 50"
                  )
                }
                className="hover:text-cyan-300 underline"
              >
                Trend Confluence (EMA200 + EMA9/21 + RSI)
              </button>
              <span className="text-slate-600">•</span>
              <button
                onClick={() =>
                  setNlPrompt(
                    "Buy ETH when 15M Close touches Bollinger Lower Band, RSI < 35 oversold, and price below VWAP"
                  )
                }
                className="hover:text-cyan-300 underline"
              >
                Mean Reversion (BB Lower + RSI &lt; 35 + VWAP)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Compiled Expression Banner */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070D14] border border-[#172234] text-xs font-mono">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <Code className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-400 font-bold shrink-0">AST DSL:</span>
          <span className="text-slate-200 whitespace-nowrap">{compiledExpression}</span>
        </div>
        <button
          onClick={handleCopyExpression}
          className="ml-2 px-2 py-0.5 rounded bg-[#111C2E] hover:bg-[#18263E] text-slate-300 text-[10px] font-semibold border border-slate-700 flex items-center gap-1 shrink-0"
        >
          <Copy className="h-3 w-3" />
          <span>{copiedExpr ? "Copied!" : "Copy"}</span>
        </button>
      </div>

      {/* Structured Rule Canvas: Setup, Confirmation, Trigger */}
      <div className="space-y-3.5 flex-1">
        {/* 1. Macro Setup */}
        <RuleGroupSection
          title="Macro Regime / Setup Filter"
          badgeText="Tier 1: Setup"
          badgeColor="bg-blue-950 text-blue-400 border border-blue-800"
          groupKey="setup"
          description="Macro trend direction (e.g. 1H Close > EMA 200, VWAP)"
          strategy={strategy}
          onUpdateStrategy={onUpdateStrategy}
          onUpdateRule={onUpdateRule}
          onDeleteRule={onDeleteRule}
          onAddRule={onAddRule}
        />

        {/* 2. Confirmation */}
        <RuleGroupSection
          title="Momentum & Volume Confirmation"
          badgeText="Tier 2: Confirm"
          badgeColor="bg-amber-950 text-amber-400 border border-amber-800"
          groupKey="confirmation"
          description="Momentum filter (e.g. 15M RSI > 50, MACD > Signal)"
          strategy={strategy}
          onUpdateStrategy={onUpdateStrategy}
          onUpdateRule={onUpdateRule}
          onDeleteRule={onDeleteRule}
          onAddRule={onAddRule}
        />

        {/* 3. Execution Trigger */}
        <RuleGroupSection
          title="Timing Execution Trigger"
          badgeText="Tier 3: Trigger"
          badgeColor="bg-emerald-950 text-emerald-400 border border-emerald-800"
          groupKey="trigger"
          description="Immediate entry catalyst (e.g. EMA 9 crosses above EMA 21)"
          strategy={strategy}
          onUpdateStrategy={onUpdateStrategy}
          onUpdateRule={onUpdateRule}
          onDeleteRule={onDeleteRule}
          onAddRule={onAddRule}
        />
      </div>

      {/* 4. Exit Rules & Target Brackets */}
      <div className="p-3 sm:p-4 rounded-2xl bg-[#070D14] border border-[#172234] space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-[#131E2E] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-rose-950 text-rose-400 border border-rose-800">
              Exit Brackets
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-slate-100">
              Stop Loss & Take Profit Target Controls
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Stop Loss Type */}
          <div className="p-2.5 rounded-xl bg-[#0B131E] border border-[#1E293B] space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase">Stop Loss Model</label>
            <select
              value={strategy.exit.stop_loss_type}
              onChange={(e) =>
                onUpdateStrategy({
                  exit: { ...strategy.exit, stop_loss_type: e.target.value as any },
                })
              }
              className="w-full bg-[#070D14] border border-[#1E293B] rounded-lg px-2 py-1 text-slate-200 font-bold focus:outline-none"
            >
              <option value="ATR">ATR Multiplier</option>
              <option value="PERCENT">Fixed Percentage (%)</option>
              <option value="FIXED_PRICE">Fixed Price ($)</option>
            </select>
          </div>

          {/* Stop Loss Value */}
          <div className="p-2.5 rounded-xl bg-[#0B131E] border border-[#1E293B] space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase">Stop Loss Distance</label>
            <div className="flex items-center gap-1 bg-[#070D14] border border-[#1E293B] rounded-lg px-2 py-1">
              <input
                type="number"
                step="0.1"
                value={strategy.exit.stop_loss_value}
                onChange={(e) =>
                  onUpdateStrategy({
                    exit: { ...strategy.exit, stop_loss_value: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full bg-transparent text-rose-400 font-mono font-bold focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono">
                {strategy.exit.stop_loss_type === "ATR" ? "x ATR" : "%"}
              </span>
            </div>
          </div>

          {/* Take Profit Target */}
          <div className="p-2.5 rounded-xl bg-[#0B131E] border border-[#1E293B] space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase">Take Profit Target</label>
            <div className="flex items-center gap-1 bg-[#070D14] border border-[#1E293B] rounded-lg px-2 py-1">
              <input
                type="number"
                step="0.1"
                value={strategy.exit.take_profit_value}
                onChange={(e) =>
                  onUpdateStrategy({
                    exit: { ...strategy.exit, take_profit_value: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full bg-transparent text-emerald-400 font-mono font-bold focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono">R:R Ratio</span>
            </div>
          </div>

          {/* Multi-Target Scale Out */}
          <div className="p-2.5 rounded-xl bg-[#0B131E] border border-[#1E293B] space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase">Multi-Target Scaling</label>
            <div className="text-[11px] font-mono text-cyan-300 pt-0.5">
              TP1 (1.0R): 50% | TP2 (2.0R): 50%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
