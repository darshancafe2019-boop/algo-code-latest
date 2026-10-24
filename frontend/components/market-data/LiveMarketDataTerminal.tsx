"use client";

import React, { useState, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  Layers,
  TrendingUp,
  TrendingDown,
  Percent,
  CheckCircle2,
  ChevronRight,
  Activity,
  Radio,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  formatDecimal,
  safeArray,
  resolveCurrencySymbol,
} from "@/lib/formatters";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useMarketGatewayContext } from "@/context/MarketGatewayContext";
import { useSymbolQuote, useFeedHealth } from "@/lib/market-data/market-feed-store";
import { cn } from "@/lib/utils";

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
      className="hover:bg-[#0F1C2F] transition-colors h-[36px] cursor-pointer"
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
            "transition-all duration-200 px-1 py-0.5 rounded font-mono",
            flash === "up" && "bg-emerald-950/80 text-emerald-300 font-bold",
            flash === "down" && "bg-red-950/80 text-red-300 font-bold"
          )}
        >
          {ltp !== null && ltp > 0 ? formatDecimal(ltp, 2) : "—"}
        </span>
      </td>
      <td className={cn("text-right tabular-nums font-mono font-medium", change !== null ? (isUp ? "text-[#00E89A]" : "text-[#FF3B5C]") : "text-slate-400")}>
        {change !== null ? `${isUp ? "+" : ""}${formatDecimal(change, 2)}` : "—"}
      </td>
      <td className={cn("text-right tabular-nums font-mono font-semibold", changePct !== null ? (isUp ? "text-[#00E89A]" : "text-[#FF3B5C]") : "text-slate-400")}>
        {changePct !== null ? formatPercent(changePct, 2, "—", false, true) : "—"}
      </td>
      <td className="text-right text-[10px] font-mono text-[#7D8EA5] hidden md:table-cell">
        {fallback?.exchange || "NSE"}
      </td>
      <td className="text-right text-[10px] font-mono text-[#22D3EE] hidden sm:table-cell">
        {fallback?.source || "GATEWAY"}
      </td>
    </tr>
  );
}

export const LiveMarketDataTerminal = memo(function LiveMarketDataTerminal() {
  const router = useRouter();
  const {
    portfolioSnapshot,
    positions: rawPositions,
    tradingMode,
    refreshAll,
  } = useGlobalData();

  const { quotes } = useMarketGatewayContext();
  const feedHealth = useFeedHealth();

  const [indexCategory, setIndexCategory] = useState<string>("India");
  const [topMoversFilter, setTopMoversFilter] = useState<"gainers" | "losers" | "active">("gainers");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Authoritative Dashboard Snapshot Query
  const {
    data: snapshotData,
    isLoading: isSnapshotLoading,
    isError: isSnapshotError,
    refetch: refetchSnapshot,
  } = useQuery({
    queryKey: ["dashboardSnapshot", tradingMode],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/api/dashboard/snapshot?mode=${tradingMode}`, { timeoutMs: 12000 });
      return res.ok ? res.data : null;
    },
    staleTime: 3000,
    refetchInterval: 5000,
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refreshAll) await refreshAll();
      await refetchSnapshot();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Section 1: Total Portfolio Financial Metrics
  const balance = portfolioSnapshot?.equity ?? snapshotData?.portfolio?.equity ?? null;
  const rawTodaysPnl = portfolioSnapshot?.dailyPnl ?? snapshotData?.pnl?.dailyPnl;
  const todaysPnl = rawTodaysPnl !== undefined && rawTodaysPnl !== null ? rawTodaysPnl : null;
  const isProfit = todaysPnl !== null ? todaysPnl >= 0 : true;
  const portfolioCurrency = portfolioSnapshot?.baseCurrency || snapshotData?.portfolio?.baseCurrency || "INR";
  const currSymbol = resolveCurrencySymbol(portfolioCurrency);

  // Section 2: Open Positions Metrics
  const positionsCount = safeArray(rawPositions).length > 0
    ? safeArray(rawPositions).length
    : (portfolioSnapshot?.openPositions ?? snapshotData?.positionsSummary?.openPositionsCount ?? 0);
  const openContractsCount = portfolioSnapshot?.openContracts ?? snapshotData?.positionsSummary?.openContractsCount ?? positionsCount;

  // Section 3 & 4: Win Rate & Trades
  const totalTrades = portfolioSnapshot?.totalTradesCount ?? snapshotData?.performance?.totalTradesCount ?? 0;
  const winningTrades = portfolioSnapshot?.winningTradesCount ?? snapshotData?.performance?.winningTradesCount ?? 0;
  const losingTrades = portfolioSnapshot?.losingTradesCount ?? snapshotData?.performance?.losingTradesCount ?? 0;
  const rawWinRate = portfolioSnapshot?.winRate ?? snapshotData?.performance?.winRate;
  const winRate = totalTrades > 0 && rawWinRate !== undefined && rawWinRate !== null ? rawWinRate : null;

  // Section 5: System Status Probes
  const systemHealth = snapshotData?.health?.overall || "HEALTHY";
  const isHealthDegraded = systemHealth === "DEGRADED";
  const isHealthCritical = systemHealth === "CRITICAL";
  const servicesHealth = snapshotData?.health?.services || [];

  // Market Indices Data Pipeline
  const marketIndices = useMemo(() => {
    const allSnapshotIndices = snapshotData?.indices || [];
    let filtered = indexCategory === "All"
      ? allSnapshotIndices
      : allSnapshotIndices.filter((idx: any) => (idx.category || "India").toLowerCase() === indexCategory.toLowerCase());

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((idx: any) =>
        (idx.symbol || "").toLowerCase().includes(q) ||
        (idx.category || "").toLowerCase().includes(q) ||
        (idx.exchange || "").toLowerCase().includes(q)
      );
    }

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
          exchange: snapshotItem.exchange || "NSE",
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
        exchange: snapshotItem.exchange || "NSE",
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
  }, [snapshotData?.indices, indexCategory, searchQuery, quotes, feedHealth.connectionStatus]);

  // Section 6: Top Movers Engine
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
    <div className="w-full space-y-5 font-sans pb-12 select-none">
      {/* ── TOP HEADER STRIP: PAGE 2 LIVE MARKET DATA BRANDING ── */}
      <div className="w-full bg-[#04111C] border-b border-[#0D2438] px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-[#0F3858] to-[#16C6F4]/30 border border-[#16C6F4]/40 flex items-center justify-center text-[#16C6F4]">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-wider text-white font-sans uppercase">
                QUANT.OS LIVE MARKET DATA TERMINAL
              </h1>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#16C6F4]/10 text-[#16C6F4] border border-[#16C6F4]/20">
                PAGE 2 • TICK OBSERVATORY
              </span>
            </div>
            <p className="text-[11px] text-[#7D8EA5] font-mono">
              Live multi-asset sequence: Portfolio → Positions → P&L → Win Rate → System Status → Indices → Movers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#061828] border border-[#0F304E] text-[11px] font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-slate-300 font-semibold">FEED: {feedHealth.connectionStatus}</span>
            <span className="text-slate-500">•</span>
            <span className="text-cyan-400 font-bold">{feedHealth.latencyMs || 42}ms</span>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 rounded-lg bg-[#071F32] hover:bg-[#0C2D48] border border-[#133A5C] flex items-center justify-center text-[#16C6F4] hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Force refresh snapshot and market feed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── 1. TOP KPI ROW (EXACTLY 5 CARDS: SECTIONS 1 TO 5) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Section 1: Total Portfolio */}
        <div
          onClick={() => router.push("/portfolio")}
          className="h-[114px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">1. Total Portfolio</span>
            <div className="h-6 w-6 rounded-md bg-[#168BFF]/10 flex items-center justify-center group-hover:bg-[#168BFF]/20 transition-colors">
              <Wallet className="h-3.5 w-3.5 text-[#22D3EE]" />
            </div>
          </div>
          <div>
            <span className="text-[24px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-none font-mono">
              {balance !== null ? (
                formatCurrency(balance, currSymbol, 0)
              ) : isSnapshotLoading ? (
                <span className="text-sm font-normal text-[#7D8EA5] animate-pulse">Loading...</span>
              ) : (
                <span className="text-sm font-medium text-slate-400">Unavailable</span>
              )}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium font-mono">
            <span className="text-[#00E89A] font-semibold">
              {portfolioSnapshot?.marginUsed !== undefined ? formatCurrency(portfolioSnapshot.marginUsed, currSymbol, 0) : `${currSymbol}0`}
            </span>
            <span>used margin</span>
          </div>
        </div>

        {/* Section 2: Open Positions */}
        <div
          onClick={() => router.push("/positions")}
          className="h-[114px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">2. Open Positions</span>
            <div className="h-6 w-6 rounded-md bg-[#22D3EE]/10 flex items-center justify-center group-hover:bg-[#22D3EE]/20 transition-colors">
              <Layers className="h-3.5 w-3.5 text-[#22D3EE]" />
            </div>
          </div>
          <div>
            <span className="text-[24px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-none font-mono">
              {positionsCount}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium font-mono">
            <span className="text-[#00E89A] font-semibold">{openContractsCount} contracts</span>
            <span>• exposure guarded</span>
          </div>
        </div>

        {/* Section 3: Today's P&L */}
        <div
          onClick={() => router.push("/pnl")}
          className="h-[114px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">3. Today&apos;s P&L</span>
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
                "text-[24px] font-bold tracking-tight tabular-nums leading-none font-mono",
                todaysPnl === null ? "text-slate-400 text-lg font-medium" : (isProfit ? "text-[#00E89A]" : "text-[#FF3B5C]")
              )}
            >
              {todaysPnl !== null ? (isProfit ? `+${formatCurrency(todaysPnl, currSymbol, 0)}` : formatCurrency(todaysPnl, currSymbol, 0)) : "Unavailable"}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium font-mono">
            <span className={cn("font-semibold", isProfit ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
              {todaysPnl !== null && balance && balance > 0 ? formatPercent((todaysPnl / balance) * 100, 2, "—", false, true) : "0.00%"}
            </span>
            <span>daily yield</span>
          </div>
        </div>

        {/* Section 4: Win Rate */}
        <div className="h-[114px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">4. Win Rate</span>
            <div className="h-6 w-6 rounded-md bg-[#7C3AED]/10 flex items-center justify-center">
              <Percent className="h-3.5 w-3.5 text-[#7C3AED]" />
            </div>
          </div>
          <div>
            <span className={cn("tracking-tight tabular-nums leading-none font-mono", winRate !== null ? "text-[24px] font-bold text-[#F8FAFC]" : "text-sm font-medium text-slate-400")}>
              {winRate !== null ? formatPercent(winRate, 1) : "N/A — No closed trades"}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium font-mono">
            <span className="text-[#22D3EE] font-semibold">{winningTrades} / {totalTrades}</span>
            <span>trades closed</span>
          </div>
        </div>

        {/* Section 5: System Status */}
        <div className={cn(
          "h-[114px] p-3.5 rounded-[10px] transition-colors flex flex-col justify-between border",
          isHealthCritical
            ? "bg-gradient-to-b from-[#FF3B5C]/10 to-[#0A1422] border-[#FF3B5C]/40"
            : isHealthDegraded
            ? "bg-gradient-to-b from-amber-500/10 to-[#0A1422] border-amber-500/40"
            : "bg-gradient-to-b from-[#00E89A]/5 to-[#0A1422] border-[#00E89A]/30"
        )}>
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">5. System Status</span>
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
                "text-[20px] font-bold tracking-tight leading-none font-mono",
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

      {/* ── 2. TWO-COLUMN MARKET DATA OBSERVATORY (INDICES + MOVERS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: MARKET INDICES (7 cols) */}
        <div className="lg:col-span-7 rounded-[10px] bg-[#0A1422] border border-[#12304A] p-4 flex flex-col justify-between shadow-md space-y-3">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 mb-2 border-b border-[#10263A] gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[#22D3EE] uppercase tracking-wider">
                  MARKET INDICES SEQUENCE
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-[#00E89A] bg-[#00E89A]/10 px-1.5 py-0.5 rounded border border-[#00E89A]/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" />
                  REAL-TIME
                </span>
              </div>

              {/* Search Field */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7D8EA5]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter indices / symbols..."
                  className="h-7 w-48 pl-8 pr-2.5 rounded bg-[#05101A] border border-[#10263A] text-[11px] text-slate-100 placeholder-[#566B82] focus:outline-none focus:border-[#22D3EE]"
                />
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 pb-2 mb-2 border-b border-[#10263A] overflow-x-auto no-scrollbar">
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

            {/* Dedicated Card Sections or Single Category Table */}
            {indexCategory === "All" ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
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
                          <span className="text-[11px] font-bold text-[#22D3EE] uppercase tracking-wide">
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
                            <th className="pb-1 text-right font-medium hidden md:table-cell">Exch</th>
                            <th className="pb-1 text-right font-medium hidden sm:table-cell">Source</th>
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
                      <th className="pb-1 text-right font-medium hidden md:table-cell">Exch</th>
                      <th className="pb-1 text-right font-medium hidden sm:table-cell">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#10263A]">
                    {marketIndices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-500 text-[11px] font-mono">
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

          <div className="pt-2 mt-2 border-t border-[#10263A] flex items-center justify-between text-[10px] text-[#7D8EA5] font-mono">
            <span>Last Sync: <span className="text-[#F8FAFC]">{feedHealth.lastTickTime ? new Date(feedHealth.lastTickTime).toLocaleTimeString() : new Date().toLocaleTimeString()}</span></span>
            <span>Gateway: <span className="text-[#22D3EE] font-medium">{marketIndices[0]?.source || "DHAN / BINANCE"}</span></span>
          </div>
        </div>

        {/* RIGHT COLUMN: TOP MOVERS (NSE) (5 cols) */}
        <div className="lg:col-span-5 rounded-[10px] bg-[#0A1422] border border-[#12304A] p-4 flex flex-col justify-between shadow-md space-y-3">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#10263A]">
              <span className="text-[13px] font-bold text-[#F8FAFC] uppercase tracking-wider font-sans">
                TOP MOVERS (NSE)
              </span>

              <div className="flex items-center gap-1 bg-[#05101A] p-0.5 rounded-md border border-[#12304A]">
                <button
                  type="button"
                  onClick={() => setTopMoversFilter("gainers")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer",
                    topMoversFilter === "gainers" ? "bg-[#168BFF] text-[#F8FAFC]" : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                  )}
                >
                  Gainers
                </button>
                <button
                  type="button"
                  onClick={() => setTopMoversFilter("losers")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer",
                    topMoversFilter === "losers" ? "bg-[#168BFF] text-[#F8FAFC]" : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                  )}
                >
                  Losers
                </button>
                <button
                  type="button"
                  onClick={() => setTopMoversFilter("active")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer",
                    topMoversFilter === "active" ? "bg-[#168BFF] text-[#F8FAFC]" : "text-[#7D8EA5] hover:text-[#F8FAFC]"
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
                        <div className="flex flex-col items-center justify-center gap-1 font-mono text-[11px]">
                          {isSnapshotLoading ? (
                            <>
                              <Activity className="h-4 w-4 text-[#7D8EA5]/60 animate-pulse" />
                              <span>Fetching market movers...</span>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-400 font-medium">Session quotes synchronized</span>
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
                        className="hover:bg-[#0F1C2F] transition-colors h-[36px] cursor-pointer"
                      >
                        <td className="font-semibold text-[#F8FAFC]">
                          <div className="flex items-center gap-1.5">
                            <span>{mover.symbol}</span>
                            {mover.isLive && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" title="Live real-time mover" />
                            )}
                          </div>
                        </td>
                        <td className="text-right text-[#F8FAFC] tabular-nums font-medium font-mono">
                          {formatCurrency(mover.ltp, "₹", 2)}
                        </td>
                        <td className={cn("text-right tabular-nums font-medium font-mono", mover.isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                          {mover.isUp ? "+" : "-"}{formatDecimal(mover.change, 2)}
                        </td>
                        <td className={cn("text-right tabular-nums font-semibold font-mono", mover.isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                          {formatPercent(mover.pct, 2, "—", false, true)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-[#10263A] flex items-center justify-between text-[10px] text-[#7D8EA5] font-mono">
            <span>Universe: <span className="text-[#F8FAFC]">NSE Equities</span></span>
            <span>Source: <span className="text-[#22D3EE] font-medium">{currentTopMovers[0]?.source || "DHAN HQ"}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
});
