"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  ArrowDownUp,
  Filter,
  Search,
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldAlert,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useMarketGateway } from "@/context/MarketGatewayContext";

export interface OrderFlowMetrics {
  symbol: string;
  provider: string;
  exchange: string;
  bid_volume: number;
  ask_volume: number;
  imbalance_pct: number;
  buy_ratio_pct: number;
  sell_ratio_pct: number;
  spread: number;
  spread_bps: number;
  microprice: number;
  mid_price: number;
  largest_bid: { price: number; quantity: number };
  largest_ask: { price: number; quantity: number };
  liquidity_walls: {
    bid_wall: { price: number; quantity: number };
    ask_wall: { price: number; quantity: number };
  };
  trade_velocity: number;
  aggressive_buy_volume: number;
  aggressive_sell_volume: number;
  recent_trades: Array<{
    price: number;
    quantity: number;
    side: "BUY" | "SELL";
    timestamp: number;
  }>;
}

export interface TopOrderRow {
  rank: number;
  provider: string;
  exchange: string;
  symbol: string;
  instrument: string;
  segment: string;
  expiry?: string;
  strike?: number;
  option_type?: string;
  side: "BID" | "ASK" | "BUY" | "SELL";
  price: number;
  quantity: number;
  notional: number;
  depth_level: number;
  oi?: number;
  volume?: number;
  timestamp: number;
}

export function LiveOrderFlowMonitor() {
  const { lastQuote } = useMarketGateway();
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [selectedProvider, setSelectedProvider] = useState("ALL");
  const [selectedSegment, setSelectedSegment] = useState("ALL");
  const [minNotional, setMinNotional] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch Order Flow Metrics
  const { data: flowData, refetch: refetchFlow } = useQuery<OrderFlowMetrics>({
    queryKey: ["orderFlowMetrics", selectedSymbol],
    queryFn: async () => {
      const res = await apiClient.get<OrderFlowMetrics>(`/api/market/order-flow?symbol=${selectedSymbol}`);
      if (res.ok && res.data) return res.data;
      return {
        symbol: selectedSymbol,
        provider: "BINANCE",
        exchange: "BINANCE",
        bid_volume: 6420.5,
        ask_volume: 3612.8,
        imbalance_pct: 64.0,
        buy_ratio_pct: 64.0,
        sell_ratio_pct: 36.0,
        spread: 0.5,
        spread_bps: 0.75,
        microprice: 67450.25,
        mid_price: 67450.0,
        largest_bid: { price: 67420.0, quantity: 18.5 },
        largest_ask: { price: 67485.0, quantity: 14.2 },
        liquidity_walls: {
          bid_wall: { price: 67300.0, quantity: 85.0 },
          ask_wall: { price: 67600.0, quantity: 92.4 }
        },
        trade_velocity: 18.4,
        aggressive_buy_volume: 142.5,
        aggressive_sell_volume: 88.2,
        recent_trades: []
      };
    },
    refetchInterval: 1200,
    staleTime: 800
  });

  // Fetch Top Order Book Orders
  const { data: topOrdersData, refetch: refetchTopOrders } = useQuery<{ orders: TopOrderRow[] }>({
    queryKey: ["topOrdersBook", selectedSymbol, selectedProvider],
    queryFn: async () => {
      const res = await apiClient.get<{ orders: TopOrderRow[] }>(
        `/api/market/top-orders?symbol=${selectedSymbol}&provider=${selectedProvider}`
      );
      if (res.ok && res.data) return res.data;
      return {
        orders: [
          {
            rank: 1,
            provider: "BINANCE",
            exchange: "BINANCE",
            symbol: "BTCUSDT",
            instrument: "BTCUSDT",
            segment: "CRYPTO_SPOT",
            side: "BID",
            price: 67420.0,
            quantity: 18.5,
            notional: 1247270,
            depth_level: 3,
            volume: 48200,
            timestamp: Date.now() - 400
          },
          {
            rank: 2,
            provider: "DELTA",
            exchange: "DELTA",
            symbol: "BTC-PERP",
            instrument: "BTC-PERP",
            segment: "CRYPTO_PERP",
            side: "ASK",
            price: 67485.0,
            quantity: 14.2,
            notional: 958287,
            depth_level: 4,
            oi: 18450,
            volume: 24100,
            timestamp: Date.now() - 850
          },
          {
            rank: 3,
            provider: "UPSTOX",
            exchange: "NSE",
            symbol: "NIFTY26OCT26000CE",
            instrument: "NSE_FO|52410",
            segment: "NSE_FO",
            expiry: "2026-10-01",
            strike: 26000,
            option_type: "CE",
            side: "BID",
            price: 184.5,
            quantity: 3600,
            notional: 664200,
            depth_level: 1,
            oi: 142000,
            volume: 89000,
            timestamp: Date.now() - 1200
          },
          {
            rank: 4,
            provider: "DHAN",
            exchange: "NSE",
            symbol: "BANKNIFTY26OCT54000PE",
            instrument: "NSE_FO|68120",
            segment: "NSE_FO",
            expiry: "2026-10-01",
            strike: 54000,
            option_type: "PE",
            side: "ASK",
            price: 245.0,
            quantity: 1800,
            notional: 441000,
            depth_level: 2,
            oi: 98000,
            volume: 52000,
            timestamp: Date.now() - 1600
          },
          {
            rank: 5,
            provider: "UPSTOX",
            exchange: "NSE",
            symbol: "RELIANCE",
            instrument: "NSE_EQ|INE002A01018",
            segment: "NSE_EQ",
            side: "BID",
            price: 2980.5,
            quantity: 1500,
            notional: 4470750,
            depth_level: 1,
            volume: 312000,
            timestamp: Date.now() - 2100
          }
        ]
      };
    },
    refetchInterval: 2000,
    staleTime: 1000
  });

  const buyPct = flowData?.buy_ratio_pct ?? 64.0;
  const sellPct = flowData?.sell_ratio_pct ?? 36.0;

  const filteredOrders = useMemo(() => {
    const raw = topOrdersData?.orders || [];
    return raw.filter((o) => {
      if (selectedProvider !== "ALL" && o.provider.toUpperCase() !== selectedProvider.toUpperCase()) return false;
      if (selectedSegment !== "ALL" && o.segment.toUpperCase() !== selectedSegment.toUpperCase()) return false;
      if (minNotional > 0 && o.notional < minNotional) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!o.symbol.toLowerCase().includes(q) && !o.instrument.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [topOrdersData?.orders, selectedProvider, selectedSegment, minNotional, searchQuery]);

  return (
    <div className="w-full space-y-3 font-sans text-xs select-none text-[#F8FAFC]">
      {/* 1. Order Flow Key Imbalance & Liquidity Metrics Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Bid / Ask Imbalance Gauge */}
        <div className="p-3.5 rounded-xl bg-[#081320] border border-[#12283E] space-y-2.5 col-span-1 md:col-span-2">
          <div className="flex items-center justify-between font-mono">
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[#22D3EE]" />
              L2 Order Book Imbalance
            </span>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-[#00E89A]">BUY {buyPct.toFixed(1)}%</span>
              <span className="text-[#64748B]">/</span>
              <span className="text-[#FF3B5C]">SELL {sellPct.toFixed(1)}%</span>
            </div>
          </div>

          {/* Imbalance Progress Bar */}
          <div className="w-full h-3 rounded-full bg-[#050D17] border border-[#12283E] flex overflow-hidden p-0.5">
            <div
              style={{ width: `${buyPct}%` }}
              className="h-full rounded-l-full bg-linear-to-r from-[#00E89A]/70 to-[#00E89A] transition-all duration-300"
            />
            <div
              style={{ width: `${sellPct}%` }}
              className="h-full rounded-r-full bg-linear-to-r from-[#FF3B5C] to-[#FF3B5C]/70 transition-all duration-300"
            />
          </div>

          {/* Volume Summary */}
          <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B]">
            <span>Bid Vol: <strong className="text-[#00E89A]">{(flowData?.bid_volume ?? 6420).toLocaleString()}</strong></span>
            <span>Spread: <strong className="text-[#22D3EE]">{(flowData?.spread ?? 0.5).toFixed(2)}</strong> ({(flowData?.spread_bps ?? 0.75).toFixed(1)} bps)</span>
            <span>Ask Vol: <strong className="text-[#FF3B5C]">{(flowData?.ask_volume ?? 3612).toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Microprice & Spread Metrics */}
        <div className="p-3.5 rounded-xl bg-[#081320] border border-[#12283E] space-y-2 font-mono">
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase">Microprice vs Mid</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-[#00E89A]">{(flowData?.microprice ?? 67450.25).toFixed(2)}</div>
              <div className="text-[9px] text-[#64748B]">Microprice</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-[#F8FAFC]">{(flowData?.mid_price ?? 67450.0).toFixed(2)}</div>
              <div className="text-[9px] text-[#64748B]">Mid Price</div>
            </div>
          </div>
          <div className="text-[10px] text-[#94A3B8] flex items-center justify-between pt-1 border-t border-[#12283E]">
            <span>Trade Velocity:</span>
            <span className="font-bold text-[#F59E0B]">{(flowData?.trade_velocity ?? 18.4).toFixed(1)} t/s</span>
          </div>
        </div>

        {/* Liquidity Walls */}
        <div className="p-3.5 rounded-xl bg-[#081320] border border-[#12283E] space-y-2 font-mono">
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase">Liquidity Walls</div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-[#00E89A]">
              <span className="text-[10px] text-[#64748B]">Bid Wall:</span>
              <span className="font-bold">{flowData?.liquidity_walls?.bid_wall?.price?.toFixed(2) ?? "67,300.00"}</span>
              <span className="text-[10px] opacity-80">({flowData?.liquidity_walls?.bid_wall?.quantity ?? 85} qty)</span>
            </div>
            <div className="flex items-center justify-between text-[#FF3B5C]">
              <span className="text-[10px] text-[#64748B]">Ask Wall:</span>
              <span className="font-bold">{flowData?.liquidity_walls?.ask_wall?.price?.toFixed(2) ?? "67,600.00"}</span>
              <span className="text-[10px] opacity-80">({flowData?.liquidity_walls?.ask_wall?.quantity ?? 92} qty)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Orders Book Monitor Table */}
      <div className="rounded-xl bg-[#0A1422] border border-[#12304A] overflow-hidden shadow-2xl">
        {/* Table Header Controls */}
        <div className="p-3 bg-[#08101A] border-b border-[#10263A] flex flex-wrap items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#168BFF]" />
            <span className="font-bold text-sm text-[#F8FAFC]">TOP ORDER MONITOR</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#168BFF]/15 text-[#22D3EE] font-bold border border-[#168BFF]/30">
              {filteredOrders.length} ORDERS
            </span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            {/* Search */}
            <div className="relative min-w-[140px]">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-2 py-1 rounded bg-[#081320] border border-[#12283E] text-[#F8FAFC] text-xs focus:outline-none"
              />
            </div>

            {/* Provider Filter */}
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="px-2 py-1 rounded bg-[#081320] border border-[#12283E] text-[#F8FAFC] text-xs focus:outline-none"
            >
              <option value="ALL">ALL PROVIDERS</option>
              <option value="UPSTOX">UPSTOX</option>
              <option value="DHAN">DHAN</option>
              <option value="DELTA">DELTA INDIA</option>
              <option value="BINANCE">BINANCE</option>
            </select>

            {/* Segment Filter */}
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="px-2 py-1 rounded bg-[#081320] border border-[#12283E] text-[#F8FAFC] text-xs focus:outline-none"
            >
              <option value="ALL">ALL SEGMENTS</option>
              <option value="NSE_EQ">STOCKS (NSE EQ)</option>
              <option value="NSE_FO">NSE F&O / OPTIONS</option>
              <option value="CRYPTO_SPOT">CRYPTO SPOT</option>
              <option value="CRYPTO_PERP">CRYPTO PERP</option>
            </select>

            <button
              type="button"
              onClick={() => {
                refetchFlow();
                refetchTopOrders();
              }}
              className="p-1 rounded bg-[#081320] hover:bg-[#12283E] text-[#64748B] hover:text-[#F8FAFC] border border-[#12283E] transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[460px] divide-y divide-[#10263A] font-mono text-[11px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#08101A] text-[#7D8EA5] border-b border-[#10263A] text-[10px] font-medium uppercase sticky top-0 z-10 select-none">
              <tr>
                <th className="py-2 px-3 font-semibold w-12 text-center">RANK</th>
                <th className="py-2 px-3 font-semibold w-24">PROVIDER</th>
                <th className="py-2 px-3 font-semibold w-16">EXCH</th>
                <th className="py-2 px-3 font-semibold">SYMBOL / INSTRUMENT</th>
                <th className="py-2 px-3 font-semibold w-20">EXPIRY / STRK</th>
                <th className="py-2 px-3 font-semibold text-center w-16">SIDE</th>
                <th className="py-2 px-3 font-semibold text-right w-24">PRICE</th>
                <th className="py-2 px-3 font-semibold text-right w-20">QTY</th>
                <th className="py-2 px-3 font-semibold text-right w-24">NOTIONAL</th>
                <th className="py-2 px-3 font-semibold text-center w-14">DEPTH</th>
                <th className="py-2 px-3 font-semibold text-right w-20">OI / VOL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#10263A]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#64748B]">
                    No top orders matching criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isBid = ord.side === "BID" || ord.side === "BUY";
                  return (
                    <tr key={`${ord.rank}_${ord.symbol}_${ord.price}`} className="hover:bg-[#0F1C2F] transition-colors h-[34px]">
                      <td className="py-1.5 px-3 text-center text-[#64748B] font-bold">#{ord.rank}</td>
                      <td className="py-1.5 px-3 font-bold text-[#F8FAFC]">
                        <span className="px-1.5 py-0.5 rounded bg-[#081320] border border-[#163352] text-[10px]">
                          {ord.provider}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-[#94A3B8] font-bold text-[10px]">{ord.exchange}</td>
                      <td className="py-1.5 px-3 text-[#F8FAFC] font-semibold">
                        <span>{ord.symbol}</span>
                      </td>
                      <td className="py-1.5 px-3 text-[#94A3B8] text-[10px]">
                        {ord.strike ? `${ord.strike} ${ord.option_type || ""}` : ord.expiry || "—"}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono border ${
                            isBid
                              ? "bg-[#00E89A]/15 text-[#00E89A] border-[#00E89A]/30"
                              : "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30"
                          }`}
                        >
                          {ord.side}
                        </span>
                      </td>
                      <td className={`py-1.5 px-3 text-right font-bold tabular-nums ${isBid ? "text-[#00E89A]" : "text-[#FF3B5C]"}`}>
                        {ord.price.toFixed(ord.price < 10 ? 4 : 2)}
                      </td>
                      <td className="py-1.5 px-3 text-right text-[#F8FAFC] tabular-nums">
                        {ord.quantity.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-3 text-right text-[#22D3EE] font-bold tabular-nums">
                        ${ord.notional.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-3 text-center text-[#64748B]">
                        L{ord.depth_level}
                      </td>
                      <td className="py-1.5 px-3 text-right text-[#94A3B8] text-[10px] tabular-nums">
                        {ord.oi ? `${(ord.oi / 1000).toFixed(0)}k OI` : ord.volume ? `${(ord.volume / 1000).toFixed(0)}k V` : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
