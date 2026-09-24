"use client";

import React from "react";
import { ProviderHealthReport } from "../types/futures";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Activity, ShieldCheck, ShieldAlert } from "lucide-react";

interface ProviderHealthRailProps {
  providers?: ProviderHealthReport[];
  liveCount?: number;
  totalCount?: number;
  activeProviderFilter?: string;
  onSelectProvider?: (providerId: string) => void;
}

const KNOWN_PROVIDERS = [
  { id: "DHAN", name: "Dhan (NSE)", market: "INDIA", exchange: "NSE" },
  { id: "UPSTOX", name: "Upstox (NSE)", market: "INDIA", exchange: "NSE" },
  { id: "BINANCE_USDM", name: "Binance USD-M", market: "CRYPTO", exchange: "BINANCE" },
  { id: "BINANCE_COINM", name: "Binance COIN-M", market: "CRYPTO", exchange: "BINANCE" },
  { id: "DELTA", name: "Delta India", market: "CRYPTO", exchange: "DELTA" },
];

export function ProviderHealthRail({
  providers = [],
  liveCount = 0,
  totalCount = 5,
  activeProviderFilter = "ALL",
  onSelectProvider,
}: ProviderHealthRailProps) {
  // Index providers by ID
  const providerMap = React.useMemo(() => {
    const map = new Map<string, ProviderHealthReport>();
    for (const p of providers) {
      const key = (p.provider || "").toUpperCase().replace("_API", "");
      map.set(key, p);
      if (key.includes("DHAN")) map.set("DHAN", p);
      if (key.includes("UPSTOX")) map.set("UPSTOX", p);
      if (key.includes("BINANCE_USDM") || key === "BINANCE") map.set("BINANCE_USDM", p);
      if (key.includes("BINANCE_COINM")) map.set("BINANCE_COINM", p);
      if (key.includes("DELTA")) map.set("DELTA", p);
    }
    return map;
  }, [providers]);

  const effectiveLive = providers.filter((p) => p.status === "LIVE" && p.provider !== "PAPER_SIM").length;
  const effectiveTotal = providers.filter((p) => p.provider !== "PAPER_SIM").length || 5;

  return (
    <div className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-[#080E1C] border border-slate-800/90 rounded-xl font-mono text-xs select-none shadow-md overflow-x-auto">
      {/* Left: Overall Aggregated Indicator */}
      <div className="flex items-center gap-2 flex-shrink-0 border-r border-slate-800 pr-3">
        <span className="text-[10px] uppercase font-bold text-slate-400">Gateway Feeds:</span>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${
            effectiveLive >= 2
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
              : effectiveLive > 0
              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
              : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              effectiveLive >= 2 ? "bg-emerald-400 animate-pulse" : effectiveLive > 0 ? "bg-amber-400" : "bg-rose-400"
            }`}
          />
          LIVE {effectiveLive}/{effectiveTotal}
        </span>
      </div>

      {/* Center: Individual Provider Health Badges (Isolated) */}
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        {KNOWN_PROVIDERS.map((kp) => {
          const report = providerMap.get(kp.id);
          const rawStatus = report?.status || "NOT_CONFIGURED";
          const isSelected = activeProviderFilter.toUpperCase().includes(kp.id);

          // Canonical status normalization
          let badgeClass = "bg-slate-900 text-slate-400 border-slate-800";
          let dotClass = "bg-slate-600";
          let statusText = "STANDBY";

          if (rawStatus === "LIVE") {
            badgeClass = "bg-emerald-950/40 text-emerald-300 border-emerald-500/30";
            dotClass = "bg-emerald-400";
            statusText = report?.last_tick_age_ms ? `${report.last_tick_age_ms}ms` : "LIVE";
          } else if (rawStatus === "AUTH_REQUIRED" || rawStatus === "TOKEN_EXPIRED") {
            badgeClass = "bg-amber-950/40 text-amber-300 border-amber-500/30";
            dotClass = "bg-amber-400";
            statusText = "AUTH REQ";
          } else if (rawStatus === "MARKET_CLOSED") {
            badgeClass = "bg-slate-800/80 text-slate-300 border-slate-700";
            dotClass = "bg-slate-400";
            statusText = "MKT CLOSED";
          } else if (rawStatus === "CONNECTING" || rawStatus === "RECONNECTING") {
            badgeClass = "bg-cyan-950/40 text-cyan-300 border-cyan-500/30";
            dotClass = "bg-cyan-400 animate-ping";
            statusText = "RECONNECT";
          } else if (rawStatus === "STALE") {
            badgeClass = "bg-yellow-950/40 text-yellow-300 border-yellow-500/30";
            dotClass = "bg-yellow-400";
            statusText = "STALE";
          } else if (rawStatus === "ERROR" || rawStatus === "DISCONNECTED") {
            badgeClass = "bg-rose-950/40 text-rose-300 border-rose-500/30";
            dotClass = "bg-rose-400";
            statusText = "OFFLINE";
          }

          return (
            <button
              key={kp.id}
              type="button"
              onClick={() => onSelectProvider && onSelectProvider(kp.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-medium transition cursor-pointer flex-shrink-0 ${badgeClass} ${
                isSelected ? "ring-1 ring-cyan-400 font-bold" : "hover:brightness-125"
              }`}
              title={`${kp.name}: ${rawStatus}${report?.error_details ? ` (${report.error_details})` : ""}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
              <span className="font-semibold text-slate-200">{kp.name}</span>
              <span className="opacity-70 text-[9px]">[{statusText}]</span>
            </button>
          );
        })}
      </div>

      {/* Right: Security & Data Truth Guarantee Indicator */}
      <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-slate-500 flex-shrink-0 border-l border-slate-800 pl-3">
        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
        <span>Truth-in-Data Engine</span>
      </div>
    </div>
  );
}
