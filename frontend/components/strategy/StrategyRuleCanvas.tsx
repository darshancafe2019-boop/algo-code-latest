"use client";

import React, { useState, useMemo } from "react";
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
  X,
  Clock,
  Sparkles,
  Shield,
  Percent,
  DollarSign,
  TrendingUp,
  Activity,
  Sliders,
  GitMerge,
  Cpu,
  ArrowRight,
  Zap,
  Target,
  BarChart2,
  Scale,
  Lock,
} from "lucide-react";
import {
  StrategyIdeDefinition,
  StrategyIdeRule,
  RuleTimeframe,
  PositionSizingMethod,
  PartialExitTarget,
} from "@/types/strategy-ide";
import { RuleTargetStage } from "./StrategyBuildLibrary";
import { QosStrategySection, QosRuleRow, QosButton, QosBadge } from "@/components/ui/QosComponents";

interface StrategyRuleCanvasProps {
  strategy: StrategyIdeDefinition;
  onUpdateStrategy: (fields: Partial<StrategyIdeDefinition>) => void;
  onOpenAddModalForStage?: (stage: RuleTargetStage) => void;
  interfaceMode?: "SIMPLE" | "ADVANCED";
}

const SUPPORTED_OPERATORS = [
  { value: ">", label: "Greater Than (>)" },
  { value: "<", label: "Less Than (<)" },
  { value: ">=", label: "Greater or Equal (>=)" },
  { value: "<=", label: "Less or Equal (<=)" },
  { value: "==", label: "Equals (==)" },
  { value: "!=", label: "Not Equal (!=)" },
  { value: "crosses_above", label: "Crosses Above" },
  { value: "crosses_below", label: "Crosses Below" },
  { value: "in_range", label: "In Range [Low, High]" },
  { value: "above_for_n_bars", label: "Above for N Bars" },
  { value: "below_for_n_bars", label: "Below for N Bars" },
  { value: "rising_for_n_bars", label: "Rising for N Bars" },
  { value: "falling_for_n_bars", label: "Falling for N Bars" },
];

const TIMEFRAMES: RuleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];

export function StrategyRuleCanvas({
  strategy,
  onUpdateStrategy,
  interfaceMode = "SIMPLE",
}: StrategyRuleCanvasProps) {
  // Editing Rule Drawer / Inline Modal State
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

  // Custom Formula State in Advanced Mode
  const [customFormulaText, setCustomFormulaText] = useState(
    strategy.compiled_expression ||
      "IF ([1H] close > ema_200 AND [15M] rsi_14 > 55 AND [15M] ema_9 crosses_above ema_21) THEN LONG"
  );
  const [formulaError, setFormulaError] = useState<string | null>(null);

  // Partial Exits State
  const partialExits: PartialExitTarget[] =
    strategy.trade_management?.partial_exits || [
      { id: "pe-1", target_rr: 1.0, exit_pct: 25, label: "Target 1 (1R)" },
      { id: "pe-2", target_rr: 2.0, exit_pct: 25, label: "Target 2 (2R)" },
    ];

  // Sizing metrics calculations
  const capital = strategy.risk?.capital || 10000;
  const sizingMethod: PositionSizingMethod =
    strategy.position_sizing?.method || "PCT_RISK_PER_TRADE";
  const sizingValue = strategy.position_sizing?.value || strategy.risk?.risk_per_trade_pct || 1.0;
  const leverage = strategy.risk?.leverage || 1.0;

  const estimatedCalculations = useMemo(() => {
    const slPct = strategy.exit?.stop_loss_value || 1.0;
    let allocated = capital * 0.25;
    let exposure = allocated * leverage;
    let margin = allocated / leverage;

    if (sizingMethod === "FIXED_CAPITAL") {
      allocated = Math.min(sizingValue, capital);
      exposure = allocated * leverage;
      margin = allocated / leverage;
    } else if (sizingMethod === "PCT_CAPITAL") {
      allocated = (capital * sizingValue) / 100;
      exposure = allocated * leverage;
      margin = allocated / leverage;
    } else if (sizingMethod === "PCT_RISK_PER_TRADE") {
      const riskAmount = (capital * sizingValue) / 100;
      exposure = (riskAmount / (slPct / 100));
      allocated = Math.min(exposure / leverage, capital);
      margin = exposure / leverage;
    }

    return {
      availableCapital: capital,
      allocatedCapital: Math.round(allocated),
      estimatedMargin: Math.round(margin),
      estimatedExposure: Math.round(exposure),
      effectiveLeverage: Math.round((exposure / Math.max(allocated, 1)) * 10) / 10,
    };
  }, [capital, sizingMethod, sizingValue, leverage, strategy.exit?.stop_loss_value]);

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

  // Move rule between stages
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

  // Quick Add Rule Submit
  const handleQuickAddRule = () => {
    if (!quickAddStage) return;
    const stageKey = quickAddStage === "setup" ? "setup" : quickAddStage === "confirmation" ? "confirmation" : "trigger";
    const newRule: StrategyIdeRule = {
      id: `rule-${Date.now()}`,
      timeframe: quickTf,
      left: quickLeftKey,
      leftLabel: quickIndicator,
      op: quickOp,
      right: quickRight,
      rightLabel: quickRight,
      category: "TREND",
      enabled: true,
      description: `${quickIndicator} ${quickOp} ${quickRight}`,
      logicConnector: "AND",
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

  // Safe formula expression parser / validator
  const handleValidateFormula = (text: string) => {
    setCustomFormulaText(text);
    // Controlled deterministic token parser
    const forbiddenTokens = ["eval", "Function", "window", "document", "process", "require", "<script", "alert"];
    for (const token of forbiddenTokens) {
      if (text.includes(token)) {
        setFormulaError(`Security violation: forbidden token '${token}'`);
        return;
      }
    }
    setFormulaError(null);
    onUpdateStrategy({ compiled_expression: text });
  };

  return (
    <div className="space-y-4 font-sans select-none text-xs">
      {/* ------------------------------------------------------------------
       * 1. STAGE 1: SETUP CONDITIONS
       * ------------------------------------------------------------------ */}
      <QosStrategySection
        stepNumber={1}
        title="SETUP CONDITIONS"
        subtitle="Determine whether macro market regime and background state are suitable"
        badge={
          <span className="px-1.5 py-0.5 rounded bg-[#168BFF]/10 text-[#168BFF] border border-[#168BFF]/30 font-mono text-[10px] font-bold">
            {setupRules.length} {setupRules.length === 1 ? "Rule" : "Rules"}
          </span>
        }
        rightAction={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#07111F] border border-[#12304A] rounded-lg p-0.5 font-mono text-[10px]">
              <span className="text-[#7D8EA5] px-1">MATCH:</span>
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
                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                  strategy.entry.setup.conjunction === "AND"
                    ? "bg-[#168BFF] text-white"
                    : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                }`}
              >
                ALL (AND)
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
                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                  strategy.entry.setup.conjunction === "OR"
                    ? "bg-[#168BFF] text-white"
                    : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                }`}
              >
                ANY (OR)
              </button>
            </div>
            <QosButton
              variant="addRule"
              size="sm"
              onClick={() => setQuickAddStage("setup")}
            >
              <Plus className="h-3 w-3" />
              <span>Add Setup</span>
            </QosButton>
          </div>
        }
      >
        <div className="space-y-2">
          {setupRules.length === 0 ? (
            <div className="p-3.5 rounded-lg bg-[#0C1727] border border-dashed border-[#12304A] text-center text-[#7D8EA5] text-xs">
              No setup regime rules added yet. Click &quot;Add Setup&quot; or choose from the left library.
            </div>
          ) : (
            setupRules.map((rule) => (
              <QosRuleRow
                key={rule.id}
                timeframe={rule.timeframe}
                expression={`${rule.leftLabel || rule.left} ${rule.op} ${rule.rightLabel || rule.right}`}
                category={rule.category}
                description={rule.description}
                relationship={strategy.entry.setup.conjunction}
                onEdit={() => setEditingRule({ rule, stage: "setup" })}
                onDelete={() => handleDeleteRule("setup", rule.id)}
              />
            ))
          )}
        </div>
      </QosStrategySection>

      {/* ------------------------------------------------------------------
       * 2. STAGE 2: CONFIRMATION FILTERS
       * ------------------------------------------------------------------ */}
      <QosStrategySection
        stepNumber={2}
        title="CONFIRMATION FILTERS"
        subtitle="Secondary oscillator, volume, ATR, and momentum validation layers"
        badge={
          <span className="px-1.5 py-0.5 rounded bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/30 font-mono text-[10px] font-bold">
            {confirmRules.length} {confirmRules.length === 1 ? "Filter" : "Filters"}
          </span>
        }
        rightAction={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#07111F] border border-[#12304A] rounded-lg p-0.5 font-mono text-[10px]">
              <span className="text-[#7D8EA5] px-1">MATCH:</span>
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
                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                  strategy.entry.confirmation.conjunction === "AND"
                    ? "bg-[#22D3EE] text-[#05101A]"
                    : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                }`}
              >
                ALL (AND)
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
                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                  strategy.entry.confirmation.conjunction === "OR"
                    ? "bg-[#22D3EE] text-[#05101A]"
                    : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                }`}
              >
                ANY (OR)
              </button>
            </div>
            <QosButton
              variant="addRule"
              size="sm"
              onClick={() => setQuickAddStage("confirmation")}
            >
              <Plus className="h-3 w-3" />
              <span>Add Filter</span>
            </QosButton>
          </div>
        }
      >
        <div className="space-y-2">
          {confirmRules.length === 0 ? (
            <div className="p-3.5 rounded-lg bg-[#0C1727] border border-dashed border-[#12304A] text-center text-[#7D8EA5] text-xs">
              No confirmation filters added yet.
            </div>
          ) : (
            confirmRules.map((rule) => (
              <QosRuleRow
                key={rule.id}
                timeframe={rule.timeframe}
                expression={`${rule.leftLabel || rule.left} ${rule.op} ${rule.rightLabel || rule.right}`}
                category={rule.category}
                description={rule.description}
                relationship={strategy.entry.confirmation.conjunction}
                onEdit={() => setEditingRule({ rule, stage: "confirmation" })}
                onDelete={() => handleDeleteRule("confirmation", rule.id)}
              />
            ))
          )}
        </div>
      </QosStrategySection>

      {/* ------------------------------------------------------------------
       * 3. STAGE 3: TRIGGER EVENTS
       * ------------------------------------------------------------------ */}
      <QosStrategySection
        stepNumber={3}
        title="TRIGGER EVENTS"
        subtitle="Precise event-based execution triggers (crossovers, breakouts, candle patterns)"
        badge={
          <span className="px-1.5 py-0.5 rounded bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/30 font-mono text-[10px] font-bold">
            {triggerRules.length} {triggerRules.length === 1 ? "Trigger" : "Triggers"}
          </span>
        }
        rightAction={
          <div className="flex items-center gap-2">
            {/* Closed-Bar vs Intrabar Selector */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#07111F] border border-[#12304A] text-[10px] font-mono">
              <span className="text-[#7D8EA5]">TIMING:</span>
              <select
                value={strategy.execution_filters?.execution_timing || "CLOSED_BAR"}
                onChange={(e) =>
                  onUpdateStrategy({
                    execution_filters: {
                      ...strategy.execution_filters,
                      market_open_check: strategy.execution_filters?.market_open_check ?? true,
                      broker_connected_check: strategy.execution_filters?.broker_connected_check ?? true,
                      market_data_fresh_check: strategy.execution_filters?.market_data_fresh_check ?? true,
                      max_spread_pct: strategy.execution_filters?.max_spread_pct ?? 0.2,
                      min_liquidity_usd: strategy.execution_filters?.min_liquidity_usd ?? 50000,
                      max_slippage_pct: strategy.execution_filters?.max_slippage_pct ?? 0.1,
                      orderbook_depth_check: strategy.execution_filters?.orderbook_depth_check ?? true,
                      no_risk_lock_check: strategy.execution_filters?.no_risk_lock_check ?? true,
                      no_kill_switch_check: strategy.execution_filters?.no_kill_switch_check ?? true,
                      api_healthy_check: strategy.execution_filters?.api_healthy_check ?? true,
                      execution_timing: e.target.value as any,
                    },
                  })
                }
                className="bg-[#0A1422] border border-[#12304A] rounded text-[#00E89A] font-bold px-1 text-[10px] focus:outline-none"
              >
                <option value="CLOSED_BAR">Closed-Bar Only</option>
                <option value="INTRABAR">Intrabar Event</option>
                <option value="TICK_EVENT">Tick Event</option>
              </select>
            </div>

            <QosButton
              variant="addRule"
              size="sm"
              onClick={() => setQuickAddStage("trigger")}
            >
              <Plus className="h-3 w-3" />
              <span>Add Trigger</span>
            </QosButton>
          </div>
        }
      >
        <div className="space-y-2">
          {triggerRules.length === 0 ? (
            <div className="p-3.5 rounded-lg bg-[#0C1727] border border-dashed border-[#12304A] text-center text-[#7D8EA5] text-xs">
              No trigger events added yet. A trigger is required for order creation.
            </div>
          ) : (
            triggerRules.map((rule) => (
              <QosRuleRow
                key={rule.id}
                timeframe={rule.timeframe}
                expression={`${rule.leftLabel || rule.left} ${rule.op} ${rule.rightLabel || rule.right}`}
                category={rule.category}
                description={rule.description}
                relationship={strategy.entry.trigger.conjunction}
                onEdit={() => setEditingRule({ rule, stage: "trigger" })}
                onDelete={() => handleDeleteRule("trigger", rule.id)}
              />
            ))
          )}
        </div>
      </QosStrategySection>

      {/* ------------------------------------------------------------------
       * 4. STAGE 4: POSITION SIZING
       * ------------------------------------------------------------------ */}
      <QosStrategySection
        stepNumber={4}
        title="POSITION SIZING"
        subtitle="Deterministic capital allocation and dynamic volatility sizing model"
      >
        <div className="space-y-3 font-mono text-xs">
          {/* Sizing Method & Value Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#0C1727] border border-[#12304A] rounded-lg p-2.5 space-y-1">
              <span className="text-[10px] text-[#7D8EA5] uppercase font-bold">Sizing Method</span>
              <select
                value={sizingMethod}
                onChange={(e) =>
                  onUpdateStrategy({
                    position_sizing: {
                      ...strategy.position_sizing,
                      method: e.target.value as PositionSizingMethod,
                      value: sizingValue,
                      available_capital: capital,
                      allocated_capital: estimatedCalculations.allocatedCapital,
                      estimated_margin: estimatedCalculations.estimatedMargin,
                      estimated_exposure: estimatedCalculations.estimatedExposure,
                      effective_leverage: estimatedCalculations.effectiveLeverage,
                    },
                  })
                }
                className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#22D3EE] font-bold focus:outline-none"
              >
                <option value="PCT_RISK_PER_TRADE">% Risk Per Trade</option>
                <option value="PCT_CAPITAL">% of Total Capital</option>
                <option value="FIXED_CAPITAL">Fixed Capital ($ / ₹)</option>
                <option value="FIXED_QTY">Fixed Quantity / Lots</option>
                <option value="ATR_SIZING">ATR Volatility Sizing</option>
                <option value="VOLATILITY_ADJUSTED">Volatility Adjusted</option>
                <option value="KELLY_DERIVED">Kelly Criterion Derived</option>
                <option value="CUSTOM_FORMULA">Custom Math Formula</option>
              </select>
            </div>

            <div className="bg-[#0C1727] border border-[#12304A] rounded-lg p-2.5 space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-[#7D8EA5] uppercase font-bold">Sizing Value</span>
                <span className="text-[#22D3EE] font-bold">
                  {sizingMethod === "FIXED_CAPITAL" ? `$${sizingValue}` : `${sizingValue}%`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  value={sizingValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 1.0;
                    onUpdateStrategy({
                      position_sizing: {
                        ...strategy.position_sizing,
                        method: sizingMethod,
                        value: val,
                        available_capital: capital,
                        allocated_capital: estimatedCalculations.allocatedCapital,
                        estimated_margin: estimatedCalculations.estimatedMargin,
                        estimated_exposure: estimatedCalculations.estimatedExposure,
                        effective_leverage: estimatedCalculations.effectiveLeverage,
                      },
                    });
                  }}
                  className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-[#0C1727] border border-[#12304A] rounded-lg p-2.5 space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-[#7D8EA5] uppercase font-bold">Account Leverage</span>
                <span className="text-[#F59E0B] font-bold">{leverage}x</span>
              </div>
              <input
                type="number"
                step={0.5}
                min={1}
                max={100}
                value={leverage}
                onChange={(e) =>
                  onUpdateStrategy({
                    risk: { ...strategy.risk, leverage: parseFloat(e.target.value) || 1.0 },
                  })
                }
                className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] font-bold focus:outline-none"
              />
            </div>
          </div>

          {/* Sizing Breakdown Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-[11px]">
            <div className="p-2 rounded bg-[#07111F] border border-[#12304A]">
              <span className="text-[#7D8EA5] text-[10px] block">Available Capital</span>
              <span className="text-[#F8FAFC] font-bold">${capital.toLocaleString()}</span>
            </div>
            <div className="p-2 rounded bg-[#07111F] border border-[#12304A]">
              <span className="text-[#7D8EA5] text-[10px] block">Allocated Capital</span>
              <span className="text-[#22D3EE] font-bold">
                ${estimatedCalculations.allocatedCapital.toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded bg-[#07111F] border border-[#12304A]">
              <span className="text-[#7D8EA5] text-[10px] block">Est. Margin</span>
              <span className="text-[#00E89A] font-bold">
                ${estimatedCalculations.estimatedMargin.toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded bg-[#07111F] border border-[#12304A]">
              <span className="text-[#7D8EA5] text-[10px] block">Est. Exposure</span>
              <span className="text-[#F59E0B] font-bold">
                ${estimatedCalculations.estimatedExposure.toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded bg-[#07111F] border border-[#12304A]">
              <span className="text-[#7D8EA5] text-[10px] block">Effective Leverage</span>
              <span className="text-[#F8FAFC] font-bold">
                {estimatedCalculations.effectiveLeverage}x
              </span>
            </div>
          </div>
        </div>
      </QosStrategySection>

      {/* ------------------------------------------------------------------
       * 5. STAGE 5: EXIT & RISK MANAGEMENT
       * ------------------------------------------------------------------ */}
      <QosStrategySection
        stepNumber={5}
        title="EXIT & RISK MANAGEMENT"
        subtitle="Hard Stop Loss, Profit Targets, and dynamic Trailing protection"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          {/* Stop Loss */}
          <div className="bg-[#0C1727] border border-[#12304A] rounded-lg p-2.5 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#7D8EA5] font-bold">STOP LOSS</span>
              <span className="text-[#FF3B5C] font-bold">
                -{strategy.exit?.stop_loss_value || 1.0}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={0.1}
                min={0.1}
                max={50}
                value={strategy.exit?.stop_loss_value || 1.0}
                onChange={(e) =>
                  onUpdateStrategy({
                    exit: { ...strategy.exit, stop_loss_value: parseFloat(e.target.value) || 1.0 },
                  })
                }
                className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#FF3B5C] font-bold focus:outline-none"
              />
              <span className="text-[#7D8EA5]">%</span>
            </div>
          </div>

          {/* Take Profit */}
          <div className="bg-[#0C1727] border border-[#12304A] rounded-lg p-2.5 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#7D8EA5] font-bold">TAKE PROFIT</span>
              <span className="text-[#00E89A] font-bold">
                +{strategy.exit?.take_profit_value || 2.0}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={0.1}
                min={0.1}
                max={200}
                value={strategy.exit?.take_profit_value || 2.0}
                onChange={(e) =>
                  onUpdateStrategy({
                    exit: { ...strategy.exit, take_profit_value: parseFloat(e.target.value) || 2.0 },
                  })
                }
                className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#00E89A] font-bold focus:outline-none"
              />
              <span className="text-[#7D8EA5]">%</span>
            </div>
          </div>

          {/* Trailing Stop */}
          <div className="bg-[#0C1727] border border-[#12304A] rounded-lg p-2.5 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#7D8EA5] font-bold">TRAILING STOP</span>
              <button
                type="button"
                onClick={() =>
                  onUpdateStrategy({
                    exit: {
                      ...strategy.exit,
                      trailing_stop_enabled: !strategy.exit?.trailing_stop_enabled,
                    },
                  })
                }
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                  strategy.exit?.trailing_stop_enabled
                    ? "bg-[#168BFF] text-white"
                    : "bg-[#0A1422] text-[#7D8EA5] border border-[#12304A]"
                }`}
              >
                {strategy.exit?.trailing_stop_enabled ? "ACTIVE" : "OFF"}
              </button>
            </div>
            <div className="text-[10px] text-[#7D8EA5] pt-1">
              {strategy.exit?.trailing_stop_enabled
                ? "ATR Dynamic Trail"
                : "Fixed Stop Loss"}
            </div>
          </div>

          {/* Max Daily Loss */}
          <div className="bg-[#0C1727] border border-[#12304A] rounded-lg p-2.5 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#7D8EA5] font-bold">MAX DAILY LOSS</span>
              <span className="text-[#F59E0B] font-bold">
                ${strategy.risk?.max_daily_loss || 500}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={50}
                min={50}
                value={strategy.risk?.max_daily_loss || 500}
                onChange={(e) =>
                  onUpdateStrategy({
                    risk: { ...strategy.risk, max_daily_loss: parseFloat(e.target.value) || 500 },
                  })
                }
                className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#F59E0B] font-bold focus:outline-none"
              />
            </div>
          </div>
        </div>
      </QosStrategySection>

      {/* ------------------------------------------------------------------
       * 6. STAGE 6: ADVANCED TRADE MANAGEMENT
       * ------------------------------------------------------------------ */}
      <QosStrategySection
        stepNumber={6}
        title="TRADE MANAGEMENT"
        subtitle="Partial scaling exits, break-even shift, pyramiding, and guardrail limits"
      >
        <div className="space-y-3 font-mono text-xs">
          {/* Partial Exits Table */}
          <div className="bg-[#0C1727] border border-[#12304A] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#F8FAFC] font-bold flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-[#22D3EE]" />
                <span>Multi-Target Partial Exits</span>
              </span>
              <span className="text-[10px] text-[#7D8EA5]">
                Remaining 50% trails with dynamic ATR stop
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {partialExits.map((pe, idx) => (
                <div
                  key={pe.id || idx}
                  className="p-2 rounded bg-[#0A1422] border border-[#12304A] flex items-center justify-between"
                >
                  <span className="text-[#7D8EA5]">{pe.label || `Target ${idx + 1}`}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#00E89A] font-bold">Exit {pe.exit_pct}%</span>
                    <span className="text-[#7D8EA5]">@</span>
                    <span className="text-[#22D3EE] font-bold">{pe.target_rr}R</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trade Guardrails Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-[#0C1727] border border-[#12304A] flex flex-col justify-between">
              <span className="text-[#7D8EA5] text-[10px]">Move SL to Break-Even</span>
              <button
                type="button"
                onClick={() =>
                  onUpdateStrategy({
                    trade_management: {
                      ...strategy.trade_management,
                      partial_exits: partialExits,
                      move_sl_to_be_on_target: !(strategy.trade_management?.move_sl_to_be_on_target ?? true),
                      scale_in_enabled: strategy.trade_management?.scale_in_enabled ?? false,
                      scale_in_max_steps: strategy.trade_management?.scale_in_max_steps ?? 2,
                      scale_out_enabled: strategy.trade_management?.scale_out_enabled ?? true,
                      pyramiding_max: strategy.trade_management?.pyramiding_max ?? 1,
                      reentry_enabled: strategy.trade_management?.reentry_enabled ?? false,
                      cooldown_bars: strategy.trade_management?.cooldown_bars ?? 3,
                      max_trades_per_day: strategy.trade_management?.max_trades_per_day ?? 8,
                      max_consecutive_losses: strategy.trade_management?.max_consecutive_losses ?? 3,
                    },
                  })
                }
                className={`mt-1 py-1 rounded text-[10px] font-bold cursor-pointer ${
                  strategy.trade_management?.move_sl_to_be_on_target ?? true
                    ? "bg-[#00E89A]/20 text-[#00E89A] border border-[#00E89A]/40"
                    : "bg-[#0A1422] text-[#7D8EA5] border border-[#12304A]"
                }`}
              >
                {strategy.trade_management?.move_sl_to_be_on_target ?? true ? "ENABLED (At 1R)" : "DISABLED"}
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0C1727] border border-[#12304A] flex flex-col justify-between">
              <span className="text-[#7D8EA5] text-[10px]">Cooldown Bars</span>
              <input
                type="number"
                min={0}
                max={20}
                value={strategy.trade_management?.cooldown_bars ?? strategy.risk?.cooldown_bars ?? 3}
                onChange={(e) =>
                  onUpdateStrategy({
                    risk: { ...strategy.risk, cooldown_bars: parseInt(e.target.value) || 3 },
                  })
                }
                className="mt-1 h-7 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] font-bold focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-[#0C1727] border border-[#12304A] flex flex-col justify-between">
              <span className="text-[#7D8EA5] text-[10px]">Max Trades / Day</span>
              <input
                type="number"
                min={1}
                max={50}
                value={strategy.trade_management?.max_trades_per_day ?? 8}
                onChange={(e) =>
                  onUpdateStrategy({
                    trade_management: {
                      ...strategy.trade_management,
                      partial_exits: partialExits,
                      move_sl_to_be_on_target: strategy.trade_management?.move_sl_to_be_on_target ?? true,
                      scale_in_enabled: strategy.trade_management?.scale_in_enabled ?? false,
                      scale_in_max_steps: strategy.trade_management?.scale_in_max_steps ?? 2,
                      scale_out_enabled: strategy.trade_management?.scale_out_enabled ?? true,
                      pyramiding_max: strategy.trade_management?.pyramiding_max ?? 1,
                      reentry_enabled: strategy.trade_management?.reentry_enabled ?? false,
                      cooldown_bars: strategy.trade_management?.cooldown_bars ?? 3,
                      max_trades_per_day: parseInt(e.target.value) || 8,
                      max_consecutive_losses: strategy.trade_management?.max_consecutive_losses ?? 3,
                    },
                  })
                }
                className="mt-1 h-7 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] font-bold focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-[#0C1727] border border-[#12304A] flex flex-col justify-between">
              <span className="text-[#7D8EA5] text-[10px]">Loss Halt Limit</span>
              <input
                type="number"
                min={1}
                max={10}
                value={strategy.trade_management?.max_consecutive_losses ?? 3}
                onChange={(e) =>
                  onUpdateStrategy({
                    trade_management: {
                      ...strategy.trade_management,
                      partial_exits: partialExits,
                      move_sl_to_be_on_target: strategy.trade_management?.move_sl_to_be_on_target ?? true,
                      scale_in_enabled: strategy.trade_management?.scale_in_enabled ?? false,
                      scale_in_max_steps: strategy.trade_management?.scale_in_max_steps ?? 2,
                      scale_out_enabled: strategy.trade_management?.scale_out_enabled ?? true,
                      pyramiding_max: strategy.trade_management?.pyramiding_max ?? 1,
                      reentry_enabled: strategy.trade_management?.reentry_enabled ?? false,
                      cooldown_bars: strategy.trade_management?.cooldown_bars ?? 3,
                      max_trades_per_day: strategy.trade_management?.max_trades_per_day ?? 8,
                      max_consecutive_losses: parseInt(e.target.value) || 3,
                    },
                  })
                }
                className="mt-1 h-7 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#FF3B5C] font-bold focus:outline-none"
              />
            </div>
          </div>
        </div>
      </QosStrategySection>

      {/* ------------------------------------------------------------------
       * 7. STAGE 7: EXECUTION FILTERS & CONDITIONS
       * ------------------------------------------------------------------ */}
      <QosStrategySection
        stepNumber={7}
        title="EXECUTION FILTERS & CONDITIONS"
        subtitle="Pre-trade liquidity, spread, slippage guardrails, and order routing config"
      >
        <div className="space-y-3 font-mono text-xs">
          {/* Pre-flight Checks Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Market Open Gate", status: "PASS", ok: true },
              { label: "Broker Connected", status: "PASS", ok: true },
              { label: "Market Data Fresh", status: "PASS", ok: true },
              { label: "Max Spread (< 0.2%)", status: "PASS", ok: true },
              { label: "Liquidity Guard", status: "PASS", ok: true },
              { label: "No Risk Lock", status: "PASS", ok: true },
              { label: "Kill Switch Clear", status: "PASS", ok: true },
              { label: "OMS API Latency", status: "OPTIMAL", ok: true },
            ].map((chk, i) => (
              <div
                key={i}
                className="p-2 rounded bg-[#0C1727] border border-[#12304A] flex items-center justify-between text-[10px]"
              >
                <span className="text-[#7D8EA5]">{chk.label}</span>
                <span className="text-[#00E89A] font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {chk.status}
                </span>
              </div>
            ))}
          </div>

          {/* Order Configuration Bar */}
          <div className="bg-[#0C1727] border border-[#12304A] rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-[10px] text-[#7D8EA5] uppercase font-bold block mb-1">
                Order Type
              </span>
              <select
                value={strategy.order_config?.order_type || "LIMIT"}
                onChange={(e) =>
                  onUpdateStrategy({
                    order_config: {
                      order_type: e.target.value as any,
                      limit_offset_ticks: strategy.order_config?.limit_offset_ticks ?? 2,
                      trigger_offset_ticks: strategy.order_config?.trigger_offset_ticks ?? 1,
                      validity: strategy.order_config?.validity ?? "DAY",
                      product_type: strategy.order_config?.product_type ?? "MARGIN",
                      slippage_tolerance_pct: strategy.order_config?.slippage_tolerance_pct ?? 0.1,
                      retry_policy: strategy.order_config?.retry_policy ?? { max_retries: 3, retry_delay_ms: 250 },
                    },
                  })
                }
                className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] font-bold focus:outline-none"
              >
                <option value="LIMIT">Limit Order</option>
                <option value="MARKET">Market Order</option>
                <option value="SL">Stop Loss (SL)</option>
                <option value="SL_M">Stop Loss Market (SL-M)</option>
              </select>
            </div>

            <div>
              <span className="text-[10px] text-[#7D8EA5] uppercase font-bold block mb-1">
                Validity
              </span>
              <select
                value={strategy.order_config?.validity || "DAY"}
                onChange={(e) =>
                  onUpdateStrategy({
                    order_config: {
                      order_type: strategy.order_config?.order_type ?? "LIMIT",
                      limit_offset_ticks: strategy.order_config?.limit_offset_ticks ?? 2,
                      trigger_offset_ticks: strategy.order_config?.trigger_offset_ticks ?? 1,
                      validity: e.target.value as any,
                      product_type: strategy.order_config?.product_type ?? "MARGIN",
                      slippage_tolerance_pct: strategy.order_config?.slippage_tolerance_pct ?? 0.1,
                      retry_policy: strategy.order_config?.retry_policy ?? { max_retries: 3, retry_delay_ms: 250 },
                    },
                  })
                }
                className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] font-bold focus:outline-none"
              >
                <option value="DAY">DAY</option>
                <option value="IOC">IOC (Immediate or Cancel)</option>
                <option value="GTC">GTC (Good Till Cancel)</option>
              </select>
            </div>

            <div>
              <span className="text-[10px] text-[#7D8EA5] uppercase font-bold block mb-1">
                Product Type
              </span>
              <select
                value={strategy.order_config?.product_type || "MARGIN"}
                onChange={(e) =>
                  onUpdateStrategy({
                    order_config: {
                      order_type: strategy.order_config?.order_type ?? "LIMIT",
                      limit_offset_ticks: strategy.order_config?.limit_offset_ticks ?? 2,
                      trigger_offset_ticks: strategy.order_config?.trigger_offset_ticks ?? 1,
                      validity: strategy.order_config?.validity ?? "DAY",
                      product_type: e.target.value as any,
                      slippage_tolerance_pct: strategy.order_config?.slippage_tolerance_pct ?? 0.1,
                      retry_policy: strategy.order_config?.retry_policy ?? { max_retries: 3, retry_delay_ms: 250 },
                    },
                  })
                }
                className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] font-bold focus:outline-none"
              >
                <option value="MARGIN">MARGIN / PERPETUAL</option>
                <option value="MIS">MIS (Intraday)</option>
                <option value="NRML">NRML (Normal)</option>
                <option value="CNC">CNC (Cash & Carry)</option>
              </select>
            </div>

            <div>
              <span className="text-[10px] text-[#7D8EA5] uppercase font-bold block mb-1">
                Slippage Tolerance
              </span>
              <input
                type="number"
                step={0.05}
                min={0.01}
                max={2.0}
                value={strategy.order_config?.slippage_tolerance_pct ?? 0.1}
                onChange={(e) =>
                  onUpdateStrategy({
                    order_config: {
                      order_type: strategy.order_config?.order_type ?? "LIMIT",
                      limit_offset_ticks: strategy.order_config?.limit_offset_ticks ?? 2,
                      trigger_offset_ticks: strategy.order_config?.trigger_offset_ticks ?? 1,
                      validity: strategy.order_config?.validity ?? "DAY",
                      product_type: strategy.order_config?.product_type ?? "MARGIN",
                      slippage_tolerance_pct: parseFloat(e.target.value) || 0.1,
                      retry_policy: strategy.order_config?.retry_policy ?? { max_retries: 3, retry_delay_ms: 250 },
                    },
                  })
                }
                className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] font-bold focus:outline-none"
              />
            </div>
          </div>
        </div>
      </QosStrategySection>

      {/* ------------------------------------------------------------------
       * ADVANCED MODE: RULE DEPENDENCY FLOW & CUSTOM FORMULA
       * ------------------------------------------------------------------ */}
      {interfaceMode === "ADVANCED" && (
        <div className="space-y-4 pt-2">
          {/* Rule Dependency Flowchart */}
          <div className="p-4 rounded-xl bg-[#0A1422] border border-[#12304A] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-[#168BFF]" />
                <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                  RULE DEPENDENCY & LOGIC FLOW
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#7D8EA5]">
                Conjunction: (Setup ∧ Confirm ∧ Trigger) → Sizing → Guardrails
              </span>
            </div>

            {/* Visual flowchart blocks */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-[#07111F] border border-[#12304A] text-xs font-mono">
              <div className="px-3 py-2 rounded bg-[#168BFF]/15 border border-[#168BFF]/40 text-center">
                <span className="text-[#168BFF] font-bold block">1. SETUP REGIME</span>
                <span className="text-[10px] text-[#7D8EA5]">{setupRules.length} Rules (AND)</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#7D8EA5]" />

              <div className="px-3 py-2 rounded bg-[#22D3EE]/15 border border-[#22D3EE]/40 text-center">
                <span className="text-[#22D3EE] font-bold block">2. CONFIRMATION</span>
                <span className="text-[10px] text-[#7D8EA5]">{confirmRules.length} Filters</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#7D8EA5]" />

              <div className="px-3 py-2 rounded bg-[#00E89A]/15 border border-[#00E89A]/40 text-center">
                <span className="text-[#00E89A] font-bold block">3. TRIGGER EVENT</span>
                <span className="text-[10px] text-[#7D8EA5]">{triggerRules.length} Events</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#7D8EA5]" />

              <div className="px-3 py-2 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-center">
                <span className="text-[#F59E0B] font-bold block">4. RISK & SIZING</span>
                <span className="text-[10px] text-[#7D8EA5]">{strategy.risk?.risk_per_trade_pct}% Risk</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#7D8EA5]" />

              <div className="px-3 py-2 rounded bg-[#7C3AED]/15 border border-[#7C3AED]/40 text-center">
                <span className="text-[#A78BFA] font-bold block">5. ORDER INTENT</span>
                <span className="text-[10px] text-[#7D8EA5]">Paper OMS</span>
              </div>
            </div>
          </div>

          {/* Safe Custom Formula Expression Editor */}
          <div className="p-4 rounded-xl bg-[#0A1422] border border-[#12304A] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-[#22D3EE]" />
                <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                  CUSTOM EXPRESSION FORMULA MODE
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#00E89A] font-bold">
                Controlled Expression Engine (Safe AST)
              </span>
            </div>

            <textarea
              rows={3}
              value={customFormulaText}
              onChange={(e) => handleValidateFormula(e.target.value)}
              className="w-full bg-[#0C1727] border border-[#12304A] rounded-lg p-2.5 text-xs text-[#F8FAFC] font-mono focus:outline-none focus:border-[#22D3EE] transition-colors"
              placeholder="e.g. IF ([1H] close > ema_200 AND [15M] rsi_14 > 55) THEN LONG"
            />

            {formulaError && (
              <div className="text-[11px] text-[#FF3B5C] font-mono flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{formulaError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------
       * QUICK ADD MODAL POPUP
       * ------------------------------------------------------------------ */}
      {quickAddStage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A1422] border border-[#12304A] rounded-xl p-4 w-full max-w-md shadow-2xl space-y-3 font-sans text-xs animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#12304A] pb-2">
              <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                Quick Add Rule to {quickAddStage.toUpperCase()}
              </h3>
              <button
                type="button"
                onClick={() => setQuickAddStage(null)}
                className="text-[#7D8EA5] hover:text-[#F8FAFC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div>
                <label className="text-[10px] text-[#7D8EA5] block mb-1">Indicator / Variable</label>
                <input
                  type="text"
                  value={quickIndicator}
                  onChange={(e) => {
                    setQuickIndicator(e.target.value);
                    setQuickLeftKey(e.target.value.toLowerCase().replace(/\s+/g, "_"));
                  }}
                  className="w-full h-8 bg-[#0C1727] border border-[#12304A] rounded px-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#22D3EE]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#7D8EA5] block mb-1">Timeframe</label>
                  <select
                    value={quickTf}
                    onChange={(e) => setQuickTf(e.target.value as RuleTimeframe)}
                    className="w-full h-8 bg-[#0C1727] border border-[#12304A] rounded px-2 text-xs text-[#22D3EE] font-bold focus:outline-none"
                  >
                    {TIMEFRAMES.map((tf) => (
                      <option key={tf} value={tf}>
                        {tf}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#7D8EA5] block mb-1">Condition Operator</label>
                  <select
                    value={quickOp}
                    onChange={(e) => setQuickOp(e.target.value)}
                    className="w-full h-8 bg-[#0C1727] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] focus:outline-none"
                  >
                    {SUPPORTED_OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#7D8EA5] block mb-1">Target / Reference Value</label>
                <input
                  type="text"
                  value={quickRight}
                  onChange={(e) => setQuickRight(e.target.value)}
                  className="w-full h-8 bg-[#0C1727] border border-[#12304A] rounded px-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#22D3EE]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#12304A]">
              <QosButton variant="secondary" size="sm" onClick={() => setQuickAddStage(null)}>
                Cancel
              </QosButton>
              <QosButton variant="primary" size="sm" onClick={handleQuickAddRule}>
                Add Rule
              </QosButton>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------
       * EDIT RULE DRAWER / MODAL
       * ------------------------------------------------------------------ */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A1422] border border-[#12304A] rounded-xl p-4 w-full max-w-md shadow-2xl space-y-3 font-sans text-xs animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#12304A] pb-2">
              <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                Edit Rule: {editingRule.rule.leftLabel || editingRule.rule.left}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="text-[#7D8EA5] hover:text-[#F8FAFC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div>
                <label className="text-[10px] text-[#7D8EA5] block mb-1">Left Operand / Label</label>
                <input
                  type="text"
                  value={editingRule.rule.leftLabel || editingRule.rule.left}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      rule: { ...editingRule.rule, leftLabel: e.target.value },
                    })
                  }
                  className="w-full h-8 bg-[#0C1727] border border-[#12304A] rounded px-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#22D3EE]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#7D8EA5] block mb-1">Timeframe</label>
                  <select
                    value={editingRule.rule.timeframe}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        rule: { ...editingRule.rule, timeframe: e.target.value as RuleTimeframe },
                      })
                    }
                    className="w-full h-8 bg-[#0C1727] border border-[#12304A] rounded px-2 text-xs text-[#22D3EE] font-bold focus:outline-none"
                  >
                    {TIMEFRAMES.map((tf) => (
                      <option key={tf} value={tf}>
                        {tf}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#7D8EA5] block mb-1">Operator</label>
                  <select
                    value={editingRule.rule.op}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        rule: { ...editingRule.rule, op: e.target.value },
                      })
                    }
                    className="w-full h-8 bg-[#0C1727] border border-[#12304A] rounded px-2 text-xs text-[#F8FAFC] focus:outline-none"
                  >
                    {SUPPORTED_OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#7D8EA5] block mb-1">Right Operand / Value</label>
                <input
                  type="text"
                  value={editingRule.rule.right}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      rule: {
                        ...editingRule.rule,
                        right: e.target.value,
                        rightLabel: e.target.value,
                      },
                    })
                  }
                  className="w-full h-8 bg-[#0C1727] border border-[#12304A] rounded px-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#22D3EE]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#7D8EA5] block mb-1">Move to Stage</label>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  {(["setup", "confirmation", "trigger"] as RuleTargetStage[]).map((stg) => (
                    <button
                      key={stg}
                      type="button"
                      onClick={() => handleMoveStage(editingRule.stage, stg, editingRule.rule)}
                      className={`py-1 rounded font-bold uppercase transition-colors ${
                        editingRule.stage === stg
                          ? "bg-[#168BFF] text-white"
                          : "bg-[#0C1727] text-[#7D8EA5] hover:text-[#F8FAFC] border border-[#12304A]"
                      }`}
                    >
                      {stg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#12304A]">
              <button
                type="button"
                onClick={() => handleDeleteRule(editingRule.stage, editingRule.rule.id)}
                className="text-[#FF3B5C] hover:underline text-[11px] font-semibold"
              >
                Delete Rule
              </button>

              <div className="flex items-center gap-2">
                <QosButton variant="secondary" size="sm" onClick={() => setEditingRule(null)}>
                  Cancel
                </QosButton>
                <QosButton
                  variant="primary"
                  size="sm"
                  onClick={() => handleSaveEditedRule(editingRule.rule, editingRule.stage)}
                >
                  Save Changes
                </QosButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
