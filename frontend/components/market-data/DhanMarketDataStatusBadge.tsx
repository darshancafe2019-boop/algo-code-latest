"use client";

import React, { useState } from "react";
import { useMarketHealth } from "@/hooks/useMarketData";
import {
  Activity,
  Radio,
  Clock,
  Zap,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  X,
  Server,
  Layers,
} from "lucide-react";

export function DhanMarketDataStatusBadge() {
  const { data: health, isLoading } = useMarketHealth();
  const [showModal, setShowModal] = useState(false);

  const dhan = health?.dhan;
  const isLive = dhan?.connected && dhan?.authenticated && !dhan?.isStale;
  const isAuthFailed = dhan?.authStatus === "DHAN_AUTH_FAILED" || dhan?.authStatus === "TOKEN_EXPIRED";
  const isStale = health?.marketData?.stale;

  const badgeColor = isLive
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
    : isAuthFailed
    ? "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
    : isStale
    ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
    : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/20";

  const dotColor = isLive
    ? "bg-emerald-400 animate-pulse"
    : isAuthFailed
    ? "bg-rose-400"
    : isStale
    ? "bg-amber-400"
    : "bg-zinc-400";

  const label = isLive
    ? "DHAN LIVE"
    : isAuthFailed
    ? "DHAN AUTH FAILED"
    : isStale
    ? "DHAN STALE"
    : "DHAN DISCONNECTED";

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition-all cursor-pointer ${badgeColor}`}
        title="Click for Dhan Live Market Data Diagnostics"
      >
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        <span>{label}</span>
        {dhan?.latency ? <span className="opacity-70 text-[10px]">{dhan.latency}ms</span> : null}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 text-zinc-100 font-mono">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-sky-400 animate-pulse" />
                <h3 className="text-sm font-semibold tracking-wide text-zinc-100">
                  DHAN MARKET FEED DIAGNOSTICS
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center p-2 rounded bg-zinc-800/40">
                <span className="text-zinc-400">Connection Status</span>
                <span className={isLive ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {label}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-zinc-800/40">
                <span className="text-zinc-400">Authentication</span>
                <span className={dhan?.authenticated ? "text-emerald-400" : "text-rose-400"}>
                  {dhan?.authStatus || "UNKNOWN"}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-zinc-800/40">
                <span className="text-zinc-400">WebSocket Endpoint</span>
                <span className="text-zinc-300">wss://api-feed.dhan.co</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-zinc-800/40">
                <span className="text-zinc-400">Feed Latency</span>
                <span className="text-sky-400 font-semibold">{dhan?.latency ?? 0} ms</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-zinc-800/40">
                <span className="text-zinc-400">Packet Rate</span>
                <span className="text-zinc-300">{dhan?.packetRate ?? 0} ticks/sec</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-zinc-800/40">
                <span className="text-zinc-400">Total Ticks Received</span>
                <span className="text-zinc-300">{dhan?.ticksReceived ?? 0}</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-zinc-800/40">
                <span className="text-zinc-400">Last Received Tick</span>
                <span className="text-zinc-300">{dhan?.lastTickAt ? new Date(dhan.lastTickAt).toLocaleTimeString() : "None"}</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-zinc-800/40">
                <span className="text-zinc-400">Subscribed Instruments</span>
                <span className="text-zinc-300">{dhan?.subscribed ?? 0} symbols</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-zinc-800/40">
                <span className="text-zinc-400">Redis Cache Tier</span>
                <span className="text-zinc-400">{health?.redis?.mode || "In-Memory Fast Cache"}</span>
              </div>

              {dhan?.errorMessage && (
                <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                    <span>AUTH NOTICE</span>
                  </div>
                  {dhan.errorMessage}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
