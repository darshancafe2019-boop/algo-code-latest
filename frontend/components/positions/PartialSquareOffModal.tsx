"use client";

import React, { useState } from "react";
import { X, PieChart, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PositionRecord } from "./PositionsCompactTable";

interface PartialSquareOffModalProps {
  position: PositionRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PartialSquareOffModal({
  position,
  isOpen,
  onClose,
}: PartialSquareOffModalProps) {
  const queryClient = useQueryClient();
  const [percentage, setPercentage] = useState<number>(50);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!position) return;
      const res = await fetch(`/api/positions/${position.id}/partial-close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position_id: position.id,
          percentage: Number(percentage),
          source: "Partial Close Modal",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to execute partial close");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["performance"] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "An error occurred during partial exit");
    },
  });

  if (!isOpen || !position) return null;

  const entryP = Number(position.entry_price || 0);
  const currP = Number(position.current_price || position.mark_price || entryP);
  const totalQty = Number(position.position_size || position.quantity || 0.1);
  const isLong = position.direction.includes("LONG") || position.direction.includes("BUY");

  const closeQty = Math.round(totalQty * (percentage / 100) * 1000000) / 1000000;
  const remainingQty = Math.max(0, Math.round((totalQty - closeQty) * 1000000) / 1000000);
  const estimatedPnl = isLong ? (currP - entryP) * closeQty : (entryP - currP) * closeQty;
  const isProfit = estimatedPnl >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 font-sans select-none">
      <div className="w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-[var(--theme-text-primary)]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-elevated)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--theme-warning)]/15 text-[var(--theme-warning)] border border-[var(--theme-warning)]/30">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Scale Out / Partial Close</h2>
              <p className="text-xs text-[var(--theme-text-secondary)] font-mono">
                {position.symbol} • Total: {totalQty} units
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-[var(--theme-loss)]/10 border border-[var(--theme-loss)]/30 text-[var(--theme-loss)] text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Percentage Selector Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--theme-text-secondary)] uppercase tracking-wider font-mono">
              Select Exit Portion
            </label>
            <div className="grid grid-cols-4 gap-2 font-mono text-xs">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPercentage(pct)}
                  className={`py-2.5 rounded-xl font-bold border transition ${
                    percentage === pct
                      ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] border-[var(--theme-accent)] shadow-sm"
                      : "bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] border-[var(--theme-border-subtle)] hover:bg-[var(--theme-surface)]"
                  }`}
                >
                  {pct}% {pct === 100 ? "MAX" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Sizing Breakdown Box */}
          <div className="p-4 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--theme-text-muted)]">Closing Size:</span>
              <span className="font-bold text-[var(--theme-text-primary)] tabular-nums">
                {closeQty} units ({percentage}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--theme-text-muted)]">Remaining Position:</span>
              <span className="font-bold text-[var(--theme-text-primary)] tabular-nums">
                {remainingQty} units
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--theme-border-subtle)] pt-2">
              <span className="text-[var(--theme-text-muted)]">Estimated Realized P&L:</span>
              <span
                className={`font-extrabold tabular-nums ${
                  isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
                }`}
              >
                {isProfit ? "+" : ""}${estimatedPnl.toFixed(2)}
              </span>
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
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending}
            className="px-5 py-2 rounded-xl bg-[var(--theme-warning)] text-black font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {closeMutation.isPending ? "Executing..." : `Confirm ${percentage}% Exit`}
          </button>
        </div>
      </div>
    </div>
  );
}
