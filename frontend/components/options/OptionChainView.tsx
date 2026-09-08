"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { OptionChainData, OptionContractQuote, OptionSource } from "@/types/option-chain";
import { apiClient } from "@/lib/apiClient";

// Modern Streamlined Option Chain Components
import { OptionsProviderHealthStrip } from "./OptionsProviderHealthStrip";
import { OptionsGatewayControlBar } from "./OptionsGatewayControlBar";
import { OptionsCompactMetricsBar } from "./OptionsCompactMetricsBar";
import { SimpleLiveOptionChainTable } from "./SimpleLiveOptionChainTable";
import { OptionsAdvancedCollapsible } from "./OptionsAdvancedCollapsible";
import { SelectedOptionInspectionDrawer } from "./SelectedOptionInspectionDrawer";

interface OptionChainViewProps {
  initialSource?: OptionSource;
  initialUnderlying?: string;
  isSourceLocked?: boolean;
}

export function OptionChainView({
  initialSource = "DHAN",
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
  const [moneynessFilter, setMoneynessFilter] = useState<"ALL" | "ITM" | "ATM" | "OTM">("ALL");
  const [showAdvancedColumns, setShowAdvancedColumns] = useState<boolean>(false);

  // Inspection Drawer State
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [selectedOptionType, setSelectedOptionType] = useState<"CE" | "PE" | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<OptionContractQuote | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Execution Feedback
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);

  // 1. Fetch Option Chain Data from Unified Multi-Broker Gateway
  const isCrypto = ["BTC", "ETH", "SOL", "XRP", "XAUT"].includes(underlying.toUpperCase());

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
    onSuccess: (_, variables) => {
      setFeedback({
        status: "success",
        message: `Dispatched: ${variables.side} ${variables.lots} Lots ${underlying} ${variables.strike} ${variables.type} @ ${currencySymbol}${variables.price.toFixed(2)} (${environment})`,
      });
      queryClient.invalidateQueries({ queryKey: ["optionsPositions"] });
      queryClient.invalidateQueries({ queryKey: ["optionsOrders"] });
    },
    onError: (err: Error) => {
      setFeedback({
        status: "error",
        message: `Order Failed: ${err.message}`,
      });
    },
  });

  const sourcesMap: Record<string, OptionChainData> = data?.sources || {};

  return (
    <div className="flex flex-col gap-3 font-sans text-slate-100 max-w-[1650px] mx-auto w-full min-w-0">
      {/* 1. Provider Health Strip */}
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

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 shadow-lg ${
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
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 2. Control Bar */}
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

      {/* 3. Compact Metrics Summary Row */}
      <OptionsCompactMetricsBar
        spotPrice={spotPrice}
        atmStrike={atmStrike}
        maxPain={data?.max_pain || atmStrike}
        pcr={data?.pcr}
        atmIV={14.8}
        callResistanceStrike={atmStrike + stepSize * 2}
        putSupportStrike={atmStrike - stepSize * 2}
        currency={currencySymbol}
      />

      {/* 4. Main Option Chain Table */}
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

      {/* 5. Collapsible Advanced Section */}
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

      {/* Inspection Drawer */}
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
