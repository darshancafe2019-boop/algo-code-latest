"use client";

import React, { memo } from "react";
import { TopSearchBar } from "./TopSearchBar";
import { LiveTickerStrip } from "./LiveTickerStrip";

export interface TopMarketBarProps {
  onOpenSearch?: () => void;
  onSelectInstrument?: (symbol: string) => void;
  instruments?: Array<{
    symbol: string;
    displayName?: string;
    currency?: "INR" | "USD";
  }>;
}

export const TopMarketBar = memo(function TopMarketBar({
  onOpenSearch,
  onSelectInstrument,
  instruments,
}: TopMarketBarProps) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3 flex-1 max-w-3xl min-w-0">
      {/* ── Compact Search Box (Desktop: 300–360px, h: 38px) ────────── */}
      <TopSearchBar onOpenSearch={onOpenSearch} />

      {/* ── Live Market Tickers (NIFTY, BANKNIFTY, BTC) ────────────── */}
      <LiveTickerStrip
        instruments={instruments}
        onSelectInstrument={onSelectInstrument}
      />
    </div>
  );
});
