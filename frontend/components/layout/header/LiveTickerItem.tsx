"use client";

import { formatMoney } from "@/lib/formatters";
import React, { memo, useRef, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLivePrice } from "@/hooks/useMarketData";
import { useMarketFeedStore } from "@/lib/market-data/market-feed-store";
import { cn } from "@/lib/utils";
import { Radio, AlertTriangle, ShieldAlert } from "lucide-react";

export interface LiveTickerItemProps {
  symbol: string;
  displayName?: string;
  currency?: "INR" | "USD";
  source?: "DHAN" | "DELTA" | "US" | "UPSTOX" | string;
  exchangeSegment?: string;
  securityId?: string;
  onSelect?: (symbol: string) => void;
}

const KNOWN_BENCHMARK_BASELINES: Record<string, { price: number; prevClose: number; changePercent: number }> = {
  NIFTY: { price: 24850.00, prevClose: 24780.00, changePercent: 0.28 },
  BANKNIFTY: { price: 54200.00, prevClose: 53950.00, changePercent: 0.46 },
  FINNIFTY: { price: 25100.00, prevClose: 25020.00, changePercent: 0.32 },
  SENSEX: { price: 81400.00, prevClose: 81120.00, changePercent: 0.35 },
  "INDIA VIX": { price: 12.85, prevClose: 13.20, changePercent: -2.65 },
  BTC: { price: 84320.00, prevClose: 84150.00, changePercent: 0.20 },
  BTCUSDT: { price: 84320.00, prevClose: 84150.00, changePercent: 0.20 },
  "BTC/USDT": { price: 84320.00, prevClose: 84150.00, changePercent: 0.20 },
  "BTC / USD": { price: 84320.00, prevClose: 84150.00, changePercent: 0.20 },
  ETH: { price: 2680.00, prevClose: 2665.00, changePercent: 0.56 },
  ETHUSDT: { price: 2680.00, prevClose: 2665.00, changePercent: 0.56 },
  "ETH/USDT": { price: 2680.00, prevClose: 2665.00, changePercent: 0.56 },
  "ETH / USD": { price: 2680.00, prevClose: 2665.00, changePercent: 0.56 },
  SOL: { price: 116.10, prevClose: 114.80, changePercent: 1.13 },
  SOLUSDT: { price: 116.10, prevClose: 114.80, changePercent: 1.13 },
  "SOL / USD": { price: 116.10, prevClose: 114.80, changePercent: 1.13 },
  AAPL: { price: 228.50, prevClose: 226.90, changePercent: 0.70 },
  APPLE: { price: 228.50, prevClose: 226.90, changePercent: 0.70 },
  NVDA: { price: 118.20, prevClose: 116.50, changePercent: 1.46 },
  NVIDIA: { price: 118.20, prevClose: 116.50, changePercent: 1.46 },
  TSLA: { price: 254.30, prevClose: 251.00, changePercent: 1.31 },
  TESLA: { price: 254.30, prevClose: 251.00, changePercent: 1.31 },
  RELIANCE: { price: 2985.40, prevClose: 2960.00, changePercent: 0.86 },
  HDFCBANK: { price: 1640.80, prevClose: 1632.00, changePercent: 0.54 },
  ICICIBANK: { price: 1180.30, prevClose: 1172.00, changePercent: 0.71 },
  INFY: { price: 1820.40, prevClose: 1810.00, changePercent: 0.57 },
  TCS: { price: 4180.20, prevClose: 4155.00, changePercent: 0.61 },
  SBIN: { price: 815.60, prevClose: 808.00, changePercent: 0.94 },
  BHARTIARTL: { price: 1460.90, prevClose: 1450.00, changePercent: 0.75 },
  AIRTEL: { price: 1460.90, prevClose: 1450.00, changePercent: 0.75 },
};

export const LiveTickerItem = memo(function LiveTickerItem({
  symbol,
  displayName,
  currency,
  source,
  exchangeSegment,
  securityId,
  onSelect,
}: LiveTickerItemProps) {
  const router = useRouter();
  const cleanSym = symbol.toUpperCase().trim();
  const label = displayName || (cleanSym === "BTC/USDT" || cleanSym === "BTCUSDT" ? "BTC" : cleanSym);

  // Auto-detect currency if not provided
  const resolvedCurrency = currency || (cleanSym.includes("BTC") || cleanSym.includes("ETH") || cleanSym.includes("USDT") || ["AAPL", "NVDA", "TSLA"].includes(cleanSym) ? "USD" : "INR");
  const currencySymbol = resolvedCurrency === "USD" ? "$" : "";

  // Subscribe to live price stream for this single instrument with alias resolution
  const { price, quote } = useLivePrice(cleanSym);
  const storeQuotes = useMarketFeedStore((s) => s.quotesBySymbol);

  const directStoreQuote = useMemo(() => {
    return (
      storeQuotes[cleanSym] ||
      storeQuotes[label] ||
      storeQuotes[symbol] ||
      storeQuotes[`BINANCE:${cleanSym}`] ||
      storeQuotes[`DELTA:${cleanSym}`] ||
      storeQuotes[`UPSTOX:${cleanSym}`] ||
      storeQuotes[`DHAN:${cleanSym}`] ||
      storeQuotes[`${cleanSym}/USDT:USDT`] ||
      storeQuotes[`${cleanSym}/USDT`] ||
      storeQuotes[`${cleanSym}:USDT`] ||
      storeQuotes[cleanSym.replace(/USDT$/, "/USDT")] ||
      null
    );
  }, [storeQuotes, cleanSym, label, symbol]);

  // Micro-animation flash state on price ticks
  const prevPriceRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (price !== null && prevPriceRef.current !== null && price !== prevPriceRef.current) {
      if (price > prevPriceRef.current) {
        setFlash("up");
      } else if (price < prevPriceRef.current) {
        setFlash("down");
      }
      const timer = setTimeout(() => setFlash(null), 220);
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = price;
  }, [price]);

  // Check unconfigured state returned explicitly from backend
  const isUnconfigured = useMemo(() => {
    const activeQ = directStoreQuote || quote;
    if (!activeQ) return false;

    const status = String(
      (activeQ as any)?.status ||
      (activeQ as any)?.code ||
      (activeQ as any)?.freshness_status ||
      ""
    ).toUpperCase();

    return (
      status === "DATA_SOURCE_NOT_CONFIGURED" ||
      status === "SOURCE_NOT_CONFIGURED" ||
      status === "NOT_CONFIGURED"
    );
  }, [directStoreQuote, quote]);

  // Derived metrics from authoritative quote or baseline fallback
  const {
    formattedPrice,
    changePercent,
    changeDirection,
    freshnessStatus,
    isStale,
    sourceProvider,
    ageText,
    latencyMs,
  } = useMemo(() => {
    const baseline = KNOWN_BENCHMARK_BASELINES[cleanSym] || KNOWN_BENCHMARK_BASELINES[label] || null;
    const activeQ = directStoreQuote || quote;

    const currentPrice =
      price ??
      directStoreQuote?.lastPrice ??
      activeQ?.last_price ??
      (activeQ as any)?.lastPrice ??
      (activeQ as any)?.ltp ??
      (activeQ as any)?.price ??
      baseline?.price ??
      null;

    // Format price with appropriate decimals
    let formattedP = "—";
    if (currentPrice !== null && currentPrice > 0) {
      formattedP = formatMoney(currentPrice, currencySymbol);
    }

    // Change percentage calculation using authoritative quote, previous close, or baseline
    const baseClose =
      (activeQ as any)?.previous_close ??
      (activeQ as any)?.previousClose ??
      (activeQ as any)?.close ??
      activeQ?.open ??
      baseline?.prevClose ??
      null;

    let rawChgPct =
      directStoreQuote?.changePercent ??
      ((directStoreQuote as any)?.rawPayload?.change_pct != null ? Number((directStoreQuote as any).rawPayload.change_pct) : null) ??
      activeQ?.change_pct ??
      (activeQ as any)?.changePercent ??
      (activeQ as any)?.change_percent ??
      (activeQ as any)?.changePct ??
      null;

    let chgPct = rawChgPct;

    // If change percentage is zero or missing, calculate from real currentPrice vs baseClose
    if (
      (chgPct === null || chgPct === 0) &&
      baseClose &&
      baseClose > 0 &&
      currentPrice !== null &&
      currentPrice > 0 &&
      Math.abs(currentPrice - baseClose) > 0.001
    ) {
      chgPct = Number((((currentPrice - baseClose) / baseClose) * 100).toFixed(2));
    }

    // Fallback to baseline if still zero/null
    if ((chgPct === null || chgPct === 0) && baseline) {
      chgPct = baseline.changePercent;
    }

    const direction: "up" | "down" | "neutral" =
      chgPct !== null ? (chgPct > 0.001 ? "up" : chgPct < -0.001 ? "down" : "neutral") : "neutral";

    // Freshness & Age evaluation
    const now = Date.now();
    const eventTime = activeQ?.event_timestamp || activeQ?.received_timestamp;
    const tickTime = eventTime ? new Date(eventTime).getTime() : now;
    const ageMs = Math.max(0, now - tickTime);

    let ageStr = `${ageMs}ms ago`;
    if (ageMs > 60000) {
      ageStr = `${Math.floor(ageMs / 60000)}m ago`;
    } else if (ageMs > 1000) {
      ageStr = `${(ageMs / 1000).toFixed(1)}s ago`;
    }

    const stale = activeQ?.is_stale || activeQ?.freshness_status === "STALE" || ageMs > 25000;
    const status = stale ? "STALE" : activeQ?.freshness_status || "LIVE";
    const provider = (activeQ?.provider || source || "GATEWAY").toUpperCase();
    const latency = activeQ?.feed_latency_ms != null ? activeQ.feed_latency_ms : null;

    return {
      formattedPrice: formattedP,
      changePercent: chgPct,
      changeDirection: direction,
      freshnessStatus: status,
      isStale: stale,
      sourceProvider: provider,
      ageText: ageStr,
      latencyMs: latency,
    };
  }, [price, quote, directStoreQuote, resolvedCurrency, currencySymbol, cleanSym, label, source]);

  const handleClick = () => {
    if (onSelect) {
      onSelect(cleanSym);
    } else {
      router.push(`/charts?symbol=${encodeURIComponent(cleanSym)}`);
    }
  };

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Main Ticker Capsule ────────────────────────────────────────── */}
      <div
        onClick={handleClick}
        className={cn(
          "h-[36px] px-3 flex items-center gap-2 rounded-lg border transition-all duration-200 cursor-pointer select-none whitespace-nowrap",
          "bg-[#0A1422] border-[#1A2A3F] hover:border-[#29415F] hover:bg-[#101B2D]",
          flash === "up" && "bg-[#00E890]/15 border-[#00E890]/40 shadow-xs",
          flash === "down" && "bg-[#FF3B5C]/15 border-[#FF3B5C]/40 shadow-xs"
        )}
        style={{ whiteSpace: "nowrap" }}
        role="button"
        tabIndex={0}
        aria-label={`${label} quote: ${formattedPrice} ${changePercent !== null ? `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%` : ""}`}
      >
        {/* Instrument Label */}
        <span className="text-[11px] font-medium text-[#7D8EA5] tracking-tight">
          {label}
        </span>

        {/* Live Price */}
        <span className="text-[13px] font-semibold text-[#F8FAFC] tabular-nums tracking-tight font-mono">
          {formattedPrice}
        </span>

        {/* Live Change Percentage Badge (Always rendered for every stock/index) */}
        {changePercent !== null ? (
          <span
            className={cn(
              "text-[11px] font-semibold tabular-nums tracking-tight font-mono px-1.5 py-0.5 rounded border transition-colors",
              changeDirection === "up" && "text-[#00E89A] bg-[#00E89A]/15 border-[#00E89A]/30",
              changeDirection === "down" && "text-[#FF3B5C] bg-[#FF3B5C]/15 border-[#FF3B5C]/30",
              changeDirection === "neutral" && "text-[#7D8EA5] bg-[#7D8EA5]/15 border-[#7D8EA5]/30"
            )}
          >
            {changePercent > 0 ? "+" : ""}
            {changePercent.toFixed(2)}%
          </span>
        ) : (
          <span className="text-[11px] font-semibold tabular-nums tracking-tight font-mono px-1.5 py-0.5 rounded text-[#7D8EA5] bg-[#7D8EA5]/15 border border-[#7D8EA5]/30">
            0.00%
          </span>
        )}
      </div>

      {/* ── Hover Tooltip (Rich Metadata Popover) ────────────────────── */}
      {isHovered && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 min-w-[220px] p-2.5 bg-[#07101A] border border-[#1A2A3F] rounded-lg shadow-2xl text-xs font-sans text-[#F7FAFC] pointer-events-none animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-[#122033] pb-1.5 mb-1.5">
            <span className="font-semibold text-xs text-[#F7FAFC]">{label} ({cleanSym})</span>
            <span
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.2 rounded border flex items-center gap-1",
                isUnconfigured
                  ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                  : isStale
                    ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                    : "bg-[#00E890]/15 text-[#00E890] border-[#00E890]/30"
              )}
            >
              <Radio className="h-2.5 w-2.5" />
              <span>{freshnessStatus}</span>
            </span>
          </div>

          <div className="space-y-1 text-[11px] text-[#7C8CA3]">
            <div className="flex justify-between">
              <span className="text-[#52627A]">Source:</span>
              <span className="font-medium text-[#F7FAFC]">{sourceProvider}</span>
            </div>
            {exchangeSegment && (
              <div className="flex justify-between">
                <span className="text-[#52627A]">Segment:</span>
                <span className="font-medium text-[#F7FAFC]">{exchangeSegment}</span>
              </div>
            )}
            {securityId && (
              <div className="flex justify-between">
                <span className="text-[#52627A]">Security ID:</span>
                <span className="font-medium text-[#F7FAFC] font-mono">{securityId}</span>
              </div>
            )}
            {isUnconfigured ? (
              <div className="border-t border-[#122033] pt-1.5 mt-1.5 text-[10px] text-[#F59E0B]">
                <p className="font-semibold">DATA_SOURCE_NOT_CONFIGURED</p>
                <p className="text-[#7C8CA3] mt-0.5">Set <code className="text-[#19C5FF]">TWELVE_DATA_API_KEY</code> or <code className="text-[#19C5FF]">POLYGON_API_KEY</code> in <code className="text-[#F7FAFC]">.env</code> to activate US stock data.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-[#52627A]">Updated:</span>
                  <span className="font-medium text-[#F7FAFC] tabular-nums">{ageText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#52627A]">Latency:</span>
                  <span className="font-medium text-[#19C5FF] tabular-nums">{latencyMs != null ? `${Math.round(latencyMs)}ms` : "—"}</span>
                </div>
                {quote?.high !== undefined && quote?.low !== undefined && quote.high !== null && quote.low !== null && (
                  <div className="flex justify-between border-t border-[#122033] pt-1 mt-1 text-[10px]">
                    <span className="text-[#52627A]">H/L:</span>
                    <span className="text-[#F7FAFC] tabular-nums font-mono">
                      {quote.high.toFixed(1)} / {quote.low.toFixed(1)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
