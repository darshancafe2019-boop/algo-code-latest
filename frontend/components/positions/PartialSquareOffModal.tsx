"use client";

import React, { useState } from "react";
import { X, PieChart, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { PositionRecord, calculateUnrealizedPnl } from "@/types/positions";

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
  const [customQty, setCustomQty] = useState<number>(0);
  const [useCustomQty, setUseCustomQty] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalQty = Number(position?.position_size || position?.quantity || 0.1);

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!position) return;
      const payload = useCustomQty
        ? { position_id: position.id, quantity: Number(customQty), source: "Partial Close Modal" }
        : { position_id: position.id, percentage: Number(percentage), source: "Partial Close Modal" };

      const res = await apiClient.post(`/api/positions/${position.id}/partial-close`, payload, { timeoutMs: 8000 });
      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to execute partial close");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["authoritativePositions"] });
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
  const isLong = (position.direction || position.side || "LONG").toUpperCase().includes("LONG") || (position.direction || position.side || "LONG").toUpperCase().includes("BUY");

  const effectiveCloseQty = useCustomQty
    ? Math.min(totalQty, Math.max(0, customQty))
    : Math.round(totalQty * (percentage / 100) * 1000000) / 1000000;

  const remainingQty = Math.max(0, Math.round((totalQty - effectiveCloseQty) * 1000000) / 1000000);
  const pnlCalc = calculateUnrealizedPnl(entryP, currP, effectiveCloseQty, position.direction || "LONG");
  const estimatedPnl = pnlCalc.pnl;
  const isProfit = estimatedPnl >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150 font-sans select-none">
      <div className="w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-[var(--theme-text-primary)]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-elevated)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--theme-warning)]/15 text-[var(--theme-warning)] border border-[var(--theme-warning)]/30">
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
            <div className="p-3 rounded-2xl bg-[var(--theme-loss)]/10 border border-[var(--theme-loss)]/30 text-[var(--theme-loss)] text-xs flex items-center gap-2 font-mono">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Percentage Selector Buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <label className="font-bold text-[var(--theme-text-secondary)] uppercase tracking-wider">
                Select Exit Portion
              </label>
              <button
                type="button"
                onClick={() => setUseCustomQty(!useCustomQty)}
                className="text-[10px] text-[var(--theme-accent)] hover:underline"
              >
                {useCustomQty ? "Use Percentage Chips" : "Specify Exact Quantity"}
              </button>
            </div>

            {!useCustomQty ? (
              <div className="grid grid-cols-4 gap-2 font-mono text-xs">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setPercentage(pct)}
                    className={`py-2.5 rounded-2xl font-bold border transition ${
                      percentage === pct
                        ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] border-[var(--theme-accent)] shadow-md shadow-[var(--theme-accent)]/20"
                        : "bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] border-[var(--theme-border-subtle)] hover:bg-[var(--theme-surface)]"
                    }`}
                  >
                    {pct}% {pct === 100 ? "MAX" : ""}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <input
                  type="number"
                  step="any"
                  max={totalQty}
                  min={0.000001}
                  value={customQty}
                  onChange={(e) => setCustomQty(parseFloat(e.target.value) || 0)}
                  placeholder={`Max: ${totalQty}`}
                  className="w-full px-3.5 py-2 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] focus:border-[var(--theme-accent)] rounded-2xl text-sm font-mono font-bold text-[var(--theme-text-primary)] focus:outline-none transition"
                />
              </div>
            )}
          </div>

          {/* Sizing Breakdown Box */}
          <div className="p-4 rounded-3xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-2.5 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[var(--theme-text-muted)]">Closing Size:</span>
              <span className="font-extrabold text-[var(--theme-text-primary)] tabular-nums">
                {effectiveCloseQty} units ({useCustomQty ? `${Math.round((effectiveCloseQty / totalQty) * 100)}%` : `${percentage}%`})
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
                className={`font-black tabular-nums text-sm ${
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
            disabled={closeMutation.isPending || effectiveCloseQty <= 0}
            className="px-5 py-2.5 rounded-2xl bg-[var(--theme-warning)] text-black font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
          >
            {closeMutation.isPending ? "Executing..." : `Confirm Scale Exit (${effectiveCloseQty} units)`}
          </button>
        </div>
      </div>
    </div>
  );
}
