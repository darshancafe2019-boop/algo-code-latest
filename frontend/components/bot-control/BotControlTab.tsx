"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
import { OrderDestinationModal } from "./OrderDestinationModal";
import { DecisionLogFeed } from "./DecisionLogFeed";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
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
  const [selectedBroker, setSelectedBroker] = useState("ALL");
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

  // Order Destination Modal State
  const [orderDestinationBot, setOrderDestinationBot] = useState<BotRowItem | null>(null);
  const [orderDestinationSide, setOrderDestinationSide] = useState<"BUY" | "SELL">("BUY");
  const [isOrderDestinationModalOpen, setIsOrderDestinationModalOpen] = useState(false);

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
    isError,
    error: queryError,
    refetch,
  } = useQuery<{
    status: string;
    metrics: FleetMetrics;
    bots: BotRowItem[];
    total?: number;
  }>({
    queryKey: ["authoritativeFleetBots"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/bots", { timeoutMs: 8000 });
      if (!res.ok) throw new Error(res.error?.message || "Failed to load bot fleet snapshot");
      return res.data;
    },
    staleTime: 3000,
    refetchInterval: 5000,
    placeholderData: (prev) => prev,
  });

  const searchParams = useSearchParams();
  const selectedBotIdFromUrl = searchParams.get("selectedBotId");

  const rawBots: BotRowItem[] = useMemo(() => {
    return Array.isArray(fleetData?.bots) ? fleetData.bots : [];
  }, [fleetData?.bots]);

  // Deep Link: Automatically open bot drawer if selectedBotId is provided in URL
  useEffect(() => {
    if (selectedBotIdFromUrl && rawBots.length > 0) {
      const targetBot = rawBots.find(
        (b) => b.id === selectedBotIdFromUrl || b.name.toLowerCase() === selectedBotIdFromUrl.toLowerCase()
      );
      if (targetBot) {
        setSelectedBot(targetBot);
        setIsDetailsDrawerOpen(true);
      }
    }
  }, [selectedBotIdFromUrl, rawBots]);

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
        const instType = (bot.instrument_type || bot.instrumentType || "").toUpperCase();
        const optType = (bot.option_type || bot.optionType || "").toUpperCase();
        const sym = (bot.symbol || "").toUpperCase();
        const nameUpper = (bot.name || "").toUpperCase();

        if (selectedMarket === "OPTIONS") {
          const isOption = mkt.includes("OPTION") || instType === "OPTION" || optType !== "" || sym.includes(" CE") || sym.includes(" PE") || sym.endsWith("CE") || sym.endsWith("PE") || sym.includes("-C") || sym.includes("-P");
          if (!isOption) return false;
        } else if (selectedMarket === "CALL") {
          const isCall = optType === "CALL" || optType === "CE" || sym.includes("CE") || sym.includes("CALL") || nameUpper.includes("CE") || nameUpper.includes("CALL") || sym.includes("-C");
          if (!isCall) return false;
        } else if (selectedMarket === "PUT") {
          const isPut = optType === "PUT" || optType === "PE" || sym.includes("PE") || sym.includes("PUT") || nameUpper.includes("PE") || nameUpper.includes("PUT") || sym.includes("-P");
          if (!isPut) return false;
        } else if (selectedMarket === "FUTURES") {
          const isFut = mkt.includes("FUT") || instType === "FUTURE" || sym.includes("FUT") || nameUpper.includes("FUT");
          if (!isFut) return false;
        } else if (selectedMarket === "CRYPTO") {
          const isCrypto = mkt.includes("CRYPTO") || instType === "CRYPTO" || sym.includes("BTC") || sym.includes("ETH") || sym.includes("SOL") || sym.includes("USDT");
          if (!isCrypto) return false;
        } else if (selectedMarket === "INDIAN_STOCKS") {
          const isIndian = mkt.includes("INDIAN") || mkt.includes("NSE") || (bot.exchange || "").toUpperCase().includes("NSE") || (bot.market_data_source || "").toUpperCase().includes("UPSTOX") || (bot.execution_broker || "").toUpperCase().includes("DHAN") || sym.includes("NIFTY") || sym.includes("BANKNIFTY") || sym.includes("RELIANCE");
          if (!isIndian) return false;
        } else if (selectedMarket === "FOREX") {
          if (!mkt.includes("FOREX")) return false;
        } else if (selectedMarket === "COMMODITIES") {
          if (!mkt.includes("COMMODITIES") && !mkt.includes("COMMODITY")) return false;
        } else if (selectedMarket === "US_EQUITY") {
          if (!mkt.includes("US") && !mkt.includes("EQUITY")) return false;
        }
      }

      // Broker Source Filter
      if (selectedBroker !== "ALL") {
        const brk = (bot.execution_broker_id || bot.execution_broker || bot.broker || bot.market_data_source || "").toUpperCase();
        if (selectedBroker === "PAPER" && !brk.includes("PAPER") && !brk.includes("SIM")) return false;
        if (selectedBroker === "BINANCE" && !brk.includes("BINANCE")) return false;
        if (selectedBroker === "UPSTOX" && !brk.includes("UPSTOX")) return false;
        if (selectedBroker === "DHAN" && !brk.includes("DHAN")) return false;
        if (selectedBroker === "DELTA_INDIA" && !brk.includes("DELTA")) return false;
      }

      // Status filter
      if (statusFilter !== "ALL") {
        const st = (bot.status || bot.state || bot.runtime_status || bot.runtimeStatus || "").toUpperCase();
        if (statusFilter === "RUNNING" || statusFilter === "ACTIVE") {
          if (st !== "RUNNING" && st !== "ACTIVE") return false;
        } else if (statusFilter === "PAUSED") {
          if (st !== "PAUSED" && st !== "PAUSING") return false;
        } else if (statusFilter === "STOPPED") {
          if (st !== "STOPPED" && st !== "STOPPING" && st !== "DRAFT" && st !== "DISABLED" && st !== "READY_PAPER" && st !== "READY") return false;
        } else if (statusFilter === "DRAFT") {
          if (st !== "DRAFT" && st !== "CREATED") return false;
        } else if (statusFilter === "ERROR") {
          if (st !== "ERROR" && st !== "QUARANTINED") return false;
        } else {
          if (st !== statusFilter) return false;
        }
      }

      // Mode / Env filter
      if (envFilter !== "ALL") {
        const env = (bot.execution_mode || bot.mode || "").toUpperCase();
        if (env !== envFilter) return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          bot.name.toLowerCase().includes(q) ||
          bot.symbol.toLowerCase().includes(q) ||
          bot.strategy.toLowerCase().includes(q) ||
          bot.id.toLowerCase().includes(q) ||
          (bot.underlying && bot.underlying.toLowerCase().includes(q)) ||
          (bot.underlying_symbol && bot.underlying_symbol.toLowerCase().includes(q)) ||
          (bot.market_data_source && bot.market_data_source.toLowerCase().includes(q)) ||
          (bot.execution_broker && bot.execution_broker.toLowerCase().includes(q)) ||
          (bot.broker_account_id && bot.broker_account_id.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [rawBots, selectedMarket, selectedBroker, statusFilter, envFilter, search]);

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

  // In-flight action locks to prevent rapid duplicate double-clicks
  const [inFlightActionKeys, setInFlightActionKeys] = useState<Set<string>>(new Set());

  // Execute Individual Bot Action (START, PAUSE, RESUME, STOP) with single-click guard
  const handleBotAction = async (botId: string, action: string) => {
    const lockKey = `${action}:${botId}`;
    if (inFlightActionKeys.has(lockKey)) {
      return;
    }

    setInFlightActionKeys((prev) => new Set(prev).add(lockKey));
    setActionError(null);
    setActionSuccess(null);

    try {
      const idempotencyKey = apiClient.generateIdempotencyKey(`BOT_${action}`, botId);
      const res = await apiClient.post<any>(
        `/api/bots/${botId}/control`,
        { action, idempotency_key: idempotencyKey },
        { idempotencyKey, timeoutMs: 12000 }
      );

      if (!res.ok) {
        const msg = res.error?.message || `Failed to execute ${action} on bot ${botId}`;
        setActionError(msg);
        throw new Error(msg);
      }

      await refetch();
      queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
    } finally {
      setInFlightActionKeys((prev) => {
        const next = new Set(prev);
        next.delete(lockKey);
        return next;
      });
    }
  };

  // Set Execution Broker per bot
  const handleSetBroker = async (botId: string, brokerId: string, accountId?: string) => {
    const lockKey = `SET_BROKER:${botId}`;
    if (inFlightActionKeys.has(lockKey)) return;

    setInFlightActionKeys((prev) => new Set(prev).add(lockKey));
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await apiClient.post<any>(
        `/api/bots/${botId}/broker`,
        {
          broker_id: brokerId,
          broker_account_id: accountId,
          requested_by: "TRADER_UI",
        },
        { timeoutMs: 8000 }
      );

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to update execution broker");
      }

      setActionSuccess(res.data?.message || `Execution broker updated.`);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
    } catch (err: any) {
      setActionError(err.message || "Failed to update broker");
    } finally {
      setInFlightActionKeys((prev) => {
        const next = new Set(prev);
        next.delete(lockKey);
        return next;
      });
    }
  };

  // Open Order Destination Modal
  const handleOpenOrderDestination = (bot: BotRowItem, side: "BUY" | "SELL") => {
    setOrderDestinationBot(bot);
    setOrderDestinationSide(side);
    setIsOrderDestinationModalOpen(true);
  };

  // Open Single Delete Modal
  const handleOpenDeleteModal = (bot: BotRowItem) => {
    setBotToDelete(bot);
    setIsDeleteModalOpen(true);
  };

  // Confirm Single Delete with in-flight lock
  const handleConfirmSingleDelete = async (botId: string, force: boolean = false) => {
    const lockKey = `DELETE:${botId}`;
    if (inFlightActionKeys.has(lockKey) || isDeleting) return;

    setInFlightActionKeys((prev) => new Set(prev).add(lockKey));
    setActionError(null);
    setActionSuccess(null);
    setIsDeleting(true);

    try {
      const endpoint = force ? `/api/bots/${botId}/force-delete` : `/api/bots/${botId}`;
      const idempotencyKey = apiClient.generateIdempotencyKey(force ? "FORCE_DELETE" : "DELETE", botId);
      const res = force
        ? await apiClient.post<any>(endpoint, {}, { idempotencyKey, timeoutMs: 12000 })
        : await apiClient.delete<any>(endpoint, { idempotencyKey, timeoutMs: 12000 });

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
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
      queryClient.invalidateQueries({ queryKey: ["activeBots"] });
      queryClient.invalidateQueries({ queryKey: ["fleetSummary"] });
    } catch (err: any) {
      const msg = err.message || `Failed to delete bot ${botId}`;
      setActionError(msg);
      throw err;
    } finally {
      setIsDeleting(false);
      setInFlightActionKeys((prev) => {
        const next = new Set(prev);
        next.delete(lockKey);
        return next;
      });
    }
  };

  // Confirm Bulk Delete
  const handleConfirmBulkDelete = async (botIds: string[]) => {
    const lockKey = "BULK_DELETE";
    if (inFlightActionKeys.has(lockKey) || isDeleting) return;

    setInFlightActionKeys((prev) => new Set(prev).add(lockKey));
    setActionError(null);
    setActionSuccess(null);
    setIsDeleting(true);

    try {
      const idempotencyKey = apiClient.generateIdempotencyKey("BULK_DELETE");
      const res = await apiClient.post<any>(
        "/api/bots/bulk-delete",
        { bot_ids: botIds },
        { idempotencyKey, timeoutMs: 15000 }
      );

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
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
      queryClient.invalidateQueries({ queryKey: ["activeBots"] });
      queryClient.invalidateQueries({ queryKey: ["fleetSummary"] });
      await refetch();
    } catch (err: any) {
      const msg = err.message || "Failed to bulk delete bots";
      setActionError(msg);
      throw err;
    } finally {
      setIsDeleting(false);
      setInFlightActionKeys((prev) => {
        const next = new Set(prev);
        next.delete(lockKey);
        return next;
      });
    }
  };

  // Bulk Stop Selected
  const handleBulkStop = async () => {
    if (selectedBotIds.length === 0) return;
    const lockKey = "BULK_STOP";
    if (inFlightActionKeys.has(lockKey)) return;

    setInFlightActionKeys((prev) => new Set(prev).add(lockKey));
    setActionError(null);
    setActionSuccess(null);

    try {
      const idempotencyKey = apiClient.generateIdempotencyKey("BULK_STOP");
      const res = await apiClient.post<any>(
        "/api/bots/bulk-stop",
        { bot_ids: selectedBotIds },
        { idempotencyKey, timeoutMs: 15000 }
      );

      if (!res.ok) {
        setActionError(res.error?.message || "Failed to stop selected bots");
        return;
      }
      setActionSuccess(res.data?.message || `Stopped ${res.data?.stopped_count || selectedBotIds.length} bot(s).`);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
    } finally {
      setInFlightActionKeys((prev) => {
        const next = new Set(prev);
        next.delete(lockKey);
        return next;
      });
    }
  };

  // Bulk Start Selected
  const handleBulkStart = async () => {
    if (selectedBotIds.length === 0) return;
    const lockKey = "BULK_START";
    if (inFlightActionKeys.has(lockKey)) return;

    setInFlightActionKeys((prev) => new Set(prev).add(lockKey));
    setActionError(null);
    setActionSuccess(null);

    try {
      const idempotencyKey = apiClient.generateIdempotencyKey("BULK_START");
      const res = await apiClient.post<any>(
        "/api/bots/bulk-start",
        { bot_ids: selectedBotIds },
        { idempotencyKey, timeoutMs: 15000 }
      );

      if (!res.ok) {
        setActionError(res.error?.message || "Failed to start selected bots");
        return;
      }
      setActionSuccess(res.data?.message || `Started ${res.data?.started_count || selectedBotIds.length} bot(s).`);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
    } finally {
      setInFlightActionKeys((prev) => {
        const next = new Set(prev);
        next.delete(lockKey);
        return next;
      });
    }
  };

  // Bulk Pause Selected
  const handleBulkPause = async () => {
    if (selectedBotIds.length === 0) return;
    const lockKey = "BULK_PAUSE";
    if (inFlightActionKeys.has(lockKey)) return;

    setInFlightActionKeys((prev) => new Set(prev).add(lockKey));
    setActionError(null);
    setActionSuccess(null);

    try {
      const idempotencyKey = apiClient.generateIdempotencyKey("BULK_PAUSE");
      const res = await apiClient.post<any>(
        "/api/bots/bulk-pause",
        { bot_ids: selectedBotIds },
        { idempotencyKey, timeoutMs: 15000 }
      );

      if (!res.ok) {
        setActionError(res.error?.message || "Failed to pause selected bots");
        return;
      }
      setActionSuccess(res.data?.message || `Paused ${res.data?.paused_count || selectedBotIds.length} bot(s).`);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
    } finally {
      setInFlightActionKeys((prev) => {
        const next = new Set(prev);
        next.delete(lockKey);
        return next;
      });
    }
  };

  // Bulk Resume Selected
  const handleBulkResume = async () => {
    if (selectedBotIds.length === 0) return;
    const lockKey = "BULK_RESUME";
    if (inFlightActionKeys.has(lockKey)) return;

    setInFlightActionKeys((prev) => new Set(prev).add(lockKey));
    setActionError(null);
    setActionSuccess(null);

    try {
      const idempotencyKey = apiClient.generateIdempotencyKey("BULK_RESUME");
      const res = await apiClient.post<any>(
        "/api/bots/bulk-resume",
        { bot_ids: selectedBotIds },
        { idempotencyKey, timeoutMs: 15000 }
      );

      if (!res.ok) {
        setActionError(res.error?.message || "Failed to resume selected bots");
        return;
      }
      setActionSuccess(res.data?.message || `Resumed ${res.data?.resumed_count || selectedBotIds.length} bot(s).`);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
    } finally {
      setInFlightActionKeys((prev) => {
        const next = new Set(prev);
        next.delete(lockKey);
        return next;
      });
    }
  };

  // Bulk Start Eligible (Header button)
  const handleConfirmBulkStart = async () => {
    const lockKey = "START_ALL";
    if (inFlightActionKeys.has(lockKey)) return;

    setInFlightActionKeys((prev) => new Set(prev).add(lockKey));
    setActionError(null);
    setActionSuccess(null);

    try {
      const idempotencyKey = apiClient.generateIdempotencyKey("START_ALL");
      const res = await apiClient.post<any>(
        "/api/bots/start-all",
        {
          market_filter: selectedMarket === "ALL" ? null : selectedMarket,
          environment: envFilter === "ALL" ? null : envFilter,
        },
        { idempotencyKey, timeoutMs: 15000 }
      );

      if (!res.ok) {
        const msg = res.error?.message || "Failed bulk start";
        setActionError(msg);
        throw new Error(msg);
      }
      setActionSuccess("Bulk start triggered for eligible bots.");
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
    } finally {
      setInFlightActionKeys((prev) => {
        const next = new Set(prev);
        next.delete(lockKey);
        return next;
      });
    }
  };

  // Toggle Emergency Halt
  const handleToggleEmergencyHalt = async () => {
    const lockKey = "EMERGENCY_HALT";
    if (inFlightActionKeys.has(lockKey)) return;

    setInFlightActionKeys((prev) => new Set(prev).add(lockKey));
    setActionError(null);
    setActionSuccess(null);

    try {
      const targetState = !metrics.emergency_halt_active;
      const idempotencyKey = apiClient.generateIdempotencyKey(targetState ? "HALT_ACTIVE" : "HALT_RELEASE");
      const res = await apiClient.post<any>(
        "/api/bots/emergency-halt",
        {
          active: targetState,
          reason: targetState ? "Emergency Halt Triggered by User" : "Emergency Halt Released",
        },
        { idempotencyKey, timeoutMs: 15000 }
      );

      if (!res.ok) {
        const msg = res.error?.message || "Failed to toggle Emergency Halt";
        setActionError(msg);
        throw new Error(msg);
      }
      setActionSuccess(targetState ? "🔴 Emergency Halt Activated across fleet." : "🟢 Emergency Halt Released.");
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
    } finally {
      setInFlightActionKeys((prev) => {
        const next = new Set(prev);
        next.delete(lockKey);
        return next;
      });
    }
  };

  // Toggle Bot Execution Mode (LIVE vs PAPER)
  const handleToggleBotMode = async (botId: string, targetMode?: "LIVE" | "PAPER") => {
    const lockKey = `TOGGLE_MODE:${botId}`;
    if (inFlightActionKeys.has(lockKey)) return;

    setInFlightActionKeys((prev) => new Set(prev).add(lockKey));

    try {
      const idempotencyKey = apiClient.generateIdempotencyKey("TOGGLE_MODE", botId);
      const res = await apiClient.post<any>(
        `/api/bots/${botId}/mode`,
        {
          mode: targetMode,
          requested_by: "TRADER_UI",
        },
        { idempotencyKey, timeoutMs: 10000 }
      );

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to switch bot execution mode");
      }
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
    } finally {
      setInFlightActionKeys((prev) => {
        const next = new Set(prev);
        next.delete(lockKey);
        return next;
      });
    }
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
      const headers = [
        "UID",
        "ID",
        "Name",
        "Symbol",
        "Asset Class",
        "Timeframe",
        "Strategy",
        "Mode",
        "Market Data Source",
        "Execution Broker",
        "Broker Account",
        "Exchange",
        "Segment",
        "Instrument Key",
        "Feed Status",
        "Status",
        "Allocated Capital",
        "Today PnL",
      ];
      const rows = filteredBots.map((b) => [
        b.bot_uid || b.id,
        b.id,
        `"${b.name}"`,
        b.symbol,
        b.asset_class,
        b.timeframe,
        b.strategy,
        b.execution_mode,
        b.market_data_source || "Binance Official API",
        b.execution_broker || "Paper Simulator",
        b.broker_account_id || "Paper-Account-01",
        b.exchange || "BINANCE",
        b.segment || "CRYPTO_SPOT",
        b.instrument_key || b.symbol,
        b.feed_status || "LIVE",
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

  // Top performing bot
  const topBot = useMemo(() => {
    if (rawBots.length === 0) return null;
    return [...rawBots].sort((a, b) => {
      const pnlA = a.pnl?.today ?? a.live_pnl ?? 0;
      const pnlB = b.pnl?.today ?? b.live_pnl ?? 0;
      return pnlB - pnlA;
    })[0];
  }, [rawBots]);

  // Active positions count
  const activePositions = useMemo(() => {
    return rawBots.filter((b) => b.position?.has_position).length;
  }, [rawBots]);

  if (!isMounted) return null;

  return (
    <div className="w-full space-y-3.5 font-sans max-w-[1600px] mx-auto px-4 pt-4 pb-12 bg-[#05101A] select-none text-[#F8FAFC]">
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
        <div className="p-3 rounded-lg bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 text-[#FF3B5C] text-xs font-mono flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[#FF3B5C] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wide">Action Notice: </span>
              <span className="font-sans leading-relaxed">{actionError}</span>
            </div>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-[#FF3B5C] hover:text-white p-1 rounded hover:bg-[#FF3B5C]/20 transition-colors shrink-0 cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-[#00E89A]/10 border border-[#00E89A]/30 text-[#00E89A] text-xs font-mono flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#00E89A] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wide">Success: </span>
              <span className="font-sans leading-relaxed">{actionSuccess}</span>
            </div>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-[#00E89A] hover:text-white p-1 rounded hover:bg-[#00E89A]/20 transition-colors shrink-0 cursor-pointer"
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
        selectedBroker={selectedBroker}
        onSelectBroker={setSelectedBroker}
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
          totalBotsCount={rawBots.length}
          isError={isError}
          errorMessage={queryError instanceof Error ? queryError.message : "Failed to load fleet data"}
          onRetry={() => refetch()}
          onSelectBot={handleSelectBot}
          onBotAction={handleBotAction}
          onToggleMode={handleToggleBotMode}
          onSetBroker={handleSetBroker}
          onOpenOrderDestination={handleOpenOrderDestination}
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
          totalBotsCount={rawBots.length}
          isError={isError}
          errorMessage={queryError instanceof Error ? queryError.message : "Failed to load fleet data"}
          onRetry={() => refetch()}
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

      {/* 4. Bottom Analytics & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left: Live Decision Log Feed (Col-span 7) */}
        <div className="lg:col-span-7">
          <DecisionLogFeed />
        </div>

        {/* Right: Fleet Telemetry & Quick Operations (Col-span 5) */}
        <div className="lg:col-span-5 rounded-[10px] bg-[#0A1422] border border-[#12304A] p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#10263A]">
              <span className="text-[12px] font-bold text-[#F8FAFC] uppercase tracking-wider">
                Fleet Performance & Ops
              </span>
              <span className="text-[10px] font-semibold text-[#00E89A] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" />
                OMS Synchronized
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 font-mono">
              <div className="p-2 rounded-lg bg-[#05101A] border border-[#12304A]">
                <span className="text-[10px] text-[#7D8EA5] block">Top Performer</span>
                <span className="font-bold text-[#F8FAFC] text-[11px] truncate block">
                  {topBot?.name || "None Active"}
                </span>
                <span className="text-[10px] text-[#00E89A] font-semibold">
                  {topBot ? `+$${Math.abs(topBot.pnl?.today ?? topBot.live_pnl ?? 0).toFixed(2)}` : "—"}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-[#05101A] border border-[#12304A]">
                <span className="text-[10px] text-[#7D8EA5] block">Open Positions</span>
                <span className="font-bold text-[#22D3EE] text-[14px] leading-tight block">
                  {activePositions}
                </span>
                <span className="text-[10px] text-[#7D8EA5]">across active bots</span>
              </div>
            </div>

            <div className="space-y-1 text-[11px] border-t border-[#10263A] pt-2">
              <div className="flex items-center justify-between text-[#7D8EA5]">
                <span>Total Capital Allocated</span>
                <span className="font-semibold text-[#F8FAFC] font-mono">${(metrics.allocated_capital / 1000).toFixed(1)}K</span>
              </div>
              <div className="flex items-center justify-between text-[#7D8EA5]">
                <span>Active Capital In-Flight</span>
                <span className="font-semibold text-[#F59E0B] font-mono">${(metrics.capital_used / 1000).toFixed(1)}K</span>
              </div>
              <div className="flex items-center justify-between text-[#7D8EA5]">
                <span>Emergency Halt Protocol</span>
                <span className={cn("font-semibold font-mono", metrics.emergency_halt_active ? "text-[#FF3B5C]" : "text-[#00E89A]")}>
                  {metrics.emergency_halt_active ? "ENGAGED" : "ARMED / READY"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#10263A] mt-2 flex items-center gap-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 h-7 rounded-md bg-[#168BFF] hover:bg-[#168BFF]/85 text-[#F8FAFC] font-semibold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              + New Bot
            </button>
            <button
              onClick={() => setIsBulkStartModalOpen(true)}
              className="flex-1 h-7 rounded-md bg-[#05101A] border border-[#12304A] hover:border-[#00E89A]/40 text-[#00E89A] font-semibold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              Start Eligible
            </button>
          </div>
        </div>
      </div>

      {/* 5. Multi-Bot Floating Bulk Action Bar */}
      <MultiBotBulkActionBar
        selectedCount={selectedBotIds.length}
        onClearSelection={handleClearSelection}
        onBulkStart={handleBulkStart}
        onBulkPause={handleBulkPause}
        onBulkResume={handleBulkResume}
        onBulkStop={handleBulkStop}
        onBulkDelete={() => setIsBulkDeleteModalOpen(true)}
      />

      {/* 6. Slide-Out Details Drawer */}
      <SimpleBotDetailsDrawer
        isOpen={isDetailsDrawerOpen}
        bot={selectedBot}
        onClose={() => setIsDetailsDrawerOpen(false)}
        onBotAction={handleBotAction}
        onToggleMode={handleToggleBotMode}
        onSetBroker={handleSetBroker}
        onOpenOrderDestination={handleOpenOrderDestination}
        onDeleteBot={handleOpenDeleteModal}
        onRefresh={refetch}
      />

      {/* 7. Order Destination Confirmation Modal */}
      <OrderDestinationModal
        isOpen={isOrderDestinationModalOpen}
        bot={orderDestinationBot}
        side={orderDestinationSide}
        onClose={() => {
          setIsOrderDestinationModalOpen(false);
          setOrderDestinationBot(null);
        }}
        onOrderConfirmed={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });
        }}
      />

      {/* 8. Single Bot Delete Confirmation Modal */}
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

      {/* 9. Bulk Delete Confirmation Modal */}
      <BulkDeleteBotsModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        selectedBots={selectedBotsList}
        onConfirmBulkDelete={handleConfirmBulkDelete}
        isDeleting={isDeleting}
      />

      {/* 10. Bulk Start Confirmation Modal */}
      <BulkStartConfirmationModal
        isOpen={isBulkStartModalOpen}
        onClose={() => setIsBulkStartModalOpen(false)}
        bots={filteredBots}
        onConfirmStart={handleConfirmBulkStart}
      />

      {/* 11. Create Bot Wizard Modal */}
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
