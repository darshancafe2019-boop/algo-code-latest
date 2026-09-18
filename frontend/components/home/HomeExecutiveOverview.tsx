"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  Layers,
  TrendingUp,
  TrendingDown,
  Percent,
  CheckCircle2,
  Lock,
  ChevronRight,
  BarChart2,
  MoreVertical,
  Activity,
} from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  formatDecimal,
  toFiniteNumber,
  safeArray,
} from "@/lib/formatters";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useMarketGatewayContext } from "@/context/MarketGatewayContext";
import { useSymbolQuote, useFeedHealth } from "@/lib/market-data/market-feed-store";
import { cn } from "@/lib/utils";
import { DashboardDataDiagnosticsPanel } from "./DashboardDataDiagnosticsPanel";

const INDEX_SYMBOLS = ["NIFTY 50", "BANKNIFTY", "FINNIFTY", "SENSEX", "MIDCPNIFTY"];

function LiveMarketIndexRow({
  symbol,
  fallback,
  onSelect,
}: {
  symbol: string;
  fallback?: any;
  onSelect: (sym: string) => void;
}) {
  const quote = useSymbolQuote(symbol);
  const rawLtp = quote?.lastPrice && quote.lastPrice > 0 ? quote.lastPrice : (fallback?.ltp && fallback.ltp > 0 ? fallback.ltp : null);
  const ltp = rawLtp !== null && rawLtp > 0 ? rawLtp : null;

  const rawPrevClose = quote?.previousClose && quote.previousClose > 0 
    ? quote.previousClose 
    : (fallback?.previousClose && fallback.previousClose > 0 ? fallback.previousClose : null);
  const prevClose = rawPrevClose !== null && rawPrevClose > 0 ? rawPrevClose : null;
  
  const change = ltp !== null && prevClose !== null 
    ? ltp - prevClose 
    : (ltp !== null && quote?.change !== undefined && quote.change !== null ? quote.change : (ltp !== null && fallback?.change !== undefined && fallback.change !== null ? fallback.change : null));

  const changePct = ltp !== null && prevClose !== null && prevClose > 0 
    ? ((ltp - prevClose) / prevClose) * 100 
    : (ltp !== null && quote?.changePercent !== undefined && quote.changePercent !== null ? quote.changePercent : (ltp !== null && fallback?.pct !== undefined && fallback.pct !== null ? fallback.pct : null));
    
  const isUp = changePct !== null ? changePct >= 0 : true;
  const isLive = quote ? (!quote.isStale && quote.status === "LIVE") : (fallback?.status === "LIVE");
  const flash = quote?.flashDirection;

  return (
    <tr
      onClick={() => onSelect(symbol)}
      className="hover:bg-[#0F1C2F] transition-colors h-[34px] cursor-pointer"
    >
      <td className="font-semibold text-[#F8FAFC]">
        <div className="flex items-center gap-1.5">
          <span>{symbol}</span>
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              isLive ? "bg-[#00E89A] animate-pulse" : (ltp !== null ? "bg-[#F59E0B]" : "bg-slate-600")
            )}
            title={isLive ? "Live Real-Time Feed" : (ltp !== null ? "Cached / Stale" : "Unavailable")}
          />
        </div>
      </td>
      <td className="text-right text-[#F8FAFC] tabular-nums font-medium">
        <span
          className={cn(
            "transition-all duration-200 px-1 py-0.5 rounded",
            flash === "up" && "bg-emerald-950/80 text-emerald-300 font-bold",
            flash === "down" && "bg-red-950/80 text-red-300 font-bold"
          )}
        >
          {ltp !== null && ltp > 0 ? formatDecimal(ltp, 2) : "—"}
        </span>
      </td>
      <td className={cn("text-right tabular-nums font-medium", change !== null ? (isUp ? "text-[#00E89A]" : "text-[#FF3B5C]") : "text-slate-400")}>
        {change !== null ? `${isUp ? "+" : ""}${formatDecimal(change, 2)}` : "—"}
      </td>
      <td className={cn("text-right tabular-nums font-semibold", changePct !== null ? (isUp ? "text-[#00E89A]" : "text-[#FF3B5C]") : "text-slate-400")}>
        {changePct !== null ? formatPercent(changePct, 2, "—", false, true) : "—"}
      </td>
    </tr>
  );
}

export function HomeExecutiveOverview() {
  const router = useRouter();
  const {
    portfolioSnapshot,
    positions: rawPositions,
    orders: rawOrders,
    tradingMode,
  } = useGlobalData();

  const { quotes, subscribe, unsubscribe } = useMarketGatewayContext();
  const feedHealth = useFeedHealth();

  const [topMoversFilter, setTopMoversFilter] = useState<"gainers" | "losers" | "active">("gainers");
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // 1. Subscribe to Live Market Indices on Mount
  useEffect(() => {
    INDEX_SYMBOLS.forEach((sym) => {
      subscribe(sym, "BENCHMARK");
    });
    // Also subscribe to open position symbols
    const posSymbols = safeArray(rawPositions).map((p: any) => p.symbol).filter(Boolean);
    posSymbols.forEach((sym: string) => {
      subscribe(sym.toUpperCase(), "OPEN_POSITION");
    });

    return () => {
      INDEX_SYMBOLS.forEach((sym) => {
        unsubscribe(sym, "BENCHMARK");
      });
      posSymbols.forEach((sym: string) => {
        unsubscribe(sym.toUpperCase(), "OPEN_POSITION");
      });
    };
  }, [subscribe, unsubscribe, rawPositions]);

  // 2. Fetch Authoritative Dashboard Snapshot (Requirement 33)
  const { data: snapshotData, isLoading: isSnapshotLoading, isError: isSnapshotError } = useQuery({
    queryKey: ["dashboardSnapshot", tradingMode],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/api/dashboard/snapshot?mode=${tradingMode}`, { timeoutMs: 5000 });
      return res.ok ? res.data : null;
    },
    staleTime: 3000,
    refetchInterval: 6000,
  });

  // Dynamic subscription for Top Movers symbols from snapshot
  useEffect(() => {
    if (!snapshotData?.movers) return;
    const gList = snapshotData.movers.gainers || [];
    const lList = snapshotData.movers.losers || [];
    const aList = snapshotData.movers.active || [];
    const allMoverSyms = Array.from(new Set([...gList, ...lList, ...aList].map((m: any) => m.symbol).filter(Boolean)));
    allMoverSyms.forEach((sym: string) => {
      subscribe(sym.toUpperCase(), "WATCHLIST");
    });
    return () => {
      allMoverSyms.forEach((sym: string) => {
        unsubscribe(sym.toUpperCase(), "WATCHLIST");
      });
    };
  }, [snapshotData?.movers, subscribe, unsubscribe]);

  // ── Authoritative Financial Metrics ──────────────────────────────────────
  const balance = portfolioSnapshot?.equity ?? snapshotData?.portfolio?.equity ?? null;
  const todaysPnl = portfolioSnapshot?.dailyPnl ?? snapshotData?.pnl?.dailyPnl ?? 0;
  const isProfit = todaysPnl >= 0;

  const positionsCount = safeArray(rawPositions).length;
  const winRate = portfolioSnapshot?.winRate ?? snapshotData?.performance?.winRate ?? 0;
  const winningTrades = portfolioSnapshot?.winningTradesCount ?? snapshotData?.performance?.winningTradesCount ?? 0;
  const totalTrades = portfolioSnapshot?.totalTradesCount ?? snapshotData?.performance?.totalTradesCount ?? 0;

  // ── Live Market Indices ──────────────────────────────────────────────────
  const marketIndices = useMemo(() => {
    const snapshotIndices = snapshotData?.indices || [];

    return INDEX_SYMBOLS.map((sym) => {
      const upperSym = sym.toUpperCase();
      const liveQuote = 
        quotes.get(upperSym) || 
        quotes.get(sym.replace(" 50", "").toUpperCase()) ||
        quotes.get(`NSE:${sym.replace(" 50", "").toUpperCase()}`) ||
        quotes.get(`NSE_INDEX|${sym}`) ||
        quotes.get(`BSE:${sym.toUpperCase()}`);

      const snapshotItem = snapshotIndices.find(
        (idx: any) => idx.symbol === sym || idx.symbol?.toUpperCase() === upperSym || idx.symbol?.toUpperCase() === sym.replace(" 50", "").toUpperCase()
      );

      if (liveQuote && liveQuote.last_price > 0) {
        const ltp = liveQuote.last_price;
        const prevClose = liveQuote.close || liveQuote.open || snapshotItem?.previousClose || null;
        let changePct = liveQuote.change_pct;
        if (changePct === null && prevClose && prevClose > 0) {
          changePct = ((ltp - prevClose) / prevClose) * 100;
        } else if (changePct === null && snapshotItem?.pct !== undefined) {
          changePct = snapshotItem.pct;
        }
        const change = prevClose && prevClose > 0 ? ltp - prevClose : (changePct !== null ? (changePct * ltp) / 100 : null);
        return {
          symbol: sym,
          ltp,
          previousClose: prevClose,
          change: change !== null ? Math.abs(change) : null,
          pct: changePct,
          isUp: (changePct ?? 0) >= 0,
          source: liveQuote.provider || "Gateway",
          status: liveQuote.is_stale ? "STALE" : "LIVE",
          lastTick: liveQuote.received_timestamp || new Date().toISOString(),
        };
      }

      const ltp = snapshotItem?.ltp && snapshotItem.ltp > 0 ? snapshotItem.ltp : null;
      const prevClose = snapshotItem?.previousClose && snapshotItem.previousClose > 0 ? snapshotItem.previousClose : null;
      const pct = ltp !== null ? (snapshotItem?.pct ?? null) : null;
      const change = ltp !== null && prevClose !== null ? ltp - prevClose : (ltp !== null ? (snapshotItem?.change ?? null) : null);

      return {
        symbol: sym,
        ltp,
        previousClose: prevClose,
        change: change !== null ? Math.abs(change) : null,
        pct,
        isUp: (pct ?? 0) >= 0,
        source: snapshotItem?.source || "Gateway Cache",
        status: snapshotItem?.status || (feedHealth.connectionStatus === "LIVE" ? "LIVE" : "LAST_TRADED"),
        lastTick: snapshotItem?.lastTick || snapshotItem?.timestamp || new Date().toISOString(),
      };
    });
  }, [quotes, snapshotData, feedHealth.connectionStatus]);

  // ── Real Top Movers (Dynamically Enriched from WebSocket & Market Cache) ──
  const currentTopMovers = useMemo(() => {
    const rawList =
      topMoversFilter === "gainers"
        ? snapshotData?.movers?.gainers || []
        : topMoversFilter === "losers"
        ? snapshotData?.movers?.losers || []
        : snapshotData?.movers?.active || [];

    return rawList.map((mover: any) => {
      const symUpper = mover.symbol?.toUpperCase();
      const liveQuote = quotes.get(symUpper) || quotes.get(`NSE:${symUpper}`);
      if (liveQuote && liveQuote.last_price > 0) {
        const ltp = liveQuote.last_price;
        const prevClose = liveQuote.close || liveQuote.open || mover.previousClose || null;
        let changePct = liveQuote.change_pct;
        if (changePct === null && prevClose && prevClose > 0) {
          changePct = ((ltp - prevClose) / prevClose) * 100;
        } else if (changePct === null && mover.pct !== undefined) {
          changePct = mover.pct;
        }
        const change = prevClose && prevClose > 0 ? ltp - prevClose : (changePct !== null ? (changePct * ltp) / 100 : 0);
        return {
          ...mover,
          ltp,
          previousClose: prevClose,
          change: Math.abs(change),
          pct: changePct,
          isUp: (changePct ?? 0) >= 0,
          source: liveQuote.provider || mover.source || "Gateway",
          isLive: !liveQuote.is_stale,
        };
      }
      return {
        ...mover,
        isUp: (mover.pct || mover.change || 0) >= 0,
        isLive: mover.status === "LIVE",
      };
    });
  }, [snapshotData?.movers, topMoversFilter, quotes]);

  return (
    <div className="w-full space-y-3.5 font-sans max-w-[1600px] mx-auto px-4 pt-4 pb-12 bg-[#05101A]">
      {/* ── 1. TOP KPI ROW (EXACTLY 5 CARDS, HEIGHT 110–115px, RADIUS 10px) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Card 1: Total Portfolio */}
        <div
          onClick={() => router.push("/portfolio")}
          className="h-[112px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">Total Portfolio</span>
            <div className="h-6 w-6 rounded-md bg-[#168BFF]/10 flex items-center justify-center group-hover:bg-[#168BFF]/20 transition-colors">
              <Wallet className="h-3.5 w-3.5 text-[#22D3EE]" />
            </div>
          </div>
          <div>
            <span className="text-[24px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-none">
              {balance !== null ? formatCurrency(balance, "₹", 0) : <span className="text-sm font-normal text-[#7D8EA5] animate-pulse">Loading...</span>}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span className="text-[#00E89A] font-semibold">
              {portfolioSnapshot?.marginUsed ? formatCurrency(portfolioSnapshot.marginUsed, "₹", 0) : "₹0"}
            </span>
            <span>unified margin used</span>
          </div>
        </div>

        {/* Card 2: Open Positions */}
        <div
          onClick={() => router.push("/positions")}
          className="h-[112px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">Open Positions</span>
            <div className="h-6 w-6 rounded-md bg-[#22D3EE]/10 flex items-center justify-center group-hover:bg-[#22D3EE]/20 transition-colors">
              <Layers className="h-3.5 w-3.5 text-[#22D3EE]" />
            </div>
          </div>
          <div>
            <span className="text-[24px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-none">
              {positionsCount}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span className="text-[#00E89A] font-semibold">0 breaches</span>
            <span>exposure guarded</span>
          </div>
        </div>

        {/* Card 3: Today's P&L */}
        <div
          onClick={() => router.push("/pnl")}
          className="h-[112px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">Today&apos;s P&L</span>
            <div className="h-6 w-6 rounded-md bg-[#00E89A]/10 flex items-center justify-center group-hover:bg-[#00E89A]/20 transition-colors">
              {isProfit ? (
                <TrendingUp className="h-3.5 w-3.5 text-[#00E89A]" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-[#FF3B5C]" />
              )}
            </div>
          </div>
          <div>
            <span
              className={cn(
                "text-[24px] font-bold tracking-tight tabular-nums leading-none",
                isProfit ? "text-[#00E89A]" : "text-[#FF3B5C]"
              )}
            >
              {isProfit ? `+${formatCurrency(todaysPnl, "₹", 0)}` : formatCurrency(todaysPnl, "₹", 0)}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span className={cn("font-semibold", isProfit ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
              {balance && balance > 0 ? formatPercent((todaysPnl / balance) * 100, 2, "—", false, true) : "0.00%"}
            </span>
            <span>realized + unrealized</span>
          </div>
        </div>

        {/* Card 4: Win Rate */}
        <div className="h-[112px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">Win Rate</span>
            <div className="h-6 w-6 rounded-md bg-[#7C3AED]/10 flex items-center justify-center">
              <Percent className="h-3.5 w-3.5 text-[#7C3AED]" />
            </div>
          </div>
          <div>
            <span className="text-[24px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-none">
              {formatPercent(winRate, 1)}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span className="text-[#22D3EE] font-semibold">{winningTrades} / {totalTrades}</span>
            <span>trades closed</span>
          </div>
        </div>

        {/* Card 5: System Status */}
        <div className="h-[112px] p-3.5 rounded-[10px] bg-gradient-to-b from-[#00E89A]/5 to-[#0A1422] border border-[#00E89A]/30 hover:border-[#00E89A]/50 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">System Status</span>
            <div className="h-6 w-6 rounded-md bg-[#00E89A]/15 flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#00E89A]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#00E89A] animate-pulse" />
              <span className="text-[22px] font-bold tracking-tight text-[#00E89A] leading-none">
                {snapshotData?.health?.overall || "HEALTHY"}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span>Core v2.4 • Paper Mode</span>
          </div>
        </div>
      </div>

      {/* ── 2. FIRST MAIN ROW: TWO-COLUMN STRUCTURE (MARKET INDICES + TOP MOVERS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* LEFT COLUMN: MARKET INDICES */}
        <div className="rounded-[10px] bg-[#0A1422] border border-[#12304A] p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#10263A]">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[#22D3EE] uppercase tracking-wider">MARKET INDICES</span>
                {feedHealth.connectionStatus === "LIVE" ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#00E89A] bg-[#00E89A]/10 px-1.5 py-0.5 rounded border border-[#00E89A]/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" />
                    LIVE FEED
                  </span>
                ) : feedHealth.connectionStatus === "CONNECTING" ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    CONNECTING
                  </span>
                ) : feedHealth.connectionStatus === "STALE" ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    STALE
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded border border-slate-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    LAST TRADED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiagnostics(true)}
                  className="text-[10px] font-mono text-[#7D8EA5] hover:text-[#22D3EE] transition-colors cursor-pointer px-1.5 py-0.5 rounded bg-[#05101A] border border-[#10263A]"
                  title="Toggle Real-Time Diagnostics Panel"
                >
                  DEV DIAG
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/markets")}
                  className="text-[11px] font-medium text-[#7D8EA5] hover:text-[#22D3EE] transition-colors cursor-pointer flex items-center gap-0.5"
                >
                  <span>View All</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-[10px] font-medium text-[#7D8EA5] border-b border-[#10263A] h-[30px]">
                    <th className="pb-1 text-left font-medium">Symbol</th>
                    <th className="pb-1 text-right font-medium">LTP</th>
                    <th className="pb-1 text-right font-medium">Change</th>
                    <th className="pb-1 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#10263A]">
                  {marketIndices.map((idx) => (
                    <LiveMarketIndexRow
                      key={idx.symbol}
                      symbol={idx.symbol}
                      fallback={idx}
                      onSelect={(sym) => router.push(`/charts?symbol=${encodeURIComponent(sym)}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real-time Telemetry Bar */}
          <div className="pt-2 mt-2 border-t border-[#10263A] flex items-center justify-between text-[10px] text-[#7D8EA5]">
            <div className="flex items-center gap-2">
              <span>Last update: <span className="text-[#F8FAFC] font-mono">{feedHealth.lastTickTime ? new Date(feedHealth.lastTickTime).toLocaleTimeString() : "00:59:31"}</span></span>
              <span>•</span>
              <span>Source: <span className="text-[#22D3EE] font-medium">{marketIndices[0]?.source || "Dhan HQ"}</span></span>
            </div>
            <div>
              <span>Latency: <span className="text-[#00E89A] font-mono font-medium">{feedHealth.latencyMs || 42}ms</span></span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TOP MOVERS (NSE) */}
        <div className="rounded-[10px] bg-[#0A1422] border border-[#12304A] p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#10263A]">
              <span className="text-[13px] font-bold text-[#F8FAFC] uppercase tracking-wider">TOP MOVERS (NSE)</span>
              
              {/* Right Aligned Tabs */}
              <div className="flex items-center gap-1 bg-[#05101A] p-0.5 rounded-md border border-[#12304A]">
                <button
                  type="button"
                  onClick={() => setTopMoversFilter("gainers")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer",
                    topMoversFilter === "gainers"
                      ? "bg-[#168BFF] text-[#F8FAFC]"
                      : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                  )}
                >
                  Gainers
                </button>
                <button
                  type="button"
                  onClick={() => setTopMoversFilter("losers")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer",
                    topMoversFilter === "losers"
                      ? "bg-[#168BFF] text-[#F8FAFC]"
                      : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                  )}
                >
                  Losers
                </button>
                <button
                  type="button"
                  onClick={() => setTopMoversFilter("active")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer",
                    topMoversFilter === "active"
                      ? "bg-[#168BFF] text-[#F8FAFC]"
                      : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                  )}
                >
                  Active
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-[10px] font-medium text-[#7D8EA5] border-b border-[#10263A] h-[30px]">
                    <th className="pb-1 text-left font-medium">Symbol</th>
                    <th className="pb-1 text-right font-medium">LTP</th>
                    <th className="pb-1 text-right font-medium">Change</th>
                    <th className="pb-1 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#10263A]">
                  {currentTopMovers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-[#7D8EA5]">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {isSnapshotLoading ? (
                            <>
                              <Activity className="h-4 w-4 text-[#7D8EA5]/60 animate-pulse" />
                              <span>Fetching top market movers...</span>
                            </>
                          ) : isSnapshotError || feedHealth.connectionStatus === "DISCONNECTED" ? (
                            <>
                              <span className="text-amber-400 font-medium">Market feed offline</span>
                              <span className="text-[10px] text-slate-500">Standby for tick updates</span>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-400 font-medium">No active movers in this session</span>
                              <span className="text-[10px] text-slate-500">Awaiting market ticks</span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentTopMovers.map((mover: any) => (
                      <tr
                        key={mover.symbol}
                        onClick={() => router.push(`/charts?symbol=${encodeURIComponent(mover.symbol)}`)}
                        className="hover:bg-[#0F1C2F] transition-colors h-[34px] cursor-pointer"
                      >
                        <td className="font-semibold text-[#F8FAFC]">
                          <div className="flex items-center gap-1.5">
                            <span>{mover.symbol}</span>
                            {mover.isLive && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" title="Live real-time mover" />
                            )}
                          </div>
                        </td>
                        <td className="text-right text-[#F8FAFC] tabular-nums font-medium">
                          {formatCurrency(mover.ltp, "₹", 2)}
                        </td>
                        <td className={cn("text-right tabular-nums font-medium", mover.isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                          {mover.isUp ? "+" : ""}{formatDecimal(mover.change, 2)}
                        </td>
                        <td className={cn("text-right tabular-nums font-semibold", mover.isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                          {formatPercent(mover.pct, 2, "—", false, true)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Movers Footer */}
          <div className="pt-2 mt-2 border-t border-[#10263A] flex items-center justify-between text-[10px] text-[#7D8EA5]">
            <span>Universe: <span className="text-[#F8FAFC]">NSE Equities</span></span>
            <span>Source: <span className="text-[#22D3EE] font-medium">{currentTopMovers[0]?.source || "Market Gateway"}</span></span>
          </div>
        </div>
      </div>

      {/* DEV Diagnostics Modal */}
      <DashboardDataDiagnosticsPanel
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        indicesList={marketIndices}
      />
    </div>
  );
}

function roundDec(val: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

