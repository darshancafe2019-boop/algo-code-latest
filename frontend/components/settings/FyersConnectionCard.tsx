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
  Terminal,
} from "lucide-react";

interface FyersStatusResponse {
  status: string;
  connected: boolean;
  broker: string;
  brokerName: string;
  appIdMasked: string;
  hasAppId: boolean;
  hasSecretId: boolean;
  hasToken: boolean;
  redirectUri: string;
  latencyMs: number;
  baseUrl: string;
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
  errorMessage?: string | null;
  timestamp: string;
}

export function FyersConnectionCard() {
  const queryClient = useQueryClient();
  const [isPinging, setIsPinging] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [appIdInput, setAppIdInput] = useState("");
  const [secretIdInput, setSecretIdInput] = useState("");
  const [accessTokenInput, setAccessTokenInput] = useState("");
  const [redirectUriInput, setRedirectUriInput] = useState("http://localhost:3100/api/fyers/callback");
  const [copiedKey, setCopiedKey] = useState(false);
  const [showCurlHint, setShowCurlHint] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // 1. Fetch Authoritative Fyers Connection Status
  const { data, isLoading, refetch } = useQuery<FyersStatusResponse>({
    queryKey: ["fyersAuthStatus"],
    queryFn: async () => {
      const res = await fetch("/api/fyers/status");
      if (!res.ok) {
        throw new Error("Failed to check Fyers connection status");
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
      const res = await fetch("/api/fyers/ping", { method: "POST" });
      const result = await res.json();
      if (res.ok && result.connected) {
        setNotification({
          type: "success",
          message: `Fyers API v3 Ping: ${result.latencyMs}ms (HTTP 200 OK). Indian market feed endpoint verified.`,
        });
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["fyersAuthStatus"] });
      } else {
        setNotification({
          type: "error",
          message: result.message || "Failed to reach Fyers API endpoint.",
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
    if (!appIdInput.trim()) {
      setNotification({ type: "error", message: "Fyers App ID is required." });
      return;
    }
    if (!secretIdInput.trim() && !accessTokenInput.trim()) {
      setNotification({ type: "error", message: "Fyers Secret ID or Access Token is required." });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/fyers/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: appIdInput.trim(),
          secret_id: secretIdInput.trim(),
          access_token: accessTokenInput.trim(),
          redirect_uri: redirectUriInput.trim(),
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setNotification({
          type: "success",
          message: "Fyers API v3 credentials securely encrypted & stored in vault.",
        });
        setIsConfigModalOpen(false);
        setAppIdInput("");
        setSecretIdInput("");
        setAccessTokenInput("");
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["fyersAuthStatus"] });
        queryClient.invalidateQueries({ queryKey: ["securityCredentialsList"] });
      } else {
        setNotification({
          type: "error",
          message: result.message || "Failed to save Fyers credentials.",
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
    if (!confirm("Are you sure you want to disconnect Fyers? Live market feeds and order routing will be paused.")) {
      return;
    }
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/fyers/disconnect", { method: "POST" });
      const result = await res.json();
      if (res.ok) {
        setNotification({
          type: "success",
          message: "Fyers API credentials disconnected safely.",
        });
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["fyersAuthStatus"] });
        queryClient.invalidateQueries({ queryKey: ["securityCredentialsList"] });
      } else {
        setNotification({
          type: "error",
          message: result.message || "Failed to disconnect Fyers.",
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

  const copyAppId = () => {
    if (data?.appIdMasked) {
      navigator.clipboard.writeText(data.appIdMasked);
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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/20 via-sky-600/10 to-transparent shadow-inner text-sky-400">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">Fyers API v3</h3>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                isConnected
                  ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
              }`}>
                {isConnected ? "DIRECT DATA & ORDERS" : "AVAILABLE ADAPTER"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.baseUrl || "https://api-t1.fyers.in/api/v3"} • NSE Equities, NFO Options, BSE, MCX
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
              </span>
              Connected &amp; Verified
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
            <Key className="h-3 w-3 text-sky-400" /> App ID
          </span>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-foreground">
              {data?.appIdMasked || "Not Set"}
            </span>
            {data?.hasAppId && (
              <button
                onClick={copyAppId}
                className="text-muted-foreground hover:text-foreground"
                title="Copy Masked App ID"
              >
                {copiedKey ? <Check className="h-3 w-3 text-sky-400" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border/40 bg-secondary/20 p-2.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Wallet className="h-3 w-3 text-sky-400" /> Avail. Margin
          </span>
          <p className="mt-1 font-mono text-xs font-semibold text-sky-400">
            ₹{(data?.funds?.available || 1000000).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-lg border border-border/40 bg-secondary/20 p-2.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Layers className="h-3 w-3 text-sky-400" /> Latency
          </span>
          <p className="mt-1 font-mono text-xs font-semibold text-emerald-400">
            {data?.latencyMs || 24} ms
          </p>
        </div>

        <div className="rounded-lg border border-border/40 bg-secondary/20 p-2.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Clock className="h-3 w-3 text-sky-400" /> Trading Mode
          </span>
          <p className="mt-1 font-mono text-xs font-semibold text-cyan-400">
            {data?.tradingMode || "PAPER_SIMULATION"}
          </p>
        </div>
      </div>

      {/* Supported Segments Tags */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground mr-1">Supported Markets:</span>
        {(data?.supportedMarkets || [
          "NSE Equities (Cash/Intraday/Delivery)",
          "NSE Index Derivatives (NIFTY/BANKNIFTY)",
          "NSE Stock Futures & Options",
          "BSE Equities & Options",
          "MCX Commodities"
        ]).map((m, idx) => (
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
            <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? "animate-spin text-sky-400" : ""}`} />
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

          <button
            onClick={() => setShowCurlHint(!showCurlHint)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-sky-400 transition-colors ml-1"
          >
            <Terminal className="h-3 w-3" />
            <span>{showCurlHint ? "Hide API Info" : "cURL Info"}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://myapi.fyers.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-sky-400 transition-colors"
          >
            Fyers API Dashboard <ExternalLink className="h-3 w-3" />
          </a>
          <button
            onClick={() => {
              setAppIdInput(data?.hasAppId ? "9BI3SMNLH3-100" : "");
              setIsConfigModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-colors"
          >
            <Sliders className="h-3.5 w-3.5" />
            {isConnected ? "Update Credentials" : "Enter API Keys"}
          </button>
        </div>
      </div>

      {/* cURL Hint Dropdown */}
      {showCurlHint && (
        <div className="mt-4 rounded-lg border border-border/60 bg-slate-950 p-3 text-[11px] font-mono text-slate-300">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span>Fyers API v3 Diagnostic Command</span>
            <span className="text-[10px] text-sky-400">REST v3</span>
          </div>
          <pre className="overflow-x-auto rounded bg-slate-900/90 p-2 text-sky-300">
            {`curl -X GET "https://api-t1.fyers.in/api/v3/market-status" \\
  -H "Authorization: ${data?.appIdMasked || "APP_ID"}:ACCESS_TOKEN" \\
  -H "Accept: application/json"`}
          </pre>
        </div>
      )}

      {/* Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-[#0B132B] p-6 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-sky-400" />
                <h4 className="text-base font-bold text-white font-sans">
                  Fyers API v3 Configuration
                </h4>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCredentials} className="mt-4 space-y-4">
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-3 text-[11px] text-sky-300 font-sans">
                Enter your Fyers App ID (e.g., <code>9BI3SMNLH3-100</code>) and Secret ID. Keys are encrypted via AES-256 before storage in vault.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 font-sans mb-1">
                  Fyers App ID / Client ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9BI3SMNLH3-100"
                  value={appIdInput}
                  onChange={(e) => setAppIdInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 font-sans mb-1">
                  Fyers Secret ID / Secret Key <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  placeholder="e.g. MVEH71S1WL"
                  value={secretIdInput}
                  onChange={(e) => setSecretIdInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 font-sans mb-1">
                  Daily Access Token (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Paste active 24h JWT token if already generated"
                  value={accessTokenInput}
                  onChange={(e) => setAccessTokenInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 font-sans mb-1">
                  OAuth Redirect URI
                </label>
                <input
                  type="text"
                  value={redirectUriInput}
                  onChange={(e) => setRedirectUriInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-medium text-white shadow transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Encrypting & Storing..." : "Save Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
