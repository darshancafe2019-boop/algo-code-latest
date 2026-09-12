"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Zap,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Bot,
  Activity,
  Sliders,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  BookOpen,
  Layers,
  Flame,
  Radio,
  Clock,
  AlertTriangle,
  RotateCcw,
  Scale,
  RefreshCw,
} from "lucide-react";
import {
  CanonicalFuturesContract,
  LiquidationCalcResult,
  OrderBookData,
  OrderIntentPayload,
} from "../types/futures";
import { useFuturesStore } from "../state/futures-store";
import {
  calculateLiquidation,
  fetchFuturesOrderBook,
  submitFuturesOrderIntent,
  fetchFuturesAccountMargins,
  fetchFuturesPositions,
} from "../api/futures-api";

interface FuturesDetailsDrawerProps {
  contract: CanonicalFuturesContract | null;
  isOpen?: boolean;
  onClose?: () => void;
  initialSide?: "BUY" | "SELL" | "LONG" | "SHORT";
  initialTab?: "TRADE" | "BOOK" | "METRICS" | "RISK";
  onOrderSuccess?: (result: any) => void;
  isInline?: boolean; // When true on desktop, renders as sticky column inside grid without overlay
}

export function FuturesDetailsDrawer({
  contract,
  isOpen = true,
  onClose,
  initialSide = "BUY",
  initialTab = "TRADE",
  onOrderSuccess,
  isInline = false,
}: FuturesDetailsDrawerProps) {
  const {
    leverage,
    setLeverage,
    marginMode,
    setMarginMode,
    executionMode,
    orderSide,
    setOrderSide,
    setOrderReviewOpen,
  } = useFuturesStore();

  const [activeSubTab, setActiveSubTab] = useState<"TRADE" | "BOOK" | "METRICS" | "RISK">(initialTab);
  const [tradeSide, setTradeSide] = useState<"BUY" | "SELL">(
    initialSide === "SELL" || initialSide === "SHORT" ? "SELL" : "BUY"
  );
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT">("MARKET");
  const [quantity, setQuantity] = useState<number>(contract?.min_qty || 1.0);
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [stopPrice, setStopPrice] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [depthLimit, setDepthLimit] = useState<number>(10);

  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [isBookLoading, setIsBookLoading] = useState<boolean>(false);
  const [accountMargins, setAccountMargins] = useState<Record<string, any>>({});
  const [currentPosition, setCurrentPosition] = useState<any>(null);
  const [liqResult, setLiqResult] = useState<LiquidationCalcResult | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [executionState, setExecutionState] = useState<"IDLE" | "VALIDATING" | "SUBMITTING" | "FILLED" | "ERROR">("IDLE");
  const [feedback, setFeedback] = useState<{ status: "SUCCESS" | "ERROR"; message: string } | null>(null);

  // Sync state when contract changes
  useEffect(() => {
    if (contract) {
      setQuantity(contract.min_qty || 1.0);
      const ltp = contract.last_price || contract.mark_price || 0;
      setLimitPrice(ltp > 0 ? ltp.toString() : "");

      // Fetch Account Margins
      fetchFuturesAccountMargins().then(setAccountMargins);

      // Fetch Position for this contract
      fetchFuturesPositions().then((res) => {
        const found = res.positions.find(
          (p) => p.symbol === contract.symbol || p.displayName === contract.displayName
        );
        setCurrentPosition(found || null);
      });
    }
  }, [contract]);

  // Sync initial side
  useEffect(() => {
    if (initialSide) {
      setTradeSide(initialSide === "SELL" || initialSide === "SHORT" ? "SELL" : "BUY");
    }
  }, [initialSide]);

  // Order Book Polling
  useEffect(() => {
    if ((!isInline && !isOpen) || !contract) return;
    let isMounted = true;

    const loadBook = async () => {
      if (!isMounted) return;
      const data = await fetchFuturesOrderBook(contract.symbol, depthLimit);
      if (isMounted && data) {
        setOrderBook(data);
      }
    };

    setIsBookLoading(true);
    loadBook().finally(() => {
      if (isMounted) setIsBookLoading(false);
    });

    const interval = setInterval(loadBook, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, isInline, contract, depthLimit]);

  // Liquidation calculation
  const effectivePrice =
    orderType === "LIMIT" && parseFloat(limitPrice) > 0
      ? parseFloat(limitPrice)
      : contract?.last_price || contract?.mark_price || 100.0;

  useEffect(() => {
    if (contract && effectivePrice > 0) {
      calculateLiquidation({
        side: tradeSide === "BUY" ? "LONG" : "SHORT",
        entryPrice: effectivePrice,
        leverage,
      }).then(setLiqResult);
    }
  }, [contract, tradeSide, effectivePrice, leverage]);

  // Keyboard shortcuts (B, S, O, Esc)
  useEffect(() => {
    if (!isOpen && !isInline) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        if (onClose) onClose();
      } else if (e.key.toLowerCase() === "b") {
        setTradeSide("BUY");
        setActiveSubTab("TRADE");
      } else if (e.key.toLowerCase() === "s") {
        setTradeSide("SELL");
        setActiveSubTab("TRADE");
      } else if (e.key.toLowerCase() === "o") {
        setActiveSubTab("BOOK");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isInline, onClose]);

  // If not open and not inline, don't render
  if (!isInline && !isOpen) return null;

  // Empty state if contract is not yet selected
  if (!contract) {
    const emptyContent = (
      <div className="p-8 text-center flex flex-col items-center justify-center gap-3 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-xl font-sans text-slate-300">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Zap className="w-6 h-6 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-sm text-slate-100">Universal Trade Ticket</h4>
          <p className="text-xs text-slate-400 font-mono max-w-xs">
            Select any futures contract from the market table or click <span className="text-emerald-400 font-bold">BUY</span> / <span className="text-rose-400 font-bold">SELL</span> to configure and preview your order.
          </p>
        </div>
      </div>
    );

    if (isInline) return emptyContent;
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="w-full max-w-md bg-[#0A1422] border-l border-[#12304A] p-6 flex items-center justify-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          {emptyContent}
        </div>
      </div>
    );
  }

  const roundQty = (q: number) => Math.round(q * 10000) / 10000;
  const isStaleData = contract.freshness_status === "STALE" || contract.status === "STALE";
  const isIndian = contract.exchange === "NSE" || contract.currency === "INR";
  const currency = isIndian ? "₹" : "$";
  const multiplier = contract.contract_multiplier || 1.0;

  // Real-time calculations
  const estimatedNotional = quantity * effectivePrice * multiplier;
  const requiredInitialMargin = leverage > 0 ? estimatedNotional / leverage : estimatedNotional;
  const estimatedTakerFee = estimatedNotional * ((contract.taker_fee_pct || 0.05) / 100);

  // Broker Account Mapping
  const brokerKey = contract.exchange === "NSE" ? (contract.provider?.toUpperCase().includes("DHAN") ? "DHAN" : "UPSTOX") : (contract.provider?.toUpperCase().includes("DELTA") ? "DELTA" : "BINANCE");
  const brokerAccount = accountMargins[brokerKey] || {
    displayName: contract.provider || "Exchange Gateway",
    available_margin: isIndian ? 450000.0 : 14250.0,
    margin_used: isIndian ? 125000.0 : 1945.0,
    currency: isIndian ? "INR" : "USDT",
    max_leverage: contract.max_leverage || 50,
  };

  const isDataOnly = contract.status === "DATA_ONLY" || contract.market_data_provider === "UNCONFIGURED";

  // Position impact calculations
  const currQty = currentPosition ? (currentPosition.side === "LONG" ? currentPosition.quantity : -currentPosition.quantity) : 0;
  const tradeDelta = tradeSide === "BUY" ? quantity : -quantity;
  const afterPosQty = currQty + tradeDelta;
  const afterPosSide = afterPosQty > 0 ? "LONG" : afterPosQty < 0 ? "SHORT" : "FLAT";

  // Handle Order Preview & Execution
  const handleOpenOrderPreview = () => {
    if (isDataOnly) {
      setFeedback({
        status: "ERROR",
        message: `Order blocked: ${contract.provider} is currently configured as a Data-Only feed. Execution is disabled.`,
      });
      return;
    }

    if (executionMode === "LIVE") {
      setFeedback({
        status: "ERROR",
        message: "Real-money LIVE trading is currently LOCKED by safety circuit (LIVE_TRADING_ENABLED=false). Please switch to PAPER mode.",
      });
      return;
    }

    // Open Pre-Trade Order Review Modal for safe confirmation
    setOrderReviewOpen(true, contract, tradeSide);
  };

  const ticketContent = (
    <div className={`w-full bg-[#0A1422] border border-[#12304A] shadow-xl flex flex-col font-sans text-slate-200 text-xs select-none ${
      isInline
        ? "rounded-2xl max-h-[calc(100vh-88px)] overflow-hidden"
        : "h-full overflow-hidden"
    }`}>
      {/* 1. Header Bar */}
      <div className="p-3.5 border-b border-[#12304A] bg-[#0C1727] shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center font-bold text-xs text-cyan-300 font-mono shrink-0">
              {contract.underlying.substring(0, 3)}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white font-mono text-xs sm:text-sm truncate flex items-center gap-1.5">
                <span>{contract.displayName || contract.symbol}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 font-semibold border border-slate-700">
                  {contract.contract_type === "PERPETUAL" ? "PERP" : "FUT"}
                </span>
              </h3>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 truncate">
                <span className="text-slate-300 font-bold">{contract.market_data_provider || contract.provider}</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {contract.status === "LIVE" || contract.status === "CONNECTED" ? "LIVE FEED" : contract.status}
                </span>
                <span>•</span>
                <span className="text-cyan-400 font-semibold">{executionMode}</span>
              </div>
            </div>
          </div>
          {!isInline && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close Drawer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Telemetry Summary Grid */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-[#06101B] rounded-xl border border-[#12304A] font-mono text-[10px]">
          <div>
            <span className="text-[8px] text-slate-500 block uppercase">LTP</span>
            <strong className="text-white truncate block">
              {contract.last_price != null ? `${currency}${contract.last_price.toLocaleString()}` : "—"}
            </strong>
          </div>
          <div>
            <span className="text-[8px] text-slate-500 block uppercase">24H %</span>
            <strong
              className={`truncate block ${
                (contract.change_24h_pct || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {(contract.change_24h_pct || 0) >= 0 ? "+" : ""}
              {(contract.change_24h_pct || 0).toFixed(2)}%
            </strong>
          </div>
          <div>
            <span className="text-[8px] text-slate-500 block uppercase">BID / ASK</span>
            <strong className="text-slate-300 truncate block">
              {contract.bid && contract.ask ? `${contract.bid} / ${contract.ask}` : "—"}
            </strong>
          </div>
          <div>
            <span className="text-[8px] text-slate-500 block uppercase">SPREAD</span>
            <strong className="text-cyan-300 truncate block">
              {contract.bid && contract.ask
                ? `${currency}${(contract.ask - contract.bid).toFixed(2)}`
                : "—"}
            </strong>
          </div>
        </div>

        {/* Trade Ticket Subtabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#06101B] border border-[#12304A] font-mono text-xs">
          {[
            { id: "TRADE", label: "Trade Ticket", icon: Zap },
            { id: "BOOK", label: "Order Book", icon: BookOpen },
            { id: "METRICS", label: "Metrics", icon: Layers },
            { id: "RISK", label: "Risk Guard", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex-1 py-1 rounded-lg font-bold transition text-center flex items-center justify-center gap-1 text-[11px] ${
                  isActive
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Feedback Message */}
      {feedback && (
        <div
          className={`mx-3 mt-2 p-2.5 rounded-xl border font-mono text-xs flex items-center justify-between gap-2 animate-in fade-in ${
            feedback.status === "SUCCESS"
              ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/80 border-rose-500/50 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.status === "SUCCESS" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* 3. Main Drawer / Ticket Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        {activeSubTab === "TRADE" ? (
          <div className="space-y-3.5 font-mono">
            {/* BUY / SELL Direction Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#06101B] rounded-xl border border-[#12304A]">
              <button
                type="button"
                onClick={() => setTradeSide("BUY")}
                className={`py-2 rounded-lg font-bold text-xs transition text-center ${
                  tradeSide === "BUY"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                    : "text-slate-400 hover:text-emerald-400 hover:bg-slate-900"
                }`}
              >
                BUY / LONG
              </button>
              <button
                type="button"
                onClick={() => setTradeSide("SELL")}
                className={`py-2 rounded-lg font-bold text-xs transition text-center ${
                  tradeSide === "SELL"
                    ? "bg-rose-500 text-slate-950 shadow-md shadow-rose-500/30"
                    : "text-slate-400 hover:text-rose-400 hover:bg-slate-900"
                }`}
              >
                SELL / SHORT
              </button>
            </div>

            {/* Order Type Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#06101B] rounded-xl border border-[#12304A] text-[10px]">
              {(["MARKET", "LIMIT", "STOP", "STOP_LIMIT"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrderType(t)}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition text-center ${
                    orderType === t
                      ? "bg-[#168BFF] text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Price Inputs for Limit / Stop */}
            {orderType !== "MARKET" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Limit Price ({currency})</label>
                  <input
                    type="number"
                    step={contract.tick_size || 0.1}
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder="Limit price"
                    className="w-full bg-[#06101B] border border-[#12304A] focus:border-cyan-500 rounded-lg p-2 text-white font-bold text-xs outline-none"
                  />
                </div>
                {(orderType === "STOP" || orderType === "STOP_LIMIT") && (
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Trigger Price ({currency})</label>
                    <input
                      type="number"
                      step={contract.tick_size || 0.1}
                      value={stopPrice}
                      onChange={(e) => setStopPrice(e.target.value)}
                      placeholder="Stop trigger"
                      className="w-full bg-[#06101B] border border-[#12304A] focus:border-cyan-500 rounded-lg p-2 text-white font-bold text-xs outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Quantity Controls */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Order Quantity ({contract.underlying})</span>
                <span className="text-slate-500 text-[10px]">
                  Lot: {contract.lot_size || 1} • Mult: {multiplier}x
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(contract.min_qty || 0.01, roundQty(quantity - (contract.lot_size || 1.0))))}
                  className="w-8 h-8 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold border border-[#12304A] flex items-center justify-center text-sm"
                >
                  -
                </button>
                <input
                  type="number"
                  step={contract.lot_size || 0.01}
                  min={contract.min_qty || 0.01}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(0.0001, parseFloat(e.target.value) || 0))}
                  className="flex-1 bg-[#06101B] border border-[#12304A] focus:border-cyan-500 rounded-lg p-2 text-white font-bold text-xs text-center outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(roundQty(quantity + (contract.lot_size || 1.0)))}
                  className="w-8 h-8 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold border border-[#12304A] flex items-center justify-center text-sm"
                >
                  +
                </button>
              </div>

              {/* Quick Percentage Chips */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[0.25, 0.5, 0.75, 1.0].map((frac) => (
                  <button
                    key={frac}
                    type="button"
                    onClick={() => {
                      const avail = brokerAccount.available_margin || 10000;
                      const maxAffordableNotional = avail * leverage * 0.95;
                      const calculatedQty = maxAffordableNotional / Math.max(1, effectivePrice * multiplier);
                      setQuantity(roundQty(Math.max(contract.min_qty || 0.01, calculatedQty * frac)));
                    }}
                    className="py-1 rounded-md bg-[#06101B] hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-[#12304A] text-[10px] font-bold transition"
                  >
                    {frac * 100}%
                  </button>
                ))}
              </div>
            </div>

            {/* Leverage & Margin Controls */}
            <div className="p-3 bg-[#06101B] rounded-xl border border-[#12304A] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Leverage: <span className="text-cyan-400">{leverage}x</span></span>
                <div className="flex items-center gap-1">
                  {(["ISOLATED", "CROSS"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMarginMode(m)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold border transition ${
                        marginMode === m
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                          : "bg-slate-900 text-slate-500 border-[#12304A] hover:text-slate-300"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Leverage Preset Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {[1, 2, 3, 5, 10, 20, 50, 100].filter((l) => l <= (contract.max_leverage || 100)).map((lev) => (
                  <button
                    key={lev}
                    type="button"
                    onClick={() => setLeverage(lev)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition shrink-0 ${
                      leverage === lev
                        ? "bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-sm"
                        : "bg-slate-900 text-slate-400 border-[#12304A] hover:text-white"
                    }`}
                  >
                    {lev}x
                  </button>
                ))}
              </div>

              {/* Margin & Liquidation Snapshot 2-column Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#12304A] text-[10px]">
                <div>
                  <span className="text-slate-500 block text-[9px]">Required Initial Margin</span>
                  <strong className="text-white">
                    {currency}{requiredInitialMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Available Capital</span>
                  <strong className="text-emerald-400">
                    {currency}{(brokerAccount.available_margin || 0).toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Est. Liquidation Price</span>
                  <strong className="text-amber-400">
                    {liqResult?.liquidationPrice ? `${currency}${liqResult.liquidationPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Liq Distance</span>
                  <strong className={liqResult?.liquidationDistancePct && liqResult.liquidationDistancePct < 5 ? "text-rose-400" : "text-slate-300"}>
                    {liqResult?.liquidationDistancePct ? `${liqResult.liquidationDistancePct}%` : "—"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Position Impact Preview */}
            <div className="p-2.5 bg-[#081220] rounded-xl border border-[#12304A] space-y-1.5 text-[10px]">
              <div className="text-slate-400 font-bold flex items-center justify-between">
                <span>POSITION IMPACT PREVIEW</span>
                <span className="text-slate-500 text-[9px]">Auto-Calculated</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block">Current Position</span>
                  <span className="font-bold text-slate-300">
                    {currentPosition ? `${currentPosition.side} ${currentPosition.quantity} ${contract.underlying}` : "FLAT (0.00)"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">After This {tradeSide}</span>
                  <span
                    className={`font-bold ${
                      afterPosSide === "LONG"
                        ? "text-emerald-400"
                        : afterPosSide === "SHORT"
                        ? "text-rose-400"
                        : "text-slate-400"
                    }`}
                  >
                    {afterPosSide === "FLAT" ? "FLAT (Closed)" : `${afterPosSide} ${Math.abs(afterPosQty).toFixed(4)} ${contract.underlying}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Stop Loss & Take Profit (Optional Protection) */}
            <div className="p-2.5 bg-[#06101B] rounded-xl border border-[#12304A] space-y-2 text-[10px]">
              <span className="text-slate-400 font-bold block">Protection Targets (SL / TP)</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">Stop Loss ({currency})</label>
                  <input
                    type="number"
                    step={contract.tick_size || 0.1}
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="Optional SL price"
                    className="w-full bg-slate-900 border border-[#12304A] focus:border-rose-500 rounded-lg p-1.5 text-white font-bold text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">Take Profit ({currency})</label>
                  <input
                    type="number"
                    step={contract.tick_size || 0.1}
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="Optional TP price"
                    className="w-full bg-slate-900 border border-[#12304A] focus:border-emerald-500 rounded-lg p-1.5 text-white font-bold text-xs outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : activeSubTab === "BOOK" ? (
          /* Live Interactive Order Book View */
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-white flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Order Book Depth</span>
              </span>
              <div className="flex items-center gap-1">
                {([5, 10, 20] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDepthLimit(d)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition ${
                      depthLimit === d
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                        : "bg-slate-900 text-slate-500 border-[#12304A] hover:text-slate-300"
                    }`}
                  >
                    {d}L
                  </button>
                ))}
              </div>
            </div>

            {/* Asks */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-slate-500 uppercase px-1 font-semibold">
                <span>Ask Price ({currency})</span>
                <span>Size</span>
                <span>Total</span>
              </div>
              <div className="space-y-0.5">
                {(orderBook?.asks || []).slice(0, depthLimit).map((level, i) => (
                  <button
                    key={`book-ask-${i}`}
                    type="button"
                    onClick={() => {
                      setOrderType("LIMIT");
                      setLimitPrice(level.price.toString());
                      setActiveSubTab("TRADE");
                    }}
                    className="w-full flex justify-between items-center px-2 py-0.5 rounded bg-rose-500/5 hover:bg-rose-500/20 text-[11px] border border-rose-500/10 transition text-left group"
                  >
                    <span className="font-bold text-rose-400 group-hover:underline">
                      {level.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-slate-300">{level.quantity.toFixed(3)}</span>
                    <span className="text-slate-500 text-[9px]">{(level.total || level.quantity).toFixed(3)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mid Market / Spread */}
            <div className="py-1.5 px-2 bg-[#06101B] border-y border-[#12304A] flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px]">LTP:</span>
                <span className="text-white text-xs">
                  {currency}{(contract.last_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px]">
                <span className="text-slate-500">Spread:</span>
                <span className="text-cyan-400 font-mono">
                  {currency}{((orderBook?.spread) || Math.abs((contract.ask || 0) - (contract.bid || 0))).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Bids */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-slate-500 uppercase px-1 font-semibold">
                <span>Bid Price ({currency})</span>
                <span>Size</span>
                <span>Total</span>
              </div>
              <div className="space-y-0.5">
                {(orderBook?.bids || []).slice(0, depthLimit).map((level, i) => (
                  <button
                    key={`book-bid-${i}`}
                    type="button"
                    onClick={() => {
                      setOrderType("LIMIT");
                      setLimitPrice(level.price.toString());
                      setActiveSubTab("TRADE");
                    }}
                    className="w-full flex justify-between items-center px-2 py-0.5 rounded bg-emerald-500/5 hover:bg-emerald-500/20 text-[11px] border border-emerald-500/10 transition text-left group"
                  >
                    <span className="font-bold text-emerald-400 group-hover:underline">
                      {level.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-slate-300">{level.quantity.toFixed(3)}</span>
                    <span className="text-slate-500 text-[9px]">{(level.total || level.quantity).toFixed(3)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : activeSubTab === "METRICS" ? (
          /* Metrics & Basis View */
          <div className="space-y-2.5 font-mono text-xs">
            <div className="p-3 bg-[#06101B] rounded-xl border border-[#12304A] space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Funding Rate (8h):</span>
                {(() => {
                  const rate = typeof contract.funding_rate === "number" ? contract.funding_rate : contract.funding_rate?.funding_rate_8h;
                  return (
                    <span className={`font-bold ${rate && rate > 0 ? "text-emerald-400" : rate && rate < 0 ? "text-rose-400" : "text-slate-400"}`}>
                      {rate !== null && rate !== undefined ? `${(rate * 100).toFixed(4)}%` : "—"}
                    </span>
                  );
                })()}
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Mark Price:</span>
                <span className="text-white font-bold">{currency}{(contract.mark_price || contract.last_price || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Index Price:</span>
                <span className="text-slate-300">{currency}{(contract.index_price || contract.last_price || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Basis:</span>
                {(() => {
                  const b = typeof contract.basis === "number" ? contract.basis : contract.basis?.basis_absolute;
                  return (
                    <span className={`font-bold ${(b || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {b !== null && b !== undefined ? `${(b >= 0 ? "+" : "")}${b.toFixed(2)}` : "—"}
                    </span>
                  );
                })()}
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Provider Source:</span>
                <span className="text-cyan-400 font-bold">{contract.provider || contract.venue}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Lot Size:</span>
                <span className="text-white">{contract.lot_size || 1}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Risk Guard View */
          <div className="space-y-2.5 font-mono text-xs">
            <div className="p-3 bg-[#06101B] rounded-xl border border-[#12304A] space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Pre-Trade Risk Engine Status</span>
              {[
                { stage: "Broker Auth", status: "PASS" },
                { stage: "Data Freshness", status: isStaleData ? "FAIL" : "LIVE" },
                { stage: "Available Margin", status: "PASS" },
                { stage: "Leverage Limit", status: "PASS" },
                { stage: "Kill Switch", status: "DISARMED" },
                { stage: "OMS Readiness", status: "READY" },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-0.5 border-b border-slate-900 text-[10px]">
                  <span className="text-slate-400">{item.stage}</span>
                  <span className={`font-bold px-1.5 py-0.2 rounded text-[9px] ${
                    item.status === "PASS" || item.status === "LIVE" || item.status === "READY"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : item.status === "DISARMED"
                      ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                      : "bg-rose-950 text-rose-400 border border-rose-800"
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Sticky Bottom Action CTA */}
      {activeSubTab === "TRADE" && (
        <div className="p-3 border-t border-[#12304A] bg-[#0A1422] shrink-0">
          <button
            type="button"
            onClick={handleOpenOrderPreview}
            disabled={isSubmitting || isDataOnly}
            className={`w-full py-2.5 rounded-xl font-bold font-mono text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-98 ${
              isDataOnly
                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                : tradeSide === "BUY"
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                : "bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/20"
            }`}
          >
            {isSubmitting ? (
              <>
                <Activity className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : isDataOnly ? (
              <>
                <Lock className="w-4 h-4 text-slate-500" />
                <span>Data Only Feed (Execution Disabled)</span>
              </>
            ) : (
              <>
                <span>PREVIEW & SUBMIT {tradeSide === "BUY" ? "LONG / BUY" : "SHORT / SELL"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  if (isInline) {
    return ticketContent;
  }

  // Mobile / Tablet Drawer with semi-transparent backdrop
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0A1422] border-l border-[#12304A] shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
        {ticketContent}
      </div>
    </div>
  );
}
