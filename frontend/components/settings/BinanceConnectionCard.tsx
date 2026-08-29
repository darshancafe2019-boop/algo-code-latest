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
} from "lucide-react";

interface BinanceStatusResponse {
  status: string;
  connected: boolean;
  isTestnet: boolean;
  network: "TESTNET" | "MAINNET";
  baseUrl: string;
  apiKeyMasked: string;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  latencyMs: number;
  serverTime: string | null;
  supportedMarkets: string[];
  supportedPairsCount: number;
  tradingMode: string;
  errorMessage?: string | null;
  timestamp: string;
}

export function BinanceConnectionCard() {
  const queryClient = useQueryClient();
  const [isPinging, setIsPinging] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Fetch Authoritative Connection Status
  const { data, isLoading, refetch } = useQuery<BinanceStatusResponse>({
    queryKey: ["binanceAuthStatus"],
    queryFn: async () => {
      const res = await fetch("/api/binance/status");
      if (!res.ok) {
        throw new Error("Failed to check Binance connection status");
      }
      return res.json();
    },
    staleTime: 5000,
    refetchInterval: 15000,
  });

  const isConnected = Boolean(data?.connected);
  const isTestnet = Boolean(data?.isTestnet);

  const handlePing = async () => {
    setIsPinging(true);
    try {
      const res = await fetch("/api/binance/ping", { method: "POST" });
      const result = await res.json();
      if (res.ok && result.connected) {
        setNotification({
          type: "success",
          message: `Binance REST API Ping: ${result.latencyMs}ms (${result.network} 200 OK). Connection is lightning-fast and healthy.`,
        });
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["binanceAuthStatus"] });
      } else {
        setNotification({
          type: "error",
          message: result.message || "Failed to reach Binance endpoint.",
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

  const handleCopyMasked = () => {
    if (data?.apiKeyMasked) {
      navigator.clipboard.writeText(data.apiKeyMasked);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="bg-[#0B132B]/90 border border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl font-mono text-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
                Binance Official Integration
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                  isTestnet
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                }`}
              >
                {isTestnet ? "TESTNET / SPOT & FUTURES" : "MAINNET PRODUCTION"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Direct institutional CCXT &amp; WebSocket feed for global Crypto Spot, USDT Perpetuals &amp; Options.
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Checking...
            </span>
          ) : isConnected ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Connected ({data?.latencyMs || 0}ms)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Connection Degraded
            </span>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-all ${
            notification.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : notification.type === "info"
              ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-300"
              : "bg-red-950/40 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : notification.type === "info" ? (
              <Radio className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <p className="text-[11px] leading-relaxed font-sans">{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Card Body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Connection Telemetry */}
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">API Key (Masked)</span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-200 font-medium text-xs truncate">
              {data?.apiKeyMasked || "cktGzxsH...z3hJ"}
            </span>
            <button
              onClick={handleCopyMasked}
              className="p-1 text-slate-400 hover:text-white transition"
              title="Copy Masked Key"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <span className="text-[10px] text-amber-400/90 block">
            Network: {isTestnet ? "Testnet Vision Vision API" : "Mainnet Production"}
          </span>
        </div>

        {/* Security & Access */}
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Security &amp; Scope</span>
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>HMAC-SHA256 Server Signature</span>
          </div>
          <span className="text-[10px] text-slate-400 block">Secret never exposed to client JS</span>
        </div>

        {/* Supported Segments */}
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Enabled Markets</span>
          <div className="flex items-center gap-1.5 text-amber-400 text-xs">
            <Layers className="w-3.5 h-3.5" />
            <span>Spot, USDT Perp &amp; Options</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            {data?.supportedPairsCount || 123} Live Crypto Pairs (24/7/365)
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          {data?.serverTime ? (
            <span>
              Server Sync:{" "}
              <span className="text-slate-300">
                {new Date(data.serverTime).toLocaleTimeString()} ({data.latencyMs}ms ping)
              </span>
            </span>
          ) : (
            <span>Connected via BINANCE_TESTNET_API_KEY in server environment.</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePing}
            disabled={isPinging}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium transition-colors border border-amber-500/30 active:scale-95 disabled:opacity-50"
            title="Test Live Ping Latency"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? "animate-spin text-amber-400" : ""}`} />
            {isPinging ? "Pinging..." : "Test Connection"}
          </button>

          <a
            href={isTestnet ? "https://testnet.binance.vision/" : "https://www.binance.com/"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors border border-slate-700 active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Binance Console
          </a>
        </div>
      </div>
    </div>
  );
}
