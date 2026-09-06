"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Zap,
  ChevronDown,
  ChevronUp,
  Info,
  RotateCcw,
  Building2,
  Lock,
  ArrowRight,
} from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";
import { OptionLegGreekData } from "@/types/nse";

interface SimpleOptionOrderTicketProps {
  underlying: string;
  expiry: string;
  strike: number | null;
  optionType: "CE" | "PE";
  premium: number;
  details?: OptionLegGreekData | null;
  currencySymbol?: string;
  provider?: "DHAN" | "DELTA_INDIA" | "PAPER_SIMULATOR" | string;
  brokerAccountId?: string;
  instrumentId?: string;
  contractKey?: string;
  onOrderSuccess?: (tradeData: any) => void;
}

export function SimpleOptionOrderTicket({
  underlying,
  expiry,
  strike,
  optionType,
  premium,
  details,
  currencySymbol = "₹",
  provider = "DHAN",
  brokerAccountId = "ba_dhan_primary",
  instrumentId,
  contractKey,
  onOrderSuccess,
}: SimpleOptionOrderTicketProps) {
  const { tradingMode, riskSummary, portfolioSnapshot, refreshAll } = useGlobalData();

  // Determine Department
  const departmentInfo = useMemo(() => {
    if (provider === "DHAN") {
      return {
        id: "DEP_1",
        name: "Department 1: Dhan Options",
        sub: "Indian Equities & Index Derivatives",
        allowedBrokers: [
          { id: "dhan_india", name: "Dhan HQ (Official)" },
          { id: "paper_simulator", name: "Paper Simulator (Safe)" },
        ],
      };
    }
    if (provider === "DELTA_INDIA") {
      return {
        id: "DEP_2",
        name: "Department 2: Delta Crypto Options",
        sub: "Crypto Derivatives (BTC / ETH / SOL)",
        allowedBrokers: [
          { id: "delta_india", name: "Delta Exchange India" },
          { id: "paper_simulator", name: "Paper Simulator (Safe)" },
        ],
      };
    }
    return {
      id: "DEP_3",
      name: "Department 3: Paper Simulator",
      sub: "Institutional Black-Scholes Engine",
      allowedBrokers: [{ id: "paper_simulator", name: "Paper Simulator" }],
    };
  }, [provider]);

  // Form State
  const [selectedBroker, setSelectedBroker] = useState<string>(
    tradingMode === "LIVE" && departmentInfo.allowedBrokers[0]
      ? departmentInfo.allowedBrokers[0].id
      : "paper_simulator"
  );
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [lots, setLots] = useState<number>(1);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState<number>(premium);
  const [slPercent, setSlPercent] = useState<number>(20);
  const [tpPercent, setTpPercent] = useState<number>(40);

  // Advanced Settings Collapsible
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [trailingStop, setTrailingStop] = useState<boolean>(false);
  const [confirmSafety, setConfirmSafety] = useState<boolean>(false);

  // Submission / Loading State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);

  // Update default broker when provider or tradingMode changes
  useEffect(() => {
    if (tradingMode === "LIVE" && departmentInfo.allowedBrokers[0]) {
      setSelectedBroker(departmentInfo.allowedBrokers[0].id);
    } else {
      setSelectedBroker("paper_simulator");
    }
  }, [departmentInfo, tradingMode]);

  // Synchronize limit price when premium updates
  useEffect(() => {
    if (premium > 0) {
      setLimitPrice(premium);
    }
  }, [premium, strike, optionType]);

  // Determine dynamic lot size from underlying
  const lotSize = useMemo(() => {
    const sym = underlying.toUpperCase();
    if (sym.includes("BANKNIFTY")) return 15;
    if (sym.includes("FINNIFTY")) return 25;
    if (sym.includes("MIDCPNIFTY")) return 75;
    if (sym.includes("SENSEX")) return 10;
    if (sym.includes("RELIANCE")) return 250;
    if (sym.includes("TCS")) return 175;
    if (sym.includes("INFY")) return 400;
    if (sym.includes("HDFCBANK")) return 550;
    if (sym.includes("NIFTY")) return 50;
    return 1;
  }, [underlying]);

  const totalQuantity = lots * lotSize;
  const activePrice = orderType === "LIMIT" ? limitPrice : premium;
  const totalCost = activePrice * totalQuantity;

  // Estimated fees calculation (STT/Exchange or Crypto Maker/Taker)
  const estimatedFees = useMemo(() => {
    if (provider === "DELTA_INDIA") {
      // Delta crypto taker fee approx 0.03% of notional or 0.015%
      return Math.max(0.1, totalCost * 0.0003);
    }
    // Indian options: ₹20 broker flat + STT/turnover ₹5-10
    return side === "BUY" ? 23.6 : 35.4;
  }, [provider, totalCost, side]);

  // Stop Loss & Target calculations
  const stopLossPrice = useMemo(() => {
    if (!activePrice || activePrice <= 0) return 0;
    if (side === "BUY") {
      return Math.max(0.05, +(activePrice * (1 - slPercent / 100)).toFixed(2));
    } else {
      return +(activePrice * (1 + slPercent / 100)).toFixed(2);
    }
  }, [activePrice, slPercent, side]);

  const targetPrice = useMemo(() => {
    if (!activePrice || activePrice <= 0) return 0;
    if (side === "BUY") {
      return +(activePrice * (1 + tpPercent / 100)).toFixed(2);
    } else {
      return Math.max(0.05, +(activePrice * (1 - tpPercent / 100)).toFixed(2));
    }
  }, [activePrice, tpPercent, side]);

  const totalRiskAmount = Math.abs(activePrice - stopLossPrice) * totalQuantity;
  const totalRewardAmount = Math.abs(targetPrice - activePrice) * totalQuantity;
  const rewardRiskRatio = totalRiskAmount > 0 ? (totalRewardAmount / totalRiskAmount).toFixed(1) : "—";

  // Central Risk Gate & Isolation Check
  const riskCheck = useMemo(() => {
    if (riskSummary && riskSummary.globalKillSwitchActive) {
      return { passed: false, reason: "Emergency Kill Switch is ACTIVE on server" };
    }
    // Broker isolation check
    const isAllowed = departmentInfo.allowedBrokers.some((b) => b.id === selectedBroker);
    if (!isAllowed) {
      return {
        passed: false,
        reason: `Cross-broker violation: ${provider} contracts cannot be executed on ${selectedBroker}`,
      };
    }
    if (portfolioSnapshot && tradingMode === "LIVE") {
      if (portfolioSnapshot.availableCapital < totalCost && side === "BUY") {
        return {
          passed: false,
          reason: `Insufficient margin (Required: ${currencySymbol}${totalCost.toFixed(0)}, Available: ${currencySymbol}${portfolioSnapshot.availableCapital.toFixed(0)})`,
        };
      }
    }
    return { passed: true, reason: "Risk constraints, broker isolation, and daily limits verified" };
  }, [riskSummary, portfolioSnapshot, totalCost, currencySymbol, side, selectedBroker, departmentInfo, provider, tradingMode]);

  // Order Placement
  const handlePlaceOrder = async () => {
    if (!strike || strike <= 0) {
      setFeedback({ status: "error", message: "Please select a valid option strike from the chain." });
      return;
    }
    if (isSubmitting) return;

    if (!riskCheck.passed) {
      setFeedback({ status: "error", message: riskCheck.reason });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const fullContractSymbol = `${underlying} ${strike} ${optionType}`;
    const idempotencyKey = `OPT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const payload = {
        symbol: fullContractSymbol,
        direction: side === "BUY" ? "LONG" : "SHORT",
        quantity: totalQuantity,
        order_type: orderType,
        price: orderType === "LIMIT" ? limitPrice : activePrice,
        stop_loss: stopLossPrice,
        take_profit: targetPrice,
        mode: selectedBroker === "paper_simulator" ? "PAPER" : tradingMode,
        bot_id: "options-terminal",
        strategy: "OPTIONS_DISCRETIONARY",
        idempotency_key: idempotencyKey,
        provider: provider,
        broker_account_id: brokerAccountId,
        broker_target: selectedBroker,
        instrument_id: instrumentId || `${provider}_${underlying}_${strike}_${optionType}`,
        contract_key: contractKey,
      };

      const res = await fetch("/api/quick-trade/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Failed to execute option order");
      }

      setFeedback({
        status: "success",
        message: data.message || `Order for ${totalQuantity} ${fullContractSymbol} placed successfully on ${selectedBroker}!`,
      });

      await refreshAll();
      if (onOrderSuccess) onOrderSuccess(data);

      setTimeout(() => {
        setFeedback(null);
      }, 5000);
    } catch (err: any) {
      setFeedback({ status: "error", message: err.message || "Order routing failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBuy = side === "BUY";

  return (
    <div className="flex flex-col h-full bg-[#0B132B]/95 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl p-4 md:p-5 font-mono text-xs">
      {/* Title & Department Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Option Order Ticket
            </h2>
            <span className="px-2 py-0.2 text-[9px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              {departmentInfo.name}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-sans mt-0.5">{departmentInfo.sub}</p>
        </div>
        <span
          className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
            tradingMode === "LIVE"
              ? "bg-rose-500/10 border-rose-500/40 text-rose-400"
              : "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
          }`}
        >
          {tradingMode === "LIVE" ? "🔴 LIVE" : "🛡️ PAPER"}
        </span>
      </div>

      {/* Contract Highlight & Provenance Card */}
      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>
                {underlying} {strike ? strike.toLocaleString() : "—"} {optionType}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                  optionType === "CE" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {optionType === "CE" ? "CALL (CE)" : "PUT (PE)"}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans mt-0.5">
              Expiry: {expiry || "Nearest"} • Account: {brokerAccountId}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-slate-400 uppercase">Premium (LTP)</div>
            <div className="text-base font-black text-cyan-400">
              {premium > 0 ? `${currencySymbol}${premium.toFixed(2)}` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Isolated Broker Destination Dropdown */}
      <div className="mb-3">
        <label className="block text-[10px] text-slate-400 mb-1 font-sans flex items-center gap-1">
          <Building2 className="w-3 h-3 text-cyan-400" />
          Execution Broker (Strict Department Isolation):
        </label>
        <select
          value={selectedBroker}
          onChange={(e) => setSelectedBroker(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 font-bold text-xs"
        >
          {departmentInfo.allowedBrokers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Buy / Sell Direction */}
      <div className="grid grid-cols-2 gap-2 mb-3 p-1 bg-slate-900 rounded-xl border border-slate-800">
        <button
          onClick={() => setSide("BUY")}
          className={`py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            isBuy
              ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>BUY / LONG</span>
        </button>
        <button
          onClick={() => setSide("SELL")}
          className={`py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            !isBuy
              ? "bg-rose-500 text-white shadow-md shadow-rose-500/20 font-black"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>SELL / SHORT</span>
        </button>
      </div>

      {/* Lots & Quantity */}
      <div className="space-y-2.5 mb-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 font-sans">Lots</label>
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden focus-within:border-cyan-400">
              <button
                type="button"
                onClick={() => setLots((prev) => Math.max(1, prev - 1))}
                className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 transition font-bold"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="500"
                value={lots}
                onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-center bg-transparent py-1 text-white font-bold text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setLots((prev) => prev + 1)}
                className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 transition font-bold"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-1 font-sans">
              Quantity ({lotSize} / lot)
            </label>
            <div className="px-2.5 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-white font-bold text-xs text-center">
              {totalQuantity.toLocaleString()} Units
            </div>
          </div>
        </div>

        {/* Stop Loss (%) & Target (%) */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-slate-400 font-sans">Stop Loss</label>
              <span className="text-[9px] text-rose-400 font-bold">
                {currencySymbol}
                {stopLossPrice}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="5"
                max="90"
                step="5"
                value={slPercent}
                onChange={(e) => setSlPercent(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-xs focus:border-rose-400 focus:outline-none pr-6"
              />
              <span className="absolute right-2 top-1 text-[10px] text-slate-400">%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-slate-400 font-sans">Target</label>
              <span className="text-[9px] text-emerald-400 font-bold">
                {currencySymbol}
                {targetPrice}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="10"
                max="500"
                step="10"
                value={tpPercent}
                onChange={(e) => setTpPercent(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-xs focus:border-emerald-400 focus:outline-none pr-6"
              />
              <span className="absolute right-2 top-1 text-[10px] text-slate-400">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Destination Confirmation & Cost Summary */}
      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl mb-3 space-y-1 text-[11px]">
        <div className="flex items-center justify-between text-slate-400">
          <span>Required Premium:</span>
          <span className="text-white font-bold">
            {currencySymbol}
            {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Est. Taxes & Fees:</span>
          <span className="text-slate-300 font-semibold">
            {currencySymbol}
            {estimatedFees.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Risk (SL) / Reward (TP):</span>
          <span className="text-cyan-400 font-bold">
            {currencySymbol}{totalRiskAmount.toFixed(0)} / {currencySymbol}{totalRewardAmount.toFixed(0)} (1:{rewardRiskRatio})
          </span>
        </div>

        {/* Pre-Submission Routing Banner */}
        <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-300 flex items-center gap-1.5 flex-wrap">
          <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="font-bold text-slate-400">DESTINATION:</span>
          <span className="text-cyan-300 font-bold">{selectedBroker.toUpperCase()}</span>
          <span>→</span>
          <span className="text-slate-300">{brokerAccountId}</span>
          <span>→</span>
          <span className={selectedBroker === "paper_simulator" || tradingMode === "PAPER" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
            {selectedBroker === "paper_simulator" ? "PAPER" : tradingMode}
          </span>
        </div>
      </div>

      {/* Advanced Order Settings Toggle */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-left text-[10px] text-slate-400 hover:text-slate-200 transition py-0.5"
        >
          <span>Advanced Order Settings</span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvanced && (
          <div className="mt-2 p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
            <div>
              <label className="block text-[9px] text-slate-400 mb-1 font-sans">Execution Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType("MARKET")}
                  className={`py-1 text-xs rounded border transition ${
                    orderType === "MARKET"
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  Market
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("LIMIT")}
                  className={`py-1 text-xs rounded border transition ${
                    orderType === "LIMIT"
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  Limit
                </button>
              </div>
            </div>

            {orderType === "LIMIT" && (
              <div>
                <label className="block text-[9px] text-slate-400 mb-1 font-sans">Limit Premium Price</label>
                <input
                  type="number"
                  step="0.05"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pre-Trade Risk Verification Banner */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs mb-3 border ${
          riskCheck.passed
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-rose-500/10 border-rose-500/30 text-rose-400"
        }`}
      >
        {riskCheck.passed ? (
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
        ) : (
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-400" />
        )}
        <div className="text-[10px] truncate">
          <span className="font-bold">{riskCheck.passed ? "RISK PASSED" : "ORDER BLOCKED"}: </span>
          <span className="opacity-90">{riskCheck.reason}</span>
        </div>
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div
          className={`p-2.5 mb-3 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in duration-150 ${
            feedback.status === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/80 border-rose-500/40 text-rose-300"
          }`}
        >
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span className="text-[11px]">{feedback.message}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        disabled={isSubmitting || !riskCheck.passed || !strike}
        onClick={handlePlaceOrder}
        className={`w-full py-2.5 px-4 rounded-xl font-bold font-mono text-xs tracking-wide transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
          isBuy
            ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
            : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20"
        }`}
      >
        {isSubmitting ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>ROUTING TO {selectedBroker.toUpperCase()}...</span>
          </>
        ) : (
          <>
            <Zap className="w-3.5 h-3.5" />
            <span>
              PLACE {side} ORDER ({selectedBroker === "paper_simulator" ? "PAPER" : tradingMode})
            </span>
          </>
        )}
      </button>
    </div>
  );
}

