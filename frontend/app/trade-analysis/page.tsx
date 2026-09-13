"use client";

import React, { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { TradeAnalysisDashboard } from "@/components/trade-analysis/TradeAnalysisDashboard";
import { TradeAnalysisInstrument } from "@/components/trade-analysis/TradeAnalysisTypes";

function TradeAnalysisContent() {
  const searchParams = useSearchParams();

  const rawSymbol = searchParams.get("symbol")?.trim() || "";
  const rawUnderlying = searchParams.get("underlying")?.trim() || "";
  const rawType = searchParams.get("type")?.toUpperCase() || "OPTION";
  const rawStrike = searchParams.get("strike");
  const rawLtp = searchParams.get("ltp");
  const rawLotSize = searchParams.get("lotSize");
  const side = searchParams.get("side")?.toUpperCase() === "SELL" ? "SELL" : "BUY";
  const assetClass = (["OPTION", "FUTURES", "EQUITY", "CRYPTO"] as const).includes(
    rawType as "OPTION" | "FUTURES" | "EQUITY" | "CRYPTO"
  )
    ? (rawType as "OPTION" | "FUTURES" | "EQUITY" | "CRYPTO")
    : "OPTION";
  const strike = rawStrike !== null && Number.isFinite(Number(rawStrike)) ? Number(rawStrike) : undefined;
  const ltp = rawLtp !== null && Number.isFinite(Number(rawLtp)) ? Number(rawLtp) : undefined;
  const lotSize =
    rawLotSize !== null && Number.isFinite(Number(rawLotSize)) ? Number(rawLotSize) : undefined;
  const optionType = searchParams.get("optionType")?.toUpperCase();
  const initialInstrument: Partial<TradeAnalysisInstrument> = useMemo(
    () => ({
      symbol: rawSymbol,
      underlying: rawUnderlying,
      side,
      assetClass,
      securityId: searchParams.get("securityId") || undefined,
      exchangeSegment: searchParams.get("exchangeSegment") || undefined,
      strike,
      expiry: searchParams.get("expiry") || undefined,
      ltp,
      lotSize,
      optionType: optionType === "CE" || optionType === "PE" ? optionType : undefined,
    }),
    [
      rawSymbol,
      rawUnderlying,
      side,
      assetClass,
      strike,
      ltp,
      lotSize,
      optionType,
      searchParams,
    ]
  );

  if (!rawSymbol || !rawUnderlying) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center text-sm text-amber-200">
        Select a live instrument with a symbol and underlying before opening Trade Analysis.
        No demo market values are loaded.
      </div>
    );
  }

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
