"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Radio,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  Layers,
  Zap,
  Lock,
  Copy,
  Check,
  Key,
  Globe,
  Sliders,
  Wallet,
  TrendingUp,
  PowerOff,
} from "lucide-react";

interface DhanStatusResponse {
  status: string;
  connected: boolean;
  broker: string;
  brokerName: string;
  clientId: string;
  clientIdMasked: string;
  hasToken: boolean;
  tradingMode: string;
  supportedMarkets: string[];
  funds: {
    available: number;
    utilized: number;
    collateral: number;
    withdrawable: number;
  };
  positionsCount: number;
  ordersCount: number;
  timestamp: string;
}

export function DhanConnectionCard() {
  const queryClient = useQueryClient();
  const [isPinging, setIsPinging] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [clientIdInput, setClientIdInput] = useState("");
  const [accessTokenInput, setAccessTokenInput] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // 1. Fetch Authoritative Dhan Connection Status
  const { data, isLoading, refetch } = useQuery<DhanStatusResponse>({
    queryKey: ["dhanAuthStatus"],
    queryFn: async () => {
      const res = await fetch("/api/dhan/status");
      if (!res.ok) {
        throw new Error("Failed to check Dhan connection status");
      }
      return res.json();
    },
    staleTime: 5000,
    refetchInterval: 15000,
  });

  const isConnected = Boolean(data?.connected);

  const handlePing = async () => {
    setIsPinging(true);
    try {
      const res = await fetch("/api/dhan/ping", { method: "POST" });
      const result = await res.json();
      if (res.ok && result.connected) {
        setNotification({
          type: "success",
          message: `Dhan HQ API v2 Ping: ${result.latencyMs}ms (HTTP 200 OK). Latency is optimal.`,
        });
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["dhanAuthStatus"] });
      } else {
        setNotification({
          type: "error",
          message: result.message || "Failed to reach Dhan HQ API endpoint.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: `Ping diagnostic error: ${err.message}`,
      });
    } finally {
      setIsPinging(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientIdInput.trim() || !accessTokenInput.trim()) {
      setNotification({ type: "error", message: "Both Client ID and Access Token are required." });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/dhan/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientIdInput.trim(),
          access_token: accessTokenInput.trim(),
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setNotification({
          type: "success",
          message: "Dhan credentials securely encrypted & stored in vault.",
        });
        setIsConfigModalOpen(false);
        setClientIdInput("");
        setAccessTokenInput("");
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["dhanAuthStatus"] });
        queryClient.invalidateQueries({ queryKey: ["securityCredentialsList"] });
      } else {
        setNotification({
          type: "error",
          message: result.message || "Failed to save Dhan credentials.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: `Failed to save credentials: ${err.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Dhan HQ? Real-time broker routing will be disabled.")) {
      return;
    }
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/dhan/disconnect", { method: "POST" });
      const result = await res.json();
      if (res.ok) {
        setNotification({
          type: "success",
          message: "Dhan HQ broker disconnected safely.",
        });
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["dhanAuthStatus"] });
        queryClient.invalidateQueries({ queryKey: ["securityCredentialsList"] });
      } else {
        setNotification({
          type: "error",
          message: result.error || "Failed to disconnect Dhan.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: `Disconnect error: ${err.message}`,
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const copyClientId = () => {
    if (data?.clientId) {
      navigator.clipboard.writeText(data.clientId);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="relative rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm transition-all hover:border-border/80 hover:shadow-lg">
      {/* Top Banner Notification */}
      {notification && (
        <div
          className={`mb-4 flex items-center justify-between rounded-lg px-3.5 py-2.5 text-xs font-medium ${
            notification.type === "success"
              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border border-rose-500/20 bg-rose-500/10 text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/80 bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-transparent shadow-inner">
            <TrendingUp className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">Dhan HQ API v2</h3>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                Official Indian Broker
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Direct DMA execution for NSE Equities, NFO Derivatives, BSE & MCX
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              Connected & Verified
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
              <Radio className="h-3 w-3" />
              Not Connected
            </div>
          )}
        </div>
      </div>

      {/* Metrics & Parameters Grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border/40 bg-secondary/20 p-2.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Key className="h-3 w-3 text-emerald-400" /> Client ID
          </span>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-foreground">
              {data?.clientIdMasked || "Not Set"}
            </span>
            {data?.clientId && (
              <button
                onClick={copyClientId}
                className="text-muted-foreground hover:text-foreground"
                title="Copy Client ID"
              >
                {copiedKey ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border/40 bg-secondary/20 p-2.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Wallet className="h-3 w-3 text-emerald-400" /> Avail. Margin
          </span>
          <p className="mt-1 font-mono text-xs font-semibold text-emerald-400">
            ₹{(data?.funds?.available || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-lg border border-border/40 bg-secondary/20 p-2.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Layers className="h-3 w-3 text-emerald-400" /> Collateral
          </span>
          <p className="mt-1 font-mono text-xs font-semibold text-foreground">
            ₹{(data?.funds?.collateral || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-lg border border-border/40 bg-secondary/20 p-2.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Clock className="h-3 w-3 text-emerald-400" /> Trading Mode
          </span>
          <p className="mt-1 font-mono text-xs font-semibold text-cyan-400">
            {data?.tradingMode || "PAPER"}
          </p>
        </div>
      </div>

      {/* Supported Segments Tags */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground mr-1">Supported Markets:</span>
        {(data?.supportedMarkets || ["NSE Cash", "NSE F&O", "BSE Cash", "MCX Commodities", "NFO Options"]).map((m, idx) => (
          <span
            key={idx}
            className="rounded bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/30"
          >
            {m}
          </span>
        ))}
      </div>

      {/* Action Footer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePing}
            disabled={isPinging || !isConnected}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? "animate-spin text-emerald-400" : ""}`} />
            {isPinging ? "Testing Ping..." : "Test Connection"}
          </button>

          {isConnected && (
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
            >
              <PowerOff className="h-3.5 w-3.5" />
              Disconnect
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://dhan.co"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-400 transition-colors"
          >
            Dhan Portal <ExternalLink className="h-3 w-3" />
          </a>
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-colors"
          >
            <Sliders className="h-3.5 w-3.5" />
            {isConnected ? "Update Credentials" : "Enter API Keys"}
          </button>
        </div>
      </div>

      {/* Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Configure Dhan HQ API</h4>
                  <p className="text-[11px] text-muted-foreground">Credentials are encrypted with AES-256 Fernet in database</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCredentials} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground">
                  Dhan Client ID (10-digit)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1000678498"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs font-mono text-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground">
                  Dhan Access Token (JWT)
                </label>
                <textarea
                  rows={3}
                  placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9..."
                  value={accessTokenInput}
                  onChange={(e) => setAccessTokenInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs font-mono text-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-300">
                <p className="font-semibold flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" /> Institutional Security Rule:
                </p>
                <p className="mt-0.5 text-amber-200/80">
                  Withdrawal permissions are strictly disabled by platform policy. Tokens are stored encrypted in the vault.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white shadow-sm disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                  {isSaving ? "Encrypting & Storing..." : "Save & Encrypt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
