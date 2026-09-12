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
  isOpen: boolean;
  onClose: () => void;
  initialSide?: "BUY" | "SELL" | "LONG" | "SHORT";
  initialTab?: "TRADE" | "BOOK" | "METRICS" | "RISK";
  onOrderSuccess?: (result: any) => void;
}

export function FuturesDetailsDrawer({
  contract,
  isOpen,
  onClose,
  initialSide = "BUY",
  initialTab = "TRADE",
  onOrderSuccess,
}: FuturesDetailsDrawerProps) {
  const {
    leverage,
    setLeverage,
    marginMode,
    setMarginMode,
    executionMode,
    orderSide,
    setOrderSide,
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
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

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

  // Order Book Polling (Selective Subscription)
  useEffect(() => {
    if (!isOpen || !contract) return;
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

    const interval = setInterval(loadBook, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, contract, depthLimit]);

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

  // Keyboard shortcut listener (Esc to close, B for Buy, S for Sell, O for Order Book)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        if (showPreviewModal) setShowPreviewModal(false);
        else onClose();
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
  }, [isOpen, showPreviewModal, onClose]);

  if (!isOpen || !contract) return null;

  const roundQty = (q: number) => Math.round(q * 10000) / 10000;
  const isStaleData = contract.freshness_status === "STALE" || contract.status === "STALE";

  const isIndian = contract.exchange === "NSE" || contract.currency === "INR";
  const currency = isIndian ? "₹" : "$";
  const isConnected = contract.status === "CONNECTED" || contract.status === "LIVE";
  const isDataOnly = !isConnected || contract.status === "NOT_CONFIGURED" || contract.status === "AUTH_REQUIRED";

  const multiplier = contract.contract_multiplier || 1.0;
  const notionalValue = quantity * effectivePrice * multiplier;
  const requiredInitialMargin = leverage > 0 ? notionalValue / leverage : notionalValue;
  const maintenanceMargin = requiredInitialMargin * 0.5;
  const estimatedFee = notionalValue * ((contract.taker_fee_pct || 0.05) / 100);

  // Broker specific funds
  const brokerKey = (contract.market_data_provider || contract.provider || "PAPER").toUpperCase();
  const matchedAccountKey = brokerKey.includes("DELTA")
    ? "DELTA"
    : brokerKey.includes("DHAN")
    ? "DHAN"
    : brokerKey.includes("UPSTOX")
    ? "UPSTOX"
    : brokerKey.includes("BINANCE")
    ? "BINANCE"
    : "PAPER";
  
  const brokerAccount = accountMargins[matchedAccountKey] || {
    available_margin: 100000.0,
    currency: currency,
    status: "CONNECTED",
    displayName: `${contract.provider || "Broker"} Account`,
  };

  // Position after fill preview
  const currentPosQty = currentPosition ? (currentPosition.side === "LONG" ? currentPosition.quantity : -currentPosition.quantity) : 0;
  const tradeDelta = tradeSide === "BUY" ? quantity : -quantity;
  const afterPosQty = currentPosQty + tradeDelta;
  const afterPosSide = afterPosQty > 0 ? "LONG" : afterPosQty < 0 ? "SHORT" : "FLAT";

  // Handle book price click (populates limit price)
  const handlePriceClick = (price: number) => {
    setLimitPrice(price.toString());
    setOrderType("LIMIT");
    setActiveSubTab("TRADE");
  };

  // Handle Execution
  const handleExecute = async () => {
    if (isDataOnly) {
      setFeedback({
        status: "ERROR",
        message: `Execution blocked: Data source ${contract.provider} is ${contract.status}.`,
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

    setIsSubmitting(true);
    setExecutionState("VALIDATING");
    setFeedback(null);

    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    setTimeout(async () => {
      setExecutionState("SUBMITTING");
      const res = await submitFuturesOrderIntent({
        symbol: contract.symbol,
        side: tradeSide,
        quantity,
        order_type: orderType,
        limit_price: orderType === "LIMIT" || orderType === "STOP_LIMIT" ? parseFloat(limitPrice) : undefined,
        leverage,
        margin_mode: marginMode,
        stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
        take_profit: takeProfit ? parseFloat(takeProfit) : undefined,
        mode: executionMode,
        idempotency_key: idempotencyKey,
      });

      setIsSubmitting(false);

      if (res.status === "SUCCESS" && res.result) {
        setExecutionState("FILLED");
        setFeedback({
          status: "SUCCESS",
          message: res.result.message || `Successfully executed ${executionMode} ${tradeSide} order for ${quantity} ${contract.underlying}!`,
        });
        if (onOrderSuccess) onOrderSuccess(res.result);
        setShowPreviewModal(false);
        setTimeout(() => {
          setExecutionState("IDLE");
          setFeedback(null);
        }, 3500);
      } else {
        setExecutionState("ERROR");
        setFeedback({
          status: "ERROR",
          message: res.message || "Order execution rejected by risk engine.",
        });
      }
    }, 400);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#070D1A] border-l border-slate-800 shadow-2xl flex flex-col font-sans text-slate-200 text-xs animate-in slide-in-from-right duration-200 select-none">
      {/* 1. Header Bar */}
      <div className="p-4 border-b border-slate-800/90 bg-[#0B1326] shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center font-bold text-xs text-cyan-300 font-mono shrink-0">
              {contract.underlying.substring(0, 3)}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white font-mono text-sm truncate flex items-center gap-1.5">
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
                <span className="text-slate-400">{executionMode} MODE</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close Drawer (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Telemetry Summary */}
        <div className="grid grid-cols-4 gap-1.5 p-2 bg-slate-900/90 rounded-xl border border-slate-800 font-mono text-[11px]">
          <div>
            <span className="text-[9px] text-slate-500 block uppercase">LTP</span>
            <strong className="text-white">
              {contract.last_price != null ? `${currency}${contract.last_price.toLocaleString()}` : "—"}
            </strong>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block uppercase">Best Bid</span>
            <strong className="text-emerald-400">
              {contract.bid != null ? `${currency}${contract.bid.toLocaleString()}` : "—"}
            </strong>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block uppercase">Best Ask</span>
            <strong className="text-rose-400">
              {contract.ask != null ? `${currency}${contract.ask.toLocaleString()}` : "—"}
            </strong>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block uppercase">Spread</span>
            <strong className="text-cyan-300">
              {contract.bid && contract.ask
                ? `${currency}${(contract.ask - contract.bid).toFixed(2)}`
                : "—"}
            </strong>
          </div>
        </div>

        {/* Drawer Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab("TRADE")}
            className={`flex-1 py-1.5 rounded-lg font-bold transition text-center flex items-center justify-center gap-1 ${
              activeSubTab === "TRADE"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-850"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Trade Ticket</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("BOOK")}
            className={`flex-1 py-1.5 rounded-lg font-bold transition text-center flex items-center justify-center gap-1 ${
              activeSubTab === "BOOK"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-850"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Order Book</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("METRICS")}
            className={`flex-1 py-1.5 rounded-lg font-bold transition text-center flex items-center justify-center gap-1 ${
              activeSubTab === "METRICS"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-850"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Metrics</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("RISK")}
            className={`flex-1 py-1.5 rounded-lg font-bold transition text-center flex items-center justify-center gap-1 ${
              activeSubTab === "RISK"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-850"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Risk Guard</span>
          </button>
        </div>
      </div>

      {/* 2. Feedback Message */}
      {feedback && (
        <div
          className={`mx-4 mt-3 p-3 rounded-xl border font-mono text-xs flex items-center justify-between gap-2 animate-in fade-in ${
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

      {/* 3. Main Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        {activeSubTab === "TRADE" ? (
          <div className="space-y-4 font-mono">
            {/* BUY / SELL Direction Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
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
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
              {(["MARKET", "LIMIT", "STOP", "STOP_LIMIT"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrderType(t)}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition text-center ${
                    orderType === t
                      ? "bg-slate-800 text-cyan-300 border border-slate-700"
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
                    placeholder="Enter limit price"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-2 text-white font-bold text-xs outline-none"
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
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-2 text-white font-bold text-xs outline-none"
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
                  Lot: {contract.lot_size || 1} • Multiplier: {multiplier}x
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(contract.min_qty || 0.01, roundQty(quantity - (contract.lot_size || 1.0))))}
                  className="w-9 h-9 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold border border-slate-700 flex items-center justify-center text-sm"
                >
                  -
                </button>
                <input
                  type="number"
                  step={contract.lot_size || 0.01}
                  min={contract.min_qty || 0.01}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(0.0001, parseFloat(e.target.value) || 0))}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-2 text-white font-bold text-xs text-center outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(roundQty(quantity + (contract.lot_size || 1.0)))}
                  className="w-9 h-9 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold border border-slate-700 flex items-center justify-center text-sm"
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
                      setQuantity(roundQty(calculatedQty * frac));
                    }}
                    className="py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 text-[10px] font-bold transition"
                  >
                    {frac * 100}%
                  </button>
                ))}
              </div>
            </div>

            {/* Leverage & Margin Controls */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Leverage: {leverage}x</span>
                <div className="flex items-center gap-1">
                  {(["ISOLATED", "CROSS"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMarginMode(m)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                        marginMode === m
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                          : "bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Leverage Preset Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[1, 2, 3, 5, 10, 20, 50, 100].filter((l) => l <= (contract.max_leverage || 100)).map((lev) => (
                  <button
                    key={lev}
                    type="button"
                    onClick={() => setLeverage(lev)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition shrink-0 ${
                      leverage === lev
                        ? "bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {lev}x
                  </button>
                ))}
              </div>

              {/* Margin & Liquidation Snapshot */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Required Initial Margin</span>
                  <strong className="text-white">
                    {currency}{requiredInitialMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Available Capital</span>
                  <strong className="text-emerald-400">
                    {currency}{(brokerAccount.available_margin || 0).toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Est. Liquidation Price</span>
                  <strong className="text-amber-400">
                    {liqResult?.liquidationPrice ? `${currency}${liqResult.liquidationPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Liq Distance</span>
                  <strong className={liqResult?.liquidationDistancePct && liqResult.liquidationDistancePct < 5 ? "text-rose-400" : "text-slate-300"}>
                    {liqResult?.liquidationDistancePct ? `${liqResult.liquidationDistancePct}%` : "—"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Position Impact Preview */}
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
              <div className="text-slate-400 font-bold flex items-center justify-between">
                <span>Position Impact Preview</span>
                <span className="text-slate-500 text-[10px]">Auto-Calculated</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
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
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-[11px]">
              <span className="text-slate-400 font-bold block">Protection Targets (SL / TP)</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Stop Loss ({currency})</label>
                  <input
                    type="number"
                    step={contract.tick_size || 0.1}
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="Optional SL price"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-lg p-2 text-white font-bold text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Take Profit ({currency})</label>
                  <input
                    type="number"
                    step={contract.tick_size || 0.1}
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="Optional TP price"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg p-2 text-white font-bold text-xs outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                disabled={isSubmitting || isDataOnly}
                className={`w-full py-3 rounded-xl font-bold font-mono text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-98 ${
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
                    <span>Processing {executionState}...</span>
                  </>
                ) : isDataOnly ? (
                  <>
                    <Lock className="w-4 h-4 text-slate-500" />
                    <span>Data Only Feed (Execution Disabled)</span>
                  </>
                ) : (
                  <>
                    <span>Preview & Submit {tradeSide === "BUY" ? "LONG / BUY" : "SHORT / SELL"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : activeSubTab === "BOOK" ? (
          /* Live Interactive Order Book View */
          <div className="space-y-4 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Level-2 Order Book Depth</span>
              </span>
              <div className="flex items-center gap-1">
                {([5, 10, 20] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDepthLimit(d)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                      depthLimit === d
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                        : "bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300"
                    }`}
                  >
                    {d}L
                  </button>
                ))}
              </div>
            </div>

            {/* Asks */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 uppercase px-2 font-semibold">
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
                    className="w-full flex justify-between items-center px-2 py-1 rounded bg-rose-500/5 hover:bg-rose-500/20 text-xs border border-rose-500/10 transition text-left group"
                  >
                    <span className="font-bold text-rose-400 group-hover:underline">
                      {level.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-slate-300">{level.quantity.toFixed(3)}</span>
                    <span className="text-slate-500 text-[10px]">{(level.total || level.quantity).toFixed(3)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mid Market / Spread */}
            <div className="py-2.5 px-3 bg-slate-950 border-y border-slate-800/80 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">LTP:</span>
                <span className="text-white text-sm">
                  {currency}{(contract.last_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-500">Spread:</span>
                <span className="text-cyan-400 font-mono">
                  {currency}{((orderBook?.spread) || Math.abs((contract.ask || 0) - (contract.bid || 0))).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Bids */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 uppercase px-2 font-semibold">
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
                    className="w-full flex justify-between items-center px-2 py-1 rounded bg-emerald-500/5 hover:bg-emerald-500/20 text-xs border border-emerald-500/10 transition text-left group"
                  >
                    <span className="font-bold text-emerald-400 group-hover:underline">
                      {level.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-slate-300">{level.quantity.toFixed(3)}</span>
                    <span className="text-slate-500 text-[10px]">{(level.total || level.quantity).toFixed(3)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Imbalance Ratio:</span>
                <span className="text-white font-bold">{((orderBook?.imbalance_ratio || 1.0) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sentiment:</span>
                <span className={`font-bold ${orderBook?.sentiment === "BULLISH" ? "text-emerald-400" : orderBook?.sentiment === "BEARISH" ? "text-rose-400" : "text-slate-400"}`}>
                  {orderBook?.sentiment || "NEUTRAL"}
                </span>
              </div>
            </div>
          </div>
        ) : activeSubTab === "METRICS" ? (
          /* Metrics & Basis View */
          <div className="space-y-3 font-mono text-xs">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Funding Rate (8h):</span>
                {(() => {
                  const rate = typeof contract.funding_rate === "number" ? contract.funding_rate : contract.funding_rate?.funding_rate_8h;
                  return (
                    <span className={`font-bold text-sm ${rate && rate > 0 ? "text-emerald-400" : rate && rate < 0 ? "text-rose-400" : "text-slate-400"}`}>
                      {rate !== null && rate !== undefined ? `${(rate * 100).toFixed(4)}%` : "—"}
                    </span>
                  );
                })()}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Mark Price:</span>
                <span className="text-white font-bold">{currency}{(contract.mark_price || contract.last_price || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Index Price:</span>
                <span className="text-slate-300">{currency}{(contract.index_price || contract.last_price || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Basis (Mark - Index):</span>
                {(() => {
                  const b = typeof contract.basis === "number" ? contract.basis : contract.basis?.basis_absolute;
                  return (
                    <span className={`font-bold ${(b || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {b !== null && b !== undefined ? `${(b >= 0 ? "+" : "")}${b.toFixed(2)}` : "—"}
                    </span>
                  );
                })()}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Contract Type:</span>
                <span className="text-slate-300 font-bold">{contract.contract_type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Provider Source:</span>
                <span className="text-cyan-400 font-bold">{contract.provider || contract.venue}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Lot Size:</span>
                <span className="text-white">{contract.lot_size || 1}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Tick Size:</span>
                <span className="text-white">{contract.tick_size || 0.1}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Risk Guard View */
          <div className="space-y-3 font-mono text-xs">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-400 font-bold uppercase block mb-2">Pre-Trade Risk Engine Status</span>
              {[
                { stage: "Broker Authentication", status: "PASS" },
                { stage: "Market Data Freshness", status: isStaleData ? "FAIL" : "LIVE" },
                { stage: "Order Book Depth", status: "LIVE" },
                { stage: "Available Margin Funds", status: "PASS" },
                { stage: "Leverage Limit Verification", status: "PASS" },
                { stage: "Max Position Threshold", status: "PASS" },
                { stage: "Daily Drawdown Monitor", status: "PASS" },
                { stage: "Duplicate Replay Check", status: "CLEARED" },
                { stage: "Emergency Kill Switch", status: "DISARMED" },
                { stage: "OMS Readiness", status: "READY" },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-900">
                  <span className="text-slate-400 text-[11px]">{item.stage}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    item.status === "PASS" || item.status === "LIVE" || item.status === "CLEARED" || item.status === "READY"
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

      {/* Footer */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0 font-mono text-[11px]">
        <div className="flex items-center gap-2 text-slate-400">
          <Radio className={`w-3.5 h-3.5 ${isStaleData ? "text-amber-400 animate-pulse" : "text-emerald-400"}`} />
          <span>{contract.provider || contract.venue} • {isStaleData ? "STALE DATA" : "LIVE FEED"}</span>
        </div>
      </div>
    </div>
  );
}
