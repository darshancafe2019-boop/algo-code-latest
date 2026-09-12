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
  Upload,
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
  ShieldCheck,
  Radio,
  FileCode,
  Zap,
} from "lucide-react";
import {
  StrategyIdeDefinition,
  StrategyMarketType,
  RuleTimeframe,
  StrategyDirection,
  TradingExecutionMode,
} from "@/types/strategy-ide";
import { QosBadge, QosButton } from "@/components/ui/QosComponents";

interface StrategyIdeHeaderProps {
  strategy: StrategyIdeDefinition;
  onUpdateStrategy: (fields: Partial<StrategyIdeDefinition>) => void;
  onSaveDraft: () => void;
  isSaving: boolean;
  autosaveTime: string | null;
  onOpenTest: () => void;
  isTesting: boolean;
  onOpenForwardTest?: () => void;
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
  { id: "etf", label: "ETFs", icon: Briefcase },
];

const POPULAR_SYMBOLS: Record<StrategyMarketType, string[]> = {
  crypto: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "DOGE/USDT"],
  equity: ["RELIANCE", "TCS", "HDFCBANK", "INFY", "AAPL", "MSFT", "NVDA", "TSLA"],
  futures: ["BTC-PERP", "ETH-PERP", "SOL-PERP", "NIFTY-FUT", "BANKNIFTY-FUT"],
  options: ["NIFTY 24400 CE", "BANKNIFTY 51000 CE", "BTC-260925-70000-C"],
  commodity: ["GOLD", "SILVER", "CRUDEOIL", "NATURALGAS"],
  forex: ["EUR/USD", "GBP/USD", "USD/JPY", "USD/INR"],
  etf: ["SPY", "QQQ", "NIFTYBEES", "GOLDBEES"],
};

const COMMON_TIMEFRAMES: RuleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];

const BROKERS = [
  { id: "Delta", label: "Delta Exchange", dataProvider: "Delta" },
  { id: "Dhan", label: "Dhan Multi-Broker", dataProvider: "Dhan" },
  { id: "Upstox", label: "Upstox V2", dataProvider: "Upstox" },
  { id: "Paper", label: "Paper Engine", dataProvider: "Binance" },
];

export function StrategyIdeHeader({
  strategy,
  onUpdateStrategy,
  onSaveDraft,
  isSaving,
  autosaveTime,
  onOpenTest,
  isTesting,
  onOpenForwardTest,
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(strategy.name);
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const symbolMenuRef = useRef<HTMLDivElement>(null);
  const marketMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameInput(strategy.name);
  }, [strategy.name]);

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
    downloadAnchor.setAttribute("download", `${strategy.name.replace(/\s+/g, "_")}_v${strategy.active_version || "1.0"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setIsMoreOpen(false);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.name && parsed.entry) {
          onUpdateStrategy(parsed);
        }
      } catch (err) {
        console.error("Invalid Strategy JSON format", err);
      }
    };
    reader.readAsText(file);
    setIsMoreOpen(false);
  };

  const handleNameSave = () => {
    if (nameInput.trim()) {
      onUpdateStrategy({ name: nameInput.trim() });
    }
    setIsEditingName(false);
  };

  const selectedBroker = strategy.broker_config?.execution_broker || (strategy.market_type === "crypto" ? "Delta" : "Upstox");
  const selectedDataProvider = strategy.broker_config?.data_provider || (strategy.market_type === "crypto" ? "Delta" : "Upstox");
  const currentMode: TradingExecutionMode = strategy.broker_config?.mode || "PAPER";

  return (
    <div className="space-y-2 select-none">
      {/* 1. TOP STRATEGY WORKSPACE HEADER */}
      <header className="bg-[#0A1422] border border-[#12304A] rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3 font-sans text-xs">
        {/* LEFT: Strategy Icon, Name, Subtitle, Status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-[#168BFF]/10 text-[#168BFF] border border-[#168BFF]/30 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-[#22D3EE]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                    onBlur={handleNameSave}
                    autoFocus
                    className="h-7 px-2 bg-[#0C1727] border border-[#22D3EE] rounded text-sm font-bold text-[#F8FAFC] font-sans focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleNameSave}
                    className="p-1 rounded bg-[#00E89A]/20 text-[#00E89A] hover:bg-[#00E89A]/30"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <h1
                  onClick={() => setIsEditingName(true)}
                  className="text-sm sm:text-base font-bold text-[#F8FAFC] tracking-tight cursor-pointer hover:text-[#22D3EE] transition-colors truncate max-w-[320px] sm:max-w-[450px]"
                  title="Click to rename strategy"
                >
                  {strategy.name}
                </h1>
              )}

              <QosBadge status={strategy.status as any || "DRAFT"} dot={true} />

              <span className="px-1.5 py-0.5 rounded bg-[#07111F] border border-[#12304A] font-mono text-[10px] text-[#7D8EA5]">
                {strategy.active_version || "v1.0.0"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#7D8EA5] font-sans mt-0.5">
              <span>{strategy.symbol}</span>
              <span>•</span>
              <span className="capitalize">{strategy.market_type}</span>
              <span>•</span>
              <span className="font-mono">{strategy.base_timeframe}</span>
              <span>•</span>
              <span
                className={`font-mono font-bold ${
                  strategy.direction === "LONG"
                    ? "text-[#00E89A]"
                    : strategy.direction === "SHORT"
                    ? "text-[#FF3B5C]"
                    : "text-[#22D3EE]"
                }`}
              >
                {strategy.direction}
              </span>
              {autosaveTime && (
                <span className="text-[10px] text-[#7D8EA5] hidden md:inline font-mono">
                  (Saved {autosaveTime})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CENTER: Undo / Redo */}
        <div className="flex items-center gap-1 bg-[#07111F] border border-[#12304A] rounded-lg p-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0C1727] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="p-1.5 rounded text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0C1727] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* RIGHT: Actions (Mode, Save, Backtest, Forward Test, Assign, More) */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Mode Switch: SIMPLE / ADVANCED */}
          {onToggleInterfaceMode && (
            <button
              type="button"
              onClick={onToggleInterfaceMode}
              className={`h-8 px-2.5 rounded-lg text-xs font-mono font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                interfaceMode === "ADVANCED"
                  ? "bg-[#168BFF]/20 text-[#168BFF] border-[#168BFF]/50"
                  : "bg-[#0A1422] text-[#7D8EA5] border-[#12304A] hover:text-[#F8FAFC]"
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>{interfaceMode}</span>
            </button>
          )}

          {/* Save Draft */}
          <QosButton
            variant="secondary"
            size="md"
            onClick={onSaveDraft}
            isLoading={isSaving}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5 text-[#22D3EE]" />
            <span>Save</span>
          </QosButton>

          {/* Run Backtest */}
          <QosButton
            variant="secondary"
            size="md"
            onClick={onOpenTest}
            isLoading={isTesting}
            className="gap-1.5 hover:border-[#168BFF]"
          >
            <Play className="h-3.5 w-3.5 text-[#168BFF]" />
            <span>Backtest</span>
          </QosButton>

          {/* Forward Test */}
          {onOpenForwardTest && (
            <QosButton
              variant="secondary"
              size="md"
              onClick={onOpenForwardTest}
              className="gap-1.5 hover:border-[#00E89A]"
            >
              <Radio className="h-3.5 w-3.5 text-[#00E89A]" />
              <span>Forward Test</span>
            </QosButton>
          )}

          {/* Assign to Bot */}
          <QosButton
            variant="primary"
            size="md"
            onClick={onOpenAssignModal}
            className="gap-1.5"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Assign to Bot</span>
          </QosButton>

          {/* More Menu Dropdown */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="h-8 w-8 rounded-lg bg-[#0A1422] border border-[#12304A] hover:border-[#1A3E61] flex items-center justify-center text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {isMoreOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-[#0C1727] border border-[#12304A] rounded-xl shadow-xl p-1.5 space-y-0.5 z-50 animate-fadeIn font-sans text-xs">
                <button
                  type="button"
                  onClick={() => {
                    onOpenCatalog();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#12304A] text-[#F8FAFC] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#22D3EE]" />
                  <span>Templates & Catalog</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenVersionsModal();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#12304A] text-[#F8FAFC] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <GitBranch className="h-3.5 w-3.5 text-[#168BFF]" />
                  <span>Versions & History</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCloneStrategy();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#12304A] text-[#F8FAFC] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 text-[#00E89A]" />
                  <span>Duplicate Strategy</span>
                </button>

                <div className="my-1 border-t border-[#12304A]" />

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#12304A] text-[#F8FAFC] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-[#7D8EA5]" />
                  <span>Export Strategy JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#12304A] text-[#F8FAFC] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5 text-[#7D8EA5]" />
                  <span>Import Strategy JSON</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportJson}
                  accept=".json"
                  className="hidden"
                />

                <div className="my-1 border-t border-[#12304A]" />

                <button
                  type="button"
                  onClick={() => {
                    onNewStrategy();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#12304A] text-[#22D3EE] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Create New Blank</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. COMPACT MARKET CONTROL BAR */}
      <div className="bg-[#0A1422] border border-[#12304A] rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-3 font-sans text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* MARKET / ASSET CLASS */}
          <div className="flex items-center gap-1.5" ref={marketMenuRef}>
            <span className="text-[10px] font-mono uppercase text-[#7D8EA5] font-bold">MARKET:</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
                className="h-7 px-2 bg-[#0C1727] border border-[#12304A] hover:border-[#1A3E61] rounded-lg text-xs font-semibold text-[#F8FAFC] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="capitalize">{strategy.market_type}</span>
                <ChevronDown className="h-3 w-3 text-[#7D8EA5]" />
              </button>

              {isMarketDropdownOpen && (
                <div className="absolute left-0 mt-1 w-44 bg-[#0C1727] border border-[#12304A] rounded-xl shadow-xl p-1 z-40">
                  {ASSET_CLASSES.map((cls) => {
                    const Icon = cls.icon;
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => {
                          onUpdateStrategy({
                            market_type: cls.id,
                            symbol: POPULAR_SYMBOLS[cls.id]?.[0] || strategy.symbol,
                          });
                          setIsMarketDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors text-xs cursor-pointer ${
                          strategy.market_type === cls.id
                            ? "bg-[#168BFF] text-white font-bold"
                            : "hover:bg-[#12304A] text-[#F8FAFC]"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{cls.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SYMBOL SELECTION */}
          <div className="flex items-center gap-1.5" ref={symbolMenuRef}>
            <span className="text-[10px] font-mono uppercase text-[#7D8EA5] font-bold">SYMBOL:</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSymbolDropdownOpen(!isSymbolDropdownOpen)}
                className="h-7 px-2.5 bg-[#0C1727] border border-[#12304A] hover:border-[#1A3E61] rounded-lg text-xs font-mono font-bold text-[#22D3EE] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{strategy.symbol}</span>
                <ChevronDown className="h-3 w-3 text-[#7D8EA5]" />
              </button>

              {isSymbolDropdownOpen && (
                <div className="absolute left-0 mt-1 w-52 bg-[#0C1727] border border-[#12304A] rounded-xl shadow-xl p-2 z-40 space-y-2">
                  <input
                    type="text"
                    placeholder="Search symbol..."
                    value={symbolSearch}
                    onChange={(e) => setSymbolSearch(e.target.value)}
                    className="w-full h-7 px-2 bg-[#0A1422] border border-[#12304A] rounded text-xs text-[#F8FAFC] font-mono focus:outline-none focus:border-[#22D3EE]"
                  />
                  <div className="max-h-44 overflow-y-auto space-y-0.5 scrollbar-thin">
                    {filteredSymbols.map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => {
                          onUpdateStrategy({ symbol: sym });
                          setIsSymbolDropdownOpen(false);
                          setSymbolSearch("");
                        }}
                        className={`w-full text-left px-2 py-1 rounded text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${
                          strategy.symbol === sym
                            ? "bg-[#168BFF] text-white font-bold"
                            : "hover:bg-[#12304A] text-[#F8FAFC]"
                        }`}
                      >
                        <span>{sym}</span>
                        {strategy.symbol === sym && <Check className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BROKER SELECTION */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase text-[#7D8EA5] font-bold">BROKER:</span>
            <select
              value={selectedBroker}
              onChange={(e) => {
                const broker = e.target.value as any;
                const found = BROKERS.find((b) => b.id === broker);
                onUpdateStrategy({
                  broker_config: {
                    execution_broker: broker,
                    data_provider: (found?.dataProvider || "Delta") as any,
                    mode: currentMode,
                  },
                });
              }}
              className="h-7 px-2 bg-[#0C1727] border border-[#12304A] rounded-lg text-xs font-semibold text-[#F8FAFC] focus:outline-none focus:border-[#22D3EE] cursor-pointer"
            >
              {BROKERS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* TIMEFRAME */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase text-[#7D8EA5] font-bold">TIMEFRAME:</span>
            <div className="flex items-center gap-0.5 bg-[#07111F] border border-[#12304A] rounded-lg p-0.5">
              {COMMON_TIMEFRAMES.map((tf) => {
                const isSelected = strategy.base_timeframe === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => onUpdateStrategy({ base_timeframe: tf })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#22D3EE] text-[#05101A]"
                        : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* DIRECTION BUTTONS (LONG green, SHORT red, BOTH neutral/cyan) */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-[#7D8EA5] font-bold">DIRECTION:</span>
          <div className="flex items-center gap-1 bg-[#07111F] border border-[#12304A] rounded-lg p-0.5 font-mono text-xs font-bold">
            <button
              type="button"
              onClick={() => onUpdateStrategy({ direction: "LONG" })}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                strategy.direction === "LONG"
                  ? "bg-[#00E89A] text-[#05101A] shadow-sm"
                  : "text-[#7D8EA5] hover:text-[#00E89A]"
              }`}
            >
              LONG
            </button>
            <button
              type="button"
              onClick={() => onUpdateStrategy({ direction: "SHORT" })}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                strategy.direction === "SHORT"
                  ? "bg-[#FF3B5C] text-white shadow-sm"
                  : "text-[#7D8EA5] hover:text-[#FF3B5C]"
              }`}
            >
              SHORT
            </button>
            <button
              type="button"
              onClick={() => onUpdateStrategy({ direction: "BOTH" })}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                strategy.direction === "BOTH"
                  ? "bg-[#22D3EE] text-[#05101A] shadow-sm"
                  : "text-[#7D8EA5] hover:text-[#22D3EE]"
              }`}
            >
              BOTH
            </button>
          </div>

          {/* Mode Pill (Guarded Paper mode) */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#22D3EE]/10 border border-[#22D3EE]/30 text-[#22D3EE] font-mono font-bold text-[10px] uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22D3EE]" />
            <span>PAPER MODE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
