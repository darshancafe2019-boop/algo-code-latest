"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AlertTriangle, RefreshCw, WifiOff, ShieldAlert, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

export function BackendAvailabilityBanner() {
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<number>(Date.now());
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleOffline = (e: any) => {
      setIsOffline(true);
      setLastOnlineTime(apiClient.getLastConnectedTime() || Date.now());
    };

    const handleOnline = () => {
      setIsOffline(false);
      setIsRetrying(false);
      setRetryNotice(null);
    };

    window.addEventListener("quantos:offline", handleOffline);
    window.addEventListener("quantos:online", handleOnline);

    if (apiClient.isOffline()) {
      setIsOffline(true);
      setLastOnlineTime(apiClient.getLastConnectedTime());
    }

    return () => {
      window.removeEventListener("quantos:offline", handleOffline);
      window.removeEventListener("quantos:online", handleOnline);
    };
  }, []);

  const handleManualRetry = useCallback(async () => {
    setIsRetrying(true);
    setRetryNotice("Probing engine health...");
    const success = await apiClient.probeHealth();
    if (success) {
      apiClient.resetCircuit();
      setIsOffline(false);
      setIsRetrying(false);
      setRetryNotice(null);
    } else {
      setIsRetrying(false);
      setRetryNotice("Engine not ready yet. Retrying automatically...");
      setTimeout(() => setRetryNotice(null), 3000);
    }
  }, []);

  if (!isOffline) return null;

  const timeAgoSec = Math.max(1, Math.round((Date.now() - lastOnlineTime) / 1000));

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 w-full bg-gradient-to-r from-rose-950/95 via-amber-950/95 to-rose-950/95 border-b border-rose-500/40 text-white px-4 py-2.5 shadow-2xl backdrop-blur-md transition-all font-mono text-xs"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
            <WifiOff className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-rose-300 text-xs tracking-wide">
                BACKEND UNAVAILABLE — RECONNECTING SAFELY
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-900/60 text-rose-200 border border-rose-500/30">
                Fail-Closed Protection Active
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans">
              All trading execution and polling are temporarily paused to prevent request storms. Last connected {timeAgoSec}s ago.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {retryNotice && (
            <span className="text-[11px] text-amber-300 animate-pulse hidden sm:inline">
              {retryNotice}
            </span>
          )}
          <button
            onClick={handleManualRetry}
            disabled={isRetrying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg hover:shadow-rose-600/30 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
            <span>{isRetrying ? "Checking..." : "Retry Now"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
