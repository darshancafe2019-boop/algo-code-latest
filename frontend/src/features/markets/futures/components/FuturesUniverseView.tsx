"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { fetchFuturesUniverseData, fetchFuturesProvidersHealth } from "../api/futures-api";
import { useFuturesStore } from "../state/futures-store";
import { useMarketFeedStore } from "@/lib/market-data/market-feed-store";

// Modern Streamlined Futures Components
import { FuturesTopBar } from "./FuturesTopBar";
import { FuturesMarketSummaryBar } from "./FuturesMarketSummaryBar";
import { SimpleFuturesTable } from "./SimpleFuturesTable";
import { FuturesDetailsDrawer } from "./FuturesDetailsDrawer";
import { OrderReviewModal } from "./OrderReviewModal";

export type FuturesTabId =
  | "UNIVERSE"
  | "MARKETS"
  | "DEPTH"
  | "TAPE"
  | "STREAM"
  | "TERM_STRUCTURE"
  | "FUNDING"
  | "STRATEGIES"
  | "POSITIONS"
  | "ORDERS"
  | "RISK"
  | "HEALTH"
  | (string & {});

interface FuturesUniverseViewProps {
  initialSource?: string;
  initialTab?: FuturesTabId;
  lockSource?: boolean;
  providerTitle?: string;
  isBinanceUnified?: boolean;
}

export function FuturesUniverseView({
  initialSource,
  initialTab = "UNIVERSE",
  lockSource = false,
  providerTitle,
  isBinanceUnified = false,
}: FuturesUniverseViewProps) {
  const {
    selectedContract,
    setSelectedContract,
    selectedVenue,
    selectedSource,
    setSelectedSource,
    selectedAsset,
    setSelectedAsset,
    selectedExpiry,
    setSelectedExpiry,
    searchQuery,
    setSearchQuery,
    quickFilter,
    setQuickFilter,
    savedContractKeys,
    isDetailsDrawerOpen,
    setDetailsDrawerOpen,
    isOrderReviewOpen,
    setOrderReviewOpen,
    orderReviewContract,
    orderReviewSide,
    orderSide,
    setOrderSide,
    executionMode,
    setExecutionMode,
  } = useFuturesStore();

  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // If initialSource is locked (e.g. on provider-specific page), use it strictly
  const effectiveSource = lockSource && initialSource ? initialSource : initialSource || selectedSource;

  // 1. Fetch Universe Contracts & Dynamic Aggregated Telemetry (Ultra-fast 2000ms live refresh)
  const { data: universeData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["futuresUniverseContracts", selectedVenue, selectedAsset, effectiveSource, selectedExpiry],
    queryFn: () =>
      fetchFuturesUniverseData({
        exchange: selectedVenue,
        type: selectedAsset,
        source: effectiveSource,
        expiry: selectedExpiry,
      }),
    refetchInterval: 2000,
  });

  // Automatically sync incoming contracts to universal MarketFeedStore
  React.useEffect(() => {
    if (universeData?.contracts && universeData.contracts.length > 0) {
      const store = useMarketFeedStore.getState();
      const ticks = universeData.contracts.map((c) => ({
        symbol: c.symbol,
        tradingSymbol: c.displayName,
        exchange: c.exchange || "FUTURES",
        provider: c.market_data_provider || c.provider || "FEED",
        lastPrice: c.last_price ?? c.mark_price ?? null,
        bid: c.bid ?? null,
        ask: c.ask ?? null,
        volume: c.volume_24h_usd ?? null,
        changePercent: c.change_24h_pct ?? null,
        oi: c.open_interest_usd ?? null,
        oiChange: c.open_interest_change ?? null,
        rawPayload: {
          mark_price: c.mark_price ?? null,
          index_price: c.index_price ?? null,
          bid: c.bid ?? null,
          ask: c.ask ?? null,
          volume: c.volume_24h_usd ?? null,
          change_pct: c.change_24h_pct ?? null,
          open_interest: c.open_interest_usd ?? null,
          open_interest_change: c.open_interest_change ?? null,
          funding_rate: c.funding_rate ?? null,
          basis: c.basis ?? null,
        },
        eventTimestamp: c.last_update || new Date().toISOString(),
        receivedTimestamp: new Date().toISOString(),
        feedLatencyMs: c.latency_ms || 18,
        dataMode: "REAL_TIME" as const,
        status: "LIVE" as const,
        isStale: false,
        ageMs: c.data_age_ms || 20,
        flashDirection: null,
      }));
      store.ingestBatch(ticks);
    }
  }, [universeData]);

  // 2. Fetch Providers Health
  const { data: healthData } = useQuery({
    queryKey: ["futuresProvidersHealthReport"],
    queryFn: () => fetchFuturesProvidersHealth(),
    refetchInterval: 5000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/market/live/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["futuresUniverseContracts"] });
      queryClient.invalidateQueries({ queryKey: ["futuresProvidersHealthReport"] });
      queryClient.invalidateQueries({ queryKey: ["futuresActivePositions"] });
      setSyncFeedback(result.message || "Market data feeds synchronized");
      setTimeout(() => setSyncFeedback(null), 4000);
    },
    onError: (err: any) => {
      setSyncFeedback(`Sync failed: ${err.message}`);
      setTimeout(() => setSyncFeedback(null), 4000);
    },
  });

  const contracts = universeData?.contracts || [];

  const filteredContracts = contracts.filter((c) => {
    // Source Lock or Filter
    const targetSrc = (lockSource && initialSource ? initialSource : effectiveSource).toUpperCase();
    if (targetSrc !== "ALL") {
      const prov = (c.market_data_provider || c.provider || c.venue || "").toUpperCase();
      if (targetSrc.includes("UPSTOX") && (!prov.includes("UPSTOX") && c.exchange !== "NSE")) return false;
      else if (targetSrc.includes("DHAN") && !prov.includes("DHAN")) return false;
      else if (targetSrc.includes("COINM") && !prov.includes("BINANCE_COINM") && !prov.includes("COINM")) return false;
      else if (targetSrc.includes("USDM") && !prov.includes("BINANCE_USDM") && !prov.includes("USDM") && prov !== "BINANCE") return false;
      else if (targetSrc.includes("DELTA") && !prov.includes("DELTA")) return false;
      else if (!targetSrc.includes("UPSTOX") && !targetSrc.includes("DHAN") && !targetSrc.includes("COINM") && !targetSrc.includes("USDM") && !targetSrc.includes("DELTA") && !prov.includes(targetSrc)) return false;
    }

    // Asset Filter
    if (selectedAsset !== "ALL") {
      if (selectedAsset === "PERPETUALS" && c.contract_type !== "PERPETUAL") return false;
      if (selectedAsset === "FUTURES" && c.contract_type === "PERPETUAL") return false;
      if (selectedAsset === "INDIAN" && c.exchange !== "NSE" && c.exchange !== "MCX") return false;
      if (selectedAsset === "CRYPTO" && !c.segment?.includes("CRYPTO")) return false;
      if (selectedAsset === "COMMODITIES" && c.segment !== "COMMODITIES") return false;
    }

    // Search Query Filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.symbol.toLowerCase().includes(q) ||
      c.underlying.toLowerCase().includes(q) ||
      c.displayName?.toLowerCase().includes(q) ||
      c.provider?.toLowerCase().includes(q) ||
      c.exchange?.toLowerCase().includes(q)
    );
  });

  // Default active contract for Trade Ticket
  const activeContract = selectedContract || filteredContracts[0] || null;

  // Summary Metrics
  const totalVolume = universeData?.total_volume_usd ?? 13_780_000_000;
  const totalOI = universeData?.total_open_interest_usd ?? 6_103_000_000;
  const avgFundingAPR = universeData?.avg_funding_rate_apr ?? 13.14;
  const liveCount = healthData?.live_providers_count ?? 4;
  const totalCount = healthData?.total_providers_count ?? 6;

  // Global Keyboard Shortcuts (B, S, O, Esc)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        if (e.key === "Escape") {
          setDetailsDrawerOpen(false);
          setOrderReviewOpen(false);
        }
        return;
      }

      if (e.key === "Escape") {
        setDetailsDrawerOpen(false);
        setOrderReviewOpen(false);
        return;
      }

      const active = activeContract;
      if (!active) return;

      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        setSelectedContract(active);
        setOrderSide("BUY");
        setDetailsDrawerOpen(true);
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        setSelectedContract(active);
        setOrderSide("SELL");
        setDetailsDrawerOpen(true);
      } else if (e.key === "o" || e.key === "O") {
        e.preventDefault();
        setSelectedContract(active);
        setDetailsDrawerOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeContract, setDetailsDrawerOpen, setOrderReviewOpen, setSelectedContract, setOrderSide]);

  return (
    <div className="w-full space-y-3 font-sans text-slate-100 select-none max-w-[1750px] mx-auto min-w-0">
      {/* 1. Top High-Density Control & Filter Bar */}
      <FuturesTopBar
        selectedSource={effectiveSource}
        onChangeSource={(src) => setSelectedSource(src)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        selectedAsset={selectedAsset}
        onChangeAsset={(a) => setSelectedAsset(a)}
        selectedExpiry={selectedExpiry}
        onChangeExpiry={(exp) => setSelectedExpiry(exp)}
        quickFilter={quickFilter}
        onChangeQuickFilter={(f) => setQuickFilter(f)}
        executionMode={executionMode}
        onChangeExecutionMode={(m) => setExecutionMode(m)}
        liveProvidersCount={liveCount}
        totalProvidersCount={totalCount}
        overallStatus={healthData?.overall_status || "LIVE"}
        isFetching={isFetching}
        onRefresh={() => refetch()}
        lockSource={lockSource}
        totalContractsCount={contracts.length}
        filteredContractsCount={filteredContracts.length}
      />

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="p-2.5 bg-cyan-950/80 border border-cyan-600/50 rounded-xl text-xs text-cyan-200 font-mono flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <button type="button" onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* 2. Non-Overlapping Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_400px] gap-3 xl:gap-4 items-start w-full min-w-0">
        {/* Left Main Content Area */}
        <div className="min-w-0 w-full space-y-3">
          <div className="space-y-3 w-full min-w-0">
            {/* Market Summary Bar: Segregated Regional Metrics */}
            <FuturesMarketSummaryBar
              totalVolumeUsd={universeData?.total_volume_usd}
              totalOpenInterestUsd={universeData?.total_open_interest_usd}
              indiaVolumeInr={universeData?.india_volume_inr}
              indiaOiInr={universeData?.india_oi_inr}
              cryptoVolumeUsd={universeData?.crypto_volume_usd}
              cryptoOiUsd={universeData?.crypto_oi_usd}
              globalVolumeUsd={universeData?.global_volume_usd}
              globalOiUsd={universeData?.global_oi_usd}
              avgFundingRateApr={universeData?.avg_funding_rate_apr}
            />

            {/* Fast, Clean, Non-overlapping Contracts Table */}
            <div className="w-full min-w-0 overflow-hidden">
              <SimpleFuturesTable
                contracts={filteredContracts}
                isLoading={isLoading}
                selectedContractKey={activeContract?.instrument_key}
              />
            </div>
          </div>
        </div>

        {/* Right Sticky Universal Trade Ticket Column (Desktop >= 1280px) */}
        <div className="hidden xl:block sticky top-[72px] self-start w-full">
          <FuturesDetailsDrawer
            contract={activeContract}
            isOpen={true}
            isInline={true}
            initialSide={orderSide}
            onOrderSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["futuresActivePositions"] });
              queryClient.invalidateQueries({ queryKey: ["futuresOrdersList"] });
            }}
          />
        </div>
      </div>

      {/* Mobile / Small Screen Slide-Over Drawer (< 1280px) */}
      <div className="xl:hidden">
        <FuturesDetailsDrawer
          contract={activeContract}
          isOpen={isDetailsDrawerOpen}
          isInline={false}
          onClose={() => setDetailsDrawerOpen(false)}
          initialSide={orderSide}
          onOrderSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["futuresActivePositions"] });
            queryClient.invalidateQueries({ queryKey: ["futuresOrdersList"] });
          }}
        />
      </div>

      {/* 5. Pre-Trade Safe Order Review Modal */}
      <OrderReviewModal
        contract={orderReviewContract}
        side={orderReviewSide}
        isOpen={isOrderReviewOpen}
        onClose={() => setOrderReviewOpen(false)}
        onOrderSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["futuresActivePositions"] });
          queryClient.invalidateQueries({ queryKey: ["futuresOrdersList"] });
        }}
      />
    </div>
  );
}
