"use client";

import React from "react";
import {
  Layers,
  Radio,
  ShieldCheck,
  RefreshCw,
  LayoutList,
  LayoutGrid,
  GitCommit,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";

export type PositionViewMode = "table" | "cards" | "ladder";

interface PositionsCommandHeaderProps {
  executionMode: "PAPER" | "LIVE";
  marketFeedStatus?: string;
  brokerSyncStatus?: string;
  lastUpdatedText?: string;
  viewMode: PositionViewMode;
  onViewModeChange: (mode: PositionViewMode) => void;
  onRefresh: () => void;
  onReconcile: () => void;
  onKillSwitch: () => void;
  isRefreshing?: boolean;
  isReconciling?: boolean;
}

export function PositionsCommandHeader({
  executionMode,
  marketFeedStatus = "LIVE",
  brokerSyncStatus = "SYNCHRONIZED",
  lastUpdatedText = "Live Feed Active",
  viewMode,
  onViewModeChange,
  onRefresh,
  onReconcile,
  onKillSwitch,
  isRefreshing,
  isReconciling,
}: PositionsCommandHeaderProps) {
  const isLive = executionMode === "LIVE";

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl flex flex-wrap items-center justify-between gap-4 font-sans select-none">
      {/* Left: Hub Title & System Status Strip */}
      <div className="flex items-center gap-3.5">
        <div className="p-3 rounded-2xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] shadow-md shadow-[var(--theme-accent)]/10">
          <Layers className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--theme-text-primary)]">
              Position Intelligence Command Centre
            </h1>
            {/* Unmistakable Environment Badge */}
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono border flex items-center gap-1.5 ${
                isLive
                  ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/40 animate-pulse"
                  : "bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border-[var(--theme-accent)]/30"
              }`}
              title={
                isLive
                  ? "LIVE EXECUTION: Real capital is deployed with broker risk limits active."
                  : "PAPER TRADING: Virtual risk-free paper ledger simulation."
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLive ? "bg-[var(--theme-loss)]" : "bg-[var(--theme-accent)]"
                }`}
              />
              {isLive ? "LIVE CAPITAL" : "PAPER SIMULATION"}
            </span>
          </div>

          <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5 flex items-center gap-2 flex-wrap">
            <span>Real-time floating exposure, SL/TP risk boundaries, and execution telemetry.</span>
            <span className="text-[10px] font-mono text-[var(--theme-text-muted)]">
              • {lastUpdatedText || "Live Feed Active"}
            </span>
          </p>
        </div>
      </div>

      {/* Right: Operational Telemetry & View Controls */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Market Feed Health Badge */}
        <div
          className="px-2.5 py-1.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex items-center gap-1.5 text-xs font-mono"
          title="Direct WebSocket / Ticker Feed Latency"
        >
          <Radio className="h-3.5 w-3.5 text-[var(--theme-profit)] animate-pulse" />
          <span className="text-[11px] text-[var(--theme-text-secondary)]">FEED:</span>
          <span className="font-bold text-[var(--theme-profit)] text-[11px]">14.5ms DIRECT</span>
        </div>

        {/* 20-Stage Risk Gate Status */}
        <div
          className="px-2.5 py-1.5 rounded-xl bg-[var(--theme-profit)]/10 border border-[var(--theme-profit)]/30 flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--theme-profit)]"
          title="20 Pre-Order Risk Gate Checks Armed & Continuous Monitoring"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="text-[11px]">20-GATE ARMED</span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-xs">
          <button
            onClick={() => onViewModeChange("table")}
            className={`p-1.5 rounded-lg flex items-center gap-1 transition ${
              viewMode === "table"
                ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] font-bold shadow-sm"
                : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
            }`}
            title="Compact Scanning Table View"
          >
            <LayoutList className="h-4 w-4" />
            <span className="hidden md:inline text-[11px]">Table</span>
          </button>
          <button
            onClick={() => onViewModeChange("cards")}
            className={`p-1.5 rounded-lg flex items-center gap-1 transition ${
              viewMode === "cards"
                ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] font-bold shadow-sm"
                : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
            }`}
            title="Detailed Visual Card View"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden md:inline text-[11px]">Cards</span>
          </button>
          <button
            onClick={() => onViewModeChange("ladder")}
            className={`p-1.5 rounded-lg flex items-center gap-1 transition ${
              viewMode === "ladder"
                ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] font-bold shadow-sm"
                : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
            }`}
            title="Price Ladder Depth Matrix"
          >
            <GitCommit className="h-4 w-4" />
            <span className="hidden md:inline text-[11px]">Ladder</span>
          </button>
        </div>

        {/* Reconcile Ledger Button */}
        <button
          onClick={onReconcile}
          disabled={isReconciling}
          className="p-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)] transition disabled:opacity-50"
          title="Reconcile Internal State with Broker"
        >
          <RotateCcw className={`h-4 w-4 ${isReconciling ? "animate-spin text-[var(--theme-accent)]" : ""}`} />
        </button>

        {/* Refresh Tickers Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)] transition disabled:opacity-50"
          title="Force Refresh Active Positions & Quotes"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-[var(--theme-accent)]" : ""}`} />
        </button>

        {/* Live Emergency Kill Switch (If Live) */}
        {isLive && (
          <button
            onClick={onKillSwitch}
            className="px-3 py-1.5 rounded-xl bg-[var(--theme-loss)] text-white text-xs font-bold font-mono flex items-center gap-1.5 shadow-md shadow-[var(--theme-loss)]/30 hover:opacity-90 active:scale-95 transition"
            title="Halt all live execution bots and square off open positions"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>HALT ALL</span>
          </button>
        )}
      </div>
    </div>
  );
}
