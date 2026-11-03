"use client";

import React, { useState } from "react";
import {
  Send,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  DollarSign,
  Layers,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";

export interface ExecutionDeskProps {
  symbol: string;
  exchange: string;
  lastPrice: number;
  availableBalance: number;
  lotSize: number;
  onSubmitOrder: (order: {
    symbol: string;
    exchange: string;
    side: "BUY" | "SELL";
    orderType: "MARKET" | "LIMIT" | "STOP_MARKET" | "STOP_LIMIT";
    quantity: number;
    price?: number;
    triggerPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    timeInForce: "DAY" | "IOC" | "GTC";
  }) => Promise<any>;
  currencySymbol?: string;
}

export function ManualExecutionDesk({
  symbol,
  exchange,
  lastPrice,
  availableBalance,
  lotSize,
  onSubmitOrder,
  currencySymbol = "₹",
}: ExecutionDeskProps) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP_MARKET" | "STOP_LIMIT">("MARKET");
  const [quantity, setQuantity] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number>(lastPrice || 0);
  const [triggerPrice, setTriggerPrice] = useState<number>(lastPrice || 0);
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [timeInForce, setTimeInForce] = useState<"DAY" | "IOC" | "GTC">("DAY");

  const [submitting, setSubmitting] = useState(false);
  const [lastSubmissionStatus, setLastSubmissionStatus] = useState<string | null>(null);

  // Dynamic calculations
  const effectivePrice = orderType === "LIMIT" ? limitPrice : lastPrice || 1;
  const estimatedNotional = quantity * lotSize * effectivePrice;
  const estimatedMargin = estimatedNotional * 0.2; // 20% margin standard
  const estimatedFees = estimatedNotional * 0.0003 + 20; // 0.03% + INR 20 brokerage
  const riskPerTrade = stopLoss ? Math.abs(effectivePrice - Number(stopLoss)) * quantity * lotSize : estimatedMargin * 0.02;
  const maxPermittedQty = Math.max(1, Math.floor(availableBalance / (effectivePrice * lotSize * 0.2 || 1)));

  const isBuy = side === "BUY";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLastSubmissionStatus("VALIDATING_RISK_GATES");

    try {
      setLastSubmissionStatus("SUBMITTED_TO_BROKER");
      const res = await onSubmitOrder({
        symbol,
        exchange,
        side,
        orderType,
        quantity,
        price: orderType === "LIMIT" || orderType === "STOP_LIMIT" ? limitPrice : undefined,
        triggerPrice: orderType === "STOP_MARKET" || orderType === "STOP_LIMIT" ? triggerPrice : undefined,
        stopLoss: stopLoss ? Number(stopLoss) : undefined,
        takeProfit: takeProfit ? Number(takeProfit) : undefined,
        timeInForce,
      });
      setLastSubmissionStatus("ACCEPTED_CONFIRMED");
    } catch (err: any) {
      setLastSubmissionStatus(`FAILED: ${err.message || "Rejected by risk engine"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-4 space-y-3.5 font-sans select-none shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1A2B43]/70">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-[#00C9E8]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Manual Order Execution Desk
          </h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-[#00C9E8] bg-[#0878FF]/15 px-2 py-0.5 rounded border border-[#0878FF]/30">
          PAPER SIMULATOR
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-xs font-mono">
        {/* Side Selector (BUY / SELL) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide("BUY")}
            className={cn(
              "py-2 rounded-[6px] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border",
              isBuy
                ? "bg-[#00D6A0] text-[#050B16] border-[#00D6A0] shadow-md shadow-[#00D6A0]/20"
                : "bg-[#050B16] text-[#91A7C1] border-[#1A2B43] hover:text-[#00D6A0]"
            )}
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>BUY / LONG</span>
          </button>
          <button
            type="button"
            onClick={() => setSide("SELL")}
            className={cn(
              "py-2 rounded-[6px] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border",
              !isBuy
                ? "bg-[#FF5268] text-white border-[#FF5268] shadow-md shadow-[#FF5268]/20"
                : "bg-[#050B16] text-[#91A7C1] border-[#1A2B43] hover:text-[#FF5268]"
            )}
          >
            <ArrowDownRight className="h-4 w-4" />
            <span>SELL / SHORT</span>
          </button>
        </div>

        {/* Order Type Selector */}
        <div className="grid grid-cols-4 gap-1.5 bg-[#050B16] p-1 rounded-[6px] border border-[#1A2B43]">
          {(["MARKET", "LIMIT", "STOP_MARKET", "STOP_LIMIT"] as const).map((ot) => (
            <button
              key={ot}
              type="button"
              onClick={() => setOrderType(ot)}
              className={cn(
                "py-1 rounded text-[10px] font-bold transition-colors cursor-pointer truncate",
                orderType === ot
                  ? "bg-[#0878FF] text-white shadow-sm"
                  : "text-[#91A7C1] hover:text-[#EAF3FF]"
              )}
            >
              {ot.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Quantity & Lot sizing */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-[#91A7C1] uppercase font-bold block mb-1">Lots</label>
            <input
              type="number"
              min={1}
              max={maxPermittedQty}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full bg-[#050B16] border border-[#1A2B43] rounded px-3 py-1.5 text-[#EAF3FF] font-bold focus:outline-none focus:border-[#00C9E8]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#91A7C1] uppercase font-bold block mb-1">Time In Force</label>
            <select
              value={timeInForce}
              onChange={(e: any) => setTimeInForce(e.target.value)}
              className="w-full bg-[#050B16] border border-[#1A2B43] rounded px-2.5 py-1.5 text-[#EAF3FF] font-bold focus:outline-none focus:border-[#00C9E8]"
            >
              <option value="DAY">DAY (Session)</option>
              <option value="IOC">IOC (Immediate)</option>
              <option value="GTC">GTC (Cancel)</option>
            </select>
          </div>
        </div>

        {/* Conditional Limit & Trigger Prices */}
        {(orderType === "LIMIT" || orderType === "STOP_LIMIT") && (
          <div>
            <label className="text-[10px] text-[#91A7C1] uppercase font-bold block mb-1">Limit Price ({currencySymbol})</label>
            <input
              type="number"
              step="0.05"
              value={limitPrice}
              onChange={(e) => setLimitPrice(Number(e.target.value))}
              className="w-full bg-[#050B16] border border-[#1A2B43] rounded px-3 py-1.5 text-[#00C9E8] font-bold focus:outline-none focus:border-[#00C9E8]"
            />
          </div>
        )}

        {(orderType === "STOP_MARKET" || orderType === "STOP_LIMIT") && (
          <div>
            <label className="text-[10px] text-[#91A7C1] uppercase font-bold block mb-1">Trigger Price ({currencySymbol})</label>
            <input
              type="number"
              step="0.05"
              value={triggerPrice}
              onChange={(e) => setTriggerPrice(Number(e.target.value))}
              className="w-full bg-[#050B16] border border-[#1A2B43] rounded px-3 py-1.5 text-[#FFB020] font-bold focus:outline-none focus:border-[#00C9E8]"
            />
          </div>
        )}

        {/* Protective Bounds (SL & TP optional inputs) */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-[#91A7C1] uppercase font-bold block mb-1">Stop-Loss (Price)</label>
            <input
              type="number"
              step="0.05"
              placeholder="Optional"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full bg-[#050B16] border border-[#1A2B43] rounded px-3 py-1.5 text-[#FF5268] font-bold placeholder-[#91A7C1]/50 focus:outline-none focus:border-[#00C9E8]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#91A7C1] uppercase font-bold block mb-1">Take-Profit (Price)</label>
            <input
              type="number"
              step="0.05"
              placeholder="Optional"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="w-full bg-[#050B16] border border-[#1A2B43] rounded px-3 py-1.5 text-[#00D6A0] font-bold placeholder-[#91A7C1]/50 focus:outline-none focus:border-[#00C9E8]"
            />
          </div>
        </div>

        {/* Dynamic Pre-Trade Estimation Calculations */}
        <div className="p-2.5 rounded-[6px] bg-[#050B16] border border-[#1A2B43] text-[11px] space-y-1">
          <div className="flex justify-between">
            <span className="text-[#91A7C1]">Estimated Notional:</span>
            <span className="text-[#EAF3FF] font-bold">{currencySymbol}{formatNumber(estimatedNotional, 2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#91A7C1]">Estimated Margin:</span>
            <span className="text-[#00C9E8] font-bold">{currencySymbol}{formatNumber(estimatedMargin, 2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#91A7C1]">Available Balance:</span>
            <span className="text-[#00D6A0] font-bold">{currencySymbol}{formatNumber(availableBalance, 2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#91A7C1]">Est. Brokerage &amp; Fees:</span>
            <span className="text-[#FFB020] font-bold">{currencySymbol}{formatNumber(estimatedFees, 2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#91A7C1]">Max Permitted Qty:</span>
            <span className="text-[#EAF3FF] font-bold">{maxPermittedQty} Lots</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || estimatedMargin > availableBalance}
          className={cn(
            "w-full py-2.5 rounded-[6px] font-bold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2",
            isBuy
              ? "bg-[#00D6A0] hover:bg-[#00B4D0] text-[#050B16] shadow-[#00D6A0]/20"
              : "bg-[#FF5268] hover:bg-[#E0294A] text-white shadow-[#FF5268]/20",
            (submitting || estimatedMargin > availableBalance) && "opacity-50 cursor-not-allowed"
          )}
        >
          <Send className="h-3.5 w-3.5" />
          <span>
            {submitting ? "Routing to Broker..." : `Execute ${side} Order`}
          </span>
        </button>

        {/* Execution Status Feedback */}
        {lastSubmissionStatus && (
          <div className="text-[10px] text-center font-bold p-1.5 rounded bg-[#050B16] border border-[#1A2B43] text-[#00C9E8]">
            Status: {lastSubmissionStatus}
          </div>
        )}
      </form>
    </div>
  );
}

