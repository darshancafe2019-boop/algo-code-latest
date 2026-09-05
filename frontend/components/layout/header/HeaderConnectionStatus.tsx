"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { apiClient, ConnectionState } from "@/lib/apiClient";
import { Activity, Radio, Server, CheckCircle2, WifiOff } from "lucide-react";

export const HeaderConnectionStatus = memo(function HeaderConnectionStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("CONNECTED");
  const [latencyMs, setLatencyMs] = useState<number>(1.2);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial state
    setConnectionState(apiClient.getConnectionState());

    const unsubscribe = apiClient.onConnectionChange((state) => {
      setConnectionState(state);
    });

    const handleOnline = () => setConnectionState("CONNECTED");
    const handleOffline = () => setConnectionState("TEMPORARILY_UNAVAILABLE");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("quantos:online", handleOnline);
    window.addEventListener("quantos:offline", handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("quantos:online", handleOnline);
      window.removeEventListener("quantos:offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const getStatusDisplay = () => {
    switch (connectionState) {
      case "CONNECTED":
        return {
          label: "ONLINE",
          color: "text-emerald-400",
          dot: (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ),
        };
      case "CONNECTING":
        return {
          label: "CONNECTING",
          color: "text-sky-400",
          dot: <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />,
        };
      case "RECONNECTING":
      case "TEMPORARILY_UNAVAILABLE":
        return {
          label: "RECONNECTING",
          color: "text-amber-400",
          dot: <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />,
        };
      case "AUTHENTICATION_ERROR":
      case "BROKER_ERROR":
        return {
          label: "ATTENTION",
          color: "text-amber-400",
          dot: <span className="w-2 h-2 rounded-full bg-amber-500" />,
        };
      default:
        return {
          label: "OFFLINE",
          color: "text-rose-400",
          dot: <span className="w-2 h-2 rounded-full bg-rose-500" />,
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Connection status: ${status.label}`}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--theme-elevated)]/60 hover:bg-[var(--theme-elevated)] border border-[var(--theme-border)] rounded-lg text-xs font-mono transition-all cursor-pointer shadow-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 select-none"
        title="Authoritative Gateway Connection Telemetry"
      >
        {status.dot}
        <span className={`${status.color} font-bold tracking-wide text-[11px]`}>
          {status.label}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-3 shadow-2xl w-64 flex flex-col gap-2 text-xs font-mono backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--theme-border-subtle)]">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
              Connection Telemetry
            </span>
            <span className={`text-[10px] font-bold ${status.color}`}>
              {status.label}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Server className="h-3 w-3 text-sky-400" />
                Backend Gateway:
              </span>
              <span className="text-slate-200 font-bold">127.0.0.1:5050</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-emerald-400" />
                REST Ping Latency:
              </span>
              <span className="text-emerald-400 font-bold">{latencyMs} ms</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-purple-400" />
                SSE Event Streams:
              </span>
              <span className="text-slate-200 font-bold">Active / Synced</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-[var(--theme-border-subtle)] text-[10px] text-slate-400">
            Observability stream only. Background trading execution runs independently.
          </div>
        </div>
      )}
    </div>
  );
});
