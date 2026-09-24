"use client";

import React, { memo, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Wifi,
  WifiOff,
  Bell,
  ShieldCheck,
  Zap,
  Globe,
  RefreshCw,
  Layers,
} from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useMarketGatewayContext, NormalizedQuote } from "@/context/MarketGatewayContext";
import { useMultiMarketGateway } from "@/hooks/useMarketGateway";
import { formatPrice, formatPercent, formatNumber } from "@/lib/formatters";

const WATCH_SYMBOLS = [
  "NIFTY",
  "BANKNIFTY",
  "SENSEX",
  "BTCUSDT",
  "ETHUSDT",
  "RELIANCE",
  "AAPL",
];

interface TickerBadgeProps {
  symbol: string;
  quote?: NormalizedQuote | null;
}

const TickerBadge = memo(function TickerBadge({ symbol, quote }: TickerBadgeProps) {
  const isPositive = (quote?.change_pct ?? 0) >= 0;
  const isStale = quote?.is_stale;
  const hasPrice = quote && quote.last_price > 0;

  const displayPrice = useMemo(() => {
    if (!hasPrice) return "—";
    const p = quote!.last_price;
    if (symbol.includes("USDT") || symbol === "AAPL") {
      return `$${p >= 1000 ? formatNumber(p, 2) : p.toFixed(2)}`;
    }
    return `₹${p >= 1000 ? formatNumber(p, 2) : p.toFixed(2)}`;
  }, [hasPrice, quote, symbol]);

  const changePct = quote?.change_pct != null ? quote.change_pct : null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0b1329]/80 border border-cyan-900/30 hover:border-cyan-500/40 transition-all group backdrop-blur-sm">
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-200 tracking-wider group-hover:text-cyan-300 transition-colors">
            {symbol}
          </span>
          {isStale && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
              STALE
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-slate-100 font-semibold">{displayPrice}</span>
          {changePct !== null ? (
            <span
              className={`flex items-center text-[10px] font-bold ${
                isPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-2.5 h-2.5 mr-0.5 inline" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5 mr-0.5 inline" />
              )}
              {isPositive ? "+" : ""}
              {changePct.toFixed(2)}%
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">syncing</span>
          )}
        </div>
      </div>
    </div>
  );
});

export const PortfolioHeaderStrip = memo(function PortfolioHeaderStrip() {
  const { tradingMode, setTradingMode, isLive, isStale } = useGlobalData();
  const { connectionStatus } = useMarketGatewayContext();
  const quotes = useMultiMarketGateway(WATCH_SYMBOLS, "WATCHLIST");

  const statusColor = useMemo(() => {
    if (connectionStatus === "LIVE" || isLive) return "emerald";
    if (connectionStatus === "RECONNECTING") return "amber";
    return "rose";
  }, [connectionStatus, isLive]);

  // Compute average latency from active quotes
  const averageLatency = useMemo(() => {
    let sum = 0;
    let count = 0;
    quotes.forEach((q) => {
      if (q.feed_latency_ms > 0) {
        sum += q.feed_latency_ms;
        count++;
      }
    });
    return count > 0 ? Math.round(sum / count) : 18;
  }, [quotes]);

  return (
    <div className="w-full bg-[#070d1e] border border-cyan-900/30 rounded-xl p-2.5 shadow-[0_0_20px_rgba(6,182,212,0.05)] backdrop-blur-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Ticker strip */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-cyan-950/60 pb-1 lg:pb-0">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-950/40 border border-cyan-800/40 text-[11px] font-semibold text-cyan-400 shrink-0 uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            Live Market
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {WATCH_SYMBOLS.map((sym) => (
              <TickerBadge key={sym} symbol={sym} quote={quotes.get(sym)} />
            ))}
          </div>
        </div>

        {/* Right: Environment toggle, latency, connection status */}
        <div className="flex items-center justify-end gap-3 shrink-0">
          {/* Latency badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0b1329] border border-slate-800/80 text-[11px] font-mono text-slate-400">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>{averageLatency}ms</span>
          </div>

          {/* Connection Status indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold tracking-wide uppercase ${
              statusColor === "emerald"
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.2)]"
                : statusColor === "amber"
                ? "bg-amber-950/30 border-amber-500/40 text-amber-400"
                : "bg-rose-950/30 border-rose-500/40 text-rose-400"
            }`}
          >
            {statusColor === "emerald" ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            <span>{isStale ? "STALE" : connectionStatus || "LIVE"}</span>
          </div>

          {/* Paper / Live toggle */}
          <div className="flex items-center bg-[#0b1329] p-0.5 rounded-lg border border-cyan-900/40">
            <button
              onClick={() => setTradingMode("PAPER")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                tradingMode === "PAPER"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              PAPER
            </button>
            <button
              onClick={() => setTradingMode("LIVE")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                tradingMode === "LIVE"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              LIVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
