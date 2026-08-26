"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldAlert, Check, Sliders, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface EditableRiskLimitItem {
  key: string;
  name: string;
  currentValue: number;
  unit: string;
  minAllowed: number;
  maxAllowed: number;
  step: number;
  description: string;
  isCritical: boolean;
}

interface RiskLimitEditDrawerProps {
  isOpen: boolean;
  limitItem: EditableRiskLimitItem | null;
  onClose: () => void;
}

export function RiskLimitEditDrawer({
  isOpen,
  limitItem,
  onClose,
}: RiskLimitEditDrawerProps) {
  const queryClient = useQueryClient();
  const [val, setVal] = useState<number>(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (limitItem) {
      setVal(limitItem.currentValue);
      setShowConfirm(false);
      setSaveError(null);
    }
  }, [limitItem]);

  const updateMutation = useMutation({
    mutationFn: async (newValue: number) => {
      if (!limitItem) return;
      const payload: Record<string, number> = {};
      payload[limitItem.key] = newValue;

      const res = await fetch("/api/risk/limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to update risk limit.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riskOverview"] });
      queryClient.invalidateQueries({ queryKey: ["riskLimits"] });
      onClose();
    },
    onError: (err: any) => {
      setSaveError(err.message || "Failed to update risk limit on server.");
    },
  });

  if (!isOpen || !limitItem) return null;

  const isValueElevated = limitItem.isCritical && val > limitItem.maxAllowed * 0.7;

  const handleSaveClick = () => {
    if (limitItem.isCritical && isValueElevated && !showConfirm) {
      setShowConfirm(true);
      return;
    }
    updateMutation.mutate(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn select-none font-sans">
      <div className="w-full max-w-md bg-[var(--theme-surface)] border-l border-[var(--theme-border)] h-full p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)]">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--theme-text-primary)]">
                  Edit Risk Threshold
                </h3>
                <p className="text-xs text-[var(--theme-text-secondary)]">
                  {limitItem.name}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed">
            {limitItem.description}
          </p>

          {/* Value Slider & Input */}
          <div className="p-4 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
                Configured Limit
              </span>
              <div className="text-xl font-bold font-mono text-[var(--theme-accent)]">
                {val} {limitItem.unit}
              </div>
            </div>

            <input
              type="range"
              min={limitItem.minAllowed}
              max={limitItem.maxAllowed}
              step={limitItem.step}
              value={val}
              onChange={(e) => {
                setVal(parseFloat(e.target.value));
                setShowConfirm(false);
              }}
              className="w-full h-2 bg-[var(--theme-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-accent)]"
            />

            <div className="flex justify-between text-[10px] font-mono text-[var(--theme-text-muted)]">
              <span>Min: {limitItem.minAllowed} {limitItem.unit}</span>
              <span>Max: {limitItem.maxAllowed} {limitItem.unit}</span>
            </div>
          </div>

          {/* Elevated Risk Warning */}
          {isValueElevated && (
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                <strong>Caution:</strong> Elevating critical risk thresholds increases drawdown exposure. Confirm this aligns with your quantitative mandate.
              </p>
            </div>
          )}

          {/* Error Banner */}
          {saveError && (
            <div className="p-3 rounded-xl bg-[var(--theme-loss)]/15 border border-[var(--theme-loss)]/30 text-[var(--theme-loss)] text-xs font-mono">
              {saveError}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle)]">
          {showConfirm ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-amber-300">
                Confirm updating critical risk threshold to {val} {limitItem.unit}?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-border)] text-xs font-bold font-mono text-[var(--theme-text-secondary)] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateMutation.mutate(val)}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold font-mono transition"
                >
                  {updateMutation.isPending ? "Saving..." : "Yes, Update Limit"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-border)] text-xs font-bold font-mono text-[var(--theme-text-secondary)] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClick}
                disabled={updateMutation.isPending}
                className="px-4 py-2.5 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/90 text-white text-xs font-bold font-mono transition shadow-lg shadow-[var(--theme-accent)]/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>{updateMutation.isPending ? "Saving..." : "Save Limit"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
