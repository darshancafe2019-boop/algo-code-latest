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
import { cn } from "@/lib/utils";

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
    <div className="p-4 sm:p-5 rounded-xl bg-[#0A1422] border border-[#1A2A3F] shadow-lg flex flex-wrap items-center justify-between gap-4 font-sans select-none relative z-20">
      {/* Left: Hub Title & System Status Strip */}
      <div className="flex items-center gap-3.5">
        <div className="p-2.5 rounded-lg bg-blue-500/10 border border-cyan-500/30 text-cyan-400">
          <Layers className="h-5 w-5 stroke-[2]" />
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-slate-100">
              Position Intelligence Center
            </h1>
            {/* Environment Badge */}
            <span
              className={cn(
                "text-[10px] px-2.5 py-0.5 rounded-md font-semibold border flex items-center gap-1.5 uppercase tracking-wide",
                isLive
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse"
                  : "bg-blue-500/10 text-cyan-400 border-cyan-500/30"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isLive ? "bg-rose-500" : "bg-cyan-400"
                )}
              />
              {isLive ? "LIVE CAPITAL ACTIVE" : "PAPER SIMULATION"}
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap font-sans">
            <span>Authoritative mark-to-market exposure, SL/TP risk boundaries and OMS telemetry.</span>
            <span className="text-[10px] font-mono text-slate-500">
              • {lastUpdatedText}
            </span>
          </p>
        </div>
      </div>

      {/* Right: Operational Telemetry & View Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap text-xs">
        {/* Market Feed Health Badge */}
        <div className="px-2.5 py-1.5 rounded-lg bg-[#0D1727] border border-[#1A2A3F] flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          <span className="text-[11px] text-slate-400 font-medium">FEED:</span>
          <span className="font-semibold text-emerald-400 text-[11px] font-mono tabular-nums">DIRECT 12ms</span>
        </div>

        {/* 20-Stage Risk Gate Status */}
        <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5 font-semibold text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="text-[11px] uppercase tracking-wide">20-GATE ARMED</span>
        </div>

        {/* Bulk Action Controls Dropdown */}
        {openPositionsCount > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsBulkMenuOpen(!isBulkMenuOpen)}
              className="px-3 py-1.5 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-slate-100 border border-[#1A2A3F] hover:border-[#29415F] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              <span>Bulk Actions</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isBulkMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-56 rounded-xl bg-[#0A1422] border border-[#1A2A3F] shadow-2xl p-1.5 z-50 text-xs animate-in zoom-in-95 duration-100 font-sans"
                onClick={() => setIsBulkMenuOpen(false)}
              >
                <button
                  onClick={() => onTriggerBulkAction("MOVE_TO_BREAKEVEN")}
                  className="w-full px-3 py-2 rounded-lg text-left hover:bg-[#101B2D] text-slate-200 flex items-center gap-2 transition-colors cursor-pointer font-medium"
                >
                  <Shield className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Move All SL to Breakeven</span>
                </button>

                <button
                  onClick={() => onTriggerBulkAction("HARVEST_PROFITS")}
                  disabled={profitableCount === 0}
                  className="w-full px-3 py-2 rounded-lg text-left hover:bg-emerald-500/10 text-emerald-400 flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Harvest {profitableCount} Winning Pos</span>
                </button>

                <div className="my-1 border-t border-[#122033]" />

                <button
                  onClick={() => onTriggerBulkAction("SQUARE_OFF_ALL")}
                  className="w-full px-3 py-2 rounded-lg text-left hover:bg-rose-500/10 text-rose-400 flex items-center gap-2 transition-colors font-semibold cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Flatten All Positions</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* View Mode Switcher (4 Modes) */}
        <div className="flex items-center p-0.5 rounded-lg bg-[#07101A] border border-[#1A2A3F]">
          <button
            onClick={() => onViewModeChange("table")}
            className={cn(
              "px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer text-xs",
              viewMode === "table"
                ? "bg-[#2563EB] text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
            title="Compact High-Density Table View"
          >
            <LayoutList className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Table</span>
          </button>
          <button
            onClick={() => onViewModeChange("cards")}
            className={cn(
              "px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer text-xs",
              viewMode === "cards"
                ? "bg-[#2563EB] text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
            title="Visual Interactive Card Grid"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Cards</span>
          </button>
          <button
            onClick={() => onViewModeChange("ladder")}
            className={cn(
              "px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer text-xs",
              viewMode === "ladder"
                ? "bg-[#2563EB] text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
            title="Price Ladder Depth Matrix"
          >
            <GitCommit className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Ladder</span>
          </button>
          <button
            onClick={() => onViewModeChange("risk")}
            className={cn(
              "px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer text-xs",
              viewMode === "risk"
                ? "bg-[#2563EB] text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
            title="Capital & Risk Allocation Heatmap"
          >
            <PieChart className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Risk Matrix</span>
          </button>
        </div>

        {/* Reconcile Ledger Button */}
        <button
          onClick={onReconcile}
          disabled={isReconciling}
          className="p-2 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-slate-400 hover:text-slate-100 border border-[#1A2A3F] hover:border-[#29415F] transition-colors disabled:opacity-50 cursor-pointer"
          title="Reconcile Internal OMS State with Broker"
        >
          <RotateCcw className={cn("h-4 w-4", isReconciling && "animate-spin text-cyan-400")} />
        </button>

        {/* Refresh Tickers Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-slate-400 hover:text-slate-100 border border-[#1A2A3F] hover:border-[#29415F] transition-colors disabled:opacity-50 cursor-pointer"
          title="Force Refresh Active Positions & Quotes"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin text-cyan-400")} />
        </button>

        {/* Live Emergency Kill Switch */}
        {isLive && (
          <button
            onClick={onKillSwitch}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-700 transition-colors cursor-pointer shadow-sm"
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
