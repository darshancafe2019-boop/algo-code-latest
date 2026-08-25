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
  GitCompare,
  Download,
  RotateCcw,
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
  Sparkles
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

const POPULAR_SYMBOLS: Record<StrategyMarketType, string[]> = {
  crypto: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "DOGE/USDT", "PEPE/USDT"],
  equity: ["RELIANCE", "TCS", "HDFCBANK", "INFY", "AAPL", "MSFT", "NVDA", "TSLA"],
  futures: ["BTC-PERP", "ETH-PERP", "NIFTY-FUT", "BANKNIFTY-FUT", "ES-FUT"],
  options: ["NIFTY", "BANKNIFTY", "BTC-OPTIONS", "ETH-OPTIONS"],
  commodity: ["GOLD", "SILVER", "CRUDEOIL", "NATURALGAS"],
  forex: ["EUR/USD", "GBP/USD", "USD/JPY", "USD/INR"],
};

const QUICK_TIMEFRAMES: RuleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];
const ALL_TIMEFRAMES: RuleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"];

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
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: StrategyIdeHeaderProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");
  const [isTimeframeMoreOpen, setIsTimeframeMoreOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const symbolMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
      if (symbolMenuRef.current && !symbolMenuRef.current.contains(e.target as Node)) {
        setIsSymbolDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalRuleCount =
    (strategy.entry?.setup?.rules?.length || 0) +
    (strategy.entry?.confirmation?.rules?.length || 0) +
    (strategy.entry?.trigger?.rules?.length || 0);

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

  return (
    <header className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-4 shadow-xl space-y-3 font-sans select-none text-xs">
      
      {/* TOP ROW: Strategy Identity, Autosave, Primary Actions & More Menu */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#142B21] pb-3">
        
        {/* Left: Name, Status Pill & Meta subtitle */}
        <div className="flex items-center gap-3 min-w-[280px] flex-1">
          <div className="p-2 rounded-xl bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-md shrink-0">
            <Activity className="h-4 w-4" />
          </div>

          <div className="flex-1 max-w-lg">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={strategy.name}
                onChange={(e) => onUpdateStrategy({ name: e.target.value })}
                placeholder="Strategy Name..."
                className="bg-transparent text-sm sm:text-base font-black text-white focus:outline-none border-b border-transparent focus:border-[#55C98A] transition-all w-full truncate"
              />
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider shrink-0 ${
                  strategy.status === "PUBLISHED" || strategy.status === "APPROVED"
                    ? "bg-[#142B21] text-[#55C98A] border border-[#275841]"
                    : strategy.status === "VALIDATED"
                    ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                    : "bg-yellow-950/60 text-yellow-400 border border-yellow-800"
                }`}
              >
                {strategy.status || "DRAFT"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#8BA596] font-mono mt-0.5">
              <span>{strategy.symbol}</span>
              <span>•</span>
              <span className="capitalize">{strategy.market_type}</span>
              <span>•</span>
              <span>{strategy.base_timeframe}</span>
              <span>•</span>
              <span className="text-[#55C98A] font-bold">{strategy.direction}</span>
              <span>•</span>
              <span>{totalRuleCount} rules</span>
            </div>
          </div>
        </div>

        {/* Right: Autosave Stamp, Undo/Redo, Primary Action Buttons & More Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Autosave Status */}
          {autosaveTime && (
            <span className="hidden sm:inline text-[10px] text-[#607D6E] font-mono mr-1">
              Saved {autosaveTime}
            </span>
          )}

          {/* Undo / Redo */}
          <div className="flex items-center bg-[#0C1713] border border-[#1A3127] rounded-xl p-0.5 mr-1">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded-lg text-[#8BA596] hover:text-white disabled:opacity-30 transition-colors"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className="p-1.5 rounded-lg text-[#8BA596] hover:text-white disabled:opacity-30 transition-colors"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Primary Action: Save */}
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="px-3 py-2 rounded-xl bg-[#123C2A] hover:bg-[#194E37] text-[#55C98A] hover:text-white border border-[#39B978]/50 font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Primary Action: Test Strategy */}
          <button
            type="button"
            onClick={onOpenTest}
            disabled={isTesting}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all flex items-center gap-1.5 shadow-md"
          >
            {isTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            <span>Test Strategy</span>
          </button>

          {/* Primary Action: Assign to Bot */}
          <button
            type="button"
            onClick={onOpenAssignModal}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all flex items-center gap-1.5 shadow-md"
          >
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Assign to Bot</span>
          </button>

          {/* Secondary Actions: More Menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="p-2 rounded-xl bg-[#0C1713] hover:bg-[#14271F] text-[#8BA596] hover:text-white border border-[#1A3127] transition-all"
              title="More Options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {isMoreOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#09110E] border border-[#1F392D] rounded-xl shadow-2xl p-1.5 z-50 animate-fadeIn">
                <button
                  type="button"
                  onClick={() => {
                    onOpenCatalog();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#123C2A] hover:text-[#55C98A] text-[#8BA596] flex items-center gap-2 font-medium"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Templates</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCloneStrategy();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#123C2A] hover:text-[#55C98A] text-[#8BA596] flex items-center gap-2 font-medium"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Duplicate Strategy</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenVersionsModal();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#123C2A] hover:text-[#55C98A] text-[#8BA596] flex items-center gap-2 font-medium"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  <span>Version History</span>
                </button>

                {onOpenDiffModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenDiffModal();
                      setIsMoreOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#123C2A] hover:text-[#55C98A] text-[#8BA596] flex items-center gap-2 font-medium"
                  >
                    <GitCompare className="h-3.5 w-3.5" />
                    <span>Version Diff</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#123C2A] hover:text-[#55C98A] text-[#8BA596] flex items-center gap-2 font-medium"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export JSON</span>
                </button>

                <div className="border-t border-[#142B21] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    onNewStrategy();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-950/60 text-red-400 flex items-center gap-2 font-medium"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Draft</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* BOTTOM ROW: Compact Market Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#060D0A] border border-[#14271F] rounded-xl p-2.5">
        
        {/* Market Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#607D6E] font-bold uppercase tracking-wider">Market</span>
          <div className="flex items-center gap-1">
            {ASSET_CLASSES.map((ac) => {
              const isSelected = strategy.market_type === ac.id;
              const IconComp = ac.icon;
              return (
                <button
                  key={ac.id}
                  type="button"
                  onClick={() => {
                    onUpdateStrategy({
                      market_type: ac.id,
                      symbol: POPULAR_SYMBOLS[ac.id]?.[0] || "BTC/USDT",
                    });
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    isSelected
                      ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-sm"
                      : "text-[#8BA596] hover:text-white hover:bg-[#0C1713]"
                  }`}
                >
                  <IconComp className="h-3 w-3" />
                  <span>{ac.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Symbol Selector */}
        <div className="flex items-center gap-2 relative" ref={symbolMenuRef}>
          <span className="text-[10px] text-[#607D6E] font-bold uppercase tracking-wider">Symbol</span>
          <button
            type="button"
            onClick={() => setIsSymbolDropdownOpen(!isSymbolDropdownOpen)}
            className="px-2.5 py-1 rounded-lg bg-[#0C1713] border border-[#1A3127] text-white font-mono font-bold hover:border-[#55C98A] transition-all flex items-center gap-1.5"
          >
            <span className="text-cyan-400">{strategy.symbol}</span>
            <ChevronDown className="h-3 w-3 text-[#8BA596]" />
          </button>

          {isSymbolDropdownOpen && (
            <div className="absolute left-0 top-8 w-52 bg-[#09110E] border border-[#1F392D] rounded-xl shadow-2xl p-2 z-50 space-y-1.5 animate-fadeIn">
              <div className="relative">
                <Search className="h-3 w-3 text-[#607D6E] absolute left-2 top-2" />
                <input
                  type="text"
                  placeholder="Search symbol..."
                  value={symbolSearch}
                  onChange={(e) => setSymbolSearch(e.target.value)}
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-lg pl-7 pr-2 py-1 text-xs text-white placeholder-[#607D6E] focus:outline-none focus:border-[#55C98A]"
                />
              </div>

              <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-0.5">
                {filteredSymbols.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => {
                      onUpdateStrategy({ symbol: sym });
                      setIsSymbolDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded-lg font-mono text-xs flex justify-between items-center ${
                      strategy.symbol === sym
                        ? "bg-[#123C2A] text-[#55C98A] font-bold"
                        : "text-[#8BA596] hover:bg-[#0C1713] hover:text-white"
                    }`}
                  >
                    <span>{sym}</span>
                    {strategy.symbol === sym && <Check className="h-3 w-3 text-[#55C98A]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#607D6E] font-bold uppercase tracking-wider">Timeframe</span>
          <div className="flex items-center gap-1">
            {QUICK_TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => onUpdateStrategy({ base_timeframe: tf })}
                className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  strategy.base_timeframe === tf
                    ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-sm"
                    : "text-[#8BA596] hover:text-white hover:bg-[#0C1713]"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Direction Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#607D6E] font-bold uppercase tracking-wider">Direction</span>
          <div className="flex items-center bg-[#0C1713] border border-[#1A3127] rounded-lg p-0.5">
            {(["LONG", "SHORT", "BOTH"] as StrategyDirection[]).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => onUpdateStrategy({ direction: dir })}
                className={`px-2.5 py-0.5 rounded text-xs font-bold transition-all ${
                  strategy.direction === dir
                    ? dir === "LONG"
                      ? "bg-[#123C2A] text-[#55C98A] shadow-sm font-bold"
                      : dir === "SHORT"
                      ? "bg-red-950/80 text-red-400 shadow-sm font-bold"
                      : "bg-cyan-950 text-cyan-400 shadow-sm font-bold"
                    : "text-[#8BA596] hover:text-white"
                }`}
              >
                {dir}
              </button>
            ))}
          </div>
        </div>

      </div>

    </header>
  );
}
