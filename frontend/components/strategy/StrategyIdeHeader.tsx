"use client";

import React from "react";
import {
  Save,
  RotateCcw,
  RotateCw,
  FolderOpen,
  Plus,
  GitBranch,
  Bot,
  ShieldCheck,
  Sparkles,
  Zap,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Copy,
  Sliders,
} from "lucide-react";
import {
  StrategyIdeDefinition,
  StrategyMarketType,
  RuleTimeframe,
  StrategyDirection,
} from "@/types/strategy-ide";

interface StrategyIdeHeaderProps {
  strategy: StrategyIdeDefinition;
  onUpdateStrategy: (fields: Partial<StrategyIdeDefinition>) => void;
  onSaveDraft: () => void;
  isSaving: boolean;
  autosaveTime: string | null;
  onOpenValidate: () => void;
  onOpenCatalog: () => void;
  onOpenVersionsModal: () => void;
  onOpenAssignModal: () => void;
  onNewStrategy: () => void;
  onCloneStrategy: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function StrategyIdeHeader({
  strategy,
  onUpdateStrategy,
  onSaveDraft,
  isSaving,
  autosaveTime,
  onOpenValidate,
  onOpenCatalog,
  onOpenVersionsModal,
  onOpenAssignModal,
  onNewStrategy,
  onCloneStrategy,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: StrategyIdeHeaderProps) {
  const timeframes: RuleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];
  const cryptoSymbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "DOGE/USDT"];
  const equitySymbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "AAPL", "NVDA", "TSLA"];

  const symbols = strategy.market_type === "crypto" ? cryptoSymbols : equitySymbols;

  return (
    <header className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-3 sm:p-4 shadow-2xl space-y-3 font-sans select-none">
      {/* Top Row: Title, Version, Hash, Autosave & Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Strategy Identity */}
        <div className="flex items-center gap-3 min-w-[300px] flex-1">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-950 to-blue-900 text-cyan-400 border border-cyan-700/50 shadow-lg shadow-cyan-950/40">
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="flex-1 max-w-lg">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={strategy.name}
                onChange={(e) => onUpdateStrategy({ name: e.target.value })}
                placeholder="Strategy Name..."
                className="bg-transparent text-sm sm:text-base font-bold text-slate-100 focus:outline-none border-b border-transparent focus:border-cyan-400 transition-all w-full truncate"
              />
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider ${
                  strategy.status === "PUBLISHED" || strategy.status === "APPROVED"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : strategy.status === "VALIDATED"
                    ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                    : "bg-amber-950 text-amber-400 border border-amber-800"
                }`}
              >
                {strategy.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span className="font-mono text-cyan-300 font-semibold">{strategy.active_version || "v1.0.0"}</span>
              <span className="text-slate-600">•</span>
              {strategy.config_hash && (
                <span className="font-mono text-[10px] text-slate-500">#{strategy.config_hash}</span>
              )}
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{autosaveTime ? `Autosaved ${autosaveTime}` : "Ready to simulate"}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center bg-[#070D14] border border-[#1E293B] rounded-lg p-0.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Catalog */}
          <button
            onClick={onOpenCatalog}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111C2E] hover:bg-[#18263E] text-slate-300 border border-slate-700 text-xs font-semibold transition-all shadow-sm"
          >
            <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
            <span>Templates</span>
          </button>

          {/* New / Clone */}
          <button
            onClick={onNewStrategy}
            title="New Strategy"
            className="p-1.5 rounded-lg bg-[#111C2E] hover:bg-[#18263E] text-slate-300 border border-slate-700 transition-all"
          >
            <Plus className="h-3.5 w-3.5 text-slate-300" />
          </button>
          <button
            onClick={onCloneStrategy}
            title="Clone Current Strategy"
            className="p-1.5 rounded-lg bg-[#111C2E] hover:bg-[#18263E] text-slate-300 border border-slate-700 transition-all"
          >
            <Copy className="h-3.5 w-3.5 text-slate-300" />
          </button>

          {/* Versions & Diff */}
          <button
            onClick={onOpenVersionsModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111C2E] hover:bg-[#18263E] text-slate-300 border border-slate-700 text-xs font-semibold transition-all"
          >
            <GitBranch className="h-3.5 w-3.5 text-purple-400" />
            <span>Versions & Diff</span>
          </button>

          {/* Validate */}
          <button
            onClick={onOpenValidate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700 text-xs font-bold transition-all shadow-sm"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Pre-Flight & Score</span>
          </button>

          {/* Save Draft */}
          <button
            onClick={onSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-900/30 transition-all disabled:opacity-50"
          >
            <Save className={`h-3.5 w-3.5 ${isSaving ? "animate-spin" : ""}`} />
            <span>{isSaving ? "Saving..." : "Save Draft"}</span>
          </button>

          {/* Assign / Deploy */}
          <button
            onClick={onOpenAssignModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-900/30 transition-all"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Assign to Bot</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Market Selector, Symbol, Base TF, Direction */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#172234] text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Market Type */}
          <div className="flex items-center gap-1.5 bg-[#070D14] border border-[#1E293B] rounded-lg px-2.5 py-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Asset:</span>
            <select
              value={strategy.market_type}
              onChange={(e) => onUpdateStrategy({ market_type: e.target.value as StrategyMarketType })}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value="crypto" className="bg-[#0B131E]">Crypto</option>
              <option value="equity" className="bg-[#0B131E]">Equity / Stock</option>
              <option value="futures" className="bg-[#0B131E]">Futures</option>
              <option value="options" className="bg-[#0B131E]">Options</option>
            </select>
          </div>

          {/* Symbol */}
          <div className="flex items-center gap-1.5 bg-[#070D14] border border-[#1E293B] rounded-lg px-2.5 py-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Symbol:</span>
            <select
              value={strategy.symbol}
              onChange={(e) => onUpdateStrategy({ symbol: e.target.value })}
              className="bg-transparent text-cyan-300 font-mono font-bold focus:outline-none cursor-pointer text-xs"
            >
              {symbols.map((s) => (
                <option key={s} value={s} className="bg-[#0B131E]">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Base Timeframe */}
          <div className="flex items-center gap-1 bg-[#070D14] border border-[#1E293B] rounded-lg p-0.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2">Base TF:</span>
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => onUpdateStrategy({ base_timeframe: tf })}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                  strategy.base_timeframe === tf
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#111C2E]"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Direction */}
          <div className="flex items-center gap-1 bg-[#070D14] border border-[#1E293B] rounded-lg p-0.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2">Bias:</span>
            {(["LONG", "SHORT", "BOTH"] as StrategyDirection[]).map((dir) => (
              <button
                key={dir}
                onClick={() => onUpdateStrategy({ direction: dir })}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                  strategy.direction === dir
                    ? dir === "LONG"
                      ? "bg-emerald-600 text-white"
                      : dir === "SHORT"
                      ? "bg-rose-600 text-white"
                      : "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {dir}
              </button>
            ))}
          </div>
        </div>

        {/* Live Closed Candle Rule indicator */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Zero Lookahead Bias (Strict Closed Bar Enforcement)</span>
        </div>
      </div>
    </header>
  );
}
