"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  Activity,
  Zap,
  Shield,
  BarChart2,
  RefreshCw,
  Send,
  Sliders,
  Bookmark,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Plus,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { OptionChainData, OptionContractQuote, MultiLegPayoff, OptionSource } from "@/types/option-chain";

// Sleek Redesigned Options Gateway Components
import { OptionsProviderHealthStrip } from "@/components/options/OptionsProviderHealthStrip";
import { OptionsGatewayControlBar } from "@/components/options/OptionsGatewayControlBar";
import { OptionsCompactMetricsBar } from "@/components/options/OptionsCompactMetricsBar";
import { SimpleLiveOptionChainTable } from "@/components/options/SimpleLiveOptionChainTable";
import { OptionsAdvancedCollapsible } from "@/components/options/OptionsAdvancedCollapsible";
import { SelectedOptionInspectionDrawer } from "@/components/options/SelectedOptionInspectionDrawer";

// Additional Sub-tab Views
import { OptionsGreeksView } from "./OptionsGreeksView";
import { OptionsFlowView } from "./OptionsFlowView";
import { OptionsPositionsView } from "./OptionsPositionsView";
import { OptionsOrdersView } from "./OptionsOrdersView";
import { OptionsHealthView } from "./OptionsHealthView";
import { OptionsTradingView } from "./OptionsTradingView";
import { OptionsOtherProvidersView } from "./OptionsOtherProvidersView";
import { MultiLegStrategyBuilder } from "@/components/options/MultiLegStrategyBuilder";
import { OptionRegion } from "../types/provider-registry";

export type OptionsTab =
  | "CHAIN"
  | "ANALYTICS"
  | "STRATEGIES"
  | "TRADING"
  | "PORTFOLIO"
  | "HEALTH"
  | "SAVED"
  | "PROVIDERS";

interface OptionsUniverseViewProps {
  initialSource?: OptionSource;
  initialUnderlying?: string;
  isSourceLocked?: boolean;
  initialTab?: OptionsTab;
}

const STORAGE_SAVED_CHAINS = "quantos_saved_option_chains";

export function OptionsUniverseView({
  initialSource = "DHAN",
  initialUnderlying,
  isSourceLocked = false,
  initialTab = "CHAIN",
}: OptionsUniverseViewProps) {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<OptionsTab>(initialTab);
  const [selectedSource, setSelectedSource] = useState<OptionSource>(initialSource);
  const [environment, setEnvironment] = useState<"PAPER" | "LIVE">("PAPER");

  // Underlying selection
  const defaultUnderlying =
    initialUnderlying ||
    (initialSource === "DELTA_INDIA" || initialSource === "DELTA" || initialSource === "BINANCE" ? "BTC" : "NIFTY");
  const [underlying, setUnderlying] = useState(defaultUnderlying);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [strikeRange, setStrikeRange] = useState<number>(20);
  const [moneynessFilter, setMoneynessFilter] = useState<"ALL" | "ITM" | "ATM" | "OTM">("ALL");
  const [showAdvancedColumns, setShowAdvancedColumns] = useState<boolean>(false);

  // Inspection Drawer & Trade State
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [selectedOptionType, setSelectedOptionType] = useState<"CE" | "PE" | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<OptionContractQuote | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sub-tabs
  const [portfolioSubTab, setPortfolioSubTab] = useState<"POSITIONS" | "ORDERS">("POSITIONS");
  const [analyticsSubTab, setAnalyticsSubTab] = useState<"GREEKS" | "FLOW">("GREEKS");

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ status: "success" | "error" | "warn"; message: string } | null>(null);

  // Saved Chains State
  const [savedChains, setSavedChains] = useState<any[]>([]);
  const [saveName, setSaveName] = useState("");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SAVED_CHAINS);
      if (stored) setSavedChains(JSON.parse(stored));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSaveCurrentChain = () => {
    if (!saveName.trim()) return;
    const newConfig = {
      id: `saved_${Date.now()}`,
      name: saveName.trim(),
      provider: selectedSource,
      underlying,
      expiryPreference: selectedExpiry || "Current Expiry",
      strikeRange,
      filterMoneyness: moneynessFilter,
      createdAt: new Date().toISOString(),
    };
    const updated = [newConfig, ...savedChains];
    setSavedChains(updated);
    try {
      localStorage.setItem(STORAGE_SAVED_CHAINS, JSON.stringify(updated));
    } catch {}
    setSaveName("");
    setIsSaveModalOpen(false);
    setFeedback({ status: "success", message: `Saved view "${newConfig.name}" added to watchlists.` });
  };

  const handleDeleteSaved = (id: string) => {
    const updated = savedChains.filter((c) => c.id !== id);
    setSavedChains(updated);
    try {
      localStorage.setItem(STORAGE_SAVED_CHAINS, JSON.stringify(updated));
    } catch {}
  };

  const handleLoadSaved = (saved: any) => {
    if (!isSourceLocked && saved.provider) setSelectedSource(saved.provider);
    if (saved.underlying) setUnderlying(saved.underlying);
    if (saved.strikeRange) setStrikeRange(saved.strikeRange);
    if (saved.filterMoneyness) setMoneynessFilter(saved.filterMoneyness);
    setActiveTab("CHAIN");
    setFeedback({ status: "success", message: `Loaded view: ${saved.name}` });
  };

  // 1. Fetch Option Chain Data from Central Backend Gateway
  const isCrypto = ["BTC", "ETH", "SOL", "XRP", "XAUT"].includes(underlying.toUpperCase());

  const { data, isLoading, error, refetch, isFetching } = useQuery<OptionChainData>({
    queryKey: ["unifiedOptionChain", underlying, selectedSource, environment, selectedExpiry, strikeRange],
    queryFn: async () => {
      const endpoint = "/api/options/chain";
      const params = new URLSearchParams({
        underlying,
        source: selectedSource,
        environment,
        strike_count: strikeRange.toString(),
      });
      if (selectedExpiry) params.append("expiry", selectedExpiry);

      const res = await apiClient.get<any>(`${endpoint}?${params.toString()}`, { timeoutMs: 6000 });
      if (!res.ok || !res.data) {
        throw new Error(res.error?.message || "Failed to fetch option chain data");
      }
      return res.data.data || res.data;
    },
    staleTime: 4000,
    refetchInterval: () => (apiClient.isOffline() ? false : 5000),
    retry: 1,
  });

  const spotPrice = data?.spot_price || (underlying.includes("NIFTY") ? 22500.0 : 78000.0);
  const rawCurrentExpiry = data?.selected_expiry || (data as any)?.expiry || selectedExpiry || "";
  const currentExpiry = typeof rawCurrentExpiry === "string" ? rawCurrentExpiry : (rawCurrentExpiry?.expiry_date || rawCurrentExpiry?.settlement_time || "");
  const expiriesList = data?.available_expiries || [];
  const strikesList = data?.strikes || [];

  const currencySymbol = isCrypto ? "$" : "₹";
  const stepSize = spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50;
  const atmStrike = data?.atm_strike || (Math.round(spotPrice / stepSize) * stepSize);

  // Execution Mutation
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
        price: price,
        mode: environment,
        bot_id: "bot-1",
        provider: selectedQuote?.provider || selectedSource,
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
        message: `Option Order Dispatched (${environment}): ${variables.side} ${variables.lots} Lots ${underlying} ${variables.strike} ${variables.type} @ ${currencySymbol}${variables.price.toFixed(2)}`,
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

  const sourcesMap: Record<string, OptionChainData> = data?.sources || {};

  return (
    <div className="flex flex-col gap-3 text-slate-100 font-sans w-full max-w-[1650px] mx-auto min-w-0">
      {/* 1. Top Real-Time Provider Health Strip */}
      <OptionsProviderHealthStrip
        activeProvider={selectedSource}
        onSelectProvider={(p) => {
          if (!isSourceLocked) {
            setSelectedSource(p);
            if (p === "DELTA_INDIA" || p === "BINANCE") {
              setUnderlying("BTC");
            } else if (p === "DHAN" || p === "UPSTOX") {
              setUnderlying("NIFTY");
            }
          }
        }}
      />

      {/* 2. Compact Navigation Bar */}
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[#080E1C] border border-slate-800/80 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-0">
          {[
            { id: "CHAIN", label: "Option Chain", icon: Layers },
            { id: "ANALYTICS", label: "Analytics", icon: BarChart2 },
            { id: "STRATEGIES", label: "Strategies", icon: Sliders },
            { id: "TRADING", label: "Trading", icon: Send },
            { id: "PORTFOLIO", label: "Positions & Orders", icon: Activity },
            { id: "HEALTH", label: "Health", icon: Zap },
            { id: "SAVED", label: `Saved (${savedChains.length})`, icon: Bookmark },
            { id: "PROVIDERS", label: "Providers", icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as OptionsTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex-shrink-0 ${
                  isActive
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-850"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Source indicator */}
        <div className="hidden sm:flex items-center pr-1 flex-shrink-0">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
            Active: <strong className="text-cyan-300">{selectedSource}</strong>
          </span>
        </div>
      </div>

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

      {/* 3. TAB: OPTION CHAIN (The Main Streamlined Terminal) */}
      {activeTab === "CHAIN" && (
        <div className="flex flex-col gap-3">
          {/* Central High-Density Control Bar */}
          <OptionsGatewayControlBar
            underlying={underlying}
            onChangeUnderlying={(u) => {
              setUnderlying(u);
              setSelectedExpiry("");
            }}
            selectedSource={selectedSource}
            onChangeSource={(src) => !isSourceLocked && setSelectedSource(src)}
            isSourceLocked={isSourceLocked}
            environment={environment}
            onChangeEnvironment={(env) => setEnvironment(env)}
            selectedExpiry={currentExpiry}
            onChangeExpiry={(exp) => setSelectedExpiry(exp)}
            availableExpiries={expiriesList}
            spotPrice={spotPrice}
            spotChange24h={data?.spot_change_24h || 0.45}
            strikeRange={strikeRange}
            onChangeStrikeRange={(r) => setStrikeRange(r)}
            moneynessFilter={moneynessFilter}
            onChangeMoneynessFilter={(m) => setMoneynessFilter(m)}
            showAdvancedColumns={showAdvancedColumns}
            onToggleAdvancedColumns={() => setShowAdvancedColumns(!showAdvancedColumns)}
            dataStatus={data?.freshnessStatus || data?.data_status || "LIVE"}
            latencyMs={data?.latencyMs || data?.latency_ms || 20}
            dataAgeMs={data?.dataAgeMs || 0}
            isFetching={isFetching}
            onRefresh={() => refetch()}
          />

          {/* Compact Summary Metrics Strip */}
          <OptionsCompactMetricsBar
            spotPrice={spotPrice}
            atmStrike={data?.atm_strike || atmStrike}
            maxPain={data?.max_pain}
            pcr={data?.pcr}
            atmIV={data?.atm_iv}
            callResistanceStrike={data?.call_wall}
            putSupportStrike={data?.put_wall}
            currency={currencySymbol}
            dataStatus={data?.data_status || data?.freshnessStatus || "LIVE"}
            latencyMs={data?.latency_ms || data?.latencyMs || 16}
          />

          {/* Option Chain Table (Single Source or Consolidated) */}
          {selectedSource === "ALL" && Object.entries(sourcesMap).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(sourcesMap).map(([srcKey, rawSrcData]) => {
                const srcData = rawSrcData as OptionChainData;
                const srcStrikes = srcData?.strikes || [];
                const srcProvider = srcData?.provider || srcKey;
                const srcAccount = srcData?.brokerAccountAlias || srcData?.brokerAccountId || "Primary Account";
                const srcFeed = srcData?.dataFeed || "REST";
                const srcStatus = srcData?.freshnessStatus || srcData?.status || "CONNECTED";
                const srcAge = srcData?.dataAgeMs || 0;
                const srcLat = srcData?.latencyMs || 20;

                const friendlyName =
                  srcProvider === "DHAN"
                    ? "Dhan"
                    : srcProvider === "UPSTOX"
                    ? "Upstox"
                    : srcProvider === "DELTA_INDIA"
                    ? "Delta Exchange India"
                    : srcProvider === "BINANCE"
                    ? "Binance"
                    : "Paper Simulator";

                return (
                  <div key={srcKey} className="space-y-1.5">
                    <div className="flex items-center justify-between px-2 text-xs font-mono text-slate-400">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                        {friendlyName} ({srcAccount})
                      </span>
                      <span>Feed: {srcFeed} • {srcLat}ms</span>
                    </div>
                    <SimpleLiveOptionChainTable
                      strikes={srcStrikes}
                      spotPrice={spotPrice}
                      currency={srcProvider === "DELTA_INDIA" || srcProvider === "BINANCE" ? "$" : "₹"}
                      sourceName={friendlyName}
                      brokerAccountAlias={srcAccount}
                      environment={environment}
                      dataFeed={srcFeed}
                      freshnessStatus={srcStatus}
                      dataAgeMs={srcAge}
                      latencyMs={srcLat}
                      filterMoneyness={moneynessFilter}
                      showAdvancedColumns={showAdvancedColumns}
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
                );
              })}
            </div>
          ) : (
            <SimpleLiveOptionChainTable
              strikes={strikesList}
              spotPrice={spotPrice}
              currency={currencySymbol}
              sourceName={selectedSource}
              brokerAccountAlias={data?.brokerAccountAlias || data?.brokerAccountId || "Primary Account"}
              environment={data?.environment || environment}
              dataFeed={data?.dataFeed || "REST"}
              freshnessStatus={data?.freshnessStatus || data?.data_status || "CONNECTED"}
              dataAgeMs={data?.dataAgeMs || 0}
              latencyMs={data?.latencyMs || data?.latency_ms || 20}
              filterMoneyness={moneynessFilter}
              showAdvancedColumns={showAdvancedColumns}
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
          )}

          {/* 4. Collapsible Advanced Section: Greeks, OI Heatmap, Strategies, Scanner */}
          <OptionsAdvancedCollapsible
            strikes={strikesList}
            spotPrice={spotPrice}
            atmStrike={atmStrike}
            selectedExpiry={currentExpiry}
            currency={currencySymbol}
            environment={environment}
            onSelectOption={(k, type, quote) => {
              setSelectedStrike(k);
              setSelectedOptionType(type);
              setSelectedQuote(quote);
              setIsDrawerOpen(true);
            }}
          />
        </div>
      )}

      {/* 4. TAB: ANALYTICS (Greeks & Flow) */}
      {activeTab === "ANALYTICS" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono w-fit">
            <button
              type="button"
              onClick={() => setAnalyticsSubTab("GREEKS")}
              className={`px-3 py-1.5 rounded-lg transition font-bold ${
                analyticsSubTab === "GREEKS"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Greeks & Volatility
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsSubTab("FLOW")}
              className={`px-3 py-1.5 rounded-lg transition font-bold ${
                analyticsSubTab === "FLOW"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              OI & Market Flow
            </button>
          </div>

          {analyticsSubTab === "GREEKS" ? (
            <OptionsGreeksView />
          ) : (
            <OptionsFlowView />
          )}
        </div>
      )}

      {/* 5. TAB: STRATEGIES */}
      {activeTab === "STRATEGIES" && (
        <MultiLegStrategyBuilder
          spotPrice={spotPrice}
          atmStrike={atmStrike}
          selectedExpiry={currentExpiry}
          currency={currencySymbol}
          onExecuteStrategy={(payoff) => {
            setFeedback({
              status: "success",
              message: `Multi-Leg Strategy (${environment}): ${payoff.strategy_name} (${payoff.legs.length} Legs) Net: ${currencySymbol}${payoff.net_premium.toFixed(2)}`,
            });
            queryClient.invalidateQueries({ queryKey: ["optionsPositions"] });
            queryClient.invalidateQueries({ queryKey: ["optionsOrders"] });
          }}
        />
      )}

      {/* 6. TAB: TRADING */}
      {activeTab === "TRADING" && (
        <OptionsTradingView />
      )}

      {/* 7. TAB: POSITIONS & ORDERS */}
      {activeTab === "PORTFOLIO" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono w-fit">
            <button
              type="button"
              onClick={() => setPortfolioSubTab("POSITIONS")}
              className={`px-3 py-1.5 rounded-lg transition font-bold ${
                portfolioSubTab === "POSITIONS"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Active Positions
            </button>
            <button
              type="button"
              onClick={() => setPortfolioSubTab("ORDERS")}
              className={`px-3 py-1.5 rounded-lg transition font-bold ${
                portfolioSubTab === "ORDERS"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Order Management Audit
            </button>
          </div>

          {portfolioSubTab === "POSITIONS" ? (
            <OptionsPositionsView />
          ) : (
            <OptionsOrdersView />
          )}
        </div>
      )}

      {/* 8. TAB: HEALTH */}
      {activeTab === "HEALTH" && <OptionsHealthView />}

      {/* 9. TAB: SAVED VIEWS */}
      {activeTab === "SAVED" && (
        <div className="space-y-4 font-mono text-xs">
          <div className="p-4 rounded-2xl bg-[#080E1C] border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white">Saved Option Chain Configurations</div>
              <div className="text-slate-400 text-xs">Quickly restore custom strike ranges, underlyings, and filters.</div>
            </div>
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              Save Current View
            </button>
          </div>

          {savedChains.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-500">
              No saved views yet. Click &quot;Save Current View&quot; to bookmark your favorite underlying &amp; strike settings.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedChains.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl bg-[#0A1020] border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300 text-sm">{item.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSaved(item.id)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <div>Provider: <strong className="text-white">{item.provider}</strong></div>
                    <div>Underlying: <strong className="text-white">{item.underlying}</strong></div>
                    <div>Strikes: <strong className="text-white">±{item.strikeRange / 2}</strong></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadSaved(item)}
                    className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
                  >
                    Apply View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 10. TAB: OTHER PROVIDERS */}
      {activeTab === "PROVIDERS" && <OptionsOtherProvidersView />}

      {/* Save Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs">
          <div className="bg-[#0B1224] border border-slate-700 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="text-sm font-bold text-white">Save Current Option Chain View</div>
            <div className="space-y-1">
              <label className="text-slate-400 text-[11px]">View Name:</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. NIFTY Weekly ATM Scalp"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentChain}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspection Drawer for Quote & Order Ticket */}
      {isDrawerOpen && selectedStrike && selectedOptionType && selectedQuote && (
        <SelectedOptionInspectionDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          underlying={underlying}
          spotPrice={spotPrice}
          strike={selectedStrike}
          optionType={selectedOptionType}
          quote={selectedQuote}
          expiry={currentExpiry}
          currency={currencySymbol}
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
}
