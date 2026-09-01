"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PositionsCommandHeader } from "./PositionsCommandHeader";
import { PositionsKpiStrip } from "./PositionsKpiStrip";
import { PositionsFilterBar } from "./PositionsFilterBar";
import { PositionsCompactTable } from "./PositionsCompactTable";
import { PositionsCardGrid } from "./PositionsCardGrid";
import { PositionsPriceLadderMatrix } from "./PositionsPriceLadderMatrix";
import { PositionsRiskMatrix } from "./PositionsRiskMatrix";
import { PositionDetailDrawer } from "./PositionDetailDrawer";
import { ModifyProtectionModal } from "./ModifyProtectionModal";
import { PartialSquareOffModal } from "./PartialSquareOffModal";
import { PositionsBulkActionModal } from "./PositionsBulkActionModal";
import { PositionsEmptyState } from "./PositionsEmptyState";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { executeCommand } from "@/lib/commandClient";
import { useGlobalData } from "@/context/GlobalDataContext";
import {
  PositionRecord,
  PositionViewMode,
  PositionFilterCategory,
  PositionSortKey,
  BulkActionType,
  PositionsSummaryData,
} from "@/types/positions";

export function EcoPositionsView() {
  const queryClient = useQueryClient();
  const { tradingMode, refreshAll } = useGlobalData();

  // State
  const [viewMode, setViewMode] = useState<PositionViewMode>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PositionFilterCategory>("ALL");
  const [sortKey, setSortKey] = useState<PositionSortKey>("pnl_desc");
  const [selectedPosition, setSelectedPosition] = useState<PositionRecord | null>(null);
  const [modifyingPosition, setModifyingPosition] = useState<PositionRecord | null>(null);
  const [partialClosingPosition, setPartialClosingPosition] = useState<PositionRecord | null>(null);
  const [activeBulkAction, setActiveBulkAction] = useState<BulkActionType | null>(null);
  const [statusNotification, setStatusNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. Fetch Real Positions Telemetry & Summary
  const { data: positionsData, isLoading: isPositionsLoading, refetch: refetchPositions, isRefetching } = useQuery({
    queryKey: ["positions", tradingMode],
    queryFn: async () => {
      const res = await apiClient.get<{ status?: string; positions: PositionRecord[]; summary?: PositionsSummaryData }>(
        `/api/positions?mode=${tradingMode}`,
        { timeoutMs: 6000 }
      );
      if (!res.ok) return { positions: [], summary: {} };
      return res.data || { positions: [], summary: {} };
    },
    staleTime: 3000,
    refetchInterval: 5000,
    placeholderData: (prev) => prev,
  });

  // 2. Fetch System Status
  const { data: systemStatusData } = useQuery({
    queryKey: ["systemStatus"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/status", { timeoutMs: 5000 });
      if (!res.ok) return { trading_mode: tradingMode, system_summary: { kill_switch_active: false } };
      return res.data || { trading_mode: tradingMode, system_summary: { kill_switch_active: false } };
    },
    staleTime: 4000,
    refetchInterval: 6000,
    placeholderData: (prev) => prev,
  });

  // Reconcile Mutation
  const reconcileMutation = useMutation({
    mutationFn: async () => {
      return await executeCommand("RECONCILE_ACCOUNT", null, {}, queryClient);
    },
    onSuccess: (data) => {
      setStatusNotification({
        type: "success",
        text: data.message || "Account and positions reconciled successfully with broker OMS.",
      });
      setTimeout(() => setStatusNotification(null), 4000);
      refetchPositions();
      refreshAll();
    },
    onError: (err: any) => {
      setStatusNotification({ type: "error", text: `Reconciliation error: ${err.message}` });
      setTimeout(() => setStatusNotification(null), 4000);
    },
  });

  // Emergency Kill Switch Mutation
  const killSwitchMutation = useMutation({
    mutationFn: async () => {
      return await executeCommand("ACTIVATE_KILL_SWITCH", null, { reason: "Positions Emergency Halt" }, queryClient);
    },
    onSuccess: () => {
      setStatusNotification({
        type: "error",
        text: "EMERGENCY KILL SWITCH ACTIVATED. All bots halted and positions squared off.",
      });
      setTimeout(() => setStatusNotification(null), 6000);
      refetchPositions();
      refreshAll();
      queryClient.invalidateQueries({ queryKey: ["systemStatus"] });
    },
    onError: (err: any) => {
      setStatusNotification({ type: "error", text: `Kill switch trigger failed: ${err.message}` });
      setTimeout(() => setStatusNotification(null), 4000);
    },
  });

  // Move Single Position to Breakeven Mutation
  const moveBreakevenMutation = useMutation({
    mutationFn: async (position: PositionRecord) => {
      const entryP = Number(position.entry_price || 0);
      const res = await apiClient.post(`/api/positions/${position.id}/modify-protection`, {
        position_id: position.id,
        stop_loss: entryP,
        trailing_stop: entryP,
        source: "1-Click Breakeven Button",
      }, { timeoutMs: 8000 });

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to adjust stop loss to breakeven");
      }
      return res.data;
    },
    onSuccess: () => {
      setStatusNotification({
        type: "success",
        text: "Stop loss moved to Breakeven (Entry Price). Downside risk eliminated.",
      });
      setTimeout(() => setStatusNotification(null), 4000);
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["authoritativePositions"] });
    },
    onError: (err: any) => {
      setStatusNotification({ type: "error", text: `Breakeven adjustment failed: ${err.message}` });
      setTimeout(() => setStatusNotification(null), 4000);
    },
  });

  // Full Square Off Mutation
  const squareOffMutation = useMutation({
    mutationFn: async (positionId: number | string) => {
      const res = await apiClient.post(`/api/positions/${positionId}/square-off`, { source: "Positions Command Centre" }, { timeoutMs: 8000 });
      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to square off position");
      }
      return res.data;
    },
    onSuccess: (data: any) => {
      setStatusNotification({
        type: "success",
        text: data?.message || "Position successfully squared off at market price.",
      });
      setTimeout(() => setStatusNotification(null), 4000);
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["authoritativePositions"] });
      queryClient.invalidateQueries({ queryKey: ["dockTrades"] });
      queryClient.invalidateQueries({ queryKey: ["performance"] });
      refreshAll();
    },
    onError: (err: any) => {
      setStatusNotification({ type: "error", text: `Square off failed: ${err.message}` });
      setTimeout(() => setStatusNotification(null), 4000);
    },
  });

  const rawPositions: PositionRecord[] = useMemo(() => {
    return Array.isArray(positionsData?.positions) ? positionsData.positions : [];
  }, [positionsData]);
  const summary = positionsData?.summary || {};
  const executionMode = (systemStatusData?.trading_mode || tradingMode || "PAPER").toUpperCase() as "PAPER" | "LIVE";

  // Category counts
  const counts = useMemo(() => {
    let long = 0;
    let short = 0;
    let profit = 0;
    let loss = 0;
    for (const p of rawPositions) {
      const dir = (p.direction || p.side || "").toUpperCase();
      const pnlVal = p.unrealized_pnl || 0;
      if (dir === "LONG" || dir === "BUY") long++;
      if (dir === "SHORT" || dir === "SELL") short++;
      if (pnlVal > 0) profit++;
      if (pnlVal < 0) loss++;
    }
    return { all: rawPositions.length, long, short, profit, loss };
  }, [rawPositions]);

  // Filter & Search Logic
  const processedPositions = useMemo(() => {
    return rawPositions
      .filter((p) => {
        const dir = (p.direction || p.side || "").toUpperCase();
        const pnlVal = p.unrealized_pnl || 0;

        // Category Filter
        if (selectedCategory === "LONG" && dir !== "LONG" && dir !== "BUY") return false;
        if (selectedCategory === "SHORT" && dir !== "SHORT" && dir !== "SELL") return false;
        if (selectedCategory === "PROFIT" && pnlVal <= 0) return false;
        if (selectedCategory === "LOSS" && pnlVal >= 0) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchSymbol = p.symbol?.toLowerCase().includes(q);
          const matchStrategy = (p as any).strategy?.toLowerCase().includes(q);
          const matchBot = (p as any).bot_name?.toLowerCase().includes(q);
          if (!matchSymbol && !matchStrategy && !matchBot) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const pnlA = a.unrealized_pnl || 0;
        const pnlB = b.unrealized_pnl || 0;
        const sizeA = a.current_notional || a.notional_value || (Number(a.entry_price || 0) * Number(a.position_size || 0));
        const sizeB = b.current_notional || b.notional_value || (Number(b.entry_price || 0) * Number(b.position_size || 0));
        const riskA = a.planned_risk || 0;
        const riskB = b.planned_risk || 0;

        switch (sortKey) {
          case "pnl_desc":
            return pnlB - pnlA;
          case "pnl_asc":
            return pnlA - pnlB;
          case "size_desc":
            return sizeB - sizeA;
          case "risk_desc":
            return riskB - riskA;
          case "duration_desc":
            return (b.duration_seconds || 0) - (a.duration_seconds || 0);
          case "symbol_asc":
            return (a.symbol || "").localeCompare(b.symbol || "");
          default:
            return 0;
        }
      });
  }, [rawPositions, selectedCategory, searchQuery, sortKey]);

  const handleSquareOffConfirm = (pos: PositionRecord) => {
    if (window.confirm(`Are you sure you want to close position #${pos.id} (${pos.symbol} ${pos.side || pos.direction}) at market price?`)) {
      squareOffMutation.mutate(pos.id);
    }
  };

  const handleMoveBreakevenConfirm = (pos: PositionRecord) => {
    moveBreakevenMutation.mutate(pos);
  };

  const handleExportCsv = () => {
    try {
      const headers = ["ID", "Symbol", "Direction", "Entry Price", "Current Price", "Unrealized PnL", "Margin", "Leverage", "Stop Loss", "Take Profit"];
      const rows = processedPositions.map((p) => [
        p.id,
        p.symbol,
        p.direction || p.side,
        p.entry_price,
        p.current_price,
        p.unrealized_pnl,
        p.margin_used,
        p.leverage,
        p.stop_loss,
        p.take_profit,
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `positions_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {}
  };

  const handleExportJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(processedPositions, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `positions_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch {}
  };

  return (
    <div className="space-y-4 font-sans select-none text-[var(--theme-text-primary)] pb-12">
      {/* Toast Notification */}
      {statusNotification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border text-xs font-mono transition-all animate-bounce ${
            statusNotification.type === "success"
              ? "bg-[var(--theme-profit)]/15 border-[var(--theme-profit)] text-[var(--theme-profit)]"
              : "bg-[var(--theme-loss)]/15 border-[var(--theme-loss)] text-[var(--theme-loss)]"
          }`}
        >
          {statusNotification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{statusNotification.text}</span>
        </div>
      )}

      {/* 1. Command Header with Mode, Bulk & Controls */}
      <PositionsCommandHeader
        executionMode={executionMode}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={() => refetchPositions()}
        onReconcile={() => reconcileMutation.mutate()}
        onKillSwitch={() => killSwitchMutation.mutate()}
        onTriggerBulkAction={(act) => setActiveBulkAction(act)}
        isRefreshing={isRefetching}
        isReconciling={reconcileMutation.isPending}
        openPositionsCount={rawPositions.length}
        profitableCount={counts.profit}
      />

      {/* 2. Institutional KPI Strip */}
      <PositionsKpiStrip
        summary={summary}
        isLoading={isPositionsLoading}
      />

      {/* 3. Filter Bar & View Mode Selector */}
      <PositionsFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        sortKey={sortKey}
        onSortChange={setSortKey}
        counts={counts}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
      />

      {/* 4. Main Body: Table / Cards / Ladder / Risk Matrix or Empty State */}
      {isPositionsLoading && rawPositions.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 border border-[var(--theme-border)] rounded-3xl bg-[var(--theme-surface)]/90 font-mono text-xs text-[var(--theme-text-muted)]">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--theme-accent)] border-t-transparent animate-spin" />
          <span>Synchronizing live OMS position books...</span>
        </div>
      ) : rawPositions.length === 0 ? (
        <PositionsEmptyState executionMode={executionMode} />
      ) : processedPositions.length === 0 ? (
        <div className="p-12 text-center border border-[var(--theme-border)] rounded-3xl bg-[var(--theme-surface)]/90 space-y-2 font-mono text-xs">
          <p className="text-[var(--theme-text-secondary)]">No positions matched your search or active filter.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("ALL");
            }}
            className="text-[var(--theme-accent)] font-bold hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "table" ? (
        <PositionsCompactTable
          positions={processedPositions}
          onSelectPosition={setSelectedPosition}
          onModifyProtection={setModifyingPosition}
          onSquareOff={handleSquareOffConfirm}
          onPartialClose={setPartialClosingPosition}
          onMoveToBreakeven={handleMoveBreakevenConfirm}
        />
      ) : viewMode === "cards" ? (
        <PositionsCardGrid
          positions={processedPositions}
          onSelectPosition={setSelectedPosition}
          onModifyProtection={setModifyingPosition}
          onSquareOff={handleSquareOffConfirm}
          onPartialClose={setPartialClosingPosition}
          onMoveToBreakeven={handleMoveBreakevenConfirm}
        />
      ) : viewMode === "ladder" ? (
        <PositionsPriceLadderMatrix
          positions={processedPositions}
          onSelectPosition={setSelectedPosition}
          onModifyProtection={setModifyingPosition}
          onSquareOff={handleSquareOffConfirm}
          onMoveToBreakeven={handleMoveBreakevenConfirm}
        />
      ) : (
        <PositionsRiskMatrix
          positions={processedPositions}
          onSelectPosition={setSelectedPosition}
          onModifyProtection={setModifyingPosition}
          onSquareOff={handleSquareOffConfirm}
        />
      )}

      {/* 5. Position Detail Slide-out Drawer */}
      <PositionDetailDrawer
        position={selectedPosition}
        onClose={() => setSelectedPosition(null)}
        onModifyProtection={(pos) => {
          setSelectedPosition(null);
          setModifyingPosition(pos);
        }}
        onPartialClose={(pos) => {
          setSelectedPosition(null);
          setPartialClosingPosition(pos);
        }}
        onSquareOff={(pos) => {
          setSelectedPosition(null);
          handleSquareOffConfirm(pos);
        }}
        onMoveToBreakeven={(pos) => {
          handleMoveBreakevenConfirm(pos);
        }}
      />

      {/* 6. Modify Protection Modal */}
      <ModifyProtectionModal
        position={modifyingPosition}
        isOpen={Boolean(modifyingPosition)}
        onClose={() => setModifyingPosition(null)}
      />

      {/* 7. Partial Square Off Modal */}
      <PartialSquareOffModal
        position={partialClosingPosition}
        isOpen={Boolean(partialClosingPosition)}
        onClose={() => setPartialClosingPosition(null)}
      />

      {/* 8. Bulk Action Confirmation Modal */}
      <PositionsBulkActionModal
        action={activeBulkAction}
        positions={rawPositions}
        executionMode={executionMode}
        isOpen={Boolean(activeBulkAction)}
        onClose={() => setActiveBulkAction(null)}
        onSuccess={(msg) => {
          setStatusNotification({ type: "success", text: msg });
          setTimeout(() => setStatusNotification(null), 4000);
        }}
      />
    </div>
  );
}
