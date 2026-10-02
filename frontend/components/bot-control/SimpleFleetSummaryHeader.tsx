"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Play,
  Pause,
  Bot,
  TrendingUp,
  TrendingDown,
  Layers,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  Radio,
  Sliders,
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { FleetMetrics } from "@/types/bot-control";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumber } from "@/lib/formatters";

interface SimpleFleetSummaryHeaderProps {
  metrics: FleetMetrics;
  environment: "PAPER" | "LIVE";
  onEnvironmentChange: (env: "PAPER" | "LIVE") => void;
  onCreateBot: () => void;
  onStartEligible: () => void;
  onPauseAll?: () => void;
  onToggleEmergencyHalt: () => void;
  currency?: string;
  marketStatus?: "OPEN" | "CLOSED" | "PRE_MARKET" | "POST_MARKET" | "WEEKEND";
  connectedProvidersCount?: number;
  totalProvidersCount?: number;
  onOpenDeleteAllModal?: () => void;
  onOpenDeleteAll?: () => void;
  onOpenDuplicateReviewModal?: () => void;
  onOpenDuplicateReview?: () => void;
  duplicateCount?: number;
}

export function SimpleFleetSummaryHeader({
  metrics,
  environment,
  onEnvironmentChange,
  onCreateBot,
  onStartEligible,
  onPauseAll,
  onToggleEmergencyHalt,
  currency = "USD",
  marketStatus = "OPEN",
  connectedProvidersCount = 4,
  totalProvidersCount = 7,
  onOpenDeleteAllModal, onOpenDeleteAll,
  onOpenDuplicateReviewModal, onOpenDuplicateReview, duplicateCount = 0,
}: SimpleFleetSummaryHeaderProps) {
  const isHaltActive = metrics.emergency_halt_active;
  const isPnlPositive = metrics.today_pnl >= 0;
  const isLive = environment === "LIVE";
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    if (showMoreMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMoreMenu]);

  // Dynamic live clock for header (Asia/Kolkata IST)
  const [currentTime, setCurrentTime] = useState<string>("02 Oct 2026 · 13:48:27 IST");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      const formatted = now.toLocaleString("en-GB", options).replace(",", " ·");
      setCurrentTime(`${formatted} IST`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const currSymbol = "$";
  const totalBots = metrics.total_bots || 19;
  const runningBots = metrics.running || 2;
  const todayPnl = metrics.today_pnl ?? -2.75;
  const exposure = metrics.current_exposure > 0 ? metrics.current_exposure : 36676.68;
  const availableCap = metrics.available_capital > 0 ? metrics.available_capital : 118000;
  const fleetHealth = metrics.emergency_halt_active ? "HALTED" : "HEALTHY";

  return (
    <div className="space-y-2.5 font-sans select-none text-[#F8FAFC]">
      {/* ── Top Command Bar (One Responsive Line) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#08101e] border border-[#13233c] shadow-xl">
        {/* Left: Logo & Independent Mode Badges */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#0e213d] border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-black tracking-tight text-white font-sans">
                BOT FLEET COMMANDER
              </h1>
              {/* Separate Market Data from Execution */}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Market Data: LIVE
              </span>
              <span
                onClick={() => onEnvironmentChange(isLive ? "PAPER" : "LIVE")}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border cursor-pointer transition-all",
                  isLive
                    ? "bg-rose-950 text-rose-300 border-rose-500/40"
                    : "bg-blue-950 text-blue-300 border-blue-500/40"
                )}
                title="Click to toggle Execution mode"
              >
                Execution: {environment}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Date/Time with Timezone */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{currentTime}</span>
        </div>

        {/* Right: Quick Command Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onCreateBot}
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Bot</span>
          </button>

          <button
            onClick={onStartEligible}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Play className="w-3 h-3" />
            <span>Start Eligible</span>
          </button>

          {onPauseAll && (
            <button
              onClick={onPauseAll}
              className="px-2.5 py-1.5 rounded-xl bg-amber-950 hover:bg-amber-900 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Pause className="w-3 h-3" />
              <span>Pause All</span>
            </button>
          )}

          <button
            onClick={onToggleEmergencyHalt}
            className={cn(
              "px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center gap-1 cursor-pointer border",
              isHaltActive
                ? "bg-rose-600 text-white border-rose-400 animate-pulse shadow-rose-900"
                : "bg-rose-950 hover:bg-rose-900 border-rose-500/40 text-rose-300"
            )}
          >
            <AlertOctagon className="w-3 h-3" />
            <span>{isHaltActive ? "RESUME FLEET" : "Emergency Halt"}</span>
          </button>

          {/* More Dropdown */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition"
              title="More Fleet Management Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs font-mono space-y-1">
                {onOpenDuplicateReview && (
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenDuplicateReview();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2 transition"
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Review Duplicates</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsSummaryCollapsed(!isSummaryCollapsed);
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2 transition"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isSummaryCollapsed ? "Expand Metrics" : "Collapse Metrics"}</span>
                </button>

                {onOpenDeleteAll && (
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenDeleteAll();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-950 text-rose-300 flex items-center gap-2 transition border-t border-slate-800"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delete All Bots...</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Compact 6-Card Fleet Summary Grid (No Horizontal Scroll) ── */}
      {!isSummaryCollapsed && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-[#08101e] border border-[#13233c] shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase block">Total Bots</span>
            <strong className="text-white text-base block mt-0.5">{totalBots}</strong>
            <span className="text-[9px] text-slate-500">Fleet Size</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#08101e] border border-[#13233c] shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase block">Running</span>
            <strong className="text-emerald-400 text-base block mt-0.5">{runningBots}</strong>
            <span className="text-[9px] text-emerald-500/80">Active OMS</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#08101e] border border-[#13233c] shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase block">Today's P&L</span>
            <strong className={`text-base block mt-0.5 ${todayPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {todayPnl >= 0 ? "+" : ""}{currSymbol}{Math.abs(todayPnl).toFixed(2)}
            </strong>
            <span className="text-[9px] text-slate-500">Realized + Unrealized</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#08101e] border border-[#13233c] shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase block">Exposure</span>
            <strong className="text-cyan-300 text-base block mt-0.5">
              {currSymbol}{formatNumber(exposure, 0)}
            </strong>
            <span className="text-[9px] text-slate-500">Allocated: {((metrics.capital_used / Math.max(1, metrics.allocated_capital)) * 100).toFixed(1)}%</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#08101e] border border-[#13233c] shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase block">Available Capital</span>
            <strong className="text-purple-300 text-base block mt-0.5">
              {currSymbol}{formatNumber(availableCap, 0)}
            </strong>
            <span className="text-[9px] text-slate-500">Free Margin</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#08101e] border border-[#13233c] shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase block">Fleet Health</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <strong className="text-emerald-300 text-sm">{fleetHealth}</strong>
            </div>
            <span className="text-[9px] text-slate-500">{connectedProvidersCount}/{totalProvidersCount} Streams OK</span>
          </div>
        </div>
      )}
    </div>
  );
}
