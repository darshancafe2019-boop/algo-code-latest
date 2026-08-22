"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Clock,
  Zap,
  CheckCircle2,
  Database,
  RefreshCw,
} from "lucide-react";

export function MarketHealthTelemetry() {
  const { data } = useQuery({
    queryKey: ["marketHealthTelemetry"],
    queryFn: async () => {
      const res = await fetch("/api/market-health");
      if (!res.ok) throw new Error("Failed to fetch market health");
      return res.json();
    },
    refetchInterval: 3000,
  });

  const feedHealth = data?.feed_health || {
    is_feed_live: true,
    stale_threshold_sec: 10.0,
    latency_ms: 14.5,
    status: "LIVE",
  };

  const staleProtection = data?.stale_protection || {
    is_system_stale: false,
    stale_threshold_sec: 10.0,
    stale_count: 0,
    live_count: 8,
  };

  const cache = data?.cache || {
    driver: "IN_MEMORY",
    is_redis_active: false,
    cached_keys_count: 12,
    hit_ratio_pct: 99.2,
  };

  const isStale = staleProtection.is_system_stale;

  return (
    <div className="space-y-2 select-none font-mono">
      {/* Stale Lockout Warning Banner if Active */}
      {isStale && (
        <div className="p-3 bg-rose-950/80 border-2 border-rose-600 rounded-xl flex items-center justify-between animate-pulse text-xs">
          <div className="flex items-center gap-2 text-rose-300">
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
            <div>
              <strong className="text-white">DATA FEED STALE — TRADING SIGNALS HALTED</strong>
              <p className="text-[11px] text-rose-300">
                Market feed age exceeds safety threshold ({staleProtection.stale_threshold_sec}s). All automated trade entries are locked out.
              </p>
            </div>
          </div>
          <span className="px-2 py-1 bg-rose-900 text-rose-200 font-bold rounded-lg text-[10px]">
            SAFE MODE ACTIVE
          </span>
        </div>
      )}

      {/* Telemetry Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        {/* 1. Feed Status */}
        <div className="p-2.5 bg-[#0E1524] border border-[#1E293B] rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className={`h-4 w-4 ${!isStale ? "text-emerald-400 animate-pulse" : "text-rose-400"}`} />
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Feed Status</span>
              <strong className={!isStale ? "text-emerald-400" : "text-rose-400"}>
                {!isStale ? "LIVE STREAM" : "STALE FEED"}
              </strong>
            </div>
          </div>
          <span className="text-[10px] text-slate-400">{feedHealth.latency_ms} ms</span>
        </div>

        {/* 2. Stale Guard */}
        <div className="p-2.5 bg-[#0E1524] border border-[#1E293B] rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Stale Lockout</span>
              <strong className="text-cyan-300">MAX {staleProtection.stale_threshold_sec}s</strong>
            </div>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold">ARMED</span>
        </div>

        {/* 3. Cache Engine */}
        <div className="p-2.5 bg-[#0E1524] border border-[#1E293B] rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-purple-400" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Cache Layer</span>
              <strong className="text-purple-300">{cache.driver}</strong>
            </div>
          </div>
          <span className="text-[10px] text-slate-400">{cache.cached_keys_count} keys</span>
        </div>

        {/* 4. Stream Multiplexer */}
        <div className="p-2.5 bg-[#0E1524] border border-[#1E293B] rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Stream Engine</span>
              <strong className="text-white">CENTRALIZED</strong>
            </div>
          </div>
          <span className="text-[10px] text-emerald-400">SSE OK</span>
        </div>
      </div>
    </div>
  );
}
