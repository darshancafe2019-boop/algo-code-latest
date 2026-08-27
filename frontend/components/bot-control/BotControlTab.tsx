"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SimpleFleetSummaryHeader } from "./SimpleFleetSummaryHeader";
import { SimpleBotFilterBar } from "./SimpleBotFilterBar";
import { SimpleBotTable, BotRowItem } from "./SimpleBotTable";
import { SimpleBotDetailsDrawer } from "./SimpleBotDetailsDrawer";
import { BulkStartConfirmationModal } from "./BulkStartConfirmationModal";
import { CreateBotWizardModal } from "./CreateBotWizardModal";
import { apiClient } from "@/lib/apiClient";

export function BotControlTab() {
  const queryClient = useQueryClient();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // UI Filter State
  const [search, setSearch] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [envFilter, setEnvFilter] = useState("ALL");
  const [environment, setEnvironment] = useState<"PAPER" | "LIVE">("PAPER");

  // Modal / Drawer State
  const [selectedBot, setSelectedBot] = useState<BotRowItem | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [isBulkStartModalOpen, setIsBulkStartModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 1. Authoritative Fleet & Bots Query (`GET /api/bots`)
  const {
    data: fleetData,
    isLoading,
    refetch,
  } = useQuery<{
    status: string;
    metrics: any;
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

  const metrics = useMemo(() => {
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

  // Execute Individual Bot Action
  const handleBotAction = async (botId: string, action: string) => {
    const res = await apiClient.post<any>(`/api/bots/${botId}/control`, { action });
    if (!res.ok) {
      throw new Error(res.error?.message || `Failed to execute ${action}`);
    }
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
  };

  // Bulk Start Eligible
  const handleConfirmBulkStart = async () => {
    const res = await apiClient.post<any>("/api/bots/start-all", {
      market_filter: selectedMarket === "ALL" ? null : selectedMarket,
      environment: envFilter === "ALL" ? null : envFilter,
    });
    if (!res.ok) {
      throw new Error(res.error?.message || "Failed bulk start");
    }
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
  };

  // Toggle Emergency Halt
  const handleToggleEmergencyHalt = async () => {
    const targetState = !metrics.emergency_halt_active;
    const res = await apiClient.post<any>("/api/bots/emergency-halt", {
      active: targetState,
      reason: targetState ? "Emergency Halt Triggered by User" : "Emergency Halt Released",
    });
    if (!res.ok) {
      throw new Error(res.error?.message || "Failed to toggle Emergency Halt");
    }
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

  if (!isMounted) return null;

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto min-w-0 font-sans">
      {/* 1. Top Summary Header & Essential Metric Cards */}
      <SimpleFleetSummaryHeader
        metrics={metrics}
        environment={environment}
        onEnvironmentChange={setEnvironment}
        onCreateBot={() => setIsCreateModalOpen(true)}
        onStartEligible={() => setIsBulkStartModalOpen(true)}
        onToggleEmergencyHalt={handleToggleEmergencyHalt}
      />

      {/* 2. Search, Market Tabs, and Filter Controls */}
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
      />

      {/* 3. Authoritative 7-Column Bot Table */}
      <SimpleBotTable
        bots={filteredBots}
        isLoading={isLoading}
        onSelectBot={handleSelectBot}
        onBotAction={handleBotAction}
        onToggleMode={handleToggleBotMode}
        onCreateBot={() => setIsCreateModalOpen(true)}
        selectedMarket={selectedMarket}
      />

      {/* 4. Slide-Out Details Drawer */}
      <SimpleBotDetailsDrawer
        isOpen={isDetailsDrawerOpen}
        bot={selectedBot}
        onClose={() => setIsDetailsDrawerOpen(false)}
        onBotAction={handleBotAction}
        onToggleMode={handleToggleBotMode}
        onRefresh={refetch}
      />

      {/* 5. Bulk Start Confirmation Modal */}
      <BulkStartConfirmationModal
        isOpen={isBulkStartModalOpen}
        onClose={() => setIsBulkStartModalOpen(false)}
        bots={filteredBots}
        onConfirmStart={handleConfirmBulkStart}
      />

      {/* 6. Create Bot Wizard Modal */}
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
