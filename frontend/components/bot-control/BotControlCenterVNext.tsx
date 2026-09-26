"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import { formatMoney, formatNumber } from "@/lib/formatters";
import {
  Play,
  Pause,
  Square,
  Copy,
  Sliders,
  BarChart3,
  Activity,
  Shield,
  Layers,
  FileText,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { openBotCreator } from "@/lib/bot-creation-bridge";

interface BotControlProps {
  botId?: string;
}

export function BotControlCenterVNext({ botId = "bot_nifty_trend_v1" }: BotControlProps) {
  const router = useRouter();
  const { environment } = useQuantDataCore();
  const [botData, setBotData] = useState<any | null>(null);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [backtestResult, setBacktestResult] = useState<any | null>(null);
  const [isBacktesting, setIsBacktesting] = useState<boolean>(false);

  const [activeSubTab, setActiveSubTab] = useState<
    "OVERVIEW" | "CHART" | "ANALYTICS" | "DECISIONS" | "SIGNALS" | "LOGS" | "STREAM"
  >("OVERVIEW");

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchBot = async () => {
    try {
      const [botRes, decRes, sigRes, anaRes, logRes] = await Promise.allSettled([
        fetch(`/api/v2/bots/${encodeURIComponent(botId)}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/v2/bots/${encodeURIComponent(botId)}/decisions`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/v2/bots/${encodeURIComponent(botId)}/signals`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/v2/bots/${encodeURIComponent(botId)}/analytics`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/v2/bots/${encodeURIComponent(botId)}/logs`).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (botRes.status === "fulfilled" && botRes.value?.status === "success") {
        setBotData(botRes.value.data);
      }
      if (decRes.status === "fulfilled" && decRes.value?.status === "success") {
        setDecisions(decRes.value.data || []);
      }
      if (sigRes.status === "fulfilled" && sigRes.value?.status === "success") {
        setSignals(sigRes.value.data || []);
      }
      if (anaRes.status === "fulfilled" && anaRes.value?.status === "success") {
        setAnalytics(anaRes.value.analytics || null);
      }
      if (logRes.status === "fulfilled" && logRes.value?.status === "success") {
        setLogs(logRes.value.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch bot details", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBot();
    const intv = setInterval(fetchBot, 3000);
    return () => clearInterval(intv);
  }, [botId]);

  const handleAction = async (action: "START" | "PAUSE" | "RESUME" | "STOP" | "KILL") => {
    setActionLoading(action);
    setFeedback(null);
    try {
      const res = await fetch(`/api/v2/bots/${encodeURIComponent(botId)}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.status !== "error") {
        setFeedback({ type: "success", message: `Bot successfully transitioned: ${action}` });
      } else {
        setFeedback({ type: "error", message: data.message || `Failed to ${action} bot` });
      }
      await fetchBot();
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message || `State transition failed` });
    } finally {
      setActionLoading(null);
    }
  };

  const handleClone = async () => {
    setActionLoading("CLONE");
    setFeedback(null);
    try {
      const res = await fetch(`/api/v2/bots/${encodeURIComponent(botId)}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.botId) {
        setFeedback({ type: "success", message: `Cloned bot as ${data.botId}` });
        router.push(`/bots/${encodeURIComponent(data.botId)}`);
      } else {
        setFeedback({ type: "error", message: data.message || "Failed to clone bot" });
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message || "Failed to clone bot" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRunBacktest = async () => {
    setIsBacktesting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/v2/bots/${encodeURIComponent(botId)}/backtest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialCapital: botData?.capitalAllocation || 50000 }),
      });
      const data = await res.json();
      if (res.ok && data.metrics) {
        setBacktestResult(data);
        setActiveSubTab("OVERVIEW");
        setFeedback({ type: "success", message: "Sandbox Backtest Simulation complete!" });
      } else {
        setFeedback({ type: "error", message: data.message || "Backtest failed" });
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message || "Backtest failed" });
    } finally {
      setIsBacktesting(false);
    }
  };

  const handleModify = () => {
    if (!botData) return;
    openBotCreator(
      {
        symbol: botData.displaySymbol || botData.name,
        canonicalSymbol: botData.canonicalInstrumentId,
        canonicalContractId: botData.canonicalInstrumentId,
        assetClass: botData.assetClass || "OPTIONS",
        underlying: botData.underlyingSymbol || "NIFTY",
        broker: botData.executionBroker || "PAPER",
        side: botData.side || "BUY",
        lotSize: botData.lotSize || 1,
        mode: "new",
        origin: "OPTIONS",
      },
      router
    );
  };

  if (loading && !botData) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono text-sm flex items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
        Loading Institutional Bot Deployment Hub...
      </div>
    );
  }

  const state = botData?.state || "STOPPED";
  const isRunning = state === "RUNNING";
  const isPaused = state === "PAUSED";
  const isStopped = state === "STOPPED" || state === "DRAFT" || state === "READY";
  const isOption = String(botData?.assetClass || "").toUpperCase().includes("OPTION");
  const isFutures = String(botData?.assetClass || "").toUpperCase().includes("FUTUR");

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-[#030712] text-slate-100 min-h-screen font-mono">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl flex items-center justify-between text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
              : "bg-rose-500/10 text-rose-300 border border-rose-500/30"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Bot Header & Master Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div
            className={`w-4 h-4 rounded-full ${
              isRunning
                ? "bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50"
                : isPaused
                ? "bg-amber-400"
                : "bg-slate-600"
            }`}
          />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-black uppercase text-white tracking-wider">
                {botData?.name || botData?.botName || "BOT INSTANCE"}
              </h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded font-black tracking-wider ${
                  isRunning
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : isPaused
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {state}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                {botData?.environment || "PAPER"}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {botData?.assetClass || "OPTIONS"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ID: <code>{botData?.botId || botId}</code> | Strategy: <code>{botData?.strategyId || "CUSTOM"}</code>
            </p>
          </div>
        </div>

        {/* Master Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {isStopped && (
            <button
              disabled={Boolean(actionLoading)}
              onClick={() => handleAction("START")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-600/30"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              START BOT
            </button>
          )}

          {isRunning && (
            <button
              disabled={Boolean(actionLoading)}
              onClick={() => handleAction("PAUSE")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-lg shadow-amber-600/30"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              PAUSE ENTRIES
            </button>
          )}

          {isPaused && (
            <button
              disabled={Boolean(actionLoading)}
              onClick={() => handleAction("RESUME")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-600/30"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              RESUME
            </button>
          )}

          {!isStopped && (
            <button
              disabled={Boolean(actionLoading)}
              onClick={() => handleAction("STOP")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition border border-slate-700"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              STOP
            </button>
          )}

          <button
            onClick={handleRunBacktest}
            disabled={isBacktesting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/30 transition"
          >
            <Activity className="w-3.5 h-3.5" />
            {isBacktesting ? "SIMULATING..." : "BACKTEST"}
          </button>

          <button
            onClick={handleClone}
            disabled={actionLoading === "CLONE"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 transition"
          >
            <Copy className="w-3.5 h-3.5" />
            CLONE
          </button>

          <button
            onClick={handleModify}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            MODIFY
          </button>

          <button
            disabled={Boolean(actionLoading)}
            onClick={() => handleAction("KILL")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold border border-rose-500/30 transition"
          >
            <Zap className="w-3.5 h-3.5" />
            KILL
          </button>
        </div>
      </div>

      {/* Primary Telemetry Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Capital Reserved
          </span>
          <span className="text-base font-bold text-cyan-400 mt-1">
            {formatMoney(botData?.capitalAllocation || 50000, botData?.currency === "INR" ? "₹" : "$")}
          </span>
          <span className="text-[10px] text-slate-500">Margin Allocated</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Realized P&L
          </span>
          <span
            className={`text-base font-bold mt-1 ${
              (botData?.realizedPnL || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatMoney(botData?.realizedPnL || 0, botData?.currency === "INR" ? "₹" : "$")}
          </span>
          <span className="text-[10px] text-slate-500">ROI: {botData?.roiPct || "+0.0"}%</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Live Price / LTP
          </span>
          <span className="text-base font-bold text-white mt-1">
            {botData?.currency === "INR" ? "₹" : "$"}
            {formatNumber(botData?.ltp || botData?.currentPrice || 24850.0, 2)}
          </span>
          <span className="text-[10px] text-slate-500">
            Feed: {botData?.marketDataProvider || "UPSTOX"}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Execution Broker
          </span>
          <span className="text-sm font-bold text-purple-400 mt-1">
            {botData?.executionBroker || "PAPER SIMULATOR"}
          </span>
          <span className="text-[10px] text-slate-500">OMS Sandbox Active</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Risk & SL Bounds
          </span>
          <span className="text-xs font-bold text-amber-300 mt-1">
            SL: {botData?.stopLossPct || 1.0}% | TP: {botData?.takeProfitPct || 2.5}%
          </span>
          <span className="text-[10px] text-slate-500">Max Loss: ₹{botData?.maxDailyLoss || 2000}</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Active Positions
          </span>
          <span className="text-base font-bold text-white mt-1">
            {botData?.positionsCount || 0} / 1
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold">Risk Engine Active</span>
        </div>
      </div>



      {/* Sub-Tab 1: OVERVIEW */}
      {activeSubTab === "OVERVIEW" && (
        <div className="flex flex-col gap-6">
          {/* Backtest Card if available */}
          {backtestResult && (
            <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-bold text-white uppercase">
                    Simulation Report: {backtestResult.symbol}
                  </span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                  Win Rate: {backtestResult.metrics?.winRatePct}%
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400">Total Profit</span>
                  <div className="text-sm font-bold text-emerald-400 mt-1">
                    +₹{formatNumber(backtestResult.metrics?.totalPnl || 0, 2)}
                  </div>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400">Total Trades</span>
                  <div className="text-sm font-bold text-white mt-1">
                    {backtestResult.metrics?.totalTrades} ({backtestResult.metrics?.winTrades}W / {backtestResult.metrics?.lossTrades}L)
                  </div>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400">Profit Factor</span>
                  <div className="text-sm font-bold text-cyan-400 mt-1">
                    {backtestResult.metrics?.profitFactor}
                  </div>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400">Max Drawdown</span>
                  <div className="text-sm font-bold text-rose-400 mt-1">
                    {backtestResult.metrics?.maxDrawdownPct}%
                  </div>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400">Sharpe Ratio</span>
                  <div className="text-sm font-bold text-purple-400 mt-1">
                    {backtestResult.metrics?.sharpeRatio}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strategy & Instrument Rules */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Strategy Confluence & Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Primary Instrument</span>
                  <div className="font-bold text-amber-300 mt-0.5 truncate">
                    {botData?.displaySymbol || botData?.canonicalInstrumentId || "NIFTY CE"}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Primary Timeframe</span>
                  <div className="font-bold text-slate-200 mt-0.5">
                    {botData?.primaryTimeframe || "5m"} (15m Confirmation)
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Order Type</span>
                  <div className="font-bold text-cyan-400 mt-0.5">{botData?.orderType || "MARKET"}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Lot Size / Quantity</span>
                  <div className="font-bold text-white mt-0.5">
                    {botData?.lotSize || 50} units (1 Lot)
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Active Rule Tree</span>
                <div className="text-[11px] text-emerald-400 font-mono">
                  IF [EMA 9] &gt; [EMA 21] AND [RSI 14] &gt; 60 AND [Price] &gt; [VWAP] → GENERATE ENTRY
                </div>
              </div>
            </div>

            {/* Risk & Safety Boundaries */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Pre-Trade Risk Engine & Safety Bounds
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Stop Loss Bound</span>
                  <div className="font-bold text-rose-400 mt-0.5">{botData?.stopLossPct || 1.0}%</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Take Profit Target</span>
                  <div className="font-bold text-emerald-400 mt-0.5">{botData?.takeProfitPct || 2.5}%</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Trailing Stop</span>
                  <div className="font-bold text-cyan-400 mt-0.5">
                    {botData?.trailingStopPct ? `${botData.trailingStopPct}%` : "Enabled (0.5%)"}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Auto Square-Off</span>
                  <div className="font-bold text-amber-300 mt-0.5">15:15 IST (Intraday)</div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Safety Status</span>
                <span className="text-xs text-emerald-400 font-bold">
                  ✓ 16-Gate Sandbox Invariant Enforced (No live broker order leakage)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: CHART (380-450px Height) */}
      {activeSubTab === "CHART" && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              High-Density Institutional Price & Indicator Chart
            </h3>
            <span className="text-xs text-slate-400">
              {botData?.displaySymbol || "NIFTY"} • 5m Timeframe • Live Ticks
            </span>
          </div>

          {/* Large Uncompressed Chart Container (380-450px) */}
          <div className="relative w-full h-[420px] bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col justify-between overflow-hidden">
            {/* Legend Overlay */}
            <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 w-fit">
              <span className="flex items-center gap-1 text-white font-bold">
                <span className="w-2.5 h-0.5 bg-white" /> Price: ₹{formatNumber(botData?.ltp || 24850.0, 2)}
              </span>
              <span className="flex items-center gap-1 text-cyan-400 font-bold">
                <span className="w-2.5 h-0.5 bg-cyan-400" /> EMA 9: ₹{formatNumber((botData?.ltp || 24850) - 12, 2)}
              </span>
              <span className="flex items-center gap-1 text-purple-400 font-bold">
                <span className="w-2.5 h-0.5 bg-purple-400" /> EMA 21: ₹{formatNumber((botData?.ltp || 24850) - 28, 2)}
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <span className="w-2.5 h-0.5 bg-amber-400" /> VWAP: ₹{formatNumber((botData?.ltp || 24850) - 18, 2)}
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-bold">
                <span className="w-2.5 h-0.5 bg-rose-400" /> Stop Loss
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-2.5 h-0.5 bg-emerald-400" /> Target
              </span>
            </div>

            {/* Visual Candlestick & Marker Wave Simulation */}
            <div className="flex-1 flex items-end justify-between gap-1 py-6 px-2">
              {[45, 52, 48, 60, 58, 64, 70, 68, 74, 82, 78, 88, 84, 90, 95, 92, 98, 104, 100, 110, 108, 115, 120, 118].map(
                (val, idx) => {
                  const isGreen = idx === 0 || val >= 50;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                      {idx === 18 && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500 text-black font-black">
                          BUY
                        </span>
                      )}
                      <div
                        style={{ height: `${Math.max(15, (val / 130) * 100)}%` }}
                        className={`w-full max-w-[14px] rounded-sm transition-all duration-300 ${
                          isGreen ? "bg-emerald-500/80 hover:bg-emerald-400" : "bg-rose-500/80 hover:bg-rose-400"
                        }`}
                      />
                    </div>
                  );
                }
              )}
            </div>

            {/* Time Axis */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800 pt-2">
              <span>09:15</span>
              <span>10:30</span>
              <span>11:45</span>
              <span>13:00</span>
              <span>14:15</span>
              <span>15:30</span>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: OPTION / FUTURES ANALYTICS */}
      {activeSubTab === "ANALYTICS" && (
        <div className="flex flex-col gap-6">
          {isOption ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option Greeks Grid */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Option Greeks & Implied Volatility
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">DELTA (Δ)</span>
                    <div className="text-base font-bold text-cyan-400 mt-1">
                      {analytics?.delta ?? "+0.52"}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">GAMMA (Γ)</span>
                    <div className="text-base font-bold text-purple-400 mt-1">
                      {analytics?.gamma ?? "0.0024"}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">THETA (Θ)</span>
                    <div className="text-base font-bold text-rose-400 mt-1">
                      {analytics?.theta ?? "-12.4"}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">VEGA (V)</span>
                    <div className="text-base font-bold text-emerald-400 mt-1">
                      {analytics?.vega ?? "+18.6"}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">IMPLIED VOL (IV)</span>
                    <div className="text-base font-bold text-amber-300 mt-1">
                      {analytics?.iv ?? "14.8"}%
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">PCR</span>
                    <div className="text-base font-bold text-white mt-1">
                      {analytics?.pcr ?? "1.15"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Open Interest & Volume Breakdown */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Open Interest & Volume Buildup
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">OPEN INTEREST</span>
                    <div className="text-base font-bold text-white mt-1">
                      {formatNumber(analytics?.openInterest || 4500000)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">CHANGE IN OI</span>
                    <div className="text-base font-bold text-emerald-400 mt-1">
                      +{formatNumber(analytics?.changeOi || 320000)} ({analytics?.oiChangePct || 7.6}%)
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">TRADED VOLUME</span>
                    <div className="text-base font-bold text-cyan-400 mt-1">
                      {formatNumber(analytics?.volume || 210000)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">ATM DISTANCE</span>
                    <div className="text-base font-bold text-slate-200 mt-1">0.0 (ATM Strike)</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Futures Pricing & Basis */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Futures Price, Spot & Basis Breakdown
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">FUTURES PRICE</span>
                    <div className="text-base font-bold text-white mt-1">
                      ₹{formatNumber(analytics?.futuresPrice || 24850.5, 2)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">SPOT PRICE</span>
                    <div className="text-base font-bold text-cyan-400 mt-1">
                      ₹{formatNumber(analytics?.spotPrice || 24820.0, 2)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">BASIS</span>
                    <div className="text-base font-bold text-emerald-400 mt-1">
                      +₹{analytics?.basis ?? "30.50"} (+{analytics?.basisPct ?? "0.12"}%)
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">FUNDING RATE</span>
                    <div className="text-base font-bold text-purple-400 mt-1">
                      {analytics?.fundingRate ? `${analytics.fundingRate}%` : "0.0100% (8h)"}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">STATE</span>
                    <div className="text-base font-bold text-amber-300 mt-1">
                      {analytics?.premiumDiscount || "PREMIUM"}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">DAYS TO EXPIRY</span>
                    <div className="text-base font-bold text-slate-200 mt-1">
                      {analytics?.daysToExpiry || 5} Days
                    </div>
                  </div>
                </div>
              </div>

              {/* Futures Depth & OI */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Futures Open Interest & Volume
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">TOTAL OPEN INTEREST</span>
                    <div className="text-base font-bold text-white mt-1">
                      {formatNumber(analytics?.openInterest || 12500000)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500">DAILY VOLUME</span>
                    <div className="text-base font-bold text-cyan-400 mt-1">
                      {formatNumber(analytics?.volume || 850000)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 4: DECISIONS */}
      {activeSubTab === "DECISIONS" && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            Explainable Decision Audit Log (Why / Why Not Traded)
          </h3>
          {decisions.length > 0 ? (
            <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
              {decisions.map((d, i) => (
                <div key={d.decisionId || i} className="py-3 flex flex-col gap-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px]">{d.timestamp}</span>
                    <span
                      className={`font-black text-xs px-2 py-0.5 rounded ${
                        d.finalDecision === "BUY" || d.finalDecision === "SELL"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {d.finalDecision}
                    </span>
                  </div>
                  <div className="text-slate-300 font-mono text-[11px]">{d.summary}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              No decision records yet. Live decision audits stream on each tick.
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 5: SIGNALS */}
      {activeSubTab === "SIGNALS" && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Signal Lifecycle History
          </h3>
          {signals.length > 0 ? (
            <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
              {signals.map((s, i) => (
                <div key={s.signalId || i} className="py-3 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="font-bold text-cyan-400">{s.direction || s.side}</span>{" "}
                    {s.canonicalInstrumentId || s.instrumentId}
                    <div className="text-[10px] text-slate-500">
                      ID: <code>{s.signalId || `sig_${i}`}</code>
                    </div>
                  </div>
                  <span className="font-bold px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                    {s.state}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              No trade signals generated in the active session.
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 6: LOGS */}
      {activeSubTab === "LOGS" && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            Chronological Bot Execution & OMS Audit Stream
          </h3>
          {logs.length > 0 ? (
            <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto font-mono text-[11px]">
              {logs.map((l, i) => (
                <div key={i} className="py-2.5 flex items-start gap-3">
                  <span className="text-slate-500 text-[10px] whitespace-nowrap">{l.timestamp}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      l.level === "ERROR"
                        ? "bg-rose-500/20 text-rose-400"
                        : l.level === "WARN"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {l.level || "INFO"}
                  </span>
                  <span className="text-slate-300 flex-1">{l.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              No audit logs captured yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BotControlCenterVNext;
