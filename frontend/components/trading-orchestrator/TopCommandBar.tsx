"use client";

import React from "react";
import {
  Radio,
  Power,
  SlidersHorizontal,
  Clock,
  LayoutGrid,
  Terminal,
  Sparkles,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { SystemStatusState } from "./useSharedTradingState";
import { cn } from "@/lib/utils";

interface TopCommandBarProps {
  system: SystemStatusState;
  viewMode: "operations" | "diagram" | "combined";
  complexityMode: "simple" | "advanced";
  healthyProvidersCount: number;
  totalProvidersCount: number;
  onSelectViewMode: (mode: "operations" | "diagram" | "combined") => void;
  onToggleComplexity: () => void;
  onOpenKillModal: () => void;
  onResetKill: () => void;
  onStart: () => void;
  onPauseToggle: () => void;
  isLoading: boolean;
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({
  system,
  viewMode,
  complexityMode,
  healthyProvidersCount,
  totalProvidersCount,
  onSelectViewMode,
  onToggleComplexity,
  onOpenKillModal,
  onResetKill,
  onStart,
  onPauseToggle,
  isLoading,
}) => {
  return (
    <div className="w-full bg-[#050e1d] border border-[#12365a] rounded-2xl p-4 shadow-xl select-none backdrop-blur space-y-4">
      {/* 1. Primary Top Row */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#00D4FF] via-[#0088FF] to-[#0044CC] flex items-center justify-center shadow-lg shadow-[#00D4FF]/20 ring-1 ring-[#00D4FF]/40">
            <span className="text-slate-950 font-black text-xl tracking-tight">Q</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-white">
                Quant<span className="text-[#00D4FF]">.OS</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-bold uppercase">
                AI TRADING FRAMEWORK
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Autonomous Multi-Broker Operations & Risk Supervisor
            </p>
          </div>
        </div>

        {/* Center: Workflow Stage Breadcrumb */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono font-bold bg-[#07192f] px-3 py-1.5 rounded-xl border border-[#143e69]">
          <span className="text-slate-400">RESEARCH</span>
          <span className="text-slate-600">→</span>
          <span className="text-slate-400">SCAN</span>
          <span className="text-slate-600">→</span>
          <span className="text-slate-400">REVIEW</span>
          <span className="text-slate-600">→</span>
          <span className="text-[#00D4FF] underline decoration-2 underline-offset-4">MANAGE</span>
          <span className="text-slate-600">→</span>
          <span className="text-slate-400">CLOSING</span>
          <span className="text-slate-600">→</span>
          <span className="text-slate-400">REPORT</span>
        </div>

        {/* Right: Quick Status Matrix & IST Clock */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#07192f] border border-[#143e69] text-slate-300 text-[11px]">
            <Clock className="h-3 w-3 text-[#00D4FF]" />
            <span>NSE {system.marketSession}</span>
            <span className="text-slate-500">•</span>
            <span className="text-[#00D4FF] font-semibold">{system.clockIst || "IST"}</span>
          </div>

          <span className="px-2.5 py-1 rounded-lg bg-[#07192f] border border-[#143e69] text-emerald-400 text-[11px] font-bold">
            {healthyProvidersCount}/{totalProvidersCount} DATA FEEDS
          </span>

          <span
            className={cn(
              "px-2.5 py-1 rounded-lg border text-[11px] font-bold",
              system.tradingMode === "PAPER"
                ? "bg-cyan-950/60 border-cyan-500/40 text-cyan-300"
                : "bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse"
            )}
          >
            {system.tradingMode} MODE
          </span>

          {/* Emergency Kill Switch Button */}
          {system.isKilled ? (
            <button
              onClick={onResetKill}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              RESET STOP
            </button>
          ) : (
            <button
              onClick={onOpenKillModal}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-rose-600/30 transition-all cursor-pointer"
            >
              <Power className="h-3.5 w-3.5" />
              EMERGENCY STOP
            </button>
          )}
        </div>
      </div>

      {/* 2. Secondary Navigation Bar: View Modes & Complexity Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-[#0d2847]">
        {/* Global Mode Switch Tabs */}
        <div className="flex items-center gap-1 bg-[#040f1f] p-1 rounded-xl border border-[#103050]">
          <button
            onClick={() => onSelectViewMode("operations")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              viewMode === "operations"
                ? "bg-[#00D4FF] text-slate-950 shadow-md shadow-[#00D4FF]/30"
                : "text-slate-300 hover:text-white hover:bg-[#07192f]"
            )}
          >
            <Terminal className="h-3.5 w-3.5" />
            Live Operations Control
          </button>

          <button
            onClick={() => onSelectViewMode("diagram")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              viewMode === "diagram"
                ? "bg-[#00D4FF] text-slate-950 shadow-md shadow-[#00D4FF]/30"
                : "text-slate-300 hover:text-white hover:bg-[#07192f]"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Framework Diagram
          </button>

          <button
            onClick={() => onSelectViewMode("combined")}
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              viewMode === "combined"
                ? "bg-[#00D4FF] text-slate-950 shadow-md shadow-[#00D4FF]/30"
                : "text-slate-300 hover:text-white hover:bg-[#07192f]"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Combined Workspace
          </button>
        </div>

        {/* Complexity Switch (Simple vs Advanced) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#040f1f] p-0.5 rounded-lg border border-[#103050] text-xs font-mono">
            <button
              onClick={onToggleComplexity}
              className={cn(
                "px-2.5 py-1 rounded font-bold transition-all cursor-pointer",
                complexityMode === "simple"
                  ? "bg-cyan-500/20 text-[#00D4FF] border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              SIMPLE
            </button>
            <button
              onClick={onToggleComplexity}
              className={cn(
                "px-2.5 py-1 rounded font-bold transition-all cursor-pointer",
                complexityMode === "advanced"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              ADVANCED
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
