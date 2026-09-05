"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity, ShieldAlert, ShieldCheck, Power, Zap, RefreshCw } from "lucide-react";

import { apiClient } from "@/lib/apiClient";

export function GlobalHealthBar() {
  const queryClient = useQueryClient();
  const [showKillSwitchModal, setShowKillSwitchModal] = useState(false);
  const [confirmToken, setConfirmToken] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["botsSummary"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/bots/summary", { timeoutMs: 5000 });
      if (!res.ok || !res.data) return null;
      return res.data;
    },
    refetchInterval: 3000,
    placeholderData: (prev) => prev,
  });

  const { data: healthData } = useQuery({
    queryKey: ["systemHealth"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/bot/status", { timeoutMs: 5000 });
      if (!res.ok || !res.data) return null;
      return res.data;
    },
    refetchInterval: 5000,
    placeholderData: (prev) => prev,
  });

  const killSwitchMutation = useMutation({
    mutationFn: async ({ action, token }: { action: string; token?: string }) => {
      const res = await apiClient.post<any>("/api/bot/control", { action, confirmation_token: token });
      if (!res.ok || res.data?.status === "error") {
        throw new Error(res.error?.message || res.data?.message || "Kill switch action failed");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
      queryClient.invalidateQueries({ queryKey: ["systemHealth"] });
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      setShowKillSwitchModal(false);
      setConfirmToken("");
      setErrorMessage("");
    },
    onError: (err: any) => {
      setErrorMessage(err.message);
    },
  });

  const metrics = summaryData?.metrics || {
    running: 0,
    stopped: 0,
    paused: 0,
    paper: 0,
    live: 0,
    total_bots: 0,
  };

  const isKillSwitchActive = healthData?.system_summary?.kill_switch_active || false;
  const isHealthy = !isKillSwitchActive && metrics.error === 0;

  return (
    <>
      <div className="w-full bg-[var(--theme-surface)]/90 backdrop-blur-md border-b border-[var(--theme-border)] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs transition-colors select-none font-sans">
        {/* Left Status Pill */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border font-medium transition-all ${
              isKillSwitchActive
                ? "bg-[var(--theme-loss)]/15 border-[var(--theme-loss)]/40 text-[var(--theme-loss)] animate-pulse"
                : isHealthy
                ? "bg-[var(--theme-profit)]/15 border-[var(--theme-profit)]/30 text-[var(--theme-profit)]"
                : "bg-[var(--theme-warning)]/15 border-[var(--theme-warning)]/30 text-[var(--theme-warning)]"
            }`}
          >
            {isKillSwitchActive ? (
              <ShieldAlert className="h-3.5 w-3.5 text-[var(--theme-loss)]" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--theme-profit)]" />
            )}
            <span className="font-mono text-[11px] font-semibold">
              {isKillSwitchActive
                ? "TRADING HALTED — Emergency Kill Switch Active"
                : `System Healthy — ${metrics.running} Running, ${metrics.stopped} Stopped, ${metrics.paper} Paper`}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-4 text-[var(--theme-text-secondary)] text-xs font-mono">
            <span>Total Bots: <strong className="text-[var(--theme-text-primary)]">{metrics.total_bots}</strong></span>
            <span>Paper: <strong className="text-sky-400">{metrics.paper}</strong></span>
            <span>Live: <strong className="text-amber-400">{metrics.live}</strong></span>
          </div>
        </div>

        {/* Right Actions & Kill Switch Button */}
        <div className="flex items-center gap-2">
          {isKillSwitchActive ? (
            <button
              onClick={() => killSwitchMutation.mutate({ action: "DEACTIVATE_KILL_SWITCH" })}
              disabled={killSwitchMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--theme-profit)]/20 hover:bg-[var(--theme-profit)]/30 text-[var(--theme-profit)] border border-[var(--theme-profit)]/40 font-semibold transition-colors"
            >
              <Zap className="h-3.5 w-3.5 text-[var(--theme-profit)]" />
              <span>Deactivate Kill Switch</span>
            </button>
          ) : (
            <button
              onClick={() => setShowKillSwitchModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--theme-loss)]/15 hover:bg-[var(--theme-loss)]/25 text-[var(--theme-loss)] border border-[var(--theme-loss)]/30 font-semibold transition-colors shadow-sm"
            >
              <Power className="h-3.5 w-3.5 text-[var(--theme-loss)]" />
              <span>Emergency Kill Switch</span>
            </button>
          )}
        </div>
      </div>

      {/* Kill Switch Confirmation Modal */}
      {showKillSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="card-specular w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-loss)]/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-[var(--theme-loss)]">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h2 className="text-lg font-bold text-[var(--theme-text-primary)]">Emergency Kill Switch</h2>
            </div>
            <p className="text-xs text-[var(--theme-text-secondary)] mb-4 leading-relaxed">
              Activating the Kill Switch will immediately stop all active trading processes, cancel pending orders, close open positions, and lock the execution pipeline.
            </p>

            <div className="mb-4">
              <label className="block text-xs text-[var(--theme-text-muted)] mb-1.5">
                Type <code className="text-[var(--theme-loss)] font-bold">CONFIRM-KILL-SWITCH</code> to proceed:
              </label>
              <input
                type="text"
                value={confirmToken}
                onChange={(e) => setConfirmToken(e.target.value)}
                placeholder="CONFIRM-KILL-SWITCH"
                className="w-full bg-[var(--theme-pageBg)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-sm text-[var(--theme-text-primary)] font-mono focus:border-[var(--theme-loss)] focus:outline-none transition-colors"
              />
            </div>

            {errorMessage && (
              <p className="text-xs text-[var(--theme-loss)] bg-[var(--theme-loss)]/10 border border-[var(--theme-loss)]/30 p-2.5 rounded-xl mb-4">
                {errorMessage}
              </p>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowKillSwitchModal(false);
                  setErrorMessage("");
                  setConfirmToken("");
                }}
                className="px-4 py-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={confirmToken !== "CONFIRM-KILL-SWITCH" || killSwitchMutation.isPending}
                onClick={() =>
                  killSwitchMutation.mutate({
                    action: "KILL_SWITCH",
                    token: confirmToken,
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--theme-loss)] hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-[var(--theme-loss)]/25"
              >
                {killSwitchMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Trigger Kill Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
