"use client";

import React from "react";
import {
  Activity,
  Radio,
  Database,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Server,
  RefreshCw,
} from "lucide-react";

interface ProviderSystemHealthCardProps {
  providerName?: string;
  latencyMs?: number;
  gapCount?: number;
  reconnectCount?: number;
  rateLimitUsed?: number;
  rateLimitTotal?: number;
  dbStatus?: string;
  clockDriftMs?: number;
}

export function ProviderSystemHealthCard({
  providerName = "Binance Futures (CCXT Direct)",
  latencyMs = 14.5,
  gapCount = 0,
  reconnectCount = 0,
  rateLimitUsed = 34,
  rateLimitTotal = 1200,
  dbStatus = "HEALTHY (SQLite WAL)",
  clockDriftMs = 1.2,
}: ProviderSystemHealthCardProps) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl font-sans select-none space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--theme-text-primary)] uppercase tracking-wider">
              Data Provider & System Health
            </h3>
            <p className="text-[11px] text-[var(--theme-text-secondary)] mt-0.5 font-mono">
              Live WebSocket telemetry and storage engine state.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> ALL FEEDS HEALTHY
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
        <div className="p-2.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)]">
          <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Provider</span>
          <span className="font-bold text-[var(--theme-text-primary)] text-[11px] truncate block mt-0.5">
            {providerName}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)]">
          <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">WebSocket Latency</span>
          <span className="font-bold text-[var(--theme-profit)] tabular-nums text-sm">
            {latencyMs.toFixed(1)}ms
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)]">
          <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Rate Limit Used</span>
          <span className="font-bold text-[var(--theme-text-primary)] tabular-nums text-sm">
            {rateLimitUsed} / {rateLimitTotal} <span className="text-[10px] text-[var(--theme-text-muted)]">req/m</span>
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)]">
          <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Database Integrity</span>
          <span className="font-bold text-[var(--theme-accent)] text-[11px] block mt-0.5">
            {dbStatus}
          </span>
        </div>
      </div>
    </div>
  );
}
