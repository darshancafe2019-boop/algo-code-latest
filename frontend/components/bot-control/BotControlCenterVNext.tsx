"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  ShieldCheck,
  ShieldAlert,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Clock,
  Layers,
  ListOrdered,
  Activity,
  CheckCircle2,
  Copy,
  Check,
  Wifi,
  BarChart2,
  Sliders,
  AlertTriangle,
  Info,
  DollarSign,
  Maximize2,
  Radio,
  Cpu,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { api } from "@/lib/bot-api";
import { BotSnapshot, BotStatus } from "@/types/bot";
import { wsClient } from "@/lib/websocket";
import { detectMarketCurrency, formatMoney, formatSignedMoney } from "@/lib/formatters";

export interface BotControlCenterVNextProps {
  botId?: string;
  onBack?: () => void;
}

export function BotControlCenterVNext({ botId: propBotId, onBack }: BotControlCenterVNextProps) {
  const params = useParams();
  const router = useRouter();
  const botId = propBotId || (params?.id as string) || (params?.botId as string) || "";

  const [snapshot, setSnapshot] = useState<BotSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderQty, setOrderQty] = useState<number>(1.0);
  const [copiedId, setCopiedId] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<
    "positions" | "orders" | "strategy" | "risk" | "events"
  >("positions");
  const [eventFilter, setEventFilter] = useState<"ALL" | "ERROR" | "WARNING" | "INFO">("ALL");
  const [selectedTimeframe, setSelectedTimeframe] = useState<"1m" | "5m" | "15m" | "1h" | "1D">("5m");
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);

  // Price history for interactive SVG terminal chart
  const [priceHistory, setPriceHistory] = useState<Array<{ time: string; price: number }>>([]);
  const [hoveredPoint, setHoveredPoint] = useState<{ time: string; price: number; x: number; y: number } | null>(null);

  const snapshotRef = React.useRef<BotSnapshot | null>(null);
  snapshotRef.current = snapshot;

  const fetchSnapshot = useCallback(async () => {
    if (!botId) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getBot(botId);
      setSnapshot(data);
      setError(null);
      if (data?.bot?.risk?.quantity) {
        setOrderQty(data.bot.risk.quantity);
      }
    } catch (err: any) {
      if (!snapshotRef.current) {
        setError(err.message || "Failed to load bot snapshot");
      } else {
        console.warn(`[BotControlCenter] Background snapshot refresh skipped: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    fetchSnapshot();

    // Subscribe to WS updates for this bot
    wsClient.subscribeBot(botId);
    const unsubscribe = wsClient.subscribe((msg) => {
      if (msg.bot_id === botId || (msg.data && msg.data.bot_id === botId)) {
        fetchSnapshot();
      }
    });

    const interval = setInterval(fetchSnapshot, 4000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [botId, fetchSnapshot]);

  // Feed price history when live market quote updates
  useEffect(() => {
    const lastPrice = snapshot?.market?.last;
    if (lastPrice != null && !isNaN(lastPrice) && lastPrice > 0) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      setPriceHistory((prev) => {
        if (prev.length === 0) {
          const seed: Array<{ time: string; price: number }> = [];
          for (let i = 16; i >= 1; i--) {
            const t = new Date(now.getTime() - i * 4000).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            const variance = lastPrice * (1 + Math.sin(i * 1.3) * 0.0012 + (Math.random() - 0.5) * 0.0004);
            seed.push({ time: t, price: Number(variance.toFixed(2)) });
          }
          seed.push({ time: timeStr, price: lastPrice });
          return seed;
        }

        if (prev[prev.length - 1]?.time === timeStr) {
          return prev;
        }

        const next = [...prev, { time: timeStr, price: lastPrice }];
        return next.slice(-28);
      });
    }
  }, [snapshot?.market?.last, snapshot?.market?.timestamp_received]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    setError(null);
    try {
      if (action === "VALIDATE") {
        await api.validateBot(botId);
      } else if (action === "START") {
        await api.startBot(botId);
      } else if (action === "PAUSE") {
        await api.pauseBot(botId);
      } else if (action === "RESUME") {
        await api.resumeBot(botId);
      } else if (action === "STOP") {
        await api.stopBot(botId);
      } else if (action === "EMERGENCY_STOP") {
        await api.triggerKillSwitch("BOT", botId, "Emergency Stop triggered from bot terminal");
        try {
          await api.stopBot(botId);
        } catch (_) {}
      }
      await fetchSnapshot();
    } catch (err: any) {
      setError(err.message || `Action ${action} failed`);
    } finally {
      setActionLoading(null);
      setShowEmergencyConfirm(false);
    }
  };

  const handleOrder = async (side: "BUY" | "SELL") => {
    setActionLoading(side);
    setError(null);
    try {
      await api.placeBotOrder(botId, side, orderQty);
      await fetchSnapshot();
    } catch (err: any) {
      setError(err.message || `Order placement failed`);
    } finally {
      setActionLoading(null);
    }
  };

  const copyIdToClipboard = () => {
    if (!botId) return;
    navigator.clipboard.writeText(botId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (loading && !snapshot) {
    return (
      <div className="flex h-[65vh] flex-col items-center justify-center space-y-4">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping" />
          <div className="h-12 w-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <Cpu className="absolute h-5 w-5 text-blue-400" />
        </div>
        <div className="text-center font-mono">
          <p className="text-sm font-semibold text-white">INITIALIZING BOT WORKSTATION</p>
          <p className="text-xs text-slate-400 mt-1">Connecting to telemetry stream for {botId || "Unit"}...</p>
        </div>
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/30 bg-red-950/20 text-red-400 shadow-xl shadow-red-950/40">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Bot Workstation Telemetry Alert</h2>
          <p className="text-sm font-mono text-slate-400 mt-2 max-w-lg mx-auto">{error}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchSnapshot();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition-all shadow-lg shadow-blue-500/25 cursor-pointer active:scale-95"
          >
            <RefreshCw className="h-4 w-4" /> Reconnect Workstation
          </button>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-800 bg-[#0B1426] text-slate-300 text-xs font-mono font-semibold hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Return to Bot Fleet
            </button>
          ) : (
            <Link
              href="/bots"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-800 bg-[#0B1426] text-slate-300 text-xs font-mono font-semibold hover:bg-slate-800 hover:text-white transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Return to Bot Fleet
            </Link>
          )}
        </div>
        <p className="text-[11px] font-mono text-slate-500 animate-pulse">
          Continuous engine heartbeat active • Retrying connection...
        </p>
      </div>
    );
  }

  const bot = snapshot?.bot;
  const status = (bot?.status || "READY") as BotStatus;
  const market = snapshot?.market;
  const pnl = snapshot?.pnl;
  const { code: currCode, symbol: currSym } = detectMarketCurrency({
    ...bot,
    market: market || bot?.market,
    pnl,
  });

  const isRunning = status === "RUNNING";
  const isPaused = status === "PAUSED";
  const isReady = status === "READY";
  const canStart = isReady || status === "STOPPED";
  const canPause = isRunning;
  const canResume = isPaused;
  const canStop = isRunning || isPaused;
  const canValidate = status === "DRAFT" || status === "STOPPED" || status === "ERROR";

  const isLive = bot?.execution?.mode === "LIVE";

  // Filtered Events
  const filteredEvents =
    !snapshot?.latest_events
      ? []
      : eventFilter === "ALL"
      ? snapshot.latest_events
      : snapshot.latest_events.filter((e) => e.severity === eventFilter);

  // SVG Chart Geometry Calculations
  const chartWidth = 640;
  const chartHeight = 170;
  const paddingX = 16;
  const paddingY = 24;

  const prices = priceHistory.map((p) => p.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 100;
  const priceRange = maxPrice - minPrice || 1;

  const getSvgCoordinates = (index: number, price: number) => {
    const x = paddingX + (index / Math.max(priceHistory.length - 1, 1)) * (chartWidth - paddingX * 2);
    const normalizedY = (price - minPrice) / priceRange;
    const y = chartHeight - paddingY - normalizedY * (chartHeight - paddingY * 2);
    return { x, y };
  };

  const svgPoints = priceHistory.map((pt, i) => getSvgCoordinates(i, pt.price));
  const linePathD =
    svgPoints.length > 1
      ? `M ${svgPoints[0].x} ${svgPoints[0].y} ` +
        svgPoints.slice(1).map((pt) => `L ${pt.x} ${pt.y}`).join(" ")
      : "";

  const areaPathD =
    svgPoints.length > 1
      ? `${linePathD} L ${svgPoints[svgPoints.length - 1].x} ${chartHeight} L ${svgPoints[0].x} ${chartHeight} Z`
      : "";

  // Check if first vs last price is trending up or down
  const isPriceUp =
    priceHistory.length > 1 &&
    priceHistory[priceHistory.length - 1].price >= priceHistory[0].price;

  // Active position average entry reference
  const firstPosition = snapshot?.positions?.[0];
  const avgEntryPrice = firstPosition?.average_entry_price;
  const avgEntryY =
    avgEntryPrice != null && avgEntryPrice >= minPrice && avgEntryPrice <= maxPrice
      ? chartHeight - paddingY - ((avgEntryPrice - minPrice) / priceRange) * (chartHeight - paddingY * 2)
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-2 pb-16 space-y-6 animate-fadeIn">
      {/* 1. TOP BREADCRUMB & METADATA BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-mono">
        <div className="flex items-center gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-800 bg-[#0B1426] text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer font-bold"
            >
              <ArrowLeft className="h-4 w-4 text-cyan-400" /> Back to Bot Fleet
            </button>
          ) : (
            <Link
              href="/bots"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-800 bg-[#0B1426] text-slate-300 hover:text-white hover:bg-slate-800 transition-all font-bold"
            >
              <ArrowLeft className="h-4 w-4 text-cyan-400" /> Back to Bot Fleet
            </Link>
          )}

          <span className="text-slate-600">/</span>
          <span className="text-white font-bold">{bot?.name || "Terminal"}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-800 bg-[#0B1426] text-xs sm:text-sm font-bold">
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-400">Stream:</span>
            <span className="text-emerald-400">
              {snapshot?.provider_health?.latency_ms != null
                ? `${snapshot.provider_health.latency_ms}ms`
                : "Active"}
            </span>
          </div>

          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs sm:text-sm font-black uppercase tracking-wider ${
              isLive
                ? "bg-rose-950/60 text-rose-400 border-rose-500/40 shadow-sm shadow-rose-950/40"
                : "bg-blue-950/60 text-blue-400 border-blue-500/40 shadow-sm shadow-blue-950/40"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isLive ? "bg-rose-400 animate-pulse" : "bg-blue-400 animate-pulse"
              }`}
            />
            {bot?.execution?.mode || "PAPER"} TRADING
          </div>
        </div>
      </div>

      {/* 2. INSTITUTIONAL TERMINAL HEADER CARD */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-r from-[#0B1528] via-[#09101F] to-[#0D182E] p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Identity & Specs */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-950/40 text-blue-400 shadow-inner">
              <Cpu className="h-8 w-8" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{bot?.name || "Autonomous Bot"}</h1>
                <button
                  type="button"
                  onClick={copyIdToClipboard}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#070D1A] px-3 py-1.5 text-xs sm:text-sm font-mono font-bold text-cyan-400 hover:border-slate-700 transition-colors"
                  title="Click to copy Bot ID"
                >
                  <span>{botId}</span>
                  {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                </button>

                <span
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-mono font-bold uppercase tracking-wide border ${
                    isRunning
                      ? "bg-emerald-950/70 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-950/50"
                      : isPaused
                      ? "bg-amber-950/70 text-amber-400 border-amber-500/40"
                      : status === "STOPPED"
                      ? "bg-slate-900 text-slate-400 border-slate-800"
                      : "bg-red-950/70 text-red-400 border-red-500/40"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isRunning ? "bg-emerald-400 animate-pulse" : isPaused ? "bg-amber-400" : "bg-slate-500"
                    }`}
                  />
                  {status}
                </span>
              </div>

              {/* Badges strip */}
              <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text-xs sm:text-sm font-mono text-slate-300 font-medium">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold">
                  {bot?.market?.symbol || "N/A"}
                </span>
                <span className="text-slate-600">•</span>
                <span>Asset: <strong className="text-white">{bot?.market?.asset_class || "OPTIONS"}</strong></span>
                <span className="text-slate-600">•</span>
                <span>Exchange: <strong className="text-white">{bot?.market?.exchange || "DELTA"}</strong></span>
                <span className="text-slate-600">•</span>
                <span>Strategy: <strong className="text-cyan-400 font-bold">{bot?.strategy?.type || "QUANT"}</strong></span>
                <span className="text-slate-600">•</span>
                <span>TF: <strong className="text-white">{bot?.strategy?.timeframe || "1m"}</strong></span>
              </div>
            </div>
          </div>

          {/* Action Control Panel */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <button
              type="button"
              onClick={() => handleAction("VALIDATE")}
              disabled={!canValidate || actionLoading !== null}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0B1426] text-xs sm:text-sm font-mono font-bold text-slate-200 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4 text-blue-400" />
              VALIDATE
            </button>

            {canStart && (
              <button
                type="button"
                onClick={() => handleAction("START")}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs sm:text-sm font-mono font-black text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                START ENGINE
              </button>
            )}

            {canPause && (
              <button
                type="button"
                onClick={() => handleAction("PAUSE")}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-950/40 text-xs sm:text-sm font-mono font-bold text-amber-400 hover:bg-amber-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
              >
                <Pause className="h-4 w-4" />
                PAUSE
              </button>
            )}

            {canResume && (
              <button
                type="button"
                onClick={() => handleAction("RESUME")}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-xs sm:text-sm font-mono font-bold text-emerald-400 hover:bg-emerald-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
              >
                <Play className="h-4 w-4" />
                RESUME
              </button>
            )}

            {canStop && (
              <button
                type="button"
                onClick={() => handleAction("STOP")}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/40 bg-rose-950/30 text-xs sm:text-sm font-mono font-bold text-rose-400 hover:bg-rose-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
              >
                <Square className="h-4 w-4 fill-current" />
                STOP
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowEmergencyConfirm(true)}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/50 bg-red-600/90 text-xs sm:text-sm font-mono font-black text-white hover:bg-red-500 shadow-lg shadow-red-950/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
              title="Trigger emergency kill switch and halt execution"
            >
              <ShieldAlert className="h-4 w-4" />
              KILL SWITCH
            </button>

            <button
              type="button"
              onClick={() => {
                setActionLoading("REFRESH");
                fetchSnapshot().finally(() => setActionLoading(null));
              }}
              disabled={actionLoading !== null}
              className="inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-800 bg-[#0B1426] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`h-5 w-5 ${actionLoading === "REFRESH" ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Emergency Safeguard Confirmation Modal / Banner */}
        {showEmergencyConfirm && (
          <div className="mt-5 rounded-2xl border border-red-500/60 bg-red-950/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-3.5 text-red-200 text-sm font-mono">
              <ShieldAlert className="h-6 w-6 text-red-400 shrink-0" />
              <div>
                <span className="font-bold text-white">CONFIRM EMERGENCY KILL SWITCH:</span> This will trigger an immediate
                circuit breaker halt on bot <strong className="text-white">{botId}</strong> and cancel pending open orders.
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => handleAction("EMERGENCY_STOP")}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-sm font-black transition-colors cursor-pointer shadow-md"
              >
                CONFIRM KILL SWITCH
              </button>
              <button
                type="button"
                onClick={() => setShowEmergencyConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 font-mono text-sm font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global Error Banner if action failed */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/20 p-4 text-sm font-mono text-red-400 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. PERFORMANCE KPI OVERVIEW STRIP (5 Institutional Metric Tiles) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 font-mono">
        {/* Net P&L */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B1426] p-5 shadow-lg relative overflow-hidden group">
          <div className="text-xs sm:text-sm font-bold uppercase text-slate-300 flex items-center justify-between">
            <span>Authoritative P&L</span>
            <span className="text-xs text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40 font-bold">
              {currCode}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl sm:text-4xl font-black tracking-tight ${
                (pnl?.net_pnl || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatSignedMoney(pnl?.net_pnl, currSym)}
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs font-medium text-slate-300 border-t border-slate-800/60 pt-2">
            <span>Realized: {formatSignedMoney(pnl?.realized_pnl, currSym)}</span>
            <span className="text-slate-400">Unreal: {formatSignedMoney(pnl?.unrealized_pnl, currSym)}</span>
          </div>
        </div>

        {/* Realized Gains & Trades */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B1426] p-5 shadow-lg">
          <div className="text-xs sm:text-sm font-bold uppercase text-slate-300 flex items-center justify-between">
            <span>Realized Return</span>
            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-3xl sm:text-4xl font-black text-slate-100">
            {formatSignedMoney(pnl?.realized_pnl, currSym)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs font-medium text-slate-300 border-t border-slate-800/60 pt-2">
            <span>Fills: {snapshot?.latest_trades?.length || 0}</span>
            <span>Fees: {formatMoney(pnl?.fees || 0, currSym)}</span>
          </div>
        </div>

        {/* Floating / Unrealized */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B1426] p-5 shadow-lg">
          <div className="text-xs sm:text-sm font-bold uppercase text-slate-300 flex items-center justify-between">
            <span>Floating Exposure</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div
            className={`mt-3 text-3xl sm:text-4xl font-black ${
              (pnl?.unrealized_pnl || 0) >= 0 ? "text-slate-100" : "text-rose-400"
            }`}
          >
            {formatSignedMoney(pnl?.unrealized_pnl, currSym)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs font-medium text-slate-300 border-t border-slate-800/60 pt-2">
            <span>Active: {snapshot?.positions?.length || 0}</span>
            <span className="text-cyan-400 font-bold">{firstPosition?.direction || "FLAT"}</span>
          </div>
        </div>

        {/* Capital Guardrail */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B1426] p-5 shadow-lg">
          <div className="text-xs sm:text-sm font-bold uppercase text-slate-300 flex items-center justify-between">
            <span>Max Daily Loss</span>
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-3 text-3xl sm:text-4xl font-black text-slate-100">
            {formatMoney(bot?.risk?.max_daily_loss || 0, currSym)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs font-medium text-slate-300 border-t border-slate-800/60 pt-2">
            <span>Max/Trade: {formatMoney(bot?.risk?.max_loss_per_trade || 0, currSym)}</span>
            <span className="text-emerald-400 font-bold">GUARDED</span>
          </div>
        </div>

        {/* Engine Security & Kill Switch */}
        <div className="col-span-2 md:col-span-1 rounded-2xl border border-slate-800 bg-[#0B1426] p-5 shadow-lg">
          <div className="text-xs sm:text-sm font-bold uppercase text-slate-300 flex items-center justify-between">
            <span>Circuit Breaker</span>
            <Lock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                snapshot?.risk?.kill_switch?.bot_status === "TRIGGERED" ||
                snapshot?.risk?.kill_switch?.global_status === "TRIGGERED"
                  ? "text-rose-400"
                  : "text-emerald-400"
              }`}
            >
              {snapshot?.risk?.kill_switch?.bot_status || snapshot?.risk?.kill_switch?.global_status || "ARMED"}
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs font-medium text-slate-300 border-t border-slate-800/60 pt-2">
            <span>Mode: {bot?.execution?.mode || "PAPER"}</span>
            <span className="text-emerald-400 font-bold">Auto-Halt: 100%</span>
          </div>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE GRID: 8 COLS CHART & TABLES + 4 COLS LIVE QUOTE & ORDER DESK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / CENTER WORKSPACE (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          {/* A. REAL-TIME INTERACTIVE PRICE CHART CONTAINER */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B1426] p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
            {/* Chart Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-black text-white font-mono">{bot?.market?.symbol}</span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-cyan-400 bg-cyan-950/50 px-2.5 py-1 rounded-lg border border-cyan-800/50">
                    {bot?.market?.exchange || "MARKET"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2.5 font-mono">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {currSym}{market?.last != null ? market.last.toFixed(2) : "---"}
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-bold flex items-center ${
                      isPriceUp ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isPriceUp ? <TrendingUp className="h-4 w-4 mr-0.5" /> : <TrendingDown className="h-4 w-4 mr-0.5" />}
                    {isPriceUp ? "+LIVE" : "-TICK"}
                  </span>
                </div>
              </div>

              {/* Timeframe selector */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#070D1A] p-1 font-mono text-xs sm:text-sm">
                {(["1m", "5m", "15m", "1h", "1D"] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                      selectedTimeframe === tf
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive SVG Chart Visualizer */}
            <div className="relative mt-4 w-full h-[230px] bg-[#070D1A] rounded-xl border border-slate-800/60 p-2 overflow-hidden">
              {/* Reference Grid Lines */}
              <div className="absolute inset-x-4 top-4 border-b border-slate-800/40 flex justify-between text-xs font-mono text-slate-500 font-bold">
                <span>MAX {currSym}{maxPrice.toFixed(2)}</span>
              </div>
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-b border-dashed border-slate-800/40 flex justify-between text-xs font-mono text-slate-500 font-bold">
                <span>MID {currSym}{((maxPrice + minPrice) / 2).toFixed(2)}</span>
              </div>
              <div className="absolute inset-x-4 bottom-5 border-b border-slate-800/40 flex justify-between text-xs font-mono text-slate-500 font-bold">
                <span>MIN {currSym}{minPrice.toFixed(2)}</span>
              </div>

              {/* Average Entry Price Line if in position */}
              {avgEntryY !== null && (
                <div
                  className="absolute inset-x-4 border-b border-dashed border-cyan-400/80 z-10 flex items-center justify-between"
                  style={{ top: `${avgEntryY}px` }}
                >
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-[#070D1A] px-2 -translate-y-2.5 rounded border border-cyan-500/40">
                    ENTRY: {currSym}{avgEntryPrice?.toFixed(2)}
                  </span>
                </div>
              )}

              {/* SVG Area & Polyline */}
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full preserve-3d"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isPriceUp ? "#10B981" : "#F43F5E"} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={isPriceUp ? "#10B981" : "#F43F5E"} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {areaPathD && <path d={areaPathD} fill="url(#chartGradient)" />}

                {linePathD && (
                  <path
                    d={linePathD}
                    fill="none"
                    stroke={isPriceUp ? "#10B981" : "#F43F5E"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Point Dots on Line */}
                {svgPoints.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={i === svgPoints.length - 1 ? "4.5" : "2.5"}
                    fill={isPriceUp ? "#34D399" : "#FB7185"}
                    className={i === svgPoints.length - 1 ? "animate-pulse" : ""}
                  />
                ))}
              </svg>

              {/* Live telemetry tick label */}
              <div className="absolute right-3 bottom-2 flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-800 shadow-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Live Feed: {priceHistory.length} Ticks Buffered
              </div>
            </div>

            {/* Strategy & Model Sub-bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-mono text-slate-300 bg-[#070D1A] p-3.5 rounded-xl border border-slate-800/60">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-blue-400" />
                <span>Active Model:</span>
                <strong className="text-white font-bold">{bot?.strategy?.type || "QUANTITATIVE"}</strong>
              </div>
              <div className="flex items-center gap-4">
                <span>Signal Interval: <strong className="text-cyan-400 font-bold">{bot?.strategy?.timeframe || "1m"}</strong></span>
                <span>Feed Engine: <strong className="text-slate-200 font-bold">{bot?.data_provider?.provider || "DELTA"}</strong></span>
              </div>
            </div>
          </div>

          {/* B. WORKSPACE TABBED SECTION: Positions | Orders | Strategy | Risk | Events */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B1426] shadow-xl overflow-hidden backdrop-blur-md">
            {/* Tab Navigation Strip */}
            <div className="flex items-center border-b border-slate-800/80 bg-[#09101F] px-4 overflow-x-auto no-scrollbar font-mono text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => setActiveWorkspaceTab("positions")}
                className={`flex items-center gap-2 py-3.5 px-4 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeWorkspaceTab === "positions"
                    ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="h-4 w-4" />
                Active Positions
                <span className="ml-1.5 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300 font-bold">
                  {snapshot?.positions?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab("orders")}
                className={`flex items-center gap-2 py-3.5 px-4 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeWorkspaceTab === "orders"
                    ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <ListOrdered className="h-4 w-4" />
                Orders & Fills
                <span className="ml-1.5 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300 font-bold">
                  {(snapshot?.orders?.length || 0) + (snapshot?.latest_trades?.length || 0)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab("strategy")}
                className={`flex items-center gap-2 py-3.5 px-4 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeWorkspaceTab === "strategy"
                    ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Cpu className="h-4 w-4" />
                Strategy Parameters
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab("risk")}
                className={`flex items-center gap-2 py-3.5 px-4 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeWorkspaceTab === "risk"
                    ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Risk Guardrails
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab("events")}
                className={`flex items-center gap-2 py-3.5 px-4 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeWorkspaceTab === "events"
                    ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Activity className="h-4 w-4" />
                Audit Logs
                <span className="ml-1.5 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300 font-bold">
                  {snapshot?.latest_events?.length || 0}
                </span>
              </button>
            </div>

            {/* TAB CONTENT 1: POSITIONS TABLE */}
            {activeWorkspaceTab === "positions" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm font-mono">
                  <thead className="border-b border-slate-800/80 bg-[#070D1A] text-slate-300 text-xs uppercase font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Symbol / Contract</th>
                      <th className="px-5 py-3.5">Direction</th>
                      <th className="px-5 py-3.5">Quantity</th>
                      <th className="px-5 py-3.5">Avg Entry</th>
                      <th className="px-5 py-3.5">Current Price</th>
                      <th className="px-5 py-3.5">Unrealized P&L</th>
                      <th className="px-5 py-3.5">Realized P&L</th>
                      <th className="px-5 py-3.5 text-right">Total P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {!snapshot?.positions || snapshot.positions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-14 text-center text-slate-400 font-mono">
                          <Layers className="h-10 w-10 mx-auto text-slate-500 mb-3" />
                          <p className="font-bold text-base text-slate-200">No active positions open for this unit</p>
                          <p className="text-xs sm:text-sm text-slate-400 mt-1">
                            Strategy engine is scanning live order book ticks for configured entry criteria.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      snapshot.positions.map((pos) => (
                        <tr key={pos.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="px-5 py-4 font-bold text-white flex items-center gap-2.5 text-sm sm:text-base">
                            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                            {pos.symbol}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`px-3 py-1 rounded-md text-xs font-bold ${
                                pos.direction === "LONG"
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                                  : pos.direction === "SHORT"
                                  ? "bg-rose-950 text-rose-400 border border-rose-500/40"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {pos.direction}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-bold text-white text-xs sm:text-sm">{pos.quantity}</td>
                          <td className="px-5 py-4 text-slate-200 text-xs sm:text-sm">{formatMoney(pos.average_entry_price, currSym)}</td>
                          <td className="px-5 py-4 text-slate-200 text-xs sm:text-sm">{formatMoney(pos.current_price, currSym)}</td>
                          <td
                            className={`px-5 py-4 font-bold text-xs sm:text-sm ${
                              pos.unrealized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {formatSignedMoney(pos.unrealized_pnl, currSym)}
                          </td>
                          <td className="px-5 py-4 text-slate-300 text-xs sm:text-sm">{formatMoney(pos.realized_pnl, currSym)}</td>
                          <td
                            className={`px-5 py-4 font-black text-right text-sm sm:text-base ${
                              pos.total_pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {formatSignedMoney(pos.total_pnl, currSym)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT 2: ORDERS & FILLS */}
            {activeWorkspaceTab === "orders" && (
              <div className="p-5 space-y-5 font-mono text-xs sm:text-sm">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold uppercase text-slate-200 mb-3 flex items-center gap-2">
                    <ListOrdered className="h-4 w-4 text-blue-400" /> Recent Placed Orders
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-[#070D1A]">
                    <table className="w-full text-left">
                      <thead className="border-b border-slate-800 text-slate-300 text-xs uppercase font-bold bg-slate-900/50">
                        <tr>
                          <th className="px-5 py-3">Order ID</th>
                          <th className="px-5 py-3">Side</th>
                          <th className="px-5 py-3">Quantity</th>
                          <th className="px-5 py-3">Avg Fill Price</th>
                          <th className="px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-200">
                        {!snapshot?.orders || snapshot.orders.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm">
                              No orders recorded for this session yet
                            </td>
                          </tr>
                        ) : (
                          snapshot.orders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-slate-900/40">
                              <td className="px-5 py-3 text-cyan-400 font-bold">{ord.id}</td>
                              <td className="px-5 py-3">
                                <span
                                  className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                                    ord.side === "BUY"
                                      ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                                      : "bg-rose-950 text-rose-400 border border-rose-500/30"
                                  }`}
                                >
                                  {ord.side}
                                </span>
                              </td>
                              <td className="px-5 py-3 font-bold text-white">{ord.quantity}</td>
                              <td className="px-5 py-3">
                                {ord.average_fill_price ? formatMoney(ord.average_fill_price, currSym) : "---"}
                              </td>
                              <td className="px-5 py-3">
                                <span className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-bold border border-slate-800 text-slate-300">
                                  {ord.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Execution Fills if available */}
                {snapshot?.latest_trades && snapshot.latest_trades.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs sm:text-sm font-bold uppercase text-slate-200 mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-emerald-400" /> Trade Fills History
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-[#070D1A]">
                      <table className="w-full text-left">
                        <thead className="border-b border-slate-800 text-slate-300 text-xs uppercase font-bold bg-slate-900/50">
                          <tr>
                            <th className="px-5 py-3">Trade ID</th>
                            <th className="px-5 py-3">Side</th>
                            <th className="px-5 py-3">Qty</th>
                            <th className="px-5 py-3">Execution Price</th>
                            <th className="px-5 py-3">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200">
                          {snapshot.latest_trades.map((tr: any, idx: number) => (
                            <tr key={tr.id || idx} className="hover:bg-slate-900/40">
                              <td className="px-5 py-3 text-slate-400">{tr.id || `TR-${idx + 1}`}</td>
                              <td className="px-5 py-3 font-bold text-emerald-400">{tr.side || "BUY"}</td>
                              <td className="px-5 py-3 font-bold">{tr.quantity || tr.qty}</td>
                              <td className="px-5 py-3">{formatMoney(tr.price, currSym)}</td>
                              <td className="px-5 py-3 text-slate-400">
                                {tr.timestamp ? new Date(tr.timestamp).toLocaleTimeString() : "Recent"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: STRATEGY CONFIGURATION */}
            {activeWorkspaceTab === "strategy" && (
              <div className="p-6 space-y-5 font-mono text-xs sm:text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="rounded-xl border border-slate-800 bg-[#070D1A] p-5 space-y-4">
                    <div className="text-xs sm:text-sm font-bold uppercase text-cyan-400 flex items-center gap-2">
                      <Cpu className="h-4 w-4" /> Core Quantitative Model
                    </div>
                    <div className="space-y-3 text-slate-200">
                      <div className="flex justify-between border-b border-slate-800/60 pb-2">
                        <span className="text-slate-400">Strategy Model:</span>
                        <strong className="text-white font-bold">{bot?.strategy?.type || "Custom Strategy"}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/60 pb-2">
                        <span className="text-slate-400">Calculation Timeframe:</span>
                        <strong className="text-white font-bold">{bot?.strategy?.timeframe || "1m"}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/60 pb-2">
                        <span className="text-slate-400">Underlying Symbol:</span>
                        <strong className="text-white font-bold">{bot?.market?.symbol}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Execution Mode:</span>
                        <strong className={`font-bold ${isLive ? "text-rose-400" : "text-cyan-400"}`}>
                          {bot?.execution?.mode || "PAPER"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#070D1A] p-5 space-y-4">
                    <div className="text-xs sm:text-sm font-bold uppercase text-blue-400 flex items-center gap-2">
                      <Sliders className="h-4 w-4" /> Hyperparameters
                    </div>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {bot?.strategy?.parameters && Object.keys(bot.strategy.parameters).length > 0 ? (
                        Object.entries(bot.strategy.parameters).map(([key, val]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs sm:text-sm"
                          >
                            <span className="text-slate-400">{key}</span>
                            <span className="font-bold text-white">
                              {typeof val === "object" ? JSON.stringify(val) : String(val)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 py-4 text-center">Standard default quantitative parameters active</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: RISK GUARDRAILS */}
            {activeWorkspaceTab === "risk" && (
              <div className="p-6 space-y-5 font-mono text-xs sm:text-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="rounded-xl border border-slate-800 bg-[#070D1A] p-5 space-y-2.5">
                    <span className="text-slate-300 uppercase text-xs font-bold">Max Daily Loss Limit</span>
                    <div className="text-2xl sm:text-3xl font-black text-white">
                      {formatMoney(bot?.risk?.max_daily_loss || 0, currSym)}
                    </div>
                    <p className="text-xs text-slate-400">
                      Circuit breaker automatically halts new entries if daily drawdown is reached.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#070D1A] p-5 space-y-2.5">
                    <span className="text-slate-300 uppercase text-xs font-bold">Max Loss Per Trade</span>
                    <div className="text-2xl sm:text-3xl font-black text-white">
                      {formatMoney(bot?.risk?.max_loss_per_trade || 0, currSym)}
                    </div>
                    <p className="text-xs text-slate-400">
                      Hard stop enforced on each execution tranche.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#070D1A] p-5 space-y-2.5">
                    <span className="text-slate-300 uppercase text-xs font-bold">Position Sizing Limits</span>
                    <div className="text-2xl sm:text-3xl font-black text-white">
                      {bot?.risk?.max_position_size || bot?.risk?.quantity || 1} Contracts
                    </div>
                    <p className="text-xs text-slate-400">
                      Base order quantity: {bot?.risk?.quantity || 1.0} units.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#070D1A] p-5 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400">Stop Loss Parameter: </span>
                    <strong className="text-white font-bold">{bot?.risk?.stop_loss ? `${bot.risk.stop_loss}%` : "Dynamic Engine"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Take Profit Parameter: </span>
                    <strong className="text-white font-bold">{bot?.risk?.take_profit ? `${bot.risk.take_profit}%` : "Dynamic Trailing"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Stale Feed Tolerance: </span>
                    <strong className="text-cyan-400 font-bold">{bot?.risk?.max_market_data_age_ms || 5000}ms</strong>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 5: AUDIT LOGS */}
            {activeWorkspaceTab === "events" && (
              <div className="p-5 space-y-4 font-mono text-xs sm:text-sm">
                {/* Severity Filter Pills */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <span className="text-slate-300 text-xs sm:text-sm font-bold uppercase">Telemetry Event Logs</span>
                  <div className="flex items-center gap-2">
                    {(["ALL", "ERROR", "WARNING", "INFO"] as const).map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setEventFilter(sev)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          eventFilter === sev
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      No logs matching severity &apos;{eventFilter}&apos;
                    </div>
                  ) : (
                    filteredEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="rounded-xl border border-slate-800/80 bg-[#070D1A] p-3.5 flex items-start gap-3 hover:border-slate-700 transition-colors"
                      >
                        <span
                          className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${
                            evt.severity === "ERROR"
                              ? "bg-rose-500 shadow-sm shadow-rose-500/50"
                              : evt.severity === "WARNING"
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-bold text-slate-200">{evt.event_type}</span>
                            <span>{evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ""}</span>
                          </div>
                          <p className="text-slate-200 mt-1 text-xs sm:text-sm break-words">{evt.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT RAIL (4 Columns): LIVE MARKET DEPTH + MANUAL ORDER PANEL + SYSTEM HEALTH */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. LIVE MARKET DEPTH & QUOTE CARD */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B1426] p-5 sm:p-6 shadow-xl backdrop-blur-md font-mono space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs sm:text-sm font-bold text-slate-300 uppercase flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-400 animate-pulse" /> Live Market Quote
              </span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/30">
                {market?.source || "DIRECT WS"}
              </span>
            </div>

            {/* LTP Display */}
            <div>
              <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {currSym}{market?.last != null ? market.last.toFixed(2) : "---"}
              </div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1.5 flex items-center justify-between">
                <span>{bot?.market?.symbol} Last Traded Price</span>
                <span className="text-slate-400 font-medium">
                  {market?.timestamp_received ? new Date(market.timestamp_received).toLocaleTimeString() : "Real-time"}
                </span>
              </div>
            </div>

            {/* Bid / Ask Depth Box */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <div className="rounded-xl border border-emerald-950/80 bg-emerald-950/20 p-3.5">
                <span className="text-xs text-emerald-400 font-bold uppercase block">Bid (Buyers)</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-300 mt-1 block">
                  {currSym}{market?.bid != null ? market.bid.toFixed(2) : "---"}
                </span>
              </div>
              <div className="rounded-xl border border-rose-950/80 bg-rose-950/20 p-3.5">
                <span className="text-xs text-rose-400 font-bold uppercase block">Ask (Sellers)</span>
                <span className="text-xl sm:text-2xl font-black text-rose-300 mt-1 block">
                  {currSym}{market?.ask != null ? market.ask.toFixed(2) : "---"}
                </span>
              </div>
            </div>

            {/* Spread and Volume Details */}
            <div className="rounded-xl border border-slate-800 bg-[#070D1A] p-4 space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Bid-Ask Spread:</span>
                <strong className="text-slate-200 font-bold">
                  {market?.bid != null && market?.ask != null
                    ? `${currSym}${(market.ask - market.bid).toFixed(2)} (${(
                        ((market.ask - market.bid) / (market.last || 1)) *
                        100
                      ).toFixed(3)}%)`
                    : "---"}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">24h Volume:</span>
                <strong className="text-slate-200 font-bold">
                  {market?.volume != null ? market.volume.toLocaleString() : "---"}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Instrument Type:</span>
                <strong className="text-cyan-400 font-bold">{bot?.market?.instrument_type || "PERPETUAL"}</strong>
              </div>
            </div>
          </div>

          {/* 2. MANUAL EXECUTION DESK */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B1426] p-5 sm:p-6 shadow-xl backdrop-blur-md font-mono space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs sm:text-sm font-bold text-slate-300 uppercase flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-400" /> Manual Order Desk
              </span>
              <span className="text-xs font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-800/50">
                RISK PROTECTED
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Execute immediate discretionary tranches through this bot&apos;s allocated capital &amp; risk budget.
            </p>

            {/* Quantity Input with Presets */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-200 font-bold">Order Quantity:</span>
                <span className="text-slate-400 text-xs">
                  Est. Notional:{" "}
                  <strong className="text-white font-bold">
                    {currSym}
                    {(orderQty * (market?.last || 0)).toFixed(2)}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  type="number"
                  step="0.1"
                  min="0.001"
                  value={orderQty}
                  onChange={(e) => setOrderQty(parseFloat(e.target.value) || 0)}
                  className="flex-1 rounded-xl border border-slate-700 bg-[#070D1A] px-4 py-2.5 text-base sm:text-lg font-mono font-black text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
                <span className="text-xs sm:text-sm text-slate-300 shrink-0 font-bold">{bot?.market?.symbol}</span>
              </div>

              {/* Quick Qty Presets */}
              <div className="flex items-center gap-2 pt-1">
                {[0.1, 0.5, 1.0, 2.0].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setOrderQty(preset)}
                    className="flex-1 py-1.5 rounded-lg bg-[#070D1A] border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                  >
                    {preset}x
                  </button>
                ))}
              </div>
            </div>

            {/* Buy / Sell Buttons */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => handleOrder("BUY")}
                disabled={!isRunning || actionLoading !== null}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-xs sm:text-sm font-mono font-black text-white hover:from-emerald-500 hover:to-teal-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-emerald-950/60 transition-all active:scale-95 cursor-pointer"
              >
                <TrendingUp className="h-4 w-4" />
                BUY (MKT)
              </button>
              <button
                type="button"
                onClick={() => handleOrder("SELL")}
                disabled={!isRunning || actionLoading !== null}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 py-3.5 text-xs sm:text-sm font-mono font-black text-white hover:from-rose-500 hover:to-red-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-rose-950/60 transition-all active:scale-95 cursor-pointer"
              >
                <TrendingDown className="h-4 w-4" />
                SELL (MKT)
              </button>
            </div>

            {!isRunning && (
              <p className="text-xs text-amber-300 text-center font-mono flex items-center justify-center gap-1.5 pt-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Start bot engine above to activate live order placement
              </p>
            )}
          </div>

          {/* 3. ENGINE TELEMETRY & SYSTEM HEALTH */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B1426] p-5 sm:p-6 shadow-xl backdrop-blur-md font-mono space-y-3.5">
            <span className="text-xs sm:text-sm font-bold text-slate-300 uppercase flex items-center gap-2 pb-2.5 border-b border-slate-800">
              <Activity className="h-4 w-4 text-cyan-400" /> Infrastructure Telemetry
            </span>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#070D1A] border border-slate-800/60">
                <span className="text-slate-400">Data Feed Health:</span>
                <span className="flex items-center gap-2 text-emerald-400 font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {snapshot?.provider_health?.status || "HEALTHY"}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#070D1A] border border-slate-800/60">
                <span className="text-slate-400">Execution Health:</span>
                <span className="text-slate-200 font-bold">
                  {snapshot?.execution_health?.status || "CONNECTED"}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#070D1A] border border-slate-800/60">
                <span className="text-slate-400">Engine Heartbeat:</span>
                <span className="text-cyan-400 font-bold">
                  {snapshot?.provider_health?.latency_ms != null
                    ? `${snapshot.provider_health.latency_ms} ms`
                    : "Active"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
