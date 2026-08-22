"use client";

import React from "react";
import {
  Save,
  Play,
  RotateCcw,
  RotateCw,
  FolderOpen,
  Plus,
  Copy,
  Bot,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  BarChart2,
  Sparkles,
} from "lucide-react";
import { FullVisualStrategy, StrategyDirection, RuleTimeframe } from "@/types/strategy-builder";

interface StrategyTopBarProps {
  strategy: FullVisualStrategy;
  onUpdateStrategy: (fields: Partial<FullVisualStrategy>) => void;
  onSave: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  onTestLive: () => void;
  isTesting: boolean;
  onOpenBacktest: () => void;
  onOpenPaperTest: () => void;
  onOpenCatalog: () => void;
  onOpenAssignBot: () => void;
  onNewStrategy: () => void;
  onDuplicateStrategy: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  autosaveTime: string | null;
}

export function StrategyTopBar({
  strategy,
  onUpdateStrategy,
  onSave,
  isSaving,
  saveSuccess,
  onTestLive,
  isTesting,
  onOpenBacktest,
  onOpenPaperTest,
  onOpenCatalog,
  onOpenAssignBot,
  onNewStrategy,
  onDuplicateStrategy,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  autosaveTime,
}: StrategyTopBarProps) {
  const timeframes: RuleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"];
  const directions: StrategyDirection[] = ["LONG", "SHORT", "BOTH", "OPTIONS_MULTI_LEG", "FUTURES"];

  return (
    <div className="bg-[#0D1914] border border-[#294238] rounded-2xl p-4 shadow-xl space-y-3 font-sans select-none">
      {/* Top Row: Title, Status, Undo/Redo, Autosave & Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Strategy Name & Status Pill */}
        <div className="flex items-center gap-3 min-w-[280px] flex-1">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-[#123C2A] to-[#2E7D5B] text-[#55C98A] border border-[#39B978]/40 shadow-lg shadow-[#2E7D5B]/20">
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="flex-1 max-w-md">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={strategy.name}
                onChange={(e) => onUpdateStrategy({ name: e.target.value })}
                placeholder="Strategy Name..."
                className="bg-transparent text-base font-bold text-[#E8F3EC] focus:outline-none border-b border-transparent focus:border-[#55C98A] transition-all w-full truncate"
              />
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider ${
                  strategy.status === "Published"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : strategy.status === "Saved"
                    ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                    : "bg-amber-950 text-amber-400 border border-amber-800"
                }`}
              >
                {strategy.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#A8BDB0]">
              <span>{autosaveTime ? `Autosaved ${autosaveTime}` : "Autosave ready"}</span>
              <span className="text-[#3E5C4E]">•</span>
              <span>ID: {strategy.id || "NEW"}</span>
            </div>
          </div>
        </div>

        {/* Undo / Redo & Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#07110D] p-1 rounded-xl border border-[#1B3328]">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className={`p-1.5 rounded-lg transition-colors ${
                canUndo ? "text-[#A8BDB0] hover:text-[#E8F3EC] hover:bg-[#123C2A]" : "text-[#3E5C4E] cursor-not-allowed"
              }`}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className={`p-1.5 rounded-lg transition-colors ${
                canRedo ? "text-[#A8BDB0] hover:text-[#E8F3EC] hover:bg-[#123C2A]" : "text-[#3E5C4E] cursor-not-allowed"
              }`}
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>

          {/* Simple vs Advanced Mode */}
          <div className="flex items-center bg-[#07110D] p-1 rounded-xl border border-[#1B3328] text-xs">
            <button
              onClick={() => onUpdateStrategy({ mode: "simple" })}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                strategy.mode === "simple"
                  ? "bg-[#2E7D5B] text-white shadow-sm"
                  : "text-[#A8BDB0] hover:text-[#E8F3EC]"
              }`}
            >
              Simple
            </button>
            <button
              onClick={() => onUpdateStrategy({ mode: "advanced" })}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                strategy.mode === "advanced"
                  ? "bg-[#2E7D5B] text-white shadow-sm"
                  : "text-[#A8BDB0] hover:text-[#E8F3EC]"
              }`}
            >
              Advanced
            </button>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenCatalog}
            className="px-3 py-1.5 rounded-xl bg-[#07110D] hover:bg-[#123C2A] border border-[#1B3328] text-[#A8BDB0] hover:text-[#E8F3EC] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <FolderOpen className="h-3.5 w-3.5 text-cyan-400" />
            <span>Catalog</span>
          </button>

          <button
            onClick={onNewStrategy}
            className="px-3 py-1.5 rounded-xl bg-[#07110D] hover:bg-[#123C2A] border border-[#1B3328] text-[#A8BDB0] hover:text-[#E8F3EC] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Create clean new strategy"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>

          <button
            onClick={onDuplicateStrategy}
            className="px-3 py-1.5 rounded-xl bg-[#07110D] hover:bg-[#123C2A] border border-[#1B3328] text-[#A8BDB0] hover:text-[#E8F3EC] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Duplicate strategy into new record"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Clone</span>
          </button>

          <button
            onClick={onTestLive}
            disabled={isTesting}
            className="px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{isTesting ? "Evaluating..." : "Test Live"}</span>
          </button>

          <button
            onClick={onOpenBacktest}
            className="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Backtest</span>
          </button>

          <button
            onClick={onOpenPaperTest}
            className="px-3 py-1.5 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800 text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            <span>Paper Test</span>
          </button>

          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
          >
            {saveSuccess ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            <span>{saveSuccess ? "Saved!" : isSaving ? "Saving..." : "Save"}</span>
          </button>

          <button
            onClick={onOpenAssignBot}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 transition-all"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Assign to Bot</span>
          </button>
        </div>
      </div>

      {/* Second Row: Configuration Meta (Asset Class, Symbol, Base Timeframe, Direction) */}
      <div className="pt-2 border-t border-[#1B3328] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Asset Market Class */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#A8BDB0] font-medium">Market:</span>
            <select
              value={strategy.market_type}
              onChange={(e) => onUpdateStrategy({ market_type: e.target.value as any })}
              className="bg-[#07110D] border border-[#1B3328] rounded-lg px-2 py-1 text-xs text-[#E8F3EC] font-semibold focus:outline-none focus:border-[#55C98A]"
            >
              <option value="crypto">Crypto Spot / Perp</option>
              <option value="equity">Indian Equities (NSE)</option>
              <option value="futures">Futures Contracts</option>
              <option value="options">Options Derivatives</option>
              <option value="forex">Forex Majors</option>
              <option value="commodity">Commodities (MCX)</option>
            </select>
          </div>

          {/* Primary Symbol */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#A8BDB0] font-medium">Symbol:</span>
            <input
              type="text"
              value={strategy.symbol}
              onChange={(e) => onUpdateStrategy({ symbol: e.target.value.toUpperCase() })}
              className="w-28 bg-[#07110D] border border-[#1B3328] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#55C98A] focus:outline-none focus:border-[#55C98A]"
            />
          </div>

          {/* Primary Base Timeframe */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#A8BDB0] font-medium">Timeframe:</span>
            <div className="flex items-center bg-[#07110D] p-0.5 rounded-lg border border-[#1B3328]">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => onUpdateStrategy({ timeframe: tf })}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                    strategy.timeframe === tf
                      ? "bg-[#2E7D5B] text-white"
                      : "text-[#70877A] hover:text-[#E8F3EC]"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Direction Mode Badges */}
        <div className="flex items-center gap-1.5">
          <span className="text-[#A8BDB0] font-medium">Strategy Type:</span>
          <div className="flex items-center bg-[#07110D] p-0.5 rounded-lg border border-[#1B3328]">
            {directions.map((d) => (
              <button
                key={d}
                onClick={() => onUpdateStrategy({ direction: d })}
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                  strategy.direction === d
                    ? d === "LONG"
                      ? "bg-emerald-600 text-white"
                      : d === "SHORT"
                      ? "bg-red-600 text-white"
                      : d === "OPTIONS_MULTI_LEG"
                      ? "bg-purple-600 text-white"
                      : d === "FUTURES"
                      ? "bg-amber-600 text-white"
                      : "bg-blue-600 text-white"
                    : "text-[#70877A] hover:text-[#E8F3EC]"
                }`}
              >
                {d.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
