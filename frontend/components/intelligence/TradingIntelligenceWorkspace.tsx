"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { IntelligenceSnapshot } from "@/types/intelligence";
import { GlobalIntelligenceCommandBar } from "./GlobalIntelligenceCommandBar";
import { PrimaryDecisionHero } from "./PrimaryDecisionHero";
import { CentralPreTradeRiskInspector } from "./CentralPreTradeRiskInspector";
import { ProviderSystemHealthCard } from "./ProviderSystemHealthCard";
import { WhyNoTradeDiagnostic } from "./WhyNoTradeDiagnostic";
import { GlobalMarketScanner } from "./GlobalMarketScanner";
import { useActiveBot } from "@/context/ActiveBotContext";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";

interface TradingIntelligenceWorkspaceProps {
  botId?: string;
}

export function TradingIntelligenceWorkspace({
  botId = "bot-1",
}: TradingIntelligenceWorkspaceProps) {
  const { activeSymbol, activeTimeframe } = useActiveBot();
  const { portfolioSnapshot, positions } = useGlobalData();
  const [liveSnapshot, setLiveSnapshot] = useState<IntelligenceSnapshot | null>(null);
  const [showWhyNoTradeModal, setShowWhyNoTradeModal] = useState(false);

  // 1. Fetch Decision Intelligence Snapshot from REST endpoint
  const { data: restData, refetch, isFetching } = useQuery({
    queryKey: ["intelligenceDecisionSnapshot", botId, activeSymbol],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/api/intelligence/decision?bot_id=${botId}&symbol=${encodeURIComponent(activeSymbol || "BTC/USDT")}`, {
        timeoutMs: 6000,
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to fetch decision snapshot");
      return (res.data?.result || res.data) as IntelligenceSnapshot;
    },
    staleTime: 4000,
    refetchInterval: 6000,
    placeholderData: (prev) => prev,
  });

  // 2. Real-time SSE Stream Listener for Sub-Second Updates
  useEffect(() => {
    let evtSource: EventSource | null = null;
    try {
      evtSource = new EventSource(`/api/stream/intelligence?bot_id=${botId}&symbol=${encodeURIComponent(activeSymbol || "BTC/USDT")}`);
      evtSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.type === "INTELLIGENCE_UPDATE" && parsed.data) {
            setLiveSnapshot(parsed.data);
          }
        } catch {
          // Safe fallback to polling
        }
      };
    } catch {
      // SSE not available, rely on polling
    }

    return () => {
      if (evtSource) evtSource.close();
    };
  }, [botId, activeSymbol]);

  const snapshot: IntelligenceSnapshot | null = liveSnapshot || restData || null;

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-4 pb-12 font-sans select-none">
      {/* 1. Global Intelligence Command & Telemetry Bar */}
      <GlobalIntelligenceCommandBar
        symbol={activeSymbol || "BTC/USDT"}
        exchange="Binance Futures / NSE India / Global"
        strategyName="Deterministic Multi-Timeframe Confluence Engine"
        timeframe={activeTimeframe || "5m Primary"}
        isRefreshing={isFetching}
        onRefresh={() => {
          refetch();
        }}
        feedLatencyMs={14.5}
        marketStatus="MARKET OPEN 24/7"
        feedStatus={activeSymbol?.includes("AAPL") || activeSymbol?.includes("SPX") ? "DELAYED" : "REAL-TIME"}
      />

      {/* 2. Responsive 12-Column Intelligence Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left Column (8 / 12 Cols on XL Displays): Decision Hero & Confluence */}
        <div className="xl:col-span-8 space-y-4 min-w-0">
          {/* Primary Deterministic Decision Hero */}
          <PrimaryDecisionHero
            snapshot={snapshot}
            onWhyNoTradeClick={() => setShowWhyNoTradeModal(true)}
            onExplainClick={() => setShowWhyNoTradeModal(true)}
          />
        </div>

        {/* Right Column (4 / 12 Cols on XL Displays): Central Risk Engine & Provider Health */}
        <div className="xl:col-span-4 space-y-4 min-w-0">
          {/* Central Pre-Trade Risk Engine */}
          <CentralPreTradeRiskInspector
            totalEquity={portfolioSnapshot?.equity ?? 50000.0}
            allocatedCapital={portfolioSnapshot?.startingBalance ?? 50000.0}
            availableMargin={portfolioSnapshot?.availableCapital ?? 50000.0}
            dailyDrawdownPct={portfolioSnapshot?.currentDrawdownPct ?? 0.35}
            maxDailyLossPct={3.0}
            riskPerTradePct={1.5}
            riskRewardRatio={portfolioSnapshot?.riskRewardRatio ?? 2.0}
            openPositionsCount={positions.length}
            maxPositionsCount={5}
          />

          {/* Data Provider & System Health Telemetry */}
          <ProviderSystemHealthCard
            providerName="Multi-Provider Router (Binance / NSE / TwelveData)"
            latencyMs={14.5}
            gapCount={0}
            reconnectCount={0}
            rateLimitUsed={34}
            rateLimitTotal={1200}
            dbStatus="HEALTHY (SQLite WAL)"
            clockDriftMs={1.2}
          />
        </div>
      </div>

      {/* 3. Tier 2 Global Multi-Asset Market Scanner */}
      <GlobalMarketScanner />

      {/* 4. Why-No-Trade Deep Diagnostic Modal */}
      {showWhyNoTradeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-2xl p-6 relative">
            <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-4 mb-4">
              <h2 className="text-lg font-bold text-[var(--theme-text-primary)]">
                Forensic Why-No-Trade Signal Decision Engine
              </h2>
              <button
                onClick={() => setShowWhyNoTradeModal(false)}
                className="px-3 py-1.5 rounded-xl bg-[var(--theme-elevated)] text-[var(--theme-text-primary)] hover:bg-[var(--theme-border)] text-xs font-mono font-bold transition"
              >
                Close (ESC)
              </button>
            </div>

            <WhyNoTradeDiagnostic
              snapshot={snapshot}
            />
          </div>
        </div>
      )}
    </div>
  );
}
