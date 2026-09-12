"use client";

import React, { useState } from "react";
import { X, PieChart, AlertTriangle } from "lucide-react";
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

  const effectiveCloseQty = useCustomQty
    ? Math.min(totalQty, Math.max(0, customQty))
    : Math.round(totalQty * (percentage / 100) * 1000000) / 1000000;

  const remainingQty = Math.max(0, Math.round((totalQty - effectiveCloseQty) * 1000000) / 1000000);
  const pnlCalc = calculateUnrealizedPnl(entryP, currP, effectiveCloseQty, position.direction || "LONG");
  const estimatedPnl = pnlCalc.pnl;
  const isProfit = estimatedPnl >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 font-sans select-none">
      <div className="w-full max-w-md bg-[#0A1422] border border-[#1A2A3F] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-[#F7FAFC]">
        {/* Header */}
        <div className="p-5 border-b border-[#1A2A3F] flex items-center justify-between bg-[#07101A]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Scale Out / Partial Close</h2>
              <p className="text-xs text-[#52627A]">
                {position.symbol} • Total: {totalQty} units
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#52627A] hover:text-[#F7FAFC] hover:bg-[#101B2D] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 text-[#FF3B5C] text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Percentage Selector Buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-[#7C8CA3] uppercase">
                Select Exit Portion
              </label>
              <button
                type="button"
                onClick={() => setUseCustomQty(!useCustomQty)}
                className="text-xs text-[#19C5FF] hover:underline"
              >
                {useCustomQty ? "Use Percentage Chips" : "Specify Exact Quantity"}
              </button>
            </div>

            {!useCustomQty ? (
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setPercentage(pct)}
                    className={`py-2 rounded-lg font-semibold border transition ${
                      percentage === pct
                        ? "bg-[#2563EB] text-white border-[#2563EB] shadow-sm"
                        : "bg-[#0D1727] text-[#7C8CA3] border-[#1A2A3F] hover:bg-[#101B2D] hover:text-[#F7FAFC]"
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
                  className="w-full px-3.5 py-2 bg-[#0D1727] border border-[#1A2A3F] focus:border-[#2563EB] rounded-lg text-sm font-semibold tabular-nums text-[#F7FAFC] focus:outline-none transition"
                />
              </div>
            )}
          </div>

          {/* Sizing Breakdown Box */}
          <div className="p-4 rounded-lg bg-[#0D1727] border border-[#1A2A3F] space-y-2.5 text-xs shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[#52627A]">Closing Size:</span>
              <span className="font-semibold text-[#F7FAFC] tabular-nums">
                {effectiveCloseQty} units ({useCustomQty ? `${Math.round((effectiveCloseQty / totalQty) * 100)}%` : `${percentage}%`})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#52627A]">Remaining Position:</span>
              <span className="font-semibold text-[#F7FAFC] tabular-nums">
                {remainingQty} units
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[#122033] pt-2">
              <span className="text-[#52627A]">Estimated Realized P&L:</span>
              <span
                className={`font-bold tabular-nums text-sm ${
                  isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"
                }`}
              >
                {isProfit ? "+" : ""}${estimatedPnl.toFixed(2)}
              </span>
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
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending || effectiveCloseQty <= 0}
            className="px-5 py-2.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-black font-semibold text-xs shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
          >
            {closeMutation.isPending ? "Executing..." : `Confirm Scale Exit (${effectiveCloseQty} units)`}
          </button>
        </div>
      </div>
    </div>
  );
}
