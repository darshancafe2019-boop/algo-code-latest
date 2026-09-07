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
  Radio,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  ExternalLink,
  ChevronDown,
  Search,
  Filter,
  TrendingUp,
  Scale,
  DollarSign,
  Grid,
  ListFilter,
  Check,
  Globe,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { OptionChainData, OptionContractQuote, MultiLegPayoff, OptionSource } from "@/types/option-chain";

// Sub-components
import { OptionsCommandHeader } from "@/components/options/OptionsCommandHeader";
import { OptionsAnalyticsSummaryBar } from "@/components/options/OptionsAnalyticsSummaryBar";
import { StrikeCenteredOptionLadderTable } from "@/components/options/StrikeCenteredOptionLadderTable";
import { OpenInterestHeatmapView } from "@/components/options/OpenInterestHeatmapView";
import { ImpliedVolatilitySkewView } from "@/components/options/ImpliedVolatilitySkewView";
import { MultiLegStrategyBuilder } from "@/components/options/MultiLegStrategyBuilder";
import { OptionsScannerView } from "@/components/options/OptionsScannerView";
import { SelectedOptionInspectionDrawer } from "@/components/options/SelectedOptionInspectionDrawer";
import { OptionsGreeksView } from "./OptionsGreeksView";
import { OptionsFlowView } from "./OptionsFlowView";
import { OptionsPositionsView } from "./OptionsPositionsView";
import { OptionsOrdersView } from "./OptionsOrdersView";
import { OptionsHealthView } from "./OptionsHealthView";
import { OptionsTradingView } from "./OptionsTradingView";
import { OptionsOtherProvidersView } from "./OptionsOtherProvidersView";
import { OPTIONS_PROVIDER_REGISTRY, OptionRegion } from "../types/provider-registry";

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
  initialSource = "ALL",
  initialUnderlying,
  isSourceLocked = false,
  initialTab = "CHAIN",
}: OptionsUniverseViewProps) {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<OptionsTab>(initialTab);
  const [selectedSource, setSelectedSource] = useState<OptionSource>(initialSource);
  const [selectedRegion, setSelectedRegion] = useState<OptionRegion>("ALL");
  const [environment, setEnvironment] = useState<"PAPER" | "SHADOW" | "LIVE">("PAPER");

  // Underlying selection
  const defaultUnderlying =
    initialUnderlying ||
    (initialSource === "DELTA_INDIA" || initialSource === "DELTA" || initialSource === "BINANCE" ? "BTC" : "NIFTY");
  const [underlying, setUnderlying] = useState(defaultUnderlying);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [strikeRange, setStrikeRange] = useState<number>(20);
  const [viewMode, setViewMode] = useState<"table" | "heatmap" | "skew" | "strategy" | "scanner">("table");
  const [moneynessFilter, setMoneynessFilter] = useState<"ALL" | "ITM" | "ATM" | "OTM">("ALL");
  const [freshOnly, setFreshOnly] = useState(false);

  // Grouped / Compare Mode
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [isGroupedView, setIsGroupedView] = useState(false);

  // Inspection Drawer & Trade State
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [selectedOptionType, setSelectedOptionType] = useState<"CE" | "PE" | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<OptionContractQuote | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  // Portfolio Subtab
  const [portfolioSubTab, setPortfolioSubTab] = useState<"POSITIONS" | "ORDERS">("POSITIONS");
  // Analytics Subtab
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
      expiryPreference: selectedExpiry || "Current Week",
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

  // 1. Fetch Option Chain Data from Unified Central Gateway
  const isCrypto = ["BTC", "ETH", "SOL", "XAUT"].includes(underlying.toUpperCase());

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
    <div className="flex flex-col gap-5 text-slate-100 font-sans">
      {/* 1. Global Command Center Tabs Navigation */}
      <div className="p-2 rounded-2xl bg-[#080E1E] border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {[
            { id: "CHAIN", label: "Option Chain", desc: "Ladder & Quotes", icon: Layers },
            { id: "ANALYTICS", label: "Analytics", desc: "Greeks & Flow", icon: BarChart2 },
            { id: "STRATEGIES", label: "Strategies", desc: "18+ Multi-Leg Presets", icon: Sliders },
            { id: "TRADING", label: "Trading", desc: "Execution & Risk", icon: Send },
            { id: "PORTFOLIO", label: "Positions & Orders", desc: "Active & OMS Audit", icon: Activity },
            { id: "HEALTH", label: "Health", desc: "Gateways & Telemetry", icon: Zap },
            { id: "SAVED", label: "Saved Views", desc: `${savedChains.length} Configured`, icon: Bookmark },
            { id: "PROVIDERS", label: "Other Providers", desc: "Modular Connectors", icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as OptionsTab)}
                className={`min-w-[125px] sm:min-w-[145px] flex items-center gap-2.5 p-2 rounded-xl transition ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-black shadow-lg shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div className="text-left leading-tight">
                  <div className="text-xs font-bold font-mono">{tab.label}</div>
                  <div className={`text-[10px] ${isActive ? "text-slate-900 font-bold" : "text-slate-500"}`}>
                    {tab.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Source Badge or Lock Indicator */}
        <div className="flex items-center gap-2 pr-2">
          {isSourceLocked ? (
            <span className="px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              LOCKED SOURCE: {selectedSource}
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              MULTI-BROKER CONSOLIDATED
            </span>
          )}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 shadow-lg ${
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
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 2. TAB: OPTION CHAIN */}
      {activeTab === "CHAIN" && (
        <div className="space-y-5">
          {/* Header Controls */}
          <OptionsCommandHeader
            underlying={underlying}
            onChangeUnderlying={(u) => {
              setUnderlying(u);
              setSelectedExpiry("");
            }}
            selectedSource={selectedSource}
            onChangeSource={(src) => !isSourceLocked && setSelectedSource(src)}
            environment={environment}
            onChangeEnvironment={(env) => setEnvironment(env)}
            selectedExpiry={currentExpiry}
            onChangeExpiry={(exp) => setSelectedExpiry(exp)}
            availableExpiries={expiriesList}
            spotPrice={spotPrice}
            spotChange24h={data?.spot_change_24h || 1.85}
            strikeRange={strikeRange}
            onChangeStrikeRange={(r) => setStrikeRange(r)}
            viewMode={viewMode}
            onChangeViewMode={(m) => setViewMode(m)}
            moneynessFilter={moneynessFilter}
            onChangeMoneynessFilter={(m) => setMoneynessFilter(m)}
            freshOnly={freshOnly}
            onChangeFreshOnly={(f) => setFreshOnly(f)}
            dataStatus={data?.freshnessStatus || data?.data_status || "LIVE"}
            latencyMs={data?.latencyMs || data?.latency_ms || 24}
            dataAgeMs={data?.dataAgeMs || 0}
            isFetching={isFetching}
            onRefresh={() => refetch()}
            onToggleDiagnostics={() => setIsDiagnosticsOpen(true)}
          />

          {/* Analytical Summary Bar */}
          <OptionsAnalyticsSummaryBar
            spotPrice={spotPrice}
            atmStrike={atmStrike}
            maxPain={data?.max_pain || atmStrike}
            pcr={
              data?.pcr || {
                pcr_oi: 1.15,
                pcr_volume: 0.94,
                total_call_oi: 1250000,
                total_put_oi: 1437500,
                total_call_volume: 450000,
                total_put_volume: 423000,
              }
            }
            atmIV={14.8}
            callResistanceStrike={atmStrike + stepSize * 2}
            putSupportStrike={atmStrike - stepSize * 2}
            currency={currencySymbol}
          />

          {/* Save View Action Toolbar */}
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Displaying {strikesList.length} strike intervals</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400 font-bold">ATM: {currencySymbol}{atmStrike.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSaveModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition"
              >
                <Bookmark className="w-3.5 h-3.5 text-purple-400" />
                Save Current View
              </button>
            </div>
          </div>

          {/* Main Option Chain Table / Visualizations */}
          {viewMode === "table" && (
            <div>
              {selectedSource === "ALL" ? (
                /* Multi-Source Mode: Render distinct segregated tables for each provider */
                <div className="space-y-6">
                  {Object.entries(sourcesMap).length > 0 ? (
                    Object.entries(sourcesMap).map(([srcKey, rawSrcData]) => {
                      const srcData = rawSrcData as OptionChainData;
                      const srcStrikes = srcData?.strikes || [];
                      const srcProvider = srcData?.provider || srcKey;
                      const srcAccount = srcData?.brokerAccountAlias || srcData?.brokerAccountId || "Primary Account";
                      const srcEnv = srcData?.environment || environment;
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
                          ? "Binance Options"
                          : "Paper Simulator";

                      return (
                        <StrikeCenteredOptionLadderTable
                          key={srcKey}
                          strikes={srcStrikes}
                          spotPrice={spotPrice}
                          currency={srcProvider === "DELTA_INDIA" || srcProvider === "BINANCE" ? "$" : "₹"}
                          sourceName={friendlyName}
                          brokerAccountAlias={srcAccount}
                          environment={srcEnv}
                          dataFeed={srcFeed}
                          freshnessStatus={srcStatus}
                          dataAgeMs={srcAge}
                          latencyMs={srcLat}
                          filterMoneyness={moneynessFilter}
                          freshOnly={freshOnly}
                          onSelectOption={(k, type, quote) => {
                            setSelectedStrike(k);
                            setSelectedOptionType(type);
                            setSelectedQuote(quote);
                            setIsDrawerOpen(true);
                          }}
                          onAddStrategyLeg={(k, type, action, ltp) => {
                            setSelectedStrike(k);
                            setSelectedOptionType(type);
                            const matched = srcStrikes.find((s) => s.strike === k);
                            setSelectedQuote(type === "CE" ? matched?.ce || null : matched?.pe || null);
                            setIsDrawerOpen(true);
                          }}
                        />
                      );
                    })
                  ) : (
                    /* Fallback to primary strikes table */
                    <StrikeCenteredOptionLadderTable
                      strikes={strikesList}
                      spotPrice={spotPrice}
                      currency={currencySymbol}
                      sourceName="Consolidated Universe"
                      brokerAccountAlias="Primary Account"
                      environment={environment}
                      dataFeed={data?.dataFeed || "REST"}
                      freshnessStatus={data?.freshnessStatus || data?.data_status || "CONNECTED"}
                      dataAgeMs={data?.dataAgeMs || 0}
                      latencyMs={data?.latencyMs || 20}
                      filterMoneyness={moneynessFilter}
                      freshOnly={freshOnly}
                      onSelectOption={(k, type, quote) => {
                        setSelectedStrike(k);
                        setSelectedOptionType(type);
                        setSelectedQuote(quote);
                        setIsDrawerOpen(true);
                      }}
                      onAddStrategyLeg={(k, type, action, ltp) => {
                        setSelectedStrike(k);
                        setSelectedOptionType(type);
                        setSelectedQuote(type === "CE" ? strikesList.find((s) => s.strike === k)?.ce || null : strikesList.find((s) => s.strike === k)?.pe || null);
                        setIsDrawerOpen(true);
                      }}
                    />
                  )}
                </div>
              ) : (
                /* Single Source Mode */
                <StrikeCenteredOptionLadderTable
                  strikes={strikesList}
                  spotPrice={spotPrice}
                  currency={currencySymbol}
                  sourceName={
                    selectedSource === "DHAN"
                      ? "Dhan"
                      : selectedSource === "UPSTOX"
                      ? "Upstox"
                      : selectedSource === "DELTA_INDIA" || selectedSource === "DELTA"
                      ? "Delta Exchange India"
                      : selectedSource === "BINANCE"
                      ? "Binance Options"
                      : "Paper Simulator"
                  }
                  brokerAccountAlias={data?.brokerAccountAlias || data?.brokerAccountId || "Primary Account"}
                  environment={data?.environment || environment}
                  dataFeed={data?.dataFeed || "REST"}
                  freshnessStatus={data?.freshnessStatus || data?.data_status || "CONNECTED"}
                  dataAgeMs={data?.dataAgeMs || 0}
                  latencyMs={data?.latencyMs || data?.latency_ms || 24}
                  filterMoneyness={moneynessFilter}
                  freshOnly={freshOnly}
                  onSelectOption={(k, type, quote) => {
                    setSelectedStrike(k);
                    setSelectedOptionType(type);
                    setSelectedQuote(quote);
                    setIsDrawerOpen(true);
                  }}
                  onAddStrategyLeg={(k, type, action, ltp) => {
                    setSelectedStrike(k);
                    setSelectedOptionType(type);
                    setSelectedQuote(type === "CE" ? strikesList.find((s) => s.strike === k)?.ce || null : strikesList.find((s) => s.strike === k)?.pe || null);
                    setIsDrawerOpen(true);
                  }}
                />
              )}
            </div>
          )}

          {viewMode === "heatmap" && (
            <OpenInterestHeatmapView
              strikes={strikesList}
              spotPrice={spotPrice}
              currency={currencySymbol}
            />
          )}

          {viewMode === "skew" && (
            <ImpliedVolatilitySkewView
              strikes={strikesList}
              spotPrice={spotPrice}
              currency={currencySymbol}
            />
          )}

          {viewMode === "strategy" && (
            <MultiLegStrategyBuilder
              spotPrice={spotPrice}
              atmStrike={atmStrike}
              selectedExpiry={currentExpiry}
              currency={currencySymbol}
              onExecuteStrategy={(payoff: MultiLegPayoff) => {
                setFeedback({
                  status: "success",
                  message: `Multi-Leg Strategy (${environment}): ${payoff.strategy_name} (${payoff.legs.length} Legs) Net: ${currencySymbol}${payoff.net_premium.toFixed(2)}`,
                });
                queryClient.invalidateQueries({ queryKey: ["optionsPositions"] });
                queryClient.invalidateQueries({ queryKey: ["optionsOrders"] });
              }}
            />
          )}

          {viewMode === "scanner" && (
            <OptionsScannerView
              strikes={strikesList}
              spotPrice={spotPrice}
              currency={currencySymbol}
              onSelectOption={(k, type, quote) => {
                setSelectedStrike(k);
                setSelectedOptionType(type);
                setSelectedQuote(quote);
                setIsDrawerOpen(true);
              }}
            />
          )}
        </div>
      )}

      {/* 3. TAB: ANALYTICS (Greeks & Volatility + OI & Market Flow) */}
      {activeTab === "ANALYTICS" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono w-fit">
            <button
              onClick={() => setAnalyticsSubTab("GREEKS")}
              className={`px-4 py-2 rounded-lg font-bold transition ${
                analyticsSubTab === "GREEKS"
                  ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Greeks & Volatility (IV Skew)
            </button>
            <button
              onClick={() => setAnalyticsSubTab("FLOW")}
              className={`px-4 py-2 rounded-lg font-bold transition ${
                analyticsSubTab === "FLOW"
                  ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Open Interest & Market Flow (PCR)
            </button>
          </div>

          {analyticsSubTab === "GREEKS" ? <OptionsGreeksView /> : <OptionsFlowView />}
        </div>
      )}

      {/* 4. TAB: STRATEGIES (18+ Multi-Leg Presets & Studio) */}
      {activeTab === "STRATEGIES" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-indigo-400" />
                QUANT.OS MULTI-LEG STRATEGY STUDIO
              </h2>
              <p className="text-xs text-slate-400">
                Parametric Spreads, Straddles, Condors, Butterflies, Collars & Custom Payoffs
              </p>
            </div>
            <div className="text-xs font-mono text-slate-300">
              Spot: <span className="text-cyan-400 font-bold">{currencySymbol}{spotPrice.toLocaleString()}</span>
            </div>
          </div>

          <MultiLegStrategyBuilder
            spotPrice={spotPrice}
            atmStrike={atmStrike}
            selectedExpiry={currentExpiry}
            currency={currencySymbol}
            onExecuteStrategy={(payoff: MultiLegPayoff) => {
              setFeedback({
                status: "success",
                message: `Strategy Order Dispatched (${environment}): ${payoff.strategy_name} Net: ${currencySymbol}${payoff.net_premium.toFixed(2)}`,
              });
              queryClient.invalidateQueries({ queryKey: ["optionsPositions"] });
              queryClient.invalidateQueries({ queryKey: ["optionsOrders"] });
            }}
          />
        </div>
      )}

      {/* 5. TAB: TRADING (Routing, Order Review, Risk, Margin, Kill Switch) */}
      {activeTab === "TRADING" && <OptionsTradingView />}

      {/* 6. TAB: POSITIONS & ORDERS */}
      {activeTab === "PORTFOLIO" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono w-fit">
            <button
              onClick={() => setPortfolioSubTab("POSITIONS")}
              className={`px-4 py-2 rounded-lg font-bold transition ${
                portfolioSubTab === "POSITIONS"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Active Positions & Margin
            </button>
            <button
              onClick={() => setPortfolioSubTab("ORDERS")}
              className={`px-4 py-2 rounded-lg font-bold transition ${
                portfolioSubTab === "ORDERS"
                  ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              OMS Order Intent & Execution Audit
            </button>
          </div>

          {portfolioSubTab === "POSITIONS" ? <OptionsPositionsView /> : <OptionsOrdersView />}
        </div>
      )}

      {/* 7. TAB: HEALTH & DIAGNOSTICS */}
      {activeTab === "HEALTH" && <OptionsHealthView />}

      {/* 8. TAB: SAVED VIEWS */}
      {activeTab === "SAVED" && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <Bookmark className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
                  SAVED OPTIONS WATCHLISTS & CONFIGURATIONS
                </h1>
                <p className="text-xs text-slate-400">
                  Quick-load market filters, underlying preferences, and strike ranges
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5"
            >
              <Bookmark className="w-4 h-4" />
              Save Current View
            </button>
          </div>

          {savedChains.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3 font-mono text-xs text-slate-400">
              <Bookmark className="w-8 h-8 text-slate-600 mx-auto" />
              <div>No saved option chain views yet.</div>
              <p className="text-slate-500 max-w-sm mx-auto">
                Customize your underlying, strike range, and provider in the Option Chain tab, then click &quot;Save Current View&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedChains.map((sc) => (
                <div
                  key={sc.id}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4 shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-cyan-300">
                        {sc.provider || "ALL"}
                      </span>
                      <button
                        onClick={() => handleDeleteSaved(sc.id)}
                        className="text-slate-500 hover:text-rose-400 text-xs transition"
                      >
                        Delete
                      </button>
                    </div>
                    <h3 className="text-sm font-bold text-white font-mono">{sc.name}</h3>
                    <div className="text-xs font-mono text-slate-400 space-y-1">
                      <div>Underlying: <span className="text-white font-bold">{sc.underlying}</span></div>
                      <div>Expiry: <span className="text-white">{sc.expiryPreference}</span></div>
                      <div>Strike Range: <span className="text-white">±{sc.strikeRange}</span></div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLoadSaved(sc)}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    Open in Option Chain →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 9. TAB: OTHER PROVIDERS */}
      {activeTab === "PROVIDERS" && <OptionsOtherProvidersView />}

      {/* Save View Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl font-mono text-xs">
            <h3 className="font-bold text-white text-sm">Save Options Chain View</h3>
            <p className="text-slate-400 text-[11px]">
              Saves current filters ({underlying}, {selectedSource}, ±{strikeRange} strikes) without caching stale prices.
            </p>
            <input
              type="text"
              placeholder="e.g., NIFTY Weekly Primary"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveCurrentChain}
                className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition"
              >
                Save
              </button>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Option Inspection & Trade Drawer */}
      <SelectedOptionInspectionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        strike={selectedStrike}
        optionType={selectedOptionType}
        quote={selectedQuote}
        underlying={underlying}
        expiry={currentExpiry}
        spotPrice={spotPrice}
        currency={currencySymbol}
        onExecuteOrder={(side, lots) => {
          if (selectedStrike && selectedOptionType && selectedQuote) {
            singleOptionMutation.mutate({
              side,
              lots,
              strike: selectedStrike,
              type: selectedOptionType,
              price: selectedQuote.ltp || 0,
            });
          }
        }}
      />
    </div>
  );
}
