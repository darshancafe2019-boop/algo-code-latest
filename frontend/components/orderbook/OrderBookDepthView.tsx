"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity,
  Zap,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { formatNumber, formatPrice, formatPercent, toNumeric } from "@/lib/formatters";

interface OrderBookDepthResponse {
  status: string;
  symbol: string;
  best_bid: number;
  best_ask: number;
  spread: number;
  total_bid_volume: number;
  total_ask_volume: number;
  imbalance_ratio: number;
  pressure: "BUY PRESSURE" | "SELL PRESSURE" | "NEUTRAL";
  bids: [number, number][];
  asks: [number, number][];
}

export function OrderBookDepthView({ defaultSymbol = "BTC/USDT" }: { defaultSymbol?: string }) {
  const [symbol, setSymbol] = useState(defaultSymbol);

  const { data, isLoading, refetch, isFetching } = useQuery<OrderBookDepthResponse>({
    queryKey: ["orderBookDepth", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/orderbook/depth?symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error("Failed to fetch order book depth");
      return res.json();
    },
    refetchInterval: 3000,
  });

  const isBuyPressure = data?.pressure === "BUY PRESSURE";
  const isSellPressure = data?.pressure === "SELL PRESSURE";

  const maxDepthVol = Math.max(
    ...(data?.bids?.map((b) => Number(b[1])) || [1]),
    ...(data?.asks?.map((a) => Number(a[1])) || [1])
  );

  return (
    <div className="space-y-4 text-slate-100 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#131B2A] border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 font-mono">
              <span>LIVE ORDER BOOK DEPTH & PRESSURE</span>
              <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                LEVEL 2 DIRECT
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Real-time bid/ask liquidity clusters, volume imbalance, and order book pressure
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-[#0B0F17] border border-slate-700 text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-bold"
          >
            <option value="BTC/USDT">BTC/USDT (Binance Perp)</option>
            <option value="ETH/USDT">ETH/USDT (Binance Perp)</option>
            <option value="SOL/USDT">SOL/USDT (Binance Perp)</option>
            <option value="NIFTY">NIFTY 50 (NSE Index)</option>
            <option value="BANKNIFTY">BANK NIFTY (NSE Index)</option>
          </select>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-slate-300 transition-all disabled:opacity-50"
            title="Refresh Depth"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-4 shadow-md flex flex-col">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Book Pressure</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
                  isBuyPressure
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : isSellPressure
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    : "bg-slate-800 text-slate-300 border border-slate-700"
                }`}
              >
                {data.pressure || "NEUTRAL"}
              </span>
            </div>
          </div>

          <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-4 shadow-md flex flex-col">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Imbalance Ratio</span>
            <span className="text-lg font-bold text-white mt-1 font-mono">
              {formatPercent((toNumeric(data.imbalance_ratio) ?? 0) * 100, 1)}
            </span>
          </div>

          <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-4 shadow-md flex flex-col">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Best Spread</span>
            <span className="text-lg font-bold text-cyan-400 mt-1 font-mono">
              {formatPrice(data.spread, "$", 2)}
            </span>
          </div>

          <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-4 shadow-md flex flex-col">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Bid / Ask Vol</span>
            <span className="text-sm font-bold text-slate-200 mt-1 font-mono">
              <span className="text-emerald-400">{formatNumber(data.total_bid_volume, 2)}</span> /{" "}
              <span className="text-rose-400">{formatNumber(data.total_ask_volume, 2)}</span>
            </span>
          </div>
        </div>
      )}

      {/* Dual Ladder Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bids (Buy Orders) */}
        <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
              <TrendingUp className="w-4 h-4" />
              <span>Bids (Buy Orders)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Depth (Top 10)</span>
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            {(data?.bids || []).map((b, i) => {
              const price = Number(b[0]);
              const amount = Number(b[1]);
              const widthPct = Math.min(100, (amount / (maxDepthVol * 0.5)) * 100);

              return (
                <div key={i} className="relative flex items-center justify-between py-1 px-2.5 rounded bg-[#0B0F17]/60 overflow-hidden text-xs font-mono">
                  <div
                    style={{ width: `${widthPct}%` }}
                    className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 transition-all duration-300"
                  ></div>
                  <span className="font-bold text-emerald-400 relative z-10">{formatPrice(price, "$", 2)}</span>
                  <span className="text-slate-300 relative z-10">{formatNumber(amount, 4)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Asks (Sell Orders) */}
        <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase">
              <TrendingDown className="w-4 h-4" />
              <span>Asks (Sell Orders)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Depth (Top 10)</span>
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            {(data?.asks || []).map((a, i) => {
              const price = Number(a[0]);
              const amount = Number(a[1]);
              const widthPct = Math.min(100, (amount / (maxDepthVol * 0.5)) * 100);

              return (
                <div key={i} className="relative flex items-center justify-between py-1 px-2.5 rounded bg-[#0B0F17]/60 overflow-hidden text-xs font-mono">
                  <div
                    style={{ width: `${widthPct}%` }}
                    className="absolute left-0 top-0 bottom-0 bg-rose-500/15 transition-all duration-300"
                  ></div>
                  <span className="font-bold text-rose-400 relative z-10">{formatPrice(price, "$", 2)}</span>
                  <span className="text-slate-300 relative z-10">{formatNumber(amount, 4)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
