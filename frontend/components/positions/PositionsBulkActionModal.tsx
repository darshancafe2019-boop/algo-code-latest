"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Shield, ArrowUpRight, XCircle, CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { BulkActionType, PositionRecord } from "@/types/positions";

interface PositionsBulkActionModalProps {
  action: BulkActionType | null;
  positions: PositionRecord[];
  executionMode: "PAPER" | "LIVE";
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function PositionsBulkActionModal({
  action,
  positions,
  executionMode,
  isOpen,
  onClose,
  onSuccess,
}: PositionsBulkActionModalProps) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLive = executionMode === "LIVE";
  const profitablePositions = positions.filter((p) => (p.unrealized_pnl || 0) > 0);

  const bulkMutation = useMutation({
    mutationFn: async () => {
      if (!action) return;
      const res = await apiClient.post("/api/positions/bulk-action", {
        action,
        mode: executionMode,
        source: "Positions Bulk Modal",
      }, { timeoutMs: 12000 });

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to execute bulk operation");
      }
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["authoritativePositions"] });
      queryClient.invalidateQueries({ queryKey: ["dockTrades"] });
      queryClient.invalidateQueries({ queryKey: ["performance"] });
      onSuccess(data?.message || `Bulk action '${action}' completed successfully.`);
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Bulk execution failed");
    },
  });

  if (!isOpen || !action) return null;

  let title = "Confirm Bulk Action";
  let description = "Execute batch operation across active positions.";
  let badgeColor = "text-[var(--theme-accent)] bg-[var(--theme-accent)]/15 border-[var(--theme-accent)]/30";
  let buttonColor = "bg-[var(--theme-accent)] text-[var(--theme-bg)]";
  let buttonLabel = "Execute Bulk Action";
  let targetCount = positions.length;

  if (action === "MOVE_TO_BREAKEVEN") {
    title = "Move All Stops to Breakeven";
    description = `Adjust stop loss orders to entry basis across all ${positions.length} open position(s) to eliminate downside market risk.`;
    badgeColor = "text-[var(--theme-accent)] bg-[var(--theme-accent)]/15 border-[var(--theme-accent)]/30";
    buttonColor = "bg-[var(--theme-accent)] text-[var(--theme-bg)]";
    buttonLabel = `Confirm Breakeven on ${positions.length} Pos`;
  } else if (action === "HARVEST_PROFITS") {
    title = "Harvest All Winning Positions";
    targetCount = profitablePositions.length;
    const totalProfits = profitablePositions.reduce((acc, p) => acc + (p.unrealized_pnl || 0), 0);
    description = `Lock in booked profits across ${profitablePositions.length} winning position(s) totaling +$${totalProfits.toFixed(2)} at market price.`;
    badgeColor = "text-[var(--theme-profit)] bg-[var(--theme-profit)]/15 border-[var(--theme-profit)]/30";
    buttonColor = "bg-[var(--theme-profit)] text-black font-extrabold";
    buttonLabel = `Harvest ${profitablePositions.length} Winning Pos`;
  } else if (action === "SQUARE_OFF_ALL") {
    title = "Emergency Flatten All Positions";
    description = `Immediately close and market square off all ${positions.length} active position(s) across the OMS portfolio.`;
    badgeColor = "text-[var(--theme-loss)] bg-[var(--theme-loss)]/15 border-[var(--theme-loss)]/30";
    buttonColor = "bg-[var(--theme-loss)] text-white font-extrabold";
    buttonLabel = `Flatten All ${positions.length} Positions`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 font-sans select-none">
      <div className="w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-[var(--theme-text-primary)]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-elevated)]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${badgeColor}`}>
              {action === "MOVE_TO_BREAKEVEN" ? (
                <Shield className="h-5 w-5" />
              ) : action === "HARVEST_PROFITS" ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold">{title}</h2>
              <span className="text-[10px] font-mono font-bold text-[var(--theme-text-muted)]">
                {isLive ? "LIVE OMS PORTFOLIO" : "PAPER SIMULATION"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 font-sans">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-[var(--theme-loss)]/10 border border-[var(--theme-loss)]/30 text-[var(--theme-loss)] text-xs flex items-center gap-2 font-mono">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed">
            {description}
          </p>

          <div className="p-4 rounded-3xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-2 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[var(--theme-text-muted)]">Target Positions:</span>
              <span className="font-extrabold text-[var(--theme-text-primary)]">
                {targetCount} position(s)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--theme-text-muted)]">Execution Pipeline:</span>
              <span className="font-bold text-[var(--theme-profit)]">ATOMIC QUEUE</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--theme-border)] bg-[var(--theme-elevated)] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface)] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => bulkMutation.mutate()}
            disabled={bulkMutation.isPending || targetCount === 0}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5 active:scale-95 ${buttonColor}`}
          >
            {bulkMutation.isPending ? "Executing..." : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
