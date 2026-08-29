"use client";

import React from "react";
import { useOptionsMarketContext } from "@/context/OptionsMarketContext";
import { BacktestingTab } from "../tabs/BacktestingTab";

export function BacktestSection() {
  const { selectedUnderlying } = useOptionsMarketContext();

  return (
    <div className="space-y-4 font-mono text-xs">
      <BacktestingTab currencySymbol={selectedUnderlying.currencySymbol} />
    </div>
  );
}
