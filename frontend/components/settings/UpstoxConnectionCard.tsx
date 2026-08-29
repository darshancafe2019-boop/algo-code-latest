"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  Radio,
  ExternalLink,
  RefreshCw,
  PowerOff,
  CheckCircle2,
  AlertCircle,
  X,
  TrendingUp,
  Clock,
  Layers,
} from "lucide-react";

interface UpstoxStatusResponse {
  status: string;
  connected: boolean;
  broker: string;
  userName?: string;
  userId?: string;
  email?: string;
  connectedAt?: string;
  message?: string;
  supportedMarkets?: string[];
}

export function UpstoxConnectionCard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Check URL search parameters for OAuth callback messages
  useEffect(() => {
    const upstoxParam = searchParams.get("upstox");
    const errorDesc = searchParams.get("error_description");

    if (upstoxParam === "connected") {
      setNotification({
        type: "success",
        message: "Upstox account connected successfully! Real Indian market data and trading enabled.",
      });
      // Invalidate queries to refresh status immediately
      queryClient.invalidateQueries({ queryKey: ["upstoxAuthStatus"] });
      queryClient.invalidateQueries({ queryKey: ["securityCredentialsList"] });
    } else if (upstoxParam === "error") {
      setNotification({
        type: "error",
        message: errorDesc || "Failed to authenticate with Upstox. Please verify your credentials and try again.",
      });
    }
  }, [searchParams, queryClient]);

  // Fetch Authoritative Connection Status
  const { data, isLoading, refetch } = useQuery<UpstoxStatusResponse>({
    queryKey: ["upstoxAuthStatus"],
    queryFn: async () => {
      const res = await fetch("/api/upstox/status");
      if (!res.ok) {
        throw new Error("Failed to check Upstox connection status");
      }
      return res.json();
    },
    staleTime: 5000,
    refetchInterval: 15000,
  });

  const isConnected = Boolean(data?.connected);

  const handleConnect = () => {
    window.location.href = "/api/upstox/login";
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Upstox? Live market feeds for Indian equities and F&O will be paused.")) {
      return;
    }
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/upstox/disconnect", { method: "POST" });
      const result = await res.json();
      if (res.ok) {
        setNotification({
          type: "success",
          message: "Upstox account disconnected safely.",
        });
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["securityCredentialsList"] });
      } else {
        setNotification({
          type: "error",
          message: result.message || "Failed to disconnect Upstox.",
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

  return (
    <div className="bg-[#0B132B]/90 border border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl font-mono text-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
                Upstox Official Integration
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                NSE / BSE / F&amp;O
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Authoritative OAuth2 connection for Indian stock market quotes and algorithmic execution.
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
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Disconnected
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
              : "bg-red-950/40 border-red-500/30 text-red-300"
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

      {/* Card Body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Connection Telemetry */}
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Account Name</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-200 font-medium text-xs truncate">
              {isConnected ? data?.userName || "Authorized Upstox Trader" : "Not Authenticated"}
            </span>
          </div>
          {isConnected && data?.userId && (
            <span className="text-[10px] text-slate-400 block">User ID: {data.userId}</span>
          )}
        </div>

        {/* Security & Access */}
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Security &amp; Scope</span>
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>OAuth2 Server-Side Encrypted</span>
          </div>
          <span className="text-[10px] text-slate-400 block">Tokens never exposed to browser</span>
        </div>

        {/* Supported Segments */}
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Enabled Markets</span>
          <div className="flex items-center gap-1.5 text-purple-400 text-xs">
            <Layers className="w-3.5 h-3.5" />
            <span>NSE Cash, Indices &amp; F&amp;O</span>
          </div>
          <span className="text-[10px] text-slate-400 block">Session: Mon-Fri 09:15-15:30 IST</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          {isConnected && data?.connectedAt ? (
            <span>
              Connected at:{" "}
              <span className="text-slate-300">
                {new Date(data.connectedAt).toLocaleString()}
              </span>
            </span>
          ) : (
            <span>Requires UPSTOX_API_KEY and UPSTOX_API_SECRET in environment.</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Connect Upstox
            </button>
          ) : (
            <>
              <button
                onClick={handleConnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors border border-slate-700 active:scale-95"
                title="Refresh OAuth Session Token"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reconnect
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-colors border border-red-500/30 disabled:opacity-50 active:scale-95"
              >
                <PowerOff className="w-3.5 h-3.5" />
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
