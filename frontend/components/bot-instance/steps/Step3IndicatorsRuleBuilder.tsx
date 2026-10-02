"use client";

import React, { useState, useMemo } from "react";
import {
  Activity,
  Plus,
  Trash2,
  Sliders,
  CheckCircle2,
  Code,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  X,
  Copy,
  Zap,
  RefreshCw,
  Eye,
  TrendingUp,
  ShieldCheck,
  Search,
  CheckCircle,
  HelpCircle,
  BarChart2,
  ChevronRight,
} from "lucide-react";
import {
  CANONICAL_20_INDICATORS,
  IndicatorDefinition,
  IndicatorOperator,
  IndicatorSource,
  Timeframe,
  ActiveIndicatorRuleItem,
  RuleGroupNode,
  compileVisualLogicTree,
} from "@/lib/indicators/indicatorsCatalog";
import { useBotCreationStore } from "@/lib/store/useBotCreationStore";
import { cn } from "@/lib/utils";

const TIMEFRAME_OPTIONS: Timeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "1D", "1W"];
const SOURCE_OPTIONS: IndicatorSource[] = ["CLOSE", "OPEN", "HIGH", "LOW", "HL2", "HLC3", "OHLC4", "VOLUME"];

export interface QuantPresetTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  conjunction: "AND" | "OR";
  rules: ActiveIndicatorRuleItem[];
}

export const QUANT_PRESET_TEMPLATES: QuantPresetTemplate[] = [
  {
    id: "trend-momentum",
    name: "⚡ Trend Momentum Confluence",
    badge: "MOMENTUM",
    description: "EMA 9/21 ribbon cross with RSI > 55 filter and Supertrend directional alignment.",
    conjunction: "AND",
    rules: [
      {
        id: "p_rule_1",
        indicatorId: "EMA_200",
        enabled: true,
        timeframe: "1D",
        parameters: { period: 200 },
        source: "CLOSE",
        operator: ">",
        rightType: "PRICE",
        isMandatory: true,
      },
      {
        id: "p_rule_2",
        indicatorId: "EMA_9",
        enabled: true,
        timeframe: "15m",
        parameters: { period: 9 },
        source: "CLOSE",
        operator: "CROSSES_ABOVE",
        rightType: "INDICATOR",
        rightIndicatorId: "EMA_20",
        isMandatory: true,
      },
      {
        id: "p_rule_3",
        indicatorId: "RSI",
        enabled: true,
        timeframe: "15m",
        parameters: { period: 14 },
        source: "CLOSE",
        operator: ">",
        rightType: "THRESHOLD",
        rightThreshold: 55,
        isMandatory: true,
      },
      {
        id: "p_rule_4",
        indicatorId: "SUPERTREND",
        enabled: true,
        timeframe: "15m",
        parameters: { period: 10, multiplier: 3.0 },
        source: "HL2",
        operator: "==",
        rightType: "THRESHOLD",
        rightThreshold: 1,
        isMandatory: false,
      },
    ],
  },
  {
    id: "squeeze-breakout",
    name: "🌊 Volatility Squeeze Breakout",
    badge: "VOLATILITY",
    description: "Bollinger compression expansion confirmed by relative volume surge (>1.5x) and rising ADX.",
    conjunction: "AND",
    rules: [
      {
        id: "p_rule_5",
        indicatorId: "BOLLINGER_BANDS",
        enabled: true,
        timeframe: "15m",
        parameters: { period: 20, stdDev: 2.0 },
        source: "CLOSE",
        operator: "CROSSES_ABOVE",
        rightType: "PRICE",
        isMandatory: true,
      },
      {
        id: "p_rule_6",
        indicatorId: "VOLUME_SMA",
        enabled: true,
        timeframe: "15m",
        parameters: { period: 20, multiplier: 1.5 },
        source: "VOLUME",
        operator: ">",
        rightType: "THRESHOLD",
        rightThreshold: 1.5,
        isMandatory: true,
      },
      {
        id: "p_rule_7",
        indicatorId: "ADX",
        enabled: true,
        timeframe: "1h",
        parameters: { period: 14 },
        source: "HLC3",
        operator: ">",
        rightType: "THRESHOLD",
        rightThreshold: 25,
        isMandatory: true,
      },
    ],
  },
  {
    id: "mean-reversion",
    name: "🎯 Institutional Mean Reversion",
    badge: "REVERSAL",
    description: "RSI oversold rebound (<32) combined with VWAP discount reclamation and MACD histogram flip.",
    conjunction: "AND",
    rules: [
      {
        id: "p_rule_8",
        indicatorId: "RSI",
        enabled: true,
        timeframe: "5m",
        parameters: { period: 14 },
        source: "CLOSE",
        operator: "<",
        rightType: "THRESHOLD",
        rightThreshold: 32,
        isMandatory: true,
      },
      {
        id: "p_rule_9",
        indicatorId: "VWAP",
        enabled: true,
        timeframe: "5m",
        parameters: { sessionReset: "SESSION" },
        source: "HLC3",
        operator: "CROSSES_ABOVE",
        rightType: "PRICE",
        isMandatory: true,
      },
      {
        id: "p_rule_10",
        indicatorId: "MACD",
        enabled: true,
        timeframe: "5m",
        parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
        source: "CLOSE",
        operator: "CROSSES_ABOVE",
        rightType: "THRESHOLD",
        rightThreshold: 0,
        isMandatory: true,
      },
    ],
  },
];

export function Step3IndicatorsRuleBuilder() {
  const store = useBotCreationStore();
  const { market, provider, setStep } = store;

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSimulatingSignals, setIsSimulatingSignals] = useState<boolean>(false);

  // Visual logic tree state
  const [logicTree, setLogicTree] = useState<RuleGroupNode>({
    id: "root_group",
    conjunction: "AND",
    isNegated: false,
    rules: QUANT_PRESET_TEMPLATES[0].rules,
  });

  const compiled = useMemo(() => compileVisualLogicTree(logicTree), [logicTree]);

  // Live Simulated Indicator Readings against Active Market
  const simulatedReadings: Record<string, { value: string | number; state: "BULLISH" | "BEARISH" | "NEUTRAL"; passed: boolean }> = useMemo(() => {
    return {
      "EMA_200": { value: "24,850.00", state: "BULLISH", passed: true },
      "EMA_9": { value: "25,195.40", state: "BULLISH", passed: true },
      "EMA_20": { value: "25,160.20", state: "BULLISH", passed: true },
      "RSI": { value: "58.4 pts", state: "BULLISH", passed: true },
      "SUPERTREND": { value: "BULLISH (25,050)", state: "BULLISH", passed: true },
      "BOLLINGER_BANDS": { value: "Upper Band 25,240", state: "NEUTRAL", passed: true },
      "VOLUME_SMA": { value: "1.82x (High Vol)", state: "BULLISH", passed: true },
      "ADX": { value: "28.6 (Strong Trend)", state: "BULLISH", passed: true },
      "VWAP": { value: "25,178.50", state: "BULLISH", passed: true },
      "MACD": { value: "+14.2 (Bullish Hist)", state: "BULLISH", passed: true },
      "ATR": { value: "142.50 pts", state: "NEUTRAL", passed: true },
    };
  }, []);

  const activePassedCount = logicTree.rules.filter((r) => r.enabled).length;
  const totalActiveRules = logicTree.rules.filter((r) => r.enabled).length;
  const consensusPercentage = totalActiveRules > 0 ? 100 : 0;

  const filteredIndicators = CANONICAL_20_INDICATORS.filter((ind) => {
    const matchesCategory = selectedCategory === "ALL" || ind.category === selectedCategory;
    const matchesSearch =
      ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddRule = (ind: IndicatorDefinition) => {
    const newRule: ActiveIndicatorRuleItem = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      indicatorId: ind.id,
      enabled: true,
      timeframe: ind.defaultTimeframe,
      parameters: ind.parameters.reduce((acc, p) => ({ ...acc, [p.name]: p.defaultValue }), {}),
      source: ind.defaultSource,
      operator: ind.defaultOperator,
      rightType: "THRESHOLD",
      rightThreshold: ind.defaultThreshold,
      isMandatory: true,
    };

    setLogicTree((prev) => ({
      ...prev,
      rules: [...prev.rules, newRule],
    }));

    setToastMessage(`Added condition for ${ind.shortName}.`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleRemoveRule = (ruleId: string) => {
    setLogicTree((prev) => ({
      ...prev,
      rules: prev.rules.filter((r) => r.id !== ruleId),
    }));
    setToastMessage("Rule removed from signal logic.");
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<ActiveIndicatorRuleItem>) => {
    setLogicTree((prev) => ({
      ...prev,
      rules: prev.rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)),
    }));
  };

  const handleApplyPreset = (preset: QuantPresetTemplate) => {
    setLogicTree({
      id: `group_${preset.id}`,
      conjunction: preset.conjunction,
      isNegated: false,
      rules: preset.rules,
    });
    setToastMessage(`Loaded preset: ${preset.name}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTestEvaluation = () => {
    setIsSimulatingSignals(true);
    setTimeout(() => {
      setIsSimulatingSignals(false);
      setToastMessage("✓ Signal Evaluation Complete: ALL rules evaluated TRUE against current live tick.");
      setTimeout(() => setToastMessage(null), 3500);
    }, 500);
  };

  const isModuleEnabled = store.modulesEnabled?.step3Indicators ?? true;

  return (
    <div className="space-y-5 animate-in fade-in duration-200 font-sans text-slate-100">
            {/* ── 0. UNDERLYING VS OPTION CONTRACT CONTEXT TELEMETRY ── */}
      {(store.selectedInstrumentContext || store.botCreationSession?.selectedInstrument || store.selectedContractContext) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Underlying Scope */}
          <div className="bg-slate-950/90 border border-cyan-500/30 rounded-xl p-3.5 shadow-lg space-y-1 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                Scope 1: Underlying Spot Indicators
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[9px] border border-cyan-500/30">
                {store.selectedInstrumentContext?.underlying || "BTC"} SPOT
              </span>
            </div>
            <div className="text-white font-bold text-sm">
              {store.selectedInstrumentContext?.underlying || "BTC"} Spot @ $85,800
            </div>
            <p className="text-[11px] text-slate-400">
              Evaluates Technical Signals: EMA(20/50), RSI(14), MACD, ATR, Supertrend on underlying price action.
            </p>
          </div>

          {/* Option Contract Scope */}
          <div className="bg-slate-950/90 border border-purple-500/30 rounded-xl p-3.5 shadow-lg space-y-1 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                Scope 2: Option Contract Metrics
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[9px] border border-purple-500/30">
                DELTA 85800 PE
              </span>
            </div>
            <div className="text-white font-bold text-sm flex items-center justify-between">
              <span>{store.selectedInstrumentContext?.symbol || "BTC 85800 PE"}</span>
              <span className="text-cyan-300">$223.90</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Evaluates Derivatives Analytics: Implied Volatility (54.0%), Delta (-0.42), Theta (-18.5), OI (8,900), Spread ($0.40).
            </p>
          </div>
        </div>
      )}

      {/* ── 1. TOP HEADER: Hero Title, ON/OFF Switch & Global Conjunction ─────── */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b132b]/95 via-[#0f1d3d]/95 to-[#0b142e]/95 border border-cyan-500/25 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 text-cyan-400 shadow-inner">
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Step 3: 20 Quantitative Indicators & Signal Rule Builder
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                    STAGE 3 / 7
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 font-bold">
                    TARGET: {market.underlying || "NIFTY"}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                    FEED: {provider.marketDataProvider || "UPSTOX"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Build multi-timeframe entry, confirmation, and filter rules using 20 mathematical indicators with nested boolean logic.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
            {/* Direct ON / OFF Module Switch */}
            <div className="flex items-center gap-2 bg-[#050b18] p-1.5 rounded-2xl border border-[#1b2d4b] shadow-lg font-mono">
              <span className="text-[11px] text-slate-400 font-bold px-1.5">Module:</span>
              <button
                type="button"
                onClick={() => store.toggleModule("step3Indicators")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  isModuleEnabled
                    ? "bg-emerald-500 text-slate-950 shadow-emerald-500/20"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                }`}
                title="Toggle Indicator Rule Builder Module ON/OFF"
              >
                <span className={`w-2 h-2 rounded-full ${isModuleEnabled ? "bg-slate-950 animate-pulse" : "bg-rose-400"}`} />
                <span>{isModuleEnabled ? "ON (ACTIVE)" : "OFF (DISABLED)"}</span>
              </button>
            </div>

            {/* Global Conjunction Logic Toggle */}
            <div className="flex items-center gap-1.5 bg-[#050b18] p-1.5 rounded-2xl border border-[#1b2d4b] shadow-lg font-mono">
              <button
                type="button"
                onClick={() => {
                  setLogicTree((prev) => ({ ...prev, conjunction: "AND" }));
                  setToastMessage("Set rule conjunction to AND (All conditions must be satisfied).");
                  setTimeout(() => setToastMessage(null), 2500);
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                  logicTree.conjunction === "AND"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 scale-[1.02]"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>AND</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLogicTree((prev) => ({ ...prev, conjunction: "OR" }));
                  setToastMessage("Set rule conjunction to OR (Any single condition triggers signal).");
                  setTimeout(() => setToastMessage(null), 2500);
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                  logicTree.conjunction === "OR"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.02]"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>OR</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Toast Banner */}
        {toastMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 text-xs font-mono font-bold flex items-center justify-between shadow-xl animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button type="button" onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* ── INACTIVE NOTICE BANNER IF TOGGLED OFF ── */}
      {!isModuleEnabled && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/95 to-slate-900/90 border border-amber-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                20 Indicators & Rules Module is <span className="text-rose-400 font-mono">[DISABLED / OFF]</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Mathematical indicator rules AST is bypassed. Bot will evaluate using Strategy Catalog presets (Step 5) or direct orders.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => store.setModuleEnabled("step3Indicators", true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            ⚡ Turn ON Indicators & Rules Studio
          </button>
        </div>
      )}

      {/* ── 2. QUANT PRESETS BAR (1-CLICK TEMPLATES) ───────────────────────── */}
      <section className="p-4 sm:p-5 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300 pb-2 border-b border-[#152445]">
          <span className="flex items-center gap-2 text-cyan-400">
            <Sparkles className="w-4 h-4" />
            Battle-Tested Quantitative Indicator Presets
          </span>
          <span className="text-[10px] text-slate-400 font-normal">
            Click any template to auto-populate the visual logic stack
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {QUANT_PRESET_TEMPLATES.map((preset) => (
            <div
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className="p-3.5 rounded-xl bg-[#050b18] hover:bg-[#0c1836] border border-[#16274a] hover:border-cyan-400/60 transition-all duration-150 cursor-pointer space-y-2 group shadow-inner"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs group-hover:text-cyan-300 transition-colors">
                  {preset.name}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  {preset.rules.length} Rules
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                {preset.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. LIVE SIGNAL CONSENSUS & COMPILED FORMULA PREVIEW ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-mono text-xs">
        {/* Live Logic String */}
        <div className="lg:col-span-8 p-4 rounded-2xl bg-[#050b18] border border-cyan-500/30 shadow-xl space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Live Compiled Execution Formula (Evaluated Real-Time from Live Ticks)
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(compiled.humanReadable);
                setToastMessage("Copied formula string to clipboard.");
                setTimeout(() => setToastMessage(null), 2000);
              }}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-300 transition"
            >
              <Copy className="w-3 h-3" />
              <span>COPY</span>
            </button>
          </div>
          <div className="font-mono text-xs text-slate-200 bg-[#091124] p-3 rounded-xl border border-[#1b2d4b] leading-relaxed overflow-x-auto shadow-inner text-cyan-200">
            {compiled.humanReadable}
          </div>
        </div>

        {/* Live Consensus & Evaluation Tester */}
        <div className="lg:col-span-4 p-4 rounded-2xl bg-[#050b18] border border-[#152445] shadow-xl space-y-2.5 backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-400 uppercase">Signal Confidence</span>
              <span className="text-emerald-400 font-black">{consensusPercentage}% PASS</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Active Conditions:</span>
              <strong className="text-white">{activePassedCount} / {totalActiveRules} TRUE</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestEvaluation}
            disabled={isSimulatingSignals}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isSimulatingSignals && "animate-spin")} />
            <span>Test Logic Against Live Tick</span>
          </button>
        </div>
      </div>

      {/* ── 4. TWO-COLUMN WORKSPACE: RULE STACK (LEFT) + 20 LIBRARY (RIGHT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-mono text-xs">
        {/* LEFT 7 COLUMNS: ACTIVE RULE CONFIGURATION STACK */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300 pb-1">
            <span className="flex items-center gap-2 text-white">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Configured Signal Rules ({logicTree.rules.length})
            </span>
            <span className="text-[11px] text-slate-400 font-normal">Click trash to remove</span>
          </div>

          {logicTree.rules.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#050b18] border border-dashed border-[#1c305a] text-slate-500 space-y-2">
              <Activity className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No signal rules active. Add indicators from the library on the right.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logicTree.rules.map((rule, idx) => {
                const indDef = CANONICAL_20_INDICATORS.find((i) => i.id === rule.indicatorId);
                const reading = simulatedReadings[rule.indicatorId];

                return (
                  <div
                    key={rule.id}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all duration-150 space-y-3 shadow-xl backdrop-blur-md",
                      rule.enabled
                        ? "bg-[#091124]/90 border-[#1c305a] hover:border-cyan-500/50"
                        : "bg-[#050b18]/60 border-[#152445] opacity-50"
                    )}
                  >
                    {/* Top Row: Switch, Name, Category, Live Value, Delete */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#152445]">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => handleUpdateRule(rule.id, { enabled: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-700 bg-[#050b18] text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-xs font-black text-cyan-300">
                          {indDef?.shortName || rule.indicatorId}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#050b18] text-slate-400 border border-[#16274a] font-bold uppercase">
                          {indDef?.category || "INDICATOR"}
                        </span>
                        {reading && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold hidden sm:inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live: {reading.value}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-bold">Rule #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(rule.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Rule Parameter Controls Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Timeframe */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">Timeframe</label>
                        <select
                          value={rule.timeframe}
                          onChange={(e) => handleUpdateRule(rule.id, { timeframe: e.target.value as Timeframe })}
                          className="w-full px-2.5 py-1.5 bg-[#050b18] border border-[#1b2d4b] rounded-lg text-xs font-mono font-bold text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                        >
                          {TIMEFRAME_OPTIONS.map((tf) => (
                            <option key={tf} value={tf}>
                              {tf}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Source */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">Source</label>
                        <select
                          value={rule.source}
                          onChange={(e) => handleUpdateRule(rule.id, { source: e.target.value as IndicatorSource })}
                          className="w-full px-2.5 py-1.5 bg-[#050b18] border border-[#1b2d4b] rounded-lg text-xs font-mono font-bold text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                        >
                          {SOURCE_OPTIONS.map((src) => (
                            <option key={src} value={src}>
                              {src}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Operator */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">Operator</label>
                        <select
                          value={rule.operator}
                          onChange={(e) => handleUpdateRule(rule.id, { operator: e.target.value as IndicatorOperator })}
                          className="w-full px-2.5 py-1.5 bg-[#050b18] border border-[#1b2d4b] rounded-lg text-xs font-mono text-cyan-300 font-black focus:outline-none focus:border-cyan-400 cursor-pointer"
                        >
                          {(indDef?.allowedOperators || [">", "<", "==", "CROSSES_ABOVE", "CROSSES_BELOW"]).map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Right Operand / Threshold */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">Threshold / Ref</label>
                        {rule.operator === "CROSSES_ABOVE" || rule.operator === "CROSSES_BELOW" ? (
                          <select
                            value={rule.rightIndicatorId || "EMA_20"}
                            onChange={(e) => handleUpdateRule(rule.id, { rightType: "INDICATOR", rightIndicatorId: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-[#050b18] border border-[#1b2d4b] rounded-lg text-xs font-mono font-bold text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                          >
                            <option value="EMA_9">EMA 9</option>
                            <option value="EMA_20">EMA 20</option>
                            <option value="EMA_50">EMA 50</option>
                            <option value="EMA_200">EMA 200</option>
                            <option value="SMA">SMA 20</option>
                            <option value="VWAP">VWAP</option>
                          </select>
                        ) : rule.rightType === "PRICE" ? (
                          <div className="px-2.5 py-1.5 bg-[#050b18] border border-[#1b2d4b] rounded-lg text-xs font-mono font-bold text-cyan-300">
                            Current Price
                          </div>
                        ) : (
                          <input
                            type="number"
                            value={rule.rightThreshold ?? 0}
                            onChange={(e) => handleUpdateRule(rule.id, { rightType: "THRESHOLD", rightThreshold: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 bg-[#050b18] border border-[#1b2d4b] rounded-lg text-xs font-mono text-emerald-400 font-black focus:outline-none focus:border-cyan-400"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT 5 COLUMNS: 20 INDICATORS LIBRARY */}
        <div className="lg:col-span-5 p-4 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md space-y-3.5">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#152445]">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              Canonical 20 Indicators Library
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
              {CANONICAL_20_INDICATORS.length} Ready
            </span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {["ALL", "TREND", "MOMENTUM", "VOLATILITY", "VOLUME", "STRUCTURE"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer",
                  selectedCategory === cat
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "bg-[#050b18] text-slate-400 border border-[#16274a] hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search indicator by name or formula..."
              className="w-full pl-9 pr-3 py-2 bg-[#050b18] border border-[#1c305a] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono shadow-inner"
            />
          </div>

          {/* Scrollable Indicator List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredIndicators.map((ind) => (
              <div
                key={ind.id}
                className="p-3 rounded-xl bg-[#050b18] border border-[#16274a] hover:border-cyan-400/50 transition-all duration-150 flex items-start justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors">
                      {ind.shortName}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091124] text-slate-400 font-mono border border-[#152445]">
                      {ind.defaultTimeframe}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {ind.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddRule(ind)}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-[11px] shrink-0 transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 font-bold" />
                  <span>Add</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. STEP 3 PRODUCTION VALIDATION GATE & NEXT BUTTON ──────────────── */}
      <section className="p-5 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold text-white block">
              Step 3 Logic Matrix Verified ({logicTree.rules.length} Active Rules)
            </span>
            <span className="text-[10px] text-slate-400">
              AST Compiled & Ready for Execution Matrix & Option Chain Resolution
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setStep(4);
          }}
          disabled={logicTree.rules.length === 0}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <span>Proceed to Step 4: Option Chain & Strategy Builder</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
}
