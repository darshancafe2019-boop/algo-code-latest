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
  // Sizing & Direction
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP_MARKET">("MARKET");
  const [sizingMode, setSizingMode] = useState<"BASE" | "NOTIONAL" | "PERCENT" | "RISK">("BASE");
  const [quantity, setQuantity] = useState<number>(0.02);
  const [notionalInput, setNotionalInput] = useState<number>(1300);
  const [riskInput, setRiskInput] = useState<number>(50);
  const [limitPrice, setLimitPrice] = useState<number>(contract?.last_price || 65000);
  const [leverage, setLeverage] = useState<number>(5);
  const [marginMode, setMarginMode] = useState<"ISOLATED" | "CROSS">("ISOLATED");

  // Brackets
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [takeProfit, setTakeProfit] = useState<number>(0);
  const [tpMode, setTpMode] = useState<"SINGLE" | "MULTI">("SINGLE");
  const [reduceOnly, setReduceOnly] = useState<boolean>(false);
  const [postOnly, setPostOnly] = useState<boolean>(false);
  const [timeInForce, setTimeInForce] = useState<"GTC" | "IOC" | "FOK">("GTC");

  // Risk Precheck & Execution States
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [riskResult, setRiskResult] = useState<RiskPrecheckResponse | null>(null);
  const [showRiskModal, setShowRiskModal] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showLiveConfirmModal, setShowLiveConfirmModal] = useState<boolean>(false);

  // Sync contract price defaults
  useEffect(() => {
    if (contract) {
      const p = contract.last_price;
      setLimitPrice(p);
      setStopLoss(side === "BUY" ? roundTo(p * 0.98, 1) : roundTo(p * 1.02, 1));
      setTakeProfit(side === "BUY" ? roundTo(p * 1.05, 1) : roundTo(p * 0.95, 1));
    }
  }, [contract, side]);

  // Price used for calculations
  const activePrice = orderType === "MARKET" ? contract?.last_price || 65000 : limitPrice || contract?.last_price || 65000;

  // Compute effective quantity based on sizing mode
  const effectiveQuantity = useMemo(() => {
    if (sizingMode === "BASE") return quantity;
    if (sizingMode === "NOTIONAL") return roundTo(notionalInput / Math.max(1, activePrice), 4);
    if (sizingMode === "PERCENT") return roundTo((8500 * (quantity / 100) * leverage) / Math.max(1, activePrice), 4);
    if (sizingMode === "RISK") {
      const stopDist = Math.abs(activePrice - stopLoss);
      if (stopDist > 0) return roundTo(riskInput / stopDist, 4);
      return quantity;
    }
    return quantity;
  }, [sizingMode, quantity, notionalInput, riskInput, activePrice, stopLoss, leverage]);

  // Derived financials
  const notionalValue = roundTo(effectiveQuantity * activePrice, 2);
  const initialMargin = roundTo(notionalValue / Math.max(1, leverage), 2);
  const maintenanceMargin = roundTo(notionalValue * 0.005, 2);

  // Stop / Target Metrics
  const stopDistance = Math.abs(activePrice - stopLoss);
  const targetDistance = Math.abs(takeProfit - activePrice);
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

  const liqDistancePct = roundTo((Math.abs(estLiquidation - activePrice) / Math.max(1, activePrice)) * 100.0, 2);

  // True Break Even
  const trueBreakEven = useMemo(() => {
    const feeRate = orderType === "LIMIT" ? 0.0002 : 0.0005;
    const totalFees = notionalValue * feeRate * 2;
    const fundingDrag = notionalValue * 0.0001;
    const offset = (totalFees + fundingDrag) / Math.max(0.0001, effectiveQuantity);
    return side === "BUY" ? roundTo(activePrice + offset, 2) : roundTo(activePrice - offset, 2);
  }, [activePrice, notionalValue, effectiveQuantity, orderType, side]);

  // Run 14-Stage Risk Pre-Check
  const handleRunRiskCheck = async () => {
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
          stop_loss: stopLoss,
          take_profit: takeProfit,
          margin_mode: marginMode,
        }),
      });
      const data: RiskPrecheckResponse = await res.json();
      setRiskResult(data);
      setShowRiskModal(true);
    } catch {
      setFeedback({ type: "error", message: "Failed to evaluate server-side risk pre-check." });
    } finally {
      setIsValidating(false);
    }
  };

  // Submit Order (Idempotent)
  const handleExecuteOrder = async () => {
    if (!contract) return;
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
          order_type: orderType,
          quantity: effectiveQuantity,
          price: activePrice,
          stop_loss: stopLoss,
          take_profit: takeProfit,
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
          message: `✅ ${executionMode} Order Executed: ${data.order.order_id}`,
        });
        onOrderExecuted(data.order.order_id);
      } else {
        setFeedback({
          type: "error",
          message: `❌ Order Rejected: ${data.message || "Risk pre-check failed."}`,
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error executing order." });
    } finally {
      setIsExecuting(false);
    }
  };

  const leveragePresets = [1, 2, 3, 5, 10, 20, 50];

  return (
    <div className="bg-[#0B101B] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col font-mono text-xs select-none">
      {/* Header with Environment Tag */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Risk-Managed Order Desk
          </h2>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
            executionMode === "LIVE"
              ? "bg-rose-950/40 text-rose-300 border-rose-500/30 animate-pulse"
              : "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
          }`}
        >
          {executionMode === "LIVE" ? "REAL MONEY" : "PAPER MODE"}
        </span>
      </div>

      {/* Direction: Long vs Short */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setSide("BUY")}
          className={`py-2 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all ${
            side === "BUY"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 border border-emerald-500"
              : "bg-[#131B2A] text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>LONG / BUY</span>
        </button>

        <button
          onClick={() => setSide("SELL")}
          className={`py-2 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all ${
            side === "SELL"
              ? "bg-rose-600 text-white shadow-lg shadow-rose-950/50 border border-rose-500"
              : "bg-[#131B2A] text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>SHORT / SELL</span>
        </button>
      </div>

      {/* Margin Mode & Order Type Row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Margin Mode */}
        <div>
          <label className="text-[10px] text-slate-400 block mb-1 uppercase">Margin Mode</label>
          <div className="flex bg-[#131B2A] p-0.5 rounded-lg border border-slate-800">
            {["ISOLATED", "CROSS"].map((m) => (
              <button
                key={m}
                onClick={() => setMarginMode(m as any)}
                className={`flex-1 py-1 rounded text-[10px] font-semibold ${
                  marginMode === m ? "bg-blue-600 text-white" : "text-slate-400"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Order Type */}
        <div>
          <label className="text-[10px] text-slate-400 block mb-1 uppercase">Order Type</label>
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as any)}
            className="w-full bg-[#131B2A] border border-slate-800 rounded-lg p-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="MARKET">Market</option>
            <option value="LIMIT">Limit</option>
            <option value="STOP_MARKET">Stop Market</option>
          </select>
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
            className="w-full bg-[#131B2A] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      {/* Sizing Modes */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-slate-400 uppercase">Quantity / Sizing</label>
          <div className="flex gap-1 text-[9px]">
            {["BASE", "NOTIONAL", "RISK"].map((sm) => (
              <button
                key={sm}
                onClick={() => setSizingMode(sm as any)}
                className={`px-1.5 py-0.2 rounded border ${
                  sizingMode === sm
                    ? "bg-blue-950/60 border-blue-500 text-blue-300"
                    : "border-slate-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                {sm === "BASE" ? contract?.underlying || "BTC" : sm === "NOTIONAL" ? "USDT $" : "Risk $"}
              </button>
            ))}
          </div>
        </div>

        {sizingMode === "BASE" && (
          <input
            type="number"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            className="w-full bg-[#131B2A] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-blue-500"
          />
        )}

        {sizingMode === "NOTIONAL" && (
          <input
            type="number"
            step="100"
            value={notionalInput}
            onChange={(e) => setNotionalInput(parseFloat(e.target.value) || 0)}
            placeholder="USDT Notional..."
            className="w-full bg-[#131B2A] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-blue-500"
          />
        )}

        {sizingMode === "RISK" && (
          <input
            type="number"
            step="10"
            value={riskInput}
            onChange={(e) => setRiskInput(parseFloat(e.target.value) || 0)}
            placeholder="Fixed Max Risk $..."
            className="w-full bg-[#131B2A] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-blue-500"
          />
        )}

        <span className="text-[10px] text-slate-500 mt-1 block">
          Effective Size: <span className="text-slate-300 font-semibold">{effectiveQuantity} {contract?.underlying || "BTC"}</span> (${notionalValue.toLocaleString()})
        </span>
      </div>

      {/* Leverage Control */}
      <div className="mb-3 bg-[#131B2A] p-2.5 rounded-lg border border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-slate-400 uppercase">Leverage Multiplier</span>
          <span className="text-xs font-bold text-blue-400">{leverage}x</span>
        </div>

        {/* Quick buttons */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {leveragePresets.map((lev) => (
            <button
              key={lev}
              onClick={() => setLeverage(lev)}
              className={`py-1 rounded text-[10px] font-bold ${
                leverage === lev ? "bg-blue-600 text-white" : "bg-[#0B101B] text-slate-400 hover:text-slate-200"
              }`}
            >
              {lev}x
            </button>
          ))}
        </div>

        {/* High leverage warning */}
        {leverage >= 20 && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-950/30 p-1.5 rounded border border-amber-500/20 mt-1">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>High Leverage: Liquidation distance is {liqDistancePct}%</span>
          </div>
        )}
      </div>

      {/* Stop Loss & Take Profit Bracket */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Stop Loss */}
        <div>
          <label className="text-[10px] text-slate-400 block mb-1 uppercase">Stop Loss ($)</label>
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
            className="w-full bg-[#131B2A] border border-rose-900/50 rounded-lg px-2 py-1 text-rose-300 font-bold focus:outline-none focus:border-rose-500"
          />
          <span className="text-[9px] text-slate-500 mt-0.5 block">
            Risk: -${plannedRiskUSD.toFixed(1)}
          </span>
        </div>

        {/* Take Profit */}
        <div>
          <label className="text-[10px] text-slate-400 block mb-1 uppercase">Take Profit ($)</label>
          <input
            type="number"
            value={takeProfit}
            onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
            className="w-full bg-[#131B2A] border border-emerald-900/50 rounded-lg px-2 py-1 text-emerald-300 font-bold focus:outline-none focus:border-emerald-500"
          />
          <span className="text-[9px] text-slate-500 mt-0.5 block">
            Reward: +${plannedRewardUSD.toFixed(1)} ({rrRatio}R)
          </span>
        </div>
      </div>

      {/* Advanced Options Checkboxes */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-3 bg-[#131B2A] p-2 rounded-lg border border-slate-800">
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

        <span className="text-slate-500">TIF: GTC</span>
      </div>

      {/* Pre-Trade Financial Summary Card */}
      <div className="bg-[#131B2A] p-2.5 rounded-lg border border-slate-800 space-y-1.5 mb-3 text-[11px]">
        <div className="flex items-center justify-between text-slate-400">
          <span>Notional Value</span>
          <span className="text-slate-200 font-semibold">${notionalValue.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Required Margin</span>
          <span className="text-blue-400 font-bold">${initialMargin.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Est. Liquidation</span>
          <span className="text-amber-400 font-semibold">${estLiquidation.toLocaleString()} ({liqDistancePct}%)</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>True Break-Even</span>
          <span className="text-slate-200 font-semibold">${trueBreakEven.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
          <span>Risk : Reward</span>
          <span className={`font-bold ${rrRatio >= 1.5 ? "text-emerald-400" : "text-amber-400"}`}>
            1 : {rrRatio} ({rrRatio >= 1.5 ? "Optimal" : "Suboptimal"})
          </span>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-2.5 rounded-lg border mb-3 text-[11px] font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/40 text-rose-300"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Action Buttons: 14-Stage Check + Submit */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleRunRiskCheck}
          disabled={isValidating}
          className="w-full py-2 rounded-lg bg-[#1E293B] hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
        >
          <ShieldCheck className={`w-3.5 h-3.5 ${isValidating ? "animate-spin text-blue-400" : "text-blue-400"}`} />
          <span>{isValidating ? "Running 14-Stage Risk Check..." : "Run 14-Stage Risk Pre-Check"}</span>
        </button>

        <button
          onClick={handleExecuteOrder}
          disabled={isExecuting}
          className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
            side === "BUY"
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60"
              : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/60"
          }`}
        >
          {isExecuting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>
                {executionMode === "LIVE" ? `EXECUTE LIVE ${side}` : `EXECUTE PAPER ${side}`}
              </span>
            </>
          )}
        </button>
      </div>

      {/* 14-Stage Risk Precheck Modal */}
      {showRiskModal && riskResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B101B] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase">14-Stage Risk Pre-Check Report</h3>
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
              Close Pre-Check Report
            </button>
          </div>
        </div>
      )}

      {/* Live Order Double Confirmation Modal */}
      {showLiveConfirmModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B101B] border border-rose-800/80 rounded-2xl w-full max-w-md shadow-2xl p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold uppercase">Confirm Live Real-Capital Order</h3>
            </div>

            <div className="my-4 space-y-2 text-xs text-slate-300">
              <p>You are about to execute a <span className="font-bold text-white">REAL CAPITAL</span> futures order on <span className="font-bold text-white">{contract?.exchange}</span>:</p>
              <div className="bg-[#131B2A] p-3 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                <div className="flex justify-between"><span>Contract:</span><span className="text-white font-bold">{contract?.canonical_symbol}</span></div>
                <div className="flex justify-between"><span>Side:</span><span className={side === "BUY" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{side}</span></div>
                <div className="flex justify-between"><span>Quantity:</span><span className="text-white font-bold">{effectiveQuantity} {contract?.underlying}</span></div>
                <div className="flex justify-between"><span>Leverage:</span><span className="text-blue-400 font-bold">{leverage}x {marginMode}</span></div>
                <div className="flex justify-between"><span>Notional:</span><span className="text-white font-bold">${notionalValue.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Max Planned Risk:</span><span className="text-rose-400 font-bold">${plannedRiskUSD.toFixed(1)}</span></div>
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
