"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SimpleFleetSummaryHeader } from "./SimpleFleetSummaryHeader";
import { SimpleBotFilterBar } from "./SimpleBotFilterBar";
import { SimpleBotTable } from "./SimpleBotTable";
import { BotCardGrid } from "./BotCardGrid";
import { BotStrategyMatrix } from "./BotStrategyMatrix";
import { SimpleBotDetailsDrawer } from "./SimpleBotDetailsDrawer";
import { BulkStartConfirmationModal } from "./BulkStartConfirmationModal";
import { CreateBotWizardModal } from "./CreateBotWizardModal";
import { DeleteBotModal } from "./DeleteBotModal";
import { BulkDeleteBotsModal } from "./BulkDeleteBotsModal";
import { MultiBotBulkActionBar } from "./MultiBotBulkActionBar";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import {
  BotRowItem,
  FleetMetrics,
  BotViewMode,
} from "@/types/bot-control";

export function BotControlTab() {
  const queryClient = useQueryClient();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // UI State: View Mode & Filters
  const [viewMode, setViewMode] = useState<BotViewMode>("table");
  const [search, setSearch] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [envFilter, setEnvFilter] = useState("ALL");
  const [environment, setEnvironment] = useState<"PAPER" | "LIVE">("PAPER");

  // Selection State
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);

  // Modal / Drawer State
  const [selectedBot, setSelectedBot] = useState<BotRowItem | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [isBulkStartModalOpen, setIsBulkStartModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Delete Modals State
  const [botToDelete, setBotToDelete] = useState<BotRowItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feedback Banners
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 1. Authoritative Fleet & Bots Query (`GET /api/bots`)
  const {
    data: fleetData,
    isLoading,
    refetch,
  } = useQuery<{
    status: string;
    metrics: FleetMetrics;
    bots: BotRowItem[];
  }>({
    queryKey: ["authoritativeFleetBots"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/bots", { timeoutMs: 6000 });
      if (!res.ok) throw new Error(res.error?.message || "Failed to load bot fleet snapshot");
      return res.data;
    },
    staleTime: 3000,
    refetchInterval: 5000,
    placeholderData: (prev) => prev,
  });

  const rawBots: BotRowItem[] = useMemo(() => {
    return Array.isArray(fleetData?.bots) ? fleetData.bots : [];
  }, [fleetData?.bots]);

  const metrics: FleetMetrics = useMemo(() => {
    return (
      fleetData?.metrics || {
        total_bots: rawBots.length,
        running: 0,
        paused: 0,
        stopped: rawBots.length,
        error: 0,
        draft: 0,
        healthy_count: rawBots.length,
        health_display: `${rawBots.length} / ${Math.max(1, rawBots.length)} Healthy`,
        today_pnl: 0.0,
        realized_pnl: 0.0,
        unrealized_pnl: 0.0,
        allocated_capital: 0.0,
        capital_used: 0.0,
        current_exposure: 0.0,
        available_capital: 0.0,
        emergency_halt_active: false,
      }
    );
  }, [fleetData?.metrics, rawBots.length]);

  // Filtered Bots
  const filteredBots = useMemo(() => {
    return rawBots.filter((bot) => {
      // Market filter
      if (selectedMarket !== "ALL") {
        const mkt = (bot.asset_class || "").toUpperCase();
        if (selectedMarket === "CRYPTO" && !mkt.includes("CRYPTO")) return false;
        if (selectedMarket === "INDIAN_STOCKS" && !mkt.includes("INDIAN") && !mkt.includes("NSE")) return false;
        if (selectedMarket === "FUTURES" && !mkt.includes("FUTURES")) return false;
        if (selectedMarket === "OPTIONS" && !mkt.includes("OPTIONS")) return false;
        if (selectedMarket === "FOREX" && !mkt.includes("FOREX")) return false;
        if (selectedMarket === "COMMODITIES" && !mkt.includes("COMMODITIES")) return false;
        if (selectedMarket === "US_EQUITY" && !mkt.includes("US") && !mkt.includes("EQUITY")) return false;
      }

      // Status filter
      if (statusFilter !== "ALL") {
        const st = (bot.status || bot.state || "").toUpperCase();
        if (st !== statusFilter) return false;
      }

      // Mode / Env filter
      if (envFilter !== "ALL") {
        const env = (bot.execution_mode || "").toUpperCase();
        if (env !== envFilter) return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          bot.name.toLowerCase().includes(q) ||
          bot.symbol.toLowerCase().includes(q) ||
          bot.strategy.toLowerCase().includes(q) ||
          bot.id.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [rawBots, selectedMarket, statusFilter, envFilter, search]);

  // Clean up selectedBotIds if bots were deleted
  useEffect(() => {
    const validIds = new Set(rawBots.map((b) => b.id));
    setSelectedBotIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [rawBots]);

  // Selection Handlers
  const handleToggleSelectBot = (botId: string) => {
    setSelectedBotIds((prev) =>
      prev.includes(botId) ? prev.filter((id) => id !== botId) : [...prev, botId]
    );
  };

  const handleToggleSelectAll = () => {
    const filteredIds = filteredBots.map((b) => b.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedBotIds.includes(id));

    if (allSelected) {
      setSelectedBotIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedBotIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedBotIds([]);
  };

  // Execute Individual Bot Action (START, PAUSE, RESUME, STOP)
  const handleBotAction = async (botId: string, action: string) => {
    setActionError(null);
    setActionSuccess(null);
    const res = await apiClient.post<any>(`/api/bots/${botId}/control`, { action });
    if (!res.ok) {
      const msg = res.error?.message || `Failed to execute ${action} on bot ${botId}`;
      setActionError(msg);
      throw new Error(msg);
    }
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
  };

  // Open Single Delete Modal
  const handleOpenDeleteModal = (bot: BotRowItem) => {
    setBotToDelete(bot);
    setIsDeleteModalOpen(true);
  };

  // Confirm Single Delete
  const handleConfirmSingleDelete = async (botId: string, force: boolean = false) => {
    setActionError(null);
    setActionSuccess(null);
    setIsDeleting(true);
    try {
      const endpoint = force ? `/api/bots/${botId}/force-delete` : `/api/bots/${botId}`;
      const res = force
        ? await apiClient.post<any>(endpoint, {})
        : await apiClient.delete<any>(endpoint);
      if (!res.ok) {
        throw new Error(res.error?.message || `Failed to delete bot ${botId}`);
      }

      setSelectedBotIds((prev) => prev.filter((id) => id !== botId));

      if (selectedBot?.id === botId) {
        setIsDetailsDrawerOpen(false);
        setSelectedBot(null);
      }

      setActionSuccess(res.data?.message || `Bot permanently deleted. Trade history preserved.`);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
    } catch (err: any) {
      const msg = err.message || `Failed to delete bot ${botId}`;
      setActionError(msg);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  // Confirm Bulk Delete
  const handleConfirmBulkDelete = async (botIds: string[]) => {
    setActionError(null);
    setActionSuccess(null);
    setIsDeleting(true);
    try {
      const res = await apiClient.post<any>("/api/bots/bulk-delete", { bot_ids: botIds });
      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to bulk delete bots");
      }

      setSelectedBotIds([]);
      setIsBulkDeleteModalOpen(false);

      if (selectedBot && botIds.includes(selectedBot.id)) {
        setIsDetailsDrawerOpen(false);
        setSelectedBot(null);
      }

      const count = res.data?.deleted_count || botIds.length;
      setActionSuccess(`Successfully deleted ${count} bot(s). Trade history preserved.`);
      
      queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
      await refetch();
    } catch (err: any) {
      const msg = err.message || "Failed to bulk delete bots";
      setActionError(msg);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Stop Selected
  const handleBulkStop = async () => {
    if (selectedBotIds.length === 0) return;
    setActionError(null);
    setActionSuccess(null);
    const res = await apiClient.post<any>("/api/bots/bulk-stop", { bot_ids: selectedBotIds });
    if (!res.ok) {
      setActionError(res.error?.message || "Failed to stop selected bots");
      return;
    }
    setActionSuccess(res.data?.message || `Stopped ${res.data?.stopped_count || selectedBotIds.length} bot(s).`);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
  };

  // Bulk Start Selected
  const handleBulkStart = async () => {
    if (selectedBotIds.length === 0) return;
    setActionError(null);
    setActionSuccess(null);
    const res = await apiClient.post<any>("/api/bots/bulk-start", { bot_ids: selectedBotIds });
    if (!res.ok) {
      setActionError(res.error?.message || "Failed to start selected bots");
      return;
    }
    setActionSuccess(res.data?.message || `Started ${res.data?.started_count || selectedBotIds.length} bot(s).`);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
  };

  // Bulk Pause Selected
  const handleBulkPause = async () => {
    if (selectedBotIds.length === 0) return;
    setActionError(null);
    setActionSuccess(null);
    const res = await apiClient.post<any>("/api/bots/bulk-pause", { bot_ids: selectedBotIds });
    if (!res.ok) {
      setActionError(res.error?.message || "Failed to pause selected bots");
      return;
    }
    setActionSuccess(res.data?.message || `Paused ${res.data?.paused_count || selectedBotIds.length} bot(s).`);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
  };

  // Bulk Resume Selected
  const handleBulkResume = async () => {
    if (selectedBotIds.length === 0) return;
    setActionError(null);
    setActionSuccess(null);
    const res = await apiClient.post<any>("/api/bots/bulk-resume", { bot_ids: selectedBotIds });
    if (!res.ok) {
      setActionError(res.error?.message || "Failed to resume selected bots");
      return;
    }
    setActionSuccess(res.data?.message || `Resumed ${res.data?.resumed_count || selectedBotIds.length} bot(s).`);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
  };

  // Bulk Start Eligible (Header button)
  const handleConfirmBulkStart = async () => {
    setActionError(null);
    setActionSuccess(null);
    const res = await apiClient.post<any>("/api/bots/start-all", {
      market_filter: selectedMarket === "ALL" ? null : selectedMarket,
      environment: envFilter === "ALL" ? null : envFilter,
    });
    if (!res.ok) {
      const msg = res.error?.message || "Failed bulk start";
      setActionError(msg);
      throw new Error(msg);
    }
    setActionSuccess("Bulk start triggered for eligible bots.");
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
  };

  // Toggle Emergency Halt
  const handleToggleEmergencyHalt = async () => {
    setActionError(null);
    setActionSuccess(null);
    const targetState = !metrics.emergency_halt_active;
    const res = await apiClient.post<any>("/api/bots/emergency-halt", {
      active: targetState,
      reason: targetState ? "Emergency Halt Triggered by User" : "Emergency Halt Released",
    });
    if (!res.ok) {
      const msg = res.error?.message || "Failed to toggle Emergency Halt";
      setActionError(msg);
      throw new Error(msg);
    }
    setActionSuccess(targetState ? "🔴 Emergency Halt Activated across fleet." : "🟢 Emergency Halt Released.");
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
  };

  // Toggle Bot Execution Mode (LIVE vs PAPER)
  const handleToggleBotMode = async (botId: string, targetMode?: "LIVE" | "PAPER") => {
    const res = await apiClient.post<any>(`/api/bots/${botId}/mode`, {
      mode: targetMode,
      requested_by: "TRADER_UI",
    });
    if (!res.ok) {
      throw new Error(res.error?.message || "Failed to switch bot execution mode");
    }
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
  };

  const handleSelectBot = (bot: BotRowItem) => {
    setSelectedBot(bot);
    setIsDetailsDrawerOpen(true);
  };

  const selectedBotsList = useMemo(() => {
    const idSet = new Set(selectedBotIds);
    return rawBots.filter((b) => idSet.has(b.id));
  }, [rawBots, selectedBotIds]);

  // Export handlers
  const handleExportCsv = () => {
    try {
      const headers = ["ID", "Name", "Symbol", "Asset Class", "Timeframe", "Strategy", "Mode", "Status", "Allocated Capital", "Today PnL"];
      const rows = filteredBots.map((b) => [
        b.id,
        `"${b.name}"`,
        b.symbol,
        b.asset_class,
        b.timeframe,
        b.strategy,
        b.execution_mode,
        b.status,
        b.allocated_capital,
        b.pnl?.today ?? b.live_pnl ?? 0,
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `bots_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {}
  };

  const handleExportJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredBots, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `bots_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch {}
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-4 max-w-[1440px] mx-auto min-w-0 font-sans select-none pb-24 text-[var(--theme-text-primary)]">
      {/* 1. Top Summary Header & Essential Metric Cards */}
      <SimpleFleetSummaryHeader
        metrics={metrics}
        environment={environment}
        onEnvironmentChange={setEnvironment}
        onCreateBot={() => setIsCreateModalOpen(true)}
        onStartEligible={() => setIsBulkStartModalOpen(true)}
        onToggleEmergencyHalt={handleToggleEmergencyHalt}
      />

      {/* Feedback Alert Banners */}
      {actionError && (
        <div className="p-3.5 rounded-2xl bg-[var(--theme-loss)]/10 border border-[var(--theme-loss)]/30 text-[var(--theme-loss)] text-xs font-mono flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[var(--theme-loss)] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wide">Action Notice: </span>
              <span className="font-sans leading-relaxed">{actionError}</span>
            </div>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-[var(--theme-loss)] hover:text-white p-1 rounded hover:bg-[var(--theme-loss)]/20 transition-colors shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-[var(--theme-profit)]/10 border border-[var(--theme-profit)]/30 text-[var(--theme-profit)] text-xs font-mono flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[var(--theme-profit)] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wide">Success: </span>
              <span className="font-sans leading-relaxed">{actionSuccess}</span>
            </div>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-[var(--theme-profit)] hover:text-white p-1 rounded hover:bg-[var(--theme-profit)]/20 transition-colors shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Search, Market Tabs, View Switcher, and Filter Controls */}
      <SimpleBotFilterBar
        search={search}
        onSearchChange={setSearch}
        selectedMarket={selectedMarket}
        onSelectMarket={setSelectedMarket}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        envFilter={envFilter}
        onEnvFilterChange={setEnvFilter}
        showingCount={filteredBots.length}
        totalCount={rawBots.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
      />

      {/* 3. Multi-View Fleet Terminal: Table / Cards / Matrix */}
      {viewMode === "table" ? (
        <SimpleBotTable
          bots={filteredBots}
          isLoading={isLoading}
          onSelectBot={handleSelectBot}
          onBotAction={handleBotAction}
          onToggleMode={handleToggleBotMode}
          onDeleteBot={handleOpenDeleteModal}
          onCreateBot={() => setIsCreateModalOpen(true)}
          selectedMarket={selectedMarket}
          selectedBotIds={selectedBotIds}
          onToggleSelectBot={handleToggleSelectBot}
          onToggleSelectAll={handleToggleSelectAll}
        />
      ) : viewMode === "cards" ? (
        <BotCardGrid
          bots={filteredBots}
          isLoading={isLoading}
          onSelectBot={handleSelectBot}
          onBotAction={handleBotAction}
          onToggleMode={handleToggleBotMode}
          onDeleteBot={handleOpenDeleteModal}
          onCreateBot={() => setIsCreateModalOpen(true)}
          selectedMarket={selectedMarket}
          selectedBotIds={selectedBotIds}
          onToggleSelectBot={handleToggleSelectBot}
        />
      ) : (
        <BotStrategyMatrix
          bots={filteredBots}
          onSelectBot={handleSelectBot}
        />
      )}

      {/* 4. Multi-Bot Floating Bulk Action Bar */}
      <MultiBotBulkActionBar
        selectedCount={selectedBotIds.length}
        onClearSelection={handleClearSelection}
        onBulkStart={handleBulkStart}
        onBulkPause={handleBulkPause}
        onBulkResume={handleBulkResume}
        onBulkStop={handleBulkStop}
        onBulkDelete={() => setIsBulkDeleteModalOpen(true)}
      />

      {/* 5. Slide-Out Details Drawer */}
      <SimpleBotDetailsDrawer
        isOpen={isDetailsDrawerOpen}
        bot={selectedBot}
        onClose={() => setIsDetailsDrawerOpen(false)}
        onBotAction={handleBotAction}
        onToggleMode={handleToggleBotMode}
        onDeleteBot={handleOpenDeleteModal}
        onRefresh={refetch}
      />

      {/* 6. Single Bot Delete Confirmation Modal */}
      <DeleteBotModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setBotToDelete(null);
        }}
        bot={botToDelete}
        onConfirmDelete={handleConfirmSingleDelete}
        isDeleting={isDeleting}
      />

      {/* 7. Bulk Delete Confirmation Modal */}
      <BulkDeleteBotsModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        selectedBots={selectedBotsList}
        onConfirmBulkDelete={handleConfirmBulkDelete}
        isDeleting={isDeleting}
      />

      {/* 8. Bulk Start Confirmation Modal */}
      <BulkStartConfirmationModal
        isOpen={isBulkStartModalOpen}
        onClose={() => setIsBulkStartModalOpen(false)}
        bots={filteredBots}
        onConfirmStart={handleConfirmBulkStart}
      />

      {/* 9. Create Bot Wizard Modal */}
      <CreateBotWizardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
        }}
      />
    </div>
  );
}
