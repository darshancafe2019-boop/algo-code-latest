"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Radio, Activity, Link2, ShieldAlert, Zap } from "lucide-react";
import { ProviderCatalogResponse } from "@/types/provider";
import { ProviderDropdownPanel } from "./ProviderDropdownPanel";

export function ProviderHeaderSelector() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: catalog } = useQuery<ProviderCatalogResponse>({
    queryKey: ["providersCatalog"],
    queryFn: async () => {
      const res = await fetch("/api/providers");
      if (!res.ok) return null;
      return await res.json();
    },
    staleTime: 5000,
    refetchInterval: 8000,
    refetchOnWindowFocus: false,
  });

  const activeMdId = catalog?.active_roles?.marketDataProvider || "dhan";
  const activeExecId = catalog?.active_roles?.executionBroker || "dhan";

  const primaryProvider = catalog?.providers?.find((p) => p.id === activeMdId) || {
    id: "dhan",
    name: "Dhan HQ",
    logo: "🇮🇳",
    markets: ["NSE", "BSE"],
    assetClasses: ["Equity", "F&O"],
    connectionState: "CONNECTED",
  };

  const isDifferentExec = activeExecId !== activeMdId;
  const execProvider = isDifferentExec
    ? catalog?.providers?.find((p) => p.id === activeExecId)
    : null;

  const connectedCount = catalog?.connected_count || 0;
  const totalCount = catalog?.total_count || 14;

  const getStatusColor = (state?: string) => {
    switch (state) {
      case "LIVE":
      case "CONNECTED":
        return {
          badge: "bg-emerald-950/80 text-emerald-400 border-emerald-800/80",
          dot: "bg-emerald-400 animate-pulse",
          text: "LIVE",
        };
      case "CONNECTING":
      case "RECONNECTING":
        return {
          badge: "bg-amber-950/80 text-amber-400 border-amber-800/80",
          dot: "bg-amber-400 animate-spin",
          text: "RECONNECTING",
        };
      case "STALE":
        return {
          badge: "bg-amber-950/80 text-amber-400 border-amber-800/80",
          dot: "bg-amber-400",
          text: "STALE",
        };
      case "AUTH_EXPIRED":
        return {
          badge: "bg-red-950/80 text-red-400 border-red-800/80",
          dot: "bg-red-400",
          text: "AUTH EXPIRED",
        };
      case "ERROR":
        return {
          badge: "bg-red-950/80 text-red-400 border-red-800/80",
          dot: "bg-red-400",
          text: "ERROR",
        };
      case "NOT_CONFIGURED":
      default:
        return {
          badge: "bg-slate-900 text-slate-400 border-slate-700",
          dot: "bg-slate-500",
          text: "NOT CONFIGURED",
        };
    }
  };

  const status = getStatusColor(primaryProvider.connectionState);

  return (
    <div className="relative flex items-center gap-2 font-sans">
      {/* Active Provider Pill */}
      <div
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="h-[40px] flex items-center gap-2 px-3 rounded-lg bg-[#0A1422] hover:bg-[#101B2D] border border-[#12304A] hover:border-[#22D3EE]/50 cursor-pointer transition shadow-xs select-none"
        title="Active Market Data Provider and Gateway Health"
      >
        {/* Provider Icon / Name */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">{primaryProvider.logo}</span>
          <span className="text-xs font-bold text-[#F8FAFC] tracking-tight">
            {primaryProvider.name}
          </span>
        </div>

        {/* Live Status Indicator */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold ${status.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          <span>{status.text}</span>
        </div>

        {/* Markets / Asset Class (hidden on small screens) */}
        <div className="hidden lg:flex items-center gap-1 text-[10px] text-[#7D8EA5] font-medium border-l border-[#1A2A3F] pl-2">
          <span>{primaryProvider.markets.slice(0, 2).join(" / ")}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">{primaryProvider.assetClasses[0] || "All"}</span>
        </div>

        {/* Optional Execution Broker Pill if decoupled */}
        {execProvider && (
          <div className="hidden xl:flex items-center gap-1 text-[10px] bg-[#06101B] border border-emerald-800/60 px-1.5 py-0.5 rounded text-emerald-300 font-mono">
            <span>Exec:</span>
            <span>{execProvider.name}</span>
          </div>
        )}
      </div>

      {/* Providers Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="h-[40px] flex items-center gap-1.5 px-3 rounded-lg bg-[#0A1422] hover:bg-[#101B2D] border border-[#12304A] hover:border-[#22D3EE]/50 text-[#22D3EE] text-xs font-bold transition shadow-xs cursor-pointer"
        title="Open Multi-Broker & Provider Registry Selector"
      >
        <Link2 className="h-3.5 w-3.5 text-[#22D3EE]" />
        <span className="hidden sm:inline tracking-wider">PROVIDERS</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/30">
          {connectedCount}/{totalCount}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#7D8EA5] transition-transform duration-200 ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Panel Modal */}
      <ProviderDropdownPanel
        isOpen={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
      />
    </div>
  );
}
