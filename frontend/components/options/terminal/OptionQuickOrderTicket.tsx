"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Zap,
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Minus,
  Sliders,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";
import { ActionableOptionContract } from "@/types/option-terminal";

interface OptionQuickOrderTicketProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ActionableOptionContract | null;
  initialSide?: "BUY" | "SELL";
  currency?: string;
  onOrderSuccess?: (result: any) => void;
}

export const OptionQuickOrderTicket: React.FC<OptionQuickOrderTicketProps> = ({
  isOpen,
  onClose,
  contract,
  initialSide = "BUY",
  currency = "₹",
  onOrderSuccess,
}) => {
  const { tradingMode, portfolioSnapshot, positions, riskSummary, refreshAll } = useGlobalData();

  // Core Form State
  const [side, setSide] = useState<"BUY" | "SELL">(initialSide);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("LIMIT");
  const [lots, setLots] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number>(0);
  const [isPriceManuallyEdited, setIsPriceManuallyEdited] = useState<boolean>(false);

  // Advanced "More" Options
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [triggerPrice, setTriggerPrice] = useState<string>("");
  const [timeInForce, setTimeInForce] = useState<"DAY" | "IOC" | "GTC">("DAY");
  const [reduceOnly, setReduceOnly] = useState<boolean>(false);
  const [postOnly, setPostOnly] = useState<boolean>(false);

  // Submission & Feedback State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ status: "success" | "error" | "warn"; message: string } | null>(null);

  const prevContractKeyRef = useRef<string>("");

  // Sync state when contract or initialSide changes
  useEffect(() => {
    if (!contract) return;
    const contractKey = `${contract.symbol}_${contract.side}_${initialSide}`;
    if (prevContractKeyRef.current !== contractKey) {
      prevContractKeyRef.current = contractKey;
      setSide(initialSide);
      setIsPriceManuallyEdited(false);
      setLots(1);
      setFeedback(null);

      // Smart Price Pre-fill: Best Ask for BUY, Best Bid for SELL
      const suggested = initialSide === "BUY"
        ? (contract.ask > 0 ? contract.ask : contract.ltp)
        : (contract.bid > 0 ? contract.bid : contract.ltp);
      setLimitPrice(suggested);
    }
  }, [contract, initialSide]);

  // Live price tracking before manual edit
  useEffect(() => {
    if (!contract || isPriceManuallyEdited) return;
    const suggested = side === "BUY"
      ? (contract.ask > 0 ? contract.ask : contract.ltp)
      : (contract.bid > 0 ? contract.bid : contract.ltp);
    if (suggested > 0) {
      setLimitPrice(suggested);
    }
  }, [contract?.bid, contract?.ask, contract?.ltp, side, isPriceManuallyEdited]);

  // Check if position already exists for this contract
  const matchingPosition = useMemo(() => {
    if (!positions || positions.length === 0 || !contract) return null;
    return positions.find((p) => {
      const symMatch = p.symbol === contract.symbol || p.symbol.includes(contract.symbol);
      const strikeMatch = (p as any).strike === contract.strike;
      return symMatch || (strikeMatch && (p as any).optionType === contract.optionType);
    });
  }, [positions, contract]);

  if (!isOpen || !contract) return null;

  const isCall = contract.optionType === "CALL" || contract.optionType === "CE";
  const isCrypto = ["BTC", "ETH", "SOL", "XRP"].includes(contract.underlying);
  const curSymbol = isCrypto ? "$" : currency;

  const lotSize = contract.lotSize || (contract.underlying.includes("NIFTY") ? 50 : 1);
  const totalQuantity = lots * lotSize;
  const activePrice = orderType === "LIMIT" ? limitPrice : contract.ltp;
  const estimatedNotional = activePrice * totalQuantity;

  // Spread metrics
  const spread = Math.max(0, (contract.ask || 0) - (contract.bid || 0));
  const spreadPct = contract.ltp > 0 ? (spread / contract.ltp) * 100 : 0;
  const isWideSpread = spreadPct > 3.0;

  // Available Funds
  const availableFunds = portfolioSnapshot?.availableCapital ?? 50000.0;
  const isFundsSufficient = tradingMode === "PAPER" || availableFunds >= estimatedNotional;

  // Handle Position Quick Actions (ADD / REDUCE / EXIT)
  const handlePositionAction = (action: "ADD" | "REDUCE" | "EXIT") => {
    if (!matchingPosition) return;
    const currentQty = matchingPosition.quantity;
    const currentLots = Math.max(1, Math.round(Math.abs(currentQty) / lotSize));

    if (action === "ADD") {
      setSide(currentQty > 0 ? "BUY" : "SELL");
      setLots(1);
    } else if (action === "REDUCE") {
      setSide(currentQty > 0 ? "SELL" : "BUY");
      setLots(Math.max(1, Math.floor(currentLots / 2)));
    } else if (action === "EXIT") {
      setSide(currentQty > 0 ? "SELL" : "BUY");
      setLots(currentLots);
      setOrderType("MARKET");
    }
  };

  // Order Placement
  const handlePlaceOrder = async () => {
    if (isSubmitting) return;

    // 1. Validation Checks
    if (lots <= 0 || totalQuantity <= 0) {
      setFeedback({ status: "error", message: "Quantity must be greater than zero." });
      return;
    }

    if (orderType === "LIMIT" && (!limitPrice || limitPrice <= 0)) {
      setFeedback({ status: "error", message: "Please provide a valid limit price." });
      return;
    }

    if (!isFundsSufficient && side === "BUY") {
      setFeedback({
        status: "error",
        message: `Insufficient margin. Required: ${curSymbol}${estimatedNotional.toFixed(2)}, Available: ${curSymbol}${availableFunds.toFixed(2)}.`,
      });
      return;
    }

    const isKillSwitchActive = Boolean(riskSummary?.globalKillSwitchActive);
    if (isKillSwitchActive) {
      setFeedback({ status: "error", message: "Trading disabled by Kill Switch." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const clientOrderId = `OPT_${contract.broker}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const payload = {
        client_order_id: clientOrderId,
        symbol: contract.symbol,
        direction: side === "BUY" ? "LONG" : "SHORT",
        order_type: orderType,
        quantity: totalQuantity,
        price: orderType === "LIMIT" ? limitPrice : contract.ltp,
        stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
        take_profit: takeProfit ? parseFloat(takeProfit) : undefined,
        trigger_price: triggerPrice ? parseFloat(triggerPrice) : undefined,
        time_in_force: timeInForce,
        mode: tradingMode,
        bot_id: "option-chain-terminal",
        strategy: "OPTION_CHAIN_DIRECT",
        provider: contract.source || contract.broker,
        broker: contract.broker,
        broker_account_id: contract.broker === "DELTA" ? "ba_delta_primary" : "ba_dhan_primary",
        instrument_id: contract.instrumentId || contract.symbol,
        product_id: contract.productId,
        underlying: contract.underlying,
        expiry: contract.expiry,
        strike: contract.strike,
        option_type: contract.optionType,
      };

      const res = await fetch("/api/quick-trade/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.status === "error" || data.status === "rejected") {
        throw new Error(data.message || data.reason || "Execution rejected by broker adapter");
      }

      setFeedback({
        status: "success",
        message: `${side} order for ${totalQuantity} ${contract.symbol} placed on ${contract.broker} (${tradingMode})!`,
      });

      await refreshAll();
      if (onOrderSuccess) onOrderSuccess(data);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setFeedback({ status: "error", message: err.message || "Order execution failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const brokerLabel = contract.broker === "DELTA"
    ? "DELTA EXCHANGE"
    : contract.broker === "DHAN"
    ? "DHAN HQ"
    : contract.broker === "UPSTOX"
    ? "UPSTOX PRO"
    : "PAPER SIMULATOR";

  const matchingEntryPrice = matchingPosition?.entry_price ?? 0;
  const matchingUnrealizedPnl = matchingPosition?.unrealized_pnl ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150 font-mono text-xs">
      <div className="bg-[#0A101D] border border-slate-800 rounded-2xl max-w-md w-full p-4 md:p-5 shadow-2xl space-y-4">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border ${
                isCall
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              }`}
            >
              {isCall ? "CE" : "PE"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white tracking-tight">
                  {contract.underlying} {contract.strike} {isCall ? "CALL" : "PUT"}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {brokerLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {contract.symbol} • Exp: {contract.expiry}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                tradingMode === "LIVE"
                  ? "bg-rose-500/15 border-rose-500/40 text-rose-400"
                  : "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
              }`}
            >
              {tradingMode === "LIVE" ? "🔴 LIVE" : "🛡️ PAPER"}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Quote & Spread Ribbon */}
        <div className="grid grid-cols-4 gap-2 bg-[#060A12] border border-slate-800/90 rounded-xl p-2.5 text-center text-[11px]">
          <div>
            <div className="text-[9px] uppercase text-slate-500 font-bold">LTP</div>
            <div className="text-white font-extrabold">{curSymbol}{contract.ltp.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-slate-500 font-bold">Bid</div>
            <div className="text-emerald-400 font-bold">{curSymbol}{(contract.bid || contract.ltp).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-slate-500 font-bold">Ask</div>
            <div className="text-rose-400 font-bold">{curSymbol}{(contract.ask || contract.ltp).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-slate-500 font-bold">Spread</div>
            <div className={`${isWideSpread ? "text-amber-400 font-bold" : "text-slate-300 font-bold"}`}>
              {curSymbol}{spread.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Existing Position Card (if held) */}
        {matchingPosition && (
          <div className="bg-cyan-950/25 border border-cyan-500/30 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
            <div>
              <div className="text-[9px] uppercase text-cyan-400 font-bold">Open Position</div>
              <div className="text-white font-bold">
                {matchingPosition.quantity > 0 ? "+" : ""}{matchingPosition.quantity} qty ({Math.round(Math.abs(matchingPosition.quantity) / lotSize)} lots) @ Avg {curSymbol}{matchingEntryPrice.toFixed(2)}
              </div>
              <div className={`text-[10px] ${matchingUnrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                P&L: {matchingUnrealizedPnl >= 0 ? "+" : ""}{curSymbol}{matchingUnrealizedPnl.toFixed(2)}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePositionAction("ADD")}
                className="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]"
              >
                + ADD
              </button>

              <button
                type="button"
                onClick={() => handlePositionAction("REDUCE")}
                className="px-2 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 font-bold text-[10px]"
              >
                - REDUCE
              </button>
              <button
                type="button"
                onClick={() => handlePositionAction("EXIT")}
                className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px]"
              >
                ✕ EXIT
              </button>
            </div>
          </div>
        )}

        {/* Side (BUY / SELL) Toggle */}
        <div className="grid grid-cols-2 gap-2 bg-[#060A12] p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSide("BUY")}
            className={`py-2 rounded-lg font-extrabold text-xs transition ${
              side === "BUY"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            BUY (LONG)
          </button>
          <button
            type="button"
            onClick={() => setSide("SELL")}
            className={`py-2 rounded-lg font-extrabold text-xs transition ${
              side === "SELL"
                ? "bg-rose-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            SELL (SHORT)
          </button>
        </div>

        {/* Order Type & Price Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1 bg-[#060A12] p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setOrderType("MARKET")}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                  orderType === "MARKET" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                MARKET
              </button>
              <button
                type="button"
                onClick={() => setOrderType("LIMIT")}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                  orderType === "LIMIT" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                LIMIT
              </button>
            </div>

            {orderType === "LIMIT" && (
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-slate-500">Suggested:</span>
                <button
                  type="button"
                  onClick={() => {
                    setLimitPrice(side === "BUY" ? (contract.ask || contract.ltp) : (contract.bid || contract.ltp));
                    setIsPriceManuallyEdited(false);
                  }}
                  className="text-cyan-400 hover:underline font-bold"
                >
                  {side === "BUY" ? `Best Ask (${curSymbol}${contract.ask || contract.ltp})` : `Best Bid (${curSymbol}${contract.bid || contract.ltp})`}
                </button>
              </div>
            )}
          </div>

          {orderType === "LIMIT" && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.05"
                  value={limitPrice || ""}
                  onChange={(e) => {
                    setLimitPrice(parseFloat(e.target.value) || 0);
                    setIsPriceManuallyEdited(true);
                  }}
                  placeholder="Limit price"
                  className="w-full px-3 py-2 rounded-xl bg-[#060A12] border border-slate-700 text-white font-extrabold text-sm outline-none focus:border-cyan-500"
                />
                <span className="absolute right-3 top-2.5 text-slate-500 font-bold">{curSymbol}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLimitPrice(contract.ltp);
                  setIsPriceManuallyEdited(true);
                }}
                className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px]"
                title="Set to Last Traded Price"
              >
                LTP
              </button>
            </div>
          )}
        </div>

        {/* Lots and Quantity Stepper */}
        <div className="grid grid-cols-2 gap-3 bg-[#060A12] border border-slate-800/90 rounded-xl p-3">
          {/* Lots Stepper */}
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Lots</div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLots((prev) => Math.max(1, prev - 1))}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min="1"
                value={lots}
                onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-center bg-transparent text-white font-extrabold text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setLots((prev) => prev + 1)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Total Quantity */}
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Quantity</div>
            <div className="h-8 flex items-center justify-between px-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-white font-extrabold">{totalQuantity.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500">(@ {lotSize}/lot)</span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="space-y-1 bg-[#060A12] border border-slate-800/80 rounded-xl p-3 text-[11px]">
          <div className="flex items-center justify-between text-slate-400">
            <span>Estimated Value:</span>
            <span className="text-white font-bold">{curSymbol}{estimatedNotional.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Available Funds:</span>
            <span className={isFundsSufficient ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              {curSymbol}{availableFunds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Advanced "More" Accordion */}
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-2.5 bg-[#060A12] text-[11px] text-slate-400 hover:text-white font-bold"
          >
            <span>Advanced Execution Parameters (More)</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="p-3 bg-[#080E1A] space-y-2.5 border-t border-slate-800 text-[11px]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Stop Loss</label>
                  <input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="SL Price"
                    className="w-full px-2 py-1 rounded bg-[#060A12] border border-slate-700 text-white font-mono text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Take Profit</label>
                  <input
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="Target Price"
                    className="w-full px-2 py-1 rounded bg-[#060A12] border border-slate-700 text-white font-mono text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Time in Force</label>
                  <select
                    value={timeInForce}
                    onChange={(e) => setTimeInForce(e.target.value as any)}
                    className="w-full px-2 py-1 rounded bg-[#060A12] border border-slate-700 text-white font-mono text-xs outline-none"
                  >
                    <option value="DAY">DAY (Standard)</option>
                    <option value="IOC">IOC (Immediate/Cancel)</option>
                    <option value="GTC">GTC (Good Till Cancel)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Trigger Price</label>
                  <input
                    type="number"
                    value={triggerPrice}
                    onChange={(e) => setTriggerPrice(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-2 py-1 rounded bg-[#060A12] border border-slate-700 text-white font-mono text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reduceOnly}
                    onChange={(e) => setReduceOnly(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                  />
                  <span className="text-[10px] text-slate-400">Reduce Only</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={postOnly}
                    onChange={(e) => setPostOnly(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                  />
                  <span className="text-[10px] text-slate-400">Post Only</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2 border ${
              feedback.status === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/15 border-rose-500/30 text-rose-300"
            }`}
          >
            {feedback.status === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
            className={`py-2.5 px-3 rounded-xl font-extrabold text-xs text-white shadow-lg transition active:scale-[0.98] flex items-center justify-center gap-1.5 ${
              side === "BUY"
                ? "bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800"
                : "bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>SUBMITTING...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>PLACE {side} ORDER</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
