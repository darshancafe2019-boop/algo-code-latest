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
  Activity,
  BarChart3,
  TrendingUp,
  Globe2,
} from "lucide-react";
import { AlphaVantageStatusResponse } from "@/lib/alphavantage/types";

export function AlphaVantageConnectionCard() {
  const queryClient = useQueryClient();
  const [isPinging, setIsPinging] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Fetch Authoritative Connection Status
  const { data, isLoading, refetch } = useQuery<AlphaVantageStatusResponse>({
    queryKey: ["alphaVantageAuthStatus"],
    queryFn: async () => {
      const res = await fetch("/api/alphavantage/status");
      if (!res.ok) {
        throw new Error("Failed to check Alpha Vantage connection status");
      }
      return res.json();
    },
    staleTime: 5000,
    refetchInterval: 15000,
  });

  const isConnected = Boolean(data?.connected);
  const hasKey = Boolean(data?.hasApiKey);
  const isRateLimited = Boolean(data?.rateLimit?.isRateLimited);

  const handlePing = async () => {
    setIsPinging(true);
    setNotification(null);
    try {
      const res = await fetch("/api/alphavantage/ping", { method: "POST" });
      const result = await res.json();
      if (res.ok && result.success) {
        setNotification({
          type: "success",
          message: result.message || `Alpha Vantage Ping OK (${result.latencyMs}ms). Market feed is active.`,
        });
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["alphaVantageAuthStatus"] });
      } else {
        setNotification({
          type: "error",
          message: result.message || "Failed to reach Alpha Vantage endpoint. Check API key in .env.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: `Diagnostic ping error: ${err.message}`,
      });
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="bg-[#0B132B]/90 border border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl font-mono text-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
                Alpha Vantage Market Data Provider
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                MARKET DATA ONLY
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Server-side institutional market data provider for US Equities, Global Indices, Forex, Crypto & Technical Indicators.
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
              Connected (Live Feed)
            </span>
          ) : isRateLimited ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Rate Limited (Throttling)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              {hasKey ? "Standby" : "Not Configured"}
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
              : notification.type === "error"
              ? "bg-red-950/40 border-red-500/30 text-red-300"
              : "bg-blue-950/40 border-blue-500/30 text-blue-300"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
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

      {/* Card Body — 4 Telemetry Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. API Key Security */}
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Server Key Storage</span>
          <div className="flex items-center gap-1.5 text-slate-200">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono text-xs font-bold">{data?.apiKeyMasked || "••••••••"}</span>
          </div>
          <span className="text-[10px] text-slate-500 block font-sans">
            {hasKey ? "Key loaded securely from .env" : "Set ALPHA_VANTAGE_API_KEY in .env"}
          </span>
        </div>

        {/* 2. Rate Limit & Throttling */}
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Rate Limit Governor</span>
          <div className="flex items-center gap-1.5 text-slate-200 text-xs">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">
              {data?.rateLimit?.callsMadeThisMin || 0} / {data?.rateLimit?.maxCallsPerMin || 5} calls/min
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block font-sans">
            Automatic in-memory cache &amp; single-flight deduplication
          </span>
        </div>

        {/* 3. Coverage Segments */}
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Feed Coverage</span>
          <div className="flex items-center gap-1.5 text-blue-400 text-xs">
            <Layers className="w-3.5 h-3.5" />
            <span>US, Indian BSE, FX &amp; Crypto</span>
          </div>
          <span className="text-[10px] text-slate-500 block font-sans">
            Daily / Intraday Candles, Quotes &amp; Sentiment
          </span>
        </div>

        {/* 4. Execution Role Protection */}
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Execution Role</span>
          <div className="flex items-center gap-1.5 text-purple-400 text-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Market Data Only</span>
          </div>
          <span className="text-[10px] text-slate-500 block font-sans">
            Broker Orders: Binance / Upstox (Unchanged)
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-sans">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {hasKey
              ? "Alpha Vantage configured and guarded by server-side rate limiter."
              : "To activate live feeds, add ALPHA_VANTAGE_API_KEY to your local .env file."}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePing}
            disabled={isPinging || !hasKey}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-bold border border-blue-500/40 transition-colors disabled:opacity-50 active:scale-95 shadow-sm"
          >
            <Zap className={`w-3.5 h-3.5 ${isPinging ? "animate-spin text-blue-400" : ""}`} />
            <span>{isPinging ? "Testing..." : "Test Alpha Vantage Ping"}</span>
          </button>

          <a
            href="https://www.alphavantage.co/support/#api-key"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors border border-slate-700"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>API Docs</span>
          </a>
        </div>
      </div>
    </div>
  );
}
