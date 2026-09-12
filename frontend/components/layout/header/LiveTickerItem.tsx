"use client";

import React, { memo, useRef, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLivePrice } from "@/hooks/useMarketData";
import { cn } from "@/lib/utils";
import { Radio, AlertTriangle } from "lucide-react";

export interface LiveTickerItemProps {
  symbol: string;
  displayName?: string;
  currency?: "INR" | "USD";
  onSelect?: (symbol: string) => void;
}

export const LiveTickerItem = memo(function LiveTickerItem({
  symbol,
  displayName,
  currency,
  onSelect,
}: LiveTickerItemProps) {
  const router = useRouter();
  const cleanSym = symbol.toUpperCase().trim();
  const label = displayName || (cleanSym === "BTC/USDT" || cleanSym === "BTCUSDT" ? "BTC" : cleanSym);

  // Auto-detect currency if not provided
  const resolvedCurrency = currency || (cleanSym.includes("BTC") || cleanSym.includes("ETH") || cleanSym.includes("USDT") ? "USD" : "INR");
  const currencySymbol = resolvedCurrency === "USD" ? "$" : "";

  // Subscribe to live price stream for this single instrument
  const { price, quote } = useLivePrice(cleanSym);

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

  // Derived metrics from authoritative quote
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
    if (!quote && price === null) {
      return {
        formattedPrice: "—",
        changePercent: null,
        changeDirection: "neutral" as const,
        freshnessStatus: "CONNECTING",
        isStale: false,
        sourceProvider: "STREAM",
        ageText: "Connecting",
        latencyMs: 0,
      };
    }

    const currentPrice = price ?? quote?.last_price ?? 0;
    
    // Format price with appropriate decimals
    let formattedP = "—";
    if (currentPrice > 0) {
      if (resolvedCurrency === "USD" && currentPrice > 1000) {
        formattedP = `${currencySymbol}${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
      } else {
        formattedP = `${currencySymbol}${currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }

    // Change percentage calculation
    let chgPct = quote?.change_pct ?? null;
    if (chgPct === null && quote?.open && quote.open > 0 && currentPrice > 0) {
      chgPct = ((currentPrice - quote.open) / quote.open) * 100;
    }

    const direction: "up" | "down" | "neutral" =
      chgPct !== null ? (chgPct > 0 ? "up" : chgPct < 0 ? "down" : "neutral") : "neutral";

    // Freshness & Age evaluation
    const now = Date.now();
    const eventTime = quote?.event_timestamp || quote?.received_timestamp;
    const tickTime = eventTime ? new Date(eventTime).getTime() : now;
    const ageMs = Math.max(0, now - tickTime);
    
    let ageStr = `${ageMs}ms ago`;
    if (ageMs > 60000) {
      ageStr = `${Math.floor(ageMs / 60000)}m ago`;
    } else if (ageMs > 1000) {
      ageStr = `${(ageMs / 1000).toFixed(1)}s ago`;
    }

    const stale = quote?.is_stale || quote?.freshness_status === "STALE" || ageMs > 25000;
    const status = stale ? "STALE" : quote?.freshness_status || "LIVE";
    const provider = (quote?.provider || "GATEWAY").toUpperCase();
    const latency = quote?.feed_latency_ms || 14;

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
  }, [price, quote, resolvedCurrency, currencySymbol]);

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
        <span className="text-[13px] font-semibold text-[#F8FAFC] tabular-nums tracking-tight">
          {formattedPrice}
        </span>

        {/* Change Percent / Stale Indicator */}
        {isStale ? (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center gap-0.5">
            <AlertTriangle className="h-2.5 w-2.5" />
            <span>STALE</span>
          </span>
        ) : changePercent !== null ? (
          <span
            className={cn(
              "text-[12px] font-medium tabular-nums tracking-tight",
              changeDirection === "up" && "text-[#00E89A]",
              changeDirection === "down" && "text-[#FF3B5C]",
              changeDirection === "neutral" && "text-[#7D8EA5]"
            )}
          >
            {changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(2)}%
          </span>
        ) : (
          <span className="text-xs font-medium text-[#7D8EA5] tabular-nums">
            ●
          </span>
        )}
      </div>

      {/* ── Hover Tooltip (Rich Metadata Popover) ────────────────────── */}
      {isHovered && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 min-w-[200px] p-2.5 bg-[#07101A] border border-[#1A2A3F] rounded-lg shadow-2xl text-xs font-sans text-[#F7FAFC] pointer-events-none animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-[#122033] pb-1.5 mb-1.5">
            <span className="font-semibold text-xs text-[#F7FAFC]">{label}</span>
            <span
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.2 rounded border flex items-center gap-1",
                isStale
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
            <div className="flex justify-between">
              <span className="text-[#52627A]">Updated:</span>
              <span className="font-medium text-[#F7FAFC] tabular-nums">{ageText}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#52627A]">Latency:</span>
              <span className="font-medium text-[#19C5FF] tabular-nums">{latencyMs}ms</span>
            </div>
            {quote?.high !== undefined && quote?.low !== undefined && quote.high !== null && quote.low !== null && (
              <div className="flex justify-between border-t border-[#122033] pt-1 mt-1 text-[10px]">
                <span className="text-[#52627A]">H/L:</span>
                <span className="text-[#F7FAFC] tabular-nums font-mono">
                  {quote.high.toFixed(1)} / {quote.low.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
