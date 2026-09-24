"use client";

import React, { memo } from "react";
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
    <div className="flex items-center gap-2.5 sm:gap-3 flex-1 max-w-4xl min-w-0 w-full">
      {/* ── Live Market Tickers (NIFTY, BANKNIFTY, BTC, AAPL, NVDA) ── */}
      <LiveTickerStrip
        instruments={instruments}
        onSelectInstrument={onSelectInstrument}
      />
    </div>
  );
});
