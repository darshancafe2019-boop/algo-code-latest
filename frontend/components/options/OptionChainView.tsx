"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, RefreshCw, CheckCircle2, AlertTriangle, Activity, X, Shield, Radio, Check } from "lucide-react";
import { OptionChainData, OptionContractQuote, MultiLegPayoff, OptionSource, FreshnessStatus } from "@/types/option-chain";
import { apiClient } from "@/lib/apiClient";

import { OptionsCommandHeader } from "./OptionsCommandHeader";
import { OptionsAnalyticsSummaryBar } from "./OptionsAnalyticsSummaryBar";
import { StrikeCenteredOptionLadderTable } from "./StrikeCenteredOptionLadderTable";
import { OpenInterestHeatmapView } from "./OpenInterestHeatmapView";
import { ImpliedVolatilitySkewView } from "./ImpliedVolatilitySkewView";
import { MultiLegStrategyBuilder } from "./MultiLegStrategyBuilder";
import { OptionsScannerView } from "./OptionsScannerView";
import { SelectedOptionInspectionDrawer } from "./SelectedOptionInspectionDrawer";

interface OptionChainViewProps {
  initialSource?: OptionSource;
  initialUnderlying?: string;
  isSourceLocked?: boolean;
}

export function OptionChainView({
  initialSource = "ALL",
  initialUnderlying,
  isSourceLocked = false,
}: OptionChainViewProps = {}) {
  const queryClient = useQueryClient();

  const defaultUnderlying =
    initialUnderlying ||
    (initialSource === "DELTA_INDIA" || initialSource === "DELTA" || initialSource === "BINANCE" ? "BTC" : "NIFTY");

  const [underlying, setUnderlying] = useState(defaultUnderlying);
  const [selectedSource, setSelectedSource] = useState<OptionSource>(initialSource);
  const [environment, setEnvironment] = useState<"PAPER" | "LIVE">("PAPER");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [strikeRange, setStrikeRange] = useState<number>(20);
  const [viewMode, setViewMode] = useState<"table" | "heatmap" | "skew" | "strategy" | "scanner">("table");
  const [moneynessFilter, setMoneynessFilter] = useState<"ALL" | "ITM" | "ATM" | "OTM">("ALL");
  const [freshOnly, setFreshOnly] = useState(false);

  // Diagnostics Modal State
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  // Inspection Drawer State
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [selectedOptionType, setSelectedOptionType] = useState<"CE" | "PE" | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<OptionContractQuote | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Execution Feedback
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);

  // 1. Fetch Option Chain Data from Unified Multi-Broker Gateway
  const isCrypto = ["BTC", "ETH", "SOL", "XAUT"].includes(underlying.toUpperCase());

  const { data, isLoading, error, refetch, isFetching } = useQuery<OptionChainData>({
    queryKey: ["optionChain", underlying, selectedSource, environment, selectedExpiry, strikeRange],
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
        throw new Error(res.error?.message || "Failed to fetch option chain");
      }
      return res.data.data || res.data;
    },
    staleTime: 4000,
    refetchInterval: () => (apiClient.isOffline() ? false : 6000),
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

  // Single Option Execution Mutation (Safe PAPER Mode by Default)
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
    onSuccess: (resData, variables) => {
      setFeedback({
        status: "success",
        message: `Option Order Executed (${environment}): ${variables.side} ${variables.lots} Lots ${underlying} ${variables.strike} ${variables.type} @ ${currencySymbol}${variables.price.toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["terminalPositions"] });
      queryClient.invalidateQueries({ queryKey: ["tradesList"] });
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
      {/* 1. Header with Source Selector, Underlying, Expiry, Telemetry */}
      <OptionsCommandHeader
        underlying={underlying}
        onChangeUnderlying={(u) => {
          setUnderlying(u);
          setSelectedExpiry("");
        }}
        selectedSource={selectedSource}
        onChangeSource={(src) => setSelectedSource(src)}
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

      {/* 2. Analytical Summary Bar */}
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

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 shadow-lg ${
            feedback.status === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
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
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* 3. Main Views */}
      {viewMode === "table" && (
        <div>
          {selectedSource === "ALL" ? (
            /* Multi-Source Mode: Render distinct segregated tables for each provider */
            <div className="space-y-6">
              {Object.entries(sourcesMap).map(([srcKey, rawSrcData]) => {
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
                    : "Paper Simulator";

                return (
                  <StrikeCenteredOptionLadderTable
                    key={srcKey}
                    strikes={srcStrikes}
                    spotPrice={spotPrice}
                    currency={srcProvider === "DELTA_INDIA" ? "$" : "₹"}
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
              })}
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
              message: `Multi-Leg Order Routed (${environment}): ${payoff.strategy_name} (${payoff.legs.length} Legs) Net: ${currencySymbol}${payoff.net_premium.toFixed(2)}`,
            });
            queryClient.invalidateQueries({ queryKey: ["terminalPositions"] });
            queryClient.invalidateQueries({ queryKey: ["tradesList"] });
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

      {/* 4. Single Option Inspection & Trade Drawer */}
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

      {/* 5. Deduplication & Stream Diagnostics Modal */}
      {isDiagnosticsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">STREAM DEDUPLICATION & TELEMETRY</h3>
              </div>
              <button onClick={() => setIsDiagnosticsOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-[#141E33] border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] text-slate-400 uppercase">Total Received</div>
                <div className="text-xl font-bold text-white mt-1">
                  {data?.diagnostics?.total_received ?? 0}
                </div>
              </div>
              <div className="bg-[#141E33] border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] text-emerald-400 uppercase">Accepted</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {data?.diagnostics?.accepted ?? 0}
                </div>
              </div>
              <div className="bg-[#141E33] border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] text-cyan-400 uppercase">Updated (In-Place)</div>
                <div className="text-xl font-bold text-cyan-400 mt-1">
                  {data?.diagnostics?.updated ?? 0}
                </div>
              </div>
              <div className="bg-[#141E33] border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] text-purple-400 uppercase">Deduplicated</div>
                <div className="text-xl font-bold text-purple-400 mt-1">
                  {data?.diagnostics?.deduplicated ?? 0}
                </div>
              </div>
            </div>

            <div className="bg-[#141E33] border border-slate-800 rounded-xl p-3">
              <div className="flex justify-between items-center text-rose-400 font-bold mb-1">
                <span>Rejected Quotes:</span>
                <span>{data?.diagnostics?.rejected ?? 0}</span>
              </div>
              {data?.diagnostics?.rejection_reasons && Object.keys(data.diagnostics.rejection_reasons).length > 0 ? (
                <div className="space-y-1 text-[10px] text-slate-400 mt-2">
                  {Object.entries(data.diagnostics.rejection_reasons).map(([reason, count]) => (
                    <div key={reason} className="flex justify-between">
                      <span className="truncate">{reason}</span>
                      <span className="text-white font-bold">{String(count)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 italic">No validation rejections recorded.</div>
              )}
            </div>

            <div className="text-[10px] text-slate-500 text-center">
              Last Successful Gateway Sync: {data?.diagnostics?.last_successful_update || "Live"}
            </div>

            <button
              onClick={() => setIsDiagnosticsOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#141E33] hover:bg-slate-800 text-white font-bold transition-all"
            >
              CLOSE DIAGNOSTICS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
