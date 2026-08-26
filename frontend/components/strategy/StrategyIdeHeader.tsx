"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Save,
  Play,
  Bot,
  MoreVertical,
  Layers,
  Copy,
  GitBranch,
  Download,
  Trash2,
  Undo2,
  Redo2,
  ChevronDown,
  Search,
  Check,
  Building2,
  Coins,
  TrendingUp,
  Activity,
  Globe,
  DollarSign,
  Briefcase,
  AlertCircle,
  RefreshCw,
  Sparkles,
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
  onOpenTest: () => void;
  isTesting: boolean;
  onOpenCatalog: () => void;
  onOpenVersionsModal: () => void;
  onOpenDiffModal?: () => void;
  onOpenAssignModal: () => void;
  onNewStrategy: () => void;
  onCloneStrategy: () => void;
  onDeleteStrategy?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  interfaceMode?: "SIMPLE" | "ADVANCED";
  onToggleInterfaceMode?: () => void;
}

const ASSET_CLASSES: { id: StrategyMarketType; label: string; icon: any }[] = [
  { id: "crypto", label: "Crypto", icon: Coins },
  { id: "equity", label: "Stocks", icon: Building2 },
  { id: "futures", label: "Futures", icon: Activity },
  { id: "options", label: "Options", icon: Layers },
  { id: "commodity", label: "Commodities", icon: Globe },
  { id: "forex", label: "Forex", icon: DollarSign },
];

const POPULAR_SYMBOLS: Record<StrategyMarketType, string[]> = {
  crypto: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "DOGE/USDT", "PEPE/USDT"],
  equity: ["RELIANCE", "TCS", "HDFCBANK", "INFY", "AAPL", "MSFT", "NVDA", "TSLA"],
  futures: ["BTC-PERP", "ETH-PERP", "SOL-PERP", "NIFTY-FUT", "BANKNIFTY-FUT", "ES-FUT"],
  options: ["NIFTY", "BANKNIFTY", "FINNIFTY", "BTC-OPTIONS", "ETH-OPTIONS"],
  commodity: ["GOLD", "SILVER", "CRUDEOIL", "NATURALGAS"],
  forex: ["EUR/USD", "GBP/USD", "USD/JPY", "USD/INR"],
};

const COMMON_TIMEFRAMES: RuleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];
const MORE_TIMEFRAMES: RuleTimeframe[] = ["1w"];

export function StrategyIdeHeader({
  strategy,
  onUpdateStrategy,
  onSaveDraft,
  isSaving,
  autosaveTime,
  onOpenTest,
  isTesting,
  onOpenCatalog,
  onOpenVersionsModal,
  onOpenDiffModal,
  onOpenAssignModal,
  onNewStrategy,
  onCloneStrategy,
  onDeleteStrategy,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  interfaceMode = "SIMPLE",
  onToggleInterfaceMode,
}: StrategyIdeHeaderProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);
  const [isTimeframeMoreOpen, setIsTimeframeMoreOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const symbolMenuRef = useRef<HTMLDivElement>(null);
  const marketMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
      if (symbolMenuRef.current && !symbolMenuRef.current.contains(e.target as Node)) {
        setIsSymbolDropdownOpen(false);
      }
      if (marketMenuRef.current && !marketMenuRef.current.contains(e.target as Node)) {
        setIsMarketDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentSymbols = POPULAR_SYMBOLS[strategy.market_type] || POPULAR_SYMBOLS.crypto;
  const filteredSymbols = currentSymbols.filter((s) =>
    s.toLowerCase().includes(symbolSearch.toLowerCase())
  );

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(strategy, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${strategy.name.replace(/\s+/g, "_")}_strategy.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setIsMoreOpen(false);
  };

  const getMarketLabel = (type: StrategyMarketType) => {
    const found = ASSET_CLASSES.find((a) => a.id === type);
    return found ? found.label : type.toUpperCase();
  };

  return (
    <header className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-4 shadow-xl space-y-3 font-sans select-none text-xs">
      
      {/* 1. TOP LINE: Strategy Title, Subtitle Meta, Autosave & Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#142B21] pb-3">
        
        {/* Left: Strategy Name + Status Pill + Undo/Redo + Subtitle */}
        <div className="flex items-center gap-3 min-w-[280px] flex-1">
          <div className="p-2 rounded-xl bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-md shrink-0">
            <Activity className="h-4 w-4" />
          </div>

          <div className="flex-1 max-w-xl">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={strategy.name}
                onChange={(e) => onUpdateStrategy({ name: e.target.value })}
                placeholder="Strategy Name..."
                className="bg-transparent text-sm sm:text-base font-black text-white focus:outline-none border-b border-transparent focus:border-[#55C98A] transition-all w-full truncate"
              />
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#142B21] text-[#55C98A] border border-[#275841] font-mono font-bold uppercase shrink-0">
                {strategy.status || "DRAFT"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#8BA596] font-mono mt-0.5">
              <span>{strategy.symbol}</span>
              <span>•</span>
              <span>{getMarketLabel(strategy.market_type)}</span>
              <span>•</span>
              <span>{strategy.base_timeframe}</span>
              <span>•</span>
              <span
                className={`font-bold ${
                  strategy.direction === "LONG"
                    ? "text-[#55C98A]"
                    : strategy.direction === "SHORT"
                    ? "text-red-400"
                    : "text-amber-400"
                }`}
              >
                {strategy.direction}
              </span>
              {autosaveTime && (
                <>
                  <span className="text-[#3A5548]">•</span>
                  <span className="text-[10px] text-[#607D6E]">Saved {autosaveTime}</span>
                </>
              )}
            </div>
          </div>

          {/* Undo / Redo Small Buttons */}
          <div className="hidden sm:flex items-center gap-1 bg-[#0C1713] p-0.5 rounded-lg border border-[#1A3127]">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded transition-colors ${
                canUndo ? "text-[#8BA596] hover:text-white hover:bg-[#123C2A]" : "text-[#2A4537] cursor-not-allowed"
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded transition-colors ${
                canRedo ? "text-[#8BA596] hover:text-white hover:bg-[#123C2A]" : "text-[#2A4537] cursor-not-allowed"
              }`}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Only 3 Primary Action Buttons + More Menu + Simple/Advanced Toggle */}
        <div className="flex items-center gap-2">
          
          {/* Simple / Advanced Toggle */}
          {onToggleInterfaceMode && (
            <button
              type="button"
              onClick={onToggleInterfaceMode}
              className="px-2.5 py-1.5 rounded-xl border border-[#1F392D] bg-[#0C1713] hover:bg-[#14271F] text-[11px] font-mono font-bold transition-all text-[#8BA596] hover:text-white"
              title="Toggle Simple / Advanced Workstation Interface"
            >
              {interfaceMode === "SIMPLE" ? "SIMPLE" : "ADVANCED"}
            </button>
          )}

          {/* 1. [Save] */}
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0C1713] hover:bg-[#14271F] text-white border border-[#1F392D] font-bold font-mono text-xs transition-all shadow-sm active:scale-98"
            title="Save Strategy Draft (Ctrl+S)"
          >
            <Save className="h-3.5 w-3.5 text-[#55C98A]" />
            <span>{isSaving ? "Saving..." : "Save"}</span>
          </button>

          {/* 2. [Test Strategy] */}
          <button
            type="button"
            onClick={onOpenTest}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold font-mono text-xs transition-all shadow-md active:scale-98"
            title="Compile & Run Deterministic Zero-Lookahead Backtest"
          >
            {isTesting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span>{isTesting ? "Testing..." : "Test Strategy"}</span>
          </button>

          {/* 3. [Assign to Bot] */}
          <button
            type="button"
            onClick={onOpenAssignModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-bold font-mono text-xs transition-all shadow-sm active:scale-98"
            title="Assign Strategy to Quantitative Bot (Requires User to Start Bot)"
          >
            <Bot className="h-3.5 w-3.5 text-blue-400" />
            <span>Assign to Bot</span>
          </button>

          {/* 4. [••• More Menu] */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="flex items-center justify-center min-w-[34px] min-h-[34px] p-1.5 rounded-xl border border-[#1F392D] bg-[#0C1713] hover:bg-[#14271F] text-[#8BA596] hover:text-white transition-all shadow-sm cursor-pointer font-bold tracking-widest leading-none text-xs"
              title="More Actions & Tools"
            >
              •••
            </button>

            {isMoreOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-[#09110E] border border-[#1F392D] rounded-2xl p-2 shadow-2xl w-60 flex flex-col gap-1 text-xs font-sans animate-fadeIn">
                {/* Templates Catalog */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenCatalog();
                    setIsMoreOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#8BA596] hover:text-white hover:bg-[#123C2A] font-semibold transition-colors text-left"
                >
                  <Sparkles className="h-4 w-4 text-[#55C98A]" />
                  <span>Templates & Catalog</span>
                </button>

                {/* New Strategy */}
                <button
                  type="button"
                  onClick={() => {
                    onNewStrategy();
                    setIsMoreOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#8BA596] hover:text-white hover:bg-[#123C2A] font-semibold transition-colors text-left"
                >
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <span>New Blank Strategy</span>
                </button>

                {/* Duplicate Strategy */}
                <button
                  type="button"
                  onClick={() => {
                    onCloneStrategy();
                    setIsMoreOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#8BA596] hover:text-white hover:bg-[#123C2A] font-semibold transition-colors text-left"
                >
                  <Copy className="h-4 w-4 text-amber-400" />
                  <span>Duplicate Strategy</span>
                </button>

                {/* Version History & Diff */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenVersionsModal();
                    setIsMoreOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#8BA596] hover:text-white hover:bg-[#123C2A] font-semibold transition-colors text-left border-t border-[#142B21]"
                >
                  <GitBranch className="h-4 w-4 text-blue-400" />
                  <span>Version History & Rollback</span>
                </button>

                {/* Export JSON */}
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#8BA596] hover:text-white hover:bg-[#123C2A] font-semibold transition-colors text-left"
                >
                  <Download className="h-4 w-4 text-indigo-400" />
                  <span>Export Strategy JSON</span>
                </button>

                {/* Delete Strategy (Safely in More Menu) */}
                {onDeleteStrategy && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this strategy?")) {
                        onDeleteStrategy();
                        setIsMoreOpen(false);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-950/30 font-semibold transition-colors text-left border-t border-[#142B21]"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                    <span>Delete Strategy</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 2. COMPACT MARKET BAR: MARKET | SYMBOL | TIMEFRAME | DIRECTION */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#060D0A] border border-[#14271F] rounded-xl px-3 py-2 text-xs font-mono">
        
        <div className="flex flex-wrap items-center gap-4">
          
          {/* MARKET Dropdown */}
          <div className="relative" ref={marketMenuRef}>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#8BA596] uppercase font-bold">MARKET:</span>
              <button
                type="button"
                onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0C1713] hover:bg-[#14271F] border border-[#1A3127] text-white font-bold transition-all"
              >
                <span>{getMarketLabel(strategy.market_type)}</span>
                <ChevronDown className="h-3 w-3 text-[#55C98A]" />
              </button>
            </div>

            {isMarketDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-40 bg-[#09110E] border border-[#1F392D] rounded-xl p-1.5 shadow-2xl w-44 flex flex-col gap-0.5 animate-fadeIn">
                {ASSET_CLASSES.map((asset) => {
                  const Icon = asset.icon;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        onUpdateStrategy({
                          market_type: asset.id,
                          symbol: POPULAR_SYMBOLS[asset.id]?.[0] || "BTC/USDT",
                        });
                        setIsMarketDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                        strategy.market_type === asset.id
                          ? "bg-[#123C2A] text-[#55C98A] font-bold"
                          : "text-[#8BA596] hover:bg-[#0C1713] hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <span>{asset.label}</span>
                      </span>
                      {strategy.market_type === asset.id && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* SYMBOL Dropdown */}
          <div className="relative" ref={symbolMenuRef}>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#8BA596] uppercase font-bold">SYMBOL:</span>
              <button
                type="button"
                onClick={() => setIsSymbolDropdownOpen(!isSymbolDropdownOpen)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0C1713] hover:bg-[#14271F] border border-[#1A3127] text-[#55C98A] font-bold transition-all"
              >
                <span>{strategy.symbol}</span>
                <ChevronDown className="h-3 w-3 text-[#55C98A]" />
              </button>
            </div>

            {isSymbolDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-40 bg-[#09110E] border border-[#1F392D] rounded-xl p-2 shadow-2xl w-60 space-y-1.5 animate-fadeIn">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-[#060D0A] border border-[#14271F] rounded-lg text-xs">
                  <Search className="h-3.5 w-3.5 text-[#8BA596]" />
                  <input
                    type="text"
                    value={symbolSearch}
                    onChange={(e) => setSymbolSearch(e.target.value)}
                    placeholder="Search symbol..."
                    className="bg-transparent text-white focus:outline-none w-full text-xs"
                    autoFocus
                  />
                </div>

                <div className="max-h-44 overflow-y-auto space-y-0.5 scrollbar-none">
                  {filteredSymbols.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => {
                        onUpdateStrategy({ symbol: sym });
                        setIsSymbolDropdownOpen(false);
                        setSymbolSearch("");
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left transition-colors ${
                        strategy.symbol === sym
                          ? "bg-[#123C2A] text-[#55C98A] font-bold"
                          : "text-[#8BA596] hover:bg-[#0C1713] hover:text-white"
                      }`}
                    >
                      <span>{sym}</span>
                      {strategy.symbol === sym && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* TIMEFRAME Bar */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#8BA596] uppercase font-bold">TIMEFRAME:</span>
            <div className="flex items-center gap-1 bg-[#0C1713] p-0.5 rounded-lg border border-[#1A3127]">
              {COMMON_TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => onUpdateStrategy({ base_timeframe: tf })}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                    strategy.base_timeframe === tf
                      ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-sm"
                      : "text-[#8BA596] hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}

              {/* More Timeframes */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTimeframeMoreOpen(!isTimeframeMoreOpen)}
                  className={`px-1.5 py-0.5 rounded text-[11px] transition-colors flex items-center gap-0.5 ${
                    MORE_TIMEFRAMES.includes(strategy.base_timeframe as any)
                      ? "bg-[#123C2A] text-[#55C98A] font-bold"
                      : "text-[#607D6E] hover:text-white"
                  }`}
                >
                  <span>{MORE_TIMEFRAMES.includes(strategy.base_timeframe as any) ? strategy.base_timeframe : "More"}</span>
                  <ChevronDown className="h-2.5 w-2.5" />
                </button>

                {isTimeframeMoreOpen && (
                  <div className="absolute right-0 top-full mt-1 z-40 bg-[#09110E] border border-[#1F392D] rounded-xl p-1 shadow-2xl w-24 flex flex-col gap-0.5">
                    {MORE_TIMEFRAMES.map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => {
                          onUpdateStrategy({ base_timeframe: tf });
                          setIsTimeframeMoreOpen(false);
                        }}
                        className={`px-2 py-1 rounded text-left ${
                          strategy.base_timeframe === tf
                            ? "bg-[#123C2A] text-[#55C98A] font-bold"
                            : "text-[#8BA596] hover:bg-[#0C1713] hover:text-white"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* DIRECTION Toggle (LONG / SHORT / BOTH) */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#8BA596] uppercase font-bold">DIRECTION:</span>
          <div className="flex items-center bg-[#0C1713] p-0.5 rounded-lg border border-[#1A3127]">
            <button
              type="button"
              onClick={() => onUpdateStrategy({ direction: "LONG" })}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                strategy.direction === "LONG"
                  ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-sm"
                  : "text-[#8BA596] hover:text-white"
              }`}
            >
              LONG
            </button>
            <button
              type="button"
              onClick={() => onUpdateStrategy({ direction: "SHORT" })}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                strategy.direction === "SHORT"
                  ? "bg-red-950 text-red-400 border border-red-500/60 shadow-sm"
                  : "text-[#8BA596] hover:text-white"
              }`}
            >
              SHORT
            </button>
            <button
              type="button"
              onClick={() => onUpdateStrategy({ direction: "BOTH" })}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                strategy.direction === "BOTH"
                  ? "bg-amber-950 text-amber-300 border border-amber-500/60 shadow-sm"
                  : "text-[#8BA596] hover:text-white"
              }`}
            >
              BOTH
            </button>
          </div>
        </div>

      </div>

    </header>
  );
}
