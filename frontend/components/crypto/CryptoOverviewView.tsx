"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Zap,
  Globe,
  Clock,
  BarChart3,
  Percent,
} from "lucide-react";
import { CryptoMarketOverviewItem } from "@/types/crypto-derivatives";
import { useCryptoRealtime } from "@/hooks/useCryptoRealtime";

export function CryptoOverviewView() {
  const { latestTick, connectionStatus } = useCryptoRealtime();

  const { data, isLoading, error, refetch, isFetching } = useQuery<{
    status: string;
    overview: CryptoMarketOverviewItem[];
  }>({
    queryKey: ["cryptoOverview"],
    queryFn: async () => {
      const res = await fetch("/api/crypto/overview");
      if (!res.ok) throw new Error("Failed to fetch crypto overview");
      return res.json();
    },
    refetchInterval: 4000,
  });

  const overviewList = Array.isArray(data?.overview) ? data.overview : [];

  return (
    <div className="flex flex-col gap-6 text-slate-100 font-sans pb-12">
      {/* Header Banner */}
      <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Crypto Derivatives Hub
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  FUTURES & OPTIONS
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Official Live Feeds • Dynamic Expiries • Black-Scholes Greeks • Multi-Leg Strategies • Paper Execution
              </p>
            </div>
          </div>
        </div>

        {/* System & Data Provenance Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0B101B] px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Provenance:</span>
            <span className="font-semibold text-emerald-400">EXCHANGE DATA (CCXT Binance + Deribit)</span>
          </div>

          <div className="flex items-center gap-2 bg-[#0B101B] px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                connectionStatus === "LIVE"
                  ? "bg-emerald-400"
                  : connectionStatus === "STALE"
                  ? "bg-amber-400"
                  : "bg-rose-400"
              }`}
            />
            <span className="text-slate-400">Feed:</span>
            <span
              className={`font-semibold ${
                connectionStatus === "LIVE"
                  ? "text-emerald-400"
                  : connectionStatus === "STALE"
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {connectionStatus}
            </span>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-[#1E293B] hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 flex items-center justify-center"
            title="Refresh Quotes"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-blue-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Quick Access Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/crypto/futures"
          className="group bg-gradient-to-br from-[#131B2A] to-[#182338] border border-slate-800 hover:border-blue-500/40 rounded-xl p-5 transition-all duration-200 shadow-lg hover:shadow-blue-500/10 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <BarChart3 className="w-5 h-5" />
              </span>
              <span className="text-xs px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 font-mono font-medium">
                Live Terminal
              </span>
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors">
              Crypto Futures Terminal
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Perpetual & Dated quarterly contracts, live funding countdowns, basis tracking, and 14-stage risk pre-checks.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium mt-4 group-hover:translate-x-1 transition-transform">
            <span>Open Futures Terminal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/crypto/options-chain"
          className="group bg-gradient-to-br from-[#131B2A] to-[#182338] border border-slate-800 hover:border-purple-500/40 rounded-xl p-5 transition-all duration-200 shadow-lg hover:shadow-purple-500/10 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Layers className="w-5 h-5" />
              </span>
              <span className="text-xs px-2.5 py-1 rounded bg-purple-500/10 text-purple-400 font-mono font-medium">
                Full Ladder
              </span>
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors">
              Interactive Option Chain
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Full CALL | STRIKE | PUT matrix, dynamic daily/weekly/monthly expiries, ATM & Max OI badges, PCR, Max Pain.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-purple-400 font-medium mt-4 group-hover:translate-x-1 transition-transform">
            <span>Explore Option Chain</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/crypto/options"
          className="group bg-gradient-to-br from-[#131B2A] to-[#182338] border border-slate-800 hover:border-emerald-500/40 rounded-xl p-5 transition-all duration-200 shadow-lg hover:shadow-emerald-500/10 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Percent className="w-5 h-5" />
              </span>
              <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono font-medium">
                Multi-Leg Studio
              </span>
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
              Options Analytics & Strategies
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Multi-leg builder (Straddles, Condors, Spreads), analytical Greeks (Delta, Gamma, Theta, Vega), payoff diagrams.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mt-4 group-hover:translate-x-1 transition-transform">
            <span>Build Option Strategy</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Main Derivatives Market Overview Grid */}
      <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              Crypto Derivatives Universe
            </h2>
            <p className="text-xs text-slate-400">
              Live index pricing, basis, funding rates, open interest, and active option expiries
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono bg-[#0B101B] px-3 py-1 rounded border border-slate-800">
            {overviewList.length} Active Markets
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
            <span className="text-xs">Loading live crypto derivatives...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg">
            Failed to load crypto overview. Please try refreshing.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overviewList.map((item) => {
              const isBullish = item.change_24h >= 0;
              const isPositiveBasis = item.basis >= 0;

              return (
                <div
                  key={item.underlying}
                  className="bg-[#0B101B] border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-base font-bold text-white tracking-wide">{item.underlying}</span>
                        <span className="text-xs text-slate-400 ml-2 font-mono">/ USDT</span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-mono font-medium flex items-center gap-1 ${
                          isBullish ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {isBullish ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {item.change_24h > 0 ? `+${item.change_24h}%` : `${item.change_24h}%`}
                      </span>
                    </div>

                    {/* Price Ladder */}
                    <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-lg bg-[#131B2A] border border-slate-800/80">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Spot Price</span>
                        <span className="text-sm font-bold font-mono text-white">
                          ${item.spot_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Perp Futures</span>
                        <span className="text-sm font-bold font-mono text-blue-400">
                          ${item.futures_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Basis & Funding Metrics */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Basis (Fut - Spot):</span>
                        <span className={`font-mono font-medium ${isPositiveBasis ? "text-emerald-400" : "text-rose-400"}`}>
                          {isPositiveBasis ? `+$${item.basis.toFixed(2)}` : `-$${Math.abs(item.basis).toFixed(2)}`} ({item.basis_pct}%)
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Funding Rate (8h):</span>
                        <span className="font-mono font-medium text-amber-300 flex items-center gap-1">
                          {item.funding_rate_pct > 0 ? `+${item.funding_rate_pct}%` : `${item.funding_rate_pct}%`}
                          <span className="text-[10px] text-slate-500">in {item.funding_countdown}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Open Interest:</span>
                        <span className="font-mono text-slate-200">
                          ${(item.open_interest / 1000).toFixed(1)}k
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Active Expiries:</span>
                        <span className="font-mono text-purple-300">
                          {item.active_expiries_count} dates (Next: {item.nearest_expiry})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800">
                    <Link
                      href={`/crypto/futures?underlying=${item.underlying}`}
                      className="text-center py-1.5 px-2 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-medium transition-colors"
                    >
                      Futures
                    </Link>
                    <Link
                      href={`/crypto/options-chain?underlying=${item.underlying}`}
                      className="text-center py-1.5 px-2 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-xs font-medium transition-colors"
                    >
                      Option Chain
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
