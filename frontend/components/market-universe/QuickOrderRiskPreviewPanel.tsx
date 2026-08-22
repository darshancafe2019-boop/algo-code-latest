"use client";

import React from "react";
import { MarketInstrument } from "@/types/market-universe";
import { OrderExecutionCenter } from "@/components/order-execution/OrderExecutionCenter";

interface QuickOrderRiskPreviewPanelProps {
  selectedInstrument: MarketInstrument | null;
  currentPrice: number;
}

export function QuickOrderRiskPreviewPanel({
  selectedInstrument,
  currentPrice,
}: QuickOrderRiskPreviewPanelProps) {
  return (
    <OrderExecutionCenter
      initialInstrument={selectedInstrument}
      initialPrice={currentPrice}
    />
  );
}
