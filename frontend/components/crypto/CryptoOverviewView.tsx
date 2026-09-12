"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Zap,
  Globe,
  BarChart3,
  Percent,
} from "lucide-react";
import { CryptoMarketOverviewItem } from "@/types/crypto-derivatives";
import { useCryptoRealtime } from "@/hooks/useCryptoRealtime";
import { cn } from "@/lib/utils";

export function CryptoOverviewView() {
  const { connectionStatus } = useCryptoRealtime();

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
    <div className="flex flex-col gap-5 text-[#F7FAFC] font-sans pb-12">
      {/* Header Banner */}
      <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-5 shadow-none flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/30">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[#F7FAFC] flex items-center gap-2">
                Crypto Derivatives Hub
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-[#2563EB]/15 text-[#19C5FF] border border-[#2563EB]/30">
                  FUTURES & OPTIONS
                </span>
              </h1>
              <p className="text-xs text-[#7C8CA3] mt-0.5">
                Official Live Feeds • Dynamic Expiries • Black-Scholes Greeks • Multi-Leg Strategies • Paper Execution
              </p>
            </div>
          </div>
        </div>

        {/* System & Data Provenance Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0D1727] px-3 py-1.5 rounded-lg border border-[#1A2A3F] text-xs">
            <ShieldCheck className="w-4 h-4 text-[#00E890]" />
            <span className="text-[#7C8CA3]">Provenance:</span>
            <span className="font-semibold text-[#00E890]">EXCHANGE DATA (CCXT Binance + Deribit)</span>
          </div>

          <div className="flex items-center gap-2 bg-[#0D1727] px-3 py-1.5 rounded-lg border border-[#1A2A3F] text-xs">
            <span
              className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                connectionStatus === "LIVE"
                  ? "bg-[#00E890]"
                  : connectionStatus === "STALE"
                  ? "bg-[#F59E0B]"
                  : "bg-[#FF3B5C]"
              )}
            />
            <span className="text-[#7C8CA3]">Feed:</span>
            <span
              className={cn(
                "font-semibold",
                connectionStatus === "LIVE"
                  ? "text-[#00E890]"
                  : connectionStatus === "STALE"
                  ? "text-[#F59E0B]"
                  : "text-[#FF3B5C]"
              )}
            >
              {connectionStatus}
            </span>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#F7FAFC] transition-colors border border-[#1A2A3F] flex items-center justify-center cursor-pointer"
            title="Refresh Quotes"
          >
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin text-[#22D3EE]")} />
          </button>
        </div>
      </div>

      {/* Quick Access Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/crypto/futures"
          className="group bg-[#0A1422] border border-[#1A2A3F] hover:border-[#29415F] rounded-xl p-5 transition-colors flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-lg bg-[#2563EB]/10 text-[#19C5FF] border border-[#2563EB]/20">
                <BarChart3 className="w-5 h-5" />
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#2563EB]/10 text-[#19C5FF] font-mono font-medium">
                Live Terminal
              </span>
            </div>
            <h3 className="text-sm font-semibold text-[#F7FAFC] group-hover:text-[#19C5FF] transition-colors">
              Crypto Futures Terminal
            </h3>
            <p className="text-xs text-[#7C8CA3] mt-1">
              Perpetual & Dated quarterly contracts, live funding countdowns, basis tracking, and 14-stage risk pre-checks.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#19C5FF] font-medium mt-4">
            <span>Open Futures Terminal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/crypto/options-chain"
          className="group bg-[#0A1422] border border-[#1A2A3F] hover:border-[#29415F] rounded-xl p-5 transition-colors flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-lg bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/20">
                <Layers className="w-5 h-5" />
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#8B5CF6]/10 text-[#A78BFA] font-mono font-medium">
                Full Ladder
              </span>
            </div>
            <h3 className="text-sm font-semibold text-[#F7FAFC] group-hover:text-[#A78BFA] transition-colors">
              Interactive Option Chain
            </h3>
            <p className="text-xs text-[#7C8CA3] mt-1">
              Full CALL | STRIKE | PUT matrix, dynamic daily/weekly/monthly expiries, ATM & Max OI badges, PCR, Max Pain.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#A78BFA] font-medium mt-4">
            <span>Explore Option Chain</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/crypto/options"
          className="group bg-[#0A1422] border border-[#1A2A3F] hover:border-[#29415F] rounded-xl p-5 transition-colors flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-lg bg-[#00E890]/10 text-[#00E890] border border-[#00E890]/20">
                <Percent className="w-5 h-5" />
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#00E890]/10 text-[#00E890] font-mono font-medium">
                Multi-Leg Studio
              </span>
            </div>
            <h3 className="text-sm font-semibold text-[#F7FAFC] group-hover:text-[#00E890] transition-colors">
              Options Analytics & Strategies
            </h3>
            <p className="text-xs text-[#7C8CA3] mt-1">
              Multi-leg builder (Straddles, Condors, Spreads), analytical Greeks (Delta, Gamma, Theta, Vega), payoff diagrams.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#00E890] font-medium mt-4">
            <span>Build Option Strategy</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Main Derivatives Market Overview Grid */}
      <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-5 shadow-none">
        <div className="flex items-center justify-between mb-4 border-b border-[#122033] pb-3">
          <div>
            <h2 className="text-sm font-semibold text-[#F7FAFC] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#19C5FF]" />
              Crypto Derivatives Universe
            </h2>
            <p className="text-xs text-[#7C8CA3]">
              Live index pricing, basis, funding rates, open interest, and active option expiries
            </p>
          </div>
          <span className="text-xs text-[#7C8CA3] font-mono bg-[#0D1727] px-3 py-1 rounded-lg border border-[#1A2A3F]">
            {overviewList.length} Active Markets
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#7C8CA3]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#19C5FF]" />
            <span className="text-xs">Loading live crypto derivatives...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-[#FF3B5C] text-xs bg-[#FF3B5C]/10 border border-[#FF3B5C]/20 rounded-lg">
            Failed to load crypto overview. Please try refreshing.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overviewList.map((item) => {
              const isBullish = item.change_24h >= 0;

              return (
                <div
                  key={item.underlying}
                  className="bg-[#0D1727] border border-[#1A2A3F] rounded-xl p-4 flex flex-col justify-between hover:border-[#29415F] transition-colors"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-base font-bold text-[#F7FAFC] tracking-wide">{item.underlying}</span>
                        <span className="text-xs text-[#7C8CA3] ml-2 font-mono">/ USDT</span>
                      </div>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded font-mono font-medium flex items-center gap-1",
                          isBullish ? "bg-[#00E890]/10 text-[#00E890]" : "bg-[#FF3B5C]/10 text-[#FF3B5C]"
                        )}
                      >
                        {isBullish ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {item.change_24h > 0 ? `+${item.change_24h}%` : `${item.change_24h}%`}
                      </span>
                    </div>

                    {/* Price Ladder */}
                    <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-lg bg-[#0A1422] border border-[#122033]">
                      <div>
                        <span className="text-[11px] text-[#7C8CA3] block">Spot Price</span>
                        <span className="text-sm font-bold font-mono text-[#F7FAFC] tabular-nums">
                          ${item.spot_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-[#7C8CA3] block">Futures Index</span>
                        <span className="text-sm font-bold font-mono text-[#F7FAFC] tabular-nums">
                          ${item.futures_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
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
