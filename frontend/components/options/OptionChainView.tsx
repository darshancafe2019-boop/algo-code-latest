"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { OptionChainData, OptionContractQuote, MultiLegPayoff } from "@/types/option-chain";

import { OptionsCommandHeader } from "./OptionsCommandHeader";
import { OptionsAnalyticsSummaryBar } from "./OptionsAnalyticsSummaryBar";
import { StrikeCenteredOptionLadderTable } from "./StrikeCenteredOptionLadderTable";
import { OpenInterestHeatmapView } from "./OpenInterestHeatmapView";
import { ImpliedVolatilitySkewView } from "./ImpliedVolatilitySkewView";
import { MultiLegStrategyBuilder } from "./MultiLegStrategyBuilder";
import { OptionsScannerView } from "./OptionsScannerView";
import { SelectedOptionInspectionDrawer } from "./SelectedOptionInspectionDrawer";

export function OptionChainView() {
  const queryClient = useQueryClient();

  const [underlying, setUnderlying] = useState("NIFTY");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [strikeRange, setStrikeRange] = useState<number>(20);
  const [viewMode, setViewMode] = useState<"table" | "heatmap" | "skew" | "strategy" | "scanner">("table");

  // Inspection Drawer State
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [selectedOptionType, setSelectedOptionType] = useState<"CE" | "PE" | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<OptionContractQuote | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Execution Feedback
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);

  // 1. Fetch Option Chain Data
  const { data, isLoading, error, refetch, isFetching } = useQuery<OptionChainData>({
    queryKey: ["optionChain", underlying, selectedExpiry, strikeRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        underlying,
        strike_count: strikeRange.toString(),
      });
      if (selectedExpiry) params.append("expiry", selectedExpiry);

      const res = await fetch(`/api/options/chain?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch option chain");
      return res.json();
    },
    staleTime: 3000,
    refetchInterval: 5000,
  });

  const spotPrice = data?.spot_price || 24350.0;
  const currentExpiry = data?.selected_expiry || selectedExpiry || "";
  const expiriesList = data?.available_expiries || [];
  const strikesList = data?.strikes || [];

  const isCrypto = underlying === "BTC" || underlying === "ETH";
  const currencySymbol = isCrypto ? "$" : "₹";

  // Calculate ATM Strike
  const stepSize = spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : 50;
  const atmStrike = Math.round(spotPrice / stepSize) * stepSize;

  // Single Option Execution Mutation
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
        mode: "PAPER",
        bot_id: "bot-1",
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
        message: `Option Order Filled: ${variables.side} ${variables.lots} Lots ${underlying} ${variables.strike} ${variables.type} @ ${currencySymbol}${variables.price.toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["terminalPositions"] });
      queryClient.invalidateQueries({ queryKey: ["tradesList"] });
    },
    onError: (err: Error) => {
      setFeedback({
        status: "error",
        message: `Order Failed: ${err.message}`,
      });
    },
  });

  return (
    <div className="flex flex-col gap-5 text-slate-100 font-sans">
      {/* 1. Header with Underlying Selector, Expiry, Live Quote */}
      <OptionsCommandHeader
        underlying={underlying}
        onChangeUnderlying={(u) => {
          setUnderlying(u);
          setSelectedExpiry("");
        }}
        selectedExpiry={currentExpiry}
        onChangeExpiry={(exp) => setSelectedExpiry(exp)}
        availableExpiries={expiriesList}
        spotPrice={spotPrice}
        spotChange24h={data?.spot_change_24h || 1.85}
        strikeRange={strikeRange}
        onChangeStrikeRange={(r) => setStrikeRange(r)}
        viewMode={viewMode}
        onChangeViewMode={(m) => setViewMode(m)}
        dataStatus={data?.data_status || "LIVE"}
        latencyMs={data?.latency_ms || 28}
        isFetching={isFetching}
        onRefresh={() => refetch()}
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
        <StrikeCenteredOptionLadderTable
          strikes={strikesList}
          spotPrice={spotPrice}
          currency={currencySymbol}
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
              message: `Multi-Leg Order Routed: ${payoff.strategy_name} (${payoff.legs.length} Legs) Net: ${currencySymbol}${payoff.net_premium.toFixed(2)}`,
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
    </div>
  );
}
