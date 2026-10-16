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
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <button
            onClick={() => {
              setActiveView("fleet");
              loadBots();
            }}
            className="inline-flex items-center gap-2 text-sm font-mono font-bold text-slate-300 hover:text-white transition-all px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0B1426] hover:bg-slate-800 cursor-pointer shadow-sm active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 text-cyan-400" />
            Return to Fleet Dashboard
          </button>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono font-bold text-cyan-300 bg-blue-500/10 border border-cyan-500/30 px-3.5 py-1.5 rounded-full shadow-sm">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              7-Step Quantitative Deployment Wizard
            </span>
          </div>
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
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <button
            onClick={() => {
              setSelectedBotId(null);
              setActiveView("fleet");
              loadBots();
            }}
            className="inline-flex items-center gap-2 text-sm font-mono font-bold text-slate-300 hover:text-white transition-all px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0B1426] hover:bg-slate-800 cursor-pointer shadow-sm active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 text-cyan-400" />
            Return to Bot Fleet
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-slate-400">Unit: <span className="text-white font-bold">{selectedBotId}</span></span>
            <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-1.5 rounded-full shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Terminal Stream Connected
            </span>
          </div>
        </div>
        <BotControlCenterVNext botId={selectedBotId} onBack={() => setActiveView("fleet")} />
      </div>
    );
  }

// PRIMARY VIEW: Upgraded Institutional Trading Bot Fleet Dashboard
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-r from-[#0B1528] via-[#09101F] to-[#0D182E] p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
        {/* Subtle accent glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-600" />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 border border-blue-400/40 flex-shrink-0">
              <Bot className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Quantitative Bot Fleet
                </h1>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm font-mono font-bold bg-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  QUANT.OS ENGINE v2.4
                </span>
                <span className="text-xs sm:text-sm font-mono px-3 py-1 rounded-full bg-slate-900/80 text-slate-300 border border-slate-800 font-bold">
                  {fleetMetrics.totalBots} {fleetMetrics.totalBots === 1 ? "Unit" : "Units"} Enrolled
                </span>
              </div>
              <p className="text-sm sm:text-base text-slate-300 mt-1.5 max-w-2xl font-sans">
                Deterministic real-time algorithmic execution units, isolated risk gates, high-frequency P&L telemetry & canonical lifecycle controls.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <button
              onClick={loadBots}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm font-mono font-bold text-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-cyan-400" : "text-slate-400"}`} />
              Sync Fleet
            </button>
            <button
              onClick={() => setActiveView("create")}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-5 py-3 text-sm font-mono font-black text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-cyan-400 transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="h-5 w-5" />
              Deploy New Bot
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-sm font-mono text-rose-300 flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-400" />
          <div className="flex-1">
            <p className="font-bold text-white">Fleet Telemetry Diagnostic</p>
            <p className="text-rose-300/80 mt-0.5">{error}</p>
          </div>
          <button
            onClick={loadBots}
            className="px-3.5 py-1.5 bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/50 rounded-lg text-rose-200 text-xs sm:text-sm font-mono font-bold transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Fleet Overview KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Net P&L Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-5 sm:p-6 shadow-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-mono font-bold text-slate-300 uppercase tracking-wider">
              Fleet Net P&L
            </span>
            <div
              className={`p-2.5 rounded-xl border ${
                fleetMetrics.totalNetPnl >= 0
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-sm shadow-rose-500/20"
              }`}
            >
              {fleetMetrics.totalNetPnl >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                fleetMetrics.totalNetPnl > 0
                  ? "text-emerald-400"
                  : fleetMetrics.totalNetPnl < 0
                  ? "text-rose-400"
                  : "text-slate-100"
              }`}
            >
              {formatSignedMoney(fleetMetrics.totalNetPnl)}
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs sm:text-sm font-mono text-slate-300 border-t border-slate-800/80 pt-3">
              <div>
                <span className="text-slate-400 block text-xs font-bold">REALIZED</span>
                <span className={`font-bold ${fleetMetrics.totalRealized >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatSignedMoney(fleetMetrics.totalRealized)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-xs font-bold">UNREALIZED</span>
                <span className={`font-bold ${fleetMetrics.totalUnrealized >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatSignedMoney(fleetMetrics.totalUnrealized)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Bots Ratio Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-5 sm:p-6 shadow-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-mono font-bold text-slate-300 uppercase tracking-wider">
              Fleet Runtime
            </span>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/20">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                {fleetMetrics.runningCount}
              </span>
              <span className="text-sm font-mono text-slate-300 font-bold">/ {fleetMetrics.totalBots} Units Running</span>
            </div>
            <div className="mt-3.5 flex items-center justify-between text-xs sm:text-sm font-mono border-t border-slate-800/80 pt-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-bold">
                  {fleetMetrics.totalBots > 0
                    ? Math.round((fleetMetrics.runningCount / fleetMetrics.totalBots) * 100)
                    : 0}
                  % Active
                </span>
              </div>
              <span className="text-slate-400 font-medium">
                {fleetMetrics.totalBots - fleetMetrics.runningCount} Idle / Paused
              </span>
            </div>
          </div>
        </div>

        {/* Positions & Exposure Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-5 sm:p-6 shadow-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-mono font-bold text-slate-300 uppercase tracking-wider">
              Open Positions
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/20">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
              {fleetMetrics.totalPositions}{" "}
              <span className="text-sm font-bold font-mono text-slate-400">Contracts</span>
            </div>
            <div className="mt-3.5 flex items-center justify-between text-xs sm:text-sm font-mono text-slate-300 border-t border-slate-800/80 pt-3">
              <span className="text-slate-400">Risk State:</span>
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-cyan-400" /> Auto-Guarded
              </span>
            </div>
          </div>
        </div>

        {/* Executed Trades Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-5 sm:p-6 shadow-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-mono font-bold text-slate-300 uppercase tracking-wider">
              Total Fills & Fees
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/20">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
              {fleetMetrics.totalTrades}{" "}
              <span className="text-sm font-bold font-mono text-slate-400">Executions</span>
            </div>
            <div className="mt-3.5 flex items-center justify-between text-xs sm:text-sm font-mono text-slate-300 border-t border-slate-800/80 pt-3">
              <span className="text-slate-400">Fees Paid:</span>
              <span className="text-slate-200 font-bold font-mono">{formatMoney(fleetMetrics.totalFees)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B1426]/90 p-3.5 rounded-2xl border border-slate-800/80 shadow-lg backdrop-blur-md">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
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
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40"
                    : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>{status}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
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
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search bot, symbol, strategy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-slate-900/80 border border-slate-800 pl-10 pr-8 py-2 text-xs sm:text-sm font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-white cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/80 p-1 shadow-inner">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg text-sm transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg text-sm transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Dense Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>


      {/* Main Bot Presentation */}
      {loading && bots.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-[#09101F] p-16 text-center text-slate-400 shadow-xl">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
            <p className="font-mono text-sm text-slate-300">Synchronizing fleet metrics from core backend...</p>
          </div>
        </div>
      ) : filteredBots.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-[#09101F] p-16 text-center shadow-xl">
          <div className="flex flex-col items-center justify-center gap-3.5 max-w-md mx-auto">
            <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400">
              <Bot className="h-10 w-10" />
            </div>
            <h3 className="text-base font-bold text-white">
              {searchQuery || statusFilter !== "ALL"
                ? "No trading bots match your filter criteria"
                : "No trading bots configured yet"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {searchQuery || statusFilter !== "ALL"
                ? "Try clearing the search query or changing the status filter to view other bots."
                : "Deploy an automated institutional trading bot with live option chain selection, dynamic technical indicators, and isolated risk limits."}
            </p>
            {searchQuery || statusFilter !== "ALL" ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="mt-2 text-xs font-mono font-bold text-cyan-400 hover:underline cursor-pointer"
              >
                Reset All Filters
              </button>
            ) : (
              <button
                onClick={() => setActiveView("create")}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-xs font-mono font-bold text-white hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                Launch First Bot
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW: Institutional Fintech Bot Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0C1527] to-[#070D1A] hover:border-cyan-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-950/20 overflow-hidden"
              >
                {/* Top glowing accent line */}
                <div
                  className={`h-1.5 w-full ${
                    bot.status === "RUNNING"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : bot.status === "PAUSED"
                      ? "bg-gradient-to-r from-amber-500 to-orange-400"
                      : "bg-slate-800"
                  }`}
                />

                {/* Top Status & Mode Banner */}
                <div className="p-5 sm:p-6 pb-4 border-b border-slate-800/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {getStatusBadge(bot.status)}
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold tracking-wide border ${
                            bot.execution?.mode === "LIVE"
                              ? "bg-rose-950/80 text-rose-300 border-rose-600/40 shadow-sm shadow-rose-950"
                              : "bg-cyan-950/80 text-cyan-300 border-cyan-600/40"
                          }`}
                        >
                          {bot.execution?.mode || "PAPER"}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold text-slate-300 bg-slate-900 border border-slate-800">
                          {bot.market?.exchange || "DELTA"}
                        </span>
                      </div>

                      <h3
                        onClick={() => {
                          setSelectedBotId(bot.id);
                          setActiveView("details");
                        }}
                        className="mt-3.5 text-lg sm:text-xl font-black text-white tracking-tight truncate group-hover:text-cyan-300 transition-colors cursor-pointer"
                        title={bot.name}
                      >
                        {bot.name}
                      </h3>

                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-mono text-slate-400">ID: {bot.id}</span>
                        <button
                          onClick={(e) => handleCopyId(bot.id, e)}
                          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy Bot ID"
                        >
                          {copiedId === bot.id ? (
                            <Check className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBotToDelete(bot);
                      }}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition-colors cursor-pointer"
                      title="Delete Bot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Creation & Age Metadata */}
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-300 font-mono bg-slate-900/60 px-3.5 py-2 rounded-xl border border-slate-800/60 font-medium">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span>{formatDateTime(bot.created_at)}</span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-cyan-300 border border-blue-500/30">
                      {formatRelativeTime(bot.created_at)}
                    </span>
                  </div>
                </div>

                {/* Performance & Live PnL Box */}
                <div className="p-5 sm:p-6 py-4 bg-slate-950/40 border-b border-slate-800/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-mono font-bold text-slate-300 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-cyan-400" />
                      AUTHORITATIVE P&L
                    </span>
                    <span className="text-xs font-mono text-slate-300">
                      Positions: <b className="text-white">{bot.positions_count || 0}</b> | Fills:{" "}
                      <b className="text-white">{bot.trades_count || 0}</b>
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div
                      className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                        isPnlPositive
                          ? "text-emerald-400"
                          : isPnlNegative
                          ? "text-rose-400"
                          : "text-slate-100"
                      }`}
                    >
                      {formatSignedMoney(netPnl, currency)}
                    </div>
                    <div className="text-xs sm:text-sm font-mono font-black">
                      {netPnl > 0 ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" /> PROFIT
                        </span>
                      ) : netPnl < 0 ? (
                        <span className="text-rose-400 flex items-center gap-1">
                          <TrendingDown className="h-4 w-4" /> DRAWDOWN
                        </span>
                      ) : (
                        <span className="text-slate-400">NEUTRAL</span>
                      )}
                    </div>
                  </div>

                  {/* Realized vs Unrealized vs Fees Grid */}
                  <div className="mt-3.5 grid grid-cols-3 gap-2 text-xs font-mono bg-slate-900/80 p-3 rounded-xl border border-slate-800/60 text-center">
                    <div>
                      <div className="text-slate-400 font-bold text-[11px]">REALIZED</div>
                      <div
                        className={`font-black mt-1 text-xs sm:text-sm ${
                          realizedPnl > 0
                            ? "text-emerald-400"
                            : realizedPnl < 0
                            ? "text-rose-400"
                            : "text-slate-200"
                        }`}
                      >
                        {formatSignedMoney(realizedPnl, currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-bold text-[11px]">UNREALIZED</div>
                      <div
                        className={`font-black mt-1 text-xs sm:text-sm ${
                          unrealizedPnl > 0
                            ? "text-emerald-400"
                            : unrealizedPnl < 0
                            ? "text-rose-400"
                            : "text-slate-200"
                        }`}
                      >
                        {formatSignedMoney(unrealizedPnl, currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-bold text-[11px]">FEES</div>
                      <div className="font-black text-slate-200 mt-1 text-xs sm:text-sm">
                        {formatMoney(fees, currency)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strategy & Risk Parameters */}
                <div className="p-5 sm:p-6 py-4 space-y-2.5 text-xs sm:text-sm font-mono">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 font-medium">Instrument:</span>
                    <span className="font-bold text-white px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs sm:text-sm">
                      {bot.market?.symbol || "N/A"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 font-medium">Strategy & TF:</span>
                    <span className="text-white font-bold truncate max-w-[200px]">
                      {bot.strategy?.type || "Quant Model"} ({bot.strategy?.timeframe || "1m"})
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 font-medium">Position Size:</span>
                    <span className="text-white font-bold">
                      {bot.risk?.quantity || 1} {bot.market?.symbol?.includes("BTC") ? "BTC" : "Units"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 font-medium">Risk Guards:</span>
                    <span className="text-slate-200 text-xs sm:text-sm font-bold">
                      TP: <b className="text-emerald-400">{bot.risk?.take_profit ? `+$${bot.risk.take_profit}` : "None"}</b> | SL:{" "}
                      <b className="text-rose-400">{bot.risk?.stop_loss ? `-$${bot.risk.stop_loss}` : "None"}</b>
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-4 sm:p-5 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {bot.status === "RUNNING" ? (
                      <>
                        <button
                          onClick={(e) => handleBotAction(bot.id, "pause", e)}
                          disabled={actionLoading[bot.id]}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-500/30 hover:bg-amber-900/60 text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer active:scale-95"
                          title="Pause execution"
                        >
                          <Pause className="h-3.5 w-3.5" />
                          Pause
                        </button>
                        <button
                          onClick={(e) => handleBotAction(bot.id, "stop", e)}
                          disabled={actionLoading[bot.id]}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/60 text-rose-300 border border-rose-500/30 hover:bg-rose-900/60 text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer active:scale-95"
                          title="Stop bot"
                        >
                          <Square className="h-3.5 w-3.5" />
                          Stop
                        </button>
                      </>
                    ) : bot.status === "PAUSED" ? (
                      <>
                        <button
                          onClick={(e) => handleBotAction(bot.id, "resume", e)}
                          disabled={actionLoading[bot.id]}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60 text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer active:scale-95"
                          title="Resume execution"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Resume
                        </button>
                        <button
                          onClick={(e) => handleBotAction(bot.id, "stop", e)}
                          disabled={actionLoading[bot.id]}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/60 text-rose-300 border border-rose-500/30 hover:bg-rose-900/60 text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer active:scale-95"
                          title="Stop bot"
                        >
                          <Square className="h-3.5 w-3.5" />
                          Stop
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => handleBotAction(bot.id, "start", e)}
                        disabled={actionLoading[bot.id]}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:from-emerald-500 hover:to-teal-400 text-xs sm:text-sm font-mono font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                        title="Start bot runtime"
                      >
                        <Play className="h-4 w-4" />
                        Start Bot
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedBotId(bot.id);
                      setActiveView("details");
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600 hover:text-white text-cyan-300 border border-cyan-500/30 text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer active:scale-95 group-hover:border-cyan-400/60 shadow-sm"
                  >
                    <span>Terminal</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW: Institutional Fleet Operations Table */
        <div className="rounded-2xl border border-slate-800/80 bg-[#09101F] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-300 font-mono uppercase text-xs sm:text-[13px] font-bold">
                <tr>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Bot Identity</th>
                  <th className="px-5 py-4">Market / Mode</th>
                  <th className="px-5 py-4">Strategy</th>
                  <th className="px-5 py-4">Created Timestamp</th>
                  <th className="px-5 py-4">Positions / Fills</th>
                  <th className="px-5 py-4 text-right">Net P&L</th>
                  <th className="px-5 py-4 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
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
                      className="hover:bg-slate-900/60 transition-colors group cursor-pointer"
                    >
                      <td className="px-5 py-4">{getStatusBadge(bot.status)}</td>
                      <td className="px-5 py-4">
                        <div className="font-black text-white text-sm sm:text-base group-hover:text-cyan-300 transition-colors">
                          {bot.name}
                        </div>
                        <div className="font-mono text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                          <span>{bot.id}</span>
                          <button
                            onClick={(e) => handleCopyId(bot.id, e)}
                            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Copy Bot ID"
                          >
                            {copiedId === bot.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs sm:text-sm">
                            {bot.market?.symbol || "N/A"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              bot.execution?.mode === "LIVE"
                                ? "bg-rose-950/80 text-rose-300 border border-rose-600/40"
                                : "bg-cyan-950/80 text-cyan-300 border border-cyan-600/40"
                            }`}
                          >
                            {bot.execution?.mode || "PAPER"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 font-medium">
                          {bot.market?.exchange || "DELTA"} • {bot.market?.asset_class || "CRYPTO"}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-300">
                        <div className="font-bold text-white text-xs sm:text-sm">{bot.strategy?.type || "Custom Model"}</div>
                        <div className="text-xs text-slate-400 mt-0.5">TF: {bot.strategy?.timeframe || "1m"}</div>
                      </td>
                      <td className="px-5 py-4 font-mono">
                        <div className="text-slate-200 text-xs sm:text-sm font-medium">{formatDateTime(bot.created_at)}</div>
                        <div className="text-xs text-cyan-400 font-bold mt-0.5">{formatRelativeTime(bot.created_at)}</div>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-300">
                        <div className="text-xs sm:text-sm">
                          Open: <b className="text-white">{bot.positions_count || 0}</b>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Fills: <b className="text-slate-300">{bot.trades_count || 0}</b>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-right">
                        <div
                          className={`text-sm sm:text-base font-black ${
                            isPnlPositive
                              ? "text-emerald-400"
                              : isPnlNegative
                              ? "text-rose-400"
                              : "text-slate-200"
                          }`}
                        >
                          {formatSignedMoney(netPnl, currency)}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Realized: {formatSignedMoney(bot.pnl?.realized_pnl, currency)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {bot.status === "RUNNING" ? (
                            <button
                              onClick={(e) => handleBotAction(bot.id, "pause", e)}
                              disabled={actionLoading[bot.id]}
                              className="p-2.5 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-500/30 hover:bg-amber-900/60 cursor-pointer"
                              title="Pause"
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleBotAction(bot.id, "start", e)}
                              disabled={actionLoading[bot.id]}
                              className="p-2.5 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60 cursor-pointer"
                              title="Start"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedBotId(bot.id);
                              setActiveView("details");
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600/10 hover:bg-blue-600 hover:text-white px-3.5 py-2 text-xs sm:text-sm font-bold font-mono text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            <span>Terminal</span>
                            <ArrowUpRight className="h-4 w-4" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-[#0B1426] p-7 shadow-2xl space-y-4">
            <div className="flex items-center gap-3.5 text-rose-400">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <ShieldAlert className="h-6 w-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Decommission Trading Bot</h3>
                <span className="text-xs sm:text-sm text-rose-400 font-mono font-bold">Irreversible Action</span>
              </div>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              Are you sure you want to permanently decommission bot{" "}
              <span className="font-mono font-bold text-white">{botToDelete.name}</span> (ID:{" "}
              <span className="font-mono text-cyan-400 font-bold">{botToDelete.id}</span>)?
            </p>
            <div className="text-xs sm:text-sm text-slate-300 font-mono bg-rose-950/30 border border-rose-800/30 p-3.5 rounded-xl leading-relaxed">
              WARNING: This removes the runtime instance and halts all active order placement cycles. Closed ledger trades and past metrics remain safely recorded in database.
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setBotToDelete(null)}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-sm font-mono font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBot}
                disabled={isDeleting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-sm font-mono font-black text-white shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Confirm Decommission
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
