"use client";

import React, { useState, useMemo } from "react";
import {
  Layers,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldAlert,
  ArrowLeftRight,
  Info,
  ChevronDown,
} from "lucide-react";
import { formatPrice, formatVolume } from "@/lib/formatters";
import { NormalizedMarketTick } from "@/lib/market-data/market-feed-store";

interface MarketDepthViewerProps {
  quote?: NormalizedMarketTick | null;
  provider?: string;
}

interface DepthLevel {
  price: number;
  quantity: number;
  orders?: number;
}

export function MarketDepthViewer({ quote, provider }: MarketDepthViewerProps) {
  const [selectedDepthMode, setSelectedDepthMode] = useState<number>(5);

  const rawDepth = quote?.depth;
  const isDelta = (provider || quote?.provider || "").toUpperCase().includes("DELTA");
  const isUpstox = (provider || quote?.provider || "").toUpperCase().includes("UPSTOX");
  const isDhan = (provider || quote?.provider || "").toUpperCase().includes("DHAN");

  // Supported depth modes per provider
  const supportedDepthModes = useMemo(() => {
    if (isDelta) return [1, 5, 15, 20, 30, 200];
    if (isUpstox) return [1, 5, 30];
    if (isDhan) return [1, 5, 20];
    return [1, 5];
  }, [isDelta, isUpstox, isDhan]);

  // Extract bid & ask arrays
  const { bids, asks, maxCumulative, totalBidQty, totalAskQty, spread, spreadPct, imbalancePct } = useMemo(() => {
    let rawBids: DepthLevel[] = [];
    let rawAsks: DepthLevel[] = [];

    if (rawDepth) {
      if (Array.isArray(rawDepth.bids)) {
        rawBids = rawDepth.bids.map((b: any) => ({
          price: Number(b.price || b[0] || 0),
          quantity: Number(b.quantity || b.size || b[1] || 0),
          orders: Number(b.orders || 1),
        }));
      }
      if (Array.isArray(rawDepth.asks)) {
        rawAsks = rawDepth.asks.map((a: any) => ({
          price: Number(a.price || a[0] || 0),
          quantity: Number(a.quantity || a.size || a[1] || 0),
          orders: Number(a.orders || 1),
        }));
      }
    }

    // If no multi-level depth available but top of book exists
    if (rawBids.length === 0 && quote?.bid && quote.bid > 0) {
      rawBids = [{ price: quote.bid, quantity: quote.bidQty || 1, orders: 1 }];
    }
    if (rawAsks.length === 0 && quote?.ask && quote.ask > 0) {
      rawAsks = [{ price: quote.ask, quantity: quote.askQty || 1, orders: 1 }];
    }

    const trimmedBids = rawBids.slice(0, selectedDepthMode);
    const trimmedAsks = rawAsks.slice(0, selectedDepthMode);

    let cumBid = 0;
    const bidsWithCum = trimmedBids.map((b) => {
      cumBid += b.quantity;
      return { ...b, cumulative: cumBid };
    });

    let cumAsk = 0;
    const asksWithCum = trimmedAsks.map((a) => {
      cumAsk += a.quantity;
      return { ...a, cumulative: cumAsk };
    });

    const maxCum = Math.max(cumBid, cumAsk, 1);
    const bestBid = trimmedBids[0]?.price || quote?.bid || 0;
    const bestAsk = trimmedAsks[0]?.price || quote?.ask || 0;
    const sp = bestAsk > 0 && bestBid > 0 ? Math.max(0, bestAsk - bestBid) : null;
    const spPct = sp !== null && bestAsk > 0 ? (sp / bestAsk) * 100 : null;

    const totalB = cumBid || quote?.bidQty || 0;
    const totalA = cumAsk || quote?.askQty || 0;
    const sum = totalB + totalA;
    const imb = sum > 0 ? (totalB / sum) * 100 : 50;

    return {
      bids: bidsWithCum,
      asks: asksWithCum,
      maxCumulative: maxCum,
      totalBidQty: totalB,
      totalAskQty: totalA,
      spread: sp,
      spreadPct: spPct,
      imbalancePct: imb,
    };
  }, [rawDepth, quote, selectedDepthMode]);

  return (
    <div className="bg-[#070D1E] border border-[#1A263D] rounded-2xl overflow-hidden shadow-xl font-sans flex flex-col">
      {/* Depth Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#0A1227] border-b border-[#1A263D]">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-slate-100 tracking-wider">ORDER BOOK & DEPTH</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
            {quote?.symbol || "SELECT INSTRUMENT"}
          </span>
        </div>

        {/* Depth Level Selector */}
        <div className="flex items-center gap-1 bg-[#101C38] p-1 rounded-xl border border-[#22355A]">
          {supportedDepthModes.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSelectedDepthMode(mode)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                selectedDepthMode === mode
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              L{mode}
            </button>
          ))}
        </div>
      </div>

      {/* Imbalance Gauge */}
      <div className="px-4 py-2.5 bg-[#081023] border-b border-[#152037] flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            BIDS: {totalBidQty.toLocaleString()} ({imbalancePct.toFixed(1)}%)
          </span>
          <span className="text-slate-400 text-[10px]">
            Spread: <strong className="text-slate-200">{spread !== null ? formatPrice(spread) : "--"}</strong>
            {spreadPct !== null && ` (${spreadPct.toFixed(3)}%)`}
          </span>
          <span className="text-rose-400 font-bold flex items-center gap-1">
            ASKS: {totalAskQty.toLocaleString()} ({(100 - imbalancePct).toFixed(1)}%)
            <TrendingDown className="h-3 w-3" />
          </span>
        </div>
        <div className="h-1.5 w-full bg-[#142036] rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${imbalancePct}%` }}
          />
          <div
            className="h-full bg-rose-500 transition-all duration-300"
            style={{ width: `${100 - imbalancePct}%` }}
          />
        </div>
      </div>

      {/* Depth Grid (Bids vs Asks) */}
      <div className="grid grid-cols-2 divide-x divide-[#152037] min-h-[220px]">
        {/* Bids Column */}
        <div className="p-2 space-y-1">
          <div className="grid grid-cols-3 text-[10px] font-mono text-slate-500 pb-1 border-b border-[#152037] px-1">
            <span>ORDERS</span>
            <span className="text-right">QTY</span>
            <span className="text-right">BID PRICE</span>
          </div>
          {bids.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-mono">No active bid depth</div>
          ) : (
            bids.map((b, i) => {
              const fillPct = (b.cumulative / maxCumulative) * 100;
              return (
                <div key={i} className="relative grid grid-cols-3 text-xs font-mono py-1 px-1 rounded hover:bg-emerald-950/20 group">
                  <div
                    className="absolute inset-y-0 right-0 bg-emerald-500/10 rounded pointer-events-none transition-all"
                    style={{ width: `${fillPct}%` }}
                  />
                  <span className="text-slate-400 text-[11px] relative z-10">{b.orders || 1}</span>
                  <span className="text-right text-slate-200 relative z-10">{b.quantity.toLocaleString()}</span>
                  <span className="text-right font-bold text-emerald-400 relative z-10">{formatPrice(b.price)}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Asks Column */}
        <div className="p-2 space-y-1">
          <div className="grid grid-cols-3 text-[10px] font-mono text-slate-500 pb-1 border-b border-[#152037] px-1">
            <span>ASK PRICE</span>
            <span className="text-right">QTY</span>
            <span className="text-right">ORDERS</span>
          </div>
          {asks.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-mono">No active ask depth</div>
          ) : (
            asks.map((a, i) => {
              const fillPct = (a.cumulative / maxCumulative) * 100;
              return (
                <div key={i} className="relative grid grid-cols-3 text-xs font-mono py-1 px-1 rounded hover:bg-rose-950/20 group">
                  <div
                    className="absolute inset-y-0 left-0 bg-rose-500/10 rounded pointer-events-none transition-all"
                    style={{ width: `${fillPct}%` }}
                  />
                  <span className="font-bold text-rose-400 relative z-10">{formatPrice(a.price)}</span>
                  <span className="text-right text-slate-200 relative z-10">{a.quantity.toLocaleString()}</span>
                  <span className="text-right text-slate-400 text-[11px] relative z-10">{a.orders || 1}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-[#0A1227] border-t border-[#1A263D] flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span className="flex items-center gap-1">
          <Info className="h-3 w-3 text-slate-400" />
          Depth is indicative of orderbook queue; not a guaranteed execution signal.
        </span>
        <span>
          Feed Age: <strong className="text-slate-400">{quote?.ageMs !== undefined ? `${quote.ageMs}ms` : "--"}</strong>
        </span>
      </div>
    </div>
  );
}
