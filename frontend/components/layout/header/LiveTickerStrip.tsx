"use client";

import React, { memo, useMemo, useRef, useState, useEffect, useCallback } from "react";
import { LiveTickerItem } from "./LiveTickerItem";
import { ChevronLeft, ChevronRight, GripHorizontal } from "lucide-react";

export interface TickerInstrumentConfig {
  symbol: string;
  displayName?: string;
  currency?: "INR" | "USD";
  source?: "DHAN" | "DELTA" | "US" | "UPSTOX" | "BINANCE" | string;
  exchangeSegment?: "IDX_I" | "NSE_EQ" | "MCX_COMM" | "DELTA_PERP" | string;
  securityId?: string;
}

export interface LiveTickerStripProps {
  instruments?: TickerInstrumentConfig[];
  onSelectInstrument?: (symbol: string) => void;
}

export const DEFAULT_TICKER_INSTRUMENTS: TickerInstrumentConfig[] = [
  // ── Indian Benchmark Indices ─────────────────────────────────────────
  {
    symbol: "NIFTY",
    displayName: "NIFTY 50",
    currency: "INR",
    source: "DHAN",
    exchangeSegment: "IDX_I",
    securityId: "13",
  },
  {
    symbol: "BANKNIFTY",
    displayName: "BANKNIFTY",
    currency: "INR",
    source: "DHAN",
    exchangeSegment: "IDX_I",
    securityId: "25",
  },
  {
    symbol: "SENSEX",
    displayName: "SENSEX",
    currency: "INR",
    source: "DHAN",
    exchangeSegment: "IDX_I",
    securityId: "51",
  },
  // ── Global Crypto Assets (BTC, ETH, SOL) ──────────────────────────────
  {
    symbol: "BTCUSDT",
    displayName: "BTC / USD",
    currency: "USD",
    source: "DELTA",
  },
  {
    symbol: "ETHUSDT",
    displayName: "ETH / USD",
    currency: "USD",
    source: "DELTA",
  },
  {
    symbol: "SOLUSDT",
    displayName: "SOL / USD",
    currency: "USD",
    source: "DELTA",
  },
  // ── Global US Equities (Apple, Nvidia, Tesla) ──────────────────────────
  {
    symbol: "AAPL",
    displayName: "APPLE",
    currency: "USD",
    source: "US",
  },
  {
    symbol: "NVDA",
    displayName: "NVIDIA",
    currency: "USD",
    source: "US",
  },
  {
    symbol: "TSLA",
    displayName: "TESLA",
    currency: "USD",
    source: "US",
  },
  // ── Indian Volatility & Bluechips ─────────────────────────────────────
  {
    symbol: "INDIA VIX",
    displayName: "INDIA VIX",
    currency: "INR",
    source: "UPSTOX",
  },
  {
    symbol: "RELIANCE",
    displayName: "RELIANCE",
    currency: "INR",
    source: "DHAN",
    exchangeSegment: "NSE_EQ",
    securityId: "2885",
  },
  {
    symbol: "HDFCBANK",
    displayName: "HDFC BANK",
    currency: "INR",
    source: "DHAN",
    exchangeSegment: "NSE_EQ",
    securityId: "1333",
  },
  {
    symbol: "ICICIBANK",
    displayName: "ICICI BANK",
    currency: "INR",
    source: "DHAN",
    exchangeSegment: "NSE_EQ",
    securityId: "4963",
  },
  {
    symbol: "TCS",
    displayName: "TCS",
    currency: "INR",
    source: "DHAN",
    exchangeSegment: "NSE_EQ",
    securityId: "11536",
  },
  {
    symbol: "INFY",
    displayName: "INFOSYS",
    currency: "INR",
    source: "DHAN",
    exchangeSegment: "NSE_EQ",
    securityId: "1594",
  },
];

export const LiveTickerStrip = memo(function LiveTickerStrip({
  instruments,
  onSelectInstrument,
}: LiveTickerStripProps) {
  const activeList = useMemo(() => {
    return instruments && instruments.length > 0 ? instruments : DEFAULT_TICKER_INSTRUMENTS;
  }, [instruments]);

  // Duplicate list for smooth, seamless continuous scrolling
  const displayList = useMemo(() => {
    return [...activeList, ...activeList, ...activeList];
  }, [activeList]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const hasDraggedRef = useRef(false);

  // Mouse Drag Handlers for Forward / Backward Dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Drag speed multiplier
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch Handlers for Mobile / Touchpad
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    setStartX(e.touches[0].pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    const x = e.touches[0].pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.4;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel Horizontal Scroll Support
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    if (e.deltaY !== 0) {
      containerRef.current.scrollLeft += e.deltaY;
    }
  };

  // Backward / Forward Step Scroll Actions
  const scrollStep = useCallback((direction: "backward" | "forward") => {
    if (!containerRef.current) return;
    const offset = direction === "forward" ? 280 : -280;
    containerRef.current.scrollBy({ left: offset, behavior: "smooth" });
  }, []);

  // Safe selection wrapper preventing unintentional clicks when dragging
  const handleSelectSafe = (sym: string) => {
    if (hasDraggedRef.current) return;
    onSelectInstrument?.(sym);
  };

  return (
    <div
      className="relative overflow-hidden w-full max-w-full py-0.5 select-none group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsDragging(false);
      }}
    >
      {/* ── Backward Scroll Button (Appears on Hover) ────────────────── */}
      <button
        type="button"
        onClick={() => scrollStep("backward")}
        className="absolute left-1 top-1/2 -translate-y-1/2 z-20 h-6 w-6 rounded-full bg-[#071322]/90 hover:bg-[#168BFF] text-[#7D8EA5] hover:text-white border border-[#1A2A3F] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md cursor-pointer hover:scale-110 active:scale-95"
        title="Scroll Backward"
        aria-label="Scroll backward"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      {/* ── Forward Scroll Button (Appears on Hover) ─────────────────── */}
      <button
        type="button"
        onClick={() => scrollStep("forward")}
        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 h-6 w-6 rounded-full bg-[#071322]/90 hover:bg-[#168BFF] text-[#7D8EA5] hover:text-white border border-[#1A2A3F] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md cursor-pointer hover:scale-110 active:scale-95"
        title="Scroll Forward"
        aria-label="Scroll forward"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>

      {/* ── Left and Right Edge Fade Gradients ──────────────────────── */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#06101B] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#06101B] to-transparent z-10 pointer-events-none" />

      {/* ── Scrollable / Draggable Ticker Viewport ───────────────────── */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className={`flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 px-3 transition-colors ${
          isDragging ? "cursor-grabbing select-none" : "cursor-grab"
        }`}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Continuous Marquee Track */}
        <div
          className="flex items-center gap-2 shrink-0 animate-ticker"
          style={{
            animationPlayState: isDragging || isHovered ? "paused" : "running",
          }}
        >
          {displayList.map((inst, index) => (
            <LiveTickerItem
              key={`${inst.symbol}-${index}`}
              symbol={inst.symbol}
              displayName={inst.displayName}
              currency={inst.currency}
              source={inst.source}
              exchangeSegment={inst.exchangeSegment}
              securityId={inst.securityId}
              onSelect={handleSelectSafe}
            />
          ))}
        </div>
      </div>
    </div>
  );
});