"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import {
  NormalizedEvent,
  TradeJournalEntry,
  FailureJournalEntry,
  ProviderObservatoryTelemetry,
  TopLiveEntities,
  ObservatoryHeaderMetrics,
  Environment,
} from "@/types/data-core";

import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Code2,
  Cpu,
  Database,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Flame,
  Layers3,
  LineChart,
  ListOrdered,
  Maximize2,
  Network,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function safeText(value: unknown, fallback = "--") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

function formatTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatCurrency(val?: number | null, currency = "INR") {
  if (val === null || val === undefined) return "--";
  const symbol = currency === "USD" || currency === "USDT" ? "$" : "₹";
  return `${symbol}${Number(val).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function getLatencyTone(latency: number) {
  if (latency <= 0) return "text-slate-400";
  if (latency <= 30) return "text-emerald-300";
  if (latency <= 100) return "text-cyan-300";
  if (latency <= 200) return "text-amber-300";
  return "text-rose-300";
}

function getSeverityBadge(severity?: string) {
  const s = String(severity || "INFO").toUpperCase();
  switch (s) {
    case "CRITICAL":
      return "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse";
    case "ERROR":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    case "WARN":
    case "WARNING":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "SUCCESS":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    default:
      return "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";
  }
}

function getDomainClasses(domain: string) {
  switch (domain) {
    case "MARKET_DATA":
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
    case "ORDER":
    case "FILL":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "POSITION":
      return "border-violet-400/20 bg-violet-400/10 text-violet-300";
    case "CAPITAL":
    case "ACCOUNT":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    case "RISK":
      return "border-rose-400/20 bg-rose-400/10 text-rose-300";
    case "BOT":
    case "STRATEGY":
      return "border-blue-400/20 bg-blue-400/10 text-blue-300";
    case "RECONCILIATION":
      return "border-teal-400/20 bg-teal-400/10 text-teal-300";
    default:
      return "border-slate-700 bg-slate-800/60 text-slate-300";
  }
}

/* -------------------------------------------------------------------------- */
/*                               METRIC CARD                                  */
/* -------------------------------------------------------------------------- */

function MetricStripCard({
  label,
  value,
  subtitle,
  tone = "slate",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  tone?: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
  icon?: React.ReactNode;
}) {
  const toneStyles = {
    cyan: "text-cyan-300 border-cyan-500/20 bg-cyan-950/20",
    emerald: "text-emerald-300 border-emerald-500/20 bg-emerald-950/20",
    amber: "text-amber-300 border-amber-500/20 bg-amber-950/20",
    rose: "text-rose-300 border-rose-500/20 bg-rose-950/20",
    violet: "text-violet-300 border-violet-500/20 bg-violet-950/20",
    slate: "text-slate-200 border-slate-700/60 bg-[#081522]",
  };

  return (
    <div className={`rounded-lg border p-2.5 shadow-sm ${toneStyles[tone]}`}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 truncate">
          {label}
        </span>
        {icon && <span className="opacity-70">{icon}</span>}
      </div>
      <div className="mt-1 text-sm font-bold truncate">{value}</div>
      {subtitle && <div className="text-[9px] text-slate-500 truncate mt-0.5">{subtitle}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                        MAIN OBSERVATORY COMPONENT                          */
/* -------------------------------------------------------------------------- */

type TabType =
  | "LIVE_STREAM"
  | "TRADE_JOURNAL"
  | "BOT_ACTIVITY"
  | "ORDERS"
  | "POSITIONS"
  | "RISK"
  | "FAILURES"
  | "PROVIDERS"
  | "CAPITAL"
  | "SYSTEM"
  | "AUDIT";

export function LiveStreamObservatory() {
  const [activeTab, setActiveTab] = useState<TabType>("LIVE_STREAM");
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("ALL");
  const [selectedProvider, setSelectedProvider] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("ALL");
  const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);
  const [selectedCorrelationChain, setSelectedCorrelationChain] = useState<NormalizedEvent[]>([]);
  const [chainLoading, setChainLoading] = useState(false);

  // In-memory buffered display events (max 1000 items)
  const [events, setEvents] = useState<NormalizedEvent[]>([]);

  /* ---------------------------------------------------------------------- */
  /* 1. QUERY LIVE STREAM DATA & HEADER METRICS                             */
  /* ---------------------------------------------------------------------- */

  const { data: streamData, refetch: refetchStream } = useQuery({
    queryKey: ["v2_stream_recent"],
    queryFn: async () => {
      const res = await apiClient.get<{
        status: string;
        data: NormalizedEvent[];
        metrics: ObservatoryHeaderMetrics;
      }>("/api/v2/stream/recent?limit=300");
      return res.data || { status: "error", data: [], metrics: {} as any };
    },
    refetchInterval: isPaused ? false : 1500,
    staleTime: 1000,
  });

  const { data: topEntitiesData } = useQuery({
    queryKey: ["v2_stream_top_entities"],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; data: TopLiveEntities }>("/api/v2/stream/top-entities");
      return res.data?.data || null;
    },
    refetchInterval: isPaused ? false : 4000,
  });

  const { data: tradeJournalData, refetch: refetchTrades } = useQuery({
    queryKey: ["v2_journal_trades"],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; data: TradeJournalEntry[] }>("/api/v2/journal/trades?limit=100");
      return res.data?.data || [];
    },
    refetchInterval: isPaused ? false : 3000,
  });

  const { data: failureJournalData, refetch: refetchFailures } = useQuery({
    queryKey: ["v2_journal_failures"],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; data: FailureJournalEntry[] }>("/api/v2/journal/failures?limit=100");
      return res.data?.data || [];
    },
    refetchInterval: isPaused ? false : 3000,
  });

  const { data: providerObservatoryData, refetch: refetchProviders } = useQuery({
    queryKey: ["v2_observatory_providers"],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; data: ProviderObservatoryTelemetry[] }>("/api/v2/observatory/providers");
      return res.data?.data || [];
    },
    refetchInterval: isPaused ? false : 3000,
  });

  // Sync incoming stream data to bounded buffer
  useEffect(() => {
    if (!isPaused && Array.isArray(streamData?.data)) {
      setEvents(streamData.data);
    }
  }, [streamData, isPaused]);

  // Load correlation chain when inspecting event with correlationId
  const handleInspectEvent = useCallback(async (ev: NormalizedEvent) => {
    setSelectedEvent(ev);
    const corrId = ev.correlationId || ev.correlation_id || ev.eventId;
    if (corrId) {
      setChainLoading(true);
      try {
        const res = await apiClient.get<{ status: string; data: NormalizedEvent[] }>(`/api/v2/stream/correlation/${corrId}`);
        setSelectedCorrelationChain(res.data?.data || []);
      } catch (e) {
        setSelectedCorrelationChain([]);
      } finally {
        setChainLoading(false);
      }
    } else {
      setSelectedCorrelationChain([]);
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* DYNAMIC FILTER MENUS                                                   */
  /* ---------------------------------------------------------------------- */

  const providers = useMemo(() => {
    const list = ["ALL", "BINANCE_USDM", "BINANCE_COINM", "DELTA", "DHAN", "UPSTOX", "PAPER", "SYSTEM"];
    const fromEvents = events.map((e) => safeText(e.provider)).filter(Boolean);
    return Array.from(new Set([...list, ...fromEvents])).sort();
  }, [events]);

  const domains = useMemo(() => {
    const list = ["ALL", "MARKET_DATA", "ORDER", "FILL", "POSITION", "BOT", "STRATEGY", "RISK", "CAPITAL", "SYSTEM", "RECONCILIATION", "AUDIT"];
    return list;
  }, []);

  /* ---------------------------------------------------------------------- */
  /* FILTERED EVENTS                                                        */
  /* ---------------------------------------------------------------------- */

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((ev) => {
      const domain = String(ev.domain || "");
      const provider = String(ev.provider || "");
      const severity = String(ev.severity || "INFO");
      const env = String(ev.environment || "PAPER");

      if (selectedDomain !== "ALL" && domain !== selectedDomain) return false;
      if (selectedProvider !== "ALL" && provider !== selectedProvider) return false;
      if (selectedSeverity !== "ALL" && severity !== selectedSeverity) return false;
      if (selectedEnvironment !== "ALL" && env !== selectedEnvironment) return false;

      if (!q) return true;

      const haystack = [
        ev.eventId,
        ev.event_id,
        ev.eventType,
        ev.event_type,
        ev.botId,
        ev.bot_id,
        ev.botName,
        ev.bot_name,
        ev.strategyId,
        ev.strategy_id,
        ev.symbol,
        ev.orderId,
        ev.order_id,
        ev.tradeId,
        ev.trade_id,
        ev.positionId,
        ev.errorCode,
        ev.error_code,
        ev.decisionReason,
        ev.decision_reason,
        ev.correlationId,
        ev.correlation_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [events, selectedDomain, selectedProvider, selectedSeverity, selectedEnvironment, searchQuery]);

  /* ---------------------------------------------------------------------- */
  /* EXPORT HANDLERS                                                        */
  /* ---------------------------------------------------------------------- */

  const handleExport = (format: "csv" | "json") => {
    const exportUrl = `/api/v2/stream/export?format=${format}&limit=2000&domain=${selectedDomain}&provider=${selectedProvider}`;
    window.open(exportUrl, "_blank");
  };

  const metrics: ObservatoryHeaderMetrics = streamData?.metrics || {
    eventsPerSec: 0,
    bufferSize: events.length,
    providersLive: 0,
    totalProviders: 8,
    botsRunning: 0,
    botsFailed: 0,
    ordersPending: 0,
    positionsOpen: 0,
    realizedPnL: 0,
    unrealizedPnL: 0,
    riskRejected: 0,
    providerReconnects: 0,
    averageLatencyMs: 0,
    p95LatencyMs: 0,
    maxDataAgeMs: 0,
    omsStatus: "HEALTHY",
    reconciliationStatus: "HEALTHY",
  };

  const topEntities = topEntitiesData || {};

  /* ---------------------------------------------------------------------- */
  /* RENDER                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------------ */}
      {/* 1. TOP LIVE METRICS HEADER (16 METRICS)                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8 xl:grid-cols-8">
        <MetricStripCard
          label="Events / Sec"
          value={`${metrics.eventsPerSec} evt/s`}
          subtitle={`Buffer: ${metrics.bufferSize}`}
          tone="cyan"
          icon={<Zap className="h-3.5 w-3.5" />}
        />
        <MetricStripCard
          label="Providers Live"
          value={`${metrics.providersLive} / ${metrics.totalProviders}`}
          subtitle={`Reconnects: ${metrics.providerReconnects}`}
          tone={metrics.providersLive > 0 ? "emerald" : "amber"}
          icon={<Network className="h-3.5 w-3.5" />}
        />
        <MetricStripCard
          label="Bots Fleet"
          value={`${metrics.botsRunning} Running`}
          subtitle={`Failed: ${metrics.botsFailed}`}
          tone={metrics.botsFailed > 0 ? "rose" : "cyan"}
          icon={<Bot className="h-3.5 w-3.5" />}
        />
        <MetricStripCard
          label="OMS Orders"
          value={`${metrics.ordersPending} Pending`}
          subtitle={`Status: ${metrics.omsStatus}`}
          tone={metrics.omsStatus === "HEALTHY" ? "emerald" : "amber"}
          icon={<ListOrdered className="h-3.5 w-3.5" />}
        />
        <MetricStripCard
          label="Positions Open"
          value={`${metrics.positionsOpen}`}
          subtitle={`Risk Rejects: ${metrics.riskRejected}`}
          tone="violet"
          icon={<Layers3 className="h-3.5 w-3.5" />}
        />
        <MetricStripCard
          label="Realized P&L"
          value={formatCurrency(metrics.realizedPnL)}
          subtitle={`Unrealized: ${formatCurrency(metrics.unrealizedPnL)}`}
          tone={metrics.realizedPnL >= 0 ? "emerald" : "rose"}
          icon={metrics.realizedPnL >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        />
        <MetricStripCard
          label="Latency Profiler"
          value={`${metrics.averageLatencyMs} ms`}
          subtitle={`p95: ${metrics.p95LatencyMs} ms`}
          tone={metrics.averageLatencyMs < 50 ? "emerald" : metrics.averageLatencyMs < 150 ? "amber" : "rose"}
          icon={<Clock3 className="h-3.5 w-3.5" />}
        />
        <MetricStripCard
          label="Audit & Recon"
          value={metrics.reconciliationStatus}
          subtitle={`Max Age: ${metrics.maxDataAgeMs}ms`}
          tone={metrics.reconciliationStatus === "HEALTHY" ? "emerald" : "rose"}
          icon={metrics.reconciliationStatus === "HEALTHY" ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. DYNAMIC TOP LIVE ENTITIES TICKER STRIP                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-[#07131f] p-2.5 text-[11px] text-slate-300">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-cyan-300 mr-1">
          <Flame className="h-3.5 w-3.5 text-amber-400" />
          Top Entities:
        </span>
        {topEntities.topActiveBot && (
          <span className="rounded bg-slate-800/80 px-2 py-0.5 border border-slate-700">
            Bot Activity: <strong className="text-slate-100">{topEntities.topActiveBot.name}</strong> ({topEntities.topActiveBot.activityCount})
          </span>
        )}
        {topEntities.mostActiveStrategy && (
          <span className="rounded bg-slate-800/80 px-2 py-0.5 border border-slate-700">
            Strategy: <strong className="text-cyan-200">{topEntities.mostActiveStrategy}</strong>
          </span>
        )}
        {topEntities.mostTradedInstrument && (
          <span className="rounded bg-slate-800/80 px-2 py-0.5 border border-slate-700">
            Volume Leader: <strong className="text-emerald-300">{topEntities.mostTradedInstrument}</strong>
          </span>
        )}
        {topEntities.largestPosition && (
          <span className="rounded bg-slate-800/80 px-2 py-0.5 border border-slate-700">
            Largest Pos: <strong className="text-violet-300">{topEntities.largestPosition.instrument}</strong> ({topEntities.largestPosition.side})
          </span>
        )}
        {topEntities.fastestProvider && (
          <span className="rounded bg-slate-800/80 px-2 py-0.5 border border-slate-700">
            Fastest: <strong className="text-emerald-300">{topEntities.fastestProvider.provider}</strong> ({topEntities.fastestProvider.latencyMs}ms)
          </span>
        )}
        {topEntities.mostProviderErrors && topEntities.mostProviderErrors.errorCount > 0 && (
          <span className="rounded bg-rose-950/40 px-2 py-0.5 border border-rose-800/60 text-rose-300">
            Errors: <strong>{topEntities.mostProviderErrors.provider}</strong> ({topEntities.mostProviderErrors.errorCount})
          </span>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. NAVIGATION TABS BAR                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: "LIVE_STREAM", label: "LIVE STREAM", icon: <Radio className="h-3.5 w-3.5" /> },
              { id: "TRADE_JOURNAL", label: "TRADE JOURNAL", icon: <BookOpen className="h-3.5 w-3.5" /> },
              { id: "BOT_ACTIVITY", label: "BOT ACTIVITY", icon: <Bot className="h-3.5 w-3.5" /> },
              { id: "ORDERS", label: "ORDERS", icon: <ListOrdered className="h-3.5 w-3.5" /> },
              { id: "POSITIONS", label: "POSITIONS", icon: <Layers3 className="h-3.5 w-3.5" /> },
              { id: "RISK", label: "RISK", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
              { id: "FAILURES", label: "FAILURES", icon: <AlertOctagon className="h-3.5 w-3.5" /> },
              { id: "PROVIDERS", label: "PROVIDERS", icon: <Network className="h-3.5 w-3.5" /> },
              { id: "CAPITAL", label: "CAPITAL", icon: <Wallet className="h-3.5 w-3.5" /> },
              { id: "SYSTEM", label: "SYSTEM", icon: <Cpu className="h-3.5 w-3.5" /> },
              { id: "AUDIT", label: "AUDIT", icon: <Database className="h-3.5 w-3.5" /> },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Stream Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition ${
              isPaused
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
            title={isPaused ? "Resume real-time display" : "Freeze UI view only (backend ingestion continues)"}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {isPaused ? "RESUME VIEW" : "PAUSE VIEW"}
          </button>

          <button
            onClick={() => {
              refetchStream();
              refetchTrades();
              refetchFailures();
              refetchProviders();
            }}
            className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            title="Manual sync"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700"
            title="Export filtered records as CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            CSV
          </button>

          <button
            onClick={() => handleExport("json")}
            className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700"
            title="Export filtered records as JSON"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            JSON
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. GLOBAL SEARCH & MULTI-DIMENSIONAL FILTERS                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-[#07131f] p-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search bot, strategy, symbol, order ID, trade ID, error code, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/90 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 py-1.5 px-2.5 text-xs text-slate-300 outline-none focus:border-cyan-500"
        >
          <option value="ALL">Domain: ALL</option>
          {domains.filter((d) => d !== "ALL").map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 py-1.5 px-2.5 text-xs text-slate-300 outline-none focus:border-cyan-500"
        >
          <option value="ALL">Provider: ALL</option>
          {providers.filter((p) => p !== "ALL").map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 py-1.5 px-2.5 text-xs text-slate-300 outline-none focus:border-cyan-500"
        >
          <option value="ALL">Severity: ALL</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>

        <select
          value={selectedEnvironment}
          onChange={(e) => setSelectedEnvironment(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 py-1.5 px-2.5 text-xs text-slate-300 outline-none focus:border-cyan-500"
        >
          <option value="ALL">Env: ALL</option>
          <option value="PAPER">PAPER</option>
          <option value="LIVE">LIVE</option>
        </select>

        {(selectedDomain !== "ALL" ||
          selectedProvider !== "ALL" ||
          selectedSeverity !== "ALL" ||
          selectedEnvironment !== "ALL" ||
          searchQuery) && (
          <button
            onClick={() => {
              setSelectedDomain("ALL");
              setSelectedProvider("ALL");
              setSelectedSeverity("ALL");
              setSelectedEnvironment("ALL");
              setSearchQuery("");
            }}
            className="flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
          >
            <X className="h-3 w-3" /> Clear Filters
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. TAB VIEWS CONTENT                                               */}
      {/* ------------------------------------------------------------------ */}

      {/* TAB 1: LIVE STREAM TABLE */}
      {activeTab === "LIVE_STREAM" && (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#07131f]">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">
              AUTHORITATIVE LIVE EVENT STREAM ({filteredEvents.length} records)
            </span>
            <span className="text-[10px] text-slate-500">
              {isPaused ? "VIEW PAUSED - Display Buffer Frozen" : "STREAMING ACTIVE (Auto-scrolling buffer)"}
            </span>
          </div>

          <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
            <table className="w-full min-w-[1100px] text-left text-[11px]">
              <thead className="sticky top-0 bg-[#06101a] border-b border-slate-800 text-[9px] uppercase tracking-wider text-slate-400 z-10">
                <tr>
                  <th className="px-3 py-2.5">Seq</th>
                  <th className="px-3 py-2.5">Time</th>
                  <th className="px-3 py-2.5">Provider</th>
                  <th className="px-3 py-2.5">Domain</th>
                  <th className="px-3 py-2.5">Bot / Strategy</th>
                  <th className="px-3 py-2.5">Instrument</th>
                  <th className="px-3 py-2.5">Event Type</th>
                  <th className="px-3 py-2.5">Side/Qty</th>
                  <th className="px-3 py-2.5">Price</th>
                  <th className="px-3 py-2.5">P&L</th>
                  <th className="px-3 py-2.5">Latency</th>
                  <th className="px-3 py-2.5">Severity</th>
                  <th className="px-3 py-2.5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((ev) => {
                    const evSeq = ev.sequence || "--";
                    const timeStr = formatTime(ev.eventTime || ev.event_time || ev.receivedTime || ev.receivedTimestamp);
                    const provider = ev.provider || "SYSTEM";
                    const domain = String(ev.domain || "SYSTEM");
                    const evType = String(ev.eventType || ev.event_type || "");
                    const symbol = ev.symbol || ev.canonicalInstrumentId || ev.instrumentId || "--";
                    const botName = ev.botName || ev.bot_name || ev.botId || "--";
                    const latency = ev.latencyMs || ev.latency_ms || 0;
                    const pnl = ev.realizedPnL ?? ev.realized_pnl ?? ev.unrealizedPnL ?? ev.unrealized_pnl;

                    return (
                      <tr key={ev.eventId || `${evSeq}-${timeStr}`} className="hover:bg-cyan-500/[0.03] transition">
                        <td className="px-3 py-2 font-mono text-slate-500">{evSeq}</td>
                        <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{timeStr}</td>
                        <td className="px-3 py-2 font-semibold text-slate-300">{provider}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-medium border ${getDomainClasses(domain)}`}>
                            {domain}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-300 truncate max-w-[140px]">{botName}</td>
                        <td className="px-3 py-2 font-semibold text-cyan-300 truncate max-w-[120px]">{symbol}</td>
                        <td className="px-3 py-2 font-medium text-slate-200">{evType}</td>
                        <td className="px-3 py-2 text-slate-300">
                          {ev.side ? (
                            <span className={ev.side === "BUY" || ev.side === "LONG" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                              {ev.side} {ev.quantity ? `x${ev.quantity}` : ""}
                            </span>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-200">
                          {ev.marketPrice || ev.market_price || ev.entryPrice || ev.entry_price
                            ? formatCurrency(ev.marketPrice || ev.market_price || ev.entryPrice || ev.entry_price)
                            : "--"}
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold">
                          {pnl !== null && pnl !== undefined ? (
                            <span className={pnl >= 0 ? "text-emerald-300" : "text-rose-300"}>{formatCurrency(pnl)}</span>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className={`px-3 py-2 font-mono ${getLatencyTone(latency)}`}>{latency > 0 ? `${latency}ms` : "--"}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold border ${getSeverityBadge(ev.severity)}`}>
                            {ev.severity || "INFO"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => handleInspectEvent(ev)}
                            className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[10px] font-semibold text-cyan-300 border border-slate-700 hover:bg-cyan-950/40 hover:border-cyan-500/50"
                          >
                            <Eye className="h-3 w-3" /> INSPECT
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-xs text-slate-500">
                      No events matching active filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TRADE JOURNAL */}
      {activeTab === "TRADE_JOURNAL" && (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#07131f]">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">
              TRADE JOURNAL & EXECUTION AUDIT ({tradeJournalData?.length || 0} trades recorded)
            </span>
            <span className="text-[10px] text-slate-500">Open trades marked-to-market • Closed trades immutable</span>
          </div>

          <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
            <table className="w-full min-w-[1200px] text-left text-[11px]">
              <thead className="sticky top-0 bg-[#06101a] border-b border-slate-800 text-[9px] uppercase tracking-wider text-slate-400 z-10">
                <tr>
                  <th className="px-3 py-2.5">Trade ID</th>
                  <th className="px-3 py-2.5">Bot / Strategy</th>
                  <th className="px-3 py-2.5">Symbol</th>
                  <th className="px-3 py-2.5">Side</th>
                  <th className="px-3 py-2.5">Entry Time / Price</th>
                  <th className="px-3 py-2.5">Exit Time / Price</th>
                  <th className="px-3 py-2.5">Qty</th>
                  <th className="px-3 py-2.5">Net P&L</th>
                  <th className="px-3 py-2.5">R Multi</th>
                  <th className="px-3 py-2.5">MFE / MAE</th>
                  <th className="px-3 py-2.5">Duration</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tradeJournalData && tradeJournalData.length > 0 ? (
                  tradeJournalData.map((tr) => {
                    const isWin = tr.netPnL >= 0;
                    return (
                      <tr key={tr.tradeId} className="hover:bg-cyan-500/[0.03] transition">
                        <td className="px-3 py-2.5 font-mono text-cyan-300 font-bold">{tr.tradeId}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-200">{tr.bot}</div>
                          <div className="text-[9px] text-slate-500">{tr.strategy}</div>
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-200">{tr.symbol}</td>
                        <td className="px-3 py-2.5">
                          <span className={`font-bold ${tr.side === "BUY" || tr.side === "LONG" ? "text-emerald-400" : "text-rose-400"}`}>
                            {tr.side}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono">
                          <div className="text-slate-200">{formatCurrency(tr.entryPrice)}</div>
                          <div className="text-[9px] text-slate-500">{formatDateTime(tr.entryTime)}</div>
                        </td>
                        <td className="px-3 py-2.5 font-mono">
                          <div className="text-slate-200">{tr.exitPrice ? formatCurrency(tr.exitPrice) : "--"}</div>
                          <div className="text-[9px] text-slate-500">{tr.exitTime ? formatDateTime(tr.exitTime) : "OPEN"}</div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-300">{tr.quantity}</td>
                        <td className="px-3 py-2.5 font-mono font-bold">
                          <span className={isWin ? "text-emerald-300" : "text-rose-300"}>{formatCurrency(tr.netPnL)}</span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-300">{tr.rMultiple ? `${tr.rMultiple}R` : "--"}</td>
                        <td className="px-3 py-2.5 font-mono text-[10px]">
                          <span className="text-emerald-400">+{tr.mfe}</span> / <span className="text-rose-400">-{tr.mae}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400">{tr.holdingDuration}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                              tr.status === "OPEN"
                                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                                : "border-slate-700 bg-slate-800 text-slate-400"
                            }`}
                          >
                            {tr.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() =>
                              handleInspectEvent({
                                eventId: tr.tradeId,
                                sequence: 0,
                                environment: tr.paper_live,
                                provider: tr.provider,
                                domain: "ORDER",
                                eventType: "TRADE_FILL",
                                severity: "INFO",
                                correlationId: tr.correlationId,
                                tradeId: tr.tradeId,
                                botId: tr.botId,
                                symbol: tr.symbol,
                                latencyMs: 0,
                                payload: tr,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[10px] font-semibold text-cyan-300 border border-slate-700 hover:bg-cyan-950/40"
                          >
                            TIMELINE
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-xs text-slate-500">
                      No trades recorded yet. Start a bot or execute an order to populate the journal.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: FAILURES JOURNAL */}
      {activeTab === "FAILURES" && (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#07131f]">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">
              PERMANENT FAILURE JOURNAL & SELF-HEALING AUDIT ({failureJournalData?.length || 0} incidents)
            </span>
            <span className="text-[10px] text-rose-400 font-semibold">Failures are permanently preserved after recovery</span>
          </div>

          <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
            <table className="w-full min-w-[1000px] text-left text-[11px]">
              <thead className="sticky top-0 bg-[#06101a] border-b border-slate-800 text-[9px] uppercase tracking-wider text-slate-400 z-10">
                <tr>
                  <th className="px-3 py-2.5">Failure ID</th>
                  <th className="px-3 py-2.5">Component</th>
                  <th className="px-3 py-2.5">Provider / Bot</th>
                  <th className="px-3 py-2.5">Error Code</th>
                  <th className="px-3 py-2.5">Exception Message</th>
                  <th className="px-3 py-2.5">First Seen / Last Seen</th>
                  <th className="px-3 py-2.5">Count</th>
                  <th className="px-3 py-2.5">Auto Action</th>
                  <th className="px-3 py-2.5">Downtime</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {failureJournalData && failureJournalData.length > 0 ? (
                  failureJournalData.map((f) => (
                    <tr key={f.failureId} className="hover:bg-rose-500/[0.03] transition">
                      <td className="px-3 py-2.5 font-mono text-rose-300 font-bold">{f.failureId}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-300">{f.component}</td>
                      <td className="px-3 py-2.5 text-slate-300">
                        {f.provider} {f.bot ? `/ ${f.bot}` : ""}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-amber-300">{f.errorCode}</td>
                      <td className="px-3 py-2.5 text-slate-400 max-w-[280px] truncate">{f.exception}</td>
                      <td className="px-3 py-2.5 text-slate-400 text-[10px]">
                        <div>First: {formatTime(f.firstSeen)}</div>
                        <div>Last: {formatTime(f.lastSeen)}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-200">{f.occurrenceCount}</td>
                      <td className="px-3 py-2.5 text-cyan-300 font-semibold">{f.automaticAction}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-400">{f.downtime}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                            f.resolved
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-rose-500/40 bg-rose-500/20 text-rose-300 animate-pulse"
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-xs text-slate-500">
                      No system failure incidents recorded. System running with zero unhandled exceptions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: PROVIDERS OBSERVATORY */}
      {activeTab === "PROVIDERS" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {providerObservatoryData && providerObservatoryData.length > 0 ? (
              providerObservatoryData.map((p) => {
                const isOnline = p.connected && p.authenticated;
                return (
                  <div key={p.providerId} className="rounded-xl border border-slate-800 bg-[#07131f] p-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{p.name}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">{p.providerId}</span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border ${
                          isOnline
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                        }`}
                      >
                        {isOnline ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                        {p.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Latency Profile</span>
                        <span className="font-mono font-bold text-slate-200">
                          {p.latencyMs}ms <span className="text-[9px] text-slate-400">(p95: {p.p95Latency}ms)</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Message Velocity</span>
                        <span className="font-mono font-bold text-cyan-300">{p.messagesPerSec} msg/s</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Active Instruments</span>
                        <span className="font-mono text-slate-200">{p.instruments} symbols</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Errors / Reconnects</span>
                        <span className="font-mono text-slate-200">
                          {p.errors} err / {p.reconnectCount} rec
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-slate-800/80 pt-2 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Uptime: {p.uptime}</span>
                      <span>Last: {formatTime(p.lastMessage)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 text-center py-8 text-xs text-slate-500">Loading provider health telemetry...</div>
            )}
          </div>
        </div>
      )}

      {/* OTHER TABS: BOT ACTIVITY, ORDERS, POSITIONS, RISK, CAPITAL, SYSTEM, AUDIT */}
      {["BOT_ACTIVITY", "ORDERS", "POSITIONS", "RISK", "CAPITAL", "SYSTEM", "AUDIT"].includes(activeTab) && (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#07131f] p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {activeTab.replace("_", " ")} OPERATIONAL STREAM
            </h3>
            <span className="text-[10px] text-slate-500">Domain-filtered live event records</span>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto mt-3">
            <table className="w-full min-w-[900px] text-left text-[11px]">
              <thead className="sticky top-0 bg-[#06101a] border-b border-slate-800 text-[9px] uppercase tracking-wider text-slate-400 z-10">
                <tr>
                  <th className="px-3 py-2.5">Seq</th>
                  <th className="px-3 py-2.5">Time</th>
                  <th className="px-3 py-2.5">Provider</th>
                  <th className="px-3 py-2.5">Event Type</th>
                  <th className="px-3 py-2.5">Entity / ID</th>
                  <th className="px-3 py-2.5">Reason / Message</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEvents
                  .filter((ev) => {
                    const dom = String(ev.domain || "");
                    if (activeTab === "BOT_ACTIVITY") return dom === "BOT" || dom === "STRATEGY";
                    if (activeTab === "ORDERS") return dom === "ORDER" || dom === "FILL";
                    if (activeTab === "POSITIONS") return dom === "POSITION";
                    if (activeTab === "RISK") return dom === "RISK";
                    if (activeTab === "CAPITAL") return dom === "CAPITAL" || dom === "ACCOUNT";
                    if (activeTab === "SYSTEM") return dom === "SYSTEM";
                    if (activeTab === "AUDIT") return true;
                    return true;
                  })
                  .map((ev) => (
                    <tr key={ev.eventId} className="hover:bg-cyan-500/[0.03] transition">
                      <td className="px-3 py-2 font-mono text-slate-500">{ev.sequence}</td>
                      <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                        {formatTime(ev.eventTime || ev.event_time || ev.receivedTime || ev.receivedTimestamp)}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-300">{ev.provider}</td>
                      <td className="px-3 py-2 font-medium text-slate-200">{ev.eventType || ev.event_type}</td>
                      <td className="px-3 py-2 font-mono text-cyan-300">
                        {ev.botId || ev.orderId || ev.tradeId || ev.positionId || ev.symbol || "--"}
                      </td>
                      <td className="px-3 py-2 text-slate-400 truncate max-w-[240px]">
                        {ev.decisionReason || ev.decision_reason || ev.errorMessage || ev.error_message || "--"}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold border ${getSeverityBadge(ev.severity)}`}>
                          {ev.status || ev.severity || "INFO"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleInspectEvent(ev)}
                          className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[10px] font-semibold text-cyan-300 border border-slate-700 hover:bg-cyan-950/40"
                        >
                          <Eye className="h-3 w-3" /> INSPECT
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 6. INSPECT EVENT & CORRELATION CHAIN DRAWER / MODAL                */}
      {/* ------------------------------------------------------------------ */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm p-4">
          <div className="flex h-full max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-[#07131f] shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  EVENT AUDIT INSPECTOR: <span className="font-mono text-cyan-300">{selectedEvent.eventId}</span>
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setSelectedCorrelationChain([]);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs text-slate-300">
              {/* Event Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Sequence</span>
                  <span className="font-mono font-bold text-slate-200">{selectedEvent.sequence}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Event Type</span>
                  <span className="font-semibold text-cyan-300">{selectedEvent.eventType || selectedEvent.event_type}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Provider</span>
                  <span className="font-semibold text-slate-200">{selectedEvent.provider}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Recon Status</span>
                  <span className="font-bold text-emerald-300">{selectedEvent.reconciliationStatus || "MATCHED"}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Event Time</span>
                  <span className="font-mono text-slate-300">{formatDateTime(selectedEvent.eventTime || selectedEvent.event_time)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Correlation ID</span>
                  <span className="font-mono text-violet-300 truncate block">{selectedEvent.correlationId || selectedEvent.correlation_id || "--"}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Latency</span>
                  <span className="font-mono text-slate-200">{selectedEvent.latencyMs || selectedEvent.latency_ms || 0} ms</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Severity</span>
                  <span className={`inline-block rounded px-1.5 py-0.2 text-[9px] font-bold border ${getSeverityBadge(selectedEvent.severity)}`}>
                    {selectedEvent.severity || "INFO"}
                  </span>
                </div>
              </div>

              {/* Correlation Chain Timeline */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold uppercase text-[10px] tracking-wider text-cyan-300">
                    COMPLETE CORRELATION / CAUSATION CHAIN ({selectedCorrelationChain.length} events)
                  </span>
                  {chainLoading && <span className="text-[9px] text-slate-500 animate-spin">Loading chain...</span>}
                </div>

                {selectedCorrelationChain.length > 0 ? (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                    {selectedCorrelationChain.map((ce, idx) => (
                      <div
                        key={ce.eventId || idx}
                        onClick={() => setSelectedEvent(ce)}
                        className={`cursor-pointer flex items-center justify-between rounded p-1.5 text-[10px] transition ${
                          ce.eventId === selectedEvent.eventId
                            ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-200"
                            : "bg-slate-800/60 hover:bg-slate-800 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-slate-500">#{ce.sequence || idx + 1}</span>
                          <span className="font-semibold text-slate-200">{ce.eventType || ce.event_type}</span>
                          <span className="text-slate-400 truncate">({ce.domain})</span>
                        </div>
                        <span className="text-slate-500 font-mono">{formatTime(ce.eventTime || ce.event_time)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 italic">No linked multi-step lifecycle chain found.</div>
                )}
              </div>

              {/* Normalized Payload JSON Viewer */}
              <div>
                <span className="font-bold uppercase text-[10px] tracking-wider text-slate-400 block mb-1">
                  NORMALIZED AUDIT PAYLOAD (SECRETS REDACTED)
                </span>
                <pre className="max-h-[180px] overflow-auto rounded-xl border border-slate-800 bg-[#050e17] p-3 text-[10px] font-mono text-cyan-200">
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>

              {/* Raw Provider Payload if present */}
              {selectedEvent.rawPayload && Object.keys(selectedEvent.rawPayload).length > 0 && (
                <div>
                  <span className="font-bold uppercase text-[10px] tracking-wider text-slate-400 block mb-1">
                    RAW PROVIDER TELEMETRY PACKET
                  </span>
                  <pre className="max-h-[140px] overflow-auto rounded-xl border border-slate-800 bg-[#050e17] p-3 text-[10px] font-mono text-emerald-200">
                    {JSON.stringify(selectedEvent.rawPayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}