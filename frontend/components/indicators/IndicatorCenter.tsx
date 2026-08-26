"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveBot } from "@/context/ActiveBotContext";
import { IndicatorConfigItem, IndicatorProfile, MarketSummaryData } from "@/types/indicator";

import { IndicatorHeader } from "./IndicatorHeader";
import { ActiveIndicatorsTable } from "./ActiveIndicatorsTable";
import { MarketSummaryCard } from "./MarketSummaryCard";
import { IndicatorHealthCard } from "./IndicatorHealthCard";
import { AddIndicatorDrawer } from "./AddIndicatorDrawer";
import { IndicatorPresetsModal } from "./IndicatorPresetsModal";
import { IndicatorConfigDrawer } from "./IndicatorConfigDrawer";
import { AdvancedAnalysisSection } from "./AdvancedAnalysisSection";
import { IndicatorDiagnosticsPanel } from "./IndicatorDiagnosticsPanel";
import { IndicatorBacktestModal } from "./IndicatorBacktestModal";
import { IndicatorCompareModal } from "./IndicatorCompareModal";
import { X, Activity } from "lucide-react";

export function IndicatorCenter() {
  const queryClient = useQueryClient();
  const { activeBot, bots } = useActiveBot();

  const [selectedBotId, setSelectedBotId] = useState<string>(activeBot?.id || "bot-1");
  const [selectedSymbol, setSelectedSymbol] = useState<string>(activeBot?.symbol || "BTC/USDT");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(activeBot?.timeframe || "15m");

  // Modals and Drawers
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorConfigItem | null>(null);
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState<boolean>(false);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState<boolean>(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState<boolean>(false);
  const [isBacktestOpen, setIsBacktestOpen] = useState<boolean>(false);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState<boolean>(false);

  // 1. Fetch Effective Indicators for Selected Bot, Symbol & Timeframe
  const {
    data: indicatorData,
    isLoading: isIndsLoading,
    isFetching: isIndsFetching,
    refetch: refetchInds,
  } = useQuery<{ indicators: IndicatorConfigItem[]; market_summary?: MarketSummaryData }>({
    queryKey: ["indicatorsCatalog", selectedBotId, selectedSymbol, selectedTimeframe],
    queryFn: async () => {
      const res = await fetch(
        `/api/indicators?bot_id=${encodeURIComponent(selectedBotId)}&symbol=${encodeURIComponent(
          selectedSymbol
        )}&timeframe=${encodeURIComponent(selectedTimeframe)}`
      );
      if (!res.ok) throw new Error("Failed to fetch indicators");
      const json = await res.json();
      return {
        indicators: (json.indicators || json.data || []) as IndicatorConfigItem[],
        market_summary: json.market_summary as MarketSummaryData,
      };
    },
    staleTime: 3000,
    refetchInterval: 6000,
  });

  const indicators = indicatorData?.indicators || [];
  const marketSummary = indicatorData?.market_summary;

  // 2. Fetch Profiles
  const { data: profiles } = useQuery<IndicatorProfile[]>({
    queryKey: ["indicatorProfiles"],
    queryFn: async () => {
      const res = await fetch("/api/indicators/profiles");
      if (!res.ok) return [];
      const json = await res.json();
      return (json.profiles || json.data || []) as IndicatorProfile[];
    },
    staleTime: 10000,
  });

  // 3. Fetch Engine Diagnostics & Status
  const { data: indicatorStatus } = useQuery({
    queryKey: ["indicatorStatus", selectedBotId],
    queryFn: async () => {
      const res = await fetch(`/api/indicators/status?bot_id=${selectedBotId}`);
      if (!res.ok) return null;
      return await res.json();
    },
    staleTime: 3000,
    refetchInterval: 5000,
  });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const saveConfigMutation = useMutation({
    mutationFn: async (payload: {
      indicatorId: string;
      enabled: boolean;
      weight: number;
      parameters: Record<string, any>;
    }) => {
      const res = await fetch(`/api/indicators/${payload.indicatorId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_id: selectedBotId,
          enabled: payload.enabled,
          weight: payload.weight,
          parameters: payload.parameters,
        }),
      });
      if (!res.ok) throw new Error("Failed to save indicator configuration");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicatorsCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["indicatorStatus"] });
    },
  });

  const toggleEnableMutation = useMutation({
    mutationFn: async (payload: { indicatorId: string; enabled: boolean }) => {
      const target = indicators.find((i) => (i.id || i.indicator_id) === payload.indicatorId);
      const res = await fetch(`/api/indicators/${payload.indicatorId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_id: selectedBotId,
          enabled: payload.enabled,
          weight: target?.weight || 15,
          parameters: target?.parameters || {},
        }),
      });
      if (!res.ok) throw new Error("Failed to toggle indicator");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicatorsCatalog"] });
    },
  });

  const bulkEnableDisableMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const endpoint = enabled ? "/api/indicators/enable-all" : "/api/indicators/disable-all";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: selectedBotId }),
      });
      if (!res.ok) throw new Error("Failed to update indicators");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicatorsCatalog"] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (indicatorId?: string) => {
      const endpoint = indicatorId
        ? `/api/indicators/${indicatorId}/reset`
        : "/api/indicators/reset-all";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: selectedBotId }),
      });
      if (!res.ok) throw new Error("Failed to reset indicator");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicatorsCatalog"] });
    },
  });

  const applyProfileMutation = useMutation({
    mutationFn: async ({ profileId, mode }: { profileId: string; mode: "REPLACE" | "MERGE" }) => {
      const res = await fetch("/api/indicators/apply-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_id: selectedBotId,
          preset_name: profileId,
          mode: mode.toLowerCase(),
        }),
      });
      if (!res.ok) throw new Error("Failed to apply profile preset");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicatorsCatalog"] });
    },
  });

  const activeCount = indicators.filter((i) => i.enabled).length;
  const healthyCount = indicators.filter((i) => i.enabled && i.status !== "ERROR").length;
  const errorCount = indicators.filter((i) => i.enabled && i.status === "ERROR").length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 font-sans">
      {/* 1. Header with Market / Timeframe / Primary Actions */}
      <IndicatorHeader
        symbol={selectedSymbol}
        onSelectSymbol={setSelectedSymbol}
        timeframe={selectedTimeframe}
        onSelectTimeframe={setSelectedTimeframe}
        activeCount={activeCount}
        totalCount={indicators.length}
        isLive={true}
        isSyncing={isIndsFetching}
        onRefresh={() => refetchInds()}
        onOpenAddModal={() => setIsAddDrawerOpen(true)}
        onOpenPresets={() => setIsPresetsModalOpen(true)}
        onOpenBacktest={() => setIsBacktestOpen(true)}
        onOpenCompare={() => setIsCompareOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
        onEnableAll={() => bulkEnableDisableMutation.mutate(true)}
        onDisableAll={() => bulkEnableDisableMutation.mutate(false)}
        onResetAll={() => resetMutation.mutate(undefined)}
      />

      {/* 2. Active Indicators List at the Top */}
      <ActiveIndicatorsTable
        indicators={indicators}
        onConfigure={(ind) => {
          setSelectedIndicator(ind);
          setIsConfigDrawerOpen(true);
        }}
        onToggleEnable={(id, en) => toggleEnableMutation.mutate({ indicatorId: id, enabled: en })}
        onOpenAddModal={() => setIsAddDrawerOpen(true)}
        isLoading={isIndsLoading}
      />

      {/* 3. Market Summary & Health Summary in 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MarketSummaryCard summary={marketSummary} />
        </div>
        <div>
          <IndicatorHealthCard
            activeCount={activeCount}
            healthyCount={healthyCount}
            errorCount={errorCount}
            dataAgeSeconds={indicatorStatus?.diagnostics?.data_age_seconds || 0.4}
            latencyMs={indicatorStatus?.diagnostics?.avg_calc_time_ms || 1.2}
            onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
          />
        </div>
      </div>

      {/* 4. Advanced Analysis (Collapsible details: Multi-Timeframe, Diagnostics, Quantitative Lab) */}
      <AdvancedAnalysisSection
        symbol={selectedSymbol}
        onOpenBacktest={() => setIsBacktestOpen(true)}
        onOpenCompare={() => setIsCompareOpen(true)}
      />

      {/* --------------------------------------------------------------------- */}
      {/* Drawers & Modals */}
      {/* --------------------------------------------------------------------- */}

      {/* Add Indicator Drawer */}
      <AddIndicatorDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        allIndicators={indicators}
        onAddIndicator={(id) => {
          toggleEnableMutation.mutate({ indicatorId: id, enabled: true });
        }}
        isSaving={toggleEnableMutation.isPending}
      />

      {/* Preset Profiles Modal */}
      <IndicatorPresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        profiles={profiles || []}
        onApplyProfile={(profileId, mode) => {
          applyProfileMutation.mutate({ profileId, mode });
        }}
      />

      {/* Indicator Configuration Drawer */}
      <IndicatorConfigDrawer
        indicator={selectedIndicator}
        isOpen={isConfigDrawerOpen}
        onClose={() => {
          setIsConfigDrawerOpen(false);
          setSelectedIndicator(null);
        }}
        onSave={(id, enabled, weight, params) => {
          saveConfigMutation.mutate({
            indicatorId: id,
            enabled,
            weight,
            parameters: params,
          });
        }}
        onReset={(id) => resetMutation.mutate(id)}
        onDelete={(id) => toggleEnableMutation.mutate({ indicatorId: id, enabled: false })}
        isSaving={saveConfigMutation.isPending}
      />

      {/* Backtesting Modal */}
      <IndicatorBacktestModal
        isOpen={isBacktestOpen}
        onClose={() => setIsBacktestOpen(false)}
        selectedBotName={activeBot?.name || "Alpha BTC Scalper"}
        selectedSymbol={selectedSymbol}
      />

      {/* Compare Modal */}
      <IndicatorCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
      />

      {/* Diagnostics Modal */}
      {isDiagnosticsModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-[#1E293B] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#1E293B] bg-[#080D17] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-sans">
                  Indicator Engine Technical Diagnostics
                </h3>
              </div>
              <button
                onClick={() => setIsDiagnosticsModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[75vh] overflow-y-auto">
              <IndicatorDiagnosticsPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
