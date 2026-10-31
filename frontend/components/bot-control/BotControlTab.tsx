"use client";

import React, { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Bot,
  PlusCircle,
  RefreshCw,
  Play,
  Pause,
  Square,
  ShieldAlert,
  Trash2,
  ArrowLeft,
  X,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/bot-api";
import { BotConfig } from "@/types/bot";
import { useBotStore } from "@/stores/bot-store";
import { wsClient } from "@/lib/websocket";
import { detectMarketCurrency } from "@/lib/formatters";
import { BotCreationControlPlane } from "@/components/bot-instance/BotCreationControlPlane";
import { BotControlCenterVNext } from "./BotControlCenterVNext";

// Institutional Fleet Components
import { FleetHeader } from "./FleetHeader";
import { FleetKpiCards, FleetMetricsData } from "./FleetKpiCards";
import { FleetFilterBar, AdvancedBotFilters } from "./FleetFilterBar";
import { FleetTable } from "./FleetTable";
import { BotDetailsRightPanel } from "./BotDetailsRightPanel";
import { ExpandedBotWorkspace } from "./ExpandedBotWorkspace";

const INITIAL_ADVANCED_FILTERS: AdvancedBotFilters = {
  exchange: "ALL",
  strategy: "ALL",
  assetType: "ALL",
  tradingMode: "ALL",
  riskStatus: "ALL",
};

function BotControlTabInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active inner view: 'fleet' (dashboard), 'create' (wizard), or 'details' (full bot terminal)
  const [activeView, setActiveView] = useState<"fleet" | "create" | "details">("fleet");
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [activeBot, setActiveBot] = useState<BotConfig | null>(null);

  // Bot store state
  const { bots, setBots } = useBotStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currencyFilter, setCurrencyFilter] = useState<"ALL" | "INR" | "USD">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedBotFilters>(INITIAL_ADVANCED_FILTERS);

  // Delete modal state
  const [botToDelete, setBotToDelete] = useState<BotConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Multi-selection state for bulk deletion and batch management
  const [selectedBotIds, setSelectedBotIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

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
        msg.type === "FLEET_UPDATE" ||
        msg.type === "ORDER_FILLED" ||
        msg.type === "TRADE_EXECUTED"
      ) {
        const targetId = (msg as any).botId || (msg as any).bot_id;
        if (targetId) {
          const targetBot = useBotStore.getState().bots.find((b) => b.id === targetId);
          if (targetBot) {
            const nextStatus =
              msg.type === "BOT_STARTED" || msg.type === "BOT_RESUMED"
                ? "RUNNING"
                : msg.type === "BOT_PAUSED"
                ? "PAUSED"
                : msg.type === "BOT_STOPPED"
                ? "STOPPED"
                : "ERROR";
            useBotStore.getState().updateBotInList({ ...targetBot, status: nextStatus as any });
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadBots]);

  // Bot Lifecycle Action Handlers
  const handleBotAction = async (
    botId: string,
    action: "start" | "pause" | "resume" | "stop",
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    setActionLoading((prev) => ({ ...prev, [botId]: true }));
    try {
      if (action === "start") {
        await api.startBot(botId);
        const b = useBotStore.getState().bots.find((x) => x.id === botId);
        if (b) useBotStore.getState().updateBotInList({ ...b, status: "RUNNING" as any });
      } else if (action === "pause") {
        await api.pauseBot(botId);
        const b = useBotStore.getState().bots.find((x) => x.id === botId);
        if (b) useBotStore.getState().updateBotInList({ ...b, status: "PAUSED" as any });
      } else if (action === "resume") {
        await api.resumeBot(botId);
        const b = useBotStore.getState().bots.find((x) => x.id === botId);
        if (b) useBotStore.getState().updateBotInList({ ...b, status: "RUNNING" as any });
      } else if (action === "stop") {
        await api.stopBot(botId);
        const b = useBotStore.getState().bots.find((x) => x.id === botId);
        if (b) useBotStore.getState().updateBotInList({ ...b, status: "STOPPED" as any });
      }
    } catch (err: any) {
      alert(`Action '${action}' failed: ${err.message || "Unknown error"}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [botId]: false }));
    }
  };

  const handleDuplicateBot = async (bot: BotConfig, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const cloned = await api.createBot({
        ...bot,
        name: `${bot.name} (Copy)`,
      });
      await loadBots();
      if (cloned) setActiveBot(cloned);
    } catch (err: any) {
      alert(`Failed to clone bot: ${err.message}`);
    }
  };

  const handleDeleteBot = async () => {
    if (!botToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteBot(botToDelete.id);
      if (activeBot?.id === botToDelete.id) {
        setActiveBot(null);
      }
      setBotToDelete(null);
      await loadBots();
    } catch (err: any) {
      alert(`Failed to delete bot: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSelectBot = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedBotIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Bulk Fleet Actions Handler
  const handleBulkAction = async (action: "start_all" | "pause_all" | "export") => {
    if (action === "start_all") {
      const candidates = bots.filter((b) => b.status === "PAUSED" || b.status === "READY");
      for (const b of candidates) {
        try {
          await api.startBot(b.id);
        } catch {}
      }
      await loadBots();
    } else if (action === "pause_all") {
      const candidates = bots.filter((b) => b.status === "RUNNING");
      for (const b of candidates) {
        try {
          await api.pauseBot(b.id);
        } catch {}
      }
      await loadBots();
    } else if (action === "export") {
      const headers = ["ID", "Name", "Exchange", "Symbol", "Status", "Mode", "Net PnL", "Realized PnL"];
      const rows = bots.map((b) => [
        b.id,
        b.name,
        b.market?.exchange || "DELTA",
        b.market?.symbol || "",
        b.status,
        b.execution?.mode || "PAPER",
        b.pnl?.net_pnl ?? 0,
        b.pnl?.realized_pnl ?? 0,
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `quantos_bot_fleet_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Fleet Aggregations segregated strictly by currency
  const fleetMetrics: FleetMetricsData = useMemo(() => {
    let runningCount = 0;
    let pausedCount = 0;
    let readyCount = 0;
    let stoppedCount = 0;
    let errorCount = 0;

    const inr = {
      netPnl: 0,
      realized: 0,
      unrealized: 0,
      fees: 0,
      positions: 0,
      contracts: 0,
      trades: 0,
    };

    const usd = {
      netPnl: 0,
      realized: 0,
      unrealized: 0,
      fees: 0,
      positions: 0,
      contracts: 0,
      trades: 0,
    };

    bots.forEach((b) => {
      const st = (b.status || "").toUpperCase();
      if (st === "RUNNING") runningCount++;
      else if (st === "PAUSED") pausedCount++;
      else if (st === "READY") readyCount++;
      else if (st === "ERROR") errorCount++;
      else stoppedCount++;

      const isIndia = b.currency === "INR" || detectMarketCurrency(b).code === "INR";
      const target = isIndia ? inr : usd;

      if (b.pnl) {
        target.netPnl += b.pnl.net_pnl || 0;
        target.realized += b.pnl.realized_pnl || 0;
        target.unrealized += b.pnl.unrealized_pnl || 0;
        target.fees += b.pnl.fees || 0;
      }
      target.positions += b.positions_count || 0;
      target.contracts += b.open_contracts || b.positions_count || 0;
      target.trades += b.trades_count || 0;
    });

    const totalBots = bots.length;
    const totalPositions = inr.positions + usd.positions;
    const totalContracts = inr.contracts + usd.contracts;
    const totalTrades = inr.trades + usd.trades;

    return {
      runningCount,
      pausedCount,
      readyCount,
      stoppedCount,
      errorCount,
      totalBots,
      totalPositions,
      totalContracts,
      totalTrades,
      inr,
      usd,
    };
  }, [bots]);

  // Filtered bots list
  const filteredBots = useMemo(() => {
    return bots.filter((b) => {
      // 1. Status Filter
      const matchesStatus =
        statusFilter === "ALL" || b.status.toUpperCase() === statusFilter.toUpperCase();

      // 2. Currency Filter
      const isIndia = b.currency === "INR" || detectMarketCurrency(b).code === "INR";
      const matchesCurrency =
        currencyFilter === "ALL" ||
        (currencyFilter === "INR" && isIndia) ||
        (currencyFilter === "USD" && !isIndia);

      // 3. Search Query
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        b.name.toLowerCase().includes(query) ||
        b.id.toLowerCase().includes(query) ||
        (b.market?.symbol && b.market.symbol.toLowerCase().includes(query)) ||
        (b.strategy?.type && b.strategy.type.toLowerCase().includes(query)) ||
        (b.market?.exchange && b.market.exchange.toLowerCase().includes(query));

      // 4. Advanced Filters
      let matchesAdvanced = true;
      if (advancedFilters.exchange !== "ALL") {
        const ex = (b.market?.exchange || "").toUpperCase();
        if (!ex.includes(advancedFilters.exchange)) matchesAdvanced = false;
      }
      if (advancedFilters.strategy !== "ALL") {
        const st = (b.strategy?.type || "").toUpperCase();
        if (!st.includes(advancedFilters.strategy)) matchesAdvanced = false;
      }
      if (advancedFilters.assetType !== "ALL") {
        const at = (b.market?.asset_class || b.market?.instrument_type || "").toUpperCase();
        if (!at.includes(advancedFilters.assetType)) matchesAdvanced = false;
      }
      if (advancedFilters.tradingMode !== "ALL") {
        const tm = (b.execution?.mode || "PAPER").toUpperCase();
        if (tm !== advancedFilters.tradingMode) matchesAdvanced = false;
      }
      if (advancedFilters.riskStatus !== "ALL") {
        const rs = b.kill_switch === "ARMED" ? "ARMED" : "NORMAL";
        if (rs !== advancedFilters.riskStatus) matchesAdvanced = false;
      }

      return matchesStatus && matchesCurrency && matchesSearch && matchesAdvanced;
    });
  }, [bots, statusFilter, currencyFilter, searchQuery, advancedFilters]);

  // Keep activeBot updated when bots list updates or selection changes (auto-selects first bot on load)
  useEffect(() => {
    if (activeBot) {
      const fresh = bots.find((b) => b.id === activeBot.id);
      if (fresh) setActiveBot(fresh);
    } else if (filteredBots.length > 0) {
      setActiveBot(filteredBots[0]);
    }
  }, [bots, filteredBots, activeBot]);

  const toggleSelectAll = useCallback(() => {
    setSelectedBotIds((prev) => {
      const allFilteredIds = filteredBots.map((b) => b.id);
      const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => prev.has(id));
      if (allSelected) {
        return new Set();
      } else {
        return new Set(allFilteredIds);
      }
    });
  }, [filteredBots]);

  const clearSelection = useCallback(() => {
    setSelectedBotIds(new Set());
  }, []);

  const handleBulkDelete = async () => {
    if (selectedBotIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const idsToDelete = Array.from(selectedBotIds);
      await api.bulkDeleteBots(idsToDelete, true);
      setSelectedBotIds(new Set());
      setShowBulkDeleteModal(false);
      await loadBots();
    } catch (err: any) {
      alert(`Bulk delete failed: ${err.message}`);
    } finally {
      setBulkDeleting(false);
    }
  };

  const statusCounts = useMemo(() => {
    return {
      ALL: bots.length,
      RUNNING: fleetMetrics.runningCount,
      READY: fleetMetrics.readyCount,
      PAUSED: fleetMetrics.pausedCount,
      STOPPED: fleetMetrics.stoppedCount,
      ERROR: fleetMetrics.errorCount,
    };
  }, [bots.length, fleetMetrics]);

  // SUBVIEW 1: Bot Creation Wizard
  if (activeView === "create") {
    return (
      <div className="flex flex-col gap-4 w-full text-slate-100 font-sans pb-12 animate-fadeIn select-none">
        <div className="flex items-center justify-between pb-3 border-b border-[#1A2B43]">
          <button
            onClick={() => {
              setActiveView("fleet");
              loadBots();
            }}
            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#91A7C1] hover:text-[#EAF3FF] transition-all px-3 py-2 rounded-[6px] border border-[#1A2B43] bg-[#091426] hover:bg-[#0B1728] cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#00C9E8]" />
            Return to Quantitative Fleet
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#00C9E8] bg-[#00C9E8]/10 border border-[#00C9E8]/30 px-3 py-1 rounded-[6px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00C9E8] animate-pulse" />
              Algorithmic Bot Deployment Plane
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

  // SUBVIEW 2: Bot Terminal / Full View
  if (activeView === "details" && selectedBotId) {
    return (
      <div className="flex flex-col gap-4 w-full text-slate-100 font-sans pb-12 animate-fadeIn select-none">
        <div className="flex items-center justify-between pb-3 border-b border-[#1A2B43]">
          <button
            onClick={() => {
              setSelectedBotId(null);
              setActiveView("fleet");
              loadBots();
            }}
            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#91A7C1] hover:text-[#EAF3FF] transition-all px-3 py-2 rounded-[6px] border border-[#1A2B43] bg-[#091426] hover:bg-[#0B1728] cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#00C9E8]" />
            Return to Quantitative Fleet
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#91A7C1]">
              Unit: <span className="text-[#EAF3FF] font-bold">{selectedBotId}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#00D6A0] bg-[#00D6A0]/10 border border-[#00D6A0]/30 px-3 py-1 rounded-[6px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00D6A0] animate-pulse" />
              Real-Time Terminal Synchronized
            </span>
          </div>
        </div>
        <BotControlCenterVNext botId={selectedBotId} />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MAIN VIEW: QUANTITATIVE BOT FLEET 2.0 (EXACT REPLICA OF EXAMPLE 2)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-3 w-full text-slate-100 font-sans pb-16 animate-fadeIn select-none">
      {/* SECTION A — Fleet Header */}
      <FleetHeader
        totalBots={fleetMetrics.totalBots}
        runningBots={fleetMetrics.runningCount}
        loading={loading}
        onSync={loadBots}
        onDeploy={() => setActiveView("create")}
        onBulkAction={handleBulkAction}
      />

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-[6px] bg-[#FF5268]/10 border border-[#FF5268]/30 text-xs font-mono text-[#FF5268] flex items-center justify-between">
          <span>Failed to sync bot fleet: {error}</span>
          <button
            onClick={loadBots}
            className="underline hover:text-white transition-colors cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* SECTION B — Four Fleet KPI Cards */}
      <FleetKpiCards
        metrics={fleetMetrics}
        currencyFilter={currencyFilter}
        onCurrencyChange={setCurrencyFilter}
      />

      {/* SECTION C — Fleet Filters and Search Toolbar */}
      <FleetFilterBar
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        currencyFilter={currencyFilter}
        onCurrencyChange={setCurrencyFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedCount={selectedBotIds.size}
        totalFiltered={filteredBots.length}
        totalBots={fleetMetrics.totalBots}
        onToggleSelectAll={toggleSelectAll}
        onClearFilters={() => {
          setStatusFilter("ALL");
          setCurrencyFilter("ALL");
          setSearchQuery("");
          setAdvancedFilters(INITIAL_ADVANCED_FILTERS);
        }}
        statusCounts={statusCounts}
        advancedFilters={advancedFilters}
        onAdvancedFilterChange={setAdvancedFilters}
      />

      {/* Bulk Operations Pill */}
      {selectedBotIds.size > 0 && (
        <div className="flex items-center justify-between p-2.5 rounded-[6px] bg-[#0878FF]/10 border border-[#0878FF]/30 text-xs font-mono animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#00C9E8]">{selectedBotIds.size} Units Selected</span>
            <span className="text-[#91A7C1]">for batch execution lifecycle management</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-3 py-1 rounded-[4px] bg-[#FF5268]/15 border border-[#FF5268]/30 text-[#FF5268] hover:bg-[#FF5268]/25 font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              <span>Decommission Selected</span>
            </button>
            <button
              onClick={clearSelection}
              className="px-2.5 py-1 rounded-[4px] bg-[#050B16] border border-[#1A2B43] text-[#91A7C1] hover:text-[#EAF3FF] font-semibold transition-colors cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* SECTION D & E — Central Bot Fleet Table & Persistent Right-Side Selected Bot Details Panel */}
      <div className="flex flex-col xl:flex-row gap-3 items-start">
        {/* Table / Grid Container */}
        <div className="flex-1 min-w-0 w-full">
          {filteredBots.length === 0 ? (
            <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-12 text-center flex flex-col items-center justify-center gap-3">
              <Bot className="h-10 w-10 text-[#91A7C1]" />
              <div className="text-base font-bold text-[#EAF3FF]">No Algorithmic Bots Found</div>
              <p className="text-xs text-[#91A7C1] max-w-sm">
                No active execution units match your current status, currency, or search filters.
              </p>
              <button
                type="button"
                onClick={() => setActiveView("create")}
                className="mt-2 px-4 py-2 rounded-[6px] bg-[#00C9E8] hover:bg-[#00B4D0] text-[#050B16] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Deploy New Unit</span>
              </button>
            </div>
          ) : (
            <FleetTable
              bots={filteredBots}
              selectedBotIds={selectedBotIds}
              activeBotId={activeBot?.id || null}
              onToggleSelectBot={toggleSelectBot}
              onSelectBot={(bot) => setActiveBot(bot)}
              onBotAction={handleBotAction}
              onEditBot={(bot) => {
                setSelectedBotId(bot.id);
                setActiveView("details");
              }}
              onDuplicateBot={handleDuplicateBot}
              onDeleteBot={(bot) => setBotToDelete(bot)}
              actionLoading={actionLoading}
              copiedId={copiedId}
              onCopyId={handleCopyId}
            />
          )}
        </div>

        {/* SECTION E: Persistent Right-Side Bot Details Panel */}
        {activeBot && (
          <div className="w-full xl:w-[410px] shrink-0 xl:sticky xl:top-4">
            <BotDetailsRightPanel
              bot={activeBot}
              onClose={() => setActiveBot(null)}
              onBotAction={handleBotAction}
              onEditBot={(bot) => {
                setSelectedBotId(bot.id);
                setActiveView("details");
              }}
              onViewTerminal={(botId) => {
                setSelectedBotId(botId);
                setActiveView("details");
              }}
              actionLoading={!!actionLoading[activeBot.id]}
            />
          </div>
        )}
      </div>

      {/* SECTION F, G & H — Expanded Bot Details Workspace below the main table (Exact Example 2) */}
      {activeBot && (
        <ExpandedBotWorkspace
          bot={activeBot}
          onBotAction={handleBotAction}
          onEditBot={(bot) => {
            setSelectedBotId(bot.id);
            setActiveView("details");
          }}
          onViewTerminal={(botId) => {
            setSelectedBotId(botId);
            setActiveView("details");
          }}
          actionLoading={!!actionLoading[activeBot.id]}
        />
      )}

      {/* Decommission Confirmation Modal */}
      {botToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-[8px] border border-[#FF5268]/40 bg-[#091426] p-5 shadow-2xl space-y-4 font-mono text-[11px]">
            <div className="flex items-center gap-3 text-[#FF5268]">
              <div className="h-10 w-10 rounded-[6px] bg-[#FF5268]/10 border border-[#FF5268]/30 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-5 w-5 text-[#FF5268]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#EAF3FF]">Decommission Trading Bot</h3>
                <span className="text-[10px] text-[#FF5268] font-bold uppercase">Irreversible Action</span>
              </div>
            </div>
            <p className="text-[#91A7C1] leading-relaxed">
              Are you sure you want to permanently decommission bot{" "}
              <span className="font-bold text-[#EAF3FF]">{botToDelete.name}</span> (ID:{" "}
              <span className="text-[#00C9E8] font-bold">{botToDelete.id}</span>)?
            </p>
            <div className="text-[10px] text-[#91A7C1] bg-[#050B16] border border-[#1A2B43] p-3 rounded-[6px] leading-relaxed">
              Execution worker process will halt immediately and active order placement loops will terminate. Past trade ledger records remain safely preserved.
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1A2B43]">
              <button
                type="button"
                onClick={() => setBotToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-[4px] border border-[#1A2B43] bg-[#050B16] text-[#91A7C1] hover:text-[#EAF3FF] hover:bg-[#0B1728] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBot}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-[4px] bg-[#FF5268] hover:bg-[#E0294A] font-bold text-white shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Confirm Decommission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && selectedBotIds.size > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-[8px] border border-[#FF5268]/40 bg-[#091426] p-5 shadow-2xl space-y-4 font-mono text-[11px]">
            <div className="flex items-center gap-3 text-[#FF5268]">
              <div className="h-10 w-10 rounded-[6px] bg-[#FF5268]/10 border border-[#FF5268]/30 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-5 w-5 text-[#FF5268]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#EAF3FF]">Bulk Decommission Trading Bots</h3>
                <span className="text-[10px] text-[#FF5268] font-semibold">
                  {selectedBotIds.size} Units Selected • Permanent Action
                </span>
              </div>
            </div>
            <p className="text-[#91A7C1] leading-relaxed">
              Are you sure you want to permanently decommission and remove the following{" "}
              <span className="font-bold text-[#EAF3FF]">{selectedBotIds.size}</span> algorithmic bots from your fleet?
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1 p-2.5 rounded-[6px] bg-[#050B16] border border-[#1A2B43] text-[#91A7C1]">
              {bots
                .filter((b) => selectedBotIds.has(b.id))
                .map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-1 border-b border-[#1A2B43]/50 last:border-0">
                    <span className="font-bold text-[#EAF3FF] truncate max-w-[240px]">{b.name}</span>
                    <span className="text-[#00C9E8] text-[10px]">{b.id}</span>
                  </div>
                ))}
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1A2B43]">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkDeleting}
                className="px-3 py-1.5 rounded-[4px] border border-[#1A2B43] bg-[#050B16] text-[#91A7C1] hover:text-[#EAF3FF] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-4 py-1.5 rounded-[4px] bg-[#FF5268] hover:bg-[#E0294A] font-bold text-white shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {bulkDeleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Confirm Delete ({selectedBotIds.size} Bots)
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
        <div className="w-full py-12 text-center text-[#91A7C1]">
          <div className="flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-[#00C9E8]" />
            <p className="font-mono text-xs text-[#91A7C1]">Loading Quantitative Bot Fleet 2.0...</p>
          </div>
        </div>
      }
    >
      <BotControlTabInner />
    </Suspense>
  );
}

export default BotControlTab;
