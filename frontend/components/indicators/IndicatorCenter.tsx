"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Filter, Layers, Sliders, RefreshCw, Cpu, CheckCircle2, Sparkles, BookOpen } from "lucide-react";
import { useActiveBot } from "@/context/ActiveBotContext";
import { IndicatorConfigItem, IndicatorProfile, IndicatorCategory } from "@/types/indicator";

import { IndicatorIntelligenceHeader } from "./IndicatorIntelligenceHeader";
import { IndicatorProfileSelector } from "./IndicatorProfileSelector";
import { MultiTimeframeIndicatorMatrix } from "./MultiTimeframeIndicatorMatrix";
import { ConfluenceScoreGauge } from "./ConfluenceScoreGauge";
import { IndicatorLibraryCard } from "./IndicatorLibraryCard";
import { IndicatorConfigDrawer } from "./IndicatorConfigDrawer";
import { IndicatorDiagnosticsPanel } from "./IndicatorDiagnosticsPanel";
import { IndicatorBacktestModal } from "./IndicatorBacktestModal";
import { IndicatorCompareModal } from "./IndicatorCompareModal";

export function IndicatorCenter() {
  const queryClient = useQueryClient();
  const { activeBot, bots, setActiveBotId } = useActiveBot();

  const [selectedBotId, setSelectedBotId] = useState<string>(activeBot?.id || "bot-1");
  const [categoryFilter, setCategoryFilter] = useState<IndicatorCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals and Drawers
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorConfigItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isBacktestOpen, setIsBacktestOpen] = useState<boolean>(false);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);

  // 1. Fetch Effective Indicators for Selected Bot
  const { data: indicators, isLoading: isIndsLoading, refetch: refetchInds } = useQuery<IndicatorConfigItem[]>({
    queryKey: ["indicatorsCatalog", selectedBotId],
    queryFn: async () => {
      const res = await fetch(`/api/indicators?bot_id=${selectedBotId}`);
      if (!res.ok) throw new Error("Failed to fetch indicators");
      const json = await res.json();
      return (json.indicators || json.data || []) as IndicatorConfigItem[];
    },
    staleTime: 3000,
  });

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
  const { data: indicatorStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["indicatorStatus", selectedBotId],
    queryFn: async () => {
      const res = await fetch(`/api/indicators/status?bot_id=${selectedBotId}`);
      if (!res.ok) return null;
      return await res.json();
    },
    staleTime: 3000,
    refetchInterval: 5000,
  });

  // Active Bot Object
  const currentBotObj = bots?.find((b) => b.id === selectedBotId) || {
    id: selectedBotId,
    name: "Alpha BTC Scalper",
    symbol: "BTC/USDT",
    exchange: "CCXT BINANCE",
    timeframe: "15m",
    execution_mode: "PAPER",
  };

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  // Save Indicator Config
  const saveMutation = useMutation({
    mutationFn: async ({
      indicatorId,
      enabled,
      weight,
      parameters,
    }: {
      indicatorId: string;
      enabled: boolean;
      weight: number;
      parameters: Record<string, any>;
    }) => {
      const res = await fetch(`/api/indicators/${indicatorId}?bot_id=${selectedBotId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicator_id: indicatorId,
          bot_id: selectedBotId,
          enabled,
          weight,
          parameters,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to save indicator configuration");
      }
      return await res.json();
    },
    onSuccess: () => {
      refetchInds();
      queryClient.invalidateQueries({ queryKey: ["indicatorsCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["indicatorStatus"] });
    },
  });

  // Toggle Enable/Disable
  const toggleEnableMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const endpoint = enabled ? `/api/indicators/${id}/enable` : `/api/indicators/${id}/disable`;
      const res = await fetch(`${endpoint}?bot_id=${selectedBotId}`, { method: "POST" });
      return await res.json();
    },
    onSuccess: () => {
      refetchInds();
      queryClient.invalidateQueries({ queryKey: ["indicatorsCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["indicatorStatus"] });
    },
  });

  // Enable All
  const enableAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/indicators/enable-all?bot_id=${selectedBotId}`, { method: "POST" });
      return await res.json();
    },
    onSuccess: () => {
      refetchInds();
      queryClient.invalidateQueries({ queryKey: ["indicatorsCatalog"] });
    },
  });

  // Disable All
  const disableAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/indicators/disable-all?bot_id=${selectedBotId}`, { method: "POST" });
      return await res.json();
    },
    onSuccess: () => {
      refetchInds();
      queryClient.invalidateQueries({ queryKey: ["indicatorsCatalog"] });
    },
  });

  // Reset Override
  const resetMutation = useMutation({
    mutationFn: async (indicatorId: string) => {
      const res = await fetch(`/api/indicators/${indicatorId}/reset?bot_id=${selectedBotId}`, {
        method: "POST",
      });
      return await res.json();
    },
    onSuccess: () => {
      refetchInds();
      queryClient.invalidateQueries({ queryKey: ["indicatorsCatalog"] });
    },
  });

  // Reset All Overrides
  const resetAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/indicators/reset-all?bot_id=${selectedBotId}`, { method: "POST" });
      return await res.json();
    },
    onSuccess: () => {
      refetchInds();
      queryClient.invalidateQueries({ queryKey: ["indicatorsCatalog"] });
    },
  });

  // Apply Profile
  const applyProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const res = await fetch(`/api/indicators/profiles/${profileId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: selectedBotId }),
      });
      return await res.json();
    },
    onSuccess: () => {
      refetchInds();
      queryClient.invalidateQueries({ queryKey: ["indicatorsCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["indicatorStatus"] });
    },
  });

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------
  const rawList = indicators || [];
  const filteredList = rawList.filter((ind) => {
    // 1. Category Filter
    if (categoryFilter !== "ALL") {
      const cat = (ind.category || "").toUpperCase();
      if (categoryFilter === "PRICE_ACTION" && !cat.includes("PRICE") && !cat.includes("ACTION")) return false;
      if (categoryFilter === "MARKET_STRUCTURE" && !cat.includes("STRUCTURE")) return false;
      if (categoryFilter !== "PRICE_ACTION" && categoryFilter !== "MARKET_STRUCTURE" && cat !== categoryFilter) {
        return false;
      }
    }

    // 2. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = ind.name?.toLowerCase().includes(q);
      const matchId = ind.indicator_id?.toLowerCase().includes(q);
      const matchCat = ind.category?.toLowerCase().includes(q);
      const matchDesc = ind.description?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchCat && !matchDesc) return false;
    }

    return true;
  });

  const categories: { key: IndicatorCategory; label: string }[] = [
    { key: "ALL", label: "ALL MODELS" },
    { key: "TREND", label: "TREND" },
    { key: "MOMENTUM", label: "MOMENTUM" },
    { key: "VOLATILITY", label: "VOLATILITY" },
    { key: "VOLUME", label: "VOLUME" },
    { key: "PRICE_ACTION", label: "PRICE ACTION" },
    { key: "MARKET_STRUCTURE", label: "STRUCTURE" },
    { key: "DERIVATIVES", label: "DERIVATIVES" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header & Bot Isolation Strip */}
      <IndicatorIntelligenceHeader
        bots={bots || []}
        selectedBotId={selectedBotId}
        onSelectBotId={(id) => {
          setSelectedBotId(id);
          setActiveBotId(id);
        }}
        activeBotData={currentBotObj}
        statusData={indicatorStatus}
        onEnableAll={() => enableAllMutation.mutate()}
        onDisableAll={() => disableAllMutation.mutate()}
        onResetAll={() => resetAllMutation.mutate()}
        onOpenBacktest={() => setIsBacktestOpen(true)}
        onOpenCompare={() => setIsCompareOpen(true)}
        isSyncing={isIndsLoading}
        onRefresh={() => {
          refetchInds();
          refetchStatus();
        }}
      />

      {/* 2. Preset Profile Selector */}
      <IndicatorProfileSelector
        profiles={profiles || []}
        selectedBotName={currentBotObj.name || selectedBotId}
        onApplyProfile={(pid) => applyProfileMutation.mutate(pid)}
        onSaveCustomProfile={() => {}}
      />

      {/* 3. Confluence & Market Regime Score */}
      <ConfluenceScoreGauge />

      {/* 4. Multi-Timeframe Matrix */}
      <MultiTimeframeIndicatorMatrix symbol={currentBotObj.symbol || "BTC/USDT"} />

      {/* 5. Calculation Engine Diagnostics */}
      <IndicatorDiagnosticsPanel />

      {/* 6. Indicator Library & Category Filter */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        {/* Title, Search, and Category Navigation */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              QUANTITATIVE INDICATOR LIBRARY
            </h2>
            <span className="text-xs font-mono text-slate-400">
              ({filteredList.length} Available)
            </span>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, category, formula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141E33] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800/80">
          {categories.map((cat) => {
            const isSelected = categoryFilter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setCategoryFilter(cat.key)}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40"
                    : "bg-[#141E33] text-slate-400 hover:text-slate-200 hover:bg-[#1A2640]"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Indicator Cards Grid */}
        {filteredList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredList.map((ind) => (
              <IndicatorLibraryCard
                key={ind.id || ind.indicator_id}
                indicator={ind}
                onConfigure={(item) => {
                  setSelectedIndicator(item);
                  setIsDrawerOpen(true);
                }}
                onToggleEnable={(id, en) => toggleEnableMutation.mutate({ id, enabled: en })}
                onResetOverride={(id) => resetMutation.mutate(id)}
                isSaving={saveMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 font-mono text-xs space-y-2">
            <div>No indicators found matching &quot;{searchQuery}&quot;.</div>
            <button
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("ALL");
              }}
              className="text-cyan-400 underline font-bold"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Slide-Out Configuration Drawer */}
      <IndicatorConfigDrawer
        indicator={selectedIndicator}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSave={(id, en, w, p) => {
          saveMutation.mutate({ indicatorId: id, enabled: en, weight: w, parameters: p });
          setIsDrawerOpen(false);
        }}
        onReset={(id) => {
          resetMutation.mutate(id);
          setIsDrawerOpen(false);
        }}
        isSaving={saveMutation.isPending}
      />

      {/* Backtest Modal */}
      <IndicatorBacktestModal
        isOpen={isBacktestOpen}
        onClose={() => setIsBacktestOpen(false)}
        selectedBotName={currentBotObj.name || selectedBotId}
        selectedSymbol={currentBotObj.symbol || "BTC/USDT"}
      />

      {/* Compare Modal */}
      <IndicatorCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
      />
    </div>
  );
}
