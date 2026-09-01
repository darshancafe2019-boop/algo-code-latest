"use client";

import React, { useState } from "react";
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
  PieChart,
  Zap,
  ChevronDown,
  ArrowUpRight,
  Shield,
  XCircle,
} from "lucide-react";
import { PositionViewMode, BulkActionType } from "@/types/positions";

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
  onTriggerBulkAction: (action: BulkActionType) => void;
  isRefreshing?: boolean;
  isReconciling?: boolean;
  openPositionsCount: number;
  profitableCount: number;
}

export function PositionsCommandHeader({
  executionMode,
  marketFeedStatus = "LIVE DIRECT",
  brokerSyncStatus = "SYNCHRONIZED",
  lastUpdatedText = "Live Feed Active",
  viewMode,
  onViewModeChange,
  onRefresh,
  onReconcile,
  onKillSwitch,
  onTriggerBulkAction,
  isRefreshing,
  isReconciling,
  openPositionsCount,
  profitableCount,
}: PositionsCommandHeaderProps) {
  const isLive = executionMode === "LIVE";
  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-[var(--theme-surface)]/90 backdrop-blur-xl border border-[var(--theme-border)] shadow-2xl flex flex-wrap items-center justify-between gap-4 font-sans select-none relative z-20">
      {/* Left: Hub Title & System Status Strip */}
      <div className="flex items-center gap-3.5">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-[var(--theme-accent)]/20 to-[var(--theme-accent)]/5 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] shadow-lg shadow-[var(--theme-accent)]/10">
          <Layers className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-[var(--theme-text-primary)]">
              Position Intelligence Center
            </h1>
            {/* Unmistakable Environment Badge */}
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono border flex items-center gap-1.5 transition-all ${
                isLive
                  ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/40 shadow-sm shadow-[var(--theme-loss)]/20 animate-pulse"
                  : "bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border-[var(--theme-accent)]/30"
              }`}
              title={
                isLive
                  ? "LIVE EXECUTION: Real broker capital deployed with active risk gates."
                  : "PAPER TRADING: Virtual risk-free paper OMS ledger simulation."
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLive ? "bg-[var(--theme-loss)] animate-ping" : "bg-[var(--theme-accent)]"
                }`}
              />
              {isLive ? "LIVE CAPITAL ACTIVE" : "PAPER SIMULATION"}
            </span>
          </div>

          <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5 flex items-center gap-2 flex-wrap font-sans">
            <span>Authoritative mark-to-market exposure, SL/TP risk boundaries & OMS telemetry.</span>
            <span className="text-[10px] font-mono text-[var(--theme-text-muted)]">
              • {lastUpdatedText}
            </span>
          </p>
        </div>
      </div>

      {/* Right: Operational Telemetry & View Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        {/* Market Feed Health Badge */}
        <div
          className="px-2.5 py-1.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex items-center gap-1.5 text-xs font-mono"
          title="Direct WebSocket / Ticker Feed Latency"
        >
          <Radio className="h-3.5 w-3.5 text-[var(--theme-profit)] animate-pulse" />
          <span className="text-[11px] text-[var(--theme-text-secondary)]">FEED:</span>
          <span className="font-bold text-[var(--theme-profit)] text-[11px]">DIRECT 12ms</span>
        </div>

        {/* 20-Stage Risk Gate Status */}
        <div
          className="px-2.5 py-1.5 rounded-xl bg-[var(--theme-profit)]/10 border border-[var(--theme-profit)]/30 flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--theme-profit)]"
          title="20 Pre-Order Risk Gate Checks Armed & Continuous Monitoring"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="text-[11px]">20-GATE ARMED</span>
        </div>

        {/* Bulk Action Controls Dropdown */}
        {openPositionsCount > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsBulkMenuOpen(!isBulkMenuOpen)}
              className="px-3 py-1.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)] text-xs font-bold font-mono flex items-center gap-1.5 transition shadow-sm"
              title="Bulk Position Operations"
            >
              <Zap className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
              <span>BULK ACTIONS</span>
              <ChevronDown className="h-3 w-3 text-[var(--theme-text-muted)]" />
            </button>

            {isBulkMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-56 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-2xl p-1.5 z-50 font-mono text-xs animate-in zoom-in-95 duration-100"
                onClick={() => setIsBulkMenuOpen(false)}
              >
                <button
                  onClick={() => onTriggerBulkAction("MOVE_TO_BREAKEVEN")}
                  className="w-full px-3 py-2 rounded-xl text-left hover:bg-[var(--theme-elevated)] text-[var(--theme-text-primary)] flex items-center gap-2 transition"
                >
                  <Shield className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                  <span>Move All SL to Breakeven</span>
                </button>

                <button
                  onClick={() => onTriggerBulkAction("HARVEST_PROFITS")}
                  disabled={profitableCount === 0}
                  className="w-full px-3 py-2 rounded-xl text-left hover:bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Harvest {profitableCount} Winning Pos</span>
                </button>

                <div className="my-1 border-t border-[var(--theme-border-subtle)]" />

                <button
                  onClick={() => onTriggerBulkAction("SQUARE_OFF_ALL")}
                  className="w-full px-3 py-2 rounded-xl text-left hover:bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] flex items-center gap-2 transition font-bold"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Flatten All Positions</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* View Mode Switcher (4 Modes) */}
        <div className="flex items-center p-1 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-xs">
          <button
            onClick={() => onViewModeChange("table")}
            className={`p-1.5 rounded-lg flex items-center gap-1 transition ${
              viewMode === "table"
                ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] font-bold shadow-sm"
                : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
            }`}
            title="Compact High-Density Table View"
          >
            <LayoutList className="h-3.5 w-3.5" />
            <span className="hidden md:inline text-[11px]">Table</span>
          </button>
          <button
            onClick={() => onViewModeChange("cards")}
            className={`p-1.5 rounded-lg flex items-center gap-1 transition ${
              viewMode === "cards"
                ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] font-bold shadow-sm"
                : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
            }`}
            title="Visual Interactive Card Grid"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
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
            <GitCommit className="h-3.5 w-3.5" />
            <span className="hidden md:inline text-[11px]">Ladder</span>
          </button>
          <button
            onClick={() => onViewModeChange("risk")}
            className={`p-1.5 rounded-lg flex items-center gap-1 transition ${
              viewMode === "risk"
                ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] font-bold shadow-sm"
                : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
            }`}
            title="Capital & Risk Allocation Heatmap"
          >
            <PieChart className="h-3.5 w-3.5" />
            <span className="hidden md:inline text-[11px]">Risk Matrix</span>
          </button>
        </div>

        {/* Reconcile Ledger Button */}
        <button
          onClick={onReconcile}
          disabled={isReconciling}
          className="p-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)] transition disabled:opacity-50"
          title="Reconcile Internal OMS State with Broker"
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

        {/* Live Emergency Kill Switch */}
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
