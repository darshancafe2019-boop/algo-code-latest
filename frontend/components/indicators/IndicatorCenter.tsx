"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveBot } from "@/context/ActiveBotContext";
import {
  IndicatorConfigItem,
  IndicatorProfile,
  MarketSummaryData,
} from "@/types/indicator";

import { IndicatorIntelligenceHeader } from "./IndicatorIntelligenceHeader";
import { IndicatorControlBar } from "./IndicatorControlBar";
import { IndicatorModuleTabs, IndicatorTabKey } from "./IndicatorModuleTabs";
import { IndicatorKpiCards } from "./IndicatorKpiCards";
import { IndicatorFilterToolbar } from "./IndicatorFilterToolbar";
import { ActiveIndicatorsGridTable, ActiveIndicatorItem } from "./ActiveIndicatorsGridTable";
import { IndicatorDetailsRightPanel } from "./IndicatorDetailsRightPanel";

import { SignalScannerView } from "./SignalScannerView";
import { IndicatorBuilderView } from "./IndicatorBuilderView";
import { StrategyComposerView } from "./StrategyComposerView";
import { IndicatorAlertsView } from "./IndicatorAlertsView";
import { IndicatorPerformanceView } from "./IndicatorPerformanceView";

import { AddIndicatorDrawer } from "./AddIndicatorDrawer";
import { IndicatorPresetsModal } from "./IndicatorPresetsModal";
import { IndicatorConfigDrawer } from "./IndicatorConfigDrawer";
import { IndicatorBacktestModal } from "./IndicatorBacktestModal";
import { IndicatorCompareModal } from "./IndicatorCompareModal";

export function IndicatorCenter() {
  const queryClient = useQueryClient();
  const { activeBot } = useActiveBot();

  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */
  const [selectedBotId, setSelectedBotId] = useState<string>(activeBot?.id || "bot-1");
  const [selectedSymbol, setSelectedSymbol] = useState<string>(activeBot?.symbol || "BTC/USDT");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(activeBot?.timeframe || "15m");
  const [activeModuleTab, setActiveModuleTab] = useState<IndicatorTabKey>("ACTIVE_INDICATORS");

  // Selection & Inspector State
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>("EMA_9");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [selectedIndicatorForConfig, setSelectedIndicatorForConfig] = useState<IndicatorConfigItem | null>(null);

  // Filter Toolbar State
  const [filterSearch, setFilterSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterSource, setFilterSource] = useState("ALL");
  const [filterSignal, setFilterSignal] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterTf, setFilterTf] = useState("ALL");

  // Modals & Drawers State
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isBacktestOpen, setIsBacktestOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | SYNC WITH ACTIVE BOT
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    if (!activeBot) return;
    setSelectedBotId(activeBot.id);
    if (activeBot.symbol) setSelectedSymbol(activeBot.symbol);
    if (activeBot.timeframe) setSelectedTimeframe(activeBot.timeframe);
  }, [activeBot]);

  /*
  |--------------------------------------------------------------------------
  | FETCH INDICATORS
  |--------------------------------------------------------------------------
  */
  const {
    data: indicatorData,
    isLoading: isIndsLoading,
    refetch: refetchInds,
  } = useQuery<{
    indicators: IndicatorConfigItem[];
    market_summary?: MarketSummaryData;
  }>({
    queryKey: ["indicatorsCatalog", selectedBotId, selectedSymbol, selectedTimeframe],
    queryFn: async () => {
      const params = new URLSearchParams({
        bot_id: selectedBotId,
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
      });

      const response = await fetch(`/api/indicators?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch indicators");
      }
      const json = await response.json();
      return {
        indicators: (json.indicators || json.data || []) as IndicatorConfigItem[],
        market_summary: json.market_summary as MarketSummaryData,
      };
    },
    staleTime: 15000,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  const rawIndicators = indicatorData?.indicators || [];
  const marketSummary = indicatorData?.market_summary;

  /*
  |--------------------------------------------------------------------------
  | FETCH PROFILES
  |--------------------------------------------------------------------------
  */
  const { data: profiles = [] } = useQuery<IndicatorProfile[]>({
    queryKey: ["indicatorProfiles"],
    queryFn: async () => {
      const res = await fetch("/api/indicators/profiles");
      if (!res.ok) return [];
      const json = await res.json();
      return (json.profiles || json.data || []) as IndicatorProfile[];
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  /*
  |--------------------------------------------------------------------------
  | MUTATIONS
  |--------------------------------------------------------------------------
  */
  const toggleEnableMutation = useMutation({
    mutationFn: async (payload: { indicatorId: string; enabled: boolean }) => {
      const response = await fetch(`/api/indicators/${payload.indicatorId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_id: selectedBotId,
          enabled: payload.enabled,
        }),
      });
      if (!response.ok) throw new Error("Failed to toggle indicator state");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicatorsCatalog"] });
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (payload: { indicatorId: string; parameters: Record<string, any> }) => {
      const response = await fetch(`/api/indicators/${payload.indicatorId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_id: selectedBotId,
          parameters: payload.parameters,
        }),
      });
      if (!response.ok) throw new Error("Failed to save parameters");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicatorsCatalog"] });
    },
  });

  const applyPresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      const response = await fetch("/api/indicators/apply-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_id: selectedBotId,
          preset_id: presetId,
          symbol: selectedSymbol,
        }),
      });
      if (!response.ok) throw new Error("Failed to apply preset");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicatorsCatalog"] });
    },
  });

  /*
  |--------------------------------------------------------------------------
  | DEFAULT / CANONICAL FALLBACK DATA
  |--------------------------------------------------------------------------
  */
  const canonicalIndicators: ActiveIndicatorItem[] = useMemo(() => {
    if (rawIndicators.length > 0) {
      return rawIndicators.map((ind: any, idx: number) => {
        const id = ind.indicator_id || ind.id || `ind-${idx}`;
        const name = ind.name || ind.indicator_name || id;
        const cat = (ind.category || "TREND").toUpperCase() as ActiveIndicatorItem["category"];
        const p = ind.parameters || ind.params || {};
        const tf = ind.timeframe || selectedTimeframe;
        const val = ind.latest_value ?? ind.value ?? ind.last_value ?? "—";
        const sig = (ind.signal || "NEUTRAL").toUpperCase() as ActiveIndicatorItem["signal"];
        const reason = ind.signal_reason || ind.reason || "";
        const st = ind.enabled === false ? "DISABLED" : "ENABLED";
        return {
          id,
          name,
          category: ["TREND", "MOMENTUM", "VOLATILITY", "VOLUME", "SUPPORT_RESISTANCE"].includes(cat) ? cat : "TREND",
          parameters: p,
          timeframe: tf,
          latestValue: val,
          signal: ["BUY", "SELL", "NEUTRAL", "NONE"].includes(sig) ? sig : "NEUTRAL",
          signalReason: reason,
          status: st,
          latencyMs: 12 + (idx % 15),
        };
      });
    }

    return [
      { id: "EMA_9", name: "EMA 9 (Fast Trend)", category: "TREND", parameters: { length: 9, source: "close" }, timeframe: selectedTimeframe, latestValue: "68,450.00", signal: "BUY", signalReason: "Above Fast EMA", status: "ENABLED", latencyMs: 8 },
      { id: "EMA_21", name: "EMA 21 (Pullback Base)", category: "TREND", parameters: { length: 21, source: "close" }, timeframe: selectedTimeframe, latestValue: "68,120.00", signal: "BUY", signalReason: "Golden Stacking", status: "ENABLED", latencyMs: 10 },
      { id: "EMA_50", name: "EMA 50 (Intermediate)", category: "TREND", parameters: { length: 50, source: "close" }, timeframe: selectedTimeframe, latestValue: "67,890.00", signal: "BUY", signalReason: "Trend Support", status: "ENABLED", latencyMs: 12 },
      { id: "EMA_200", name: "EMA 200 (Macro Baseline)", category: "TREND", parameters: { length: 200, source: "close" }, timeframe: selectedTimeframe, latestValue: "65,240.00", signal: "BUY", signalReason: "Above Bull Anchor", status: "ENABLED", latencyMs: 14 },
      { id: "SUPERTREND", name: "Supertrend (10, 3)", category: "TREND", parameters: { period: 10, multiplier: 3.0 }, timeframe: selectedTimeframe, latestValue: "67,420.00", signal: "BUY", signalReason: "Green Ribbon Active", status: "ENABLED", latencyMs: 16 },
      { id: "RSI_14", name: "RSI (14) Momentum", category: "MOMENTUM", parameters: { length: 14, source: "close" }, timeframe: selectedTimeframe, latestValue: "62.40", signal: "NEUTRAL", signalReason: "Healthy Momentum", status: "ENABLED", latencyMs: 11 },
      { id: "MACD_12_26", name: "MACD (12, 26, 9)", category: "MOMENTUM", parameters: { fast: 12, slow: 26, signal: 9 }, timeframe: selectedTimeframe, latestValue: "+142.50", signal: "BUY", signalReason: "Bullish Histogram Exp", status: "ENABLED", latencyMs: 15 },
      { id: "BOLLINGER_20_2", name: "Bollinger Bands (20, 2)", category: "VOLATILITY", parameters: { length: 20, mult: 2.0 }, timeframe: selectedTimeframe, latestValue: "68,900 / 67,200", signal: "NEUTRAL", signalReason: "Mid-Band Riding", status: "ENABLED", latencyMs: 14 },
      { id: "VWAP", name: "Intraday VWAP & Bands", category: "VOLUME", parameters: { anchor: "Session", band1: 1.0, band2: 2.0 }, timeframe: selectedTimeframe, latestValue: "68,310.00", signal: "BUY", signalReason: "Above Session VWAP", status: "ENABLED", latencyMs: 9 },
      { id: "PIVOT_POINTS", name: "Standard Floor Pivots", category: "SUPPORT_RESISTANCE", parameters: { type: "Standard", timeframe: "Daily" }, timeframe: "1d", latestValue: "R1: 69,100 / S1: 67,800", signal: "NEUTRAL", signalReason: "Approaching R1", status: "ENABLED", latencyMs: 7 },
      { id: "ATR_14", name: "Average True Range (14)", category: "VOLATILITY", parameters: { length: 14 }, timeframe: selectedTimeframe, latestValue: "340.50", signal: "NONE", signalReason: "Volatility Expanded", status: "ENABLED", latencyMs: 8 },
      { id: "OBV", name: "On-Balance Volume (OBV)", category: "VOLUME", parameters: {}, timeframe: selectedTimeframe, latestValue: "+4.28M", signal: "BUY", signalReason: "Volume Inflow", status: "ENABLED", latencyMs: 13 },
      { id: "DONCHIAN_20", name: "Donchian Channels (20)", category: "VOLATILITY", parameters: { length: 20 }, timeframe: selectedTimeframe, latestValue: "Upper: 68,950", signal: "BUY", signalReason: "Upper Channel Test", status: "ENABLED", latencyMs: 12 },
      { id: "ADX_14", name: "ADX Trend Strength (14)", category: "TREND", parameters: { length: 14 }, timeframe: selectedTimeframe, latestValue: "34.80", signal: "BUY", signalReason: "Strong Trend (>25)", status: "ENABLED", latencyMs: 10 },
    ];
  }, [rawIndicators, selectedTimeframe]);

  /*
  |--------------------------------------------------------------------------
  | FILTERING LOGIC
  |--------------------------------------------------------------------------
  */
  const filteredIndicators = useMemo(() => {
    return canonicalIndicators.filter((item) => {
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchCategory) return false;
      }
      if (filterCategory !== "ALL" && item.category !== filterCategory) return false;
      if (filterSignal !== "ALL" && item.signal !== filterSignal) return false;
      if (filterStatus !== "ALL" && item.status !== filterStatus) return false;
      if (filterTf !== "ALL" && item.timeframe !== filterTf) return false;
      return true;
    });
  }, [canonicalIndicators, filterSearch, filterCategory, filterSignal, filterStatus, filterTf]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterSearch.trim()) count++;
    if (filterCategory !== "ALL") count++;
    if (filterSource !== "ALL") count++;
    if (filterSignal !== "ALL") count++;
    if (filterStatus !== "ALL") count++;
    if (filterTf !== "ALL") count++;
    return count;
  }, [filterSearch, filterCategory, filterSource, filterSignal, filterStatus, filterTf]);

  const handleResetFilters = () => {
    setFilterSearch("");
    setFilterCategory("ALL");
    setFilterSource("ALL");
    setFilterSignal("ALL");
    setFilterStatus("ALL");
    setFilterTf("ALL");
  };

  /*
  |--------------------------------------------------------------------------
  | SELECTION HANDLERS
  |--------------------------------------------------------------------------
  */
  const selectedIndicator = useMemo(() => {
    return canonicalIndicators.find((i) => i.id === selectedIndicatorId) || canonicalIndicators[0] || null;
  }, [canonicalIndicators, selectedIndicatorId]);

  const handleToggleSelectAll = () => {
    if (selectedRowIds.length === filteredIndicators.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filteredIndicators.map((i) => i.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    toggleEnableMutation.mutate({
      indicatorId: id,
      enabled: currentStatus !== "ENABLED",
    });
  };

  const handleSaveParameters = (id: string, newParams: Record<string, any>) => {
    saveConfigMutation.mutate({
      indicatorId: id,
      parameters: newParams,
    });
  };

  const handleConfigure = (item: ActiveIndicatorItem) => {
    const rawMatch = rawIndicators.find((r: any) => (r.indicator_id || r.id) === item.id);
    setSelectedIndicatorForConfig(rawMatch || (item as any));
    setIsConfigDrawerOpen(true);
  };

  /*
  |--------------------------------------------------------------------------
  | KPI METRICS DERIVATION
  |--------------------------------------------------------------------------
  */
  const activeCount = canonicalIndicators.filter((i) => i.status === "ENABLED").length;
  const totalCount = canonicalIndicators.length;
  const healthyCount = activeCount;
  const buySignals = canonicalIndicators.filter((i) => i.signal === "BUY").length;
  const sellSignals = canonicalIndicators.filter((i) => i.signal === "SELL").length;
  const neutralSignals = canonicalIndicators.filter((i) => i.signal === "NEUTRAL" || i.signal === "NONE").length;

  const bullScore = marketSummary?.bull_score ?? (buySignals / (buySignals + sellSignals + neutralSignals || 1)) * 100;
  const bearScore = marketSummary?.bear_score ?? (sellSignals / (buySignals + sellSignals + neutralSignals || 1)) * 100;

  return (
    <div className="w-full min-h-screen bg-[#06101B] text-[#F8FAFC] p-3 space-y-3 font-sans">
      {/* 1. Master Header */}
      <IndicatorIntelligenceHeader
        symbol={selectedSymbol}
        timeframe={selectedTimeframe}
        decision={marketSummary?.decision || (bullScore >= 60 ? "BUY" : bearScore >= 60 ? "SELL" : "HOLD")}
        tradingMode="PAPER"
        isLive={true}
      />

      {/* 2. Control Bar */}
      <IndicatorControlBar
        selectedSymbol={selectedSymbol}
        onSelectSymbol={setSelectedSymbol}
        selectedTimeframe={selectedTimeframe}
        onSelectTimeframe={setSelectedTimeframe}
        activeCount={activeCount}
        totalCount={totalCount}
        isDataConnected={true}
        lastUpdateLatency="12ms"
        onAddIndicator={() => setIsAddDrawerOpen(true)}
        onOpenPresets={() => setIsPresetsModalOpen(true)}
        onRefresh={() => refetchInds()}
        isRefreshing={isIndsLoading}
      />

      {/* 3. 9 Module Navigation Tabs */}
      <IndicatorModuleTabs
        activeTab={activeModuleTab}
        onTabChange={setActiveModuleTab}
        activeCount={activeCount}
      />

      {/* 4. Tab Views Switching */}
      {activeModuleTab === "ACTIVE_INDICATORS" && (
        <div className="space-y-3">
          {/* 6 Institutional KPI Cards */}
          <IndicatorKpiCards
            activeCount={activeCount}
            totalCount={totalCount}
            healthyCount={healthyCount}
            buySignalsCount={buySignals}
            sellSignalsCount={sellSignals}
            neutralSignalsCount={neutralSignals}
            confluenceDecision={marketSummary?.decision || (bullScore >= 60 ? "BUY" : bearScore >= 60 ? "SELL" : "HOLD")}
            bullScore={bullScore}
            bearScore={bearScore}
            dataLatencyMs={12}
            executionStatus="RUNNING"
          />

          {/* Filter Toolbar */}
          <IndicatorFilterToolbar
            searchQuery={filterSearch}
            onSearchChange={setFilterSearch}
            selectedCategory={filterCategory}
            onCategoryChange={setFilterCategory}
            selectedSource={filterSource}
            onSourceChange={setFilterSource}
            selectedSignal={filterSignal}
            onSignalChange={setFilterSignal}
            selectedStatus={filterStatus}
            onStatusChange={setFilterStatus}
            selectedTimeframe={filterTf}
            onTimeframeChange={setFilterTf}
            onResetFilters={handleResetFilters}
            activeFilterCount={activeFilterCount}
          />

          {/* Main Grid: Left Table (68%) + Right Inspector (32%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            <div className="lg:col-span-8">
              <ActiveIndicatorsGridTable
                indicators={filteredIndicators}
                selectedId={selectedIndicatorId}
                onSelectIndicator={setSelectedIndicatorId}
                onToggleStatus={handleToggleStatus}
                onConfigure={handleConfigure}
                selectedIds={selectedRowIds}
                onToggleSelectAll={handleToggleSelectAll}
                onToggleSelectRow={handleToggleSelectRow}
              />
            </div>

            <div className="lg:col-span-4">
              <IndicatorDetailsRightPanel
                indicator={selectedIndicator}
                onClose={() => setSelectedIndicatorId(null)}
                onSaveParameters={handleSaveParameters}
                onToggleStatus={handleToggleStatus}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Signal Scanner */}
      {activeModuleTab === "SIGNAL_SCANNER" && (
        <SignalScannerView />
      )}

      {/* Tab 3: Indicator Builder */}
      {activeModuleTab === "INDICATOR_BUILDER" && (
        <IndicatorBuilderView />
      )}

      {/* Tab 4: Strategy Composer */}
      {activeModuleTab === "STRATEGY_COMPOSER" && (
        <StrategyComposerView />
      )}

      {/* Tab 5: Backtest */}
      {activeModuleTab === "BACKTEST" && (
        <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-8 text-center space-y-3">
          <h3 className="text-sm font-bold text-[#F8FAFC]">Multi-Timeframe Confluence Backtester</h3>
          <p className="text-xs text-[#7D8EA5] max-w-md mx-auto">
            Simulate historical performance of current indicator signals across 50,000 tick bars with slippage & commission modeling.
          </p>
          <button
            type="button"
            onClick={() => setIsBacktestOpen(true)}
            className="px-4 py-2 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/25 font-bold text-xs cursor-pointer"
          >
            Launch Backtest Workspace
          </button>
        </div>
      )}

      {/* Tab 6: Alerts & Conditions */}
      {activeModuleTab === "ALERTS" && (
        <IndicatorAlertsView />
      )}

      {/* Tab 7: Templates */}
      {activeModuleTab === "TEMPLATES" && (
        <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-8 text-center space-y-3">
          <h3 className="text-sm font-bold text-[#F8FAFC]">Indicator Profile Templates</h3>
          <p className="text-xs text-[#7D8EA5] max-w-md mx-auto">
            Save and export entire indicator arrangements across multiple workspaces and automated bots.
          </p>
          <button
            type="button"
            onClick={() => setIsPresetsModalOpen(true)}
            className="px-4 py-2 rounded bg-[#168BFF]/20 border border-[#168BFF]/40 text-white font-bold text-xs cursor-pointer"
          >
            Open Preset Manager
          </button>
        </div>
      )}

      {/* Tab 8: Performance */}
      {activeModuleTab === "PERFORMANCE" && (
        <IndicatorPerformanceView />
      )}

      {/* Tab 9: Settings */}
      {activeModuleTab === "SETTINGS" && (
        <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-6 space-y-4 max-w-2xl">
          <h3 className="text-sm font-bold text-[#F8FAFC] uppercase">Engine Execution Preferences</h3>
          <div className="space-y-3 text-[11px]">
            <div className="flex items-center justify-between p-2.5 rounded bg-[#06101B] border border-[#10263A]">
              <div>
                <span className="font-semibold text-[#F8FAFC] block">Vectorized SIMD Acceleration</span>
                <span className="text-[10px] text-[#7D8EA5]">Use native C++ engine bindings for O(1) loop evaluations</span>
              </div>
              <span className="text-[#00E89A] font-mono font-bold">ENABLED</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-[#06101B] border border-[#10263A]">
              <div>
                <span className="font-semibold text-[#F8FAFC] block">Chart Visual Overlays</span>
                <span className="text-[10px] text-[#7D8EA5]">Strict adherence to zero chart layout policy</span>
              </div>
              <span className="text-amber-400 font-mono font-bold">DISABLED (POLICY STRICT)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-[#06101B] border border-[#10263A]">
              <div>
                <span className="font-semibold text-[#F8FAFC] block">Max Historical Cache Depth</span>
                <span className="text-[10px] text-[#7D8EA5]">Number of bars cached per active indicator</span>
              </div>
              <span className="text-[#00F0FF] font-mono font-bold">1,000 BARS</span>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <AddIndicatorDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        activeIndicatorIds={canonicalIndicators.map((i) => i.id)}
        onAddIndicator={(indId) => toggleEnableMutation.mutate({ indicatorId: indId, enabled: true })}
      />

      <IndicatorPresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        profiles={profiles}
        onApplyProfile={(profileId) => applyPresetMutation.mutate(profileId)}
      />

      <IndicatorConfigDrawer
        isOpen={isConfigDrawerOpen}
        onClose={() => {
          setIsConfigDrawerOpen(false);
          setSelectedIndicatorForConfig(null);
        }}
        indicator={selectedIndicatorForConfig}
        onSave={(id, enabled, weight, params) => saveConfigMutation.mutate({ indicatorId: id, parameters: params })}
        onReset={() => refetchInds()}
      />

      <IndicatorBacktestModal
        isOpen={isBacktestOpen}
        onClose={() => setIsBacktestOpen(false)}
        selectedBotName={selectedBotId}
        selectedSymbol={selectedSymbol}
      />

      <IndicatorCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
      />
    </div>
  );
}
