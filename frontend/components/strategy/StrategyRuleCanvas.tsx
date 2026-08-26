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
  ArrowRightLeft,
  Check,
  X,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  Zap,
  Sliders,
} from "lucide-react";
import {
  StrategyIdeDefinition,
  StrategyIdeRule,
  RuleTimeframe,
} from "@/types/strategy-ide";
import { RuleTargetStage } from "./StrategyBuildLibrary";

interface StrategyRuleCanvasProps {
  strategy: StrategyIdeDefinition;
  onUpdateStrategy: (fields: Partial<StrategyIdeDefinition>) => void;
  onOpenAddModalForStage?: (stage: RuleTargetStage) => void;
}

const SUPPORTED_CONDITIONS = [
  { value: ">", label: "Greater Than (>)" },
  { value: "<", label: "Less Than (<)" },
  { value: ">=", label: "Greater or Equal (>=)" },
  { value: "<=", label: "Less or Equal (<=)" },
  { value: "==", label: "Equals (==)" },
  { value: "crosses_above", label: "Crosses Above" },
  { value: "crosses_below", label: "Crosses Below" },
];

const TIMEFRAMES: RuleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];

export function StrategyRuleCanvas({
  strategy,
  onUpdateStrategy,
  onOpenAddModalForStage,
}: StrategyRuleCanvasProps) {
  // Editing Rule Drawer State
  const [editingRule, setEditingRule] = useState<{
    rule: StrategyIdeRule;
    stage: RuleTargetStage;
  } | null>(null);

  // Quick Add Rule Modal directly inside canvas
  const [quickAddStage, setQuickAddStage] = useState<RuleTargetStage | null>(null);
  const [quickIndicator, setQuickIndicator] = useState("RSI (14)");
  const [quickLeftKey, setQuickLeftKey] = useState("rsi_14");
  const [quickOp, setQuickOp] = useState(">");
  const [quickRight, setQuickRight] = useState("55");
  const [quickTf, setQuickTf] = useState<RuleTimeframe>(strategy.base_timeframe || "15m");

  const setupRules = strategy.entry?.setup?.rules || [];
  const confirmRules = strategy.entry?.confirmation?.rules || [];
  const triggerRules = strategy.entry?.trigger?.rules || [];

  // Update rule within stage
  const handleSaveEditedRule = (updatedRule: StrategyIdeRule, stage: RuleTargetStage) => {
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
    setEditingRule(null);
  };

  // Delete rule from stage
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

  // Move rule between stages (Setup ↔ Confirm ↔ Trigger)
  const handleMoveStage = (fromStage: RuleTargetStage, toStage: RuleTargetStage, rule: StrategyIdeRule) => {
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

  // Reorder within stage
  const handleReorder = (stage: RuleTargetStage, index: number, direction: "UP" | "DOWN") => {
    const stageKey = stage === "setup" ? "setup" : stage === "confirmation" ? "confirmation" : "trigger";
    const current = [...(strategy.entry[stageKey]?.rules || [])];
    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;

    const temp = current[index];
    current[index] = current[targetIndex];
    current[targetIndex] = temp;

    onUpdateStrategy({
      entry: {
        ...strategy.entry,
        [stageKey]: {
          ...strategy.entry[stageKey],
          rules: current,
        },
      },
    });
  };

  // Toggle Conjunction ALL/ANY
  const handleToggleConjunction = (stage: RuleTargetStage) => {
    const stageKey = stage === "setup" ? "setup" : stage === "confirmation" ? "confirmation" : "trigger";
    const currentConj = strategy.entry[stageKey]?.conjunction || "AND";
    const nextConj = currentConj === "AND" ? "OR" : "AND";

    onUpdateStrategy({
      entry: {
        ...strategy.entry,
        [stageKey]: {
          ...strategy.entry[stageKey],
          conjunction: nextConj,
        },
      },
    });
  };

  // Submit Quick Add Rule
  const handleQuickAddSubmit = () => {
    if (!quickAddStage) return;
    const stageKey = quickAddStage === "setup" ? "setup" : quickAddStage === "confirmation" ? "confirmation" : "trigger";

    const newRule: StrategyIdeRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timeframe: quickTf,
      left: quickLeftKey,
      leftLabel: quickIndicator,
      op: quickOp,
      right: quickRight,
      rightLabel: quickRight,
      category: "TREND",
      enabled: true,
      description: `${quickTf} ${quickIndicator} ${quickOp} ${quickRight}`,
    };

    onUpdateStrategy({
      entry: {
        ...strategy.entry,
        [stageKey]: {
          ...strategy.entry[stageKey],
          rules: [...(strategy.entry[stageKey]?.rules || []), newRule],
        },
      },
    });
    setQuickAddStage(null);
  };

  // Render a Single Clean Rule Row
  const renderRuleRow = (rule: StrategyIdeRule, stage: RuleTargetStage, index: number, totalInStage: number) => {
    return (
      <div
        key={rule.id}
        className="group bg-[#060D0A] hover:bg-[#0C1713] border border-[#14271F] hover:border-[#1F392D] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 transition-all"
      >
        {/* Left: Timeframe Pill + Formula */}
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded-md bg-[#123C2A] text-[#55C98A] font-mono text-[11px] font-bold border border-[#39B978]/30">
            {rule.timeframe || "15m"}
          </span>

          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="font-bold text-white">{rule.leftLabel || rule.left}</span>
            <span className="text-[#55C98A] font-bold">{rule.op}</span>
            <span className="text-white font-bold">{rule.rightLabel || rule.right}</span>
          </div>

          <span className="text-[10px] text-[#607D6E] font-mono hidden sm:inline">
            Required ✓
          </span>
        </div>

        {/* Right: Stage Mover, Reorder & Actions */}
        <div className="flex items-center gap-1">
          {/* Move to another stage selector */}
          <div className="flex items-center bg-[#09110E] p-0.5 rounded-lg border border-[#1A3127] text-[10px] font-mono">
            {stage !== "setup" && (
              <button
                type="button"
                onClick={() => handleMoveStage(stage, "setup", rule)}
                className="px-1.5 py-0.5 text-[#8BA596] hover:text-white hover:bg-[#123C2A] rounded transition-colors"
                title="Move to Setup stage"
              >
                → Setup
              </button>
            )}
            {stage !== "confirmation" && (
              <button
                type="button"
                onClick={() => handleMoveStage(stage, "confirmation", rule)}
                className="px-1.5 py-0.5 text-[#8BA596] hover:text-white hover:bg-[#123C2A] rounded transition-colors"
                title="Move to Confirm stage"
              >
                → Confirm
              </button>
            )}
            {stage !== "trigger" && (
              <button
                type="button"
                onClick={() => handleMoveStage(stage, "trigger", rule)}
                className="px-1.5 py-0.5 text-[#8BA596] hover:text-white hover:bg-[#123C2A] rounded transition-colors"
                title="Move to Trigger stage"
              >
                → Trigger
              </button>
            )}
          </div>

          {/* Reorder Buttons */}
          {totalInStage > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => handleReorder(stage, index, "UP")}
                disabled={index === 0}
                className={`p-1 rounded ${index === 0 ? "text-[#243E30]" : "text-[#8BA596] hover:text-white hover:bg-[#123C2A]"}`}
                title="Move Up"
              >
                <MoveUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => handleReorder(stage, index, "DOWN")}
                disabled={index === totalInStage - 1}
                className={`p-1 rounded ${index === totalInStage - 1 ? "text-[#243E30]" : "text-[#8BA596] hover:text-white hover:bg-[#123C2A]"}`}
                title="Move Down"
              >
                <MoveDown className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* [Edit] Button */}
          <button
            type="button"
            onClick={() => setEditingRule({ rule, stage })}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0C1713] hover:bg-[#14271F] text-[#8BA596] hover:text-white border border-[#1A3127] font-mono text-[11px] font-bold transition-colors"
          >
            <Edit2 className="h-3 w-3" />
            <span>Edit</span>
          </button>

          {/* [Delete] Button */}
          <button
            type="button"
            onClick={() => handleDeleteRule(stage, rule.id)}
            className="p-1 rounded-lg text-[#607D6E] hover:text-red-400 hover:bg-red-950/30 transition-colors"
            title="Delete rule"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 font-sans select-none text-xs">
      
      {/* 1. SETUP BLOCK */}
      <section className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        {/* Header & Helper */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#142B21] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-md bg-[#123C2A] text-[#55C98A] font-black text-xs font-mono">
                1
              </span>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">SETUP</h3>
              {setupRules.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleToggleConjunction("setup")}
                  className="text-[10px] px-2 py-0.5 rounded bg-[#0C1713] border border-[#1A3127] text-[#55C98A] font-mono font-bold hover:bg-[#14271F] transition-colors"
                  title="Toggle ALL / ANY condition evaluation"
                >
                  {strategy.entry?.setup?.conjunction === "OR" ? "ANY (OR)" : "ALL (AND)"}
                </button>
              )}
            </div>
            <p className="text-xs text-[#8BA596] mt-0.5">
              What market condition must exist before looking for a trade?
            </p>
          </div>

          <button
            type="button"
            onClick={() => setQuickAddStage("setup")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#123C2A] hover:bg-[#1B4D36] text-[#55C98A] hover:text-white font-mono font-bold text-xs transition-all border border-[#39B978]/30 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Rule</span>
          </button>
        </div>

        {/* Rules List or Empty State */}
        <div className="space-y-2">
          {setupRules.length === 0 ? (
            <div className="p-5 text-center bg-[#060D0A] border border-dashed border-[#14271F] rounded-xl space-y-2">
              <p className="text-xs font-bold text-white">No Setup Rules</p>
              <p className="text-[11px] text-[#8BA596]">
                Add the market condition required before a trade can be considered (e.g. 1H Close &gt; EMA 200).
              </p>
              <button
                type="button"
                onClick={() => setQuickAddStage("setup")}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#123C2A] text-[#55C98A] font-mono font-bold text-xs hover:bg-[#1B4D36] transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>+ Add First Rule</span>
              </button>
            </div>
          ) : (
            setupRules.map((rule, idx) => renderRuleRow(rule, "setup", idx, setupRules.length))
          )}
        </div>
      </section>

      {/* 2. CONFIRM BLOCK */}
      <section className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        {/* Header & Helper */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#142B21] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-md bg-[#123C2A] text-[#55C98A] font-black text-xs font-mono">
                2
              </span>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">CONFIRM</h3>
              {confirmRules.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleToggleConjunction("confirmation")}
                  className="text-[10px] px-2 py-0.5 rounded bg-[#0C1713] border border-[#1A3127] text-[#55C98A] font-mono font-bold hover:bg-[#14271F] transition-colors"
                  title="Toggle ALL / ANY condition evaluation"
                >
                  {strategy.entry?.confirmation?.conjunction === "OR" ? "ANY (OR)" : "ALL (AND)"}
                </button>
              )}
            </div>
            <p className="text-xs text-[#8BA596] mt-0.5">
              What confirms the setup is strong enough? (e.g. 15m RSI &gt; 55)
            </p>
          </div>

          <button
            type="button"
            onClick={() => setQuickAddStage("confirmation")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#123C2A] hover:bg-[#1B4D36] text-[#55C98A] hover:text-white font-mono font-bold text-xs transition-all border border-[#39B978]/30 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Rule</span>
          </button>
        </div>

        {/* Rules List or Empty State */}
        <div className="space-y-2">
          {confirmRules.length === 0 ? (
            <div className="p-5 text-center bg-[#060D0A] border border-dashed border-[#14271F] rounded-xl space-y-2">
              <p className="text-xs font-bold text-white">No Confirmation Rules (Optional)</p>
              <p className="text-[11px] text-[#8BA596]">
                Add momentum or volume filters to prevent false breakouts.
              </p>
              <button
                type="button"
                onClick={() => setQuickAddStage("confirmation")}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#123C2A] text-[#55C98A] font-mono font-bold text-xs hover:bg-[#1B4D36] transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>+ Add Confirmation</span>
              </button>
            </div>
          ) : (
            confirmRules.map((rule, idx) => renderRuleRow(rule, "confirmation", idx, confirmRules.length))
          )}
        </div>
      </section>

      {/* 3. TRIGGER BLOCK */}
      <section className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        {/* Header & Helper */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#142B21] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-md bg-[#123C2A] text-[#55C98A] font-black text-xs font-mono">
                3
              </span>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">TRIGGER</h3>
            </div>
            <p className="text-xs text-[#8BA596] mt-0.5">
              What exact event triggers entry? (e.g. 15m EMA 9 crosses above EMA 21)
            </p>
          </div>

          <button
            type="button"
            onClick={() => setQuickAddStage("trigger")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#123C2A] hover:bg-[#1B4D36] text-[#55C98A] hover:text-white font-mono font-bold text-xs transition-all border border-[#39B978]/30 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Rule</span>
          </button>
        </div>

        {/* Rules List or Empty State */}
        <div className="space-y-2">
          {triggerRules.length === 0 ? (
            <div className="p-5 text-center bg-[#060D0A] border border-dashed border-[#14271F] rounded-xl space-y-2">
              <p className="text-xs font-bold text-white">No Trigger Rules</p>
              <p className="text-[11px] text-[#8BA596]">
                Add the timing event that triggers immediate order entry.
              </p>
              <button
                type="button"
                onClick={() => setQuickAddStage("trigger")}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#123C2A] text-[#55C98A] font-mono font-bold text-xs hover:bg-[#1B4D36] transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>+ Add Trigger Rule</span>
              </button>
            </div>
          ) : (
            triggerRules.map((rule, idx) => renderRuleRow(rule, "trigger", idx, triggerRules.length))
          )}
        </div>
      </section>

      {/* 4. SLIDE-OUT EDIT RULE DRAWER / MODAL */}
      {editingRule && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-fadeIn">
          <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 shadow-2xl w-full max-w-md space-y-4">
            
            <div className="flex items-center justify-between border-b border-[#142B21] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#123C2A] text-[#55C98A]">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase">EDIT RULE</h3>
                  <span className="text-[10px] text-[#8BA596] font-mono capitalize">
                    {editingRule.stage === "confirmation" ? "Confirm" : editingRule.stage} Stage
                  </span>
                </div>
              </div>
              <button onClick={() => setEditingRule(null)} className="text-[#8BA596] hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Left Indicator */}
              <div className="space-y-1">
                <span className="text-[11px] text-[#8BA596] uppercase font-bold">Indicator / Source</span>
                <input
                  type="text"
                  value={editingRule.rule.leftLabel || editingRule.rule.left}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      rule: { ...editingRule.rule, leftLabel: e.target.value, left: e.target.value },
                    })
                  }
                  className="w-full bg-[#060D0A] border border-[#14271F] rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-[#55C98A]"
                />
              </div>

              {/* Condition */}
              <div className="space-y-1">
                <span className="text-[11px] text-[#8BA596] uppercase font-bold">Condition</span>
                <select
                  value={editingRule.rule.op}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      rule: { ...editingRule.rule, op: e.target.value },
                    })
                  }
                  className="w-full bg-[#060D0A] border border-[#14271F] rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-[#55C98A] cursor-pointer"
                >
                  {SUPPORTED_CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value} className="bg-[#09110E] text-white">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target / Value */}
              <div className="space-y-1">
                <span className="text-[11px] text-[#8BA596] uppercase font-bold">Compare Value / Target</span>
                <input
                  type="text"
                  value={editingRule.rule.rightLabel || editingRule.rule.right}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      rule: { ...editingRule.rule, rightLabel: e.target.value, right: e.target.value },
                    })
                  }
                  className="w-full bg-[#060D0A] border border-[#14271F] rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-[#55C98A]"
                />
              </div>

              {/* Timeframe */}
              <div className="space-y-1">
                <span className="text-[11px] text-[#8BA596] uppercase font-bold">Timeframe</span>
                <div className="grid grid-cols-4 gap-1">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() =>
                        setEditingRule({
                          ...editingRule,
                          rule: { ...editingRule.rule, timeframe: tf },
                        })
                      }
                      className={`py-1 rounded text-[11px] font-bold transition-all ${
                        editingRule.rule.timeframe === tf
                          ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60"
                          : "bg-[#060D0A] text-[#8BA596] border border-[#14271F] hover:text-white"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#142B21]">
              <button
                type="button"
                onClick={() => handleDeleteRule(editingRule.stage, editingRule.rule.id)}
                className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-950/70 text-red-400 font-mono font-bold text-xs transition-colors border border-red-500/30"
              >
                Delete Rule
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-3 py-1.5 rounded-xl bg-[#0C1713] hover:bg-[#14271F] text-[#8BA596] hover:text-white font-mono font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEditedRule(editingRule.rule, editingRule.stage)}
                  className="px-4 py-1.5 rounded-xl bg-[#123C2A] hover:bg-[#1B4D36] text-[#55C98A] hover:text-white font-mono font-bold text-xs transition-all shadow-sm"
                >
                  Apply Changes
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5. INLINE QUICK ADD RULE MODAL */}
      {quickAddStage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-fadeIn">
          <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 shadow-2xl w-full max-w-md space-y-4">
            
            <div className="flex items-center justify-between border-b border-[#142B21] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#123C2A] text-[#55C98A]">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase">
                    ADD {quickAddStage === "confirmation" ? "CONFIRM" : quickAddStage.toUpperCase()} RULE
                  </h3>
                  <span className="text-[10px] text-[#8BA596] font-mono">Create custom condition</span>
                </div>
              </div>
              <button onClick={() => setQuickAddStage(null)} className="text-[#8BA596] hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <span className="text-[11px] text-[#8BA596] uppercase font-bold">Indicator</span>
                <select
                  value={quickLeftKey}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuickLeftKey(val);
                    if (val === "close") setQuickIndicator("Close Price");
                    else if (val === "ema_9") setQuickIndicator("EMA 9");
                    else if (val === "ema_21") setQuickIndicator("EMA 21");
                    else if (val === "ema_50") setQuickIndicator("EMA 50");
                    else if (val === "ema_200") setQuickIndicator("EMA 200");
                    else if (val === "rsi_14") setQuickIndicator("RSI (14)");
                    else if (val === "macd_line") setQuickIndicator("MACD Line");
                    else if (val === "vwap") setQuickIndicator("VWAP");
                    else if (val === "volume") setQuickIndicator("Volume");
                    else if (val === "supertrend") setQuickIndicator("Supertrend");
                  }}
                  className="w-full bg-[#060D0A] border border-[#14271F] rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-[#55C98A] cursor-pointer"
                >
                  <option value="rsi_14" className="bg-[#09110E] text-white">RSI (14)</option>
                  <option value="close" className="bg-[#09110E] text-white">Close Price</option>
                  <option value="ema_9" className="bg-[#09110E] text-white">EMA 9</option>
                  <option value="ema_21" className="bg-[#09110E] text-white">EMA 21</option>
                  <option value="ema_50" className="bg-[#09110E] text-white">EMA 50</option>
                  <option value="ema_200" className="bg-[#09110E] text-white">EMA 200</option>
                  <option value="macd_line" className="bg-[#09110E] text-white">MACD Line</option>
                  <option value="vwap" className="bg-[#09110E] text-white">VWAP (Session)</option>
                  <option value="volume" className="bg-[#09110E] text-white">Volume</option>
                  <option value="supertrend" className="bg-[#09110E] text-white">Supertrend</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#8BA596] uppercase font-bold">Condition</span>
                <select
                  value={quickOp}
                  onChange={(e) => setQuickOp(e.target.value)}
                  className="w-full bg-[#060D0A] border border-[#14271F] rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-[#55C98A] cursor-pointer"
                >
                  {SUPPORTED_CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value} className="bg-[#09110E] text-white">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#8BA596] uppercase font-bold">Compare Value / Target</span>
                <input
                  type="text"
                  value={quickRight}
                  onChange={(e) => setQuickRight(e.target.value)}
                  className="w-full bg-[#060D0A] border border-[#14271F] rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-[#55C98A]"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#8BA596] uppercase font-bold">Timeframe</span>
                <div className="grid grid-cols-4 gap-1">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setQuickTf(tf)}
                      className={`py-1 rounded text-[11px] font-bold transition-all ${
                        quickTf === tf
                          ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60"
                          : "bg-[#060D0A] text-[#8BA596] border border-[#14271F] hover:text-white"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#142B21]">
              <button
                type="button"
                onClick={() => setQuickAddStage(null)}
                className="px-4 py-2 rounded-xl bg-[#0C1713] hover:bg-[#14271F] text-[#8BA596] hover:text-white font-mono font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickAddSubmit}
                className="px-5 py-2 rounded-xl bg-[#123C2A] hover:bg-[#1B4D36] text-[#55C98A] hover:text-white font-mono font-bold text-xs transition-all shadow-sm"
              >
                Add Rule
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
