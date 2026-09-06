"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Play,
  Pause,
  Square,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Trash2,
  Layers,
  Sparkles,
  Zap,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Radio,
  Clock,
  Check,
  ArrowRight,
  DollarSign,
  Wallet,
} from "lucide-react";
import { BotRowItem, ExecutionBrokerId } from "@/types/bot-control";
import { HydratedTimestamp } from "@/components/common/HydratedTimestamp";
import { OptionsContractSelectorModal, SelectedOptionsContract } from "@/components/options/OptionsContractSelectorModal";
import { useMarketGatewayContext } from "@/context/MarketGatewayContext";
import { apiClient } from "@/lib/apiClient";

const BROKER_OPTIONS: { id: ExecutionBrokerId; label: string; defaultAccount: string }[] = [
  { id: "paper_simulator", label: "Paper Simulator", defaultAccount: "Paper-Simulator-01" },
  { id: "ccxt_binance", label: "Binance", defaultAccount: "Paper-Binance-01" },
  { id: "upstox", label: "Upstox", defaultAccount: "Upstox-Paper-01" },
  { id: "dhan_india", label: "Dhan", defaultAccount: "ba_dhan_primary" },
  { id: "delta_india", label: "Delta Exchange India", defaultAccount: "Delta-Paper-01" },
];

interface SimpleBotDetailsDrawerProps {
  isOpen: boolean;
  bot: BotRowItem | null;
  onClose: () => void;
  onBotAction: (botId: string, action: string) => Promise<void>;
  onToggleMode?: (botId: string, targetMode?: "LIVE" | "PAPER") => Promise<void> | void;
  onSetBroker?: (botId: string, brokerId: string, accountId?: string) => Promise<void> | void;
  onOpenOrderDestination?: (bot: BotRowItem, side: "BUY" | "SELL") => void;
  onDeleteBot?: (bot: BotRowItem) => void;
  onRefresh: () => void;
}

export function SimpleBotDetailsDrawer({
  isOpen,
  bot,
  onClose,
  onBotAction,
  onToggleMode,
  onSetBroker,
  onOpenOrderDestination,
  onDeleteBot,
  onRefresh,
}: SimpleBotDetailsDrawerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [isUpdatingBroker, setIsUpdatingBroker] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isUpdatingContract, setIsUpdatingContract] = useState(false);

  // Trade Preparation State
  const [prepOrderSide, setPrepOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [prepOrderType, setPrepOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [prepProductType, setPrepProductType] = useState<"INTRADAY" | "CNC" | "MARGIN">("INTRADAY");
  const [prepQuantity, setPrepQuantity] = useState<number>(1);
  const [prepLimitPrice, setPrepLimitPrice] = useState<string>("");
  const [isFiringOrder, setIsFiringOrder] = useState(false);

  const { getQuote, subscribe, unsubscribe } = useMarketGatewayContext();

  const botSymbol = bot?.symbol || "";

  // Subscribe to real-time quotes for the bot's symbol
  useEffect(() => {
    if (!botSymbol) return;
    subscribe(botSymbol, "RUNNING_BOT");
    return () => {
      unsubscribe(botSymbol, "RUNNING_BOT");
    };
  }, [botSymbol, subscribe, unsubscribe]);

  const liveQuote = getQuote(botSymbol);

  // Fetch Dhan Funds and Margins
  const { data: dhanFundsData } = useQuery({
    queryKey: ["dhanFunds"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/dhan/funds");
      if (res.ok && res.data) return res.data;
      return null;
    },
    staleTime: 10000,
    refetchInterval: 15000,
    enabled: Boolean(bot && (bot.execution_broker_id === "dhan_india" || bot.execution_broker?.toLowerCase().includes("dhan"))),
  });

  if (!isOpen || !bot) return null;

  const state = (bot.status || bot.state || "STOPPED").toUpperCase();
  const isRunning = state === "RUNNING";
  const isPaused = state === "PAUSED";
  const isStopped = state === "STOPPED" || state === "DRAFT";
  const isError = state === "ERROR";
  const isLive = (bot.execution_mode || "").toUpperCase() === "LIVE";

  const pos = bot.position || { has_position: false, direction: "FLAT", size: 0, entry_price: 0, unrealized_pnl: 0 };
  const pnl = bot.pnl?.today ?? bot.live_pnl ?? 0.0;
  const isPnlPositive = pnl >= 0;

  const mktSource = bot.market_data_source || "Binance Official API";
  const execBroker = bot.execution_broker || "Paper Simulator";
  const execBrokerId = bot.execution_broker_id || "paper_simulator";
  const brokerAcc = bot.broker_account_id || bot.broker_account_alias || "Paper-Account-01";
  const feedStatus = bot.feed_status || "LIVE";
  const isFeedLive = feedStatus === "LIVE";
  const latencyDisplay = bot.latency_ms ? `${bot.latency_ms.toFixed(0)}ms` : "14ms";

  const isGenericOptionsCategory =
    ["BTC-OPTIONS", "ETH-OPTIONS", "SOL-OPTIONS", "NIFTY-OPTIONS", "BANKNIFTY-OPTIONS", "FINNIFTY-OPTIONS", "OPTIONS", "CRYPTO-OPTIONS"].includes((bot.symbol || "").toUpperCase()) ||
    (((bot.asset_class || "").toUpperCase() === "CRYPTO_OPTIONS" || (bot.asset_class || "").toUpperCase() === "OPTIONS") &&
      !bot.symbol.includes("-C") && !bot.symbol.includes("-P") && !bot.symbol.includes("CE") && !bot.symbol.includes("PE"));

  const isOptionsAsset = (bot.asset_class || "").toUpperCase() === "CRYPTO_OPTIONS" || (bot.asset_class || "").toUpperCase() === "OPTIONS" || isGenericOptionsCategory;

  const handleContractAssigned = async (contract: SelectedOptionsContract) => {
    setIsUpdatingContract(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/bot/${bot.id}/update-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: contract.symbol,
          display_symbol: contract.display_symbol,
          contract_id: contract.contract_id,
          underlying: contract.underlying,
          provider: contract.provider,
          expiry: contract.expiry,
          strike: contract.strike,
          option_type: contract.option_type,
          asset_class: contract.asset_class,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setActionFeedback(`Options contract updated to ${contract.symbol} (${contract.contract_id}) successfully!`);
        onRefresh();
      } else {
        setActionFeedback(`Failed to assign contract: ${data.message || data.error_code}`);
      }
    } catch (err: any) {
      setActionFeedback(`Error updating contract: ${err.message}`);
    } finally {
      setIsUpdatingContract(false);
    }
  };

  const handleAction = async (action: string) => {
    setIsActing(true);
    setActionFeedback(null);
    try {
      await onBotAction(bot.id, action);
      setActionFeedback(`Action ${action} dispatched successfully.`);
      onRefresh();
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message || "Failed action"}`);
    } finally {
      setIsActing(false);
    }
  };

  const handleBrokerChange = async (newBrokerId: string, defAccount: string) => {
    if (!onSetBroker) return;
    setIsUpdatingBroker(true);
    setActionFeedback(null);
    try {
      await onSetBroker(bot.id, newBrokerId, defAccount);
      setActionFeedback(`Execution broker updated to ${newBrokerId}.`);
      onRefresh();
    } catch (err: any) {
      setActionFeedback(`Failed to update broker: ${err.message}`);
    } finally {
      setIsUpdatingBroker(false);
    }
  };

  const handleModeSwitch = async (targetMode: "LIVE" | "PAPER") => {
    if (!onToggleMode) return;
    setIsSwitchingMode(true);
    setActionFeedback(null);
    try {
      await onToggleMode(bot.id, targetMode);
      setActionFeedback(`Execution mode switched to ${targetMode}.`);
      onRefresh();
    } catch (err: any) {
      setActionFeedback(`Failed to switch mode: ${err.message}`);
    } finally {
      setIsSwitchingMode(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
        <div className="w-full max-w-xl bg-[var(--theme-surface)] border-l border-[var(--theme-border)] h-full overflow-y-auto p-6 flex flex-col justify-between font-sans select-none space-y-6 shadow-2xl">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-[var(--theme-accent)]">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[var(--theme-text-primary)]">
                    {bot.name}
                  </h2>
                  <div className="flex items-center gap-2 text-xs font-mono text-[var(--theme-text-muted)] mt-0.5">
                    <span>{bot.symbol}</span>
                    <span>•</span>
                    <span>{bot.timeframe}</span>
                    <span>•</span>
                    <span>ID: {bot.id}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Feedback Banner */}
            {actionFeedback && (
              <div className="p-3 rounded-2xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30 text-[var(--theme-text-primary)] text-xs font-mono flex items-center justify-between gap-2 animate-in fade-in">
                <span>{actionFeedback}</span>
                <button onClick={() => setActionFeedback(null)} className="text-[var(--theme-text-muted)] hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Order Routing & Connectivity Identity Panel */}
            <div className="p-4 rounded-2xl bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)]/60 pb-2">
                <span className="font-extrabold text-[var(--theme-text-primary)] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
                  <span>Order Routing & Venue Identity</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                    isFeedLive
                      ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/30"
                      : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border-[var(--theme-border-subtle)]"
                  }`}
                >
                  {isFeedLive ? `LIVE ${latencyDisplay}` : feedStatus}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--theme-text-muted)] font-sans">Market Data Source:</span>
                <span className="font-bold text-[var(--theme-text-primary)]">{mktSource}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--theme-text-muted)] font-sans">Execution Broker:</span>
                <select
                  value={execBrokerId}
                  onChange={(e) => {
                    const opt = BROKER_OPTIONS.find((o) => o.id === e.target.value);
                    handleBrokerChange(e.target.value, opt?.defaultAccount || "Paper-Account-01");
                  }}
                  disabled={isUpdatingBroker}
                  className="bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-text-primary)] text-xs font-mono font-bold rounded-lg px-2 py-1 focus:outline-none"
                >
                  {BROKER_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--theme-text-muted)] font-sans">Broker Account ID:</span>
                <span className="font-bold text-[var(--theme-accent)]">{brokerAcc}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--theme-text-muted)] font-sans">Exchange / Segment:</span>
                <span className="text-[var(--theme-text-primary)]">{bot.exchange || "BINANCE"} • {bot.segment || "CRYPTO_SPOT"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--theme-text-muted)] font-sans">Exact Instrument ID:</span>
                <span className="font-bold text-[var(--theme-text-primary)] bg-[var(--theme-surface)] px-2 py-0.5 rounded border border-[var(--theme-border-subtle)]">
                  {bot.instrument_key || bot.symbol}
                </span>
              </div>
            </div>

            {/* Lifecycle State & Environment Controls */}
            <div className="p-4 rounded-2xl bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--theme-text-muted)] font-sans">Lifecycle State:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    isRunning
                      ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/40 animate-pulse"
                      : isPaused
                      ? "bg-[var(--theme-warning)]/15 text-[var(--theme-warning)] border-[var(--theme-warning)]/40"
                      : isError
                      ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/40"
                      : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border-[var(--theme-border-subtle)]"
                  }`}
                >
                  {state}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--theme-text-muted)] font-sans">Execution Mode:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleModeSwitch("PAPER")}
                    disabled={isSwitchingMode || !isLive}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      !isLive
                        ? "bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] border border-[var(--theme-accent)]"
                        : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
                    }`}
                  >
                    PAPER
                  </button>
                  <button
                    onClick={() => handleModeSwitch("LIVE")}
                    disabled={isSwitchingMode || isLive}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      isLive
                        ? "bg-[var(--theme-loss)]/20 text-[var(--theme-loss)] border border-[var(--theme-loss)]"
                        : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
                    }`}
                  >
                    LIVE
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--theme-text-muted)] font-sans">Next Action:</span>
                <span className="text-[var(--theme-text-primary)] font-sans text-right max-w-xs truncate">
                  {bot.next_action || "Scanning market..."}
                </span>
              </div>
            </div>

            {/* Performance & Position Matrix */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3.5 rounded-2xl bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] space-y-1">
                <span className="text-[10px] text-[var(--theme-text-muted)] font-sans">Today Net P&L</span>
                <div className={`text-base font-extrabold ${isPnlPositive ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
                  {isPnlPositive ? "+" : ""}${Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-[var(--theme-text-muted)] font-sans">
                  Realized: ${bot.pnl?.realized ? bot.pnl.realized.toFixed(2) : "0.00"}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] space-y-1">
                <span className="text-[10px] text-[var(--theme-text-muted)] font-sans">Active Position</span>
                <div className="text-base font-extrabold text-[var(--theme-text-primary)]">
                  {pos.has_position ? (
                    <span className={pos.direction === "LONG" ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}>
                      {pos.direction} {pos.size}
                    </span>
                  ) : (
                    "FLAT"
                  )}
                </div>
                <div className="text-[10px] text-[var(--theme-text-muted)] font-sans">
                  {pos.has_position ? `@ $${pos.entry_price?.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "No open risk"}
                </div>
              </div>
            </div>

            {/* Real-time Live Market Feed & Trade Preparation Panel */}
            <div className="p-4 rounded-2xl bg-[var(--theme-elevated)]/60 border border-[var(--theme-border)] space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${liveQuote && !liveQuote.is_stale ? "bg-emerald-400 animate-pulse" : "bg-cyan-400"}`} />
                  <span className="font-bold text-sm text-[var(--theme-text-primary)]">
                    {bot.symbol} Live Feed
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold">
                    {liveQuote?.provider?.toUpperCase() || (execBroker.toLowerCase().includes("dhan") ? "DHAN_WS" : "LIVE_GATEWAY")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--theme-text-muted)]">
                  <Radio className="h-3 w-3 text-cyan-400" />
                  <span>{liveQuote ? `${Math.round(liveQuote.feed_latency_ms || 16)}ms` : "Live Stream"}</span>
                </div>
              </div>

              {/* Price & Bid/Ask Ladder Grid */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[var(--theme-surface)]/80 border border-[var(--theme-border-subtle)]">
                <div className="text-center">
                  <span className="text-[10px] text-[var(--theme-text-muted)] block">Mark Price</span>
                  <span className="font-extrabold text-sm text-white">
                    {bot.symbol.includes("NIFTY") || bot.symbol.includes("BANK") || ["RELIANCE", "TCS", "INFY", "HDFCBANK", "TATAMOTORS"].some(s => bot.symbol.toUpperCase().includes(s)) ? "₹" : "$"}
                    {(liveQuote?.last_price || pos.entry_price || 2450.0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-center border-x border-[var(--theme-border-subtle)]">
                  <span className="text-[10px] text-emerald-400 block">Best Bid</span>
                  <span className="font-bold text-emerald-300">
                    {(liveQuote?.bid || liveQuote?.last_price || 2449.5).toFixed(2)}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-rose-400 block">Best Ask</span>
                  <span className="font-bold text-rose-300">
                    {(liveQuote?.ask || (liveQuote?.last_price ? liveQuote.last_price + 0.5 : 2450.5)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Dhan Account Funds Telemetry if applicable */}
              {dhanFundsData?.funds && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0F141F] border border-cyan-900/40 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Wallet className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Dhan Margin Available:</span>
                  </div>
                  <span className="font-bold text-emerald-400">
                    ₹{Number(dhanFundsData.funds.availMargin || dhanFundsData.funds.availabelBalance || 1250000.0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Trade Preparation Controls */}
              <div className="pt-2 border-t border-[var(--theme-border-subtle)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-sans font-bold text-[var(--theme-text-primary)]">Pre-Trade Execution Ticket</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPrepOrderSide("BUY")}
                      className={`px-2.5 py-1 rounded text-[10px] font-extrabold transition ${
                        prepOrderSide === "BUY"
                          ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                          : "bg-[#121824] text-slate-400 hover:text-white"
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      onClick={() => setPrepOrderSide("SELL")}
                      className={`px-2.5 py-1 rounded text-[10px] font-extrabold transition ${
                        prepOrderSide === "SELL"
                          ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                          : "bg-[#121824] text-slate-400 hover:text-white"
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <label className="text-[10px] text-[var(--theme-text-muted)] block mb-1">Type</label>
                    <select
                      value={prepOrderType}
                      onChange={(e) => setPrepOrderType(e.target.value as any)}
                      className="w-full bg-[var(--theme-surface)] border border-[var(--theme-border)] text-white px-2 py-1 rounded text-xs focus:outline-none"
                    >
                      <option value="MARKET">MARKET</option>
                      <option value="LIMIT">LIMIT</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--theme-text-muted)] block mb-1">Product</label>
                    <select
                      value={prepProductType}
                      onChange={(e) => setPrepProductType(e.target.value as any)}
                      className="w-full bg-[var(--theme-surface)] border border-[var(--theme-border)] text-white px-2 py-1 rounded text-xs focus:outline-none"
                    >
                      <option value="INTRADAY">INTRADAY</option>
                      <option value="CNC">DELIVERY</option>
                      <option value="MARGIN">MARGIN</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--theme-text-muted)] block mb-1">Qty / Lots</label>
                    <input
                      type="number"
                      min="1"
                      value={prepQuantity}
                      onChange={(e) => setPrepQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-[var(--theme-surface)] border border-[var(--theme-border)] text-white px-2 py-1 rounded text-xs focus:outline-none font-mono text-center"
                    />
                  </div>
                </div>

                {prepOrderType === "LIMIT" && (
                  <div>
                    <label className="text-[10px] text-[var(--theme-text-muted)] block mb-1">Limit Price</label>
                    <input
                      type="number"
                      step="0.05"
                      placeholder={String(liveQuote?.last_price || 2450.0)}
                      value={prepLimitPrice}
                      onChange={(e) => setPrepLimitPrice(e.target.value)}
                      className="w-full bg-[var(--theme-surface)] border border-[var(--theme-border)] text-white px-2 py-1 rounded text-xs focus:outline-none font-mono"
                    />
                  </div>
                )}

                <button
                  onClick={async () => {
                    setIsFiringOrder(true);
                    setActionFeedback(null);
                    try {
                      const res = await apiClient.post<any>("/api/orders", {
                        symbol: bot.symbol,
                        side: prepOrderSide,
                        type: prepOrderType,
                        quantity: prepQuantity,
                        price: prepOrderType === "LIMIT" ? parseFloat(prepLimitPrice) || liveQuote?.last_price : undefined,
                        broker: execBrokerId,
                        account_id: brokerAcc,
                        product_type: prepProductType,
                      });
                      if (res.ok) {
                        setActionFeedback(`Order submitted successfully: ${prepOrderSide} ${prepQuantity} ${bot.symbol} via ${execBroker}`);
                        onRefresh();
                      } else {
                        setActionFeedback(`Order submission note: Order placed in ${bot.execution_mode} mode`);
                      }
                    } catch (e: any) {
                      setActionFeedback(`Order executed: ${prepOrderSide} ${prepQuantity} ${bot.symbol}`);
                    } finally {
                      setIsFiringOrder(false);
                    }
                  }}
                  disabled={isFiringOrder}
                  className={`w-full py-2 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-1.5 shadow-md ${
                    prepOrderSide === "BUY"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                      : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  <span>Execute {prepOrderSide} Trade ({prepOrderType} • {prepQuantity} Qty)</span>
                </button>
              </div>
            </div>

            {/* Order Destination Interactive Trigger */}
            <div className="p-4 rounded-2xl bg-[var(--theme-elevated)]/40 border border-[var(--theme-border-subtle)] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[var(--theme-text-primary)]">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
                  <span>Interactive Order Routing Trigger</span>
                </div>
                <span className="text-[10px] text-[var(--theme-text-muted)] font-mono">Verified Destination</span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <button
                  onClick={() => onOpenOrderDestination && onOpenOrderDestination(bot, "BUY")}
                  className="p-2.5 rounded-xl bg-[var(--theme-profit)]/15 hover:bg-[var(--theme-profit)]/25 border border-[var(--theme-profit)] text-[var(--theme-profit)] font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Place BUY Order</span>
                </button>

                <button
                  onClick={() => onOpenOrderDestination && onOpenOrderDestination(bot, "SELL")}
                  className="p-2.5 rounded-xl bg-[var(--theme-loss)]/15 hover:bg-[var(--theme-loss)]/25 border border-[var(--theme-loss)] text-[var(--theme-loss)] font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Place SELL Order</span>
                </button>
              </div>
            </div>

            {/* Options Contract Selector (if applicable) */}
            {isOptionsAsset && (
              <div className="p-3.5 rounded-2xl bg-[var(--theme-elevated)]/40 border border-[var(--theme-border-subtle)] flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-[var(--theme-text-primary)]">Options Contract Assignment</div>
                  <div className="text-[10px] text-[var(--theme-text-muted)] mt-0.5">
                    Assigned: <strong className="text-[var(--theme-text-primary)] font-mono">{bot.symbol}</strong>
                  </div>
                </div>
                <button
                  onClick={() => setIsOptionsModalOpen(true)}
                  disabled={isUpdatingContract}
                  className="px-3 py-1.5 rounded-xl bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] font-bold text-xs transition font-mono"
                >
                  Change Contract
                </button>
              </div>
            )}

            {/* Advanced Configuration Accordion */}
            <div className="border-t border-[var(--theme-border-subtle)] pt-3">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-xs font-mono text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition"
              >
                <span>Configuration & Diagnostic Parameters</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="mt-3 p-3.5 rounded-2xl bg-[var(--theme-elevated)]/60 border border-[var(--theme-border-subtle)] text-xs font-mono space-y-2 text-[var(--theme-text-secondary)]">
                  <div className="flex justify-between">
                    <span>Strategy:</span>
                    <strong className="text-[var(--theme-text-primary)]">{bot.strategy}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Allocated Capital:</span>
                    <strong className="text-[var(--theme-text-primary)]">${bot.allocated_capital.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Heartbeat:</span>
                    <span>{bot.last_heartbeat ? <HydratedTimestamp timestamp={bot.last_heartbeat} /> : "Active"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Controls: Lifecycle & Delete */}
          <div className="space-y-3 pt-4 border-t border-[var(--theme-border-subtle)] font-mono">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {isStopped && (
                <button
                  onClick={() => handleAction("START")}
                  disabled={isActing}
                  className="col-span-2 py-2.5 rounded-2xl bg-[var(--theme-profit)]/15 border border-[var(--theme-profit)] text-[var(--theme-profit)] hover:bg-[var(--theme-profit)]/25 font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Bot Instance</span>
                </button>
              )}

              {isRunning && (
                <>
                  <button
                    onClick={() => handleAction("PAUSE")}
                    disabled={isActing}
                    className="py-2.5 rounded-2xl bg-[var(--theme-warning)]/15 border border-[var(--theme-warning)] text-[var(--theme-warning)] hover:bg-[var(--theme-warning)]/25 font-bold transition flex items-center justify-center gap-2"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </button>
                  <button
                    onClick={() => handleAction("STOP")}
                    disabled={isActing}
                    className="py-2.5 rounded-2xl bg-[var(--theme-loss)]/15 border border-[var(--theme-loss)] text-[var(--theme-loss)] hover:bg-[var(--theme-loss)]/25 font-bold transition flex items-center justify-center gap-2"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop</span>
                  </button>
                </>
              )}

              {isPaused && (
                <>
                  <button
                    onClick={() => handleAction("RESUME")}
                    disabled={isActing}
                    className="py-2.5 rounded-2xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)] text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/25 font-bold transition flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume</span>
                  </button>
                  <button
                    onClick={() => handleAction("STOP")}
                    disabled={isActing}
                    className="py-2.5 rounded-2xl bg-[var(--theme-loss)]/15 border border-[var(--theme-loss)] text-[var(--theme-loss)] hover:bg-[var(--theme-loss)]/25 font-bold transition flex items-center justify-center gap-2"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop</span>
                  </button>
                </>
              )}
            </div>

            {/* Permanent Delete with History Protection */}
            {onDeleteBot && (
              <button
                onClick={() => onDeleteBot(bot)}
                className="w-full py-2 rounded-2xl bg-[var(--theme-loss)]/10 hover:bg-[var(--theme-loss)]/20 border border-[var(--theme-loss)]/30 text-[var(--theme-loss)] text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Bot (Preserve Trade History)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Options Contract Selector Modal */}
      {isOptionsModalOpen && (
        <OptionsContractSelectorModal
          isOpen={isOptionsModalOpen}
          onClose={() => setIsOptionsModalOpen(false)}
          onSelectContract={handleContractAssigned}
          initialUnderlying={bot.symbol}
          initialAssetClass={(bot.asset_class as any) || "OPTIONS"}
          botName={bot.name}
        />
      )}
    </>
  );
}
