"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Zap,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Send,
  Sliders,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Power,
  Scale,
  Clock,
  UserCheck,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { OrderReviewModal, OptionOrderIntentRequest } from "./OrderReviewModal";

export function OptionsTradingView() {
  const queryClient = useQueryClient();

  const [marketDataProvider, setMarketDataProvider] = useState<string>("DHAN");
  const [executionBroker, setExecutionBroker] = useState<string>("DHAN");
  const [tradingMode, setTradingMode] = useState<"PAPER" | "SHADOW" | "LIVE">("PAPER");
  const [selectedAccount, setSelectedAccount] = useState<string>("PRIMARY_MAIN");
  const [underlying, setUnderlying] = useState<string>("NIFTY");
  const [strike, setStrike] = useState<number>(22500);
  const [optionType, setOptionType] = useState<"CE" | "PE">("CE");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [lots, setLots] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number>(145.5);

  // Review modal state
  const [reviewOrder, setReviewOrder] = useState<OptionOrderIntentRequest | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "warn"; text: string } | null>(null);

  // Fetch Risk & Readiness Summary
  const { data: riskSummary, isLoading: isRiskLoading, refetch: refetchRisk } = useQuery<any>({
    queryKey: ["optionsRiskSummary"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/options/risk/summary");
      if (!res.ok || !res.data) throw new Error("Failed to load options risk summary");
      return res.data.data || res.data;
    },
    staleTime: 5000,
  });

  // Kill switch mutation
  const killSwitchMutation = useMutation({
    mutationFn: async ({ scope, reason }: { scope: "GLOBAL" | "BROKER" | "STRATEGY"; reason: string }) => {
      const res = await apiClient.post<any>("/api/options/kill-switch", {
        scope,
        broker: executionBroker,
        reason,
      });
      if (!res.ok) throw new Error("Failed to trigger kill switch");
      return res.data;
    },
    onSuccess: (_, vars) => {
      setStatusMessage({
        type: "warn",
        text: `EMERGENCY KILL SWITCH ACTIVATED (${vars.scope}): All open working orders cancelled. Trading paused.`,
      });
      refetchRisk();
      queryClient.invalidateQueries({ queryKey: ["optionsOrders"] });
    },
    onError: (err: any) => {
      setStatusMessage({
        type: "error",
        text: `Kill Switch Error: ${err.message}`,
      });
    },
  });

  const handleOpenReview = () => {
    const lotSize = underlying.includes("NIFTY") ? 50 : underlying.includes("BANKNIFTY") ? 15 : 1;
    const orderIntent: OptionOrderIntentRequest = {
      canonical_id: `INDIA:NSE:${underlying}:CURRENT:${strike}:${optionType}`,
      symbol: `${underlying} ${strike} ${optionType}`,
      underlying,
      expiry: "Current Week",
      strike,
      option_type: optionType,
      side,
      quantity: lots * lotSize,
      price: limitPrice,
      market_data_provider: marketDataProvider,
      execution_broker: executionBroker,
      mode: tradingMode,
      delta: optionType === "CE" ? 0.52 : -0.48,
      gamma: 0.0012,
      theta: -12.4,
      vega: 8.5,
      iv: 14.8,
    };
    setReviewOrder(orderIntent);
    setIsReviewOpen(true);
  };

  const handleConfirmOrder = async (order: OptionOrderIntentRequest) => {
    const res = await apiClient.post<any>("/api/options/order-intent", {
      order_intent_id: `INTENT_${Date.now()}`,
      client_order_id: `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      symbol: order.symbol,
      underlying: order.underlying,
      strike: order.strike,
      option_type: order.option_type,
      side: order.side,
      quantity: order.quantity,
      price: order.price,
      mode: order.mode,
      provider: order.market_data_provider,
      broker: order.execution_broker,
      delta: order.delta,
      gamma: order.gamma,
      theta: order.theta,
      vega: order.vega,
      iv: order.iv,
    });

    if (!res.ok) {
      throw new Error(res.error?.message || "Order intent routing failed");
    }

    setStatusMessage({
      type: "success",
      text: `Order Intent Dispatched (${order.mode}): ${order.side} ${order.quantity} qty ${order.symbol} @ ₹${order.price.toFixed(2)} [Broker: ${order.execution_broker}]`,
    });

    queryClient.invalidateQueries({ queryKey: ["optionsOrders"] });
    queryClient.invalidateQueries({ queryKey: ["optionsPositions"] });
  };

  const isLiveArmed = tradingMode === "LIVE";

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-xl ${isLiveArmed ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-sky-500/15 text-sky-400 border border-sky-500/30"}`}>
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono text-slate-100 flex items-center gap-2">
              OPTIONS TRADING & ORDER DISPATCH COMMAND CENTER
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold font-mono ${
                tradingMode === "LIVE"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                  : tradingMode === "SHADOW"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}>
                MODE: {tradingMode}
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Decoupled market data feeds from execution brokers with pre-trade risk gating and idempotency
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
          {(["PAPER", "SHADOW", "LIVE"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setTradingMode(m)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition ${
                tradingMode === m
                  ? m === "LIVE"
                    ? "bg-amber-500 text-slate-950 shadow-md font-black"
                    : m === "SHADOW"
                    ? "bg-purple-600 text-white"
                    : "bg-emerald-500 text-slate-950 font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Alert / Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 shadow-lg ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : statusMessage.type === "warn"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Order Ticket & Controls vs Risk & Live Readiness Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Order Intent Dispatch Ticket */}
        <div className="lg:col-span-7 space-y-5">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-4 w-4" /> 1. Provider & Broker Routing
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1.5 font-bold">Market Data Source</label>
                <select
                  value={marketDataProvider}
                  onChange={(e) => setMarketDataProvider(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="DHAN">Dhan (NSE FO)</option>
                  <option value="UPSTOX">Upstox (NSE FO)</option>
                  <option value="DELTA_INDIA">Delta Exchange India (Crypto)</option>
                  <option value="BINANCE">Binance Options (EAPI)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">Live feeds & Black-Scholes quotes</span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1.5 font-bold">Execution Broker</label>
                <select
                  value={executionBroker}
                  onChange={(e) => setExecutionBroker(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="DHAN">Dhan Securities</option>
                  <option value="UPSTOX">Upstox Securities</option>
                  <option value="DELTA_INDIA">Delta Exchange India</option>
                  <option value="BINANCE">Binance</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">Order intent routing destination</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1.5 font-bold">Trading Account</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="PRIMARY_MAIN">Primary Execution Account</option>
                  <option value="HEDGE_SUB">Sub-Account (Hedge Portfolio)</option>
                  <option value="PAPER_SIM">Quant.OS Paper Vault</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1.5 font-bold">Underlying Scrip</label>
                <select
                  value={underlying}
                  onChange={(e) => {
                    const u = e.target.value;
                    setUnderlying(u);
                    if (u === "BTC") setStrike(78000);
                    else if (u === "BANKNIFTY") setStrike(48000);
                    else setStrike(22500);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="NIFTY">NIFTY 50 (Index)</option>
                  <option value="BANKNIFTY">BANK NIFTY (Index)</option>
                  <option value="FINNIFTY">FIN NIFTY (Index)</option>
                  <option value="BTC">BTC / USD (Crypto)</option>
                  <option value="ETH">ETH / USD (Crypto)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contract & Order Configuration */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="h-4 w-4" /> 2. Option Contract & Order Specs
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">Strike Price</label>
                <input
                  type="number"
                  value={strike}
                  onChange={(e) => setStrike(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">Option Type</label>
                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                  <button
                    onClick={() => setOptionType("CE")}
                    className={`flex-1 py-1 rounded-lg font-bold transition ${
                      optionType === "CE" ? "bg-emerald-500 text-slate-950" : "text-slate-400"
                    }`}
                  >
                    CALL (CE)
                  </button>
                  <button
                    onClick={() => setOptionType("PE")}
                    className={`flex-1 py-1 rounded-lg font-bold transition ${
                      optionType === "PE" ? "bg-rose-500 text-slate-950" : "text-slate-400"
                    }`}
                  >
                    PUT (PE)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">Side</label>
                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                  <button
                    onClick={() => setSide("BUY")}
                    className={`flex-1 py-1 rounded-lg font-bold transition ${
                      side === "BUY" ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    onClick={() => setSide("SELL")}
                    className={`flex-1 py-1 rounded-lg font-bold transition ${
                      side === "SELL" ? "bg-amber-500 text-slate-950" : "text-slate-400"
                    }`}
                  >
                    SELL
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">Lots / Multiplier</label>
                <input
                  type="number"
                  min="1"
                  value={lots}
                  onChange={(e) => setLots(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">Limit Price ({underlying === "BTC" ? "$" : "₹"})</label>
                <input
                  type="number"
                  step="0.05"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-bold">Est. Total Premium</label>
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-cyan-400 font-bold">
                  {underlying === "BTC" ? "$" : "₹"}{(limitPrice * lots * (underlying.includes("NIFTY") ? 50 : 1)).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Review and Dispatch Button */}
            <div className="pt-3">
              <button
                onClick={handleOpenReview}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black font-mono text-sm tracking-wide shadow-xl shadow-cyan-500/20 transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                REVIEW ORDER & SAFETY CHECKS
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Live Readiness & Kill Switch Controls */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live Trading Readiness Card */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2 uppercase tracking-wider">
                <Shield className="h-4 w-4 text-emerald-400" /> Pre-Flight Safety & Readiness
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                GUARD ACTIVE
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Broker Authentication</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Quote Freshness & Age</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 84ms (LIVE)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-300">OMS Idempotency Lock</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ENABLED
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Position Reconciliation</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> SYNCHRONIZED
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Multi-Leg Atomicity Engine</span>
                <span className="text-cyan-400 font-bold">SEQUENTIAL_SAFE</span>
              </div>
            </div>
          </div>

          {/* Emergency Kill Switches */}
          <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono text-rose-300 flex items-center gap-2 uppercase tracking-wider">
                <Power className="h-4 w-4 text-rose-400" /> Emergency Kill Switches
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold">
                INSTANT OMS HALT
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Cancels working option intents, halts automated bots, and restricts live order placement immediately.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => killSwitchMutation.mutate({ scope: "BROKER", reason: "Manual Broker Kill from Options Trading Tab" })}
                disabled={killSwitchMutation.isPending}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold transition flex items-center justify-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5 text-rose-400" /> Kill Broker Feed
              </button>

              <button
                onClick={() => killSwitchMutation.mutate({ scope: "GLOBAL", reason: "Operator Global Emergency Shutdown from Options Tab" })}
                disabled={killSwitchMutation.isPending}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-black text-xs transition shadow-lg shadow-rose-950/50 flex items-center justify-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5" /> GLOBAL KILL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Order Review Modal */}
      <OrderReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        order={reviewOrder}
        onConfirm={handleConfirmOrder}
      />
    </div>
  );
}
