"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Zap, Layers, RefreshCw, Radio } from "lucide-react";
import { fetchFuturesUniverseData, fetchFuturesProvidersHealth } from "../api/futures-api";
import { useFuturesStore } from "../state/futures-store";
import { useMarketFeedStore } from "@/lib/market-data/market-feed-store";
import { CanonicalFuturesContract } from "../types/futures";

// Workstation Sub-components
import { ProviderHealthRail } from "./ProviderHealthRail";
import { FuturesTopBar } from "./FuturesTopBar";
import { FuturesMarketSummaryBar } from "./FuturesMarketSummaryBar";
import { SimpleFuturesTable } from "./SimpleFuturesTable";
import { FuturesDetailsDrawer } from "./FuturesDetailsDrawer";
import { OrderReviewModal } from "./OrderReviewModal";

export type FuturesBoardId =
  | "ALL"
  | "DHAN"
  | "UPSTOX"
  | "BINANCE_USDM"
  | "BINANCE_COINM"
  | "DELTA";

interface FuturesWorkspaceProps {
  activeBoard?: FuturesBoardId | string;
  boardTitle?: string;
  lockProvider?: boolean;
}

const WORKSPACE_BOARDS: Array<{
  id: FuturesBoardId;
  label: string;
  route: string;
  badge: string;
  market: "ALL" | "INDIA" | "CRYPTO";
}> = [
  { id: "ALL", label: "All Futures", route: "/futures", badge: "ALL", market: "ALL" },
  { id: "DHAN", label: "Dhan (NSE)", route: "/futures/dhan", badge: "NSE", market: "INDIA" },
  { id: "UPSTOX", label: "Upstox (NSE)", route: "/futures/upstox", badge: "NSE", market: "INDIA" },
  { id: "BINANCE_USDM", label: "Binance USD-M", route: "/futures/binance/usdm", badge: "PERP", market: "CRYPTO" },
  { id: "BINANCE_COINM", label: "Binance COIN-M", route: "/futures/binance/coinm", badge: "COIN", market: "CRYPTO" },
  { id: "DELTA", label: "Delta India", route: "/futures/delta", badge: "CRYPTO", market: "CRYPTO" },
];

export function FuturesWorkspace({
  activeBoard = "ALL",
  boardTitle,
  lockProvider = false,
}: FuturesWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();

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

  // Normalize effective source based on route / activeBoard
  const effectiveBoardId = useMemo<FuturesBoardId>(() => {
    if (activeBoard) {
      const bUpper = activeBoard.toUpperCase();
      if (bUpper.includes("DHAN")) return "DHAN";
      if (bUpper.includes("UPSTOX")) return "UPSTOX";
      if (bUpper.includes("COINM")) return "BINANCE_COINM";
      if (bUpper.includes("USDM") || (bUpper.includes("BINANCE") && !bUpper.includes("COINM"))) return "BINANCE_USDM";
      if (bUpper.includes("DELTA")) return "DELTA";
    }
    return "ALL";
  }, [activeBoard]);

  const effectiveSource = lockProvider ? effectiveBoardId : selectedSource;

  // 1. Fetch Universe Contracts & Metrics (REST initial snapshot + fast 2000ms polling/refresh)
  const { data: universeData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["futuresUniverseContracts", selectedVenue, selectedAsset, effectiveSource, selectedExpiry],
    queryFn: () =>
      fetchFuturesUniverseData({
        exchange: selectedVenue,
        type: selectedAsset,
        source: effectiveSource,
        expiry: selectedExpiry,
      }),
    refetchInterval: 2500,
  });

  // Automatically stream incoming ticks to the centralized MarketFeedStore
  useEffect(() => {
    if (universeData?.contracts && universeData.contracts.length > 0) {
      const store = useMarketFeedStore.getState();
      const ticks = universeData.contracts.map((c) => ({
        symbol: c.symbol,
        tradingSymbol: c.displaySymbol || c.displayName || c.symbol,
        exchange: c.exchange || "FUTURES",
        provider: c.market_data_provider || c.provider || "GATEWAY",
        lastPrice: c.lastPrice ?? c.last_price ?? c.markPrice ?? c.mark_price ?? null,
        bid: c.bid ?? null,
        ask: c.ask ?? null,
        volume: c.volume24h ?? c.volume_24h_usd ?? null,
        changePercent: c.change24hPct ?? c.change_24h_pct ?? null,
        oi: c.openInterest ?? c.open_interest_usd ?? null,
        oiChange: c.openInterestChange ?? c.open_interest_change ?? null,
        rawPayload: {
          mark_price: c.markPrice ?? c.mark_price ?? null,
          index_price: c.indexPrice ?? c.index_price ?? null,
          bid: c.bid ?? null,
          ask: c.ask ?? null,
          volume: c.volume24h ?? c.volume_24h_usd ?? null,
          change_pct: c.change24hPct ?? c.change_24h_pct ?? null,
          open_interest: c.openInterest ?? c.open_interest_usd ?? null,
          open_interest_change: c.openInterestChange ?? c.open_interest_change ?? null,
          funding_rate: c.fundingRate ?? c.funding_rate ?? null,
          basis: c.basis ?? null,
          basis_pct: c.basisPct ?? null,
        },
        eventTimestamp: c.last_update || c.exchangeTimestamp || c.receivedAt || new Date().toISOString(),
        receivedTimestamp: new Date().toISOString(),
        feedLatencyMs: c.latencyMs ?? c.latency_ms ?? 18,
        dataMode: "REAL_TIME" as const,
        status: "LIVE" as const,
        isStale: false,
        ageMs: c.data_age_ms || 20,
        flashDirection: null,
      }));
      store.ingestBatch(ticks);
    }
  }, [universeData]);

  // 2. Fetch Isolated Provider Health Reports
  const { data: healthData } = useQuery({
    queryKey: ["futuresProvidersHealthReport"],
    queryFn: () => fetchFuturesProvidersHealth(),
    refetchInterval: 4000,
  });

  const contracts = universeData?.contracts || [];

  // Filter contracts strictly by active board / provider
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      // Board / Provider constraint
      if (effectiveBoardId !== "ALL") {
        const prov = (c.market_data_provider || c.provider || c.venue || "").toUpperCase();
        if (effectiveBoardId === "DHAN" && !prov.includes("DHAN")) return false;
        if (effectiveBoardId === "UPSTOX" && !prov.includes("UPSTOX") && c.exchange !== "NSE") return false;
        if (effectiveBoardId === "BINANCE_USDM" && (!prov.includes("BINANCE_USDM") && !prov.includes("USDM") && prov !== "BINANCE")) return false;
        if (effectiveBoardId === "BINANCE_COINM" && !prov.includes("BINANCE_COINM") && !prov.includes("COINM")) return false;
        if (effectiveBoardId === "DELTA" && !prov.includes("DELTA")) return false;
      } else if (effectiveSource !== "ALL") {
        const prov = (c.market_data_provider || c.provider || c.venue || "").toUpperCase();
        const s = effectiveSource.toUpperCase();
        if (s.includes("UPSTOX") && (!prov.includes("UPSTOX") && c.exchange !== "NSE")) return false;
        else if (s.includes("DHAN") && !prov.includes("DHAN")) return false;
        else if (s.includes("COINM") && !prov.includes("BINANCE_COINM") && !prov.includes("COINM")) return false;
        else if (s.includes("USDM") && !prov.includes("BINANCE_USDM") && !prov.includes("USDM") && prov !== "BINANCE") return false;
        else if (s.includes("DELTA") && !prov.includes("DELTA")) return false;
        else if (!s.includes("UPSTOX") && !s.includes("DHAN") && !s.includes("COINM") && !s.includes("USDM") && !s.includes("DELTA") && !prov.includes(s)) return false;
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
        (c.displaySymbol && c.displaySymbol.toLowerCase().includes(q)) ||
        (c.displayName && c.displayName.toLowerCase().includes(q)) ||
        c.provider.toLowerCase().includes(q) ||
        c.exchange.toLowerCase().includes(q)
      );
    });
  }, [contracts, effectiveBoardId, effectiveSource, selectedAsset, searchQuery]);

  const activeContract = selectedContract || filteredContracts[0] || null;

  const liveCount = healthData?.live_providers_count ?? 4;
  const totalCount = healthData?.total_providers_count ?? 5;

  return (
    <div className="w-full space-y-3 font-sans text-slate-100 select-none max-w-[1750px] mx-auto min-w-0">
      {/* 1. Multi-Board Navigation Switcher Tabs */}
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[#080E1C] border border-[#12304A] overflow-x-auto shadow-lg">
        <div className="flex items-center gap-1.5 min-w-0">
          {WORKSPACE_BOARDS.map((b) => {
            const isActive = effectiveBoardId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => router.push(b.route)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex-shrink-0 ${
                  isActive
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>{b.label}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                    isActive ? "bg-slate-950/30 text-slate-900" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {b.badge}
                </span>
              </button>
            );
          })}
        </div>

        {boardTitle && (
          <div className="hidden lg:flex items-center gap-2 pr-2 text-xs font-mono font-bold text-cyan-300">
            <span>{boardTitle}</span>
          </div>
        )}
      </div>

      {/* 2. Isolated Provider Health Rail */}
      <ProviderHealthRail
        providers={healthData?.providers}
        liveCount={liveCount}
        totalCount={totalCount}
        activeProviderFilter={effectiveBoardId}
        onSelectProvider={(pId) => {
          const match = WORKSPACE_BOARDS.find((b) => b.id.includes(pId) || pId.includes(b.id));
          if (match) router.push(match.route);
        }}
      />

      {/* 3. Top High-Density Filter & Search Bar */}
      <FuturesTopBar
        selectedSource={effectiveSource}
        onChangeSource={(src) => setSelectedSource(src)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        selectedAsset={selectedAsset}
        onChangeAsset={(a) => setSelectedAsset(a)}
        selectedExpiry={selectedExpiry}
        onChangeExpiry={(exp) => setSelectedExpiry(exp)}
        executionMode={executionMode}
        onChangeExecutionMode={(m) => setExecutionMode(m)}
        liveProvidersCount={liveCount}
        totalProvidersCount={totalCount}
        overallStatus={healthData?.overall_status || "LIVE"}
        isFetching={isFetching}
        onRefresh={() => refetch()}
        lockSource={lockProvider}
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

      {/* 4. Non-Overlapping Main Grid Layout */}
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
                selectedContractKey={activeContract?.instrument_key || activeContract?.symbol}
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

      {/* Pre-Trade Safe Order Review Modal */}
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
