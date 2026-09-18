"use client";

import React, { useState } from "react";
import { formatMoney } from "@/lib/formatters";
import { Activity, ArrowDownRight, ArrowUpRight, BarChart2, Radio } from "lucide-react";

interface DepthLevel {
  price: number;
  qty: number;
  orders: number;
  total: number;
}

interface TapeTrade {
  id: string;
  time: string;
  price: number;
  qty: number;
  side: "BUY" | "SELL";
  notional: number;
  latencyMs: number;
}

interface PositionOrderFlowViewerProps {
  symbol?: string;
  provider?: string;
  markPrice?: number;
  currency?: string;
}

export function PositionOrderFlowViewer({
  symbol = "BTC/USDT",
  provider = "BINANCE_USDM",
  markPrice = 78950.0,
  currency = "USD",
}: PositionOrderFlowViewerProps) {
  const [depthTier, setDepthTier] = useState<"L5" | "L15" | "L20" | "L50">("L15");
  const sym = currency === "INR" ? "₹" : "$";

  // Deterministic order book ladder derived around mark price
  const levelCount = depthTier === "L5" ? 5 : depthTier === "L15" ? 15 : depthTier === "L20" ? 20 : 30;
  const spreadStep = markPrice * 0.00015;

  let cumAsk = 0;
  const asks: DepthLevel[] = Array.from({ length: levelCount }, (_, i) => {
    const idx = levelCount - 1 - i;
    const price = roundToTick(markPrice + (idx + 1) * spreadStep);
    const qty = +(Math.sin(idx * 1.3) * 1.5 + 2.2).toFixed(3);
    const orders = (idx % 4) + 1;
    cumAsk += qty;
    return { price, qty, orders, total: +cumAsk.toFixed(3) };
  });

  let cumBid = 0;
  const bids: DepthLevel[] = Array.from({ length: levelCount }, (_, i) => {
    const price = roundToTick(markPrice - (i + 1) * spreadStep);
    const qty = +(Math.cos(i * 1.1) * 1.4 + 2.0).toFixed(3);
    const orders = (i % 3) + 1;
    cumBid += qty;
    return { price, qty, orders, total: +cumBid.toFixed(3) };
  });

  const maxTotal = Math.max(cumBid, cumAsk, 1.0);
  const bestBid = bids[0]?.price || markPrice;
  const bestAsk = asks[asks.length - 1]?.price || markPrice;
  const spread = Math.max(0.01, +(bestAsk - bestBid).toFixed(2));
  const spreadBps = +((spread / markPrice) * 10000).toFixed(1);
  const imbalancePct = Math.round(((cumBid - cumAsk) / (cumBid + cumAsk)) * 100);

  // Live Tape Trades
  const trades: TapeTrade[] = [
    { id: "T-01", time: "15:42:01.120", price: markPrice, qty: 0.85, side: "BUY", notional: markPrice * 0.85, latencyMs: 14.2 },
    { id: "T-02", time: "15:42:00.850", price: markPrice - 0.5, qty: 1.20, side: "SELL", notional: (markPrice - 0.5) * 1.20, latencyMs: 16.0 },
    { id: "T-03", time: "15:42:00.210", price: markPrice, qty: 0.45, side: "BUY", notional: markPrice * 0.45, latencyMs: 12.8 },
    { id: "T-04", time: "15:41:59.980", price: markPrice + 0.2, qty: 2.10, side: "BUY", notional: (markPrice + 0.2) * 2.10, latencyMs: 18.1 },
    { id: "T-05", time: "15:41:59.100", price: markPrice - 0.3, qty: 0.95, side: "SELL", notional: (markPrice - 0.3) * 0.95, latencyMs: 15.4 },
  ];

  function roundToTick(val: number): number {
    return +(Math.round(val * 10) / 10).toFixed(1);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. L1 - L200 Depth Book */}
      <div className="lg:col-span-2 p-4 rounded-xl border border-border bg-card/40 space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-foreground uppercase font-mono">
              Order Flow Depth Matrix ({symbol})
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300 font-mono">
              {provider}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border text-[11px] font-mono">
            {(["L5", "L15", "L20", "L50"] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setDepthTier(tier)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  depthTier === tier
                    ? "bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* Depth Imbalance Bar */}
        <div className="p-2.5 rounded-lg bg-background/80 border border-border/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-[11px]">Spread:</span>
            <span className="font-bold text-foreground">
              {sym}{spread} <span className="text-[10px] text-muted-foreground font-normal">({spreadBps} bps)</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground">Depth Imbalance:</span>
            <div className="flex items-center gap-1.5 font-bold">
              <span className={imbalancePct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {imbalancePct > 0 ? `+${imbalancePct}% BID` : `${imbalancePct}% ASK`}
              </span>
            </div>
          </div>
        </div>

        {/* Ladder Visualizer */}
        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          {/* Bids */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase px-2 pb-1 border-b border-border/40">
              <span>Bid Price</span>
              <span>Size</span>
              <span>Cum</span>
            </div>
            {bids.slice(0, 10).map((b, i) => (
              <div key={i} className="relative flex items-center justify-between px-2 py-1 rounded bg-card/20 overflow-hidden">
                <div
                  className="absolute inset-y-0 right-0 bg-emerald-500/10 pointer-events-none transition-all"
                  style={{ width: `${(b.total / maxTotal) * 100}%` }}
                />
                <span className="font-bold text-emerald-400 relative z-10">{sym}{b.price.toFixed(1)}</span>
                <span className="text-foreground relative z-10">{b.qty.toFixed(3)}</span>
                <span className="text-muted-foreground text-[10px] relative z-10">{b.total.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Asks */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase px-2 pb-1 border-b border-border/40">
              <span>Ask Price</span>
              <span>Size</span>
              <span>Cum</span>
            </div>
            {asks.slice(0, 10).map((a, i) => (
              <div key={i} className="relative flex items-center justify-between px-2 py-1 rounded bg-card/20 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-rose-500/10 pointer-events-none transition-all"
                  style={{ width: `${(a.total / maxTotal) * 100}%` }}
                />
                <span className="font-bold text-rose-400 relative z-10">{sym}{a.price.toFixed(1)}</span>
                <span className="text-foreground relative z-10">{a.qty.toFixed(3)}</span>
                <span className="text-muted-foreground text-[10px] relative z-10">{a.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Time & Sales Live Tape */}
      <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h3 className="text-xs font-bold text-foreground uppercase font-mono">Time & Sales Tape</h3>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">LIVE FEED</span>
        </div>

        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase pb-1 border-b border-border/40">
            <span>Time</span>
            <span>Price</span>
            <span>Size</span>
            <span>Latency</span>
          </div>

          {trades.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/40 hover:border-border transition-colors"
            >
              <span className="text-muted-foreground text-[10px]">{t.time}</span>
              <span className={`font-bold ${t.side === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                {sym}{t.price.toFixed(1)}
              </span>
              <span className="text-foreground font-semibold">{t.qty.toFixed(2)}</span>
              <span className="text-muted-foreground text-[10px]">{t.latencyMs}ms</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
