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
  resolveCurrencySymbol,
} from "@/lib/formatters";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useMarketGatewayContext } from "@/context/MarketGatewayContext";
import { useSymbolQuote, useFeedHealth } from "@/lib/market-data/market-feed-store";
import { cn } from "@/lib/utils";
import { DashboardDataDiagnosticsPanel } from "./DashboardDataDiagnosticsPanel";

const INDEX_CATEGORIES = ["India", "Crypto", "Commodities", "MCX", "US", "All"] as const;

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
            title={isLive ? "Live Real-Time Feed" : (ltp !== null ? "Cached / Last Traded" : "Unavailable")}
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

  const [indexCategory, setIndexCategory] = useState<string>("India");
  const [topMoversFilter, setTopMoversFilter] = useState<"gainers" | "losers" | "active">("gainers");
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // 1. Fetch Authoritative Dashboard Snapshot (Requirement 33)
  const { data: snapshotData, isLoading: isSnapshotLoading, isError: isSnapshotError } = useQuery({
    queryKey: ["dashboardSnapshot", tradingMode],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/api/dashboard/snapshot?mode=${tradingMode}`, { timeoutMs: 15000 });
      return res.ok ? res.data : null;
    },
    staleTime: 3000,
    refetchInterval: 6000,
  });

  // Dynamic subscription for Top Movers & Index symbols from snapshot
  useEffect(() => {
    if (!snapshotData) return;
    const gList = snapshotData.movers?.gainers || [];
    const lList = snapshotData.movers?.losers || [];
    const aList = snapshotData.movers?.active || [];
    const idxList = snapshotData.indices || [];
    const allSyms = Array.from(new Set([
      ...gList.map((m: any) => m.symbol),
      ...lList.map((m: any) => m.symbol),
      ...aList.map((m: any) => m.symbol),
      ...idxList.map((i: any) => i.symbol),
    ].filter(Boolean)));

    allSyms.forEach((sym: string) => {
      subscribe(sym.toUpperCase(), "WATCHLIST");
    });
    return () => {
      allSyms.forEach((sym: string) => {
        unsubscribe(sym.toUpperCase(), "WATCHLIST");
      });
    };
  }, [snapshotData, subscribe, unsubscribe]);

  // Also subscribe to open position symbols
  useEffect(() => {
    const posSymbols = safeArray(rawPositions).map((p: any) => p.symbol).filter(Boolean);
    posSymbols.forEach((sym: string) => {
      subscribe(sym.toUpperCase(), "OPEN_POSITION");
    });
    return () => {
      posSymbols.forEach((sym: string) => {
        unsubscribe(sym.toUpperCase(), "OPEN_POSITION");
      });
    };
  }, [rawPositions, subscribe, unsubscribe]);

  // ── Authoritative Financial Metrics ──────────────────────────────────────
  const balance = portfolioSnapshot?.equity ?? snapshotData?.portfolio?.equity ?? null;
  const rawTodaysPnl = portfolioSnapshot?.dailyPnl ?? snapshotData?.pnl?.dailyPnl;
  const todaysPnl = rawTodaysPnl !== undefined && rawTodaysPnl !== null ? rawTodaysPnl : null;
  const isProfit = todaysPnl !== null ? todaysPnl >= 0 : true;
  const portfolioCurrency = portfolioSnapshot?.baseCurrency || snapshotData?.portfolio?.baseCurrency || "USD";
  const currSymbol = resolveCurrencySymbol(portfolioCurrency);

  const positionsCount = safeArray(rawPositions).length > 0
    ? safeArray(rawPositions).length
    : (portfolioSnapshot?.openPositions ?? snapshotData?.positionsSummary?.openPositionsCount ?? 0);
  const openContractsCount = portfolioSnapshot?.openContracts ?? snapshotData?.positionsSummary?.openContractsCount ?? positionsCount;
  
  // Win rate and trade metrics (Strict adherence to contract: null when zero closed trades)
  const totalTrades = portfolioSnapshot?.totalTradesCount ?? snapshotData?.performance?.totalTradesCount ?? 0;
  const winningTrades = portfolioSnapshot?.winningTradesCount ?? snapshotData?.performance?.winningTradesCount ?? 0;
  const losingTrades = portfolioSnapshot?.losingTradesCount ?? snapshotData?.performance?.losingTradesCount ?? 0;
  const rawWinRate = portfolioSnapshot?.winRate ?? snapshotData?.performance?.winRate;
  const winRate = totalTrades > 0 && rawWinRate !== undefined && rawWinRate !== null ? rawWinRate : null;

  const systemHealth = snapshotData?.health?.overall || "HEALTHY";
  const isHealthDegraded = systemHealth === "DEGRADED";
  const isHealthCritical = systemHealth === "CRITICAL";
  const servicesHealth = snapshotData?.health?.services || [];

  // ── Live Market Indices Filtered by Category ────────────────────────────
  const marketIndices = useMemo(() => {
    const allSnapshotIndices = snapshotData?.indices || [];
    const filtered = indexCategory === "All"
      ? allSnapshotIndices
      : allSnapshotIndices.filter((idx: any) => (idx.category || "India").toLowerCase() === indexCategory.toLowerCase());

    return filtered.map((snapshotItem: any) => {
      const sym = snapshotItem.symbol;
      const upperSym = sym.toUpperCase();
      const liveQuote = 
        quotes.get(upperSym) || 
        quotes.get(sym.replace(" 50", "").toUpperCase()) ||
        quotes.get(`NSE:${sym.replace(" 50", "").toUpperCase()}`) ||
        quotes.get(`NSE_INDEX|${sym}`) ||
        quotes.get(`BSE:${sym.toUpperCase()}`);

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
          category: snapshotItem.category || "India",
          ltp,
          previousClose: prevClose,
          change: change !== null ? Math.abs(change) : null,
          pct: changePct,
          isUp: (changePct ?? 0) >= 0,
          source: liveQuote.provider || snapshotItem.source || "Gateway",
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
        category: snapshotItem.category || "India",
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
  }, [snapshotData?.indices, indexCategory, quotes, feedHealth.connectionStatus]);

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
      const rawPct = mover.pct !== undefined ? mover.pct : 0;
      const rawChg = mover.change !== undefined ? Math.abs(mover.change) : (mover.ltp ? Math.abs((rawPct * mover.ltp) / 100) : 0);
      return {
        ...mover,
        change: rawChg,
        pct: rawPct,
        isUp: rawPct >= 0,
        isLive: mover.status === "LIVE",
      };
    });
  }, [snapshotData?.movers, topMoversFilter, quotes]);

  return (
    <div className="w-full space-y-5 font-sans pb-12">
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
              {balance !== null ? (
                formatCurrency(balance, currSymbol, 0)
              ) : isSnapshotLoading ? (
                <span className="text-sm font-normal text-[#7D8EA5] animate-pulse">Loading...</span>
              ) : (
                <span className="text-sm font-medium text-slate-400">Unavailable</span>
              )}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span className="text-[#00E89A] font-semibold">
              {portfolioSnapshot?.marginUsed !== undefined ? formatCurrency(portfolioSnapshot.marginUsed, currSymbol, 0) : `${currSymbol}0`}
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
            <span className="text-[#00E89A] font-semibold">{openContractsCount} contracts</span>
            <span>• exposure guarded</span>
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
                todaysPnl === null ? "text-slate-400 text-lg font-medium" : (isProfit ? "text-[#00E89A]" : "text-[#FF3B5C]")
              )}
            >
              {todaysPnl !== null ? (isProfit ? `+${formatCurrency(todaysPnl, currSymbol, 0)}` : formatCurrency(todaysPnl, currSymbol, 0)) : "Unavailable"}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span className={cn("font-semibold", isProfit ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
              {todaysPnl !== null && balance && balance > 0 ? formatPercent((todaysPnl / balance) * 100, 2, "—", false, true) : "0.00%"}
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
            <span className={cn("tracking-tight tabular-nums leading-none", winRate !== null ? "text-[24px] font-bold text-[#F8FAFC]" : "text-sm font-medium text-slate-400")}>
              {winRate !== null ? formatPercent(winRate, 1) : "N/A — No closed trades"}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span className="text-[#22D3EE] font-semibold">{winningTrades} / {totalTrades}</span>
            <span>trades closed</span>
          </div>
        </div>

        {/* Card 5: System Status */}
        <div className={cn(
          "h-[112px] p-3.5 rounded-[10px] transition-colors flex flex-col justify-between border",
          isHealthCritical
            ? "bg-gradient-to-b from-[#FF3B5C]/10 to-[#0A1422] border-[#FF3B5C]/40 hover:border-[#FF3B5C]/60"
            : isHealthDegraded
            ? "bg-gradient-to-b from-amber-500/10 to-[#0A1422] border-amber-500/40 hover:border-amber-500/60"
            : "bg-gradient-to-b from-[#00E89A]/5 to-[#0A1422] border-[#00E89A]/30 hover:border-[#00E89A]/50"
        )}>
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">System Status</span>
            <div className={cn(
              "h-6 w-6 rounded-md flex items-center justify-center",
              isHealthCritical ? "bg-[#FF3B5C]/15" : isHealthDegraded ? "bg-amber-500/15" : "bg-[#00E89A]/15"
            )}>
              <CheckCircle2 className={cn(
                "h-3.5 w-3.5",
                isHealthCritical ? "text-[#FF3B5C]" : isHealthDegraded ? "text-amber-400" : "text-[#00E89A]"
              )} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "h-2.5 w-2.5 rounded-full animate-pulse",
                isHealthCritical ? "bg-[#FF3B5C]" : isHealthDegraded ? "bg-amber-400" : "bg-[#00E89A]"
              )} />
              <span className={cn(
                "text-[20px] font-bold tracking-tight leading-none",
                isHealthCritical ? "text-[#FF3B5C]" : isHealthDegraded ? "text-amber-400" : "text-[#00E89A]"
              )}>
                {isSnapshotLoading ? "CHECKING..." : systemHealth}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-[#7D8EA5] flex items-center gap-1.5 font-mono truncate">
            <span className={servicesHealth.find((s: any) => s.service === "Database")?.isOk ? "text-[#00E89A]" : "text-amber-400"}>
              DB: {servicesHealth.find((s: any) => s.service === "Database")?.status === "Operational" ? "OK" : "DEGRADED"}
            </span>
            <span>•</span>
            <span className={servicesHealth.find((s: any) => s.service === "Backend")?.isOk ? "text-[#22D3EE]" : "text-rose-400"}>
              API: {servicesHealth.find((s: any) => s.service === "Backend")?.isOk ? "OK" : "OFFLINE"}
            </span>
            <span>•</span>
            <span className="text-slate-300 font-semibold">{tradingMode}</span>
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

            {/* Category Filter Tabs & Dedicated View Toggle */}
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#10263A] overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1">
                {INDEX_CATEGORIES.map((cat) => {
                  const count = cat === "All"
                    ? (snapshotData?.indices?.length || 0)
                    : (snapshotData?.indices?.filter((idx: any) => (idx.category || "India").toLowerCase() === cat.toLowerCase())?.length || 0);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setIndexCategory(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                        indexCategory === cat
                          ? "bg-[#168BFF] text-[#F8FAFC] shadow-sm shadow-[#168BFF]/30"
                          : "text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0F1C2F]"
                      )}
                    >
                      <span>{cat}</span>
                      {count > 0 && (
                        <span className={cn(
                          "text-[9px] px-1 py-0.2 rounded-full font-mono",
                          indexCategory === cat ? "bg-white/20 text-white" : "bg-[#05101A] text-[#7D8EA5]"
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If 'All' is selected, render dedicated individual card sections for each category */}
            {indexCategory === "All" ? (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 no-scrollbar">
                {(["India", "US", "Crypto", "Commodities", "MCX"] as const).map((catName) => {
                  const catItems = marketIndices.filter(
                    (idx) => (idx.category || "India").toLowerCase() === catName.toLowerCase()
                  );
                  if (catItems.length === 0) return null;
                  return (
                    <div
                      key={catName}
                      className="rounded-lg bg-[#05101A]/80 border border-[#10263A] p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-[#10263A]/60">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#F8FAFC] uppercase tracking-wide">
                            {catName}
                          </span>
                          <span className="text-[9px] font-mono text-[#7D8EA5] px-1.5 py-0.2 bg-[#0B1728] rounded border border-[#12304A]">
                            {catItems.length} {catItems.length === 1 ? "instrument" : "instruments"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIndexCategory(catName)}
                          className="text-[10px] text-[#22D3EE] hover:underline flex items-center gap-0.5"
                        >
                          Focus
                          <ChevronRight className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="text-[10px] font-medium text-[#7D8EA5] border-b border-[#10263A]/40 h-[24px]">
                            <th className="pb-1 text-left font-medium">Symbol</th>
                            <th className="pb-1 text-right font-medium">LTP</th>
                            <th className="pb-1 text-right font-medium">Change</th>
                            <th className="pb-1 text-right font-medium">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#10263A]/30">
                          {catItems.map((idx) => (
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
                  );
                })}
              </div>
            ) : (
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
                    {marketIndices.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-5 text-slate-500 text-[11px]">
                          No instruments registered in category {indexCategory}
                        </td>
                      </tr>
                    ) : (
                      marketIndices.map((idx) => (
                        <LiveMarketIndexRow
                          key={idx.symbol}
                          symbol={idx.symbol}
                          fallback={idx}
                          onSelect={(sym) => router.push(`/charts?symbol=${encodeURIComponent(sym)}`)}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Real-time Telemetry Bar */}
          <div className="pt-2 mt-2 border-t border-[#10263A] flex items-center justify-between text-[10px] text-[#7D8EA5]">
            <div className="flex items-center gap-2">
              <span>Last update: <span className="text-[#F8FAFC] font-mono">{feedHealth.lastTickTime ? new Date(feedHealth.lastTickTime).toLocaleTimeString() : new Date().toLocaleTimeString()}</span></span>
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
                          {mover.isUp ? "+" : "-"}{formatDecimal(mover.change, 2)}
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

