"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Shield, ArrowUpRight, XCircle } from "lucide-react";
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
  let badgeColor = "text-[#19C5FF] bg-[#2563EB]/15 border-[#2563EB]/30";
  let buttonColor = "bg-[#2563EB] hover:bg-[#3B82F6] text-white font-semibold";
  let buttonLabel = "Execute Bulk Action";
  let targetCount = positions.length;

  if (action === "MOVE_TO_BREAKEVEN") {
    title = "Move All Stops to Breakeven";
    description = `Adjust stop loss orders to entry basis across all ${positions.length} open position(s) to eliminate downside market risk.`;
    badgeColor = "text-[#19C5FF] bg-[#2563EB]/15 border-[#2563EB]/30";
    buttonColor = "bg-[#2563EB] hover:bg-[#3B82F6] text-white font-semibold";
    buttonLabel = `Confirm Breakeven on ${positions.length} Pos`;
  } else if (action === "HARVEST_PROFITS") {
    title = "Harvest All Winning Positions";
    targetCount = profitablePositions.length;
    const totalProfits = profitablePositions.reduce((acc, p) => acc + (p.unrealized_pnl || 0), 0);
    description = `Lock in booked profits across ${profitablePositions.length} winning position(s) totaling +$${totalProfits.toFixed(2)} at market price.`;
    badgeColor = "text-[#00E890] bg-[#00E890]/15 border-[#00E890]/30";
    buttonColor = "bg-[#00E890] hover:bg-[#16A34A] text-black font-semibold";
    buttonLabel = `Harvest ${profitablePositions.length} Winning Pos`;
  } else if (action === "SQUARE_OFF_ALL") {
    title = "Emergency Flatten All Positions";
    description = `Immediately close and market square off all ${positions.length} active position(s) across the OMS portfolio.`;
    badgeColor = "text-[#FF3B5C] bg-[#FF3B5C]/15 border-[#FF3B5C]/30";
    buttonColor = "bg-[#FF3B5C] hover:bg-[#DC2626] text-white font-semibold";
    buttonLabel = `Flatten All ${positions.length} Positions`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 font-sans select-none">
      <div className="w-full max-w-md bg-[#0A1422] border border-[#1A2A3F] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-[#F7FAFC]">
        {/* Header */}
        <div className="p-5 border-b border-[#1A2A3F] flex items-center justify-between bg-[#07101A]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${badgeColor}`}>
              {action === "MOVE_TO_BREAKEVEN" ? (
                <Shield className="h-5 w-5" />
              ) : action === "HARVEST_PROFITS" ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold">{title}</h2>
              <span className="text-[10px] font-semibold text-[#52627A]">
                {isLive ? "LIVE OMS PORTFOLIO" : "PAPER SIMULATION"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#52627A] hover:text-[#F7FAFC] hover:bg-[#101B2D] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 font-sans">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 text-[#FF3B5C] text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="text-xs text-[#7C8CA3] leading-relaxed">
            {description}
          </p>

          <div className="p-4 rounded-lg bg-[#0D1727] border border-[#1A2A3F] space-y-2 text-xs shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[#52627A]">Target Positions:</span>
              <span className="font-semibold text-[#F7FAFC] tabular-nums">
                {targetCount} position(s)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#52627A]">Execution Pipeline:</span>
              <span className="font-semibold text-[#00E890]">ATOMIC QUEUE</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#1A2A3F] bg-[#07101A] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[#7C8CA3] hover:bg-[#101B2D] hover:text-[#F7FAFC] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => bulkMutation.mutate()}
            disabled={bulkMutation.isPending || targetCount === 0}
            className={`px-5 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 active:scale-95 ${buttonColor}`}
          >
            {bulkMutation.isPending ? "Executing..." : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
