"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, formatPrice, formatVolume } from "@/lib/formatters";
import { CanonicalFuturesContract } from "../types/futures";
import { useFuturesStore } from "../state/futures-store";
import { useMarketFeedStore } from "@/lib/market-data/market-feed-store";
import { dispatchBotCreation } from "@/lib/store/useBotCreationIntentStore";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpDown,
  Star,
  Bot,
  Zap,
  CheckCircle2,
  Radio,
  SlidersHorizontal,
} from "lucide-react";

export interface SimpleFuturesTableProps {
  contracts: CanonicalFuturesContract[];
  isLoading?: boolean;
  selectedContractKey?: string | null;
}


type SortField =
  | "symbol"
  | "market"
  | "provider"
  | "type"
  | "expiry"
  | "ltp"
  | "mark"
  | "index"
  | "bid"
  | "ask"
  | "spread"
  | "change"
  | "basis"
  | "funding"
  | "oi"
  | "volume"
  | "latency"
  | "updated";

type SortOrder = "asc" | "desc";

/**
 * Format helper that returns "—" if value is null or undefined (Strict Truth-in-Data)
 */
function formatOrDash(val: number | null | undefined, formatter: (n: number) => string): string {
  if (val == null || isNaN(val)) return "—";
  return formatter(val);
}

/**
 * Memoized single row component for maximum rendering performance under high-frequency WebSocket updates
 */
const FuturesTableRow = React.memo(function FuturesTableRow({
  contract,
  isSelected,
  isSaved,
  onToggleSave,
  onSelect,
  onBotTrade,
  onQuickTrade,
  onMoreDetails,
  quotesBySymbol,
}: {
  contract: CanonicalFuturesContract;
  isSelected: boolean;
  isSaved: boolean;
  onToggleSave: (e: React.MouseEvent, sym: string) => void;
  onSelect: (c: CanonicalFuturesContract) => void;
  onBotTrade: (c: CanonicalFuturesContract, side: "BUY" | "SELL", e: React.MouseEvent) => void;
  onQuickTrade: (c: CanonicalFuturesContract, side: "BUY" | "SELL", e: React.MouseEvent) => void;
  onMoreDetails: (c: CanonicalFuturesContract, e: React.MouseEvent) => void;
  quotesBySymbol: Record<string, any>;
}) {
  const c = contract;
  const isIndian = c.exchange === "NSE" || c.currency === "INR" || c.market === "INDIA";
  const currency = isIndian ? "₹" : "$";
  const isPerpetual = c.contract_type === "PERPETUAL" || !c.expiry_date;

  // Real-time live quote from MarketFeedStore
  const liveQuote =
    quotesBySymbol[c.symbol] ||
    quotesBySymbol[c.instrument_key || ""] ||
    quotesBySymbol[c.provider_instrument_id || ""] ||
    quotesBySymbol[`UPSTOX:${c.symbol}`] ||
    quotesBySymbol[c.underlying] ||
    quotesBySymbol[c.displayName || ""];

  const effectivePrice = liveQuote?.lastPrice ?? c.lastPrice ?? c.last_price ?? c.markPrice ?? c.mark_price ?? null;
  const effectiveMark = liveQuote?.rawPayload?.mark_price ?? liveQuote?.rawPayload?.markPrice ?? c.markPrice ?? c.mark_price ?? effectivePrice;
  const effectiveIndex = liveQuote?.rawPayload?.index_price ?? liveQuote?.rawPayload?.indexPrice ?? c.indexPrice ?? c.index_price ?? (quotesBySymbol[c.underlying]?.lastPrice ?? null);
  const effectiveBid = liveQuote?.bid ?? liveQuote?.rawPayload?.bid ?? c.bid ?? null;
  const effectiveAsk = liveQuote?.ask ?? liveQuote?.rawPayload?.ask ?? c.ask ?? null;
  const effectiveChange = liveQuote?.changePercent ?? (liveQuote?.rawPayload?.change_pct != null ? Number(liveQuote.rawPayload.change_pct) : null) ?? c.change24hPct ?? c.change_24h_pct ?? null;
  const effectiveVolume = liveQuote?.volume ?? (liveQuote?.rawPayload?.volume ? Number(liveQuote.rawPayload.volume) : null) ?? c.volume24h ?? c.volume_24h_usd ?? null;
  const effectiveOI = liveQuote?.oi ?? (liveQuote?.rawPayload?.open_interest ? Number(liveQuote.rawPayload.open_interest) : (liveQuote?.rawPayload?.oi ? Number(liveQuote.rawPayload.oi) : null)) ?? c.openInterest ?? c.open_interest_usd ?? null;
  const effectiveOIChange = liveQuote?.oiChange ?? (liveQuote?.rawPayload?.open_interest_change ? Number(liveQuote.rawPayload.open_interest_change) : (liveQuote?.rawPayload?.oi_change ? Number(liveQuote.rawPayload.oi_change) : null)) ?? c.openInterestChange ?? c.open_interest_change ?? null;
  const effectiveLatency = c.latencyMs ?? c.latency_ms ?? (liveQuote?.feedLatencyMs ? liveQuote.feedLatencyMs : null);
  const flashDir = liveQuote?.flashDirection;

  // Spread calculation
  let spreadVal: number | null = null;
  let spreadPct: number | null = null;
  if (effectiveBid != null && effectiveAsk != null && effectiveAsk > 0 && effectiveAsk >= effectiveBid) {
    spreadVal = effectiveAsk - effectiveBid;
    spreadPct = (spreadVal / effectiveAsk) * 100;
  }

  // Basis calculation (Mark - Index or Futures LTP - Spot Price)
  let basisVal: number | null = null;
  let basisPctVal: number | null = null;
  if (typeof c.basis === "number") {
    basisVal = c.basis;
    basisPctVal = c.basisPct ?? null;
  } else if (c.basis && typeof c.basis === "object") {
    basisVal = c.basis.basis_absolute ?? null;
    basisPctVal = c.basis.basis_percentage ?? null;
  }
  
  if (basisVal == null && effectivePrice != null && effectiveIndex != null && effectiveIndex > 0) {
    basisVal = effectivePrice - effectiveIndex;
    basisPctVal = (basisVal / effectiveIndex) * 100;
  } else if (basisVal == null && effectiveMark != null && effectiveIndex != null && effectiveIndex > 0) {
    basisVal = effectiveMark - effectiveIndex;
    basisPctVal = (basisVal / effectiveIndex) * 100;
  }

  // Funding Rate (Perpetuals only, null for NSE)
  let fundingRateStr = "N/A";
  let nextFundingStr = "N/A";
  if (isPerpetual && !isIndian) {
    const rawRate =
      liveQuote?.rawPayload?.funding_rate ??
      c.fundingRate ??
      c.funding_rate?.funding_rate_8h ??
      (c.funding_rate?.funding_rate_annualized ? c.funding_rate.funding_rate_annualized / (3 * 365 * 100) : null);
    if (rawRate != null) {
      const ratePct = typeof rawRate === "number" ? rawRate * 100 : (rawRate.funding_rate_8h ? rawRate.funding_rate_8h * 100 : Number(rawRate) * 100);
      const apr = ratePct * 3 * 365;
      fundingRateStr = `${ratePct >= 0 ? "+" : ""}${ratePct.toFixed(4)}% (${apr.toFixed(1)}% APR)`;
    } else {
      fundingRateStr = "—";
    }

    if (c.nextFundingAt) {
      nextFundingStr = c.nextFundingAt;
    } else if (c.funding_rate?.next_funding_time) {
      nextFundingStr = c.funding_rate.next_funding_time;
    } else if (c.funding_rate?.countdown_seconds) {
      const mins = Math.floor(c.funding_rate.countdown_seconds / 60);
      nextFundingStr = `${mins}m`;
    } else {
      nextFundingStr = "—";
    }
  }

  // Feed status determination
  let feedBadge = "bg-emerald-950/40 text-emerald-300 border-emerald-500/30";
  let feedDot = "bg-emerald-400";
  let feedLabel = "LIVE";

  const rawState = c.feedState || c.freshness_status || c.status || "LIVE";
  if (rawState === "MARKET_CLOSED") {
    feedBadge = "bg-slate-800/60 text-slate-400 border-slate-700";
    feedDot = "bg-slate-500";
    feedLabel = "MKT CLOSED";
  } else if (rawState === "STALE") {
    feedBadge = "bg-amber-950/40 text-amber-300 border-amber-500/30";
    feedDot = "bg-amber-400";
    feedLabel = "STALE";
  } else if (rawState === "AUTH_REQUIRED" || rawState === "TOKEN_EXPIRED") {
    feedBadge = "bg-amber-950/40 text-amber-300 border-amber-500/30";
    feedDot = "bg-amber-400";
    feedLabel = "AUTH REQ";
  } else if (rawState === "DISCONNECTED" || rawState === "ERROR" || rawState === "NOT_CONFIGURED") {
    feedBadge = "bg-rose-950/40 text-rose-300 border-rose-500/30";
    feedDot = "bg-rose-400";
    feedLabel = "OFFLINE";
  }

  // Provider Tag
  const providerLabel = (c.market_data_provider || c.provider || c.venue || "SIM")
    .replace("BINANCE_USDM", "BINANCE USD-M")
    .replace("BINANCE_COINM", "BINANCE COIN-M")
    .replace("DELTA_INDIA", "DELTA")
    .replace("_NSE", "")
    .replace("_API", "");

  const priceColor =
    flashDir === "up"
      ? "text-emerald-300 bg-emerald-500/20 px-1 py-0.5 rounded shadow-sm"
      : flashDir === "down"
      ? "text-rose-300 bg-rose-500/20 px-1 py-0.5 rounded shadow-sm"
      : "text-white";

  return (
    <tr
      onClick={() => onSelect(c)}
      className={`cursor-pointer transition-colors group font-mono text-xs border-b border-slate-800/60 ${
        isSelected ? "bg-cyan-500/15 ring-1 ring-cyan-500/40" : "hover:bg-slate-800/50"
      }`}
    >
      {/* 1. FAVORITE */}
      <td
        className="p-2.5 text-center w-8"
        onClick={(e) => onToggleSave(e, c.symbol)}
      >
        <button type="button" className="text-slate-600 hover:text-amber-400 transition">
          <Star className={`w-3.5 h-3.5 ${isSaved ? "text-amber-400 fill-amber-400" : ""}`} />
        </button>
      </td>

      {/* 2. CONTRACT */}
      <td className="p-2.5 text-left min-w-[170px]">
        <div>
          <div className="font-bold text-white text-xs group-hover:text-cyan-300 transition flex items-center gap-1.5">
            <span>{c.displaySymbol || c.displayName || c.symbol}</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700/60">
              {c.contract_type === "PERPETUAL" ? "PERP" : "FUT"}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
            <span>{c.underlying}</span>
            {c.leverageMax || c.max_leverage ? (
              <span className="text-cyan-400/80">• {c.leverageMax || c.max_leverage}x</span>
            ) : null}
            {c.lotSize || c.lot_size ? <span>• Lot: {c.lotSize || c.lot_size}</span> : null}
          </div>
        </div>
      </td>

      {/* 3. MARKET */}
      <td className="p-2.5 text-left text-[11px] font-semibold">
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] border ${
            isIndian
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-300 border-amber-500/20"
          }`}
        >
          {isIndian ? "INDIA" : "CRYPTO"}
        </span>
      </td>

      {/* 4. PROVIDER */}
      <td className="p-2.5 text-left">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
          {providerLabel}
        </span>
      </td>

      {/* 5. TYPE */}
      <td className="p-2.5 text-left text-slate-400 text-[11px]">
        {c.contract_type === "PERPETUAL" ? "Perpetual" : "Dated Future"}
      </td>

      {/* 6. EXPIRY */}
      <td className="p-2.5 text-left text-slate-300 text-[11px]">
        {c.expiry || c.expiry_date || (isPerpetual ? "PERP" : "—")}
      </td>

      {/* 7. LTP */}
      <td className="p-2.5 text-right font-bold text-xs">
        {effectivePrice != null ? (
          <span className={priceColor}>{formatPrice(effectivePrice, currency)}</span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>

      {/* 8. MARK */}
      <td className="p-2.5 text-right text-slate-300 text-xs">
        {effectiveMark != null ? formatPrice(effectiveMark, currency) : <span className="text-slate-600">—</span>}
      </td>

      {/* 9. INDEX */}
      <td className="p-2.5 text-right text-slate-400 text-xs">
        {effectiveIndex != null ? formatPrice(effectiveIndex, currency) : <span className="text-slate-600">—</span>}
      </td>

      {/* 10. BID */}
      <td className="p-2.5 text-right text-emerald-400 font-semibold text-xs">
        {effectiveBid != null ? formatPrice(effectiveBid, currency) : <span className="text-slate-600">—</span>}
      </td>

      {/* 11. ASK */}
      <td className="p-2.5 text-right text-rose-400 font-semibold text-xs">
        {effectiveAsk != null ? formatPrice(effectiveAsk, currency) : <span className="text-slate-600">—</span>}
      </td>

      {/* 12. SPREAD */}
      <td className="p-2.5 text-right text-slate-400 text-[11px]">
        {spreadVal != null && spreadPct != null ? (
          <span>
            {spreadVal.toFixed(2)} ({spreadPct.toFixed(2)}%)
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>

      {/* 13. 24H % */}
      <td className="p-2.5 text-right">
        {effectiveChange != null ? (
          <span
            className={`font-bold inline-flex items-center gap-0.5 text-xs font-mono tabular-nums ${
              effectiveChange > 0.001
                ? "text-emerald-400"
                : effectiveChange < -0.001
                ? "text-rose-400"
                : "text-slate-400"
            }`}
          >
            {effectiveChange > 0 ? "+" : ""}
            {effectiveChange.toFixed(2)}%
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>

      {/* 14. BASIS */}
      <td className="p-2.5 text-right text-slate-300 text-xs">
        {basisVal != null ? (
          <span className={basisVal >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {basisVal >= 0 ? "+" : ""}
            {basisVal.toFixed(2)}
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>

      {/* 15. BASIS % */}
      <td className="p-2.5 text-right text-slate-400 text-[11px]">
        {basisPctVal != null ? (
          <span className={basisPctVal >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {basisPctVal >= 0 ? "+" : ""}
            {basisPctVal.toFixed(2)}%
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>

      {/* 16. FUNDING */}
      <td className="p-2.5 text-right text-[11px]">
        {fundingRateStr === "N/A" ? (
          <span className="text-slate-500 text-[10px]">N/A</span>
        ) : fundingRateStr !== "—" ? (
          <span className="text-cyan-300 font-semibold">{fundingRateStr}</span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>

      {/* 17. NEXT FUNDING */}
      <td className="p-2.5 text-right text-slate-400 text-[10px]">
        {nextFundingStr === "N/A" ? (
          <span className="text-slate-500">N/A</span>
        ) : (
          nextFundingStr
        )}
      </td>

      {/* 18. OPEN INTEREST */}
      <td className="p-2.5 text-right text-slate-200 font-medium text-xs">
        {effectiveOI != null ? formatVolume(effectiveOI, currency) : <span className="text-slate-600">—</span>}
      </td>

      {/* 19. OI CHANGE */}
      <td className="p-2.5 text-right text-slate-400 text-[11px]">
        {effectiveOIChange != null ? (
          <span className={effectiveOIChange >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {effectiveOIChange >= 0 ? "+" : ""}
            {effectiveOIChange.toFixed(2)}%
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>

      {/* 20. 24H VOLUME */}
      <td className="p-2.5 text-right text-slate-300 font-medium text-xs">
        {effectiveVolume != null ? formatVolume(effectiveVolume, currency) : <span className="text-slate-600">—</span>}
      </td>

      {/* 21. LATENCY */}
      <td className="p-2.5 text-right text-[10px]">
        {effectiveLatency != null ? (
          <span
            className={
              effectiveLatency < 50
                ? "text-emerald-400"
                : effectiveLatency < 200
                ? "text-amber-400"
                : "text-rose-400"
            }
          >
            {effectiveLatency}ms
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>

      {/* 22. UPDATED */}
      <td className="p-2.5 text-right text-slate-500 text-[10px]">
        {c.last_update || c.exchangeTimestamp || c.receivedAt ? (
          new Date(c.last_update || c.exchangeTimestamp || c.receivedAt!).toLocaleTimeString()
        ) : (
          <span>—</span>
        )}
      </td>

      {/* 23. FEED STATUS */}
      <td className="p-2.5 text-center">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${feedBadge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${feedDot}`} />
          {feedLabel}
        </span>
      </td>

      {/* 24. ACTIONS */}
      <td className="p-2.5 text-center min-w-[210px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={(e) => onBotTrade(c, "BUY", e)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold transition shadow-sm"
            title="Deploy Quantitative Trading Bot"
          >
            <Bot className="w-3 h-3 text-indigo-400" />
            <span>BOT</span>
          </button>

          <button
            type="button"
            onClick={(e) => onQuickTrade(c, "BUY", e)}
            className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition shadow-sm"
          >
            BUY
          </button>

          <button
            type="button"
            onClick={(e) => onQuickTrade(c, "SELL", e)}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold transition shadow-sm"
          >
            SELL
          </button>

          <button
            type="button"
            onClick={(e) => onMoreDetails(c, e)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-[10px] transition"
            title="Open Trade Ticket / Details"
          >
            <SlidersHorizontal className="w-3 h-3" />
          </button>
        </div>
      </td>
    </tr>
  );
});

export function SimpleFuturesTable({
  contracts,
  isLoading = false,
  selectedContractKey,
}: SimpleFuturesTableProps) {
  const router = useRouter();
  const { savedContractKeys, toggleSaveContract, setDetailsDrawerOpen, setSelectedContract, setOrderSide } =
    useFuturesStore();
  const quotesBySymbol = useMarketFeedStore((s) => s.quotesBySymbol);

  const [quickFilter, setQuickFilter] = useState<
    "ALL" | "HOT_VOL" | "HIGH_OI" | "GAINERS" | "LOSERS" | "HIGH_FUNDING"
  >("ALL");

  const [sortField, setSortField] = useState<SortField>("volume");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const handleBotTrade = useCallback(
    (c: CanonicalFuturesContract, side: "BUY" | "SELL", e: React.MouseEvent) => {
      e.stopPropagation();
      const isIndian = c.exchange === "NSE" || c.currency === "INR" || c.market === "INDIA";
      const isPerp = c.contract_type === "PERPETUAL" || !c.expiry_date;
      const provider = c.market_data_provider || c.provider || (isIndian ? "UPSTOX" : "DELTA");

      const liveQuote = quotesBySymbol[c.symbol] || quotesBySymbol[c.underlying] || quotesBySymbol[c.displayName || ""];
      const effectivePrice = liveQuote?.lastPrice ?? c.lastPrice ?? c.last_price ?? c.markPrice ?? null;

      dispatchBotCreation(router, {
        symbol: c.symbol,
        canonicalSymbol: c.canonical_symbol || c.displayName || c.symbol,
        side,
        assetClass: isPerp ? "PERPETUAL" : "FUTURE",
        exchange: c.exchange || (isIndian ? "NSE" : "BINANCE"),
        market: isIndian ? "Indian Futures" : "Crypto Futures",
        broker: provider.toUpperCase().includes("DHAN")
          ? "DHAN"
          : provider.toUpperCase().includes("UPSTOX")
          ? "UPSTOX"
          : provider.toUpperCase().includes("DELTA")
          ? "DELTA"
          : "BINANCE",
        marketDataSource: provider,
        instrumentId: c.instrument_key || c.symbol,
        currentPrice: effectivePrice,
        bid: liveQuote?.bid ?? c.bid ?? null,
        ask: liveQuote?.ask ?? c.ask ?? null,
        markPrice: c.mark_price || null,
        expiry: isPerp ? null : (c.expiry_date || null),
        lotSize: c.lotSize || c.lot_size || null,
        tickSize: c.tickSize || c.tick_size || null,
        openInterest: liveQuote?.oi ?? c.openInterest ?? c.open_interest_usd ?? null,
        volume: liveQuote?.volume ?? c.volume24h ?? c.volume_24h_usd ?? null,
        maxLeverage: c.leverageMax || c.max_leverage || null,
        fundingRate: c.fundingRate || c.funding_rate?.funding_rate_8h || null,
        origin: "FUTURES",
        timestamp: Date.now(),
      });
    },
    [quotesBySymbol, router]
  );

  const handleQuickTrade = useCallback(
    (c: CanonicalFuturesContract, side: "BUY" | "SELL", e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedContract(c);
      setOrderSide(side);
      setDetailsDrawerOpen(true);
    },
    [setDetailsDrawerOpen, setOrderSide, setSelectedContract]
  );

  const handleMoreDetails = useCallback(
    (c: CanonicalFuturesContract, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedContract(c);
      setDetailsDrawerOpen(true);
    },
    [setDetailsDrawerOpen, setSelectedContract]
  );

  const handleSelectContract = useCallback(
    (c: CanonicalFuturesContract) => {
      setSelectedContract(c);
    },
    [setSelectedContract]
  );

  const handleToggleSave = useCallback(
    (e: React.MouseEvent, sym: string) => {
      e.stopPropagation();
      toggleSaveContract(sym);
    },
    [toggleSaveContract]
  );

  // Filtered & Sorted contracts memoized
  const processedContracts = useMemo(() => {
    let list = [...contracts];

    if (quickFilter === "HOT_VOL") {
      list = list.filter((c) => (c.volume24h || c.volume_24h_usd || 0) > 100_000_000);
    } else if (quickFilter === "HIGH_OI") {
      list = list.filter((c) => (c.openInterest || c.open_interest_usd || 0) > 50_000_000);
    } else if (quickFilter === "GAINERS") {
      list = list.filter((c) => (c.change24hPct ?? c.change_24h_pct ?? 0) > 0);
    } else if (quickFilter === "LOSERS") {
      list = list.filter((c) => (c.change24hPct ?? c.change_24h_pct ?? 0) < 0);
    } else if (quickFilter === "HIGH_FUNDING") {
      list = list.filter(
        (c) =>
          (c.fundingRate ?? c.funding_rate?.funding_rate_annualized ?? 0) > 10 ||
          (c.funding_rate?.funding_rate_8h ?? 0) > 0.0001
      );
    }

    return list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      const qA = quotesBySymbol[a.symbol] || quotesBySymbol[a.underlying];
      const qB = quotesBySymbol[b.symbol] || quotesBySymbol[b.underlying];

      switch (sortField) {
        case "symbol":
          valA = a.displayName || a.displaySymbol || a.symbol;
          valB = b.displayName || b.displaySymbol || b.symbol;
          return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case "market":
          valA = a.market || a.exchange;
          valB = b.market || b.exchange;
          return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case "provider":
          valA = a.market_data_provider || a.provider;
          valB = b.market_data_provider || b.provider;
          return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case "type":
          valA = a.contract_type;
          valB = b.contract_type;
          return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case "expiry":
          valA = a.expiry || a.expiry_date || "9999-99-99";
          valB = b.expiry || b.expiry_date || "9999-99-99";
          return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case "ltp":
          valA = qA?.lastPrice ?? a.lastPrice ?? a.last_price ?? a.mark_price ?? 0;
          valB = qB?.lastPrice ?? b.lastPrice ?? b.last_price ?? b.mark_price ?? 0;
          break;
        case "mark":
          valA = a.markPrice ?? a.mark_price ?? 0;
          valB = b.markPrice ?? b.mark_price ?? 0;
          break;
        case "index":
          valA = a.indexPrice ?? a.index_price ?? 0;
          valB = b.indexPrice ?? b.index_price ?? 0;
          break;
        case "bid":
          valA = qA?.bid ?? a.bid ?? 0;
          valB = qB?.bid ?? b.bid ?? 0;
          break;
        case "ask":
          valA = qA?.ask ?? a.ask ?? 0;
          valB = qB?.ask ?? b.ask ?? 0;
          break;
        case "change":
          valA = qA?.changePercent ?? a.change24hPct ?? a.change_24h_pct ?? 0;
          valB = qB?.changePercent ?? b.change24hPct ?? b.change_24h_pct ?? 0;
          break;
        case "funding":
          valA = a.fundingRate ?? a.funding_rate?.funding_rate_annualized ?? 0;
          valB = b.fundingRate ?? b.funding_rate?.funding_rate_annualized ?? 0;
          break;
        case "oi":
          valA = qA?.oi ?? a.openInterest ?? a.open_interest_usd ?? 0;
          valB = qB?.oi ?? b.openInterest ?? b.open_interest_usd ?? 0;
          break;
        case "volume":
          valA = qA?.volume ?? a.volume24h ?? a.volume_24h_usd ?? 0;
          valB = qB?.volume ?? b.volume24h ?? b.volume_24h_usd ?? 0;
          break;
        default:
          return 0;
      }

      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [contracts, quickFilter, quotesBySymbol, sortField, sortOrder]);

  if (isLoading && contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#080E1C] border border-slate-800 rounded-2xl font-mono text-xs text-slate-400">
        <Activity className="w-6 h-6 animate-spin text-cyan-400 mb-2.5" />
        <p>Connecting to canonical Market Data Gateway streams...</p>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="p-12 text-center bg-[#080E1C] border border-slate-800 rounded-2xl font-mono text-xs text-slate-500 space-y-1">
        <div className="font-bold text-slate-400">No futures contracts found for selected filter</div>
        <p>Switch provider board or clear search query to inspect available futures instruments.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#080E1C] border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs select-none">
      {/* Quick Filter Header Bar */}
      <div className="p-2.5 bg-[#0C1428] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mr-1 flex items-center gap-1">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            FILTERS:
          </span>
          {[
            { id: "ALL", label: `All (${contracts.length})` },
            { id: "HOT_VOL", label: "🔥 Top Volume" },
            { id: "HIGH_OI", label: "⚡ High Open Interest" },
            { id: "GAINERS", label: "📈 Gainers" },
            { id: "LOSERS", label: "📉 Losers" },
            { id: "HIGH_FUNDING", label: "💰 High Funding" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setQuickFilter(f.id as any)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 ${
                quickFilter === f.id
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Gateway Synced
          </span>
          <span className="text-slate-500">Displaying {processedContracts.length} contracts</span>
        </div>
      </div>

      {/* Responsive Horizontal Scroll Table */}
      <div className="overflow-x-auto max-h-[720px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        <table className="w-full border-collapse">
          {/* Sticky Table Header */}
          <thead className="sticky top-0 z-20 bg-[#0C1428] border-b border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <tr>
              <th className="p-2.5 text-center w-8">★</th>
              <th
                onClick={() => handleSort("symbol")}
                className="p-2.5 text-left cursor-pointer hover:text-white transition group min-w-[170px]"
              >
                <div className="flex items-center gap-1">
                  <span>CONTRACT</span>
                  <ArrowUpDown className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                </div>
              </th>
              <th onClick={() => handleSort("market")} className="p-2.5 text-left cursor-pointer hover:text-white">
                MARKET
              </th>
              <th onClick={() => handleSort("provider")} className="p-2.5 text-left cursor-pointer hover:text-white">
                PROVIDER
              </th>
              <th onClick={() => handleSort("type")} className="p-2.5 text-left cursor-pointer hover:text-white">
                TYPE
              </th>
              <th onClick={() => handleSort("expiry")} className="p-2.5 text-left cursor-pointer hover:text-white">
                EXPIRY
              </th>
              <th onClick={() => handleSort("ltp")} className="p-2.5 text-right cursor-pointer hover:text-white">
                LTP
              </th>
              <th onClick={() => handleSort("mark")} className="p-2.5 text-right cursor-pointer hover:text-white">
                MARK
              </th>
              <th onClick={() => handleSort("index")} className="p-2.5 text-right cursor-pointer hover:text-white">
                INDEX
              </th>
              <th onClick={() => handleSort("bid")} className="p-2.5 text-right cursor-pointer hover:text-white">
                BID
              </th>
              <th onClick={() => handleSort("ask")} className="p-2.5 text-right cursor-pointer hover:text-white">
                ASK
              </th>
              <th className="p-2.5 text-right">SPREAD</th>
              <th onClick={() => handleSort("change")} className="p-2.5 text-right cursor-pointer hover:text-white">
                24H %
              </th>
              <th className="p-2.5 text-right">BASIS</th>
              <th className="p-2.5 text-right">BASIS %</th>
              <th onClick={() => handleSort("funding")} className="p-2.5 text-right cursor-pointer hover:text-white">
                FUNDING
              </th>
              <th className="p-2.5 text-right">NEXT FUND</th>
              <th onClick={() => handleSort("oi")} className="p-2.5 text-right cursor-pointer hover:text-white">
                OPEN INTEREST
              </th>
              <th className="p-2.5 text-right">OI CHG</th>
              <th onClick={() => handleSort("volume")} className="p-2.5 text-right cursor-pointer hover:text-white">
                24H VOLUME
              </th>
              <th className="p-2.5 text-right">LATENCY</th>
              <th className="p-2.5 text-right">UPDATED</th>
              <th className="p-2.5 text-center">FEED STATUS</th>
              <th className="p-2.5 text-center min-w-[210px]">ACTIONS</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/60">
            {processedContracts.map((c) => {
              const contractKey = c.instrument_key || c.symbol;
              const isSelected = selectedContractKey === contractKey;
              const isSaved = savedContractKeys.includes(c.symbol) || savedContractKeys.includes(c.displayName);

              return (
                <FuturesTableRow
                  key={contractKey}
                  contract={c}
                  isSelected={isSelected}
                  isSaved={isSaved}
                  onToggleSave={handleToggleSave}
                  onSelect={handleSelectContract}
                  onBotTrade={handleBotTrade}
                  onQuickTrade={handleQuickTrade}
                  onMoreDetails={handleMoreDetails}
                  quotesBySymbol={quotesBySymbol}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
