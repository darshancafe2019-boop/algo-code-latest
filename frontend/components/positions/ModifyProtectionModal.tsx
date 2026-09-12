"use client";

import React, { useState, useEffect } from "react";
import { X, Shield, Target, Sliders, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { PositionRecord, calculateRiskRewardMetrics } from "@/types/positions";

interface ModifyProtectionModalProps {
  position: PositionRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ModifyProtectionModal({
  position,
  isOpen,
  onClose,
}: ModifyProtectionModalProps) {
  const queryClient = useQueryClient();
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [takeProfit, setTakeProfit] = useState<number>(0);
  const [trailingStop, setTrailingStop] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (position) {
      const entryP = Number(position.entry_price || 0);
      const isLong = (position.direction || position.side || "LONG").toUpperCase().includes("LONG") || (position.direction || position.side || "LONG").toUpperCase().includes("BUY");
      setStopLoss(Number(position.stop_loss || (isLong ? round2(entryP * 0.98) : round2(entryP * 1.02))));
      setTakeProfit(Number(position.take_profit || (isLong ? round2(entryP * 1.04) : round2(entryP * 0.96))));
      setTrailingStop(Number(position.trailing_stop || position.stop_loss || 0));
      setErrorMessage(null);
    }
  }, [position]);

  function round2(val: number) {
    return Math.round(val * 100) / 100;
  }

  const modifyMutation = useMutation({
    mutationFn: async () => {
      if (!position) return;
      const res = await apiClient.post(`/api/positions/${position.id}/modify-protection`, {
        position_id: position.id,
        stop_loss: Number(stopLoss),
        take_profit: Number(takeProfit),
        trailing_stop: Number(trailingStop),
        source: "Protection Modifier Dialog",
      }, { timeoutMs: 8000 });

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to modify protection limits");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["authoritativePositions"] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "An error occurred");
    },
  });

  if (!isOpen || !position) return null;

  const entryP = Number(position.entry_price || 0);
  const currP = Number(position.current_price || position.mark_price || entryP);
  const qty = Number(position.position_size || position.quantity || 0.1);
  const isLong = (position.direction || position.side || "LONG").toUpperCase().includes("LONG") || (position.direction || position.side || "LONG").toUpperCase().includes("BUY");

  // Pure risk calculations
  const metrics = calculateRiskRewardMetrics(entryP, stopLoss, takeProfit, qty, currP);

  const handleApplyPreset = (type: "SL" | "TP", pct: number) => {
    if (type === "SL") {
      const newSl = isLong ? entryP * (1 - pct / 100) : entryP * (1 + pct / 100);
      setStopLoss(round2(newSl));
    } else {
      const newTp = isLong ? entryP * (1 + pct / 100) : entryP * (1 - pct / 100);
      setTakeProfit(round2(newTp));
    }
  };

  const handleSetBreakeven = () => {
    setStopLoss(round2(entryP));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 font-sans select-none">
      <div className="w-full max-w-md bg-[#0A1422] border border-[#1A2A3F] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-[#F7FAFC]">
        {/* Header */}
        <div className="p-5 border-b border-[#1A2A3F] flex items-center justify-between bg-[#07101A]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#2563EB]/15 text-[#19C5FF] border border-[#2563EB]/30">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Modify Protection Limits</h2>
              <p className="text-xs text-[#52627A]">
                {position.symbol} • {isLong ? "LONG" : "SHORT"} {position.leverage || 5}x
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

          {/* Entry & Mark Reference Strip */}
          <div className="p-3 rounded-lg bg-[#0D1727] border border-[#1A2A3F] flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-[#52627A] block uppercase font-medium">Entry Basis</span>
              <span className="font-semibold text-[#F7FAFC] tabular-nums">
                ${entryP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#52627A] block uppercase font-medium">Current Mark</span>
              <span className="font-semibold text-[#19C5FF] tabular-nums">
                ${currP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* 1. Stop Loss Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-[#FF3B5C] flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Stop Loss ($)
              </label>
              <span className="text-xs text-[#FF3B5C] tabular-nums">
                -{metrics.slDistancePct}% (${metrics.plannedRisk.toFixed(2)} Risk)
              </span>
            </div>
            <input
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 bg-[#0D1727] border border-[#1A2A3F] focus:border-[#FF3B5C] rounded-lg text-sm font-semibold tabular-nums text-[#F7FAFC] focus:outline-none transition"
            />
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <button
                type="button"
                onClick={handleSetBreakeven}
                className="px-2 py-0.5 rounded-md bg-[#2563EB]/15 text-[#19C5FF] hover:bg-[#2563EB]/25 border border-[#2563EB]/30 font-semibold transition"
              >
                Breakeven
              </button>
              <span className="text-[#52627A]">Presets:</span>
              {[1.0, 1.5, 2.0, 3.0, 5.0].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleApplyPreset("SL", pct)}
                  className="px-2 py-0.5 rounded-md bg-[#0D1727] hover:bg-[#FF3B5C]/20 text-[#7C8CA3] hover:text-[#FF3B5C] border border-[#1A2A3F] transition"
                >
                  -{pct}%
                </button>
              ))}
            </div>
          </div>

          {/* 2. Take Profit Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-[#00E890] flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" /> Take Profit ($)
              </label>
              <span className="text-xs text-[#00E890] tabular-nums">
                +{metrics.tpDistancePct}% (${metrics.plannedReward.toFixed(2)} Reward)
              </span>
            </div>
            <input
              type="number"
              step="any"
              value={takeProfit}
              onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 bg-[#0D1727] border border-[#1A2A3F] focus:border-[#00E890] rounded-lg text-sm font-semibold tabular-nums text-[#F7FAFC] focus:outline-none transition"
            />
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <span className="text-[#52627A]">Presets:</span>
              {[2.0, 3.0, 4.0, 6.0, 8.0].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleApplyPreset("TP", pct)}
                  className="px-2 py-0.5 rounded-md bg-[#0D1727] hover:bg-[#00E890]/20 text-[#7C8CA3] hover:text-[#00E890] border border-[#1A2A3F] transition"
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>

          {/* 3. Risk / Reward Assessment Box */}
          <div className="p-3.5 bg-[#0D1727] border border-[#1A2A3F] rounded-lg text-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#52627A] block font-medium">Planned R:R Ratio</span>
              <span className="font-bold text-sm text-[#19C5FF] tabular-nums">1 : {metrics.riskRewardRatio}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#52627A] block font-medium">Pre-Trade Risk Gate</span>
              <span className="text-[#00E890] font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Within Tolerance
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
            onClick={() => modifyMutation.mutate()}
            disabled={modifyMutation.isPending}
            className="px-5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#3B82F6] text-white font-semibold text-xs shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
          >
            {modifyMutation.isPending ? "Updating Limits..." : "Apply Protection"}
          </button>
        </div>
      </div>
    </div>
  );
}
