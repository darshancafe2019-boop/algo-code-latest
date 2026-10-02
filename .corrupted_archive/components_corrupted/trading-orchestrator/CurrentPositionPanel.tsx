"use client";

import { formatMoney } from "@/lib/formatters";
import React from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Layers,
  X,
} from "lucide-react";
import { PositionRecord, DrawerContentType } from "./useSharedTradingState";
import { cn } from "@/lib/utils";

interface CurrentPositionPanelProps {
  position: PositionRecord | null;
  onOpenDrawer: (type: DrawerContentType, title: string, data?: any) => void;
}

export const CurrentPositionPanel: React.FC<CurrentPositionPanelProps> = ({
  position,
  onOpenDrawer,
}) => {
  if (!position) {
    return (
      <div className="w-full bg-[#050e1d]/90 border border-[#12365a] rounded-xl px-4 py-3 shadow-md flex items-center justify-between text-xs text-slate-400 font-mono select-none">
        <span className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-cyan-400" />
          ACTIVE INTRADAY POSITIONS: 0 OPEN
        </span>
        <button
          onClick={() => onOpenDrawer("position_details", "Positions & Multi-Broker Portfolio")}
          className="text-[#00D4FF] hover:underline text-[11px]"
        >
          View Portfolio
        </button>
      </div>
    );
  }

  const isProfit = position.pnl >= 0;

  return (
    <div className="w-full bg-[#050e1d]/90 border border-[#12365a] rounded-xl px-4 py-3 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs select-none backdrop-blur">
      {/* Symbol & Side */}
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "px-2 py-0.5 rounded font-mono font-bold text-[11px] border",
            position.side === "LONG"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              : "bg-rose-500/20 border-rose-500/40 text-rose-300"
          )}
        >
          {position.side}
        </span>
        <span className="font-mono font-bold text-white text-sm">{position.symbol}</span>
        <span className="text-slate-400 font-mono text-[11px]">({position.quantity} Qty)</span>
      </div>

      {/* Metrics Strip */}
      <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
        <div>
          <span className="text-slate-500 text-[10px] block">ENTRY</span>
          <span className="text-slate-200">₹{position.entryPrice.toFixed(2)}</span>
        </div>

        <div>
          <span className="text-slate-500 text-[10px] block">LTP</span>
          <span className="text-[#00D4FF] font-bold">₹{position.ltp.toFixed(2)}</span>
        </div>

        <div>
          <span className="text-slate-500 text-[10px] block">PNL</span>
          <span
            className={cn(
              "font-bold flex items-center gap-1",
              isProfit ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {isProfit ? "+" : ""}{formatMoney(position.pnl, "₹")} ({position.pnlPercent}%)
          </span>
        </div>

        <div className="hidden sm:block">
          <span className="text-slate-500 text-[10px] block">SL / TP</span>
          <span className="text-slate-300">
            ₹{position.stopLoss} / ₹{position.target}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onOpenDrawer("position_details", "Position Management", position)}
          className="px-2.5 py-1 rounded-lg bg-[#07192f] hover:bg-[#0c284a] text-slate-200 border border-[#143e69] text-xs font-semibold transition-all cursor-pointer"
        >
          MANAGE
        </button>
        <button
          onClick={() => onOpenDrawer("position_details", "Exit Position Confirmation", position)}
          className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-700 text-rose-200 text-xs font-bold transition-all cursor-pointer"
        >
          EXIT
        </button>
      </div>
    </div>
  );
};
