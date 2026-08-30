"use client";

import React from "react";
import { OptionChainView } from "../OptionChainView";

export interface OptionChainTabProps {
  underlying?: string;
  spotPrice?: number;
  currencySymbol?: string;
  onAddLegToBuilder?: (leg: any) => void;
}

export function OptionChainTab({
  underlying = "BTC",
  spotPrice = 78000,
  currencySymbol = "$",
  onAddLegToBuilder,
}: OptionChainTabProps) {
  return (
    <div className="space-y-4">
      <OptionChainView />
    </div>
  );
}
