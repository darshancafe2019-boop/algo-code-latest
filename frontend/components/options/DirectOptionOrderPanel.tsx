"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Shield,
  ShieldAlert,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Bot,
} from "lucide-react";
import {
  OptionOrderIntent,
  OptionOrderPreview,
  getStandardOptionLotSize,
} from "@/types/option-order-intent";
import { useGlobalData } from "@/context/GlobalDataContext";
import { formatNumber, formatMoney } from "@/lib/formatters";
import { dispatchBotCreation } from "@/lib/store/useBotCreationIntentStore";

interface DirectOptionOrderPanelProps {
  isOpen: boolean;
  intent: OptionOrderIntent | null;
  onClose: () => void;
  onReviewOrder: (preview: OptionOrderPreview, updatedIntent: OptionOrderIntent) => void;
  currency?: string;
}

export const DirectOptionOrderPanel: React.FC<DirectOptionOrderPanelProps> = ({
  isOpen,
  intent,
  onClose,
  onReviewOrder,
  currency = "₹",
}) => {
  const router = useRouter();
  const { tradingMode, portfolioSnapshot, riskSummary } = useGlobalData();

  // Internal form states initialized from canonical intent
  const [lots, setLots] = useState<number>(1);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("LIMIT");
  const [limitPrice, setLimitPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<string>("");
  const [target, setTarget] = useState<string>("");
  const [productType, setProductType] = useState<"INTRADAY" | "NORMAL">("INTRADAY");

  // Keep state synchronized with incoming intent
  useEffect(() => {
    if (!intent) return;
    const initialLots = intent.lots || 1;
    setLots(initialLots);
    setOrderType(intent.orderType === "LIMIT" ? "LIMIT" : "LIMIT");

    // Suggest execution price: Ask for BUY, Bid for SELL, or LTP
    const suggestedPrice =
      intent.price > 0
        ? intent.price
        : intent.side === "BUY"
        ? (intent.ask && intent.ask > 0 ? intent.ask : intent.ltp || 0)
        : (intent.bid && intent.bid > 0 ? intent.bid : intent.ltp || 0);

    setLimitPrice(suggestedPrice);
    setStopLoss(intent.stopLoss ? intent.stopLoss.toString() : "");
    setTarget(intent.target ? intent.target.toString() : "");
    setProductType(intent.productType === "NORMAL" ? "NORMAL" : "INTRADAY");
  }, [intent]);

  if (!isOpen || !intent) return null;

  const isCall = intent.optionType === "CALL";
  const isBuy = intent.side === "BUY";
  const lotSize = intent.lotSize || getStandardOptionLotSize(intent.underlying);
  const quantity = lots * lotSize;

  const currentLtp = intent.ltp || limitPrice;
  const activePrice = orderType === "LIMIT" ? limitPrice : currentLtp;
  const requiredMargin = Math.round(quantity * activePrice * 100) / 100;
  const availableCapital = portfolioSnapshot?.availableCapital ?? 1000000.0;
  const estimatedFees = Math.round((20.0 + (requiredMargin * 0.0005)) * 100) / 100;

  // Stop loss risk calculation
  const parsedSl = parseFloat(stopLoss) || 0;
  const riskPerUnit = parsedSl > 0 ? Math.abs(activePrice - parsedSl) : activePrice;
  const totalRisk = Math.round(quantity * riskPerUnit * 100) / 100;

  // Validation
  const isKillSwitchActive = Boolean(riskSummary?.globalKillSwitchActive);
  const hasSufficientCapital = tradingMode === "PAPER" || availableCapital >= requiredMargin;
  const isTradeValid = quantity > 0 && activePrice > 0 && !isKillSwitchActive;

  const handleLotsChange = (delta: number) => {
    setLots((prev) => Math.max(1, prev + delta));
  };

  const handleReviewClick = () => {
    if (!isTradeValid) return;

    const updatedIntent: OptionOrderIntent = {
      ...intent,
      lots,
      quantity,
      lotSize,
      orderType,
      price: activePrice,
      stopLoss: parsedSl > 0 ? parsedSl : undefined,
      target: parseFloat(target) || undefined,
      productType,
      mode: (tradingMode === "LIVE" ? "LIVE" : "PAPER"),
      timestamp: new Date().toISOString(),
    };

    const preview: OptionOrderPreview = {
      broker: intent.broker,
      symbol: intent.tradingSymbol || `${intent.underlying} ${intent.strike} ${intent.optionType}`,
      expiry: intent.expiry,
      strike: intent.strike,
      optionType: intent.optionType,
      side: intent.side,
      quantity,
      lots,
      lotSize,
      price: activePrice,
      orderType,
      requiredMargin,
      estimatedFees,
      availableCapital,
      riskAmount: totalRisk,
      mode: (tradingMode === "LIVE" ? "LIVE" : "PAPER"),
    };

    onReviewOrder(preview, updatedIntent);
  };

  const handleCreateBot = () => {
    if (!intent) return;
    const optType = intent.optionType === "PUT" ? "PE" : "CE";
    const canonicalContractId = `${intent.broker || "NSE"}:${intent.broker === "DELTA" ? "DELTA" : "NSE_FO"}:${intent.underlying}:${intent.expiry}:${intent.strike}:${optType}:${intent.securityId || intent.tradingSymbol}`;

    dispatchBotCreation(router, {
      symbol: intent.tradingSymbol || `${intent.underlying} ${intent.strike} ${optType}`,
      canonicalSymbol: canonicalContractId,
      canonicalContractId,
      side: intent.side,
      assetClass: intent.broker === "DELTA" ? "CRYPTO_OPTIONS" : "INDIAN_OPTIONS",
      underlying: intent.underlying,
      exchange: intent.exchange || (intent.broker === "DELTA" ? "DELTA" : "NSE"),
      broker: intent.broker || "PAPER",
      securityId: intent.securityId,
      tradingSymbol: intent.tradingSymbol,
      lotSize,
      currentPrice: currentLtp,
      bid: intent.bid,
      ask: intent.ask,
      strike: intent.strike,
      expiry: intent.expiry,
      optionType: optType,
      timestamp: Date.now(),
      origin: "OPTIONS",
    });
  };

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-[#070D18] border-l border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200"
      aria-label="Direct Option Order Panel"
    >
      {/* 1. Header */}
      <div className="p-4 border-b border-slate-800 bg-[#0A1222] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isBuy ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-rose-400 shadow-sm shadow-rose-400"
            }`}
          />
          <div>
            <h2 className="text-sm font-black tracking-wide font-mono text-white flex items-center gap-2">
              DIRECT OPTION ORDER
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                {intent.broker}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              OMS & Risk-Validated Execution Pipeline
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Scrollable Ticket Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
        {/* Mode & Invariant Banner */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border bg-slate-900/80 border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-bold text-slate-300">
              TRADING MODE:
            </span>
          </div>
          <span
            className={`px-2.5 py-1 rounded text-[10px] font-black tracking-wider uppercase border ${
              tradingMode === "LIVE"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            }`}
          >
            {tradingMode === "LIVE" ? "LIVE ORDER" : "PAPER ORDER"}
          </span>
        </div>

        {/* Contract Key Summary Card */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/90 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-base font-black text-white tracking-wide">
              {intent.underlying} {formatNumber(intent.strike)}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  isCall
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                }`}
              >
                {intent.optionType}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  isBuy
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                }`}
              >
                {intent.side}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div>
              <span className="text-slate-500">Expiry:</span>{" "}
              <strong className="text-slate-200">{intent.expiry || "Nearest"}</strong>
            </div>
            <div>
              <span className="text-slate-500">Symbol:</span>{" "}
              <strong className="text-slate-200 truncate block">{intent.tradingSymbol || "—"}</strong>
            </div>
            {intent.securityId && (
              <div>
                <span className="text-slate-500">Sec ID:</span>{" "}
                <strong className="text-slate-200">{intent.securityId}</strong>
              </div>
            )}
            <div>
              <span className="text-slate-500">Exchange:</span>{" "}
              <strong className="text-slate-200">{intent.exchange}</strong>
            </div>
          </div>
        </div>

        {/* Live Market Quote Bar */}
        <div className="grid grid-cols-5 gap-1.5 p-2.5 rounded-xl bg-[#0C1527] border border-cyan-500/20 text-center">
          <div>
            <div className="text-[10px] text-slate-400">LTP</div>
            <div className="text-xs font-bold text-cyan-300">
              {currency}{currentLtp ? currentLtp.toFixed(2) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Bid</div>
            <div className="text-xs font-bold text-emerald-400">
              {intent.bid ? `${currency}${intent.bid.toFixed(2)}` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Ask</div>
            <div className="text-xs font-bold text-rose-400">
              {intent.ask ? `${currency}${intent.ask.toFixed(2)}` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">IV</div>
            <div className="text-xs font-bold text-amber-300">
              {intent.iv ? `${intent.iv.toFixed(1)}%` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">OI</div>
            <div className="text-xs font-bold text-purple-300 truncate">
              {intent.oi ? intent.oi.toLocaleString() : "—"}
            </div>
          </div>
        </div>

        {/* Lots & Quantity Sizing */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-300 font-bold">
            <span>Lots</span>
            <span className="text-slate-400 font-normal">
              Qty: <strong className="text-white">{quantity}</strong> ({lotSize}/lot)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl bg-slate-900 border border-slate-700/80 p-1 flex-1">
              <button
                type="button"
                onClick={() => handleLotsChange(-1)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-base transition-colors"
                title="Decrease Lots"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="1"
                max="500"
                value={lots}
                onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 bg-transparent text-center text-sm font-bold text-white outline-none"
              />
              <button
                type="button"
                onClick={() => handleLotsChange(1)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-base transition-colors"
                title="Increase Lots"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick lot preset buttons */}
            {[1, 2, 5, 10].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setLots(preset)}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition ${
                  lots === preset
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                }`}
              >
                {preset}L
              </button>
            ))}
          </div>
        </div>

        {/* Order Type & Price Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-300 font-bold">
            <span>Order Type</span>
            <span>Price ({currency})</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
              <button
                type="button"
                onClick={() => setOrderType("LIMIT")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  orderType === "LIMIT"
                    ? "bg-cyan-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                LIMIT
              </button>
              <button
                type="button"
                onClick={() => setOrderType("MARKET")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  orderType === "MARKET"
                    ? "bg-cyan-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                MARKET
              </button>
            </div>

            <div className="relative">
              <input
                type="number"
                step="0.05"
                disabled={orderType === "MARKET"}
                value={orderType === "MARKET" ? currentLtp : limitPrice}
                onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
                className={`w-full py-2 px-3 rounded-xl bg-slate-900 border text-xs font-bold text-white outline-none ${
                  orderType === "MARKET"
                    ? "border-slate-800 text-slate-500 cursor-not-allowed"
                    : "border-slate-700/80 focus:border-cyan-400"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Stop Loss & Target (Risk Limits) */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 block">Stop Loss ({currency})</label>
            <input
              type="number"
              step="0.1"
              placeholder="Optional"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white outline-none focus:border-rose-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 block">Target ({currency})</label>
            <input
              type="number"
              step="0.1"
              placeholder="Optional"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        {/* Product Type Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-[11px]">Product Type</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setProductType("INTRADAY")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                productType === "INTRADAY"
                  ? "bg-slate-700 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              INTRADAY
            </button>
            <button
              type="button"
              onClick={() => setProductType("NORMAL")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                productType === "NORMAL"
                  ? "bg-slate-700 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              OVERNIGHT
            </button>
          </div>
        </div>

        {/* Capital, Margin & Risk Check Summary */}
        <div className="p-3.5 rounded-xl bg-[#09101E] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Required Margin:</span>
            <strong className="text-white font-mono">
              {currency}{requiredMargin.toLocaleString()}
            </strong>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Available Capital:</span>
            <strong className={hasSufficientCapital ? "text-emerald-400" : "text-rose-400"}>
              {currency}{availableCapital.toLocaleString()}
            </strong>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Estimated Risk:</span>
            <strong className="text-amber-400">
              {currency}{totalRisk.toLocaleString()}
            </strong>
          </div>
        </div>
      </div>

      {/* 3. Action Buttons */}
      <div className="p-4 border-t border-slate-800 bg-[#0A1222] space-y-2">
        <button
          type="button"
          onClick={handleReviewClick}
          disabled={!isTradeValid}
          className={`w-full py-3 rounded-xl font-black text-sm tracking-wide transition flex items-center justify-center gap-2 shadow-lg ${
            isTradeValid
              ? isBuy
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-[0.98]"
                : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20 active:scale-[0.98]"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          <span>REVIEW ORDER</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCreateBot}
            className="flex-1 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1.5"
            title="Create Algorithmic Bot from this Option Contract"
          >
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span>CREATE BOT</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 text-xs font-mono font-bold transition-colors"
          >
            CANCEL
          </button>
        </div>
      </div>
    </aside>
  );
};
