"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Play,
  RefreshCw,
  Bot,
  AlertTriangle,
  Server,
  Activity,
  Shield,
  Layers,
} from "lucide-react";

import {
  BotInstanceExtended,
  BotMetricsSummary,
  BotStatus,
} from "@/types/bot-control";

import { BotControlCenterHeader } from "./BotControlCenterHeader";
import { GlobalBotCommandBar } from "./GlobalBotCommandBar";
import { BotOverviewMetrics } from "./BotOverviewMetrics";
import { MarketContextStrip } from "./MarketContextStrip";
import { BotInstancesTable } from "./BotInstancesTable";
import { BotDetailDrawer } from "./BotDetailDrawer";
import { BotCommandPalette } from "./BotCommandPalette";
import { CreateBotWizardModal } from "./CreateBotWizardModal";
import { MultiBotBulkActionBar } from "./MultiBotBulkActionBar";
import { ErrorBoundary } from "../ErrorBoundary";
import { apiClient } from "@/lib/apiClient";

export function BotControlTab() {
  const queryClient = useQueryClient();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("ALL");
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);
  const [activeDrawerBot, setActiveDrawerBot] = useState<BotInstanceExtended | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [activeActionBotId, setActiveActionBotId] = useState<string | null>(null);

  // 1. Fetch Bots List (`GET /api/bots`)
  const {
    data: botsData,
    isLoading: isBotsLoading,
    error: botsError,
    refetch: refetchBots,
  } = useQuery<{ status: string; bots: BotInstanceExtended[] }>({
    queryKey: ["botsList"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/bots", { timeoutMs: 6000 });
      if (!res.ok) throw new Error(res.error?.message || "Failed to load bot instances from server");
      return res.data;
    },
    staleTime: 4000,
    refetchInterval: 6000,
    placeholderData: (prev) => prev,
  });

  // 2. Fetch Authoritative Summary (`GET /api/bots/summary`)
  const { data: summaryData } = useQuery<{ metrics: BotMetricsSummary }>({
    queryKey: ["botsSummary"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/bots/summary", { timeoutMs: 5000 });
      if (!res.ok) throw new Error(res.error?.message || "Failed to load summary");
      return res.data;
    },
    staleTime: 4000,
    refetchInterval: 6000,
    placeholderData: (prev) => prev,
  });

  const rawBots: BotInstanceExtended[] = useMemo(() => {
    return Array.isArray(botsData?.bots) ? botsData.bots : [];
  }, [botsData?.bots]);

  // Filter bots by search query and market selector
  const filteredBots = useMemo(() => {
    return rawBots.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.strategy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.id.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedMarket === "ALL") return true;
      return (b.asset_class || "crypto").toLowerCase() === selectedMarket.toLowerCase();
    });
  }, [rawBots, searchQuery, selectedMarket]);

  const metrics: BotMetricsSummary = summaryData?.metrics || {
    total_bots: rawBots.length,
    running: rawBots.filter((b) => b.status === "RUNNING").length,
    paused: rawBots.filter((b) => b.status === "PAUSED").length,
    stopped: rawBots.filter((b) => b.status === "STOPPED" || b.status === "CREATED").length,
    paper: rawBots.filter((b) => (b.execution_mode || "").toUpperCase() === "PAPER").length,
    live: rawBots.filter((b) => (b.execution_mode || "").toUpperCase() === "LIVE").length,
    error: rawBots.filter((b) => b.status === "ERROR").length,
    start_balance: 10000.0,
    current_balance: 10000.0,
    current_equity: 10000.0,
    total_trades: 0,
    open_trades: rawBots.filter((b) => (b.open_trades || 0) > 0).length,
    closed_trades: 0,
    wins: 0,
    losses: 0,
    breakeven: 0,
    win_rate_pct: 0.0,
    profit_factor: 1.0,
    w_l_be: "0 / 0 / 0",
    today_pnl: 0.0,
    total_pnl: 0.0,
    system_latency_ms: 12,
    websocket_status: "CONNECTED",
    worker_health_pct: 100,
  };

  const isAnyLive = rawBots.some((b) => (b.execution_mode || "").toUpperCase() === "LIVE");

  // -------------------------------------------------------------
  // Mutations for Bot Control Actions
  // -------------------------------------------------------------

  // Single Bot Control Mutation with Idempotent Command ID
  const botControlMutation = useMutation({
    mutationFn: async ({ botId, action }: { botId: string; action: string }) => {
      setActiveActionBotId(botId);
      const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const res = await apiClient.post<any>(
        `/api/bots/command`,
        {
          command_id: commandId,
          bot_id: botId,
          action,
          requested_by: "OPERATOR",
        },
        { timeoutMs: 8000 }
      );
      if (!res.ok) {
        throw new Error(res.error?.message || `Failed to execute ${action}`);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
    },
    onSettled: () => {
      setActiveActionBotId(null);
    },
  });

  // Start All Mutation
  const startAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<any>("/api/bots/start-all", {}, { timeoutMs: 10000 });
      if (!res.ok) throw new Error(res.error?.message || "Start all failed");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
    },
  });

  // Pause All Mutation
  const pauseAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<any>("/api/bots/pause-all", {}, { timeoutMs: 10000 });
      if (!res.ok) throw new Error(res.error?.message || "Pause all failed");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
    },
  });

  // Resume All Mutation
  const resumeAllMutation = useMutation({
    mutationFn: async () => {
      const pausedBots = rawBots.filter((b) => b.status === "PAUSED");
      await Promise.all(
        pausedBots.map((b) =>
          apiClient.post(`/api/bots/${b.id}/control`, { action: "RESUME" }, { timeoutMs: 8000 })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
    },
  });

  // Stop All Mutation
  const stopAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<any>("/api/bots/stop-all", {}, { timeoutMs: 10000 });
      if (!res.ok) throw new Error(res.error?.message || "Stop all failed");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
    },
  });

  // Emergency Kill Switch Mutation
  const killSwitchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<any>("/api/bots/stop-all", {}, { timeoutMs: 10000 });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
    },
  });

  // Duplicate Bot Mutation
  const duplicateBotMutation = useMutation({
    mutationFn: async (botId: string) => {
      const res = await apiClient.post<any>(`/api/bots/${botId}/duplicate`, {}, { timeoutMs: 8000 });
      if (!res.ok) throw new Error(res.error?.message || "Duplicate failed");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
    },
  });

  // Delete Bot Mutation
  const deleteBotMutation = useMutation({
    mutationFn: async (botId: string) => {
      const res = await apiClient.delete<any>(`/api/bots/${botId}`, { timeoutMs: 8000 });
      if (!res.ok) throw new Error(res.error?.message || "Delete failed");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
      setSelectedBotIds((prev) => prev.filter((id) => id !== activeActionBotId));
    },
  });

  // Bulk Actions
  const handleBulkStart = () => {
    selectedBotIds.forEach((id) => botControlMutation.mutate({ botId: id, action: "START" }));
  };

  const handleBulkPause = () => {
    selectedBotIds.forEach((id) => botControlMutation.mutate({ botId: id, action: "PAUSE" }));
  };

  const handleBulkResume = () => {
    selectedBotIds.forEach((id) => botControlMutation.mutate({ botId: id, action: "RESUME" }));
  };

  const handleBulkStop = () => {
    selectedBotIds.forEach((id) => botControlMutation.mutate({ botId: id, action: "STOP" }));
  };

  const handleBulkDelete = () => {
    selectedBotIds.forEach((id) => deleteBotMutation.mutate(id));
  };

  // Toggle selection
  const handleToggleSelectBot = (id: string) => {
    setSelectedBotIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedBotIds.length === filteredBots.length) {
      setSelectedBotIds([]);
    } else {
      setSelectedBotIds(filteredBots.map((b) => b.id));
    }
  };

  const handleOpenBotDrawer = (bot: BotInstanceExtended) => {
    setActiveDrawerBot(bot);
    setIsDrawerOpen(true);
  };

  if (!isMounted) {
    return (
      <div className="p-12 text-center text-xs text-[#A8BDB0] bg-[#0D1914] rounded-2xl border border-[#294238] animate-pulse">
        Initializing Bot Control Operating System...
      </div>
    );
  }

  return (
    <div className="space-y-5 font-sans select-none text-[#E8F3EC]">
      {/* 1. TOP GLOBAL HEADER */}
      <ErrorBoundary title="Bot Header Error">
        <BotControlCenterHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedMarket={selectedMarket}
          onMarketChange={setSelectedMarket}
          isLiveMode={isAnyLive}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          totalRunningCount={metrics.running}
          totalPausedCount={metrics.paused}
          totalStoppedCount={metrics.stopped}
          totalBotsCount={metrics.total_bots}
          systemLatencyMs={metrics.system_latency_ms || 12}
        />
      </ErrorBoundary>

      {/* 2. GLOBAL BOT COMMAND BAR */}
      <ErrorBoundary title="Bot Command Bar Error">
        <GlobalBotCommandBar
          metrics={metrics}
          bots={rawBots}
          selectedBotIds={selectedBotIds}
          onStartAll={() => startAllMutation.mutate()}
          isStartingAll={startAllMutation.isPending}
          onPauseAll={() => pauseAllMutation.mutate()}
          isPausingAll={pauseAllMutation.isPending}
          onResumeAll={() => resumeAllMutation.mutate()}
          isResumingAll={resumeAllMutation.isPending}
          onStopAll={() => stopAllMutation.mutate()}
          isStoppingAll={stopAllMutation.isPending}
          onKillSwitch={() => killSwitchMutation.mutate()}
          isKilling={killSwitchMutation.isPending}
          onOpenCreateWizard={() => setIsCreateWizardOpen(true)}
        />
      </ErrorBoundary>

      {/* 3. BOT OVERVIEW METRICS */}
      <ErrorBoundary title="Bot Metrics Summary Error">
        <BotOverviewMetrics metrics={metrics} />
      </ErrorBoundary>

      {/* 4. LIVE MARKET CONTEXT STRIP */}
      <ErrorBoundary title="Market Context Error">
        <MarketContextStrip
          symbol={rawBots[0]?.symbol || "BTC/USDT"}
        />
      </ErrorBoundary>

      {/* 5. BOT INSTANCES SMART TABLE */}
      <ErrorBoundary title="Bot Table Error">
        {isBotsLoading ? (
          <div className="p-12 text-center text-xs text-[#A8BDB0] bg-[#0D1914] rounded-2xl border border-[#294238] animate-pulse">
            Loading bot fleet instances...
          </div>
        ) : botsError ? (
          <div className="p-5 bg-red-950/40 border border-red-800 rounded-2xl space-y-3 text-xs text-red-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <span>Bot Instances Unavailable: Backend Connection Issue</span>
              </div>
              <button
                onClick={() => refetchBots()}
                className="px-3 py-1.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold transition-colors flex items-center gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-300">
              {(botsError as Error).message || "Could not retrieve bot instances from SQLite runtime."}
            </p>
          </div>
        ) : (
          <BotInstancesTable
            bots={filteredBots}
            selectedBotIds={selectedBotIds}
            onToggleSelectBot={handleToggleSelectBot}
            onToggleSelectAll={handleToggleSelectAll}
            onOpenBotDrawer={handleOpenBotDrawer}
            onBotAction={(botId, action) => botControlMutation.mutate({ botId, action })}
            onDuplicateBot={(botId) => duplicateBotMutation.mutate(botId)}
            onDeleteBot={(botId) => deleteBotMutation.mutate(botId)}
            onEditBot={(botId) => {
              const b = rawBots.find((item) => item.id === botId);
              if (b) handleOpenBotDrawer(b);
            }}
            activeActionBotId={activeActionBotId}
          />
        )}
      </ErrorBoundary>

      {/* 7. SLIDE-OUT BOT DETAIL DRAWER */}
      <BotDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        bot={activeDrawerBot}
        onBotAction={(botId, action) => botControlMutation.mutate({ botId, action })}
      />

      {/* 8. COMMAND PALETTE (Cmd+K) */}
      <BotCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        bots={rawBots}
        onBotAction={(botId, action) => botControlMutation.mutate({ botId, action })}
        onOpenCreateWizard={() => {
          setIsCommandPaletteOpen(false);
          setIsCreateWizardOpen(true);
        }}
        onStartAll={() => startAllMutation.mutate()}
        onPauseAll={() => pauseAllMutation.mutate()}
        onStopAll={() => stopAllMutation.mutate()}
        onKillSwitch={() => killSwitchMutation.mutate()}
        onSelectBot={handleOpenBotDrawer}
      />

      {/* 9. CREATE BOT 6-STEP WIZARD MODAL */}
      <CreateBotWizardModal
        isOpen={isCreateWizardOpen}
        onClose={() => setIsCreateWizardOpen(false)}
        onSuccess={() => {
          refetchBots();
        }}
      />

      {/* 10. MULTI-BOT BULK ACTION FLOATING BAR */}
      <MultiBotBulkActionBar
        selectedCount={selectedBotIds.length}
        onClearSelection={() => setSelectedBotIds([])}
        onBulkStart={handleBulkStart}
        onBulkPause={handleBulkPause}
        onBulkResume={handleBulkResume}
        onBulkStop={handleBulkStop}
        onBulkDelete={handleBulkDelete}
      />
    </div>
  );
}
