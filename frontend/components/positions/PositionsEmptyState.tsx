"use client";

import React from "react";
import {
  Layers,
  Radio,
  Bot,
  Search,
  PlusCircle,
  TrendingUp,
  History,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { HydratedTimestamp } from "@/components/common/HydratedTimestamp";

interface PositionsEmptyStateProps {
  executionMode: "PAPER" | "LIVE";
  lastScanTime?: string;
  instrumentsCount?: number;
}

export function PositionsEmptyState({
  executionMode,
  lastScanTime,
  instrumentsCount = 628,
}: PositionsEmptyStateProps) {
  const router = useRouter();
  const isLive = executionMode === "LIVE";

  return (
    <div className="p-6 sm:p-8 rounded-xl bg-[#0A1422] border border-[#1A2A3F] shadow-sm font-sans select-none space-y-5">
      {/* Top Strip: Status & Readiness Checklist */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#122033] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-xl bg-[#0D1727] border border-[#1A2A3F] text-[#52627A] shadow-inner">
            <Layers className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#F7FAFC]">
              No Open {isLive ? "Live Capital" : "Paper Simulated"} Positions
            </h2>
            <p className="text-xs text-[#7C8CA3] mt-0.5 max-w-xl">
              Execution OMS is armed and continuously scanning active market universes for risk-approved trade setups.
            </p>
          </div>
        </div>

        {/* Readiness Checklist */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-[#0D1727] border border-[#1A2A3F] flex items-center gap-1.5 text-[#00E890] shadow-sm">
            <Radio className="h-3 w-3 animate-pulse" />
            <span className="text-xs font-semibold">Feed: Direct 12ms</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#0D1727] border border-[#1A2A3F] flex items-center gap-1.5 text-[#00E890] shadow-sm">
            <CheckCircle2 className="h-3 w-3" />
            <span className="text-xs font-semibold">Ledger: Synced</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#0D1727] border border-[#1A2A3F] flex items-center gap-1.5 text-[#19C5FF] shadow-sm">
            <Bot className="h-3 w-3" />
            <span className="text-xs font-semibold">Risk Gates: Armed</span>
          </div>
        </div>
      </div>

      {/* Middle: Scan Telemetry */}
      <div className="p-3.5 rounded-lg bg-[#0D1727] border border-[#1A2A3F] flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[#7C8CA3]">
          <Clock className="h-3.5 w-3.5 text-[#19C5FF] shrink-0" />
          <span>
            Universe Scanner: <strong className="text-[#F7FAFC]">{instrumentsCount} instruments</strong> analyzed. 0 risk-approved triggers in pipeline.
          </span>
        </div>
        <span className="text-xs text-[#52627A] hidden sm:inline">
          {lastScanTime ? <>Last scan: <HydratedTimestamp timestamp={lastScanTime} /></> : "Continuous Scan Active"}
        </span>
      </div>

      {/* Bottom: 5 Safe Operator Action Shortcuts */}
      <div className="pt-1">
        <span className="text-xs uppercase font-semibold text-[#52627A] tracking-wider block mb-2.5">
          Safe Operator Quick Actions
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* 1. Open Scanner */}
          <button
            onClick={() => router.push("/scanner")}
            className="p-3 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] hover:border-[#19C5FF] text-[#7C8CA3] hover:text-[#19C5FF] border border-[#1A2A3F] transition flex items-center justify-center gap-2 text-xs font-semibold group shadow-sm"
          >
            <Search className="h-4 w-4 text-[#19C5FF] group-hover:scale-110 transition-transform" />
            <span>Open Scanner</span>
          </button>

          {/* 2. Create Quick Trade */}
          <button
            onClick={() => router.push("/charts")}
            className="p-3 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] hover:border-[#00E890] text-[#7C8CA3] hover:text-[#00E890] border border-[#1A2A3F] transition flex items-center justify-center gap-2 text-xs font-semibold group shadow-sm"
          >
            <PlusCircle className="h-4 w-4 text-[#00E890] group-hover:scale-110 transition-transform" />
            <span>Terminal Trade</span>
          </button>

          {/* 3. Manage Bots */}
          <button
            onClick={() => router.push("/bots")}
            className="p-3 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] hover:border-[#19C5FF] text-[#7C8CA3] hover:text-[#19C5FF] border border-[#1A2A3F] transition flex items-center justify-center gap-2 text-xs font-semibold group shadow-sm"
          >
            <Bot className="h-4 w-4 text-[#19C5FF] group-hover:scale-110 transition-transform" />
            <span>Fleet Bots</span>
          </button>

          {/* 4. Strategy Signals */}
          <button
            onClick={() => router.push("/strategies")}
            className="p-3 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] hover:border-[#F59E0B] text-[#7C8CA3] hover:text-[#F59E0B] border border-[#1A2A3F] transition flex items-center justify-center gap-2 text-xs font-semibold group shadow-sm"
          >
            <TrendingUp className="h-4 w-4 text-[#F59E0B] group-hover:scale-110 transition-transform" />
            <span>Signals</span>
          </button>

          {/* 5. Trade Journal */}
          <button
            onClick={() => router.push("/trade-journal")}
            className="p-3 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] hover:border-[#19C5FF] text-[#7C8CA3] hover:text-[#19C5FF] border border-[#1A2A3F] transition flex items-center justify-center gap-2 text-xs font-semibold group col-span-2 sm:col-span-1 shadow-sm"
          >
            <History className="h-4 w-4 text-[#52627A] group-hover:scale-110 transition-transform" />
            <span>Journal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
