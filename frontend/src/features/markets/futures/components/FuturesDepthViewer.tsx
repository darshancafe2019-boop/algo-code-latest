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
import { CanonicalFuturesContract } from "../types/futures";

interface FuturesDepthViewerProps {
  contract: CanonicalFuturesContract | null;
  depthData?: {
    bids: Array<{ price: number; quantity: number; orders?: number }>;
    asks: Array<{ price: number; quantity: number; orders?: number }>;
    timestamp?: string;
  } | null;
}

interface DepthLevel {
  price: number;
  quantity: number;
  orders?: number;
}

export function FuturesDepthViewer({ contract, depthData }: FuturesDepthViewerProps) {
  const [selectedDepthMode, setSelectedDepthMode] = useState<number>(20);

  const provider = contract?.market_data_provider || contract?.provider || "BINANCE_USDM";
  const isDelta = provider.toUpperCase().includes("DELTA");
  const isUpstox = provider.toUpperCase().includes("UPSTOX");
  const isDhan = provider.toUpperCase().includes("DHAN");
  const isBinance = provider.toUpperCase().includes("BINANCE");

  // Supported depth modes per provider
  const supportedDepthModes = useMemo(() => {
    if (isDelta) return [1, 5, 15, 20, 30, 200];
    if (isUpstox) return [1, 5, 30];
    if (isDhan) return [1, 5, 20];
    if (isBinance) return [1, 5, 10, 20];
    return [1, 5, 20];
  }, [isDelta, isUpstox, isDhan, isBinance]);

  // Extract raw depth arrays
  const rawBids: DepthLevel[] = useMemo(() => {
    if (depthData?.bids && Array.isArray(depthData.bids) && depthData.bids.length > 0) {
      return depthData.bids.slice(0, selectedDepthMode);
    }
    if (contract?.bid && contract.bid > 0) {
      return [{ price: contract.bid, quantity: contract.bid_qty || 1.0, orders: 1 }];
    }
    return [];
  }, [depthData, contract, selectedDepthMode]);

  const rawAsks: DepthLevel[] = useMemo(() => {
    if (depthData?.asks && Array.isArray(depthData.asks) && depthData.asks.length > 0) {
      return depthData.asks.slice(0, selectedDepthMode);
    }
    if (contract?.ask && contract.ask > 0) {
      return [{ price: contract.ask, quantity: contract.ask_qty || 1.0, orders: 1 }];
    }
    return [];
  }, [depthData, contract, selectedDepthMode]);

  // Compute cumulative volumes and maximums for visual bars
  const { bidsWithCum, asksWithCum, maxCumulativeVol, totalBidVol, totalAskVol } = useMemo(() => {
    let cumBid = 0;
    const bids = rawBids.map((b) => {
      cumBid += b.quantity;
      return { ...b, cumulative: cumBid };
    });

    let cumAsk = 0;
    const asks = rawAsks.map((a) => {
      cumAsk += a.quantity;
      return { ...a, cumulative: cumAsk };
    });

    const maxCum = Math.max(cumBid, cumAsk, 1.0);
    return {
      bidsWithCum: bids,
      asksWithCum: asks,
      maxCumulativeVol: maxCum,
      totalBidVol: cumBid,
      totalAskVol: cumAsk,
    };
  }, [rawBids, rawAsks]);

  // Spread and Imbalance calculations
  const bestBid = rawBids[0]?.price ?? contract?.bid ?? null;
  const bestAsk = rawAsks[0]?.price ?? contract?.ask ?? null;
  const spread = bestBid && bestAsk ? Math.max(0, bestAsk - bestBid) : null;
  const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : (contract?.last_price || null);
  const spreadBps = spread && midPrice && midPrice > 0 ? (spread / midPrice) * 10000 : null;

  const totalVolSum = totalBidVol + totalAskVol;
  const bidRatio = totalVolSum > 0 ? (totalBidVol / totalVolSum) * 100 : 50;
  const askRatio = totalVolSum > 0 ? (totalAskVol / totalVolSum) * 100 : 50;
  const imbalancePct = totalVolSum > 0 ? ((totalBidVol - totalAskVol) / totalVolSum) * 100 : 0;

  const curr = contract?.quote_currency || (contract?.currency === "INR" ? "₹" : "$");

  return (
    <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl font-mono text-xs select-none space-y-3">
      {/* 1. Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <span>ORDER BOOK (L2 DEPTH)</span>
            {contract && (
              <span className="text-cyan-300 text-xs px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
                {contract.symbol}
              </span>
            )}
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
            {provider}
          </span>
        </div>

        {/* Depth Mode Selectors */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          {supportedDepthModes.map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedDepthMode(mode)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                selectedDepthMode === mode
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              L{mode}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80">
        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Spread</span>
          <span className="font-bold text-slate-200">
            {spread != null ? formatPrice(spread) : "—"} {spreadBps != null && `(${spreadBps.toFixed(1)} bps)`}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Mid Price</span>
          <span className="font-bold text-slate-200">
            {midPrice != null ? formatPrice(midPrice) : "—"}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Total Bid Vol</span>
          <span className="font-bold text-emerald-400">{formatVolume(totalBidVol)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Total Ask Vol</span>
          <span className="font-bold text-rose-400">{formatVolume(totalAskVol)}</span>
        </div>
      </div>

      {/* 3. Imbalance Gauge */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
          <span className="text-emerald-400">BID {bidRatio.toFixed(1)}%</span>
          <span className={imbalancePct >= 0 ? "text-emerald-300" : "text-rose-300"}>
            Imbalance: {imbalancePct >= 0 ? "+" : ""}{imbalancePct.toFixed(1)}%
          </span>
          <span className="text-rose-400">ASK {askRatio.toFixed(1)}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${bidRatio}%` }} />
          <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${askRatio}%` }} />
        </div>
      </div>

      {/* 4. Dual Ladder Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Bids Ladder */}
        <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
          <div className="px-3 py-1.5 bg-emerald-500/10 border-b border-slate-800 text-emerald-400 font-bold flex justify-between text-[11px]">
            <span>BID QUANTITY</span>
            <span>BID PRICE ({curr})</span>
          </div>
          <div className="divide-y divide-slate-800/40 max-h-[360px] overflow-y-auto custom-scrollbar">
            {bidsWithCum.length === 0 ? (
              <div className="py-8 text-center text-slate-600 text-xs">No bid liquidity reported</div>
            ) : (
              bidsWithCum.map((b, i) => {
                const fillPct = (b.cumulative / maxCumulativeVol) * 100;
                return (
                  <div key={i} className="relative px-3 py-1.5 flex justify-between items-center text-xs">
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 pointer-events-none transition-all duration-150"
                      style={{ width: `${fillPct}%` }}
                    />
                    <span className="text-slate-300 font-semibold relative z-10">{formatVolume(b.quantity)}</span>
                    <span className="text-emerald-400 font-bold relative z-10">{formatPrice(b.price)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Asks Ladder */}
        <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
          <div className="px-3 py-1.5 bg-rose-500/10 border-b border-slate-800 text-rose-400 font-bold flex justify-between text-[11px]">
            <span>ASK PRICE ({curr})</span>
            <span>ASK QUANTITY</span>
          </div>
          <div className="divide-y divide-slate-800/40 max-h-[360px] overflow-y-auto custom-scrollbar">
            {asksWithCum.length === 0 ? (
              <div className="py-8 text-center text-slate-600 text-xs">No ask liquidity reported</div>
            ) : (
              asksWithCum.map((a, i) => {
                const fillPct = (a.cumulative / maxCumulativeVol) * 100;
                return (
                  <div key={i} className="relative px-3 py-1.5 flex justify-between items-center text-xs">
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-rose-500/10 pointer-events-none transition-all duration-150"
                      style={{ width: `${fillPct}%` }}
                    />
                    <span className="text-rose-400 font-bold relative z-10">{formatPrice(a.price)}</span>
                    <span className="text-slate-300 font-semibold relative z-10">{formatVolume(a.quantity)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
