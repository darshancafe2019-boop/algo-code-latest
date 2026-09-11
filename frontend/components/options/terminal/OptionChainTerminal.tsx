"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  Activity,
  BarChart2,
  Sliders,
  Send,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import {
  OptionTerminalSnapshot,
  OptionStrikeRowData,
  OptionContractQuote,
  ColumnVisibilityConfig,
  OptionFilterConfig,
  TerminalViewMode,
} from "@/types/option-terminal";

import { OptionTerminalHeader } from "./OptionTerminalHeader";
import { OptionMarketSummaryCards } from "./OptionMarketSummaryCards";
import { OptionTerminalControlBar } from "./OptionTerminalControlBar";
import { OptionChainTable } from "./OptionChainTable";
import { OptionFlowTable } from "./OptionFlowTable";
import { OptionAnalyticsPanel } from "./OptionAnalyticsPanel";
import {
  ColumnCustomizerModal,
  DEFAULT_COLUMN_CONFIG,
  GREEKS_COLUMN_CONFIG,
  SCALPING_COLUMN_CONFIG,
  FULL_COLUMN_CONFIG,
} from "./ColumnCustomizerModal";
import {
  OptionFilterModal,
  DEFAULT_FILTER_CONFIG,
} from "./OptionFilterModal";
import { SelectedOptionInspectionDrawer } from "../SelectedOptionInspectionDrawer";

interface OptionChainTerminalProps {
  initialUnderlying?: string;
  initialSource?: string;
  isSourceLocked?: boolean;
}

const STORAGE_COLUMN_CONFIG = "quantos_option_chain_columns_v2";

export const OptionChainTerminal: React.FC<OptionChainTerminalProps> = ({
  initialUnderlying = "NIFTY",
  initialSource = "DHAN",
  isSourceLocked = false,
}) => {
  const queryClient = useQueryClient();

  // Primary State
  const [underlying, setUnderlying] = useState<string>(initialUnderlying);
  const [source, setSource] = useState<string>(initialSource);
  const [environment, setEnvironment] = useState<"LIVE" | "PAPER">("PAPER");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [strikeRange, setStrikeRange] = useState<number>(20);
  const [customStrikeFrom, setCustomStrikeFrom] = useState<string>("");
  const [customStrikeTo, setCustomStrikeTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<TerminalViewMode>("STANDARD");

  // Sub-tabs
  const [terminalTab, setTerminalTab] = useState<"CHAIN" | "FLOW" | "ANALYTICS">("CHAIN");

  // Modals & Drawers
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [columnConfig, setColumnConfig] = useState<ColumnVisibilityConfig>(DEFAULT_COLUMN_CONFIG);
  const [filterConfig, setFilterConfig] = useState<OptionFilterConfig>(DEFAULT_FILTER_CONFIG);

  // Selected Option for Inspection Drawer
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [selectedOptionType, setSelectedOptionType] = useState<"CE" | "PE" | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<OptionContractQuote | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ status: "success" | "error" | "warn"; message: string } | null>(null);

  // Load Saved Column Configuration from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COLUMN_CONFIG);
      if (saved) {
        setColumnConfig(JSON.parse(saved));
      }
    } catch {
      // Storage unavailable or blocked
    }
  }, []);

  const handleUpdateColumnConfig = (newCfg: ColumnVisibilityConfig) => {
    setColumnConfig(newCfg);
    try {
      localStorage.setItem(STORAGE_COLUMN_CONFIG, JSON.stringify(newCfg));
    } catch {}
  };

  // Sync viewMode changes to column configuration
  const handleViewModeChange = (mode: TerminalViewMode) => {
    setViewMode(mode);
    if (mode === "GREEKS") {
      handleUpdateColumnConfig(GREEKS_COLUMN_CONFIG);
    } else if (mode === "COMPACT") {
      handleUpdateColumnConfig(SCALPING_COLUMN_CONFIG);
    } else if (mode === "FULL") {
      handleUpdateColumnConfig(FULL_COLUMN_CONFIG);
    } else {
      handleUpdateColumnConfig(DEFAULT_COLUMN_CONFIG);
    }
  };

  // 1. Fetch Terminal Snapshot & Option Flow Data
  const { data: snapshotData, isLoading, isFetching, refetch } = useQuery<{ success: boolean; data: OptionTerminalSnapshot }>({
    queryKey: ["optionTerminalSnapshot", underlying, source, selectedExpiry, strikeRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        underlying,
        provider: source,
        strike_count: strikeRange.toString(),
      });
      if (selectedExpiry) params.append("expiry", selectedExpiry);

      const res = await apiClient.get<any>(`/api/options/flow?${params.toString()}`, { timeoutMs: 6000 });
      if (!res.ok || !res.data) {
        throw new Error(res.error?.message || "Failed to load option chain snapshot");
      }
      return res.data;
    },
    staleTime: 3000,
    refetchInterval: () => (apiClient.isOffline() ? false : 5000),
    retry: 1,
  });

  const snapshot = snapshotData?.data || null;
  const isCrypto = ["BTC", "ETH", "SOL", "XRP"].includes(underlying);
  const currency = isCrypto ? "$" : "₹";

  const rawStrikes = useMemo(() => snapshot?.strikes || [], [snapshot?.strikes]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterConfig.moneyness !== "ALL") count++;
    if (filterConfig.buildup !== "ALL") count++;
    if (filterConfig.sentiment !== "ALL") count++;
    if (filterConfig.unusualOnly) count++;
    if (filterConfig.minVolume > 0) count++;
    if (filterConfig.minOI > 0) count++;
    return count;
  }, [filterConfig]);

  // Filtered Strikes calculation
  const displayedStrikes = useMemo(() => {
    return rawStrikes.filter((row) => {
      // 1. Search Query filter
      if (searchQuery) {
        const q = searchQuery.trim();
        if (!row.strike.toString().includes(q)) return false;
      }

      // 2. Custom Strike From/To filter
      if (customStrikeFrom) {
        const from = parseFloat(customStrikeFrom);
        if (!isNaN(from) && row.strike < from) return false;
      }
      if (customStrikeTo) {
        const to = parseFloat(customStrikeTo);
        if (!isNaN(to) && row.strike > to) return false;
      }

      // 3. Moneyness filter
      if (filterConfig.moneyness === "ITM_ONLY") {
        if (row.moneynessCall !== "ITM" && row.moneynessPut !== "ITM") return false;
      } else if (filterConfig.moneyness === "ATM_ONLY") {
        if (!row.isATM) return false;
      } else if (filterConfig.moneyness === "OTM_ONLY") {
        if (row.moneynessCall !== "OTM" && row.moneynessPut !== "OTM") return false;
      }

      // 4. Buildup filter
      if (filterConfig.buildup !== "ALL") {
        const callMatch = row.call?.oiBuildup === filterConfig.buildup;
        const putMatch = row.put?.oiBuildup === filterConfig.buildup;
        if (!callMatch && !putMatch) return false;
      }

      // 5. Min Volume & Min OI
      if (filterConfig.minVolume > 0) {
        const vol = Math.max(row.call?.volume || 0, row.put?.volume || 0);
        if (vol < filterConfig.minVolume) return false;
      }
      if (filterConfig.minOI > 0) {
        const oi = Math.max(row.call?.oi || 0, row.put?.oi || 0);
        if (oi < filterConfig.minOI) return false;
      }

      return true;
    });
  }, [rawStrikes, searchQuery, customStrikeFrom, customStrikeTo, filterConfig]);

  // Order Execution Mutation
  const singleOptionMutation = useMutation({
    mutationFn: async ({
      side,
      lots,
      strike,
      type,
      price,
    }: {
      side: "BUY" | "SELL";
      lots: number;
      strike: number;
      type: "CE" | "PE";
      price: number;
    }) => {
      const lotSize = underlying.includes("NIFTY") ? 50 : underlying.includes("BANKNIFTY") ? 15 : 1;
      const clientOrderId = `OPT_ORD_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const payload = {
        client_order_id: clientOrderId,
        symbol: `${underlying} ${strike} ${type}`,
        direction: side === "BUY" ? "LONG" : "SHORT",
        order_type: "MARKET",
        quantity: lots * lotSize,
        price,
        mode: environment,
        bot_id: "bot-1",
        provider: selectedQuote?.provider || source,
        broker_account_id: selectedQuote?.brokerAccountId || "ba_dhan_primary",
        instrument_id: selectedQuote?.instrumentId,
      };

      const res = await fetch("/api/quick-trade/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to route option order");
      return res.json();
    },
    onSuccess: (_, variables) => {
      setFeedback({
        status: "success",
        message: `Option Order Dispatched (${environment}): ${variables.side} ${variables.lots} Lots ${underlying} ${variables.strike} ${variables.type} @ ${currency}${variables.price.toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["optionsPositions"] });
      queryClient.invalidateQueries({ queryKey: ["optionsOrders"] });
    },
    onError: (err: Error) => {
      setFeedback({
        status: "error",
        message: `Order Execution Blocked: ${err.message}`,
      });
    },
  });

  return (
    <div className="flex flex-col gap-3 text-slate-100 font-sans w-full max-w-[1700px] mx-auto min-w-0">
      {/* 1. TOP HEADER */}
      <OptionTerminalHeader
        underlying={underlying}
        onChangeUnderlying={(u) => {
          setUnderlying(u);
          setSelectedExpiry("");
          if (["BTC", "ETH", "SOL", "XRP"].includes(u)) {
            setSource("DELTA_INDIA");
          } else if (source === "DELTA_INDIA" || source === "BINANCE") {
            setSource("DHAN");
          }
        }}
        spotPrice={snapshot?.spotPrice || 25420.0}
        spotChange={snapshot?.spotChange || 128.4}
        spotChangePercent={snapshot?.spotChangePercent || 0.51}
        marketStatus={snapshot?.marketStatus || "OPEN"}
        selectedExpiry={snapshot?.selectedExpiry || selectedExpiry}
        onChangeExpiry={(exp) => setSelectedExpiry(exp)}
        availableExpiries={snapshot?.availableExpiries || []}
        source={source}
        onChangeSource={(s) => !isSourceLocked && setSource(s)}
        isSourceLocked={isSourceLocked}
        environment={environment}
        onChangeEnvironment={(env) => setEnvironment(env)}
        freshnessStatus={snapshot?.freshnessStatus || "LIVE"}
        dataAgeMs={snapshot?.dataAgeMs || 100}
        latencyMs={snapshot?.latencyMs || 16}
        isFetching={isFetching}
        onRefresh={() => refetch()}
      />

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 shadow-lg ${
            feedback.status === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : feedback.status === "warn"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.status === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 2. MARKET SUMMARY CARDS */}
      <OptionMarketSummaryCards snapshot={snapshot} currency={currency} />

      {/* 3. WORKSTATION SUB-TABS (Option Chain / Options Flow / Analytics) */}
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[#090E17] border border-slate-800/90 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-0">
          {[
            { id: "CHAIN", label: "Option Chain Ladder", icon: Layers },
            { id: "FLOW", label: `Options Order Flow (${snapshot?.flowTrades?.length || 0})`, icon: Activity },
            { id: "ANALYTICS", label: "Derivatives Analytics & Heatmap", icon: BarChart2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = terminalTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTerminalTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex-shrink-0 ${
                  isActive
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center pr-1 flex-shrink-0 text-slate-400 font-mono text-[11px]">
          Underlying: <strong className="text-cyan-300 ml-1">{underlying}</strong>
        </div>
      </div>

      {/* 4. TAB VIEW RENDERING */}
      {terminalTab === "CHAIN" && (
        <div className="space-y-3">
          {/* High-density Control Bar */}
          <OptionTerminalControlBar
            strikeRange={strikeRange}
            onChangeStrikeRange={(r) => setStrikeRange(r)}
            customStrikeFrom={customStrikeFrom}
            customStrikeTo={customStrikeTo}
            onChangeCustomFrom={(f) => setCustomStrikeFrom(f)}
            onChangeCustomTo={(t) => setCustomStrikeTo(t)}
            viewMode={viewMode}
            onChangeViewMode={handleViewModeChange}
            onOpenColumnCustomizer={() => setIsColumnModalOpen(true)}
            onOpenFilterModal={() => setIsFilterModalOpen(true)}
            activeFilterCount={activeFilterCount}
            searchQuery={searchQuery}
            onChangeSearchQuery={(q) => setSearchQuery(q)}
            totalStrikesCount={rawStrikes.length}
            displayedStrikesCount={displayedStrikes.length}
          />

          {/* Main Option Chain Table */}
          <OptionChainTable
            strikes={displayedStrikes}
            spotPrice={snapshot?.spotPrice || 25420.0}
            atmStrike={snapshot?.atmStrike || 25400}
            currency={currency}
            columnConfig={columnConfig}
            selectedStrike={selectedStrike}
            selectedOptionType={selectedOptionType}
            onSelectOption={(k, type, quote) => {
              setSelectedStrike(k);
              setSelectedOptionType(type);
              setSelectedQuote(quote);
              setIsDrawerOpen(true);
            }}
            onQuickTrade={(k, type, side, ltp) => {
              singleOptionMutation.mutate({ side, lots: 1, strike: k, type, price: ltp });
            }}
          />
        </div>
      )}

      {terminalTab === "FLOW" && (
        <OptionFlowTable
          flowTrades={snapshot?.flowTrades || []}
          currency={currency}
          onSelectTrade={(t) => {
            setSelectedStrike(t.strike);
            setSelectedOptionType(t.optionType as any);
            setIsDrawerOpen(true);
          }}
        />
      )}

      {terminalTab === "ANALYTICS" && snapshot && (
        <OptionAnalyticsPanel snapshot={snapshot} currency={currency} />
      )}

      {/* Column Customizer Modal */}
      <ColumnCustomizerModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        config={columnConfig}
        onChangeConfig={handleUpdateColumnConfig}
      />

      {/* Instant Filter Modal */}
      <OptionFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filterConfig}
        onChangeFilters={(f) => setFilterConfig(f)}
        onResetFilters={() => setFilterConfig(DEFAULT_FILTER_CONFIG)}
      />

      {/* Selected Option Inspection Drawer & Order Ticket */}
      {isDrawerOpen && selectedStrike && selectedOptionType && selectedQuote && (
        <SelectedOptionInspectionDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          underlying={underlying}
          spotPrice={snapshot?.spotPrice || 25420.0}
          strike={selectedStrike}
          optionType={selectedOptionType}
          quote={selectedQuote as any}
          expiry={snapshot?.selectedExpiry || selectedExpiry}
          currency={currency}
          onExecuteOrder={(side, lots) => {
            singleOptionMutation.mutate({
              side,
              lots,
              strike: selectedStrike,
              type: selectedOptionType,
              price: selectedQuote.ltp || 0,
            });
            setIsDrawerOpen(false);
          }}
        />
      )}
    </div>
  );
};
