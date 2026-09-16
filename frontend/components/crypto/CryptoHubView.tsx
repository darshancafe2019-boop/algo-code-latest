"use client";

import React from "react";
import { useSharedCryptoState, CryptoTab } from "./useSharedCryptoState";
import { CryptoHeader } from "./CryptoHeader";
import { CryptoOverviewTab } from "./CryptoOverviewTab";
import { CryptoFuturesTab } from "./CryptoFuturesTab";
import { CryptoOptionsTab } from "./CryptoOptionsTab";
import { CryptoStrategiesTab } from "./CryptoStrategiesTab";
import { CryptoPositionsBar } from "./CryptoPositionsBar";
import { CryptoQuickTradeDrawer } from "./CryptoQuickTradeDrawer";
import { CryptoDiagnosticsDrawer } from "./CryptoDiagnosticsDrawer";
import { CryptoStrategyBuilderDrawer } from "./CryptoStrategyBuilderDrawer";
import {
  Globe,
  BarChart3,
  Layers,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function CryptoHubView() {
  const {
    selectedUnderlying,
    setSelectedUnderlying,
    selectedProvider,
    setSelectedProvider,
    activeTab,
    setActiveTab,
    complexityMode,
    setComplexityMode,

    connectionStatus,
    overviewMarkets,
    isOverviewLoading,

    futuresContracts,
    isFuturesLoading,

    availableExpiries,
    selectedExpiry,
    setSelectedExpiry,
    chainData,
    isChainLoading,

    positions,
    orders,
    totalUnrealizedPnl,
    totalMarginUsed,

    providerDiagnostics,

    tradeDrawerOpen,
    selectedTradeContract,
    tradeSide,
    openTradeDrawer,
    closeTradeDrawer,

    diagnosticsDrawerOpen,
    setDiagnosticsDrawerOpen,

    positionsDrawerOpen,
    setPositionsDrawerOpen,

    strategyDrawerOpen,
    setStrategyDrawerOpen,
    selectedStrategyTemplate,
    openStrategyBuilder,

    handleManualRefresh,
    isRefreshing,
  } = useSharedCryptoState();

  const tabs: Array<{ id: CryptoTab; label: string; icon: any }> = [
    { id: "OVERVIEW", label: "OVERVIEW", icon: Globe },
    { id: "FUTURES", label: "FUTURES", icon: BarChart3 },
    { id: "OPTIONS", label: "OPTIONS", icon: Layers },
    { id: "STRATEGIES", label: "STRATEGIES", icon: Percent },
  ];

  return (
    <div className="flex flex-col gap-4 text-slate-100 font-sans pb-12 select-none w-full max-w-7xl mx-auto">
      {/* 1. Simplified Master Header */}
      <CryptoHeader
        selectedUnderlying={selectedUnderlying}
        onSelectUnderlying={setSelectedUnderlying}
        selectedProvider={selectedProvider}
        onSelectProvider={setSelectedProvider}
        complexityMode={complexityMode}
        onToggleComplexity={() =>
          setComplexityMode((prev) => (prev === "SIMPLE" ? "ADVANCED" : "SIMPLE"))
        }
        connectionStatus={connectionStatus}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        onOpenDiagnostics={() => setDiagnosticsDrawerOpen(true)}
      />

      {/* 2. Main Navigation Tab Bar */}
      <div className="flex items-center gap-1 bg-[#050e1d] p-1 rounded-xl border border-[#12365a] shadow-md">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                isActive
                  ? "bg-[#00D4FF] text-slate-950 shadow-md shadow-[#00D4FF]/30"
                  : "text-slate-300 hover:text-white hover:bg-[#07192f]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Workspace Tab View */}
      <div className="w-full">
        {activeTab === "OVERVIEW" && (
          <CryptoOverviewTab
            markets={overviewMarkets}
            selectedUnderlying={selectedUnderlying}
            onSelectUnderlying={setSelectedUnderlying}
            onNavigateTab={setActiveTab}
            onOpenTradeDrawer={openTradeDrawer}
            isLoading={isOverviewLoading}
          />
        )}

        {activeTab === "FUTURES" && (
          <CryptoFuturesTab
            contracts={futuresContracts}
            selectedUnderlying={selectedUnderlying}
            onOpenTradeDrawer={openTradeDrawer}
            isLoading={isFuturesLoading}
          />
        )}

        {activeTab === "OPTIONS" && (
          <CryptoOptionsTab
            chainData={chainData}
            availableExpiries={availableExpiries}
            selectedExpiry={selectedExpiry}
            onSelectExpiry={setSelectedExpiry}
            selectedUnderlying={selectedUnderlying}
            complexityMode={complexityMode}
            onOpenTradeDrawer={openTradeDrawer}
            isLoading={isChainLoading}
          />
        )}

        {activeTab === "STRATEGIES" && (
          <CryptoStrategiesTab
            selectedUnderlying={selectedUnderlying}
            onOpenBuilder={openStrategyBuilder}
          />
        )}
      </div>

      {/* 4. Filtered Crypto Positions & Orders Bar */}
      <CryptoPositionsBar
        positions={positions}
        orders={orders}
        totalUnrealizedPnl={totalUnrealizedPnl}
        totalMarginUsed={totalMarginUsed}
        complexityMode={complexityMode}
        onOpenPositionsDrawer={() => setPositionsDrawerOpen(true)}
      />

      {/* 5. Drawers */}
      <CryptoQuickTradeDrawer
        isOpen={tradeDrawerOpen}
        contract={selectedTradeContract}
        initialSide={tradeSide}
        onClose={closeTradeDrawer}
        onTradeExecuted={handleManualRefresh}
      />

      <CryptoDiagnosticsDrawer
        isOpen={diagnosticsDrawerOpen}
        diagnostics={providerDiagnostics}
        onClose={() => setDiagnosticsDrawerOpen(false)}
      />

      <CryptoStrategyBuilderDrawer
        isOpen={strategyDrawerOpen}
        template={selectedStrategyTemplate}
        selectedUnderlying={selectedUnderlying}
        onClose={() => setStrategyDrawerOpen(false)}
      />
    </div>
  );
}
