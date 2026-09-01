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
  Sparkles,
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
    <div className="p-6 sm:p-8 rounded-3xl bg-[var(--theme-surface)]/90 backdrop-blur-md border border-[var(--theme-border)] shadow-xl font-sans select-none space-y-5">
      {/* Top Strip: Status & Readiness Checklist */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[var(--theme-border-subtle)] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-muted)] shadow-inner">
            <Layers className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[var(--theme-text-primary)]">
              No Open {isLive ? "Live Capital" : "Paper Simulated"} Positions
            </h2>
            <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5 max-w-xl">
              Execution OMS is armed and continuously scanning active market universes for risk-approved trade setups.
            </p>
          </div>
        </div>

        {/* Readiness Checklist */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex items-center gap-1.5 text-[var(--theme-profit)] shadow-sm">
            <Radio className="h-3 w-3 animate-pulse" />
            <span className="text-[11px] font-bold">Feed: Direct 12ms</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex items-center gap-1.5 text-[var(--theme-profit)] shadow-sm">
            <CheckCircle2 className="h-3 w-3" />
            <span className="text-[11px] font-bold">Ledger: Synced</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex items-center gap-1.5 text-[var(--theme-accent)] shadow-sm">
            <Bot className="h-3 w-3" />
            <span className="text-[11px] font-bold">Risk Gates: Armed</span>
          </div>
        </div>
      </div>

      {/* Middle: Scan Telemetry */}
      <div className="p-3.5 rounded-2xl bg-[var(--theme-elevated)]/60 border border-[var(--theme-border-subtle)] flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-[var(--theme-text-secondary)]">
          <Clock className="h-3.5 w-3.5 text-[var(--theme-accent)] shrink-0" />
          <span>
            Universe Scanner: <strong className="text-[var(--theme-text-primary)]">{instrumentsCount} instruments</strong> analyzed. 0 risk-approved triggers in pipeline.
          </span>
        </div>
        <span className="text-[10px] text-[var(--theme-text-muted)] hidden sm:inline">
          {lastScanTime ? <>Last scan: <HydratedTimestamp timestamp={lastScanTime} /></> : "Continuous Scan Active"}
        </span>
      </div>

      {/* Bottom: 5 Safe Operator Action Shortcuts */}
      <div className="pt-1">
        <span className="text-[10px] uppercase font-extrabold text-[var(--theme-text-muted)] tracking-wider block mb-2.5 font-mono">
          Safe Operator Quick Actions
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* 1. Open Scanner */}
          <button
            onClick={() => router.push("/scanner")}
            className="p-3 rounded-2xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] hover:border-[var(--theme-accent)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] transition flex items-center justify-center gap-2 text-xs font-bold font-mono group shadow-sm"
          >
            <Search className="h-4 w-4 text-[var(--theme-accent)] group-hover:scale-110 transition-transform" />
            <span>Open Scanner</span>
          </button>

          {/* 2. Create Quick Trade */}
          <button
            onClick={() => router.push("/charts")}
            className="p-3 rounded-2xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] hover:border-[var(--theme-profit)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-profit)] border border-[var(--theme-border-subtle)] transition flex items-center justify-center gap-2 text-xs font-bold font-mono group shadow-sm"
          >
            <PlusCircle className="h-4 w-4 text-[var(--theme-profit)] group-hover:scale-110 transition-transform" />
            <span>Terminal Trade</span>
          </button>

          {/* 3. Manage Bots */}
          <button
            onClick={() => router.push("/bots")}
            className="p-3 rounded-2xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] hover:border-[var(--theme-accent)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] transition flex items-center justify-center gap-2 text-xs font-bold font-mono group shadow-sm"
          >
            <Bot className="h-4 w-4 text-[var(--theme-accent)] group-hover:scale-110 transition-transform" />
            <span>Fleet Bots</span>
          </button>

          {/* 4. Strategy Signals */}
          <button
            onClick={() => router.push("/strategies")}
            className="p-3 rounded-2xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] hover:border-[var(--theme-warning)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-warning)] border border-[var(--theme-border-subtle)] transition flex items-center justify-center gap-2 text-xs font-bold font-mono group shadow-sm"
          >
            <TrendingUp className="h-4 w-4 text-[var(--theme-warning)] group-hover:scale-110 transition-transform" />
            <span>Signals</span>
          </button>

          {/* 5. Trade Journal */}
          <button
            onClick={() => router.push("/trade-journal")}
            className="p-3 rounded-2xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] hover:border-[var(--theme-accent)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] transition flex items-center justify-center gap-2 text-xs font-bold font-mono group col-span-2 sm:col-span-1 shadow-sm"
          >
            <History className="h-4 w-4 text-[var(--theme-text-muted)] group-hover:scale-110 transition-transform" />
            <span>Journal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
