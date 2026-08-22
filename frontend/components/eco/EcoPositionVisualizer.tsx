"use client";

import React from "react";
import { TrendingUp, TrendingDown, Target, Shield, ArrowRight } from "lucide-react";

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
      className={`p-4 bg-[#0D1914] border border-[#294238] rounded-2xl space-y-3 font-sans select-none ${className}`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold border ${
              isLong
                ? "bg-[#55C98A]/15 text-[#55C98A] border-[#55C98A]/40"
                : "bg-[#E26D6D]/15 text-[#E26D6D] border-[#E26D6D]/40"
            }`}
          >
            {isLong ? "LONG" : "SHORT"}
          </span>
          <span className="font-bold text-sm text-[#E8F3EC]">{symbol}</span>
          <span className="text-xs font-mono text-[#70877A]">({quantity} qty)</span>
        </div>

        <div className="text-right font-mono">
          <span
            className={`text-sm font-extrabold block ${
              isProfit ? "text-[#39B978]" : "text-[#E26D6D]"
            }`}
          >
            {isProfit ? `+${currency}${pnl?.toLocaleString()}` : `-${currency}${Math.abs(pnl || 0).toLocaleString()}`}
          </span>
          <span
            className={`text-[10px] font-bold ${
              isProfit ? "text-[#39B978]" : "text-[#E26D6D]"
            }`}
          >
            {isProfit ? `+${pnlPct?.toFixed(2)}%` : `${pnlPct?.toFixed(2)}%`}
          </span>
        </div>
      </div>

      {/* Visual Level Tree / Track */}
      <div className="p-3 bg-[#07110D] border border-[#1B3328] rounded-xl space-y-2.5 font-mono text-xs">
        {/* Track Line */}
        <div className="relative h-1.5 w-full bg-[#12221B] rounded-full my-4">
          {/* Stop Loss Marker */}
          {stopLoss && (
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-2.5 h-2.5 bg-[#E26D6D] rounded-full ring-2 ring-[#07110D]" />
          )}

          {/* Entry Level Marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#A8BDB0] rounded-full ring-2 ring-[#07110D]"
            style={{ left: `${entryPct}%` }}
          />

          {/* Current Price Marker */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full ring-2 ring-[#07110D] transition-all duration-300 ${
              isProfit ? "bg-[#39B978] shadow-md shadow-[#39B978]/50" : "bg-[#E26D6D] shadow-md shadow-[#E26D6D]/50"
            }`}
            style={{ left: `calc(${currentPct}% - 6px)` }}
          />

          {/* Take Profit Marker */}
          {takeProfit && (
            <div className="absolute top-1/2 -translate-y-1/2 right-0 w-2.5 h-2.5 bg-[#55C98A] rounded-full ring-2 ring-[#07110D]" />
          )}
        </div>

        {/* Level Legend Tree */}
        <div className="grid grid-cols-4 gap-1 text-[10px] pt-1">
          <div>
            <span className="text-[#E26D6D] uppercase flex items-center gap-1">
              <Shield className="h-2.5 w-2.5" /> SL
            </span>
            <span className="text-[#E8F3EC] font-bold">
              {currency}{stopLoss?.toLocaleString() || "—"}
            </span>
          </div>

          <div>
            <span className="text-[#70877A] uppercase">ENTRY</span>
            <span className="text-[#E8F3EC] font-bold">
              {currency}{entryPrice.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-[#78A88A] uppercase">CURRENT</span>
            <span
              className={`font-extrabold ${
                isProfit ? "text-[#39B978]" : "text-[#E26D6D]"
              }`}
            >
              {currency}{currentPrice.toLocaleString()}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[#55C98A] uppercase flex items-center justify-end gap-1">
              <Target className="h-2.5 w-2.5" /> TP
            </span>
            <span className="text-[#E8F3EC] font-bold">
              {currency}{takeProfit?.toLocaleString() || "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
