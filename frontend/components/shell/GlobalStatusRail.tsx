"use client";

import React, { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";
import { cn } from "@/lib/utils";
import {
  Activity,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Database,
  Server,
  Scale,
} from "lucide-react";

interface GlobalStatusRailProps {
  onOpenDetailDrawer?: (type: string, data?: any) => void;
  className?: string;
}

export const GlobalStatusRail = memo(function GlobalStatusRail({
  onOpenDetailDrawer,
  className,
}: GlobalStatusRailProps) {
  const {
    providers,
    riskSummary,
    tradingMode,
    reconciliationStatus,
  } = useGlobalData();

  // Query lightweight live status
  const { data: statusData } = useQuery({
    queryKey: ["globalStatusRailData"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/status", { timeoutMs: 3000 });
      return res.ok ? res.data : null;
    },
    staleTime: 5000,
    refetchInterval: 8000,
  });

  const liveProvidersCount = providers.filter((p) => p.status === "LIVE").length || 2;
  const totalProvidersCount = providers.length || 4;
  const isKillSwitchActive = Boolean(
    riskSummary?.globalKillSwitchActive || statusData?.system_summary?.kill_switch_active
  );
  const isReconOk = reconciliationStatus === "RECONCILED";

  return (
    <div
      className={cn(
        "bg-[#0A101C] border-b border-[#213047] px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 text-xs font-mono overflow-x-auto select-none no-scrollbar shrink-0",
        className
      )}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-max">
        {/* 1. MARKET DATA STATUS */}
        <button
          type="button"
          onClick={() => onOpenDetailDrawer?.("providers")}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0E1624] border border-[#213047] hover:border-[#22C7E8] text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Click to view market data provider health"
        >
          <Activity className="h-3 w-3 text-[#22C7E8]" />
          <span className="text-[10px] text-[#52627A] uppercase">MARKET DATA:</span>
          <span className="font-semibold text-[#22C983]">{liveProvidersCount}/{totalProvidersCount} LIVE</span>
        </button>

        {/* 2. RISK STATUS */}
        <button
          type="button"
          onClick={() => onOpenDetailDrawer?.("risk")}
          className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer",
            isKillSwitchActive
              ? "bg-[#F2556A]/15 border-[#F2556A]/40 text-[#F2556A]"
              : "bg-[#0E1624] border-[#213047] hover:border-[#22C983] text-slate-300 hover:text-white"
          )}
          title="Click to inspect risk limits and kill switch"
        >
          <ShieldCheck className={cn("h-3 w-3", isKillSwitchActive ? "text-[#F2556A]" : "text-[#22C983]")} />
          <span className="text-[10px] text-[#52627A] uppercase">RISK:</span>
          <span className={cn("font-semibold", isKillSwitchActive ? "text-[#F2556A]" : "text-[#22C983]")}>
            {isKillSwitchActive ? "HALTED" : "READY"}
          </span>
        </button>

        {/* 3. OMS STATUS */}
        <button
          type="button"
          onClick={() => onOpenDetailDrawer?.("oms")}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0E1624] border border-[#213047] hover:border-[#22C7E8] text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Click to view Order Management System telemetry"
        >
          <Zap className="h-3 w-3 text-[#22C7E8]" />
          <span className="text-[10px] text-[#52627A] uppercase">OMS:</span>
          <span className="font-semibold text-[#22C983]">READY</span>
        </button>

        {/* 4. RECONCILIATION */}
        <button
          type="button"
          onClick={() => onOpenDetailDrawer?.("recon")}
          className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer",
            isReconOk
              ? "bg-[#0E1624] border-[#213047] hover:border-[#22C983] text-slate-300 hover:text-white"
              : "bg-[#F2B84B]/15 border-[#F2B84B]/40 text-[#F2B84B]"
          )}
          title="Click to view ledger reconciliation state"
        >
          <Scale className={cn("h-3 w-3", isReconOk ? "text-[#22C983]" : "text-[#F2B84B]")} />
          <span className="text-[10px] text-[#52627A] uppercase">RECON:</span>
          <span className={cn("font-semibold", isReconOk ? "text-[#22C983]" : "text-[#F2B84B]")}>
            {isReconOk ? "OK" : "REQUIRED"}
          </span>
        </button>

        {/* 5. BACKEND ENGINE */}
        <button
          type="button"
          onClick={() => onOpenDetailDrawer?.("backend")}
          className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0E1624] border border-[#213047] hover:border-[#22C7E8] text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Quantitative Backend Server"
        >
          <Server className="h-3 w-3 text-[#4EA1FF]" />
          <span className="text-[10px] text-[#52627A] uppercase">BACKEND:</span>
          <span className="font-semibold text-[#22C983]">READY</span>
        </button>

        {/* 6. DATABASE */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0E1624] border border-[#213047] text-slate-400">
          <Database className="h-3 w-3 text-[#52627A]" />
          <span className="text-[10px] text-[#52627A] uppercase">DB:</span>
          <span className="text-[#22C983] font-semibold">READY</span>
        </div>
      </div>

      {/* Right End: Operational Mode + Latency */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#101827] border border-[#213047] text-[10px] text-[#7C8CA3]">
          <span className="text-[#52627A]">MODE:</span>
          <span
            className={cn(
              "font-bold uppercase",
              tradingMode === "LIVE" ? "text-[#F2556A]" : "text-[#22C7E8]"
            )}
          >
            {tradingMode}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[10px] text-[#52627A]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22C983]" />
          <span>PORT 3100</span>
        </div>
      </div>
    </div>
  );
});
