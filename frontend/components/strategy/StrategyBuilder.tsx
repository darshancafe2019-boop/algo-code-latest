"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  StrategyIdeDefinition,
  StrategyIdeRule,
  StrategyIdeReadiness,
  StrategyIdePreflight,
  StrategyIdeObservation,
  BacktestResultPayload,
} from "@/types/strategy-ide";

import { StrategyIdeHeader } from "./StrategyIdeHeader";
import { StrategyBuildLibrary } from "./StrategyBuildLibrary";
import { StrategyRuleCanvas } from "./StrategyRuleCanvas";
import { StrategyInspector } from "./StrategyInspector";
import { StrategyTestingDrawer } from "./StrategyTestingDrawer";
import { StrategyVersionDiffModal } from "./StrategyVersionDiffModal";
import { StrategyAssignBotModal } from "./StrategyAssignBotModal";
import { StrategyCatalogModal } from "./StrategyCatalogModal";

const INITIAL_STRATEGY: StrategyIdeDefinition = {
  strategy_id: "strat-trend-confluence-btc",
  name: "Multi-Timeframe Trend Confluence Strategy",
  description: "1H Macro EMA 200 filter with 15M timing EMA 9/21 cross and 15M RSI momentum confirmation.",
  status: "DRAFT",
  active_version: "v1.0.0",
  market_type: "crypto",
  symbol: "BTC/USDT",
  base_timeframe: "15m",
  direction: "LONG",
  entry: {
    setup: {
      conjunction: "AND",
      rules: [
        {
          id: "setup-1",
          timeframe: "1h",
          left: "close",
          leftLabel: "1H Close",
          op: ">",
          right: "ema_200",
          rightLabel: "1H EMA 200",
          category: "TREND",
          enabled: true,
          description: "Macro Regime Filter",
        },
      ],
    },
    confirmation: {
      conjunction: "AND",
      rules: [
        {
          id: "conf-1",
          timeframe: "15m",
          left: "rsi_14",
          leftLabel: "15M RSI (14)",
          op: ">",
          right: "50",
          rightLabel: "50.0",
          category: "MOMENTUM",
          enabled: true,
          description: "Bullish Momentum Filter",
        },
      ],
    },
    trigger: {
      conjunction: "AND",
      rules: [
        {
          id: "trig-1",
          timeframe: "15m",
          left: "ema_9",
          leftLabel: "15M EMA 9",
          op: "crosses_above",
          right: "ema_21",
          rightLabel: "15M EMA 21",
          category: "TREND",
          enabled: true,
          description: "Fast Trend Alignment Trigger",
        },
      ],
    },
  },
  exit: {
    stop_loss_type: "ATR",
    stop_loss_value: 1.5,
    take_profit_type: "RR_RATIO",
    take_profit_value: 2.0,
    multi_target: [
      { ratio: 1.0, pct: 50 },
      { ratio: 2.0, pct: 50 },
    ],
    trailing_stop_enabled: false,
    trailing_stop_activation: 1.5,
    trailing_stop_callback: 0.5,
  },
  risk: {
    capital: 10000.0,
    risk_per_trade_pct: 1.0,
    max_position_size_pct: 25.0,
    max_daily_loss: 500.0,
    max_drawdown_pct: 5.0,
    max_open_positions: 3,
    leverage: 1.0,
    cooldown_bars: 3,
  },
  compiled_expression: "IF ([1H] close > ema_200 AND [15M] rsi_14 > 50 AND [15M] ema_9 crosses_above ema_21) THEN LONG",
};

export function StrategyBuilder() {
  const queryClient = useQueryClient();
  const [strategy, setStrategy] = useState<StrategyIdeDefinition>(INITIAL_STRATEGY);
  const [isMounted, setIsMounted] = useState(false);

  // Undo / Redo Stack
  const [history, setHistory] = useState<StrategyIdeDefinition[]>([INITIAL_STRATEGY]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Autosave State
  const [autosaveTime, setAutosaveTime] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modals
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // Simulation & Debugger States
  const [liveObservation, setLiveObservation] = useState<StrategyIdeObservation | null>(null);
  const [isObserving, setIsObserving] = useState(false);
  const [backtestResult, setBacktestResult] = useState<BacktestResultPayload | null>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);

  // Readiness & Preflight State
  const [readiness, setReadiness] = useState<StrategyIdeReadiness | null>(null);
  const [preflight, setPreflight] = useState<StrategyIdePreflight | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch Strategy Catalog
  const { data: catalogData } = useQuery<{ strategies: any[] }>({
    queryKey: ["strategyCatalog"],
    queryFn: async () => {
      const res = await fetch("/api/strategy/ide/strategies");
      if (!res.ok) return { strategies: [] };
      return res.json();
    },
  });

  // Revalidate Strategy when changed
  const validateStrategy = useCallback(async (currentStrat: StrategyIdeDefinition) => {
    try {
      const res = await fetch("/api/strategy/ide/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: currentStrat }),
      });
      if (res.ok) {
        const json = await res.json();
        setReadiness(json.readiness);
        setPreflight(json.preflight);
        if (json.compiled_expression) {
          setStrategy((prev) => ({
            ...prev,
            compiled_expression: json.compiled_expression,
            config_hash: json.config_hash,
          }));
        }
      }
    } catch (e) {
      console.warn("Validation error:", e);
    }
  }, []);

  // Initial validation
  useEffect(() => {
    validateStrategy(strategy);
  }, [validateStrategy, strategy]);

  // Push to history
  const pushToHistory = (newStrat: StrategyIdeDefinition) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newStrat);
    if (updatedHistory.length > 30) updatedHistory.shift();
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setStrategy(prev);
      validateStrategy(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setStrategy(next);
      validateStrategy(next);
    }
  };

  const handleUpdateStrategy = (fields: Partial<StrategyIdeDefinition>) => {
    const updated = { ...strategy, ...fields };
    setStrategy(updated);
    pushToHistory(updated);
    validateStrategy(updated);
  };

  const handleUpdateRisk = (riskFields: Partial<StrategyIdeDefinition["risk"]>) => {
    const updated = { ...strategy, risk: { ...strategy.risk, ...riskFields } };
    setStrategy(updated);
    pushToHistory(updated);
    validateStrategy(updated);
  };

  // Rule Handlers
  const handleAddRuleToGroup = (
    targetGroup: "setup" | "confirmation" | "trigger",
    rule: StrategyIdeRule
  ) => {
    const updatedEntry = { ...strategy.entry };
    const currentRules = updatedEntry[targetGroup]?.rules || [];
    updatedEntry[targetGroup] = {
      ...updatedEntry[targetGroup],
      rules: [...currentRules, rule],
    };
    handleUpdateStrategy({ entry: updatedEntry });
  };

  const handleUpdateRule = (
    groupKey: "setup" | "confirmation" | "trigger",
    ruleId: string,
    updatedRule: Partial<StrategyIdeRule>
  ) => {
    const updatedEntry = { ...strategy.entry };
    const currentRules = updatedEntry[groupKey]?.rules || [];
    updatedEntry[groupKey] = {
      ...updatedEntry[groupKey],
      rules: currentRules.map((r) => (r.id === ruleId ? { ...r, ...updatedRule } : r)),
    };
    handleUpdateStrategy({ entry: updatedEntry });
  };

  const handleDeleteRule = (groupKey: "setup" | "confirmation" | "trigger", ruleId: string) => {
    const updatedEntry = { ...strategy.entry };
    const currentRules = updatedEntry[groupKey]?.rules || [];
    updatedEntry[groupKey] = {
      ...updatedEntry[groupKey],
      rules: currentRules.filter((r) => r.id !== ruleId),
    };
    handleUpdateStrategy({ entry: updatedEntry });
  };

  const handleAddRule = (groupKey: "setup" | "confirmation" | "trigger") => {
    const defaultRule: StrategyIdeRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timeframe: groupKey === "setup" ? "1h" : strategy.base_timeframe,
      left: "close",
      leftLabel: "Close Price",
      op: ">",
      right: groupKey === "setup" ? "ema_200" : "ema_20",
      rightLabel: groupKey === "setup" ? "EMA 200" : "EMA 20",
      category: "TREND",
      enabled: true,
      description: "Custom rule condition",
    };
    handleAddRuleToGroup(groupKey, defaultRule);
  };

  // Save Draft
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/strategy/ide/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(strategy),
      });
      if (res.ok) {
        const json = await res.json();
        setAutosaveTime(new Date().toLocaleTimeString());
        queryClient.invalidateQueries({ queryKey: ["strategyCatalog"] });
      }
    } catch (e) {
      console.error("Failed to save draft:", e);
    } finally {
      setIsSaving(false);
    }
  };

  // Live Observation Runner
  const handleRunLiveObservation = async () => {
    setIsObserving(true);
    try {
      const res = await fetch("/api/strategy/ide/live-observe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy }),
      });
      if (res.ok) {
        const json = await res.json();
        setLiveObservation(json.observation);
      }
    } catch (e) {
      console.error("Live observation error:", e);
    } finally {
      setIsObserving(false);
    }
  };

  // Backtest Runner
  const handleRunBacktest = async (params: {
    startDate: string;
    endDate: string;
    capital: number;
    feesPct: number;
    slippagePct: number;
  }) => {
    setIsBacktesting(true);
    try {
      const res = await fetch("/api/strategy/ide/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: strategy.symbol,
          timeframe: strategy.base_timeframe,
          start_date: params.startDate,
          end_date: params.endDate,
          capital: params.capital,
          fees_pct: params.feesPct / 100,
          slippage_pct: params.slippagePct / 100,
          name: strategy.name,
          version: strategy.active_version,
          allow_shorts: strategy.direction !== "LONG",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setBacktestResult(json);
      }
    } catch (e) {
      console.error("Backtest failed:", e);
    } finally {
      setIsBacktesting(false);
    }
  };

  // New Strategy
  const handleNewStrategy = () => {
    const newStrat: StrategyIdeDefinition = {
      ...INITIAL_STRATEGY,
      strategy_id: `strat-custom-${Date.now()}`,
      name: "New Quantitative Strategy",
      description: "Custom visual quantitative rule strategy",
      active_version: "v1.0.0",
      status: "DRAFT",
      entry: {
        setup: { conjunction: "AND", rules: [] },
        confirmation: { conjunction: "AND", rules: [] },
        trigger: { conjunction: "AND", rules: [] },
      },
    };
    setStrategy(newStrat);
    pushToHistory(newStrat);
    validateStrategy(newStrat);
  };

  // Clone Strategy
  const handleCloneStrategy = () => {
    const cloned: StrategyIdeDefinition = {
      ...strategy,
      strategy_id: `strat-clone-${Date.now()}`,
      name: `${strategy.name} (Copy)`,
      active_version: "v1.0.0",
      status: "DRAFT",
    };
    setStrategy(cloned);
    pushToHistory(cloned);
    validateStrategy(cloned);
  };

  // Load from Catalog
  const handleLoadFromCatalog = (item: any) => {
    const loaded: StrategyIdeDefinition = {
      strategy_id: item.strategy_id || item.id || `strat-${Date.now()}`,
      name: item.name || "Loaded Strategy",
      description: item.description || "",
      status: (item.status as any) || "DRAFT",
      active_version: item.active_version || item.version || "v1.0.0",
      market_type: item.market_type || "crypto",
      symbol: item.symbol || "BTC/USDT",
      base_timeframe: item.base_timeframe || item.timeframe || "15m",
      direction: item.direction || "LONG",
      entry: item.entry || {
        setup: { conjunction: "AND", rules: [] },
        confirmation: { conjunction: "AND", rules: [] },
        trigger: { conjunction: "AND", rules: item.entry_rules || [] },
      },
      exit: item.exit || INITIAL_STRATEGY.exit,
      risk: item.risk || INITIAL_STRATEGY.risk,
      compiled_expression: item.compiled_expression || "",
    };

    setStrategy(loaded);
    pushToHistory(loaded);
    validateStrategy(loaded);
    setIsCatalogOpen(false);
  };

  if (!isMounted) {
    return <div className="p-8 text-center text-slate-500 font-mono">Initializing Strategy IDE...</div>;
  }

  return (
    <div className="flex flex-col gap-4 font-sans max-w-[1720px] mx-auto pb-12">
      {/* 1. Header Navigation & Main Controls */}
      <StrategyIdeHeader
        strategy={strategy}
        onUpdateStrategy={handleUpdateStrategy}
        onSaveDraft={handleSaveDraft}
        isSaving={isSaving}
        autosaveTime={autosaveTime}
        onOpenValidate={() => validateStrategy(strategy)}
        onOpenCatalog={() => setIsCatalogOpen(true)}
        onOpenVersionsModal={() => setIsVersionsOpen(true)}
        onOpenAssignModal={() => setIsAssignOpen(true)}
        onNewStrategy={handleNewStrategy}
        onCloneStrategy={handleCloneStrategy}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* 2. Main 3-Zone Workstation (Build Library + Rule Canvas + Contextual Inspector) */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left Zone: Indicator & Component Build Library */}
        <StrategyBuildLibrary
          onAddRuleToGroup={handleAddRuleToGroup}
          baseTimeframe={strategy.base_timeframe}
        />

        {/* Center Zone: Visual Rule Canvas with NL Generator & AST Expression */}
        <StrategyRuleCanvas
          strategy={strategy}
          onUpdateStrategy={handleUpdateStrategy}
          onUpdateRule={handleUpdateRule}
          onDeleteRule={handleDeleteRule}
          onAddRule={handleAddRule}
          compiledExpression={strategy.compiled_expression || "NO_ACTIVE_CONDITIONS"}
        />

        {/* Right Zone: Contextual Inspector (Scorecard, Risk, Data Health, Versions) */}
        <StrategyInspector
          strategy={strategy}
          readiness={readiness}
          preflight={preflight}
          onUpdateRisk={handleUpdateRisk}
          onOpenVersionsModal={() => setIsVersionsOpen(true)}
        />
      </div>

      {/* 3. Bottom Research & Simulation Drawer */}
      <StrategyTestingDrawer
        strategy={strategy}
        liveObservation={liveObservation}
        isObserving={isObserving}
        onRunLiveObservation={handleRunLiveObservation}
        backtestResult={backtestResult}
        isBacktesting={isBacktesting}
        onRunBacktest={handleRunBacktest}
      />

      {/* 4. Modals */}
      <StrategyCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        catalog={catalogData?.strategies || []}
        onLoadStrategy={handleLoadFromCatalog}
        onDuplicateStrategy={handleLoadFromCatalog}
        onAssignToBot={() => {
          setIsCatalogOpen(false);
          setIsAssignOpen(true);
        }}
      />

      <StrategyVersionDiffModal
        isOpen={isVersionsOpen}
        onClose={() => setIsVersionsOpen(false)}
        strategy={strategy}
        onVersionPublished={(newVer) => {
          handleUpdateStrategy({ active_version: newVer, status: "PUBLISHED" });
        }}
      />

      <StrategyAssignBotModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        strategy={strategy}
        onAssignSuccess={() => {}}
      />
    </div>
  );
}
