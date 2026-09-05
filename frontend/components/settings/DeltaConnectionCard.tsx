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
} from "lucide-react";

interface DeltaStatusResponse {
  status: string;
  connected: boolean;
  broker: string;
  brokerName: string;
  network: "DELTA_INDIA" | "DELTA_GLOBAL";
  baseUrl: string;
  apiKeyMasked: string;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  latencyMs: number;
  supportedMarkets: string[];
  supportedPairsCount: number;
  tradingMode: string;
  errorMessage?: string | null;
  timestamp: string;
}

export function DeltaConnectionCard() {
  const queryClient = useQueryClient();
  const [isPinging, setIsPinging] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [secretKeyInput, setSecretKeyInput] = useState("");
  const [isIndiaRegion, setIsIndiaRegion] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // 1. Fetch Authoritative Connection Status
  const { data, isLoading, refetch } = useQuery<DeltaStatusResponse>({
    queryKey: ["deltaAuthStatus"],
    queryFn: async () => {
      const res = await fetch("/api/delta/status");
      if (!res.ok) {
        throw new Error("Failed to check Delta Exchange connection status");
      }
      return res.json();
    },
    staleTime: 5000,
    refetchInterval: 15000,
  });

  // 2. Fetch Wallet Balances
  const { data: walletData } = useQuery({
    queryKey: ["deltaWalletBalances"],
    queryFn: async () => {
      const res = await fetch("/api/delta/wallet");
      if (!res.ok) return { balances: [] };
      return res.json();
    },
    staleTime: 10000,
  });

  const isConnected = Boolean(data?.connected);
  const isIndia = data?.network === "DELTA_INDIA";

  const handlePing = async () => {
    setIsPinging(true);
    try {
      const res = await fetch("/api/delta/ping", { method: "POST" });
      const result = await res.json();
      if (res.ok && result.connected) {
        setNotification({
          type: "success",
          message: `Delta REST API Ping: ${result.latencyMs}ms (${result.network} 200 OK). Gateway is lightning-fast and operational.`,
        });
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["deltaAuthStatus"] });
      } else {
        setNotification({
          type: "error",
          message: result.message || "Failed to reach Delta Exchange endpoint.",
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
    if (!apiKeyInput.trim() || !secretKeyInput.trim()) {
      setNotification({ type: "error", message: "Both API Key and Secret Key are required." });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/delta/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKeyInput.trim(),
          secret_key: secretKeyInput.trim(),
          is_india: isIndiaRegion,
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setNotification({ type: "success", message: resData.message || "Delta Exchange credentials securely saved!" });
        setIsConfigModalOpen(false);
        setApiKeyInput("");
        setSecretKeyInput("");
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["deltaAuthStatus"] });
        queryClient.invalidateQueries({ queryKey: ["securityCredentialsList"] });
      } else {
        setNotification({ type: "error", message: resData.message || "Failed to store credentials." });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: `Save failed: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyMasked = () => {
    if (data?.apiKeyMasked) {
      navigator.clipboard.writeText(data.apiKeyMasked);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="bg-[#121824] border border-[#1E293B] hover:border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-5 transition-all">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-sans animate-in fade-in duration-200 ${
            notification.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
              : notification.type === "error"
              ? "bg-rose-950/80 border-rose-500/40 text-rose-300"
              : "bg-cyan-950/80 border-cyan-500/40 text-cyan-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : notification.type === "error" ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            ) : (
              <Radio className="h-4 w-4 shrink-0 text-cyan-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-black text-xl shadow-lg shadow-cyan-950/40">
            Δ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Delta Exchange
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                {isIndia ? "INDIA COMPLIANT" : "GLOBAL DERIVATIVES"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cryptocurrency Options, Perpetual Futures &amp; Spot derivatives exchange with up to 100x leverage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono border ${
              isConnected
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                : "bg-rose-950/80 text-rose-300 border-rose-500/40"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
              }`}
            />
            {isLoading ? "CHECKING..." : isConnected ? "GATEWAY ONLINE" : "DISCONNECTED"}
          </span>

          <button
            onClick={handlePing}
            disabled={isPinging || isLoading}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-[#1E293B] text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Test Real-Time Round-Trip Latency"
          >
            <RefreshCw className={`h-4 w-4 ${isPinging ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Network & Connection Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
        {/* Network & Base URL */}
        <div className="bg-[#0B131E] border border-[#1E293B] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-cyan-400" />
            Gateway Endpoint
          </span>
          <div className="font-mono text-slate-200 font-bold truncate">
            {data?.baseUrl || "https://api.india.delta.exchange"}
          </div>
          <div className="text-[10px] text-cyan-400 font-mono">
            Round-Trip Latency: {data?.latencyMs || 0}ms
          </div>
        </div>

        {/* API Authentication Status */}
        <div className="bg-[#0B131E] border border-[#1E293B] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-teal-400" />
            API Key (HMAC-SHA256)
          </span>
          <div className="font-mono text-slate-200 font-bold flex items-center justify-between">
            <span className="truncate">{data?.apiKeyMasked || "Not Configured"}</span>
            {data?.apiKeyMasked && data.apiKeyMasked !== "Not Configured" && (
              <button
                onClick={handleCopyMasked}
                className="text-slate-400 hover:text-white transition ml-1"
                title="Copy masked key"
              >
                {copiedKey ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
          </div>
          <div className="text-[10px] text-slate-400">
            Permissions: <strong className="text-emerald-400">Read &amp; Trade</strong> (Withdrawal Disabled)
          </div>
        </div>

        {/* Trading Mode */}
        <div className="bg-[#0B131E] border border-[#1E293B] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-amber-400" />
            Execution Mode
          </span>
          <div className="font-mono text-slate-200 font-bold">
            {data?.tradingMode === "LIVE_AND_PAPER" ? (
              <span className="text-emerald-400">LIVE &amp; PAPER READY</span>
            ) : (
              <span className="text-amber-400">PAPER SIMULATION</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Contracts Tracked: ~{data?.supportedPairsCount || 180} Pairs
          </div>
        </div>
      </div>

      {/* Wallet Balance Summary */}
      {walletData?.balances && walletData.balances.length > 0 && (
        <div className="p-3 bg-[#0B131E] border border-[#1E293B] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-cyan-400" />
            <span className="font-bold text-slate-300">Delta Wallet Balances:</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            {walletData.balances.map((b: any, idx: number) => (
              <div key={b.asset || `balance-${idx}`} className="flex items-center gap-1.5">
                <span className="text-slate-400">{b.asset}:</span>
                <span className="font-bold text-emerald-400">
                  {b.currency_symbol || ""}{Number(b.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                {b.mode && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {b.mode}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supported Markets Pill Strip */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">
          Enabled Derivative Capabilities:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[
            "BTC & ETH European Options",
            "Perpetual Futures (100x)",
            "Crypto Spot Trading",
            "Solana Options & Futures",
            "Zero-Loss Paper Sandbox",
            "Delta India INR Settlement"
          ].map((mkt) => (
            <span
              key={mkt}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#070D14] border border-[#1E293B] text-slate-300 font-medium"
            >
              {mkt}
            </span>
          ))}
        </div>
      </div>

      {/* Action Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#1E293B]">
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <a
            href="https://india.delta.exchange"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition"
          >
            <span>Delta India Portal</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://api.india.delta.exchange/#introduction"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-300 transition"
          >
            <span>Official API Docs</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <button
          onClick={() => setIsConfigModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-bold font-mono transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50"
        >
          <Key className="h-3.5 w-3.5" />
          <span>{data?.hasApiKey ? "Update API Keys" : "Connect Delta API"}</span>
        </button>
      </div>

      {/* API Key Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0B131E] border border-cyan-800/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#1E293B] bg-[#070D14] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Delta Exchange API Credentials</h4>
                  <p className="text-[11px] text-slate-400">Encrypted in SQLite Vault with withdrawal lock</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCredentials} className="p-5 space-y-4 text-xs font-sans">
              {/* Region Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                  Delta Exchange Region
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsIndiaRegion(true)}
                    className={`p-2.5 rounded-xl border text-center font-bold transition ${
                      isIndiaRegion
                        ? "bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-sm"
                        : "bg-[#070D14] text-slate-400 border-[#1E293B]"
                    }`}
                  >
                    <div>Delta India (INR)</div>
                    <div className="text-[9px] font-normal text-slate-400 font-mono">api.india.delta.exchange</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsIndiaRegion(false)}
                    className={`p-2.5 rounded-xl border text-center font-bold transition ${
                      !isIndiaRegion
                        ? "bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-sm"
                        : "bg-[#070D14] text-slate-400 border-[#1E293B]"
                    }`}
                  >
                    <div>Delta Global (USDT)</div>
                    <div className="text-[9px] font-normal text-slate-400 font-mono">api.delta.exchange</div>
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                  API Key
                </label>
                <input
                  type="text"
                  required
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste your Delta Exchange API Key..."
                  className="w-full bg-[#070D14] border border-[#1E293B] focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                />
              </div>

              {/* API Secret */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                  API Secret
                </label>
                <input
                  type="password"
                  required
                  value={secretKeyInput}
                  onChange={(e) => setSecretKeyInput(e.target.value)}
                  placeholder="Paste your Delta Exchange API Secret..."
                  className="w-full bg-[#070D14] border border-[#1E293B] focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                />
              </div>

              {/* Security Invariant Notice */}
              <div className="p-3 rounded-xl bg-cyan-950/50 border border-cyan-900/60 text-[11px] text-cyan-300 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Security Invariant:</strong> Only <em>Read</em> and <em>Trade</em> scopes are used. Withdrawal permissions are strictly rejected and automatically locked out.
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-lg shadow-cyan-950/50 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>{isSaving ? "Saving & Validating..." : "Save Credentials"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
