"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Cpu,
  RefreshCw,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
} from "lucide-react";
import { AIDecisionSignal, AIStatusResponse } from "@/types/intelligence";
import { apiClient } from "@/lib/apiClient";

interface AIMLopsControlCardProps {
  aiSignal: AIDecisionSignal | null;
  aiStatus: AIStatusResponse | null;
  onRefresh: () => void;
}

export function AIMLopsControlCard({
  aiSignal,
  aiStatus,
  onRefresh,
}: AIMLopsControlCardProps) {
  const queryClient = useQueryClient();
  const [confidenceSlider, setConfidenceSlider] = useState<number>(
    (aiStatus?.confidence_threshold || 0.75) * 100
  );
  const [isRetraining, setIsRetraining] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // 1. Enable / Disable / Auto-Execution Mutation
  const toggleExecutionMutation = useMutation({
    mutationFn: async (autoExecute: boolean) => {
      const res = await apiClient.post<any>("/api/ai/enable", {
        auto_execute: autoExecute,
        confidence_threshold: confidenceSlider / 100.0,
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to update AI settings");
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["aiStatus"] });
      queryClient.invalidateQueries({ queryKey: ["aiSignal"] });
      setActionFeedback(
        data.auto_execute_paper
          ? "AUTO PAPER Execution Armed"
          : "Switched to Safe Observation (Manual Mode)"
      );
      setTimeout(() => setActionFeedback(null), 3000);
    },
  });

  // 2. Rollback Model Mutation
  const rollbackMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<any>("/api/ai/rollback", {});
      if (!res.ok) throw new Error(res.error?.message || "Rollback failed");
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["aiStatus"] });
      queryClient.invalidateQueries({ queryKey: ["aiSignal"] });
      queryClient.invalidateQueries({ queryKey: ["aiModels"] });
      setActionFeedback(`Model rolled back to ${data.active_version}`);
      setTimeout(() => setActionFeedback(null), 4000);
    },
  });

  // 3. Train Model Background Mutation
  const trainMutation = useMutation({
    mutationFn: async () => {
      setIsRetraining(true);
      const res = await apiClient.post<any>("/api/ai/train", {
        symbol: aiStatus?.active_symbol || "BTC/USDT",
        timeframe: aiStatus?.active_timeframe || "5m",
        trials: 10,
      });
      if (!res.ok) throw new Error(res.error?.message || "Training dispatch failed");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aiStatus"] });
      setActionFeedback("Walk-forward training started in background...");
      setTimeout(() => setIsRetraining(false), 5000);
    },
    onError: (err: any) => {
      setIsRetraining(false);
      setActionFeedback(`Training error: ${err.message}`);
    },
  });

  const isLong = aiSignal?.decision === "LONG";
  const isShort = aiSignal?.decision === "SHORT";
  const isHold = !isLong && !isShort;

  return (
    <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border-subtle)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/40 text-[var(--theme-accent)]">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--theme-text-primary)]">
                AI Intelligence Model Ensemble
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {aiStatus?.active_model_version || "ai-ensemble-1.0.0"}
              </span>
            </div>
            <p className="text-[11px] text-[var(--theme-text-secondary)]">
              LightGBM Primary + XGBoost Confirmation + SHAP Explainability
            </p>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => trainMutation.mutate()}
            disabled={isRetraining || trainMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border)] text-xs font-mono transition-all"
            title="Train model on latest walk-forward folds"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRetraining ? "animate-spin text-[var(--theme-accent)]" : ""}`} />
            <span className="hidden sm:inline">Retrain Model</span>
          </button>

          <button
            onClick={() => rollbackMutation.mutate()}
            disabled={rollbackMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-amber-400 border border-amber-500/30 text-xs font-mono transition-all"
            title="Rollback to previous champion checkpoint"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Rollback</span>
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Model Probability Breakdown & Agreement */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. LightGBM Probability */}
        <div className="p-3 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] rounded-xl space-y-1.5">
          <div className="flex justify-between items-center text-[11px] font-mono text-[var(--theme-text-secondary)]">
            <span>LightGBM Signal</span>
            <span className="font-bold text-[var(--theme-accent)]">
              {((aiSignal?.lightgbmProbability || 0.33) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-[var(--theme-bg)] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isLong
                  ? "bg-[var(--theme-profit)]"
                  : isShort
                  ? "bg-[var(--theme-loss)]"
                  : "bg-slate-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(10, (aiSignal?.lightgbmProbability || 0.33) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[var(--theme-text-muted)] font-mono">
            <span>Base Tree</span>
            <span>Horizon: {aiSignal?.predictionHorizonBars || 5} bars</span>
          </div>
        </div>

        {/* 2. XGBoost Confirmation */}
        <div className="p-3 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] rounded-xl space-y-1.5">
          <div className="flex justify-between items-center text-[11px] font-mono text-[var(--theme-text-secondary)]">
            <span>XGBoost Confirm</span>
            <span className="font-bold text-[var(--theme-info)]">
              {((aiSignal?.xgboostProbability || 0.33) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-[var(--theme-bg)] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isLong
                  ? "bg-[var(--theme-profit)]"
                  : isShort
                  ? "bg-[var(--theme-loss)]"
                  : "bg-slate-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(10, (aiSignal?.xgboostProbability || 0.33) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[var(--theme-text-muted)] font-mono">
            <span>Agreement</span>
            <span className={aiSignal?.modelAgreement ? "text-[var(--theme-profit)] font-bold" : "text-amber-400 font-bold"}>
              {aiSignal?.modelAgreement ? "AGREED" : "DISAGREEMENT"}
            </span>
          </div>
        </div>

        {/* 3. Expected Value & Cost Check */}
        <div className="p-3 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] rounded-xl space-y-1.5">
          <div className="flex justify-between items-center text-[11px] font-mono text-[var(--theme-text-secondary)]">
            <span>Net Expected Return</span>
            <span className="font-bold text-[var(--theme-profit)]">
              {aiSignal?.expectedReturn ? `+${(aiSignal.expectedReturn * 100).toFixed(2)}%` : "0.00%"}
            </span>
          </div>
          <div className="flex justify-between text-[10px] text-[var(--theme-text-muted)] font-mono pt-1">
            <span>Friction Buffer</span>
            <span>12 bps round-trip</span>
          </div>
          <div className="flex justify-between text-[10px] text-[var(--theme-text-muted)] font-mono">
            <span>Pre-Trade Risk</span>
            <span className={aiSignal?.riskStatus === "PASSED" ? "text-[var(--theme-profit)] font-bold" : "text-[var(--theme-loss)] font-bold"}>
              {aiSignal?.riskStatus || "PASSED"}
            </span>
          </div>
        </div>
      </div>

      {/* SHAP Top Explainability Factors */}
      {aiSignal?.topFactors && aiSignal.topFactors.length > 0 && (
        <div className="p-3 bg-[var(--theme-elevated)]/60 border border-[var(--theme-border-subtle)] rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-[var(--theme-text-primary)]">
            <span className="flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
              SHAP Local Feature Attribution (Top Predictive Drivers)
            </span>
            <span className="text-[10px] text-[var(--theme-text-muted)]">Point-in-Time Attribution</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {aiSignal.topFactors.map((f, i) => {
              const isBullish = f.impact === "BULLISH" || f.impact === "POSITIVE";
              return (
                <div
                  key={i}
                  className="p-2 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] flex items-center justify-between text-[11px] font-mono"
                >
                  <div className="truncate mr-2">
                    <span className="text-[var(--theme-text-secondary)] block truncate">{f.feature}</span>
                    <span className="text-[10px] text-[var(--theme-text-muted)]">Val: {f.value}</span>
                  </div>
                  <span className={`font-bold shrink-0 px-1.5 py-0.5 rounded text-[10px] ${
                    isBullish
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  }`}>
                    {f.impact}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Controls Bar: Threshold Slider & Auto Execution */}
      <div className="p-3 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] rounded-xl flex flex-wrap items-center justify-between gap-4">
        {/* Slider */}
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <span className="text-xs font-mono text-[var(--theme-text-secondary)] whitespace-nowrap">
            Confidence Gate: <strong>{confidenceSlider}%</strong>
          </span>
          <input
            type="range"
            min="50"
            max="95"
            step="1"
            value={confidenceSlider}
            onChange={(e) => setConfidenceSlider(Number(e.target.value))}
            onMouseUp={() => toggleExecutionMutation.mutate(aiStatus?.auto_execute_paper || false)}
            className="w-full accent-[var(--theme-accent)] cursor-pointer"
          />
        </div>

        {/* Auto Execution Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleExecutionMutation.mutate(!aiStatus?.auto_execute_paper)}
            disabled={toggleExecutionMutation.isPending}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
              aiStatus?.auto_execute_paper
                ? "bg-[var(--theme-profit)]/20 text-[var(--theme-profit)] border border-[var(--theme-profit)]/40 shadow-sm"
                : "bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border)]"
            }`}
          >
            <Zap className={`h-3.5 w-3.5 ${aiStatus?.auto_execute_paper ? "text-[var(--theme-profit)] animate-pulse" : "text-slate-400"}`} />
            <span>{aiStatus?.auto_execute_paper ? "AUTO PAPER: ARMED" : "MANUAL CONFIRMATION"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
