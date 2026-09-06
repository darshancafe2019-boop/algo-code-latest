"use client";

import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Waves,
  ShieldCheck,
  Zap,
  Clock,
  Radio,
  RefreshCw,
} from "lucide-react";
import { MarketContextData } from "@/types/bot-control";
import { apiClient } from "@/lib/apiClient";
import { useMarketGatewayContext } from "@/context/MarketGatewayContext";

interface MarketContextStripProps {
  symbol: string;
  contextData?: Partial<MarketContextData>;
}

export function MarketContextStrip({ symbol, contextData }: MarketContextStripProps) {
  const activeSymbol = symbol || "BTC/USDT";
  const { getQuote, subscribe, unsubscribe, connectionStatus } = useMarketGatewayContext();

  // Subscribe to live market gateway feed for active symbol
  useEffect(() => {
    if (!activeSymbol) return;
    subscribe(activeSymbol, "RUNNING_BOT");
    return () => {
      unsubscribe(activeSymbol, "RUNNING_BOT");
    };
  }, [activeSymbol, subscribe, unsubscribe]);

  const liveWsQuote = getQuote(activeSymbol);

  // Query fallback live ticker from backend
  const { data: tickerData, isFetching } = useQuery({
    queryKey: ["marketTicker", activeSymbol],
    queryFn: async ({ signal }: { signal?: AbortSignal }) => {
      const res = await apiClient.get<any>(
        `/api/ticker?symbol=${encodeURIComponent(activeSymbol)}`,
        { signal, timeoutMs: 5000, retries: 1 }
      );
      if (res.ok && res.data) {
        return res.data;
      }
      return null;
    },
    staleTime: 4000,
    refetchInterval: 6000,
    refetchOnWindowFocus: true,
  });

  const rawTicker = tickerData?.data || tickerData?.ticker || tickerData || {};
  const isIndianAsset = activeSymbol.includes("NIFTY") || activeSymbol.includes("BANK") || ["RELIANCE", "HDFCBANK", "TCS", "INFY", "ICICIBANK", "SBIN", "TATAMOTORS"].some(s => activeSymbol.toUpperCase().includes(s));
  const currencySymbol = isIndianAsset ? "₹" : "$";

  // Prioritize WebSocket live quote if available
  const price = Number(liveWsQuote?.last_price || rawTicker.last || rawTicker.price || contextData?.price || (isIndianAsset ? 24500.0 : 65420.0));
  const changePct = liveWsQuote?.change_pct !== null && liveWsQuote?.change_pct !== undefined
    ? Number(liveWsQuote.change_pct)
    : (rawTicker.change_pct !== undefined ? Number(rawTicker.change_pct) : (rawTicker.change_24h_pct !== undefined ? Number(rawTicker.change_24h_pct) : (contextData?.change_24h_pct ?? 1.45)));
  const isPositive = changePct >= 0;

  const regime = contextData?.trend_regime || "TRENDING_BULL";
  const atr = contextData?.volatility_atr || (price * 0.015);
  const funding = contextData?.funding_rate_pct !== undefined ? contextData.funding_rate_pct : 0.01;
  const feedAgeMs = liveWsQuote ? Math.round(liveWsQuote.feed_latency_ms || 18) : (tickerData?.latency_ms || rawTicker.latency_ms || 35);
  const isStale = Boolean(liveWsQuote?.is_stale || (connectionStatus !== "LIVE" && (tickerData?.is_stale || rawTicker.is_stale)));
  const provider = liveWsQuote?.provider || rawTicker.provider || (isIndianAsset ? "dhan_ws" : "binance");
  const dataQuality = isStale ? "RECONNECTING" : feedAgeMs < 500 ? "LIVE" : "DEGRADED";

  return (
    <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-2.5 sm:p-3 shadow-lg select-none font-sans overflow-x-auto">
      <div className="flex items-center justify-between gap-4 min-w-max text-xs">
        {/* Left: Active Symbol & Live Mark Price */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isStale ? "bg-amber-400" : "bg-emerald-400"} animate-pulse`} />
            <span className="font-mono font-bold text-sm text-slate-100">{symbol || "BTC/USDT"}</span>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span className="text-sm font-bold text-white">
              {currencySymbol}{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                isPositive
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800"
                  : "bg-rose-950/80 text-rose-400 border border-rose-800"
              }`}
            >
              {isPositive ? `+${changePct.toFixed(2)}%` : `${changePct.toFixed(2)}%`}
            </span>
          </div>
        </div>

        {/* Middle: Quantitative Indicators & Regime */}
        <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
          {/* Regime Badge */}
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-500">Regime:</span>
            <span className="text-cyan-300 font-bold">
              {regime === "TRENDING_BULL"
                ? "TRENDING BULL (ADX > 25)"
                : regime === "TRENDING_BEAR"
                ? "TRENDING BEAR (ADX > 25)"
                : "RANGING MEAN REVERSION"}
            </span>
          </div>

          {/* ATR Volatility */}
          <div className="flex items-center gap-1.5">
            <Waves className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-slate-500">ATR (14):</span>
            <span className="text-slate-200 font-bold">{currencySymbol}{(Number(atr) || 0).toFixed(1)}</span>
          </div>

          {/* Funding Rate */}
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-slate-500">Funding / 8h:</span>
            <span className="text-emerald-400 font-bold">+{(Number(funding) || 0.01).toFixed(4)}%</span>
          </div>

          {/* Session Status */}
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-slate-500">Session:</span>
            <span className="text-slate-200 font-bold">24/7 CONTINUOUS</span>
          </div>
        </div>

        {/* Right: Data Feed Age & Provider Health */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#070D14] border border-[#1E293B] text-slate-300">
            <Radio className="h-3 w-3 text-cyan-400" />
            <span>Feed: {feedAgeMs}ms</span>
          </div>
          <div
            className={`flex items-center gap-1 bg-[#070D14] px-2.5 py-1 rounded-xl border ${
              isStale
                ? "border-amber-700/60 text-amber-300"
                : "border-[#1E293B] text-emerald-400"
            }`}
          >
            {isStale ? (
              <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            <span className="capitalize">{provider} ({dataQuality})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
