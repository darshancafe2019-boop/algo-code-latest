"use client";

import React, { memo } from "react";
import { LiveTickerItem } from "./LiveTickerItem";

export interface LiveTickerStripProps {
  instruments?: Array<{
    symbol: string;
    displayName?: string;
    currency?: "INR" | "USD";
  }>;
  onSelectInstrument?: (symbol: string) => void;
}

const DEFAULT_INSTRUMENTS = [
  { symbol: "NIFTY", displayName: "NIFTY", currency: "INR" as const },
  { symbol: "BANKNIFTY", displayName: "BANKNIFTY", currency: "INR" as const },
  { symbol: "BTC", displayName: "BTC", currency: "USD" as const },
];

export const LiveTickerStrip = memo(function LiveTickerStrip({
  instruments = DEFAULT_INSTRUMENTS,
  onSelectInstrument,
}: LiveTickerStripProps) {
  return (
    <div
      className="flex items-center gap-2 overflow-x-auto scrollbar-none whitespace-nowrap py-0.5"
      style={{ whiteSpace: "nowrap" }}
    >
      {instruments.map((inst, index) => (
        <React.Fragment key={inst.symbol}>
          {index > 0 && <div className="h-5 w-[1px] bg-[#12304A] shrink-0" />}
          <LiveTickerItem
            symbol={inst.symbol}
            displayName={inst.displayName}
            currency={inst.currency}
            onSelect={onSelectInstrument}
          />
        </React.Fragment>
      ))}
    </div>
  );
});
