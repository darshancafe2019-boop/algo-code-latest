"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CanonicalFuturesContract, DataQualityStatus } from "@/types/futures-terminal";
import { useCryptoRealtime } from "@/hooks/useCryptoRealtime";
import { useUIStore } from "@/lib/store/useUIStore";
import { FuturesTerminalHeader } from "./FuturesTerminalHeader";
import { FuturesAccountSummary } from "./FuturesAccountSummary";
import { FuturesContractMasterTable } from "./FuturesContractMasterTable";
import { FuturesOrderTicket } from "./FuturesOrderTicket";
import { FuturesIntelligenceHub } from "./FuturesIntelligenceHub";
import { FuturesContractDetailDrawer } from "./FuturesContractDetailDrawer";
import { ChevronDown, Globe, Layers, Search } from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";

interface Props {
  initialUnderlying?: string;
}

export function CryptoFuturesTerminal({ initialUnderlying = "BTC" }: Props) {
  const { interfaceMode } = useUIStore();
  const { portfolioSnapshot, positions } = useGlobalData();
  const [underlying, setUnderlying] = useState<string>(initialUnderlying);
  const [selectedExchange, setSelectedExchange] = useState<string>("ALL");
  const [selectedContract, setSelectedContract] = useState<CanonicalFuturesContract | null>(null);
  const [executionMode, setExecutionMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isContractDrawerOpen, setIsContractDrawerOpen] = useState<boolean>(false);
  const [showMoreAssets, setShowMoreAssets] = useState<boolean>(false);

  const { connectionStatus } = useCryptoRealtime();

  // Quick Asset buttons & secondary assets
  const quickAssets = ["BTC", "ETH", "SOL", "BNB", "XRP"];
  const moreAssets = ["DOGE", "AVAX", "LINK", "ADA", "NEAR", "SUI", "DOT", "MATIC"];

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

  // Set default selected contract when underlying or contracts change
  useEffect(() => {
    if (contracts.length > 0) {
      if (!selectedContract || selectedContract.underlying !== underlying) {
        setSelectedContract(contracts[0]);
      }
    }
  }, [contracts, underlying, selectedContract]);

  // Available unique exchanges for selector
  const availableExchanges = useMemo(() => {
    const set = new Set<string>(["ALL"]);
    contracts.forEach((c) => {
      if (c.exchange) set.add(c.exchange.toUpperCase());
    });
    return Array.from(set);
  }, [contracts]);

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
      {/* 1. Simplified Top Header */}
      <FuturesTerminalHeader
        selectedContract={selectedContract}
        connectionStatus={connectionStatus as DataQualityStatus}
        executionMode={executionMode}
        isRefreshing={isFetching}
        onRefresh={handleManualRefresh}
        onOpenDetails={() => setIsContractDrawerOpen(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* 2. Quick Asset Selector & 3-Tier Market/Venue/Contract Dropdown Bar */}
      <div className="bg-[#0B101B] border border-slate-800 rounded-xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-4 font-mono text-xs select-none">
        {/* Quick Asset Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">Assets:</span>
          {quickAssets.map((asset) => (
            <button
              key={asset}
              onClick={() => {
                setUnderlying(asset);
                setShowMoreAssets(false);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                underlying === asset
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-[#131B2A] text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {asset}
            </button>
          ))}

          {/* More Assets Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMoreAssets(!showMoreAssets)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                moreAssets.includes(underlying)
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-[#131B2A] hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>{moreAssets.includes(underlying) ? underlying : "More"}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showMoreAssets && (
              <div className="absolute left-0 top-full mt-1.5 z-40 bg-[#0B101B] border border-slate-800 rounded-xl p-2 shadow-2xl grid grid-cols-2 gap-1 w-44">
                {moreAssets.map((asset) => (
                  <button
                    key={asset}
                    onClick={() => {
                      setUnderlying(asset);
                      setShowMoreAssets(false);
                    }}
                    className={`px-2 py-1 text-left rounded text-xs font-bold transition-colors ${
                      underlying === asset
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {asset}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3-Tier Searchable Dropdowns (Market, Venue, Contract) */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Market */}
          <div className="flex items-center gap-1 bg-[#131B2A] px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase">Market:</span>
            <select
              value={underlying}
              onChange={(e) => setUnderlying(e.target.value)}
              className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer"
            >
              {[...quickAssets, ...moreAssets].map((a) => (
                <option key={a} value={a} className="bg-[#131B2A] text-slate-200">
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-1 bg-[#131B2A] px-2.5 py-1 rounded-lg border border-slate-800">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] text-slate-400 uppercase">Venue:</span>
            <select
              value={selectedExchange}
              onChange={(e) => setSelectedExchange(e.target.value)}
              className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer"
            >
              {availableExchanges.map((ex) => (
                <option key={ex} value={ex} className="bg-[#131B2A] text-slate-200">
                  {ex}
                </option>
              ))}
            </select>
          </div>

          {/* Contract */}
          <div className="flex items-center gap-1 bg-[#131B2A] px-2.5 py-1 rounded-lg border border-slate-800 max-w-[220px]">
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedContract?.contract_id || ""}
              onChange={(e) => {
                const target = contracts.find((c) => c.contract_id === e.target.value);
                if (target) setSelectedContract(target);
              }}
              className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer truncate"
            >
              {contracts.map((c) => (
                <option key={c.contract_id} value={c.contract_id} className="bg-[#131B2A] text-slate-200">
                  {c.display_symbol} ({c.exchange})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Authoritative Account Summary Bar */}
      <FuturesAccountSummary
        equity={portfolioSnapshot?.equity ?? 50000.0}
        availableMargin={portfolioSnapshot?.availableCapital ?? 50000.0}
        usedMargin={portfolioSnapshot?.marginUsed ?? 0.0}
        unrealizedPnl={portfolioSnapshot?.unrealizedPnl ?? 0.0}
        dailyPnl={portfolioSnapshot?.dailyPnl ?? 0.0}
        openPositionsCount={portfolioSnapshot?.openPositions ?? positions.length}
      />

      {/* 4. Main Trading Workspace (Contracts Table Left, NEW ORDER Ticket Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Contracts Table (+ Intelligence Hub in Advanced Mode) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <FuturesContractMasterTable
            contracts={contracts}
            selectedContract={selectedContract}
            onSelectContract={setSelectedContract}
            isLoading={isLoading}
            onOpenDetails={() => setIsContractDrawerOpen(true)}
          />

          {/* Advanced Mode: Derivatives Intelligence Hub (Term Structure, Funding Heatmap, OI Matrix) */}
          {interfaceMode === "ADVANCED" && (
            <FuturesIntelligenceHub underlying={underlying} />
          )}
        </div>

        {/* Right Column: NEW ORDER Desk */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <FuturesOrderTicket
            contract={selectedContract}
            executionMode={executionMode}
            onOrderExecuted={handleOrderExecuted}
          />
        </div>
      </div>

      {/* 5. On-Demand Contract Details Drawer */}
      <FuturesContractDetailDrawer
        isOpen={isContractDrawerOpen}
        onClose={() => setIsContractDrawerOpen(false)}
        contract={selectedContract}
      />
    </div>
  );
}
