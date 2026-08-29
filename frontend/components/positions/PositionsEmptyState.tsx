"use client";

import React from "react";
import {
  Layers,
  Radio,
  ShieldCheck,
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
    <div className="p-5 sm:p-6 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl font-sans select-none space-y-4">
      {/* Top Strip: Status & Readiness Checklist */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[var(--theme-border-subtle)] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-muted)]">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--theme-text-primary)]">
              No Open {isLive ? "Live" : "Paper"} Positions
            </h2>
            <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5">
              Trading engine is armed and monitoring the market universe for high-confluence entry setups.
            </p>
          </div>
        </div>

        {/* Readiness Checklist */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs font-mono">
          <div className="px-2.5 py-1 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex items-center gap-1.5 text-[var(--theme-profit)]">
            <Radio className="h-3 w-3 animate-pulse" />
            <span className="text-[11px]">Feed: Direct</span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex items-center gap-1.5 text-[var(--theme-profit)]">
            <CheckCircle2 className="h-3 w-3" />
            <span className="text-[11px]">Ledger: Sync</span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex items-center gap-1.5 text-[var(--theme-accent)]">
            <Bot className="h-3 w-3" />
            <span className="text-[11px]">Engine: Armed</span>
          </div>
        </div>
      </div>

      {/* Middle: Why No Trade & Scan Telemetry */}
      <div className="p-3 rounded-xl bg-[var(--theme-elevated)]/60 border border-[var(--theme-border-subtle)] flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-[var(--theme-text-secondary)]">
          <Clock className="h-3.5 w-3.5 text-[var(--theme-accent)] shrink-0" />
          <span>
            Universe Scan: <strong className="text-[var(--theme-text-primary)]">{instrumentsCount} instruments</strong> analyzed. 0 risk-approved confluence triggers.
          </span>
        </div>
        <span className="text-[10px] text-[var(--theme-text-muted)] hidden sm:inline">
          {lastScanTime ? <>Last scan: <HydratedTimestamp timestamp={lastScanTime} /></> : "Continuous Scan Active"}
        </span>
      </div>

      {/* Bottom: 5 Safe Action Shortcuts */}
      <div className="pt-1">
        <span className="text-[10px] uppercase font-bold text-[var(--theme-text-muted)] tracking-wider block mb-2 font-mono">
          Safe Operator Actions
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* 1. Open Scanner */}
          <button
            onClick={() => router.push("/scanner")}
            className="p-2.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] hover:border-[var(--theme-accent)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] transition flex items-center justify-center gap-1.5 text-xs font-bold font-mono group"
          >
            <Search className="h-3.5 w-3.5 text-[var(--theme-accent)] group-hover:scale-110 transition-transform" />
            <span>Open Scanner</span>
          </button>

          {/* 2. Create Paper Trade */}
          <button
            onClick={() => router.push("/charts")}
            className="p-2.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] hover:border-[var(--theme-accent)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] transition flex items-center justify-center gap-1.5 text-xs font-bold font-mono group"
          >
            <PlusCircle className="h-3.5 w-3.5 text-[var(--theme-profit)] group-hover:scale-110 transition-transform" />
            <span>Quick Trade</span>
          </button>

          {/* 3. Start Bot Instance */}
          <button
            onClick={() => router.push("/bots")}
            className="p-2.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] hover:border-[var(--theme-accent)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] transition flex items-center justify-center gap-1.5 text-xs font-bold font-mono group"
          >
            <Bot className="h-3.5 w-3.5 text-[var(--theme-accent)] group-hover:scale-110 transition-transform" />
            <span>Manage Bots</span>
          </button>

          {/* 4. Strategy Signals */}
          <button
            onClick={() => router.push("/strategies")}
            className="p-2.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] hover:border-[var(--theme-accent)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] transition flex items-center justify-center gap-1.5 text-xs font-bold font-mono group"
          >
            <TrendingUp className="h-3.5 w-3.5 text-[var(--theme-warning)] group-hover:scale-110 transition-transform" />
            <span>Signals</span>
          </button>

          {/* 5. Trade History */}
          <button
            onClick={() => router.push("/trade-journal")}
            className="p-2.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] hover:border-[var(--theme-accent)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] transition flex items-center justify-center gap-1.5 text-xs font-bold font-mono group col-span-2 sm:col-span-1"
          >
            <History className="h-3.5 w-3.5 text-[var(--theme-text-muted)] group-hover:scale-110 transition-transform" />
            <span>Journal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
