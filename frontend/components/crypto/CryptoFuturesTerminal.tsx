"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CanonicalFuturesContract, DataQualityStatus } from "@/types/futures-terminal";
import { useCryptoRealtime } from "@/hooks/useCryptoRealtime";
import { FuturesTerminalHeader } from "./FuturesTerminalHeader";
import { FuturesAccountSummary } from "./FuturesAccountSummary";
import { FuturesContractMasterTable } from "./FuturesContractMasterTable";
import { FuturesOrderTicket } from "./FuturesOrderTicket";
import { FuturesIntelligenceHub } from "./FuturesIntelligenceHub";
import { FuturesPositionOrderStrip } from "./FuturesPositionOrderStrip";

interface Props {
  initialUnderlying?: string;
}

export function CryptoFuturesTerminal({ initialUnderlying = "BTC" }: Props) {
  const [underlying, setUnderlying] = useState<string>(initialUnderlying);
  const [selectedExchange, setSelectedExchange] = useState<string>("ALL");
  const [selectedContract, setSelectedContract] = useState<CanonicalFuturesContract | null>(null);
  const [executionMode, setExecutionMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const { connectionStatus } = useCryptoRealtime();

  // Fetch Canonical Futures Contracts
  const { data, isLoading, error, refetch, isFetching } = useQuery<{
    status: string;
    contracts: CanonicalFuturesContract[];
  }>({
    queryKey: ["canonicalFuturesContracts", underlying, selectedExchange, refreshTrigger],
    queryFn: async () => {
      const exchParam = selectedExchange !== "ALL" ? `&exchange=${selectedExchange}` : "";
      const res = await fetch(`/api/futures/contracts?underlying=${underlying}${exchParam}`);
      if (!res.ok) throw new Error("Failed to fetch futures contracts");
      return res.json();
    },
    refetchInterval: 3000,
  });

  const contracts = useMemo(() => {
    return Array.isArray(data?.contracts) ? data.contracts : [];
  }, [data?.contracts]);

  // Set default selected contract when underlying changes
  useEffect(() => {
    if (contracts.length > 0) {
      if (!selectedContract || selectedContract.underlying !== underlying) {
        setSelectedContract(contracts[0]);
      }
    }
  }, [contracts, underlying, selectedContract]);

  const handleManualRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    refetch();
  };

  const handleOrderExecuted = (orderId: string) => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`flex flex-col gap-4 text-slate-100 font-sans pb-12 ${isFullscreen ? "p-4 bg-[#070b14] min-h-screen" : ""}`}>
      {/* 1. Institutional Header */}
      <FuturesTerminalHeader
        selectedUnderlying={underlying}
        onSelectUnderlying={setUnderlying}
        selectedExchange={selectedExchange}
        onSelectExchange={setSelectedExchange}
        selectedContract={selectedContract}
        connectionStatus={connectionStatus as DataQualityStatus}
        executionMode={executionMode}
        isRefreshing={isFetching}
        onRefresh={handleManualRefresh}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* 2. Account Summary Bar */}
      <FuturesAccountSummary
        equity={10000.0}
        availableMargin={8500.0}
        usedMargin={1500.0}
        unrealizedPnl={124.5}
        dailyPnl={420.0}
        openPositionsCount={2}
      />

      {/* 3. Main Trading Workspace (2-Column Institutional Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (Contract Table + Intelligence Hub): 8 Columns */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Canonical Contract Master Table */}
          <FuturesContractMasterTable
            contracts={contracts}
            selectedContract={selectedContract}
            onSelectContract={setSelectedContract}
            isLoading={isLoading}
          />

          {/* Derivatives Intelligence Hub (Term Structure, Funding Heatmap, OI Matrix) */}
          <FuturesIntelligenceHub underlying={underlying} />
        </div>

        {/* Right Column (Risk-Managed Order Ticket): 4 Columns */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <FuturesOrderTicket
            contract={selectedContract}
            executionMode={executionMode}
            onOrderExecuted={handleOrderExecuted}
          />
        </div>
      </div>

      {/* 4. Bottom Workspace Drawer: Active Positions & Recent Orders */}
      <FuturesPositionOrderStrip refreshTrigger={refreshTrigger} />
    </div>
  );
}
