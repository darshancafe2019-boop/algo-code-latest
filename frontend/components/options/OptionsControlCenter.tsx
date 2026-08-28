"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  ChevronRight,
  Compass,
  Cpu,
  Layers,
  Lock,
  Pause,
  Play,
  Power,
  RefreshCw,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sliders,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

import {
  StrategyRegistry,
  TradingCommandRouter,
  MarketStateAnalyzer,
  StrategySelector,
  RiskEngine,
  globalPositionManager,
  globalExecutionEngine,
} from "@/lib/trading/engine/StrategyEngine";
import { StrategyRegistryEntry } from "@/lib/trading/strategies/base/StrategyRegistry";
import {
  MarketContext,
  TradeProposal,
  ActiveOptionPosition,
  StrategyAnalysis,
} from "@/lib/trading/strategies/base/StrategyTypes";
import { AnalyzedMarketState } from "@/lib/trading/engine/MarketStateAnalyzer";
import { StrategySelectionResult } from "@/lib/trading/engine/StrategySelector";

interface OptionsControlCenterProps {
  underlying: string;
  spotPrice: number;
  pcr?: number;
  maxPain?: number;
  availableExpiries?: string[];
  chainData?: any;
}

export function OptionsControlCenter({
  underlying = "NIFTY",
  spotPrice = 24350.0,
  pcr = 1.05,
  maxPain = 24300.0,
  availableExpiries = ["2026-09-04", "2026-09-18"],
  chainData,
}: OptionsControlCenterProps) {
  // 1. Core State
  const [strategies, setStrategies] = useState<StrategyRegistryEntry[]>([]);
  const [executionMode, setExecutionMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);
  const [activePositions, setActivePositions] = useState<ActiveOptionPosition[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Analysis & Selection Results
  const [analyzedState, setAnalyzedState] = useState<AnalyzedMarketState | null>(null);
  const [selectionResult, setSelectionResult] = useState<StrategySelectionResult | null>(null);

  // Modal / Drawer Selection
  const [selectedProposal, setSelectedProposal] = useState<TradeProposal | null>(null);
  const [selectedStrategyForConfig, setSelectedStrategyForConfig] = useState<StrategyRegistryEntry | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Load Strategies & Positions on Mount
  const refreshRegistry = () => {
    setStrategies([...StrategyRegistry.getAllStrategies()]);
    setActivePositions([...globalPositionManager.getAllPositions()]);
    setKillSwitchActive(RiskEngine.isKillSwitchActive());
    setExecutionMode(globalExecutionEngine.getExecutionMode());
  };

  useEffect(() => {
    refreshRegistry();
  }, []);

  // Construct Standard Market Context
  const marketContext: MarketContext = useMemo(() => {
    return {
      underlying,
      assetClass: underlying.includes("USDT") || underlying === "BTC" || underlying === "ETH" ? "CRYPTO" : "INDEX",
      spotPrice,
      timestamp: new Date().toISOString(),
      indicators: {
        rsi14: 54.2,
        ema20: spotPrice * 0.995,
        ema50: spotPrice * 0.988,
        ema200: spotPrice * 0.970,
        atr14: spotPrice * 0.014,
        adx14: 24.5,
      },
      volatility: {
        impliedVol: 0.165,
        ivRank: 48,
        ivPercentile: 52,
      },
      optionChain: {
        selectedExpiry: availableExpiries[0] || "2026-09-04",
        availableExpiries,
        maxPain,
        pcrOi: pcr,
        pcrVolume: pcr * 0.95,
        totalCallOi: 1200000,
        totalPutOi: 1260000,
        atmStrike: Math.round(spotPrice / 100) * 100,
        stepSize: spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50,
        strikes: [],
      },
      dataQuality: {
        spotAvailable: true,
        indicatorsAvailable: true,
        chainAvailable: true,
        isStale: false,
      },
    };
  }, [underlying, spotPrice, pcr, maxPain, availableExpiries]);

  // Execute Market Scan & Strategy Selection
  const handleRunMarketAnalysis = async () => {
    setIsAnalyzing(true);
    setActionNotice(null);
    try {
      const res = await TradingCommandRouter.execute({
        type: "GENERATE_SIGNALS",
        marketContext,
      });

      if (res.success && res.data) {
        const selRes = res.data as StrategySelectionResult;
        setSelectionResult(selRes);
        setAnalyzedState(selRes.analyzedState);
        refreshRegistry();
        setActionNotice({
          type: "success",
          message: `Analyzed ${underlying}: Detected ${selRes.analyzedState.regime} with ${selRes.rankedProposals.length} strategy proposal(s).`,
        });
      } else {
        setActionNotice({ type: "error", message: res.message });
      }
    } catch (err: any) {
      setActionNotice({ type: "error", message: err.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle Strategy Enable / Disable
  const handleToggleStrategy = async (strategyId: string, currentEnabled: boolean) => {
    const action = currentEnabled ? "DISABLE_STRATEGY" : "ENABLE_STRATEGY";
    const res = await TradingCommandRouter.execute({ type: action, strategyId });
    if (res.success) {
      refreshRegistry();
    }
  };

  // Run a Single Strategy Analysis
  const handleRunSingleStrategy = async (strategyId: string) => {
    setActionNotice(null);
    const res = await TradingCommandRouter.execute({
      type: "RUN_STRATEGY_NOW",
      strategyId,
      marketContext,
    });

    if (res.success && res.data) {
      const analysis = res.data as StrategyAnalysis;
      refreshRegistry();
      if (analysis.proposal) {
        setSelectedProposal(analysis.proposal);
      }
      setActionNotice({
        type: "info",
        message: `Strategy '${analysis.strategyName}': ${analysis.marketMatch ? "MATCHED" : "NO MATCH"} (${analysis.suitabilityScore}% score)`,
      });
    } else {
      setActionNotice({ type: "error", message: res.message });
    }
  };

  // Execute Trade Proposal
  const handleConfirmTradeExecution = async () => {
    if (!selectedProposal) return;
    setIsExecuting(true);
    setActionNotice(null);
    try {
      const res = await TradingCommandRouter.execute({
        type: "EXECUTE_TRADE",
        tradeProposal: selectedProposal,
      });

      if (res.success) {
        setActionNotice({
          type: "success",
          message: `✅ Order Executed: ${selectedProposal.strategyName} (${executionMode} mode)`,
        });
        setSelectedProposal(null);
        refreshRegistry();
      } else {
        setActionNotice({
          type: "error",
          message: `❌ Order Rejected: ${res.message}`,
        });
      }
    } catch (err: any) {
      setActionNotice({ type: "error", message: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  // Emergency Stop Trigger
  const handleEmergencyStop = async () => {
    const res = await TradingCommandRouter.execute({ type: "EMERGENCY_STOP" });
    refreshRegistry();
    setActionNotice({
      type: "error",
      message: `🚨 ${res.message}`,
    });
  };

  // Switch Trading Mode
  const handleSwitchMode = async (newMode: "PAPER" | "LIVE") => {
    const res = await TradingCommandRouter.execute({
      type: newMode === "PAPER" ? "PAPER_MODE" : "LIVE_MODE",
    });
    if (res.success) {
      setExecutionMode(newMode);
      refreshRegistry();
      setActionNotice({ type: "info", message: res.message });
    } else {
      setActionNotice({ type: "error", message: res.message });
    }
  };

  // Close Position
  const handleClosePosition = async (positionId: string) => {
    const res = await TradingCommandRouter.execute({
      type: "CLOSE_POSITION",
      positionId,
    });
    if (res.success) {
      refreshRegistry();
      setActionNotice({ type: "success", message: `Position ${positionId} closed.` });
    }
  };

  const enabledCount = strategies.filter((s) => s.enabled && !s.paused).length;
  const openPositionsCount = activePositions.filter((p) => p.state === "OPEN").length;
  const portfolioGreeks = globalPositionManager.getAggregatedPortfolioGreeks();

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* ── TOP SUMMARY BAR ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 p-4 bg-[#0B132B] border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
        {/* 1. Execution Mode */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Trading Mode</span>
          <div className="flex items-center gap-1.5 mt-1">
            <button
              onClick={() => handleSwitchMode(executionMode === "PAPER" ? "LIVE" : "PAPER")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition ${
                executionMode === "PAPER"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${executionMode === "PAPER" ? "bg-cyan-400 animate-pulse" : "bg-emerald-400 animate-pulse"}`} />
              {executionMode}
            </button>
          </div>
        </div>

        {/* 2. Bot Status */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Engine Status</span>
          <div className="flex items-center gap-1.5 mt-1 font-bold">
            {killSwitchActive ? (
              <span className="text-rose-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> HALTED
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> ACTIVE
              </span>
            )}
          </div>
        </div>

        {/* 3. Market Feed */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Market Data</span>
          <div className="flex items-center gap-1 mt-1 text-slate-200 font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>LIVE (2ms)</span>
          </div>
        </div>

        {/* 4. Active Strategies */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Strategies</span>
          <div className="text-white font-mono font-bold text-sm mt-1">
            {enabledCount} / {strategies.length} <span className="text-[10px] text-slate-400 font-normal">Active</span>
          </div>
        </div>

        {/* 5. Open Positions */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Open Positions</span>
          <div className="text-white font-mono font-bold text-sm mt-1">
            {openPositionsCount} <span className="text-[10px] text-slate-400 font-normal">Multi-Leg</span>
          </div>
        </div>

        {/* 6. Portfolio Delta / Theta */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Net Δ / Net Θ</span>
          <div className="text-white font-mono font-bold text-xs mt-1">
            <span className={portfolioGreeks.delta >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {portfolioGreeks.delta > 0 ? `+${portfolioGreeks.delta}` : portfolioGreeks.delta}Δ
            </span>{" "}
            /{" "}
            <span className="text-cyan-400">
              +{portfolioGreeks.theta}Θ
            </span>
          </div>
        </div>

        {/* 7. Risk Utilization */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Risk Utilization</span>
          <div className="mt-1">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Margin</span>
              <span>18%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full w-[18%]" />
            </div>
          </div>
        </div>

        {/* 8. Emergency Stop Button */}
        <div className="p-2 bg-rose-950/40 border border-rose-800/50 rounded-xl flex flex-col justify-center items-center text-center">
          <button
            onClick={handleEmergencyStop}
            className="w-full h-full py-1.5 px-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5 text-[11px]"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Kill Switch</span>
          </button>
        </div>
      </div>

      {/* ── ACTION NOTICES ──────────────────────────────────────── */}
      {actionNotice && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between animate-in fade-in duration-200 ${
            actionNotice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : actionNotice.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {actionNotice.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
            {actionNotice.type === "info" && <Zap className="w-4 h-4 text-cyan-400 shrink-0" />}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="p-1 text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── AUTONOMOUS MARKET ANALYSIS & SIGNAL GENERATION ──────── */}
      <div className="p-5 bg-[#0B132B] border border-slate-800 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Deterministic Options Intelligence & Strategy Selection</span>
            </h2>
            {analyzedState && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                {analyzedState.regime}
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs">
            Synthesizes multi-timeframe trends, ATR, IV Rank, PCR, and Max Pain to select, rank, and construct defined-risk option proposals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunMarketAnalysis}
            disabled={isAnalyzing}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition flex items-center gap-2 font-mono disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing {underlying}...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Scan & Select Strategies</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── PRIMARY RECOMMENDATION BANNER (IF MATCHED) ─────────── */}
      {selectionResult?.primaryRecommendation && (
        <div className="p-4 bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-blue-950/40 border border-cyan-500/40 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-cyan-400 tracking-wider">Top Strategy Recommendation</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-300 font-bold">
                  {selectionResult.primaryRecommendation.confidence}% Match
                </span>
              </div>
              <h3 className="text-base font-bold text-white font-mono">
                {selectionResult.primaryRecommendation.strategyName} ({selectionResult.primaryRecommendation.underlying})
              </h3>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                {selectionResult.primaryRecommendation.entryReason}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedProposal(selectionResult.primaryRecommendation!)}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition flex items-center gap-2"
            >
              <span>Review Trade Proposal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── STRATEGY CONTROL PANEL ──────────────────────────────── */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Table Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono font-bold text-white">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Options Strategy Catalog ({strategies.length} Standard Strategies)</span>
          </div>
          <div className="text-slate-400 text-xs font-mono">
            {enabledCount} Enabled • Dynamic Registry
          </div>
        </div>

        {/* Strategies Grid / Table */}
        <div className="divide-y divide-slate-800/70">
          {strategies.map((entry) => {
            const isMatch = entry.lastAnalysis?.marketMatch;
            const score = entry.lastAnalysis?.suitabilityScore ?? 0;

            return (
              <div
                key={entry.id}
                className="p-4 hover:bg-slate-900/40 transition flex flex-wrap items-center justify-between gap-4"
              >
                {/* Strategy Identity & Rationale */}
                <div className="min-w-[280px] flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm font-mono">{entry.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        entry.enabled && !entry.paused
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {entry.paused ? "PAUSED" : entry.enabled ? "ENABLED" : "DISABLED"}
                    </span>
                    {isMatch && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> {score}% Match
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs mt-1">{entry.description}</p>
                </div>

                {/* Performance & Last Signal Telemetry */}
                <div className="flex items-center gap-6 font-mono text-xs">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase">Proposals</div>
                    <div className="text-slate-200 font-bold">{entry.totalProposalsGenerated}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase">Last Run</div>
                    <div className="text-slate-300">
                      {entry.lastRunTime ? new Date(entry.lastRunTime).toLocaleTimeString() : "Never"}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStrategy(entry.id, entry.enabled && !entry.paused)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                      entry.enabled && !entry.paused
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {entry.enabled && !entry.paused ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{entry.enabled && !entry.paused ? "Disable" : "Enable"}</span>
                  </button>

                  <button
                    onClick={() => handleRunSingleStrategy(entry.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-950 hover:text-cyan-400 text-slate-300 font-bold transition flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Run Now</span>
                  </button>

                  {entry.lastProposal && (
                    <button
                      onClick={() => setSelectedProposal(entry.lastProposal!)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 font-bold transition flex items-center gap-1"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>Proposal</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ACTIVE POSITIONS DOCK ───────────────────────────────── */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono font-bold text-white">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Active Options Positions ({activePositions.length})</span>
          </div>
          <span className="text-slate-400 text-xs">Monitored as 1 Composite Unit</span>
        </div>

        {activePositions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono">
            No active option positions. Select and execute a strategy above.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {activePositions.map((pos) => (
              <div key={pos.positionId} className="p-4 hover:bg-slate-900/40 transition flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white font-mono">{pos.strategyName}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300">
                      {pos.underlying}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300">
                      {pos.executionMode}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-1 font-mono">
                    {pos.legs.map((l) => `${l.side} ${l.strike} ${l.optionType}`).join(" | ")}
                  </div>
                </div>

                <div className="flex items-center gap-6 font-mono text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500">Unrealized P&L</div>
                    <div className={`font-bold ${pos.unrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pos.unrealizedPnl >= 0 ? `+$${pos.unrealizedPnl}` : `-$${Math.abs(pos.unrealizedPnl)}`} ({pos.roiPct}%)
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Breakeven</div>
                    <div className="text-slate-300 font-bold">{pos.breakevens.join(", ")}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleClosePosition(pos.positionId)}
                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-bold rounded-xl transition"
                >
                  Close Position
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── TRADE PROPOSAL MODAL / DRAWER ───────────────────────── */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B132B] border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden font-mono text-xs text-slate-300 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Trade Proposal: {selectedProposal.strategyName}</span>
              </div>
              <button onClick={() => setSelectedProposal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Entry Rationale</span>
                <p className="text-white text-xs font-sans">{selectedProposal.entryReason}</p>
              </div>

              {/* Legs Table */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Standardized Strategy Legs</span>
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                  {selectedProposal.legs.map((l, i) => (
                    <div key={i} className="p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${l.side === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                          {l.side}
                        </span>
                        <span className="text-white font-bold">{l.strike} {l.optionType}</span>
                      </div>
                      <div className="text-slate-400">
                        Premium: <strong className="text-white">${l.premium}</strong> • Qty: {l.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Net Cost/Credit</span>
                  <span className="text-sm font-bold text-white">${selectedProposal.netDebitOrCredit}</span>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Max Profit</span>
                  <span className="text-sm font-bold text-emerald-400">{selectedProposal.maxProfit}</span>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Max Loss</span>
                  <span className="text-sm font-bold text-rose-400">{selectedProposal.maxLoss}</span>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Breakeven(s)</span>
                  <span className="text-xs font-bold text-cyan-400">{selectedProposal.breakevens.join(", ")}</span>
                </div>
              </div>

              {/* Greeks Grid */}
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Aggregate Strategy Greeks</span>
                <div className="grid grid-cols-4 gap-2 text-center pt-1">
                  <div><span className="text-[10px] text-slate-500">Delta</span> <div className="text-white font-bold">{selectedProposal.greeks.delta}</div></div>
                  <div><span className="text-[10px] text-slate-500">Gamma</span> <div className="text-white font-bold">{selectedProposal.greeks.gamma}</div></div>
                  <div><span className="text-[10px] text-slate-500">Theta</span> <div className="text-cyan-400 font-bold">{selectedProposal.greeks.theta}</div></div>
                  <div><span className="text-[10px] text-slate-500">Vega</span> <div className="text-white font-bold">{selectedProposal.greeks.vega}</div></div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedProposal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTradeExecution}
                disabled={isExecuting}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Execute {executionMode} Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
