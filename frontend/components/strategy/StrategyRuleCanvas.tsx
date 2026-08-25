"use client";

import React, { useState } from "react";
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  MoveUp,
  MoveDown,
  Sliders,
  Check,
  X,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  Zap,
  ShieldCheck,
  Search
} from "lucide-react";
import {
  StrategyIdeDefinition,
  StrategyIdeRule,
  RuleTimeframe,
  StrategyDirection,
} from "@/types/strategy-ide";
import { RuleTargetStage } from "./StrategyBuildLibrary";

interface StrategyRuleCanvasProps {
  strategy: StrategyIdeDefinition;
  onUpdateStrategy: (fields: Partial<StrategyIdeDefinition>) => void;
  onSelectRuleToEdit?: (rule: StrategyIdeRule, stage: RuleTargetStage) => void;
}

const SUPPORTED_OPERATORS = [
  { value: ">", label: "Greater Than (>)" },
  { value: "<", label: "Less Than (<)" },
  { value: ">=", label: "Greater or Equal (>=)" },
  { value: "<=", label: "Less or Equal (<=)" },
  { value: "==", label: "Equals (==)" },
  { value: "crosses_above", label: "Crosses Above" },
  { value: "crosses_below", label: "Crosses Below" },
  { value: "rising", label: "Rising" },
  { value: "falling", label: "Falling" },
];

const POPULAR_INDICATORS = [
  { id: "close", label: "Close Price", defaultOp: ">", defaultRight: "ema_200", defaultRightLabel: "EMA 200" },
  { id: "ema_9", label: "EMA 9", defaultOp: "crosses_above", defaultRight: "ema_21", defaultRightLabel: "EMA 21" },
  { id: "ema_21", label: "EMA 21", defaultOp: ">", defaultRight: "ema_50", defaultRightLabel: "EMA 50" },
  { id: "ema_50", label: "EMA 50", defaultOp: ">", defaultRight: "ema_200", defaultRightLabel: "EMA 200" },
  { id: "ema_200", label: "EMA 200", defaultOp: "<", defaultRight: "close", defaultRightLabel: "Close Price" },
  { id: "rsi_14", label: "RSI (14)", defaultOp: ">", defaultRight: "55", defaultRightLabel: "55.0" },
  { id: "macd_line", label: "MACD Line", defaultOp: "crosses_above", defaultRight: "macd_signal", defaultRightLabel: "MACD Signal" },
  { id: "vwap", label: "VWAP (Session)", defaultOp: "<", defaultRight: "close", defaultRightLabel: "Close Price" },
  { id: "volume", label: "Volume", defaultOp: ">", defaultRight: "volume_ma_20", defaultRightLabel: "20-bar Avg Volume" },
  { id: "atr_14", label: "ATR (14)", defaultOp: ">", defaultRight: "10.0", defaultRightLabel: "10.0" },
  { id: "supertrend", label: "Supertrend (10, 3)", defaultOp: "<", defaultRight: "close", defaultRightLabel: "Close Price" },
  { id: "adx_14", label: "ADX (14)", defaultOp: ">", defaultRight: "25", defaultRightLabel: "25.0" },
];

const ALL_TIMEFRAMES: RuleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];

export function StrategyRuleCanvas({
  strategy,
  onUpdateStrategy,
}: StrategyRuleCanvasProps) {
  // Collapsible Stages State
  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(true);
  const [isTriggerOpen, setIsTriggerOpen] = useState(true);

  // Edit Rule Slide-over Drawer State
  const [editingRule, setEditingRule] = useState<{
    rule: StrategyIdeRule;
    stage: RuleTargetStage;
  } | null>(null);

  // Add Rule Modal State
  const [addRuleModalStage, setAddRuleModalStage] = useState<RuleTargetStage | null>(null);
  const [addRuleSearch, setAddRuleSearch] = useState("");
  const [selectedIndForAdd, setSelectedIndForAdd] = useState(POPULAR_INDICATORS[0]);
  const [addRuleOp, setAddRuleOp] = useState(">");
  const [addRuleRight, setAddRuleRight] = useState("50");
  const [addRuleTimeframe, setAddRuleTimeframe] = useState<RuleTimeframe>(strategy.base_timeframe || "15m");

  const setupRules = strategy.entry?.setup?.rules || [];
  const confirmRules = strategy.entry?.confirmation?.rules || [];
  const triggerRules = strategy.entry?.trigger?.rules || [];
  const totalRules = setupRules.length + confirmRules.length + triggerRules.length;

  // Handlers for modifying rules
  const handleUpdateRuleInStage = (stage: RuleTargetStage, updatedRule: StrategyIdeRule) => {
    const stageKey = stage === "setup" ? "setup" : stage === "confirmation" ? "confirmation" : "trigger";
    const currentRules = strategy.entry[stageKey]?.rules || [];
    const newRules = currentRules.map((r) => (r.id === updatedRule.id ? updatedRule : r));

    onUpdateStrategy({
      entry: {
        ...strategy.entry,
        [stageKey]: {
          ...strategy.entry[stageKey],
          rules: newRules,
        },
      },
    });
  };

  const handleDeleteRule = (stage: RuleTargetStage, ruleId: string) => {
    const stageKey = stage === "setup" ? "setup" : stage === "confirmation" ? "confirmation" : "trigger";
    const currentRules = strategy.entry[stageKey]?.rules || [];
    const newRules = currentRules.filter((r) => r.id !== ruleId);

    onUpdateStrategy({
      entry: {
        ...strategy.entry,
        [stageKey]: {
          ...strategy.entry[stageKey],
          rules: newRules,
        },
      },
    });
    if (editingRule?.rule.id === ruleId) {
      setEditingRule(null);
    }
  };

  const handleMoveRule = (
    fromStage: RuleTargetStage,
    toStage: RuleTargetStage,
    rule: StrategyIdeRule
  ) => {
    if (fromStage === toStage) return;
    const fromKey = fromStage === "setup" ? "setup" : fromStage === "confirmation" ? "confirmation" : "trigger";
    const toKey = toStage === "setup" ? "setup" : toStage === "confirmation" ? "confirmation" : "trigger";

    const filteredFrom = (strategy.entry[fromKey]?.rules || []).filter((r) => r.id !== rule.id);
    const addedTo = [...(strategy.entry[toKey]?.rules || []), rule];

    onUpdateStrategy({
      entry: {
        ...strategy.entry,
        [fromKey]: { ...strategy.entry[fromKey], rules: filteredFrom },
        [toKey]: { ...strategy.entry[toKey], rules: addedTo },
      },
    });
  };

  const handleApplyAddRule = () => {
    if (!addRuleModalStage) return;
    const stageKey = addRuleModalStage === "setup" ? "setup" : addRuleModalStage === "confirmation" ? "confirmation" : "trigger";
    const newRule: StrategyIdeRule = {
      id: `rule-${addRuleModalStage}-${Date.now()}`,
      timeframe: addRuleTimeframe,
      left: selectedIndForAdd.id,
      leftLabel: selectedIndForAdd.label,
      op: addRuleOp,
      right: addRuleRight,
      rightLabel: addRuleRight,
      category: "TREND",
      enabled: true,
      description: `${selectedIndForAdd.label} ${addRuleOp} ${addRuleRight}`,
    };

    const currentRules = strategy.entry[stageKey]?.rules || [];
    onUpdateStrategy({
      entry: {
        ...strategy.entry,
        [stageKey]: {
          ...strategy.entry[stageKey],
          rules: [...currentRules, newRule],
        },
      },
    });
    setAddRuleModalStage(null);
  };

  return (
    <div className="flex-1 space-y-4 font-sans select-none text-xs">
      
      {/* 1. Simple Strategy Summary Bar */}
      <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-3.5 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-white text-xs">{strategy.symbol}</span>
          <span className="text-[#607D6E]">•</span>
          <span className="font-mono text-cyan-400 font-bold">{strategy.base_timeframe}</span>
          <span className="text-[#607D6E]">•</span>
          <span className={`font-bold uppercase ${strategy.direction === "LONG" ? "text-[#55C98A]" : "text-red-400"}`}>
            {strategy.direction}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-[#8BA596]">SETUP:</span>
            <span className="text-white font-bold">{setupRules.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8BA596]">CONFIRM:</span>
            <span className="text-white font-bold">{confirmRules.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8BA596]">TRIGGER:</span>
            <span className="text-white font-bold">{triggerRules.length}</span>
          </div>
          <div className="border-l border-[#142B21] pl-3 flex items-center gap-1.5">
            <span className="text-[#55C98A] font-bold">{totalRules} TOTAL RULES</span>
          </div>
        </div>
      </div>

      {/* STAGE 1: SETUP */}
      <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsSetupOpen(!isSetupOpen)}>
            <div className="h-6 w-6 rounded-lg bg-[#123C2A] text-[#55C98A] flex items-center justify-center font-mono font-bold text-xs">
              1
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">1. SETUP</h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0C1713] text-[#8BA596] font-mono">
                  {setupRules.length} rules
                </span>
              </div>
              <p className="text-[11px] text-[#8BA596]">What market condition must exist before looking for a trade?</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#0C1713] border border-[#1A3127] rounded-lg p-0.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateStrategy({
                    entry: {
                      ...strategy.entry,
                      setup: { ...strategy.entry.setup, conjunction: "AND" },
                    },
                  })
                }
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  strategy.entry?.setup?.conjunction === "AND"
                    ? "bg-[#123C2A] text-[#55C98A]"
                    : "text-[#8BA596]"
                }`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateStrategy({
                    entry: {
                      ...strategy.entry,
                      setup: { ...strategy.entry.setup, conjunction: "OR" },
                    },
                  })
                }
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  strategy.entry?.setup?.conjunction === "OR"
                    ? "bg-[#123C2A] text-[#55C98A]"
                    : "text-[#8BA596]"
                }`}
              >
                ANY
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setAddRuleModalStage("setup");
                setSelectedIndForAdd(POPULAR_INDICATORS[0]);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#123C2A] hover:bg-[#194E37] text-[#55C98A] hover:text-white font-bold transition-all flex items-center gap-1 shadow-sm"
            >
              <Plus className="h-3 w-3" />
              <span>Add Rule</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSetupOpen(!isSetupOpen)}
              className="text-[#8BA596] hover:text-white p-1"
            >
              {isSetupOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isSetupOpen && (
          <div className="space-y-2 pt-1 animate-fadeIn">
            {setupRules.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#060D0A] border border-dashed border-[#1A3127] text-center text-[#607D6E]">
                <p className="font-medium">No setup rules configured</p>
                <p className="text-[10px] mt-0.5">e.g., 1H Close &gt; EMA 200 or Price &gt; VWAP</p>
              </div>
            ) : (
              setupRules.map((rule) => (
                <div
                  key={rule.id}
                  onClick={() => setEditingRule({ rule, stage: "setup" })}
                  className="bg-[#0C1713] hover:bg-[#10221A] border border-[#1A3127] hover:border-[#275841] rounded-xl p-3 flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-[#060D0A] text-cyan-400 font-mono font-bold text-xs border border-[#14271F]">
                      {rule.timeframe}
                    </span>
                    <span className="font-mono text-white font-bold text-xs">
                      {rule.leftLabel || rule.left} {rule.op} {rule.rightLabel || rule.right}
                    </span>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#142B21] text-[#55C98A] font-bold border border-[#275841]">
                      Required ✓
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMoveRule("setup", "confirmation", rule)}
                      title="Move to Confirmation stage"
                      className="p-1 text-[#607D6E] hover:text-white"
                    >
                      <MoveDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRule({ rule, stage: "setup" })}
                      className="p-1 text-[#8BA596] hover:text-[#55C98A]"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule("setup", rule.id)}
                      className="p-1 text-[#607D6E] hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* STAGE 2: CONFIRMATION */}
      <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsConfirmOpen(!isConfirmOpen)}>
            <div className="h-6 w-6 rounded-lg bg-[#123C2A] text-[#55C98A] flex items-center justify-center font-mono font-bold text-xs">
              2
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">2. CONFIRM</h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0C1713] text-[#8BA596] font-mono">
                  {confirmRules.length} rules
                </span>
              </div>
              <p className="text-[11px] text-[#8BA596]">What confirms the setup is strong enough?</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#0C1713] border border-[#1A3127] rounded-lg p-0.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateStrategy({
                    entry: {
                      ...strategy.entry,
                      confirmation: { ...strategy.entry.confirmation, conjunction: "AND" },
                    },
                  })
                }
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  strategy.entry?.confirmation?.conjunction === "AND"
                    ? "bg-[#123C2A] text-[#55C98A]"
                    : "text-[#8BA596]"
                }`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateStrategy({
                    entry: {
                      ...strategy.entry,
                      confirmation: { ...strategy.entry.confirmation, conjunction: "OR" },
                    },
                  })
                }
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  strategy.entry?.confirmation?.conjunction === "OR"
                    ? "bg-[#123C2A] text-[#55C98A]"
                    : "text-[#8BA596]"
                }`}
              >
                ANY
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setAddRuleModalStage("confirmation");
                setSelectedIndForAdd(POPULAR_INDICATORS[5]); // RSI
              }}
              className="px-2.5 py-1 rounded-lg bg-[#123C2A] hover:bg-[#194E37] text-[#55C98A] hover:text-white font-bold transition-all flex items-center gap-1 shadow-sm"
            >
              <Plus className="h-3 w-3" />
              <span>Add Rule</span>
            </button>

            <button
              type="button"
              onClick={() => setIsConfirmOpen(!isConfirmOpen)}
              className="text-[#8BA596] hover:text-white p-1"
            >
              {isConfirmOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isConfirmOpen && (
          <div className="space-y-2 pt-1 animate-fadeIn">
            {confirmRules.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#060D0A] border border-dashed border-[#1A3127] text-center text-[#607D6E]">
                <p className="font-medium">No confirmation rules configured</p>
                <p className="text-[10px] mt-0.5">e.g., RSI(14) &gt; 55 or Volume &gt; 20-bar MA</p>
              </div>
            ) : (
              confirmRules.map((rule) => (
                <div
                  key={rule.id}
                  onClick={() => setEditingRule({ rule, stage: "confirmation" })}
                  className="bg-[#0C1713] hover:bg-[#10221A] border border-[#1A3127] hover:border-[#275841] rounded-xl p-3 flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-[#060D0A] text-cyan-400 font-mono font-bold text-xs border border-[#14271F]">
                      {rule.timeframe}
                    </span>
                    <span className="font-mono text-white font-bold text-xs">
                      {rule.leftLabel || rule.left} {rule.op} {rule.rightLabel || rule.right}
                    </span>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#142B21] text-[#55C98A] font-bold border border-[#275841]">
                      Required ✓
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMoveRule("confirmation", "setup", rule)}
                      title="Move up to Setup stage"
                      className="p-1 text-[#607D6E] hover:text-white"
                    >
                      <MoveUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveRule("confirmation", "trigger", rule)}
                      title="Move down to Trigger stage"
                      className="p-1 text-[#607D6E] hover:text-white"
                    >
                      <MoveDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRule({ rule, stage: "confirmation" })}
                      className="p-1 text-[#8BA596] hover:text-[#55C98A]"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule("confirmation", rule.id)}
                      className="p-1 text-[#607D6E] hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* STAGE 3: TRIGGER */}
      <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsTriggerOpen(!isTriggerOpen)}>
            <div className="h-6 w-6 rounded-lg bg-[#123C2A] text-[#55C98A] flex items-center justify-center font-mono font-bold text-xs">
              3
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">3. TRIGGER</h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0C1713] text-[#8BA596] font-mono">
                  {triggerRules.length} rules
                </span>
              </div>
              <p className="text-[11px] text-[#8BA596]">What exact event triggers the entry?</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAddRuleModalStage("trigger");
                setSelectedIndForAdd(POPULAR_INDICATORS[1]); // EMA 9
              }}
              className="px-2.5 py-1 rounded-lg bg-[#123C2A] hover:bg-[#194E37] text-[#55C98A] hover:text-white font-bold transition-all flex items-center gap-1 shadow-sm"
            >
              <Plus className="h-3 w-3" />
              <span>Add Rule</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTriggerOpen(!isTriggerOpen)}
              className="text-[#8BA596] hover:text-white p-1"
            >
              {isTriggerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isTriggerOpen && (
          <div className="space-y-2 pt-1 animate-fadeIn">
            {triggerRules.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#060D0A] border border-dashed border-[#1A3127] text-center text-[#607D6E]">
                <p className="font-medium">No trigger rules configured</p>
                <p className="text-[10px] mt-0.5">e.g., EMA 9 crosses above EMA 21</p>
              </div>
            ) : (
              triggerRules.map((rule) => (
                <div
                  key={rule.id}
                  onClick={() => setEditingRule({ rule, stage: "trigger" })}
                  className="bg-[#0C1713] hover:bg-[#10221A] border border-[#1A3127] hover:border-[#275841] rounded-xl p-3 flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-[#060D0A] text-cyan-400 font-mono font-bold text-xs border border-[#14271F]">
                      {rule.timeframe}
                    </span>
                    <span className="font-mono text-white font-bold text-xs">
                      {rule.leftLabel || rule.left} {rule.op} {rule.rightLabel || rule.right}
                    </span>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#142B21] text-[#55C98A] font-bold border border-[#275841]">
                      Trigger ✓
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMoveRule("trigger", "confirmation", rule)}
                      title="Move up to Confirmation stage"
                      className="p-1 text-[#607D6E] hover:text-white"
                    >
                      <MoveUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRule({ rule, stage: "trigger" })}
                      className="p-1 text-[#8BA596] hover:text-[#55C98A]"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule("trigger", rule.id)}
                      className="p-1 text-[#607D6E] hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* SLIDE-OVER RULE EDITOR DRAWER */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end animate-fadeIn">
          <div className="bg-[#09110E] border-l border-[#1F392D] w-full max-w-md h-full p-6 flex flex-col justify-between shadow-2xl overflow-y-auto custom-scrollbar">
            
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-[#142B21] pb-3">
                <div>
                  <span className="text-[10px] text-[#55C98A] font-bold uppercase tracking-wider">Configure Condition</span>
                  <h3 className="text-sm font-black text-white mt-0.5">Edit Strategy Rule</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="p-1.5 rounded-lg text-[#8BA596] hover:text-white bg-[#0C1713]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Indicator / Left Operand */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Left Operand (Indicator / Metric)</label>
                <input
                  type="text"
                  value={editingRule.rule.leftLabel || editingRule.rule.left}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      rule: { ...editingRule.rule, left: e.target.value, leftLabel: e.target.value },
                    })
                  }
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#55C98A]"
                />
              </div>

              {/* Operator */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Comparison Operator</label>
                <select
                  value={editingRule.rule.op}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      rule: { ...editingRule.rule, op: e.target.value },
                    })
                  }
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none"
                >
                  {SUPPORTED_OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Right Operand */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Right Operand (Indicator / Threshold)</label>
                <input
                  type="text"
                  value={editingRule.rule.rightLabel || editingRule.rule.right}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      rule: { ...editingRule.rule, right: e.target.value, rightLabel: e.target.value },
                    })
                  }
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-cyan-400 font-mono font-bold focus:outline-none focus:border-[#55C98A]"
                />
              </div>

              {/* Timeframe */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Evaluation Timeframe</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {ALL_TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() =>
                        setEditingRule({
                          ...editingRule,
                          rule: { ...editingRule.rule, timeframe: tf },
                        })
                      }
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold ${
                        editingRule.rule.timeframe === tf
                          ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]"
                          : "bg-[#060D0A] text-[#8BA596] border border-[#1A3127]"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Move to Stage */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Assigned Stage</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["setup", "confirmation", "trigger"] as RuleTargetStage[]).map((stg) => (
                    <button
                      key={stg}
                      type="button"
                      onClick={() => {
                        if (editingRule.stage !== stg) {
                          handleMoveRule(editingRule.stage, stg, editingRule.rule);
                          setEditingRule({ ...editingRule, stage: stg });
                        }
                      }}
                      className={`py-1.5 rounded-lg text-xs font-bold capitalize ${
                        editingRule.stage === stg
                          ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]"
                          : "bg-[#060D0A] text-[#8BA596] border border-[#1A3127]"
                      }`}
                    >
                      {stg}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Drawer Actions */}
            <div className="border-t border-[#142B21] pt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleDeleteRule(editingRule.stage, editingRule.rule.id)}
                className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-400 font-bold transition-all flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleUpdateRuleInStage(editingRule.stage, editingRule.rule);
                  setEditingRule(null);
                }}
                className="px-6 py-2 rounded-xl bg-[#123C2A] hover:bg-[#194E37] text-[#55C98A] hover:text-white font-bold transition-all flex items-center gap-1.5 shadow-md"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Apply Changes</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FAST ADD RULE MODAL */}
      {addRuleModalStage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-[#142B21] pb-3">
              <div>
                <span className="text-[10px] text-[#55C98A] font-bold uppercase tracking-wider">
                  Add Rule to {addRuleModalStage.toUpperCase()}
                </span>
                <h3 className="text-sm font-black text-white mt-0.5">Quick Condition Builder</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddRuleModalStage(null)}
                className="p-1.5 rounded-lg text-[#8BA596] hover:text-white bg-[#0C1713]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Indicator Quick Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-[#8BA596] font-semibold">Select Indicator</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                {POPULAR_INDICATORS.map((ind) => (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => {
                      setSelectedIndForAdd(ind);
                      setAddRuleOp(ind.defaultOp);
                      setAddRuleRight(ind.defaultRight);
                    }}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      selectedIndForAdd.id === ind.id
                        ? "bg-[#123C2A] text-white border-[#39B978]"
                        : "bg-[#060D0A] text-[#8BA596] border-[#1A3127] hover:text-white"
                    }`}
                  >
                    <span className="font-bold text-xs">{ind.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Condition Expression */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-[#8BA596]">Indicator</label>
                <div className="p-2 bg-[#060D0A] border border-[#1A3127] rounded-xl font-mono text-white font-bold truncate">
                  {selectedIndForAdd.label}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#8BA596]">Operator</label>
                <select
                  value={addRuleOp}
                  onChange={(e) => setAddRuleOp(e.target.value)}
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl p-2 text-xs text-white font-bold focus:outline-none"
                >
                  {SUPPORTED_OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#8BA596]">Threshold / Right</label>
                <input
                  type="text"
                  value={addRuleRight}
                  onChange={(e) => setAddRuleRight(e.target.value)}
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl p-2 text-xs text-cyan-400 font-mono font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Timeframe */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-[#8BA596] font-semibold">Timeframe</label>
              <div className="grid grid-cols-8 gap-1">
                {ALL_TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setAddRuleTimeframe(tf)}
                    className={`py-1 rounded text-xs font-mono font-bold ${
                      addRuleTimeframe === tf
                        ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]"
                        : "bg-[#060D0A] text-[#8BA596] border border-[#1A3127]"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#142B21] pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddRuleModalStage(null)}
                className="px-4 py-2 rounded-xl bg-[#0C1713] text-[#8BA596] hover:text-white font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyAddRule}
                className="px-6 py-2 rounded-xl bg-[#123C2A] hover:bg-[#194E37] text-[#55C98A] hover:text-white font-bold transition-all flex items-center gap-1.5 shadow-md"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Rule</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
