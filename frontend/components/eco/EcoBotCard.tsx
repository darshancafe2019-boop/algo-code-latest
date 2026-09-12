"use client";

import React from "react";
import { Play, Pause, Edit3, Eye } from "lucide-react";
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
      className={`p-4 bg-[#0A1422] border border-[#1A2A3F] hover:border-[#29415F] rounded-xl space-y-3.5 font-sans transition-all duration-150 shadow-sm select-none ${className}`}
    >
      {/* 1. Header: Bot Name + Mode & Status */}
      <div className="flex items-center justify-between gap-2 border-b border-[#122033] pb-2.5">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isRunning ? "bg-[#00E890] animate-pulse" : "bg-[#52627A]"
            }`}
          />
          <div>
            <h4 className="text-xs font-bold text-[#F7FAFC] leading-tight">{name}</h4>
            <span className="text-[10px] font-mono text-[#7C8CA3]">{symbol} • {timeframe.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 font-mono">
          <EcoBadge variant={tradingMode === "LIVE" ? "live" : "paper"} size="xs">
            {tradingMode}
          </EcoBadge>
          <EcoBadge variant={isRunning ? "profit" : "neutral"} size="xs">
            {status}
          </EcoBadge>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        <div className="p-2 bg-[#07101A] border border-[#122033] rounded-lg">
          <span className="text-[9px] text-[#52627A] uppercase block">Strategy</span>
          <span className="text-xs font-bold text-[#19C5FF] truncate block">{strategy}</span>
        </div>

        <div className="p-2 bg-[#07101A] border border-[#122033] rounded-lg">
          <span className="text-[9px] text-[#52627A] uppercase block">Net P&L</span>
          <span
            className={`text-xs font-bold block tabular-nums ${
              isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"
            }`}
          >
            {isProfit ? `+${currency}${pnl.toLocaleString()}` : `-${currency}${Math.abs(pnl).toLocaleString()}`} ({isProfit ? `+${pnlPct}%` : `${pnlPct}%`})
          </span>
        </div>

        <div className="p-2 bg-[#07101A] border border-[#122033] rounded-lg">
          <span className="text-[9px] text-[#52627A] uppercase block">Capital / Used</span>
          <span className="text-xs font-bold text-[#F7FAFC] tabular-nums">
            {currency}{capitalUsed.toLocaleString()} <span className="text-[#52627A] font-normal">/ {currency}{capitalTotal.toLocaleString()}</span>
          </span>
        </div>

        <div className="p-2 bg-[#07101A] border border-[#122033] rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[9px] text-[#52627A] uppercase block">Risk Profile</span>
            <span className="text-xs font-bold text-[#00E890]">{riskStatus}</span>
          </div>
          <span className="text-[10px] text-[#7C8CA3] font-bold tabular-nums">{winRatePct}% WR</span>
        </div>
      </div>

      {/* 3. Action Buttons Footer */}
      <div className="flex items-center gap-2 pt-0.5 font-mono">
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
            variant="primary"
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
