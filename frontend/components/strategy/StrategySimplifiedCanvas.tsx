"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Save,
  Play,
  Bot,
  FolderOpen,
  Undo2,
  Redo2,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Shield,
  TrendingUp,
  Activity,
  Zap,
  Sliders,
  DollarSign,
  Percent,
  Layers,
  Coins,
  Building2,
  Globe,
  Radio,
  Eye,
  ArrowRight,
  Lock,
} from "lucide-react";
import {
  StrategyIdeDefinition,
  StrategyIdeRule,
  RuleTimeframe,
  StrategyMarketType,
  StrategyDirection,
  PositionSizingMethod,
} from "@/types/strategy-ide";
import { RuleTargetStage } from "./StrategyBuildLibrary";

interface StrategySimplifiedCanvasProps {
  strategy: StrategyIdeDefinition;
  onUpdateStrategy: (fields: Partial<StrategyIdeDefinition>) => void;
  onSaveDraft: () => void;
  isSaving: boolean;
  autosaveTime: string | null;
  onOpenBacktest: () => void;
  isBacktesting: boolean;
  onOpenForwardTest: () => void;
  onOpenCatalog: () => void;
  onOpenAssignBot: () => void;
  onOpenReview: () => void;
  onOpenWhyNoTrade: () => void;
  onOpenFullReport: () => void;
  onAddRuleClick: (stage: RuleTargetStage) => void;
  onEditRuleClick: (stage: RuleTargetStage, rule: StrategyIdeRule) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const ASSET_CLASSES: { id: StrategyMarketType; label: string; icon: any }[] = [
  { id: "crypto", label: "Crypto", icon: Coins },
  { id: "equity", label: "Stocks", icon: Building2 },
  { id: "futures", label: "Futures", icon: Activity },
  { id: "options", label: "Options", icon: Layers },
  { id: "commodity", label: "Commodities", icon: Globe },
  { id: "forex", label: "Forex", icon: DollarSign },
];

const TIMEFRAMES: RuleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];

const BROKERS = [
  { id: "Delta", label: "Delta Exchange", dataProvider: "Delta" },
  { id: "Dhan", label: "Dhan Multi-Broker", dataProvider: "Dhan" },
  { id: "Upstox", label: "Upstox V2", dataProvider: "Upstox" },
  { id: "Paper", label: "Paper Engine", dataProvider: "Binance" },
];

export function StrategySimplifiedCanvas({
  strategy,
  onUpdateStrategy,
  onSaveDraft,
  isSaving,
  autosaveTime,
  onOpenBacktest,
  isBacktesting,
  onOpenForwardTest,
  onOpenCatalog,
  onOpenAssignBot,
  onOpenReview,
  onOpenWhyNoTrade,
  onOpenFullReport,
  onAddRuleClick,
  onEditRuleClick,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: StrategySimplifiedCanvasProps) {
  // Collapsible Advanced Settings toggles
  const [showAdvancedSetup, setShowAdvancedSetup] = useState(false);
  const [showAdvancedConfirm, setShowAdvancedConfirm] = useState(false);
  const [showAdvancedEntry, setShowAdvancedEntry] = useState(false);
  const [showAdvancedRisk, setShowAdvancedRisk] = useState(false);

  // Active rules
  const setupRules = strategy.entry?.setup?.rules || [];
  const confirmRules = strategy.entry?.confirmation?.rules || [];
  const triggerRules = strategy.entry?.trigger?.rules || [];

  const isReady =
    setupRules.length > 0 &&
    triggerRules.length > 0 &&
    (strategy.exit?.stop_loss_value || 0) > 0;

  // Rule Deletion
  const handleDeleteRule = (stage: RuleTargetStage, id: string) => {
    const stageKey = stage === "setup" ? "setup" : stage === "confirmation" ? "confirmation" : "trigger";
    const currentRules = strategy.entry[stageKey]?.rules || [];
    const updated = currentRules.filter((r) => r.id !== id);
    onUpdateStrategy({
      entry: {
        ...strategy.entry,
        [stageKey]: {
          ...strategy.entry[stageKey],
          rules: updated,
        },
      },
    });
  };

  // Rule Toggle Enable/Disable
  const handleToggleRule = (stage: RuleTargetStage, id: string) => {
    const stageKey = stage === "setup" ? "setup" : stage === "confirmation" ? "confirmation" : "trigger";
    const currentRules = strategy.entry[stageKey]?.rules || [];
    const updated = currentRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    onUpdateStrategy({
      entry: {
        ...strategy.entry,
        [stageKey]: {
          ...strategy.entry[stageKey],
          rules: updated,
        },
      },
    });
  };

  return (
    <div className="space-y-3.5 font-sans text-slate-200 text-xs select-none">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR: Strategy Name, Status, Market, Symbol, Broker, Timeframe */}
      {/* ========================================================================= */}
      <div className="p-3.5 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-xl space-y-3">
        {/* Top Row: Title, Status, Paper Badge, Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-[280px] flex-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600/20 to-cyan-500/30 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 max-w-md min-w-0">
              <input
                type="text"
                value={strategy.name}
                onChange={(e) => onUpdateStrategy({ name: e.target.value })}
                placeholder="Strategy Name..."
                className="bg-transparent text-sm sm:text-base font-bold text-white focus:outline-none border-b border-transparent focus:border-cyan-500 transition w-full truncate font-mono"
              />
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                <span className="text-cyan-400 font-bold">{strategy.active_version || "v1.0.0"}</span>
                <span>•</span>
                <span>{autosaveTime ? `Autosaved ${autosaveTime}` : "Autosave ready"}</span>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-1.5 font-mono">
            {/* Undo / Redo */}
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 rounded-lg bg-[#06101B] border border-[#12304A] text-slate-400 hover:text-white disabled:opacity-40 transition"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 rounded-lg bg-[#06101B] border border-[#12304A] text-slate-400 hover:text-white disabled:opacity-40 transition"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            {/* Catalog Templates */}
            <button
              type="button"
              onClick={onOpenCatalog}
              className="px-2.5 py-1.5 rounded-xl bg-[#06101B] hover:bg-[#0C1727] text-slate-300 border border-[#12304A] transition flex items-center gap-1 text-[11px] font-bold"
            >
              <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Templates</span>
            </button>

            {/* Backtest */}
            <button
              type="button"
              onClick={onOpenBacktest}
              disabled={isBacktesting}
              className="px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 transition flex items-center gap-1 text-[11px] font-bold shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isBacktesting ? "Testing..." : "Backtest"}</span>
            </button>

            {/* Review Strategy */}
            <button
              type="button"
              onClick={onOpenReview}
              className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 transition flex items-center gap-1 text-[11px] font-bold shadow-sm"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>Review</span>
            </button>

            {/* Save */}
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition flex items-center gap-1 text-[11px] shadow-md shadow-cyan-500/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save"}</span>
            </button>
          </div>
        </div>

        {/* Configuration Row: Market, Symbol, Broker, Timeframe, Direction, Paper Mode */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2.5 border-t border-[#12304A] font-mono text-[11px]">
          {/* Market */}
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-0.5">Market</label>
            <select
              value={strategy.market_type || "crypto"}
              onChange={(e) => onUpdateStrategy({ market_type: e.target.value as any })}
              className="w-full bg-[#06101B] border border-[#12304A] focus:border-cyan-500 rounded-lg p-1.5 text-white font-bold outline-none"
            >
              {ASSET_CLASSES.map((ac) => (
                <option key={ac.id} value={ac.id}>
                  {ac.label}
                </option>
              ))}
            </select>
          </div>

          {/* Symbol */}
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-0.5">Symbol</label>
            <input
              type="text"
              value={strategy.symbol || "BTC/USDT"}
              onChange={(e) => onUpdateStrategy({ symbol: e.target.value.toUpperCase() })}
              placeholder="e.g. BTC/USDT, NIFTY"
              className="w-full bg-[#06101B] border border-[#12304A] focus:border-cyan-500 rounded-lg p-1.5 text-cyan-300 font-bold outline-none"
            />
          </div>

          {/* Broker */}
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-0.5">Broker Gateway</label>
            <select
              value={strategy.broker_config?.execution_broker || "Delta"}
              onChange={(e) =>
                onUpdateStrategy({
                  broker_config: {
                    ...strategy.broker_config,
                    execution_broker: e.target.value as any,
                    data_provider: (e.target.value === "Paper" ? "Binance" : e.target.value) as any,
                    mode: "PAPER",
                  },
                })
              }
              className="w-full bg-[#06101B] border border-[#12304A] focus:border-cyan-500 rounded-lg p-1.5 text-white font-bold outline-none"
            >
              {BROKERS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe */}
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-0.5">Base Timeframe</label>
            <select
              value={strategy.base_timeframe || "15m"}
              onChange={(e) => onUpdateStrategy({ base_timeframe: e.target.value as any })}
              className="w-full bg-[#06101B] border border-[#12304A] focus:border-cyan-500 rounded-lg p-1.5 text-white font-bold outline-none"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>
                  {tf}
                </option>
              ))}
            </select>
          </div>

          {/* Direction */}
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-0.5">Trade Direction</label>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => onUpdateStrategy({ direction: "LONG" })}
                className={`py-1 rounded font-bold text-center text-[10px] transition ${
                  strategy.direction === "LONG"
                    ? "bg-emerald-500 text-slate-950 font-extrabold shadow-sm"
                    : "bg-[#06101B] text-slate-400 border border-[#12304A] hover:text-white"
                }`}
              >
                LONG
              </button>
              <button
                type="button"
                onClick={() => onUpdateStrategy({ direction: "SHORT" })}
                className={`py-1 rounded font-bold text-center text-[10px] transition ${
                  strategy.direction === "SHORT"
                    ? "bg-rose-500 text-slate-950 font-extrabold shadow-sm"
                    : "bg-[#06101B] text-slate-400 border border-[#12304A] hover:text-white"
                }`}
              >
                SHORT
              </button>
            </div>
          </div>

          {/* Safety Mode Badge */}
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-0.5">Execution Guard</label>
            <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-between text-[10px]">
              <span className="text-cyan-300 font-bold flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400" />
                <span>PAPER MODE</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LIVE SIGNAL & TELEMETRY STRIP */}
      {/* ========================================================================= */}
      <div className="p-3 bg-[#0C1727] border border-[#12304A] rounded-xl flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <strong className="text-white text-xs">LIVE SIGNAL:</strong>
            <span className="text-cyan-300 font-bold">{strategy.symbol}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-300 bg-[#06101B] px-2.5 py-1 rounded-lg border border-[#12304A]">
            <span className="text-emerald-400 font-bold">
              {isReady ? "ENTRY READY" : "SCANNING REGIME"}
            </span>
            <span>•</span>
            <span>EMA 200: <strong className="text-white">64,120</strong></span>
            <span>•</span>
            <span>RSI: <strong className="text-cyan-300">58.4</strong></span>
            <span>•</span>
            <span>EMA 9/21: <strong className="text-emerald-400">Bullish</strong></span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenWhyNoTrade}
          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-cyan-500 transition flex items-center gap-1.5 text-[11px] font-bold shadow-sm"
        >
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>Why No Trade?</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. CORE STRATEGY STRUCTURE (Single Focused Column) */}
      {/* ========================================================================= */}
      <div className="space-y-3 font-mono">
        {/* ======================= STAGE 1: SETUP ======================= */}
        <div className="p-4 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <h4 className="font-bold text-sm text-white">SETUP</h4>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                When market conditions are...
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedSetup(!showAdvancedSetup)}
              className="text-[10px] text-slate-400 hover:text-cyan-300 transition flex items-center gap-1"
            >
              <span>Advanced</span>
              {showAdvancedSetup ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Advanced Conjunction Row */}
          {showAdvancedSetup && (
            <div className="p-2 bg-[#06101B] rounded-xl border border-[#12304A] flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Multi-Condition Logic:</span>
              <div className="flex items-center gap-1">
                {(["AND", "OR"] as const).map((conj) => (
                  <button
                    key={conj}
                    type="button"
                    onClick={() =>
                      onUpdateStrategy({
                        entry: {
                          ...strategy.entry,
                          setup: {
                            ...strategy.entry?.setup,
                            conjunction: conj,
                            rules: setupRules,
                          },
                        },
                      })
                    }
                    className={`px-2 py-0.5 rounded font-bold border transition ${
                      (strategy.entry?.setup?.conjunction || "AND") === conj
                        ? "bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold"
                        : "bg-[#0A1422] text-slate-400 border-[#12304A] hover:text-white"
                    }`}
                  >
                    {conj}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rules List */}
          <div className="space-y-2">
            {setupRules.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[#12304A] bg-[#06101B]/50 text-center text-slate-500 text-xs">
                No setup conditions added yet. Define background market regime (e.g. Price &gt; EMA 200).
              </div>
            ) : (
              setupRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                    rule.enabled
                      ? "bg-[#06101B] border-[#12304A] hover:border-cyan-500/50"
                      : "bg-[#06101B]/40 border-slate-900 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRule("setup", rule.id)}
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold transition ${
                        rule.enabled ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-500"
                      }`}
                      title={rule.enabled ? "Rule is active" : "Rule is disabled"}
                    >
                      ✓
                    </button>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs truncate flex items-center gap-2">
                        <span className="text-cyan-300">[{rule.timeframe.toUpperCase()}]</span>
                        <span>{rule.left}</span>
                        <span className="text-slate-400 font-normal">{rule.op}</span>
                        <span className="text-amber-300">{rule.right}</span>
                      </div>
                      {rule.description && (
                        <p className="text-[10px] text-slate-500 font-sans truncate">{rule.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditRuleClick("setup", rule)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-[#12304A] transition"
                      title="Edit rule parameters"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule("setup", rule.id)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-[#12304A] hover:border-rose-500/40 transition"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* + Add Condition Button */}
            <button
              type="button"
              onClick={() => onAddRuleClick("setup")}
              className="w-full py-2.5 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-300 font-bold transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Condition</span>
            </button>
          </div>
        </div>

        {/* ======================= STAGE 2: CONFIRM ======================= */}
        <div className="p-4 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <h4 className="font-bold text-sm text-white">CONFIRM</h4>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Confirm with secondary momentum / volume filters...
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedConfirm(!showAdvancedConfirm)}
              className="text-[10px] text-slate-400 hover:text-cyan-300 transition flex items-center gap-1"
            >
              <span>Advanced</span>
              {showAdvancedConfirm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Advanced Conjunction Row */}
          {showAdvancedConfirm && (
            <div className="p-2 bg-[#06101B] rounded-xl border border-[#12304A] flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Confirmation Logic:</span>
              <div className="flex items-center gap-1">
                {(["AND", "OR"] as const).map((conj) => (
                  <button
                    key={conj}
                    type="button"
                    onClick={() =>
                      onUpdateStrategy({
                        entry: {
                          ...strategy.entry,
                          confirmation: {
                            ...strategy.entry?.confirmation,
                            conjunction: conj,
                            rules: confirmRules,
                          },
                        },
                      })
                    }
                    className={`px-2 py-0.5 rounded font-bold border transition ${
                      (strategy.entry?.confirmation?.conjunction || "AND") === conj
                        ? "bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold"
                        : "bg-[#0A1422] text-slate-400 border-[#12304A] hover:text-white"
                    }`}
                  >
                    {conj}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rules List */}
          <div className="space-y-2">
            {confirmRules.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-[#12304A] bg-[#06101B]/50 text-center text-slate-500 text-xs">
                No confirmation indicators added (optional filter).
              </div>
            ) : (
              confirmRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                    rule.enabled
                      ? "bg-[#06101B] border-[#12304A] hover:border-cyan-500/50"
                      : "bg-[#06101B]/40 border-slate-900 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRule("confirmation", rule.id)}
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold transition ${
                        rule.enabled ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      ✓
                    </button>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs truncate flex items-center gap-2">
                        <span className="text-cyan-300">[{rule.timeframe.toUpperCase()}]</span>
                        <span>{rule.left}</span>
                        <span className="text-slate-400 font-normal">{rule.op}</span>
                        <span className="text-amber-300">{rule.right}</span>
                      </div>
                      {rule.description && (
                        <p className="text-[10px] text-slate-500 font-sans truncate">{rule.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditRuleClick("confirmation", rule)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-[#12304A] transition"
                      title="Edit rule parameters"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule("confirmation", rule.id)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-[#12304A] hover:border-rose-500/40 transition"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* + Add Indicator Button */}
            <button
              type="button"
              onClick={() => onAddRuleClick("confirmation")}
              className="w-full py-2.5 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-300 font-bold transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Indicator</span>
            </button>
          </div>
        </div>

        {/* ======================= STAGE 3: ENTRY ======================= */}
        <div className="p-4 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <h4 className="font-bold text-sm text-white">ENTRY</h4>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Enter when specific trigger event occurs...
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Timing selector */}
              <div className="flex items-center gap-1 bg-[#06101B] border border-[#12304A] rounded-lg px-2 py-1 text-[10px]">
                <Clock className="w-3 h-3 text-cyan-400" />
                <select
                  value={strategy.execution_filters?.execution_timing || "CLOSED_BAR"}
                  onChange={(e) =>
                    onUpdateStrategy({
                      execution_filters: {
                        ...strategy.execution_filters,
                        execution_timing: e.target.value as any,
                      },
                    })
                  }
                  className="bg-transparent text-slate-300 font-bold outline-none cursor-pointer"
                >
                  <option value="CLOSED_BAR">Closed Bar</option>
                  <option value="REALTIME_TICK">Real-time Tick</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvancedEntry(!showAdvancedEntry)}
                className="text-[10px] text-slate-400 hover:text-cyan-300 transition flex items-center gap-1"
              >
                <span>Advanced</span>
                {showAdvancedEntry ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-2">
            {triggerRules.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-rose-500/30 bg-rose-950/20 text-center text-rose-300 text-xs">
                Missing entry trigger. Add an execution trigger (e.g. EMA 9 crosses above EMA 21).
              </div>
            ) : (
              triggerRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                    rule.enabled
                      ? "bg-[#06101B] border-[#12304A] hover:border-cyan-500/50"
                      : "bg-[#06101B]/40 border-slate-900 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRule("trigger", rule.id)}
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold transition ${
                        rule.enabled ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      ✓
                    </button>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs truncate flex items-center gap-2">
                        <span className="text-cyan-300">[{rule.timeframe.toUpperCase()}]</span>
                        <span>{rule.left}</span>
                        <span className="text-cyan-400 font-extrabold">{rule.op}</span>
                        <span className="text-amber-300">{rule.right}</span>
                      </div>
                      {rule.description && (
                        <p className="text-[10px] text-slate-500 font-sans truncate">{rule.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditRuleClick("trigger", rule)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-[#12304A] transition"
                      title="Edit rule parameters"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule("trigger", rule.id)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-[#12304A] hover:border-rose-500/40 transition"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* + Add Trigger Button */}
            <button
              type="button"
              onClick={() => onAddRuleClick("trigger")}
              className="w-full py-2.5 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-300 font-bold transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Trigger</span>
            </button>
          </div>
        </div>

        {/* ======================= STAGE 4: RISK ======================= */}
        <div className="p-4 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold text-xs">
                  4
                </span>
                <h4 className="font-bold text-sm text-white">RISK & POSITION SIZING</h4>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Capital allocation, stop loss, and target boundaries...
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedRisk(!showAdvancedRisk)}
              className="text-[10px] text-slate-400 hover:text-cyan-300 transition flex items-center gap-1"
            >
              <span>Advanced Risk</span>
              {showAdvancedRisk ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Simple 4-Card Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Risk per trade */}
            <div className="p-3 bg-[#06101B] border border-[#12304A] rounded-xl space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase block">Risk Per Trade</span>
              <div className="flex items-center gap-1">
                {[0.5, 1.0, 2.0].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() =>
                      onUpdateStrategy({
                        risk: { ...strategy.risk, risk_per_trade_pct: val },
                        position_sizing: { ...strategy.position_sizing, value: val },
                      })
                    }
                    className={`flex-1 py-1 rounded text-[10px] font-bold border transition ${
                      (strategy.risk?.risk_per_trade_pct || 1.0) === val
                        ? "bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-sm"
                        : "bg-[#0A1422] text-slate-400 border-[#12304A] hover:text-white"
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            {/* Stop Loss */}
            <div className="p-3 bg-[#06101B] border border-[#12304A] rounded-xl space-y-1">
              <span className="text-[10px] text-slate-500 uppercase block">Stop Loss</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  value={strategy.exit?.stop_loss_value || 1.0}
                  onChange={(e) =>
                    onUpdateStrategy({
                      exit: { ...strategy.exit, stop_loss_value: parseFloat(e.target.value) || 1.0 },
                    })
                  }
                  className="w-full bg-[#0A1422] border border-[#12304A] focus:border-rose-500 rounded-lg p-1 text-rose-300 font-bold text-xs outline-none"
                />
                <span className="text-slate-400 text-xs font-bold">%</span>
              </div>
            </div>

            {/* Target / Take Profit */}
            <div className="p-3 bg-[#06101B] border border-[#12304A] rounded-xl space-y-1">
              <span className="text-[10px] text-slate-500 uppercase block">Take Profit Target</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  value={strategy.exit?.take_profit_value || 2.0}
                  onChange={(e) =>
                    onUpdateStrategy({
                      exit: { ...strategy.exit, take_profit_value: parseFloat(e.target.value) || 2.0 },
                    })
                  }
                  className="w-full bg-[#0A1422] border border-[#12304A] focus:border-emerald-500 rounded-lg p-1 text-emerald-300 font-bold text-xs outline-none"
                />
                <span className="text-slate-400 text-xs font-bold">%</span>
              </div>
            </div>

            {/* Position Size Model */}
            <div className="p-3 bg-[#06101B] border border-[#12304A] rounded-xl space-y-1">
              <span className="text-[10px] text-slate-500 uppercase block">Position Sizing</span>
              <select
                value={strategy.position_sizing?.method || "PCT_RISK_PER_TRADE"}
                onChange={(e) =>
                  onUpdateStrategy({
                    position_sizing: {
                      ...strategy.position_sizing,
                      method: e.target.value as PositionSizingMethod,
                    },
                  })
                }
                className="w-full bg-[#0A1422] border border-[#12304A] focus:border-cyan-500 rounded-lg p-1 text-cyan-300 font-bold text-[11px] outline-none"
              >
                <option value="PCT_RISK_PER_TRADE">Auto (Risk-based)</option>
                <option value="PCT_CAPITAL">% of Capital</option>
                <option value="FIXED_CAPITAL">Fixed Capital ($)</option>
              </select>
            </div>
          </div>

          {/* Collapsible Advanced Risk Controls */}
          {showAdvancedRisk && (
            <div className="p-3.5 bg-[#06101B] rounded-xl border border-[#12304A] grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <label className="text-[9px] text-slate-500 uppercase block mb-1">Max Daily Loss ($)</label>
                <input
                  type="number"
                  value={strategy.risk?.max_daily_loss || 500}
                  onChange={(e) =>
                    onUpdateStrategy({
                      risk: { ...strategy.risk, max_daily_loss: parseFloat(e.target.value) || 500 },
                    })
                  }
                  className="w-full bg-[#0A1422] border border-[#12304A] focus:border-cyan-500 rounded-lg p-1.5 text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] text-slate-500 uppercase block mb-1">Max Drawdown (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={strategy.risk?.max_drawdown_pct || 5.0}
                  onChange={(e) =>
                    onUpdateStrategy({
                      risk: { ...strategy.risk, max_drawdown_pct: parseFloat(e.target.value) || 5.0 },
                    })
                  }
                  className="w-full bg-[#0A1422] border border-[#12304A] focus:border-cyan-500 rounded-lg p-1.5 text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] text-slate-500 uppercase block mb-1">Cooldown Bars</label>
                <input
                  type="number"
                  value={strategy.risk?.cooldown_bars || 3}
                  onChange={(e) =>
                    onUpdateStrategy({
                      risk: { ...strategy.risk, cooldown_bars: parseInt(e.target.value) || 3 },
                    })
                  }
                  className="w-full bg-[#0A1422] border border-[#12304A] focus:border-cyan-500 rounded-lg p-1.5 text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] text-slate-500 uppercase block mb-1">Leverage (x)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  value={strategy.risk?.leverage || 1}
                  onChange={(e) =>
                    onUpdateStrategy({
                      risk: { ...strategy.risk, leverage: parseFloat(e.target.value) || 1 },
                    })
                  }
                  className="w-full bg-[#0A1422] border border-[#12304A] focus:border-cyan-500 rounded-lg p-1.5 text-white font-bold outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. STRATEGY STATUS & ACTION FOOTER */}
      {/* ========================================================================= */}
      <div className="p-4 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isReady ? "bg-emerald-400 shadow-lg shadow-emerald-400/50" : "bg-amber-400 animate-pulse"
              }`}
            />
            <div>
              <span className={`font-bold text-xs ${isReady ? "text-emerald-400" : "text-amber-400"}`}>
                {isReady ? "● STRATEGY READY" : "● INCOMPLETE SETUP"}
              </span>
              <div className="text-[10px] text-slate-400">
                Setup: <strong className="text-white">{setupRules.length}</strong> • Confirm:{" "}
                <strong className="text-white">{confirmRules.length}</strong> • Entry:{" "}
                <strong className="text-white">{triggerRules.length}</strong> • Risk:{" "}
                <strong className="text-white">{strategy.risk?.risk_per_trade_pct || 1.0}%</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenWhyNoTrade}
            className="px-3 py-2 rounded-xl bg-[#06101B] hover:bg-[#0C1727] text-slate-300 border border-[#12304A] transition flex items-center gap-1.5 text-xs font-bold"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Why No Trade?</span>
          </button>

          <button
            type="button"
            onClick={onOpenFullReport}
            className="px-3 py-2 rounded-xl bg-[#06101B] hover:bg-[#0C1727] text-slate-300 border border-[#12304A] transition flex items-center gap-1.5 text-xs font-bold"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>View Details</span>
          </button>

          <button
            type="button"
            onClick={onOpenReview}
            className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 transition flex items-center gap-1.5 text-xs font-bold shadow-sm"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Review Strategy</span>
          </button>

          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition flex items-center gap-1.5 text-xs shadow-md shadow-cyan-500/20"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
