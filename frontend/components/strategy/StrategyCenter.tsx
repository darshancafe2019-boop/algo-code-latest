"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  Search,
  Filter,
  FlaskConical,
  Radio,
  Play,
  Layers,
  Shield,
  Bot,
  Activity,
  Sliders,
  CheckCircle2,
  TrendingUp,
  Zap,
  BookOpen,
  Eye,
  RefreshCw,
  Coins,
  ChevronRight,
  Sparkles,
  Lock,
  LayoutGrid,
  List,
} from "lucide-react";
import {
  CRYPTO_30_STRATEGIES,
  CryptoStrategyDefinition,
  StrategyCategory,
  StrategyPart,
  StrategySignalState,
  STRATEGY_CATEGORIES,
} from "@/lib/strategies/crypto30Strategies";
import { useStrategyStore, StrategyViewTab } from "@/lib/strategies/strategyStore";
import { StrategyDetailModal } from "./StrategyDetailModal";
import { StrategyBacktestView } from "./StrategyBacktestView";
import { StrategyPaperTradingView } from "./StrategyPaperTradingView";
import { StrategyClustersView } from "./StrategyClustersView";
import { StrategyRegimeView } from "./StrategyRegimeView";
import { StrategyTradeJournalView } from "./StrategyTradeJournalView";
import { formatMoney } from "@/lib/formatters";
import { useBotCreationIntentStore } from "@/lib/store/useBotCreationIntentStore";

export function StrategyCenter() {
  const router = useRouter();
  const {
    strategies,
    selectedStrategyId,
    activeViewTab,
    searchQuery,
    selectedCategory,
    selectedTimeframe,
    selectedMarket,
    selectedSignalState,
    selectedRegime,
    viewDisplayMode,
    regimeState,
    signalReports,
    signalClusters,
    paperInstances,
    backtestResults,
    setSelectedStrategyId,
    setActiveViewTab,
    setSearchQuery,
    setSelectedCategory,
    setSelectedTimeframe,
    setSelectedMarket,
    setSelectedSignalState,
    setSelectedRegime,
    setViewDisplayMode,
    activatePaperStrategy,
  } = useStrategyStore();

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const setBotIntent = useBotCreationIntentStore((state) => state.setIntent);

  const selectedStrategy =
    strategies.find((s) => s.id === selectedStrategyId) || strategies[0];

  // Filtering logic across all 30 strategies
  const filteredStrategies = useMemo(() => {
    return strategies.filter((strat) => {
      // Category filter
      if (selectedCategory !== "ALL" && strat.category !== selectedCategory) {
        return false;
      }
      // Timeframe filter
      if (selectedTimeframe !== "ALL" && strat.primaryTimeframe !== selectedTimeframe && !strat.alternateTimeframes.includes(selectedTimeframe)) {
        return false;
      }
      // Market filter
      if (selectedMarket !== "ALL" && !strat.market.toLowerCase().includes(selectedMarket.toLowerCase())) {
        return false;
      }
      // Signal State filter
      const signalState = signalReports[strat.number]?.signalState || "NO_SETUP";
      if (selectedSignalState !== "ALL" && signalState !== selectedSignalState) {
        return false;
      }
      // Regime filter
      if (selectedRegime !== "ALL" && !strat.compatibleRegimes.includes(selectedRegime)) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesName = strat.name.toLowerCase().includes(q);
        const matchesNumber = strat.number.includes(q);
        const matchesDesc = strat.whatItDoes.toLowerCase().includes(q);
        const matchesCat = strat.category.toLowerCase().includes(q);
        const matchesIndicators = strat.indicators.some((ind) => ind.name.toLowerCase().includes(q));
        if (!matchesName && !matchesNumber && !matchesDesc && !matchesCat && !matchesIndicators) {
          return false;
        }
      }
      return true;
    });
  }, [
    strategies,
    selectedCategory,
    selectedTimeframe,
    selectedMarket,
    selectedSignalState,
    selectedRegime,
    searchQuery,
    signalReports,
  ]);

  const handleOpenDetail = (strategyId: string) => {
    setSelectedStrategyId(strategyId);
    setIsDetailModalOpen(true);
  };

  const handleOpenBacktest = (strategyNumber: string) => {
    const strat = strategies.find((s) => s.number === strategyNumber);
    if (strat) {
      setSelectedStrategyId(strat.id);
      setActiveViewTab("BACKTEST");
    }
  };

  const handleActivatePaper = (strategyNumber: string) => {
    const strat = strategies.find((s) => s.number === strategyNumber);
    if (strat) {
      const isOptions = strat.part.includes("OPTIONS") || strat.category.includes("Options") || strat.market.toLowerCase().includes("options");
      const isCrypto = strat.market.toLowerCase().includes("btc") || strat.market.toLowerCase().includes("eth");
      const targetUnderlying = isOptions ? (isCrypto ? "BTC" : "NIFTY") : "BTC/USDT";
      activatePaperStrategy(strategyNumber, targetUnderlying, strat.primaryTimeframe, 0.5);
      setActiveViewTab("PAPER");
    }
  };

  const handleCreateBotFromStrategy = (strategy: CryptoStrategyDefinition) => {
    // Calculate realistic stop & profit targets from example trade or strategy category
    const isOptions = strategy.part.includes("OPTIONS") || strategy.category.includes("Options") || strategy.market.toLowerCase().includes("options");
    const isCrypto = strategy.market.toLowerCase().includes("btc") || strategy.market.toLowerCase().includes("eth");
    const sym = isOptions ? (isCrypto ? "BTC" : "NIFTY") : (strategy.exampleTrade?.instrument || "BTC/USDT");
    const entry = strategy.exampleTrade?.entryPrice || (isOptions ? 24850 : 67000);
    const stop = strategy.exampleTrade?.stopPrice || (isOptions ? 24350 : 65500);
    const target = strategy.exampleTrade?.targetPrice || (isOptions ? 25350 : 70000);
    const stopPct = Number((Math.abs(entry - stop) / (entry || 1) * 100).toFixed(2)) || 1.5;
    const targetPct = Number((Math.abs(target - entry) / (entry || 1) * 100).toFixed(2)) || 3.0;

    const isFutures = strategy.market.toLowerCase().includes("perp") || strategy.market.toLowerCase().includes("futures");
    const resolvedAssetClass = isOptions ? "OPTIONS" : isFutures ? "CRYPTO_FUTURES" : "CRYPTO";

    try {
      setBotIntent({
        symbol: sym,
        canonicalSymbol: sym,
        side: strategy.direction === "SHORT" ? "SELL" : "BUY",
        assetClass: resolvedAssetClass as any,
        timeframe: strategy.primaryTimeframe || "15m",
        initialStrategyName: `${strategy.name} Bot`,
        strategyDescription: strategy.whatItDoes,
        strategyTemplateId: strategy.id,
        stopLossPct: stopPct,
        takeProfitPct: targetPct,
        riskPerTradePct: strategy.exampleTrade?.riskPct || 0.5,
        capitalAllocation: 25000,
        indicators: strategy.indicators,
        rules: strategy.setupConditions,
        origin: isOptions ? "OPTIONS" : "STRATEGY_CENTER",
        rawStrategyConfig: strategy,
        timestamp: Date.now(),
      });
      router.push(`/bots?create=true&strategyId=${encodeURIComponent(strategy.id)}&underlying=${encodeURIComponent(sym)}`);
    } catch {
      router.push(`/bots?create=true&strategyId=${encodeURIComponent(strategy.id)}`);
    }
  };

  const getSignalBadgeColor = (state: StrategySignalState) => {
    switch (state) {
      case "READY":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case "SETUP_FORMING":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/40";
      case "WATCHING":
        return "bg-blue-500/20 text-blue-400 border-blue-500/40";
      case "BLOCKED":
        return "bg-red-500/20 text-red-400 border-red-500/40";
      default:
        return "bg-slate-800/60 text-slate-400 border-slate-700/60";
    }
  };

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-6 max-w-[1800px] mx-auto min-w-0 font-sans text-slate-100">
      {/* 1. Master Strategy Center Executive Header */}
      <div className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#0C1322] via-[#0E172A] to-[#121B2F] border border-[#1E293B] shadow-2xl">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 relative z-10">
          {/* Left Title & Status */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-0.5 shadow-xl shadow-cyan-900/40 flex items-center justify-center shrink-0">
              <div className="h-full w-full bg-[#0B0F19] rounded-[14px] flex items-center justify-center">
                <Compass className="h-7 w-7 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">
                  Quant.OS Strategy Center
                </h1>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-950/90 text-cyan-400 border border-cyan-700/60">
                  {strategies.length} AUTHORITATIVE STRATEGIES
                </span>
                <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  PAPER DEFAULT
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1">
                Quantitative strategy research, multi-leg options architectures, signal validation, centralized risk sizing, backtesting, and execution fleet.
              </p>
            </div>
          </div>

          {/* Right Executive Telemetry Metrics */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
            {/* Regime Pill */}
            <div
              onClick={() => setActiveViewTab("REGIME")}
              className="cursor-pointer p-2.5 rounded-xl bg-[#090E1A] hover:bg-[#121A2C] border border-[#1E2E4A] transition flex items-center gap-2"
              title="Click to inspect Market Regime Engine"
            >
              <Compass className="h-4 w-4 text-amber-400" />
              <div>
                <span className="text-[9px] text-slate-400 block">MARKET REGIME</span>
                <span className="font-bold text-amber-300">{regimeState.regime}</span>
              </div>
            </div>

            {/* Signal Clusters Pill */}
            <div
              onClick={() => setActiveViewTab("CLUSTERS")}
              className="cursor-pointer p-2.5 rounded-xl bg-[#090E1A] hover:bg-[#121A2C] border border-[#1E2E4A] transition flex items-center gap-2"
              title="Click to inspect Cross-Strategy Signal Clusters"
            >
              <Layers className="h-4 w-4 text-purple-400" />
              <div>
                <span className="text-[9px] text-slate-400 block">SIGNAL CLUSTERS</span>
                <span className="font-bold text-purple-300">{signalClusters.length} Active</span>
              </div>
            </div>

            {/* Paper Fleet Pill */}
            <div
              onClick={() => setActiveViewTab("PAPER")}
              className="cursor-pointer p-2.5 rounded-xl bg-[#090E1A] hover:bg-[#121A2C] border border-[#1E2E4A] transition flex items-center gap-2"
              title="Click to inspect Paper Trading fleet"
            >
              <Radio className="h-4 w-4 text-emerald-400" />
              <div>
                <span className="text-[9px] text-slate-400 block">PAPER FLEET</span>
                <span className="font-bold text-emerald-400">{paperInstances.length} Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Navigation View Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-[#1A253A]">
        {[
          { id: "LIBRARY", label: `Strategy Library (${strategies.length})`, icon: Compass },
          { id: "BACKTEST", label: "Backtest Lab", icon: FlaskConical },
          { id: "PAPER", label: "Paper Trading Fleet", icon: Radio },
          { id: "CLUSTERS", label: "Exposure Clusters", icon: Layers },
          { id: "REGIME", label: "Regime Engine", icon: Activity },
          { id: "JOURNAL", label: "Trade Journal & Audits", icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeViewTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveViewTab(tab.id as StrategyViewTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/50 border border-cyan-400/40"
                  : "bg-[#0B0F19] text-slate-400 hover:text-slate-200 hover:bg-[#121A2C] border border-[#1E293B]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Render View Sub-Component based on activeViewTab */}
      {activeViewTab === "BACKTEST" && <StrategyBacktestView />}
      {activeViewTab === "PAPER" && <StrategyPaperTradingView />}
      {activeViewTab === "CLUSTERS" && <StrategyClustersView />}
      {activeViewTab === "REGIME" && <StrategyRegimeView />}
      {activeViewTab === "JOURNAL" && <StrategyTradeJournalView />}

      {/* Master Strategy Library View */}
      {activeViewTab === "LIBRARY" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Category Filter Pills (Part I to Part VII) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`p-3 rounded-2xl border text-left transition-all ${
                selectedCategory === "ALL"
                  ? "bg-cyan-500/15 border-cyan-500/50 text-white shadow-md shadow-cyan-950/40"
                  : "bg-[#090E1A] border-[#1E293B] text-slate-400 hover:text-white hover:bg-[#10182A]"
              }`}
            >
              <span className="text-[10px] font-mono text-cyan-400 font-bold block">ALL PARTS</span>
              <span className="text-xs font-bold block">All Strategies</span>
              <span className="text-[10px] font-mono text-slate-500 block mt-0.5">{strategies.length} Total</span>
            </button>

            {STRATEGY_CATEGORIES.map((cat, idx) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? "bg-cyan-500/15 border-cyan-500/50 text-white shadow-md shadow-cyan-950/40"
                      : "bg-[#090E1A] border-[#1E293B] text-slate-400 hover:text-white hover:bg-[#10182A]"
                  }`}
                >
                  <span className="text-[10px] font-mono text-cyan-400 font-bold block">
                    PART {idx + 1}
                  </span>
                  <span className="text-xs font-bold truncate block">{cat.name}</span>
                  <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                    {cat.count} Strategies
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search, Timeframe, Market, Signal Filters, and Display Mode Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#090E1A] border border-[#1E293B]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder={`Search ${strategies.length} strategies by name, number, indicator, or setup...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#060A14] border border-[#1F2E47] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              {/* Timeframe */}
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#060A14] border border-[#1F2E47] text-slate-300"
              >
                <option value="ALL">Timeframe: All</option>
                <option value="15m">15m</option>
                <option value="1H">1H</option>
                <option value="4H">4H</option>
                <option value="1D">1D</option>
              </select>

              {/* Signal State */}
              <select
                value={selectedSignalState}
                onChange={(e) => setSelectedSignalState(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-[#060A14] border border-[#1F2E47] text-slate-300"
              >
                <option value="ALL">Signal: All</option>
                <option value="READY">READY</option>
                <option value="SETUP_FORMING">SETUP_FORMING</option>
                <option value="WATCHING">WATCHING</option>
                <option value="NO_SETUP">NO_SETUP</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>

              {/* Regime Filter */}
              <select
                value={selectedRegime}
                onChange={(e) => setSelectedRegime(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-[#060A14] border border-[#1F2E47] text-slate-300"
              >
                <option value="ALL">Regime: All</option>
                <option value="TRENDING">TRENDING</option>
                <option value="RANGING">RANGING</option>
                <option value="BREAKOUT / EXPANSION">BREAKOUT / EXPANSION</option>
                <option value="HIGH VOLATILITY">HIGH VOLATILITY</option>
                <option value="LOW VOLATILITY">LOW VOLATILITY</option>
                <option value="STRUCTURAL REVERSAL">STRUCTURAL REVERSAL</option>
              </select>

              {/* Display Mode Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-[#060A14] border border-[#1F2E47]">
                <button
                  onClick={() => setViewDisplayMode("CARDS")}
                  className={`p-1 rounded-lg ${
                    viewDisplayMode === "CARDS" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-500 hover:text-slate-300"
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewDisplayMode("TABLE")}
                  className={`p-1 rounded-lg ${
                    viewDisplayMode === "TABLE" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-500 hover:text-slate-300"
                  }`}
                  title="Table Matrix View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 30 Strategies Display: Cards Mode */}
          {viewDisplayMode === "CARDS" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStrategies.map((strat) => {
                const signalReport = signalReports[strat.number];
                const signalState: StrategySignalState = signalReport?.signalState || "NO_SETUP";
                const isPaperActive = paperInstances.some((inst) => inst.strategyNumber === strat.number);

                return (
                  <div
                    key={strat.id}
                    className="p-5 rounded-2xl bg-[#0C1220] hover:bg-[#0E1628] border border-[#1E2E4A] hover:border-cyan-500/40 shadow-xl transition-all flex flex-col justify-between space-y-4 group"
                  >
                    {/* Top Row: Number, Name, Category */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-xs">
                            {strat.number}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#16233B] text-slate-300 font-semibold uppercase">
                            {strat.category}
                          </span>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getSignalBadgeColor(signalState)}`}>
                          {signalState}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition tracking-wide">
                          {strat.name}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {strat.whatItDoes}
                        </p>
                      </div>
                    </div>

                    {/* Metadata Specs Grid */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#070D18] border border-[#162238] text-[11px] font-mono text-slate-400">
                      <div>
                        <span className="text-[9px] text-slate-500 block">TIMEFRAME</span>
                        <span className="text-white font-bold">{strat.primaryTimeframe}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">DIRECTION</span>
                        <span className="text-cyan-300 font-bold">{strat.direction}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">COMPLEXITY</span>
                        <span className="text-white font-bold">{strat.complexity}</span>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#162238] gap-1.5 text-xs font-mono">
                      <button
                        onClick={() => handleOpenDetail(strat.id)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-[#142036] hover:bg-[#1E3052] text-slate-200 hover:text-white font-bold transition text-center"
                      >
                        VIEW
                      </button>

                      <button
                        onClick={() => handleOpenBacktest(strat.number)}
                        className="py-1.5 px-2.5 rounded-lg bg-[#142036] hover:bg-[#1E3052] text-cyan-300 hover:text-cyan-200 font-bold transition flex items-center gap-1"
                        title="Run historical backtest"
                      >
                        <FlaskConical className="h-3 w-3" />
                        <span>TEST</span>
                      </button>

                      <button
                        onClick={() => handleActivatePaper(strat.number)}
                        className={`py-1.5 px-2.5 rounded-lg font-bold transition flex items-center gap-1 ${
                          isPaperActive
                            ? "bg-emerald-600 text-white"
                            : "bg-[#142036] hover:bg-[#1E3052] text-emerald-400"
                        }`}
                        title="Activate forward paper execution"
                      >
                        <Radio className="h-3 w-3" />
                        <span>{isPaperActive ? "ACTIVE" : "PAPER"}</span>
                      </button>

                      <button
                        onClick={() => handleCreateBotFromStrategy(strat)}
                        className="py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 border border-purple-500/40 text-purple-300 font-bold transition"
                        title="Create autonomous Bot Instance"
                      >
                        <Bot className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 30 Strategies Display: Table Matrix Mode */}
          {viewDisplayMode === "TABLE" && (
            <div className="p-4 rounded-2xl bg-[#090E1A] border border-[#1E293B] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-[#1A2840] text-slate-400 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Strategy Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Timeframe</th>
                      <th className="py-2.5 px-3">Market</th>
                      <th className="py-2.5 px-3">Direction</th>
                      <th className="py-2.5 px-3">Complexity</th>
                      <th className="py-2.5 px-3">Signal State</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#152033]">
                    {filteredStrategies.map((strat) => {
                      const signalReport = signalReports[strat.number];
                      const signalState: StrategySignalState = signalReport?.signalState || "NO_SETUP";

                      return (
                        <tr key={strat.id} className="hover:bg-[#0E172A] transition">
                          <td className="py-2.5 px-3 font-bold text-cyan-400">#{strat.number}</td>
                          <td className="py-2.5 px-3 text-white font-bold">{strat.name}</td>
                          <td className="py-2.5 px-3 text-slate-400">{strat.category}</td>
                          <td className="py-2.5 px-3 text-white">{strat.primaryTimeframe}</td>
                          <td className="py-2.5 px-3 text-slate-300">{strat.market}</td>
                          <td className="py-2.5 px-3 text-cyan-300">{strat.direction}</td>
                          <td className="py-2.5 px-3 text-slate-300">{strat.complexity}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSignalBadgeColor(signalState)}`}>
                              {signalState}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenDetail(strat.id)}
                                className="px-2 py-1 rounded bg-[#16233B] hover:bg-[#203252] text-white text-[11px] font-bold"
                              >
                                VIEW
                              </button>
                              <button
                                onClick={() => handleOpenBacktest(strat.number)}
                                className="px-2 py-1 rounded bg-[#16233B] hover:bg-[#203252] text-cyan-300 text-[11px] font-bold"
                              >
                                BACKTEST
                              </button>
                              <button
                                onClick={() => handleActivatePaper(strat.number)}
                                className="px-2 py-1 rounded bg-[#16233B] hover:bg-[#203252] text-emerald-300 text-[11px] font-bold"
                              >
                                PAPER
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Strategy Detail Modal */}
      <StrategyDetailModal
        strategy={selectedStrategy}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onOpenBacktest={handleOpenBacktest}
        onActivatePaper={handleActivatePaper}
        onCreateBot={handleCreateBotFromStrategy}
      />
    </div>
  );
}
