"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Zap,
  Sliders,
  DollarSign,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  CanonicalFuturesContract,
  RiskPrecheckResponse,
} from "@/types/futures-terminal";
import { useUIStore } from "@/lib/store/useUIStore";

interface Props {
  contract: CanonicalFuturesContract | null;
  executionMode: "PAPER" | "LIVE";
  onOrderExecuted: (orderId: string) => void;
}

export function FuturesOrderTicket({
  contract,
  executionMode,
  onOrderExecuted,
}: Props) {
  const { interfaceMode } = useUIStore();

  // 1. Order Parameters
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT">("MARKET");
  const [sizingMode, setSizingMode] = useState<"BASE" | "USDT" | "RISK_PCT">("BASE");
  const [quantity, setQuantity] = useState<number>(0.02);
  const [notionalInput, setNotionalInput] = useState<number>(1500);
  const [riskPctInput, setRiskPctInput] = useState<number>(1.0);
  const [limitPrice, setLimitPrice] = useState<number>(contract?.last_price || 65000);
  const [leverage, setLeverage] = useState<number>(5);
  const [showMoreLeverage, setShowMoreLeverage] = useState<boolean>(false);
  const [marginMode, setMarginMode] = useState<"ISOLATED" | "CROSS">("ISOLATED");

  // 2. Stop Loss & Take Profit Modes (Default Percentage)
  const [slMode, setSlMode] = useState<"PCT" | "PRICE" | "ATR">("PCT");
  const [slPct, setSlPct] = useState<number>(1.0);
  const [tpMode, setTpMode] = useState<"PCT" | "PRICE">("PCT");
  const [tpPct, setTpPct] = useState<number>(2.5);

  const [stopLossPrice, setStopLossPrice] = useState<number>(0);
  const [takeProfitPrice, setTakeProfitPrice] = useState<number>(0);

  // 3. Trailing Stop & Advanced Settings
  const [trailingStopEnabled, setTrailingStopEnabled] = useState<boolean>(false);
  const [trailPct, setTrailPct] = useState<number>(0.5);
  const [trailActivatePct, setTrailActivatePct] = useState<number>(1.0);

  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [reduceOnly, setReduceOnly] = useState<boolean>(false);
  const [postOnly, setPostOnly] = useState<boolean>(false);
  const [timeInForce, setTimeInForce] = useState<"GTC" | "IOC" | "FOK">("GTC");
  const [slippageLimitPct, setSlippageLimitPct] = useState<number>(0.1);

  // 4. Execution & Validation States
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [riskResult, setRiskResult] = useState<RiskPrecheckResponse | null>(null);
  const [showRiskModal, setShowRiskModal] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showLiveConfirmModal, setShowLiveConfirmModal] = useState<boolean>(false);

  // Active Reference Price
  const activePrice = orderType === "MARKET" ? contract?.last_price || 65000 : limitPrice || contract?.last_price || 65000;
  const underlyingSymbol = contract?.underlying || "BTC";

  // Available user equity from account (benchmark $10,000)
  const totalAccountEquity = 10000.0;
  const availableAccountMargin = 8500.0;

  // Sync Contract Price and SL/TP defaults
  useEffect(() => {
    if (contract) {
      const p = contract.last_price || 65000;
      setLimitPrice(p);

      // Default SL/TP prices based on % defaults
      if (side === "BUY") {
        setStopLossPrice(roundTo(p * (1 - slPct / 100), 1));
        setTakeProfitPrice(roundTo(p * (1 + tpPct / 100), 1));
      } else {
        setStopLossPrice(roundTo(p * (1 + slPct / 100), 1));
        setTakeProfitPrice(roundTo(p * (1 - tpPct / 100), 1));
      }
    }
  }, [contract, side, slPct, tpPct]);

  // Recalculate SL Price when % changes
  const handleSlPctChange = (newPct: number) => {
    setSlPct(newPct);
    if (side === "BUY") {
      setStopLossPrice(roundTo(activePrice * (1 - newPct / 100), 1));
    } else {
      setStopLossPrice(roundTo(activePrice * (1 + newPct / 100), 1));
    }
  };

  // Recalculate TP Price when % changes
  const handleTpPctChange = (newPct: number) => {
    setTpPct(newPct);
    if (side === "BUY") {
      setTakeProfitPrice(roundTo(activePrice * (1 + newPct / 100), 1));
    } else {
      setTakeProfitPrice(roundTo(activePrice * (1 - newPct / 100), 1));
    }
  };

  // Effective Quantity calculation
  const effectiveQuantity = useMemo(() => {
    if (sizingMode === "BASE") return Math.max(0.001, quantity);
    if (sizingMode === "USDT") {
      return roundTo(notionalInput / Math.max(1, activePrice), 4);
    }
    if (sizingMode === "RISK_PCT") {
      const riskBudgetUSD = totalAccountEquity * (riskPctInput / 100.0);
      const stopDist = Math.abs(activePrice - stopLossPrice);
      if (stopDist > 0) {
        return roundTo(riskBudgetUSD / stopDist, 4);
      }
      return quantity;
    }
    return quantity;
  }, [sizingMode, quantity, notionalInput, riskPctInput, activePrice, stopLossPrice, totalAccountEquity]);

  // Derived financials
  const notionalValue = roundTo(effectiveQuantity * activePrice, 2);
  const initialMargin = roundTo(notionalValue / Math.max(1, leverage), 2);

  // Stop / Target Metrics
  const stopDistance = Math.abs(activePrice - stopLossPrice);
  const targetDistance = Math.abs(takeProfitPrice - activePrice);
  const plannedRiskUSD = roundTo(stopDistance * effectiveQuantity, 2);
  const plannedRewardUSD = roundTo(targetDistance * effectiveQuantity, 2);
  const rrRatio = stopDistance > 0 ? roundTo(targetDistance / stopDistance, 2) : 0;

  // Estimated Liquidation
  const estLiquidation = useMemo(() => {
    if (side === "BUY") {
      return roundTo(activePrice * (1.0 - (1.0 / Math.max(1, leverage)) * 0.90), 2);
    }
    return roundTo(activePrice * (1.0 + (1.0 / Math.max(1, leverage)) * 0.90), 2);
  }, [activePrice, leverage, side]);

  const liqDistancePct = roundTo(
    (Math.abs(estLiquidation - activePrice) / Math.max(1, activePrice)) * 100.0,
    2
  );

  // Stop beyond liquidation warning
  const isStopBeyondLiquidation = useMemo(() => {
    if (side === "BUY") {
      return stopLossPrice > 0 && stopLossPrice <= estLiquidation;
    } else {
      return stopLossPrice > 0 && stopLossPrice >= estLiquidation;
    }
  }, [side, stopLossPrice, estLiquidation]);

  // SL/TP Direction Validation Check
  const slValidation = useMemo(() => {
    if (stopLossPrice <= 0) return { valid: false, message: "Stop loss required" };
    if (side === "BUY" && stopLossPrice >= activePrice) {
      return { valid: false, message: "Long Stop Loss must be < Entry price" };
    }
    if (side === "SELL" && stopLossPrice <= activePrice) {
      return { valid: false, message: "Short Stop Loss must be > Entry price" };
    }
    return { valid: true, message: "Valid" };
  }, [side, stopLossPrice, activePrice]);

  const tpValidation = useMemo(() => {
    if (takeProfitPrice <= 0) return { valid: true, message: "Optional" };
    if (side === "BUY" && takeProfitPrice <= activePrice) {
      return { valid: false, message: "Long Take Profit must be > Entry price" };
    }
    if (side === "SELL" && takeProfitPrice >= activePrice) {
      return { valid: false, message: "Short Take Profit must be < Entry price" };
    }
    return { valid: true, message: "Valid" };
  }, [side, takeProfitPrice, activePrice]);

  // Quick Percentage Position Sizing (respects capital, margin, and risk limits)
  const handleQuickSize = (percent: number) => {
    const targetCapital = availableAccountMargin * (percent / 100);
    const targetNotional = targetCapital * leverage;
    const computedUnits = roundTo(targetNotional / Math.max(1, activePrice), 4);

    if (sizingMode === "BASE") {
      setQuantity(computedUnits);
    } else if (sizingMode === "USDT") {
      setNotionalInput(roundTo(targetNotional, 0));
    } else {
      setRiskPctInput(roundTo(percent * 0.02, 1)); // e.g. 2% max risk for 100%
    }
  };

  // Run Server-Side Risk Check
  const handleRunRiskCheck = React.useCallback(async () => {
    if (!contract) return;
    setIsValidating(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/futures/risk-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: contract.canonical_symbol,
          side,
          quantity: effectiveQuantity,
          price: activePrice,
          leverage,
          stop_loss: stopLossPrice,
          take_profit: takeProfitPrice,
          margin_mode: marginMode,
        }),
      });
      const data: RiskPrecheckResponse = await res.json();
      setRiskResult(data);
      if (interfaceMode === "ADVANCED") {
        setShowRiskModal(true);
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to evaluate server-side risk pre-check." });
    } finally {
      setIsValidating(false);
    }
  }, [contract, side, effectiveQuantity, activePrice, leverage, stopLossPrice, takeProfitPrice, marginMode, interfaceMode]);

  // Run initial risk check automatically on parameter updates
  useEffect(() => {
    const timer = setTimeout(() => {
      if (contract && effectiveQuantity > 0 && slValidation.valid) {
        handleRunRiskCheck();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [contract, effectiveQuantity, slValidation.valid, handleRunRiskCheck]);

  // Execute Order (Idempotent & Double-Click Protected)
  const handleExecuteOrder = async () => {
    if (!contract || isExecuting) return;

    if (!slValidation.valid) {
      setFeedback({ type: "error", message: slValidation.message });
      return;
    }

    if (executionMode === "LIVE" && !showLiveConfirmModal) {
      setShowLiveConfirmModal(true);
      return;
    }

    setIsExecuting(true);
    setFeedback(null);
    setShowLiveConfirmModal(false);

    try {
      const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await fetch("/api/futures/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          symbol: contract.canonical_symbol,
          canonical_symbol: contract.canonical_symbol,
          underlying: contract.underlying,
          side,
          order_type: orderType === "STOP" ? "STOP_MARKET" : orderType,
          quantity: effectiveQuantity,
          price: activePrice,
          stop_loss: stopLossPrice,
          take_profit: takeProfitPrice,
          leverage,
          margin_mode: marginMode,
          reduce_only: reduceOnly,
          post_only: postOnly,
          time_in_force: timeInForce,
          execution_mode: executionMode,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        setFeedback({
          type: "success",
          message: `Order submitted: ${data.order?.order_id || "FILLED"}`,
        });
        if (data.order?.order_id) {
          onOrderExecuted(data.order.order_id);
        }
      } else {
        setFeedback({
          type: "error",
          message: `Order Rejected: ${data.message || "Risk pre-check failed."}`,
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error executing order." });
    } finally {
      setIsExecuting(false);
    }
  };

  // Primary visible leverage options
  const baseLeveragePresets = [1, 2, 3, 5];
  const moreLeveragePresets = [10, 20, 50];

  return (
    <div className="bg-[#0B101B] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col font-mono text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            NEW ORDER
          </h2>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
            executionMode === "LIVE"
              ? "bg-rose-950/40 text-rose-300 border-rose-500/30 animate-pulse"
              : "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
          }`}
        >
          {executionMode === "LIVE" ? "LIVE" : "PAPER"}
        </span>
      </div>

      {/* 1. Long / Short Direction Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setSide("BUY")}
          className={`py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all ${
            side === "BUY"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/60 border border-emerald-400 scale-[1.01]"
              : "bg-[#131B2A] text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>LONG</span>
        </button>

        <button
          onClick={() => setSide("SELL")}
          className={`py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all ${
            side === "SELL"
              ? "bg-rose-600 text-white shadow-lg shadow-rose-950/60 border border-rose-400 scale-[1.01]"
              : "bg-[#131B2A] text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>SHORT</span>
        </button>
      </div>

      {/* 2. Order Type & Margin Mode */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Order Type */}
        <div>
          <label className="text-[10px] text-slate-400 block mb-1 uppercase">Order Type</label>
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as any)}
            className="w-full bg-[#131B2A] border border-slate-800 rounded-lg p-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="MARKET">Market</option>
            <option value="LIMIT">Limit</option>
            <option value="STOP">Stop</option>
            <option value="STOP_LIMIT">Stop Limit</option>
          </select>
        </div>

        {/* Margin Mode */}
        <div>
          <label className="text-[10px] text-slate-400 block mb-1 uppercase" title="Isolated margin limits risk to this position only">
            Margin Mode
          </label>
          <div className="flex bg-[#131B2A] p-0.5 rounded-lg border border-slate-800">
            {["ISOLATED", "CROSS"].map((m) => (
              <button
                key={m}
                onClick={() => setMarginMode(m as any)}
                className={`flex-1 py-1 rounded text-[10px] font-semibold transition-colors ${
                  marginMode === m ? "bg-blue-600 text-white" : "text-slate-400"
                }`}
              >
                {m === "ISOLATED" ? "Isolated" : "Cross"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Limit Price Input if applicable */}
      {orderType !== "MARKET" && (
        <div className="mb-3">
          <label className="text-[10px] text-slate-400 block mb-1 uppercase">Limit Price ($)</label>
          <input
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
            className="w-full bg-[#131B2A] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
      )}

      {/* 3. Size Input Section */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-slate-400 uppercase">Size</label>
          {/* Sizing Mode Switcher */}
          <div className="flex gap-1 text-[9px]">
            {[
              { id: "BASE", label: underlyingSymbol },
              { id: "USDT", label: "USDT" },
              { id: "RISK_PCT", label: "Risk %" },
            ].map((sm) => (
              <button
                key={sm.id}
                onClick={() => setSizingMode(sm.id as any)}
                className={`px-1.5 py-0.2 rounded border transition-colors ${
                  sizingMode === sm.id
                    ? "bg-blue-950/60 border-blue-500 text-blue-300 font-bold"
                    : "border-slate-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                {sm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input by Mode */}
        {sizingMode === "BASE" && (
          <div className="relative">
            <input
              type="number"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#131B2A] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-blue-500 font-mono"
            />
            <span className="absolute right-3 top-2 text-[10px] text-slate-500">{underlyingSymbol}</span>
          </div>
        )}

        {sizingMode === "USDT" && (
          <div className="relative">
            <input
              type="number"
              step="100"
              value={notionalInput}
              onChange={(e) => setNotionalInput(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#131B2A] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-blue-500 font-mono"
            />
            <span className="absolute right-3 top-2 text-[10px] text-slate-500">USDT</span>
          </div>
        )}

        {sizingMode === "RISK_PCT" && (
          <div className="relative">
            <input
              type="number"
              step="0.5"
              value={riskPctInput}
              onChange={(e) => setRiskPctInput(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#131B2A] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-blue-500 font-mono"
            />
            <span className="absolute right-3 top-2 text-[10px] text-slate-500">% Equity</span>
          </div>
        )}

        {/* Dynamic Conversion Display */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
          <span>
            {effectiveQuantity} {underlyingSymbol} ≈ ${notionalValue.toLocaleString()}
          </span>
          <span>Margin: ${initialMargin.toLocaleString()}</span>
        </div>

        {/* Quick Position Size Buttons (25%, 50%, 75%, MAX) */}
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => handleQuickSize(pct)}
              className="py-1 rounded bg-[#131B2A] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[10px] font-semibold transition-colors"
            >
              {pct === 100 ? "MAX" : `${pct}%`}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Leverage Multiplier */}
      <div className="mb-3 bg-[#131B2A] p-2.5 rounded-lg border border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-slate-400 uppercase">Leverage</span>
          <span className="text-xs font-bold text-blue-400">{leverage}x</span>
        </div>

        {/* Quick buttons */}
        <div className="flex items-center gap-1">
          {baseLeveragePresets.map((lev) => (
            <button
              key={lev}
              onClick={() => setLeverage(lev)}
              className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors ${
                leverage === lev
                  ? "bg-blue-600 text-white"
                  : "bg-[#0B101B] text-slate-400 hover:text-slate-200"
              }`}
            >
              {lev}x
            </button>
          ))}

          {/* More Dropdown Trigger */}
          <button
            onClick={() => setShowMoreLeverage(!showMoreLeverage)}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
              moreLeveragePresets.includes(leverage)
                ? "bg-blue-900/60 border-blue-500 text-blue-300"
                : "bg-[#0B101B] border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            More ▾
          </button>
        </div>

        {/* Expanded More Leverage Options */}
        {showMoreLeverage && (
          <div className="grid grid-cols-3 gap-1 mt-1.5 pt-1.5 border-t border-slate-800">
            {moreLeveragePresets.map((lev) => (
              <button
                key={lev}
                onClick={() => {
                  setLeverage(lev);
                  setShowMoreLeverage(false);
                }}
                className={`py-1 rounded text-[10px] font-bold ${
                  leverage === lev
                    ? "bg-blue-600 text-white"
                    : "bg-[#0B101B] text-slate-400 hover:text-slate-200"
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>
        )}

        {/* High leverage warning */}
        {leverage >= 20 && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-950/30 p-1.5 rounded border border-amber-500/20 mt-1.5">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>High Leverage: Liquidation distance is reduced ({liqDistancePct}%).</span>
          </div>
        )}
      </div>

      {/* 5. Stop Loss & Take Profit Section */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Stop Loss */}
        <div className="bg-[#131B2A] p-2 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-slate-400 uppercase">Stop Loss</label>
            <span className="text-[9px] text-rose-400 font-semibold">{slPct}%</span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={slPct}
              onChange={(e) => handleSlPctChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#0B101B] border border-rose-900/50 rounded-lg px-2 py-1 text-rose-300 font-bold focus:outline-none focus:border-rose-500 font-mono text-xs"
            />
            <span className="absolute right-2 top-1.5 text-[9px] text-slate-500">%</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-1 block truncate">
            ≈ ${stopLossPrice.toLocaleString()}
          </span>
          <span className="text-[9px] text-rose-400 block">
            Risk: -${plannedRiskUSD.toFixed(1)}
          </span>
        </div>

        {/* Take Profit */}
        <div className="bg-[#131B2A] p-2 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-slate-400 uppercase">Take Profit</label>
            <span className="text-[9px] text-emerald-400 font-semibold">{tpPct}%</span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={tpPct}
              onChange={(e) => handleTpPctChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#0B101B] border border-emerald-900/50 rounded-lg px-2 py-1 text-emerald-300 font-bold focus:outline-none focus:border-emerald-500 font-mono text-xs"
            />
            <span className="absolute right-2 top-1.5 text-[9px] text-slate-500">%</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-1 block truncate">
            ≈ ${takeProfitPrice.toLocaleString()}
          </span>
          <span className="text-[9px] text-emerald-400 block">
            Reward: +${plannedRewardUSD.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Stop Beyond Liquidation Warning */}
      {isStopBeyondLiquidation && (
        <div className="mb-3 p-2 bg-amber-950/40 border border-amber-500/30 rounded-lg text-[10px] text-amber-300 space-y-1">
          <div className="flex items-center gap-1 font-bold">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>WARNING: Stop Beyond Liquidation</span>
          </div>
          <p>
            Est. liquidation is ${estLiquidation.toLocaleString()}, but configured stop is ${stopLossPrice.toLocaleString()}. Position may liquidate before stop triggers.
          </p>
        </div>
      )}

      {/* 6. Trailing Stop Toggle */}
      <div className="mb-3 bg-[#131B2A] p-2 rounded-lg border border-slate-800 text-[10px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 uppercase">Trailing Stop</span>
          <button
            onClick={() => setTrailingStopEnabled(!trailingStopEnabled)}
            className={`px-2 py-0.5 rounded font-bold transition-colors ${
              trailingStopEnabled
                ? "bg-blue-600 text-white"
                : "bg-[#0B101B] text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            {trailingStopEnabled ? "ON" : "OFF"}
          </button>
        </div>

        {trailingStopEnabled && (
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800">
            <div>
              <span className="text-slate-400 block">Trail %</span>
              <input
                type="number"
                step="0.1"
                value={trailPct}
                onChange={(e) => setTrailPct(parseFloat(e.target.value) || 0.5)}
                className="w-full bg-[#0B101B] border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 font-bold"
              />
            </div>
            <div>
              <span className="text-slate-400 block">Activate After %</span>
              <input
                type="number"
                step="0.1"
                value={trailActivatePct}
                onChange={(e) => setTrailActivatePct(parseFloat(e.target.value) || 1.0)}
                className="w-full bg-[#0B101B] border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 font-bold"
              />
            </div>
          </div>
        )}
      </div>

      {/* 7. Collapsible Advanced Order Settings */}
      <div className="mb-3 bg-[#131B2A] rounded-lg border border-slate-800 overflow-hidden">
        <button
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          className="w-full px-2.5 py-2 flex items-center justify-between text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span>Advanced Order Settings</span>
          {showAdvancedSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showAdvancedSettings && (
          <div className="p-2.5 pt-0 border-t border-slate-800/80 space-y-2 text-[10px] text-slate-300">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reduceOnly}
                  onChange={(e) => setReduceOnly(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-500"
                />
                <span>Reduce-Only</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postOnly}
                  onChange={(e) => setPostOnly(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-500"
                />
                <span>Post-Only</span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span>Time In Force:</span>
              <div className="flex gap-1">
                {["GTC", "IOC", "FOK"].map((tif) => (
                  <button
                    key={tif}
                    onClick={() => setTimeInForce(tif as any)}
                    className={`px-1.5 py-0.2 rounded border ${
                      timeInForce === tif
                        ? "bg-blue-900 border-blue-500 text-blue-200"
                        : "border-slate-800 text-slate-400"
                    }`}
                  >
                    {tif}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span>Slippage Limit:</span>
              <span className="text-slate-200">{slippageLimitPct}%</span>
            </div>
          </div>
        )}
      </div>

      {/* 8. Compact Order Preview & R:R Summary */}
      <div className="bg-[#131B2A] p-2.5 rounded-lg border border-slate-800 space-y-1 mb-3 text-[11px]">
        <div className="flex items-center justify-between text-slate-400">
          <span>Notional</span>
          <span className="text-slate-200 font-semibold">${notionalValue.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Margin ({leverage}x)</span>
          <span className="text-blue-400 font-bold">${initialMargin.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Est. Liquidation</span>
          <span className="text-amber-400 font-semibold">${estLiquidation.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
          <span>Max Risk</span>
          <span className="text-rose-400 font-bold">${plannedRiskUSD.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Reward : Risk</span>
          <span className={`font-bold ${rrRatio >= 1.5 ? "text-emerald-400" : "text-amber-400"}`}>
            1 : {rrRatio} ({rrRatio >= 1.5 ? "Passed" : "Suboptimal"})
          </span>
        </div>
      </div>

      {/* 9. Single Clear Risk Check Result */}
      <div className="mb-3">
        {riskResult ? (
          <div
            onClick={() => setShowRiskModal(true)}
            className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
              riskResult.verdict === "APPROVED"
                ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                : riskResult.verdict === "APPROVED_WITH_WARNINGS"
                ? "bg-amber-950/30 border-amber-500/30 text-amber-300"
                : "bg-rose-950/30 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-1.5">
              {riskResult.verdict === "APPROVED" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : riskResult.verdict === "APPROVED_WITH_WARNINGS" ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span className="font-bold text-[11px]">
                {riskResult.verdict === "APPROVED"
                  ? "✓ Risk Check Passed"
                  : riskResult.verdict === "APPROVED_WITH_WARNINGS"
                  ? "⚠ Risk Passed with Warnings"
                  : "✕ BLOCKED"}
              </span>
            </div>
            <span className="text-[10px] underline">
              {riskResult.pass_count}/14 gates
            </span>
          </div>
        ) : (
          <div className="p-2 rounded-lg bg-[#131B2A] border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>14-Stage Risk Check Active</span>
            </div>
            <button
              onClick={handleRunRiskCheck}
              disabled={isValidating}
              className="text-blue-400 hover:underline"
            >
              {isValidating ? "Validating..." : "Verify"}
            </button>
          </div>
        )}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-2 rounded-lg border mb-3 text-[11px] font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/40 text-rose-300"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* 10. Place Order Button (Paper / Live) */}
      <button
        onClick={handleExecuteOrder}
        disabled={isExecuting || !slValidation.valid}
        className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
          !slValidation.valid
            ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
            : side === "BUY"
            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60 active:scale-98"
            : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/60 active:scale-98"
        }`}
      >
        {isExecuting ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Lock className="w-3.5 h-3.5" />
            <span>
              {executionMode === "LIVE"
                ? `PLACE LIVE ORDER`
                : `PLACE PAPER ORDER`}
            </span>
          </>
        )}
      </button>

      {/* Full 14-Stage Risk Precheck Modal */}
      {showRiskModal && riskResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B101B] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase">14-Stage Risk Report</h3>
              </div>
              <button
                onClick={() => setShowRiskModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Verdict Badge */}
            <div className="my-3 p-3 rounded-xl bg-[#131B2A] border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Final Decision</span>
                <span
                  className={`text-sm font-bold ${
                    riskResult.verdict === "APPROVED"
                      ? "text-emerald-400"
                      : riskResult.verdict === "APPROVED_WITH_WARNINGS"
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {riskResult.verdict}
                </span>
              </div>
              <div className="text-right text-[11px] font-mono">
                <span className="text-emerald-400">{riskResult.pass_count} PASS</span> •{" "}
                <span className="text-amber-400">{riskResult.warning_count} WARN</span> •{" "}
                <span className="text-rose-400">{riskResult.failed_count} FAIL</span>
              </div>
            </div>

            {/* Stage List */}
            <div className="space-y-2 mt-3">
              {riskResult.stages.map((st) => (
                <div
                  key={st.stage}
                  className="flex items-start justify-between p-2 rounded-lg bg-[#131B2A] border border-slate-800/80 text-[11px]"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold">{st.stage < 10 ? `0${st.stage}` : st.stage}</span>
                    <div>
                      <span className="text-slate-200 font-semibold block">{st.name}</span>
                      <span className="text-[10px] text-slate-400">{st.description}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                      st.status === "PASS"
                        ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                        : st.status === "WARNING"
                        ? "bg-amber-950/40 text-amber-300 border-amber-500/30"
                        : "bg-rose-950/40 text-rose-300 border-rose-500/30"
                    }`}
                  >
                    {st.status}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowRiskModal(false)}
              className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors text-xs uppercase"
            >
              Close Report
            </button>
          </div>
        </div>
      )}

      {/* Live Order Confirmation Modal */}
      {showLiveConfirmModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B101B] border border-rose-800/80 rounded-2xl w-full max-w-md shadow-2xl p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold uppercase">LIVE ORDER CONFIRMATION</h3>
            </div>

            <div className="my-4 space-y-2 text-xs text-slate-300">
              <p>
                You are submitting a <span className="font-bold text-white">REAL CAPITAL</span> live futures order on <span className="font-bold text-white">{contract?.exchange}</span>:
              </p>
              <div className="bg-[#131B2A] p-3 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Contract:</span>
                  <span className="text-white font-bold">{contract?.canonical_symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>Side:</span>
                  <span className={side === "BUY" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {side}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span className="text-white font-bold">
                    {effectiveQuantity} {underlyingSymbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Leverage:</span>
                  <span className="text-blue-400 font-bold">{leverage}x</span>
                </div>
                <div className="flex justify-between">
                  <span>Maximum Defined Risk:</span>
                  <span className="text-rose-400 font-bold">${plannedRiskUSD.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowLiveConfirmModal(false)}
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteOrder}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider"
              >
                Confirm Live Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function roundTo(num: number, decimals: number): number {
  const mult = Math.pow(10, decimals);
  return Math.round(num * mult) / mult;
}
