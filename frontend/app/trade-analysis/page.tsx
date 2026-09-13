"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { TradeAnalysisDashboard } from "@/components/trade-analysis/TradeAnalysisDashboard";
import { TradeAnalysisInstrument } from "@/components/trade-analysis/TradeAnalysisTypes";

function TradeAnalysisContent() {
  const searchParams = useSearchParams();

  const symbol = searchParams.get("symbol") || "NIFTY 25000 CE";
  const underlying = searchParams.get("underlying") || "NIFTY";
  const side = (searchParams.get("side")?.toUpperCase() === "SELL" ? "SELL" : "BUY") as "BUY" | "SELL";
  const assetClass = (searchParams.get("type")?.toUpperCase() === "FUTURES" ? "FUTURES" : "OPTION") as any;
  const strike = searchParams.get("strike") ? Number(searchParams.get("strike")) : 25000;
  const expiry = searchParams.get("expiry") || "11 Sep 2025";
  const ltp = searchParams.get("ltp") ? Number(searchParams.get("ltp")) : 132.4;
  const optionType = (searchParams.get("optionType")?.toUpperCase() === "PE" ? "PE" : "CE") as "CE" | "PE";

  const initialInstrument: Partial<TradeAnalysisInstrument> = {
    symbol,
    underlying,
    side,
    assetClass,
    strike,
    expiry,
    ltp,
    optionType,
    lotSize: underlying.includes("BANKNIFTY") ? 15 : underlying.includes("SENSEX") ? 10 : 25,
  };

  return (
    <div className="p-2 sm:p-4 max-w-[1750px] mx-auto min-w-0 font-sans">
      <TradeAnalysisDashboard initialInstrument={initialInstrument} />
    </div>
  );
}

export default function TradeAnalysisPage() {
  return (
    <DirectPageLayout activeTab="trade-analysis">
      <Suspense fallback={<div className="p-8 text-center text-[#7D8EA5] font-mono text-xs">Loading Trade Analysis Workspace...</div>}>
        <TradeAnalysisContent />
      </Suspense>
    </DirectPageLayout>
  );
}
