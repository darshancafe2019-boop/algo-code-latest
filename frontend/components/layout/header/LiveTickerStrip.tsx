"use client";

import React, { memo } from "react";
import { LiveTickerItem } from "./LiveTickerItem";

export interface TickerInstrumentConfig {
  symbol: string;
  displayName?: string;
  currency?: "INR" | "USD";
  source?: "DHAN" | "DELTA" | "US";
  exchangeSegment?: "IDX_I" | "NSE_EQ" | "MCX_COMM" | "DELTA_PERP";
  securityId?: string;
}

export interface LiveTickerStripProps {
  instruments?: TickerInstrumentConfig[];
  onSelectInstrument?: (symbol: string) => void;
}

export const DEFAULT_TICKER_INSTRUMENTS: TickerInstrumentConfig[] = [
  {
    symbol: "NIFTY",
    displayName: "NIFTY",
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
    symbol: "GOLD",
    displayName: "GOLD",
    currency: "INR",
    source: "DHAN",
    exchangeSegment: "MCX_COMM",
  },
  {
    symbol: "SBIN",
    displayName: "SBI",
    currency: "INR",
    source: "DHAN",
    exchangeSegment: "NSE_EQ",
    securityId: "3045",
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
    symbol: "BTC",
    displayName: "BTC",
    currency: "USD",
    source: "DELTA",
  },
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
];

export const LiveTickerStrip = memo(function LiveTickerStrip({
  instruments = DEFAULT_TICKER_INSTRUMENTS,
  onSelectInstrument,
}: LiveTickerStripProps) {
  const activeList = instruments && instruments.length > 0 ? instruments : DEFAULT_TICKER_INSTRUMENTS;

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5 max-w-full">
      {activeList.map((inst) => (
        <LiveTickerItem
          key={inst.symbol}
          symbol={inst.symbol}
          displayName={inst.displayName}
          currency={inst.currency}
          source={inst.source}
          exchangeSegment={inst.exchangeSegment}
          securityId={inst.securityId}
          onSelect={onSelectInstrument}
        />
      ))}
    </div>
  );
});