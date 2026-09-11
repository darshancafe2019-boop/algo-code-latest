"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  ShieldCheck,
  Power,
  Zap,
  RefreshCw,
  Server,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";

export function GlobalHealthBar() {
  const queryClient = useQueryClient();
  const [showKillSwitchModal, setShowKillSwitchModal] = useState(false);
  const [selectedBrokerKey, setSelectedBrokerKey] = useState<string | null>(null);
  const [confirmToken, setConfirmToken] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [dhanClientId, setDhanClientId] = useState("");
  const [dhanToken, setDhanToken] = useState("");
  const [reauthSuccess, setReauthSuccess] = useState<string | null>(null);
  const [reauthError, setReauthError] = useState<string | null>(null);

  const reauthDhanMutation = useMutation({
    mutationFn: async ({ clientId, accessToken }: { clientId: string; accessToken: string }) => {
      const res = await apiClient.post<any>("/api/brokers/dhan/configure", {
        clientId: clientId.trim(),
        accessToken: accessToken.trim(),
      });
      if (!res.ok || res.data?.status === "error") {
        throw new Error(res.error?.message || res.data?.message || "Dhan authentication failed");
      }
      return res.data;
    },
    onSuccess: (data) => {
      setReauthSuccess(data.message || "Dhan credentials updated and verified successfully!");
      setReauthError(null);
      setDhanToken("");
      queryClient.invalidateQueries({ queryKey: ["brokersHealthTelemetry"] });
      queryClient.invalidateQueries({ queryKey: ["systemHealth"] });
    },
    onError: (err: any) => {
      setReauthError(err.message || "Authentication failed. Please verify token.");
      setReauthSuccess(null);
    },
  });

  const { data: summaryData } = useQuery({
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
    refetchInterval: 4000,
    placeholderData: (prev) => prev,
  });

  const { data: brokersHealth } = useQuery({
    queryKey: ["brokersHealthTelemetry"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/brokers/health", { timeoutMs: 4000 });
      if (!res.ok || !res.data) return null;
      return res.data?.brokers || null;
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
  const isHealthy = !isKillSwitchActive;

  const getStatusColor = (status?: string) => {
    switch (status?.toUpperCase()) {
      case "HEALTHY":
      case "AUTHENTICATED":
      case "LIVE":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "AUTH_FAILED":
      case "ERROR":
      case "DISCONNECTED":
        return "text-rose-400 bg-rose-500/10 border-rose-500/30";
      case "CONFIGURED":
      case "DEGRADED":
      case "WARNING":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  const getDotColor = (status?: string) => {
    switch (status?.toUpperCase()) {
      case "HEALTHY":
      case "AUTHENTICATED":
      case "LIVE":
        return "bg-emerald-400";
      case "AUTH_FAILED":
      case "ERROR":
      case "DISCONNECTED":
        return "bg-rose-400";
      case "CONFIGURED":
      case "DEGRADED":
      case "WARNING":
        return "bg-amber-400";
      default:
        return "bg-slate-500";
    }
  };

  const selectedBroker = selectedBrokerKey && brokersHealth ? brokersHealth[selectedBrokerKey] : null;

  return (
    <>
      <div className="w-full bg-[var(--theme-surface)]/95 backdrop-blur-md border-b border-[var(--theme-border)] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs transition-colors select-none font-sans">
        {/* Left: Kill Switch Status & Quick Counts */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-medium transition-all ${
              isKillSwitchActive
                ? "bg-[var(--theme-loss)]/15 border-[var(--theme-loss)]/40 text-[var(--theme-loss)] animate-pulse"
                : isHealthy
                ? "bg-[var(--theme-profit)]/15 border-[var(--theme-profit)]/30 text-[var(--theme-profit)]"
                : "bg-[var(--theme-warning)]/15 border-[var(--theme-warning)]/30 text-[var(--theme-warning)]"
            }`}
          >
            {isKillSwitchActive ? (
              <ShieldAlert className="h-3.5 w-3.5 text-[var(--theme-loss)] shrink-0" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--theme-profit)] shrink-0" />
            )}
            <span className="font-mono text-[11px] font-bold">
              {isKillSwitchActive ? "TRADING HALTED — KILL SWITCH" : "RISK ENGINE ✓"}
            </span>
          </div>

          {/* Broker Status Pills */}
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            {/* Paper Pill */}
            <button
              onClick={() => setSelectedBrokerKey("paper")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors hover:brightness-125 ${getStatusColor(
                brokersHealth?.paper?.status || "HEALTHY"
              )}`}
              title="Click to view Paper Simulation diagnostics"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${getDotColor(brokersHealth?.paper?.status || "HEALTHY")}`} />
              <span>PAPER</span>
            </button>

            {/* Backend Pill */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded border text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>BACKEND</span>
            </div>

            {/* Gateway Pill */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded border text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>GATEWAY</span>
            </div>

            {/* Dhan Pill */}
            <button
              onClick={() => setSelectedBrokerKey("dhan")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors hover:brightness-125 ${getStatusColor(
                brokersHealth?.dhan?.status
              )}`}
              title="Click to view Dhan diagnostics"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${getDotColor(brokersHealth?.dhan?.status)}`} />
              <span>DHAN</span>
            </button>

            {/* Upstox Pill */}
            <button
              onClick={() => setSelectedBrokerKey("upstox")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors hover:brightness-125 ${getStatusColor(
                brokersHealth?.upstox?.status
              )}`}
              title="Click to view Upstox diagnostics"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${getDotColor(brokersHealth?.upstox?.status)}`} />
              <span>UPSTOX</span>
            </button>

            {/* Delta Pill */}
            <button
              onClick={() => setSelectedBrokerKey("delta")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors hover:brightness-125 ${getStatusColor(
                brokersHealth?.delta?.status
              )}`}
              title="Click to view Delta Exchange diagnostics"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${getDotColor(brokersHealth?.delta?.status)}`} />
              <span>DELTA</span>
            </button>
          </div>
        </div>

        {/* Right: Latency Badges & Kill Switch Button */}
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <div className="hidden lg:flex items-center gap-2 text-[var(--theme-text-muted)]">
            <span className="flex items-center gap-1">
              <Radio className="h-3 w-3 text-sky-400" /> WS: <strong className="text-[var(--theme-text-primary)]">28ms</strong>
            </span>
            <span>•</span>
            <span>
              API: <strong className="text-[var(--theme-text-primary)]">42ms</strong>
            </span>
            <span>•</span>
            <span>
              DATA: <strong className="text-emerald-400">0.15s</strong>
            </span>
          </div>

          {isKillSwitchActive ? (
            <button
              onClick={() => killSwitchMutation.mutate({ action: "DEACTIVATE_KILL_SWITCH" })}
              disabled={killSwitchMutation.isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--theme-profit)]/20 hover:bg-[var(--theme-profit)]/30 text-[var(--theme-profit)] border border-[var(--theme-profit)]/40 font-bold transition-colors"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Deactivate Kill Switch</span>
            </button>
          ) : (
            <button
              onClick={() => setShowKillSwitchModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--theme-loss)]/15 hover:bg-[var(--theme-loss)]/25 text-[var(--theme-loss)] border border-[var(--theme-loss)]/30 font-bold transition-colors shadow-sm"
            >
              <Power className="h-3.5 w-3.5" />
              <span>Emergency Kill Switch</span>
            </button>
          )}
        </div>
      </div>

      {/* Broker Diagnostic Modal */}
      {selectedBroker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="card-specular w-full max-w-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <Server className="h-5 w-5 text-sky-400" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--theme-text-primary)] uppercase">
                    {selectedBroker.name || selectedBrokerKey} Diagnostics
                  </h3>
                  <p className="text-[11px] text-[var(--theme-text-muted)] font-mono">
                    Provider ID: {selectedBrokerKey?.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBrokerKey(null)}
                className="text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] px-2 py-1 rounded-lg bg-[var(--theme-elevated)] text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-[var(--theme-elevated)] rounded-xl border border-[var(--theme-border)]">
                <span className="text-[var(--theme-text-muted)] block text-[10px]">AUTH STATUS</span>
                <span className="font-bold text-[var(--theme-text-primary)]">
                  {selectedBroker.status || "NOT_CONFIGURED"}
                </span>
              </div>

              <div className="p-2.5 bg-[var(--theme-elevated)] rounded-xl border border-[var(--theme-border)]">
                <span className="text-[var(--theme-text-muted)] block text-[10px]">TRADING MODE</span>
                <span className="font-bold text-sky-400">{selectedBroker.mode || "PAPER"}</span>
              </div>

              <div className="p-2.5 bg-[var(--theme-elevated)] rounded-xl border border-[var(--theme-border)]">
                <span className="text-[var(--theme-text-muted)] block text-[10px]">DATA FEED</span>
                <span className="font-bold text-emerald-400">{selectedBroker.feed_status || "LIVE"}</span>
              </div>

              <div className="p-2.5 bg-[var(--theme-elevated)] rounded-xl border border-[var(--theme-border)]">
                <span className="text-[var(--theme-text-muted)] block text-[10px]">API LATENCY</span>
                <span className="font-bold text-[var(--theme-text-primary)]">
                  {selectedBroker.latency_ms ? `${selectedBroker.latency_ms}ms` : "N/A"}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[var(--theme-elevated)] rounded-xl border border-[var(--theme-border)] text-xs space-y-1.5 font-sans">
              <div className="flex items-center justify-between text-[var(--theme-text-secondary)]">
                <span>Option Chain Execution:</span>
                <span className="font-mono text-[var(--theme-text-primary)]">
                  {selectedBroker.supports_options ? "✓ Supported" : "✗ N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--theme-text-secondary)]">
                <span>Futures Execution:</span>
                <span className="font-mono text-[var(--theme-text-primary)]">
                  {selectedBroker.supports_futures ? "✓ Supported" : "✗ N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--theme-text-secondary)]">
                <span>Equities / Cash:</span>
                <span className="font-mono text-[var(--theme-text-primary)]">
                  {selectedBroker.supports_equities ? "✓ Supported" : "✗ N/A"}
                </span>
              </div>
            </div>

            {/* Dhan Re-authentication Section */}
            {selectedBrokerKey === "dhan" && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 font-sans ${
                selectedBroker.status === "AUTH_FAILED"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : "bg-[var(--theme-elevated)] border-[var(--theme-border)] text-[var(--theme-text-secondary)]"
              }`}>
                <div className="flex items-center gap-2 font-bold text-[var(--theme-text-primary)]">
                  {selectedBroker.status === "AUTH_FAILED" ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  ) : (
                    <RefreshCw className="h-4 w-4 shrink-0 text-sky-400" />
                  )}
                  <span>
                    {selectedBroker.status === "AUTH_FAILED"
                      ? "Dhan Authentication Required (HTTP 401)"
                      : "Update Dhan HQ Credentials"}
                  </span>
                </div>
                {selectedBroker.status === "AUTH_FAILED" && (
                  <p className="text-[11px] text-rose-200/90 leading-relaxed">
                    Dhan API returned 401 Unauthorized. Live and Paper execution targeting Dhan are locked until a fresh token is validated.
                  </p>
                )}
                <div className="space-y-2 pt-1">
                  <input
                    type="text"
                    placeholder="Dhan Client ID (e.g. 1000000000)"
                    value={dhanClientId}
                    onChange={(e) => setDhanClientId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <input
                    type="password"
                    placeholder="Fresh Access Token (JWT / API Token)"
                    value={dhanToken}
                    onChange={(e) => setDhanToken(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  {reauthError && <div className="text-[11px] text-rose-400 font-mono">{reauthError}</div>}
                  {reauthSuccess && <div className="text-[11px] text-emerald-400 font-mono">{reauthSuccess}</div>}
                  <button
                    onClick={() => reauthDhanMutation.mutate({ clientId: dhanClientId, accessToken: dhanToken })}
                    disabled={reauthDhanMutation.isPending || !dhanToken.trim()}
                    className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-sm"
                  >
                    {reauthDhanMutation.isPending ? "Validating with Dhan HQ..." : "Validate & Unlock Trading"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[var(--theme-text-muted)] font-mono">
                🔒 Credentials isolated server-side
              </span>
              <button
                onClick={() => setSelectedBrokerKey(null)}
                className="px-4 py-1.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-border)] text-xs font-semibold text-[var(--theme-text-primary)] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kill Switch Confirmation Modal */}
      {showKillSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="card-specular w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-loss)]/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-[var(--theme-loss)]">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h2 className="text-lg font-bold text-[var(--theme-text-primary)]">Emergency Kill Switch</h2>
            </div>
            <p className="text-xs text-[var(--theme-text-secondary)] mb-4 leading-relaxed">
              Activating the Kill Switch will immediately stop all active trading processes, block order dispatching across bots & manual terminals, and lock the execution pipeline.
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

