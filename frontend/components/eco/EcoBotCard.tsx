"use client";

import React from "react";
import { Play, Pause, Edit3, Eye, ShieldCheck, Activity, Zap } from "lucide-react";
import { EcoButton } from "./EcoButton";
import { EcoBadge } from "./EcoBadge";

interface EcoBotCardProps {
  id: string;
  name: string;
  symbol: string;
  strategy: string;
  timeframe: string;
  tradingMode: "PAPER" | "LIVE";
  status: "RUNNING" | "STOPPED" | "PAUSED" | "ERROR";
  capitalTotal: number;
  capitalUsed: number;
  pnl: number;
  pnlPct: number;
  riskStatus?: string;
  winRatePct?: number;
  currency?: string;
  onStart?: (id: string) => void;
  onStop?: (id: string) => void;
  onEdit?: (id: string) => void;
  onView?: (id: string) => void;
  className?: string;
}

export function EcoBotCard({
  id,
  name,
  symbol,
  strategy,
  timeframe,
  tradingMode = "PAPER",
  status = "RUNNING",
  capitalTotal = 100000,
  capitalUsed = 25000,
  pnl = 4250,
  pnlPct = 4.25,
  riskStatus = "SAFE",
  winRatePct = 68.5,
  currency = "₹",
  onStart,
  onStop,
  onEdit,
  onView,
  className = "",
}: EcoBotCardProps) {
  const isRunning = status === "RUNNING";
  const isProfit = (pnl || 0) >= 0;

  return (
    <div
      className={`p-5 bg-[#0D1914] border border-[#294238] hover:border-[#2E7D5B]/60 rounded-2xl space-y-4 font-sans transition-all duration-200 shadow-xl select-none ${className}`}
    >
      {/* 1. Header: Bot Name + Mode & Status */}
      <div className="flex items-center justify-between gap-2 border-b border-[#1B3328] pb-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isRunning ? "bg-[#55C98A] animate-pulse" : "bg-[#70877A]"
            }`}
          />
          <div>
            <h4 className="text-sm font-bold text-[#E8F3EC] leading-tight">{name}</h4>
            <span className="text-[10px] font-mono text-[#A8BDB0]">{symbol} • {timeframe.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 font-mono">
          <EcoBadge variant={tradingMode === "LIVE" ? "live" : "paper"} size="xs">
            {tradingMode}
          </EcoBadge>
          <EcoBadge variant={isRunning ? "leaf" : "neutral"} size="xs">
            {status}
          </EcoBadge>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
        <div className="p-2.5 bg-[#07110D] border border-[#1B3328] rounded-xl">
          <span className="text-[9px] text-[#70877A] uppercase block">Strategy</span>
          <span className="text-xs font-bold text-[#A8D5BA] truncate block">{strategy}</span>
        </div>

        <div className="p-2.5 bg-[#07110D] border border-[#1B3328] rounded-xl">
          <span className="text-[9px] text-[#70877A] uppercase block">Net P&L</span>
          <span
            className={`text-xs font-extrabold block ${
              isProfit ? "text-[#39B978]" : "text-[#E26D6D]"
            }`}
          >
            {isProfit ? `+${currency}${pnl.toLocaleString()}` : `-${currency}${Math.abs(pnl).toLocaleString()}`} ({isProfit ? `+${pnlPct}%` : `${pnlPct}%`})
          </span>
        </div>

        <div className="p-2.5 bg-[#07110D] border border-[#1B3328] rounded-xl">
          <span className="text-[9px] text-[#70877A] uppercase block">Capital / Used</span>
          <span className="text-xs font-bold text-[#E8F3EC]">
            {currency}{capitalUsed.toLocaleString()} <span className="text-[#70877A] font-normal">/ {currency}{capitalTotal.toLocaleString()}</span>
          </span>
        </div>

        <div className="p-2.5 bg-[#07110D] border border-[#1B3328] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[9px] text-[#70877A] uppercase block">Risk Profile</span>
            <span className="text-xs font-bold text-[#55C98A]">{riskStatus}</span>
          </div>
          <span className="text-[10px] text-[#78A88A] font-bold">{winRatePct}% WR</span>
        </div>
      </div>

      {/* 3. Action Buttons Footer */}
      <div className="flex items-center gap-2 pt-1 font-mono">
        {isRunning ? (
          <EcoButton
            variant="moss"
            size="sm"
            icon={Pause}
            onClick={() => onStop && onStop(id)}
            className="flex-1"
          >
            PAUSE
          </EcoButton>
        ) : (
          <EcoButton
            variant="leaf"
            size="sm"
            icon={Play}
            onClick={() => onStart && onStart(id)}
            className="flex-1"
          >
            START
          </EcoButton>
        )}

        {onEdit && (
          <EcoButton
            variant="outline"
            size="sm"
            icon={Edit3}
            onClick={() => onEdit(id)}
          >
            EDIT
          </EcoButton>
        )}

        {onView && (
          <EcoButton
            variant="outline"
            size="sm"
            icon={Eye}
            onClick={() => onView(id)}
          >
            VIEW
          </EcoButton>
        )}
      </div>
    </div>
  );
}
