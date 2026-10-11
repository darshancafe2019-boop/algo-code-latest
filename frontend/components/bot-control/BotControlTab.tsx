"use client";

import React, { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Bot,
  PlusCircle,
  RefreshCw,
  Play,
  Pause,
  Square,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  Layers,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Search,
  LayoutGrid,
  List,
  Copy,
  Check,
  ChevronRight,
  DollarSign,
  Trash2,
  ArrowLeft,
  Zap,
} from "lucide-react";
import { api } from "@/lib/bot-api";
import { BotConfig, BotStatus } from "@/types/bot";
import { useBotStore } from "@/stores/bot-store";
import { wsClient } from "@/lib/websocket";
import {
  formatMoney,
  formatSignedMoney,
  formatPercent,
  formatDateTime,
  formatRelativeTime,
} from "@/lib/formatters";
import { BotCreationControlPlane } from "@/components/bot-instance/BotCreationControlPlane";
import { BotControlCenterVNext } from "./BotControlCenterVNext";

function BotControlTabInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active inner view: 'fleet' (dashboard), 'create' (7-step wizard), or 'details' (bot terminal)
  const [activeView, setActiveView] = useState<"fleet" | "create" | "details">("fleet");
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);

  // Bot store state
  const { bots, setBots } = useBotStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete modal state
  const [botToDelete, setBotToDelete] = useState<BotConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check query params for direct create or detail navigation
  useEffect(() => {
    if (!searchParams) return;
    const isCreate = searchParams.get("create") === "true";
    const botIdParam = searchParams.get("botId") || searchParams.get("id");
    if (isCreate) {
      setActiveView("create");
    } else if (botIdParam) {
      setSelectedBotId(botIdParam);
      setActiveView("details");
    }
  }, [searchParams]);

  const loadBots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBots();
      setBots(data);
    } catch (err: any) {
      setError(err.message || "Failed to load bots from backend");
    } finally {
      setLoading(false);
    }
  }, [setBots]);

  useEffect(() => {
    loadBots();

    // Subscribe to WebSocket status changes & telemetry
    const unsubscribe = wsClient.subscribe((msg) => {
      if (
        msg.type === "BOT_STARTED" ||
        msg.type === "BOT_PAUSED" ||
        msg.type === "BOT_RESUMED" ||
        msg.type === "BOT_STOPPED" ||
        msg.type === "BOT_ERROR" ||
        msg.type === "BOT_VALIDATION_PASSED" ||
        msg.type === "BOT_CREATED" ||
        msg.type === "BOT_ORDER_FILLED" ||
        msg.type === "BOT_STATE_UPDATE"
      ) {
        loadBots();
      }
    });

    // Auto-refresh interval
    const interval = setInterval(() => {
      api.getBots().then((data) => setBots(data)).catch(() => {});
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [loadBots, setBots]);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBotAction = async (
    botId: string,
    action: "start" | "pause" | "resume" | "stop",
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setActionLoading((prev) => ({ ...prev, [botId]: true }));
    try {
      if (action === "start") await api.startBot(botId);
      else if (action === "pause") await api.pauseBot(botId);
      else if (action === "resume") await api.resumeBot(botId);
      else if (action === "stop") await api.stopBot(botId);
      await loadBots();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [botId]: false }));
    }
  };

  const handleDeleteBot = async () => {
    if (!botToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteBot(botToDelete.id);
      setBotToDelete(null);
      await loadBots();
    } catch (err: any) {
      alert(`Failed to delete bot: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Fleet Aggregations
  const fleetMetrics = useMemo(() => {
    let totalNetPnl = 0;
    let totalRealized = 0;
    let totalUnrealized = 0;
    let totalFees = 0;
    let runningCount = 0;
    let totalPositions = 0;
    let totalTrades = 0;

    bots.forEach((b) => {
      if (b.status === "RUNNING") runningCount++;
      if (b.pnl) {
        totalNetPnl += b.pnl.net_pnl || 0;
        totalRealized += b.pnl.realized_pnl || 0;
        totalUnrealized += b.pnl.unrealized_pnl || 0;
        totalFees += b.pnl.fees || 0;
      }
      totalPositions += b.positions_count || 0;
      totalTrades += b.trades_count || 0;
    });

    return {
      totalNetPnl,
      totalRealized,
      totalUnrealized,
      totalFees,
      runningCount,
      totalBots: bots.length,
      totalPositions,
      totalTrades,
    };
  }, [bots]);

  // Filtered bots list
  const filteredBots = useMemo(() => {
    return bots.filter((b) => {
      const matchesStatus =
        statusFilter === "ALL" || b.status.toUpperCase() === statusFilter.toUpperCase();
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        b.name.toLowerCase().includes(query) ||
        b.id.toLowerCase().includes(query) ||
        (b.market?.symbol && b.market.symbol.toLowerCase().includes(query)) ||
        (b.strategy?.type && b.strategy.type.toLowerCase().includes(query)) ||
        (b.market?.exchange && b.market.exchange.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [bots, statusFilter, searchQuery]);

  const getStatusBadge = (status: BotStatus | string) => {
    switch (status) {
      case "RUNNING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-950">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 -ml-3.5" />
            RUNNING
          </span>
        );
      case "READY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-blue-950/60 text-blue-400 border border-blue-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            READY
          </span>
        );
      case "PAUSED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-amber-950/60 text-amber-400 border border-amber-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            PAUSED
          </span>
        );
      case "STOPPED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-slate-900 text-slate-400 border border-slate-700/80">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
            STOPPED
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-slate-900 text-slate-300 border border-slate-700/60">
            DRAFT
          </span>
        );
      case "ERROR":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-red-950/80 text-red-400 border border-red-500/40 shadow-sm shadow-red-950">
            <AlertCircle className="h-3 w-3" />
            ERROR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  // SUBVIEW 1: Bot Creation Wizard (7-step canonical control plane)
  if (activeView === "create") {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between pb-4 border-b border-border/80">
          <button
            onClick={() => {
              setActiveView("fleet");
              loadBots();
            }}
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-raised"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Fleet Dashboard
          </button>
          <span className="text-xs font-mono text-blue-400 bg-blue-950/60 border border-blue-800/40 px-2.5 py-1 rounded-md">
            7-Step Bot Deployment Wizard
          </span>
        </div>
        <BotCreationControlPlane
          onClose={() => {
            setActiveView("fleet");
            loadBots();
          }}
        />
      </div>
    );
  }

  // SUBVIEW 2: Bot Terminal / Details Snapshot
  if (activeView === "details" && selectedBotId) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between pb-4 border-b border-border/80">
          <button
            onClick={() => {
              setSelectedBotId(null);
              setActiveView("fleet");
              loadBots();
            }}
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-raised"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Fleet Dashboard
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">Bot ID: {selectedBotId}</span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-md">
              Terminal Active
            </span>
          </div>
        </div>
        <BotControlCenterVNext botId={selectedBotId} />
      </div>
    );
  }

  // PRIMARY VIEW: Upgraded Trading Bot Fleet Dashboard
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-border/80">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Trading Bot Fleet Dashboard
                <span className="text-xs font-normal font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/50">
                  LIVE ENGINE v2.4
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time algorithmic execution units, deterministic risk limits, P&L telemetry & lifecycle controls.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadBots}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-surface-raised hover:text-white transition-all shadow-sm active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-400" : "text-slate-400"}`} />
            Refresh Fleet
          </button>
          <button
            onClick={() => setActiveView("create")}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            Deploy New Bot
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs font-mono text-red-400 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <div className="flex-1">
            <p className="font-semibold">Fleet Telemetry Error</p>
            <p className="text-red-400/80">{error}</p>
          </div>
          <button
            onClick={loadBots}
            className="px-3 py-1 bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 rounded text-red-200 text-xs font-sans"
          >
            Retry
          </button>
        </div>
      )}

      {/* Fleet Overview KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Net P&L Card */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-surface to-surface-raised/40 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Fleet Net P&L</span>
            <div
              className={`p-2 rounded-lg ${
                fleetMetrics.totalNetPnl >= 0
                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-950/60 text-rose-400 border border-rose-500/20"
              }`}
            >
              {fleetMetrics.totalNetPnl >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-bold font-mono tracking-tight ${
                fleetMetrics.totalNetPnl > 0
                  ? "text-emerald-400"
                  : fleetMetrics.totalNetPnl < 0
                  ? "text-rose-400"
                  : "text-slate-100"
              }`}
            >
              {formatSignedMoney(fleetMetrics.totalNetPnl)}
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11px] font-mono text-slate-400 border-t border-border/50 pt-2">
              <span>Realized: <b className="text-slate-200">{formatSignedMoney(fleetMetrics.totalRealized)}</b></span>
              <span>•</span>
              <span>Unrealized: <b className="text-slate-200">{formatSignedMoney(fleetMetrics.totalUnrealized)}</b></span>
            </div>
          </div>
        </div>

        {/* Active Bots Ratio Card */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-surface to-surface-raised/40 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Run Fleet</span>
            <div className="p-2 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-500/20">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tracking-tight text-white">
                {fleetMetrics.runningCount}
              </span>
              <span className="text-sm font-mono text-slate-400">/ {fleetMetrics.totalBots} Bots Live</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] font-mono text-slate-400 border-t border-border/50 pt-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-semibold">
                {fleetMetrics.totalBots > 0
                  ? ((fleetMetrics.runningCount / fleetMetrics.totalBots) * 100).toFixed(0)
                  : 0}
                % Fleet Utilization
              </span>
            </div>
          </div>
        </div>

        {/* Positions & Exposure Card */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-surface to-surface-raised/40 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Open Positions</span>
            <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-500/20">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {fleetMetrics.totalPositions} <span className="text-xs font-normal text-slate-400">Active Units</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-border/50 pt-2">
              <span>Execution State:</span>
              <span className="text-blue-400 font-semibold">Paper Protected</span>
            </div>
          </div>
        </div>

        {/* Executed Trades Card */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-surface to-surface-raised/40 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Trades & Fees</span>
            <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-500/20">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {fleetMetrics.totalTrades} <span className="text-xs font-normal text-slate-400">Fills</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-border/50 pt-2">
              <span>Total Fees Paid:</span>
              <span className="text-slate-200 font-semibold">{formatMoney(fleetMetrics.totalFees)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-3 rounded-xl border border-border">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {["ALL", "RUNNING", "READY", "PAUSED", "STOPPED", "ERROR"].map((status) => {
            const count =
              status === "ALL"
                ? bots.length
                : bots.filter((b) => b.status.toUpperCase() === status).length;
            const active = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-surface-raised/60 text-slate-400 hover:text-slate-200 hover:bg-surface-raised"
                }`}
              >
                {status}
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    active ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & View Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search bot, symbol, strategy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-surface-raised/80 border border-border pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center rounded-lg border border-border bg-surface-raised/50 p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === "grid"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === "table"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Dense Table View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Bot Presentation */}
      {loading && bots.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center text-slate-400">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <p className="font-mono text-sm text-slate-300">Synchronizing fleet metrics from core backend...</p>
          </div>
        </div>
      ) : filteredBots.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="p-4 rounded-2xl bg-surface-raised border border-border">
              <Bot className="h-10 w-10 text-slate-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">
              {searchQuery || statusFilter !== "ALL"
                ? "No trading bots match your filter criteria"
                : "No trading bots created yet"}
            </h3>
            <p className="text-xs text-slate-400 max-w-md">
              {searchQuery || statusFilter !== "ALL"
                ? "Try clearing the search query or changing the status filter to view other bots."
                : "Deploy an automated high-frequency paper trading bot with isolated risk limits and quantitative strategies."}
            </p>
            {searchQuery || statusFilter !== "ALL" ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="mt-2 text-xs font-mono text-blue-400 hover:underline"
              >
                Reset Filters
              </button>
            ) : (
              <button
                onClick={() => setActiveView("create")}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-600/30 transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                Create First Bot
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW: Real-World Rich Bot Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBots.map((bot) => {
            const netPnl = bot.pnl?.net_pnl || 0;
            const realizedPnl = bot.pnl?.realized_pnl || 0;
            const unrealizedPnl = bot.pnl?.unrealized_pnl || 0;
            const fees = bot.pnl?.fees || 0;
            const currency = bot.pnl?.currency || "$";
            const isPnlPositive = netPnl > 0;
            const isPnlNegative = netPnl < 0;

            return (
              <div
                key={bot.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-gradient-to-b from-surface to-surface-raised/30 hover:border-slate-600/80 transition-all duration-200 hover:shadow-xl hover:shadow-black/40 overflow-hidden"
              >
                {/* Top Status & Mode Banner */}
                <div className="p-5 pb-4 border-b border-border/60">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(bot.status)}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide border ${
                            bot.execution?.mode === "LIVE"
                              ? "bg-rose-950/80 text-rose-300 border-rose-600/40"
                              : "bg-blue-950/80 text-blue-300 border-blue-600/40"
                          }`}
                        >
                          {bot.execution?.mode || "PAPER"}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 bg-surface-raised border border-border">
                          {bot.market?.exchange || "DELTA"}
                        </span>
                      </div>

                      <h3
                        onClick={() => {
                          setSelectedBotId(bot.id);
                          setActiveView("details");
                        }}
                        className="mt-2.5 text-base font-bold text-white tracking-tight truncate group-hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        {bot.name}
                      </h3>

                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400">ID: {bot.id}</span>
                        <button
                          onClick={(e) => handleCopyId(bot.id, e)}
                          className="text-slate-500 hover:text-slate-300 transition-colors"
                          title="Copy Bot ID"
                        >
                          {copiedId === bot.id ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBotToDelete(bot);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition-colors"
                      title="Delete Bot"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Creation & Age Metadata */}
                  <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-400 font-mono bg-surface-raised/50 px-2.5 py-1.5 rounded-lg border border-border/40">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>Created:</span>
                      <span className="text-slate-200 font-semibold">{formatDateTime(bot.created_at)}</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950/70 text-blue-300 border border-blue-800/40">
                      {formatRelativeTime(bot.created_at)}
                    </span>
                  </div>
                </div>

                {/* Performance & Live PnL Box */}
                <div className="p-5 py-4 bg-surface-raised/20 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-slate-400 flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5 text-blue-400" />
                      Net Bot P&L
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Positions: <b className="text-slate-200">{bot.positions_count || 0}</b> | Trades:{" "}
                      <b className="text-slate-200">{bot.trades_count || 0}</b>
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between">
                    <div
                      className={`text-2xl font-bold font-mono tracking-tight ${
                        isPnlPositive
                          ? "text-emerald-400"
                          : isPnlNegative
                          ? "text-rose-400"
                          : "text-slate-100"
                      }`}
                    >
                      {formatSignedMoney(netPnl, currency)}
                    </div>
                    <div className="text-xs font-mono font-semibold text-slate-400">
                      {netPnl > 0 ? (
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <TrendingUp className="h-3.5 w-3.5" /> Profitable
                        </span>
                      ) : netPnl < 0 ? (
                        <span className="text-rose-400 flex items-center gap-0.5">
                          <TrendingDown className="h-3.5 w-3.5" /> Drawdown
                        </span>
                      ) : (
                        <span className="text-slate-400">Neutral</span>
                      )}
                    </div>
                  </div>

                  {/* Realized vs Unrealized vs Fees Grid */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-mono bg-surface-raised/40 p-2 rounded-lg border border-border/40 text-center">
                    <div>
                      <div className="text-slate-500">Realized</div>
                      <div
                        className={`font-semibold mt-0.5 ${
                          realizedPnl > 0
                            ? "text-emerald-400"
                            : realizedPnl < 0
                            ? "text-rose-400"
                            : "text-slate-300"
                        }`}
                      >
                        {formatSignedMoney(realizedPnl, currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Unrealized</div>
                      <div
                        className={`font-semibold mt-0.5 ${
                          unrealizedPnl > 0
                            ? "text-emerald-400"
                            : unrealizedPnl < 0
                            ? "text-rose-400"
                            : "text-slate-300"
                        }`}
                      >
                        {formatSignedMoney(unrealizedPnl, currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Fees</div>
                      <div className="font-semibold text-slate-300 mt-0.5">
                        {formatMoney(fees, currency)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strategy & Risk Parameters */}
                <div className="p-5 py-3.5 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Market Symbol:</span>
                    <span className="font-bold text-white px-2 py-0.5 rounded bg-surface-raised border border-border text-[11px]">
                      {bot.market?.symbol || "N/A"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Strategy & TF:</span>
                    <span className="text-slate-200 font-semibold truncate max-w-[180px]">
                      {bot.strategy?.type || "Quant Strategy"} ({bot.strategy?.timeframe || "1m"})
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Trade Quantity:</span>
                    <span className="text-slate-200 font-semibold">
                      {bot.risk?.quantity || 1} {bot.market?.symbol?.includes("BTC") ? "BTC" : "Units"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Target Risk / Limits:</span>
                    <span className="text-slate-300 text-[11px]">
                      TP: <b className="text-emerald-400">{bot.risk?.take_profit ? `+$${bot.risk.take_profit}` : "None"}</b> | SL:{" "}
                      <b className="text-rose-400">{bot.risk?.stop_loss ? `-$${bot.risk.stop_loss}` : "None"}</b>
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-4 bg-surface-raised/40 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {bot.status === "RUNNING" ? (
                      <>
                        <button
                          onClick={(e) => handleBotAction(bot.id, "pause", e)}
                          disabled={actionLoading[bot.id]}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-500/30 hover:bg-amber-900/60 text-xs font-mono font-medium transition-colors"
                          title="Pause execution"
                        >
                          <Pause className="h-3 w-3" />
                          Pause
                        </button>
                        <button
                          onClick={(e) => handleBotAction(bot.id, "stop", e)}
                          disabled={actionLoading[bot.id]}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-500/30 hover:bg-rose-900/60 text-xs font-mono font-medium transition-colors"
                          title="Stop bot"
                        >
                          <Square className="h-3 w-3" />
                          Stop
                        </button>
                      </>
                    ) : bot.status === "PAUSED" ? (
                      <>
                        <button
                          onClick={(e) => handleBotAction(bot.id, "resume", e)}
                          disabled={actionLoading[bot.id]}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60 text-xs font-mono font-medium transition-colors"
                          title="Resume execution"
                        >
                          <Play className="h-3 w-3" />
                          Resume
                        </button>
                        <button
                          onClick={(e) => handleBotAction(bot.id, "stop", e)}
                          disabled={actionLoading[bot.id]}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-500/30 hover:bg-rose-900/60 text-xs font-mono font-medium transition-colors"
                          title="Stop bot"
                        >
                          <Square className="h-3 w-3" />
                          Stop
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => handleBotAction(bot.id, "start", e)}
                        disabled={actionLoading[bot.id]}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-mono font-semibold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                        title="Start bot runtime"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Start Bot
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedBotId(bot.id);
                      setActiveView("details");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold font-mono text-blue-400 hover:text-blue-300 hover:underline group-hover:translate-x-0.5 transition-transform"
                  >
                    Open Terminal
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW: Institutional Fleet Operations Table */
        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-raised text-slate-400 font-mono uppercase text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Bot Identity</th>
                  <th className="px-5 py-3.5">Market / Mode</th>
                  <th className="px-5 py-3.5">Strategy</th>
                  <th className="px-5 py-3.5">Created Timestamp</th>
                  <th className="px-5 py-3.5">Positions / Trades</th>
                  <th className="px-5 py-3.5 text-right">Net P&L</th>
                  <th className="px-5 py-3.5 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-slate-200">
                {filteredBots.map((bot) => {
                  const netPnl = bot.pnl?.net_pnl || 0;
                  const isPnlPositive = netPnl > 0;
                  const isPnlNegative = netPnl < 0;
                  const currency = bot.pnl?.currency || "$";

                  return (
                    <tr
                      key={bot.id}
                      onClick={() => {
                        setSelectedBotId(bot.id);
                        setActiveView("details");
                      }}
                      className="hover:bg-surface-raised/60 transition-colors group cursor-pointer"
                    >
                      <td className="px-5 py-4">{getStatusBadge(bot.status)}</td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                          {bot.name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{bot.id}</span>
                          <button
                            onClick={(e) => handleCopyId(bot.id, e)}
                            className="text-slate-500 hover:text-slate-300"
                            title="Copy Bot ID"
                          >
                            {copiedId === bot.id ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white px-2 py-0.5 rounded bg-surface-raised border border-border">
                            {bot.market?.symbol || "N/A"}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              bot.execution?.mode === "LIVE"
                                ? "bg-rose-950/80 text-rose-300 border border-rose-600/40"
                                : "bg-blue-950/80 text-blue-300 border border-blue-600/40"
                            }`}
                          >
                            {bot.execution?.mode || "PAPER"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {bot.market?.exchange || "DELTA"} • {bot.market?.asset_class || "CRYPTO"}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-300">
                        <div className="font-semibold">{bot.strategy?.type || "Custom Strategy"}</div>
                        <div className="text-[10px] text-slate-500">TF: {bot.strategy?.timeframe || "1m"}</div>
                      </td>
                      <td className="px-5 py-4 font-mono">
                        <div className="text-slate-200 text-[11px]">{formatDateTime(bot.created_at)}</div>
                        <div className="text-[10px] text-blue-400">{formatRelativeTime(bot.created_at)}</div>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-300">
                        <div>
                          Open: <b className="text-white">{bot.positions_count || 0}</b>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Trades: <b className="text-slate-400">{bot.trades_count || 0}</b>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-right">
                        <div
                          className={`text-sm font-bold ${
                            isPnlPositive
                              ? "text-emerald-400"
                              : isPnlNegative
                              ? "text-rose-400"
                              : "text-slate-200"
                          }`}
                        >
                          {formatSignedMoney(netPnl, currency)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Realized: {formatSignedMoney(bot.pnl?.realized_pnl, currency)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {bot.status === "RUNNING" ? (
                            <button
                              onClick={(e) => handleBotAction(bot.id, "pause", e)}
                              disabled={actionLoading[bot.id]}
                              className="p-1.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/30 hover:bg-amber-900/60"
                              title="Pause"
                            >
                              <Pause className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleBotAction(bot.id, "start", e)}
                              disabled={actionLoading[bot.id]}
                              className="p-1.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60"
                              title="Start"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedBotId(bot.id);
                              setActiveView("details");
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-surface-raised px-2.5 py-1 text-xs font-semibold font-mono text-blue-400 hover:bg-blue-600 hover:text-white border border-border transition-all"
                          >
                            View <ArrowUpRight className="h-3 w-3" />
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

      {/* Delete Bot Safeguard Modal */}
      {botToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="h-6 w-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Delete Trading Bot</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete bot{" "}
              <span className="font-mono font-bold text-white">{botToDelete.name}</span> (ID:{" "}
              <span className="font-mono text-blue-400">{botToDelete.id}</span>)?
            </p>
            <p className="text-[11px] text-slate-400 font-mono bg-red-950/30 border border-red-800/30 p-2.5 rounded-lg">
              WARNING: This removes the runtime instance and stops all execution cycles. Historical logs and closed trade entries remain safely in database.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setBotToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg border border-border bg-surface-raised text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700/50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBot}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2"
              >
                {isDeleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BotControlTab() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-12 text-center text-slate-400">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <p className="font-mono text-sm text-slate-300">Loading Trading Bot Fleet Control...</p>
          </div>
        </div>
      }
    >
      <BotControlTabInner />
    </Suspense>
  );
}
export default BotControlTab;
