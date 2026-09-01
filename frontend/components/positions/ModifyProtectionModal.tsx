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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150 font-sans select-none">
      <div className="w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-[var(--theme-text-primary)]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-elevated)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Modify Protection Limits</h2>
              <p className="text-xs text-[var(--theme-text-secondary)] font-mono">
                {position.symbol} • {isLong ? "LONG" : "SHORT"} {position.leverage || 5}x
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

          {/* Entry & Mark Reference Strip */}
          <div className="p-3 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-[10px] text-[var(--theme-text-muted)] block">ENTRY BASIS</span>
              <span className="font-bold text-[var(--theme-text-primary)] tabular-nums">
                ${entryP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[var(--theme-text-muted)] block">CURRENT MARK</span>
              <span className="font-bold text-[var(--theme-accent)] tabular-nums">
                ${currP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* 1. Stop Loss Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-[var(--theme-loss)] flex items-center gap-1.5 font-mono">
                <Shield className="h-3.5 w-3.5" /> Stop Loss ($)
              </label>
              <span className="text-[10px] font-mono text-[var(--theme-loss)]">
                -{metrics.slDistancePct}% (${metrics.plannedRisk.toFixed(2)} Risk)
              </span>
            </div>
            <input
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] focus:border-[var(--theme-loss)] rounded-2xl text-sm font-mono font-bold text-[var(--theme-text-primary)] focus:outline-none transition"
            />
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono flex-wrap">
              <button
                type="button"
                onClick={handleSetBreakeven}
                className="px-2 py-0.5 rounded-lg bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/25 border border-[var(--theme-accent)]/30 font-bold transition"
              >
                Breakeven
              </button>
              <span className="text-[var(--theme-text-muted)]">Presets:</span>
              {[1.0, 1.5, 2.0, 3.0, 5.0].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleApplyPreset("SL", pct)}
                  className="px-2 py-0.5 rounded-lg bg-[var(--theme-elevated)] hover:bg-[var(--theme-loss)]/20 text-[var(--theme-text-secondary)] hover:text-[var(--theme-loss)] border border-[var(--theme-border-subtle)] transition"
                >
                  -{pct}%
                </button>
              ))}
            </div>
          </div>

          {/* 2. Take Profit Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-[var(--theme-profit)] flex items-center gap-1.5 font-mono">
                <Target className="h-3.5 w-3.5" /> Take Profit ($)
              </label>
              <span className="text-[10px] font-mono text-[var(--theme-profit)]">
                +{metrics.tpDistancePct}% (${metrics.plannedReward.toFixed(2)} Reward)
              </span>
            </div>
            <input
              type="number"
              step="any"
              value={takeProfit}
              onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] focus:border-[var(--theme-profit)] rounded-2xl text-sm font-mono font-bold text-[var(--theme-text-primary)] focus:outline-none transition"
            />
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono flex-wrap">
              <span className="text-[var(--theme-text-muted)]">Presets:</span>
              {[2.0, 3.0, 4.0, 6.0, 8.0].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleApplyPreset("TP", pct)}
                  className="px-2 py-0.5 rounded-lg bg-[var(--theme-elevated)] hover:bg-[var(--theme-profit)]/20 text-[var(--theme-text-secondary)] hover:text-[var(--theme-profit)] border border-[var(--theme-border-subtle)] transition"
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>

          {/* 3. Risk / Reward Assessment Box */}
          <div className="p-3.5 bg-[var(--theme-elevated)]/60 border border-[var(--theme-border-subtle)] rounded-2xl text-xs font-mono flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[var(--theme-text-muted)] block">Planned R:R Ratio</span>
              <span className="font-black text-sm text-[var(--theme-accent)]">1 : {metrics.riskRewardRatio}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[var(--theme-text-muted)] block">Pre-Trade Risk Gate</span>
              <span className="text-[var(--theme-profit)] font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Within Tolerance
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
            onClick={() => modifyMutation.mutate()}
            disabled={modifyMutation.isPending}
            className="px-5 py-2.5 rounded-2xl bg-[var(--theme-accent)] text-[var(--theme-bg)] font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
          >
            {modifyMutation.isPending ? "Updating Limits..." : "Apply Protection"}
          </button>
        </div>
      </div>
    </div>
  );
}
