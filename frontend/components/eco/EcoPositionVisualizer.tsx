"use client";

import React from "react";
import { Target, Shield } from "lucide-react";

interface EcoPositionVisualizerProps {
  symbol?: string;
  side?: "LONG" | "SHORT" | "BUY" | "SELL";
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl?: number;
  pnlPct?: number;
  quantity?: number;
  currency?: string;
  className?: string;
}

export function EcoPositionVisualizer({
  symbol = "BTC/USDT",
  side = "LONG",
  entryPrice = 64500,
  currentPrice = 65200,
  stopLoss = 63800,
  takeProfit = 66500,
  pnl = 700,
  pnlPct = 1.08,
  quantity = 1.0,
  currency = "$",
  className = "",
}: EcoPositionVisualizerProps) {
  const isLong = side.toUpperCase().includes("LONG") || side.toUpperCase().includes("BUY");
  const isProfit = (pnl || 0) >= 0;

  // Calculate relative distance on a normalized linear track between SL and TP
  const minPrice = Math.min(stopLoss || entryPrice * 0.95, entryPrice, currentPrice);
  const maxPrice = Math.max(takeProfit || entryPrice * 1.05, entryPrice, currentPrice);
  const range = maxPrice - minPrice || 1;

  const entryPct = ((entryPrice - minPrice) / range) * 100;
  const currentPct = Math.min(100, Math.max(0, ((currentPrice - minPrice) / range) * 100));

  return (
    <div
      className={`p-4 bg-[#0A1422] border border-[#1A2A3F] rounded-xl space-y-3 font-sans select-none ${className}`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
              isLong
                ? "bg-[#00E890]/15 text-[#00E890] border-[#00E890]/30"
                : "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30"
            }`}
          >
            {isLong ? "LONG" : "SHORT"}
          </span>
          <span className="font-bold text-sm text-[#F7FAFC]">{symbol}</span>
          <span className="text-xs font-mono text-[#52627A]">({quantity} qty)</span>
        </div>

        <div className="text-right font-mono">
          <span
            className={`text-sm font-bold block tabular-nums ${
              isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"
            }`}
          >
            {isProfit ? `+${currency}${pnl?.toLocaleString()}` : `-${currency}${Math.abs(pnl || 0).toLocaleString()}`}
          </span>
          <span
            className={`text-[10px] font-bold tabular-nums ${
              isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"
            }`}
          >
            {isProfit ? `+${pnlPct?.toFixed(2)}%` : `${pnlPct?.toFixed(2)}%`}
          </span>
        </div>
      </div>

      {/* Visual Level Tree / Track */}
      <div className="p-3 bg-[#07101A] border border-[#122033] rounded-lg space-y-2.5 font-mono text-xs">
        {/* Track Line */}
        <div className="relative h-1.5 w-full bg-[#101B2D] rounded-full my-3">
          {/* Stop Loss Marker */}
          {stopLoss && (
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-2.5 h-2.5 bg-[#FF3B5C] rounded-full ring-2 ring-[#07101A]" />
          )}

          {/* Entry Level Marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#7C8CA3] rounded-full ring-2 ring-[#07101A]"
            style={{ left: `${entryPct}%` }}
          />

          {/* Current Price Marker */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full ring-2 ring-[#07101A] transition-all duration-300 ${
              isProfit ? "bg-[#00E890] shadow-sm" : "bg-[#FF3B5C] shadow-sm"
            }`}
            style={{ left: `calc(${currentPct}% - 6px)` }}
          />

          {/* Take Profit Marker */}
          {takeProfit && (
            <div className="absolute top-1/2 -translate-y-1/2 right-0 w-2.5 h-2.5 bg-[#22D3EE] rounded-full ring-2 ring-[#07101A]" />
          )}
        </div>

        {/* Level Legend Tree */}
        <div className="grid grid-cols-4 gap-1 text-[10px] pt-1">
          <div>
            <span className="text-[#FF3B5C] uppercase flex items-center gap-1">
              <Shield className="h-2.5 w-2.5" /> SL
            </span>
            <span className="text-[#F7FAFC] font-bold tabular-nums">
              {currency}{stopLoss?.toLocaleString() || "—"}
            </span>
          </div>

          <div>
            <span className="text-[#52627A] uppercase">ENTRY</span>
            <span className="text-[#F7FAFC] font-bold tabular-nums">
              {currency}{entryPrice.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-[#19C5FF] uppercase">CURRENT</span>
            <span
              className={`font-bold tabular-nums ${
                isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"
              }`}
            >
              {currency}{currentPrice.toLocaleString()}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[#22D3EE] uppercase flex items-center justify-end gap-1">
              <Target className="h-2.5 w-2.5" /> TP
            </span>
            <span className="text-[#F7FAFC] font-bold tabular-nums">
              {currency}{takeProfit?.toLocaleString() || "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
