"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Zap,
  TrendingUp,
  TrendingDown,
  Lock,
  Clock,
  DollarSign,
  Layers,
  ArrowRight,
  Sliders,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { CanonicalFuturesContract, MarginMode } from "../types/futures";
import { useFuturesStore } from "../state/futures-store";
import { submitFuturesOrderIntent, calculateLiquidation } from "../api/futures-api";

interface OrderReviewModalProps {
  contract: CanonicalFuturesContract | null;
  side: "BUY" | "SELL" | "LONG" | "SHORT";
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess?: (result: any) => void;
}

export function OrderReviewModal({
  contract,
  side,
  isOpen,
  onClose,
  onOrderSuccess,
}: OrderReviewModalProps) {
  const { leverage, setLeverage, marginMode, setMarginMode, executionMode } = useFuturesStore();

  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [quantity, setQuantity] = useState<number>(contract?.min_qty || 1.0);
  const [limitPrice, setLimitPrice] = useState<number>(contract?.mark_price || 0.0);
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ status: "SUCCESS" | "ERROR"; message: string } | null>(null);
  const [liqPrice, setLiqPrice] = useState<number | null>(null);

  const normalizedSide = side === "LONG" || side === "BUY" ? "BUY" : "SELL";
  const effectivePrice = orderType === "LIMIT" && limitPrice > 0 ? limitPrice : (contract?.mark_price || contract?.last_price || 0.0);
  const multiplier = contract?.contract_multiplier || 1.0;
  const estimatedNotional = quantity * effectivePrice * multiplier;
  const requiredMargin = leverage > 0 ? estimatedNotional / leverage : estimatedNotional;
  const estimatedFee = estimatedNotional * ((contract?.taker_fee_pct || 0.05) / 100);

  useEffect(() => {
    if (contract) {
      setQuantity(contract.min_qty || 1.0);
      setLimitPrice(contract.mark_price || contract.last_price || 0.0);
      calculateLiquidation({
        side: normalizedSide,
        entryPrice: effectivePrice,
        leverage,
      }).then((res) => {
        if (res) setLiqPrice(res.liquidationPrice);
      });
    }
  }, [contract, normalizedSide, effectivePrice, leverage]);

  if (!isOpen || !contract) return null;

  const isContractConnected = contract.status === "CONNECTED" || contract.status === "LIVE";
  const currSymbol = contract.exchange === "NSE" || contract.currency === "INR" ? "₹" : "$";

  const handleExecute = async () => {
    if (!isContractConnected) {
      setFeedback({
        status: "ERROR",
        message: `Order blocked: Market data source ${contract.provider} is ${contract.status}`,
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const res = await submitFuturesOrderIntent({
      symbol: contract.symbol,
      side: normalizedSide,
      quantity,
      order_type: orderType,
      limit_price: orderType === "LIMIT" ? limitPrice : undefined,
      leverage,
      margin_mode: marginMode,
      stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
      take_profit: takeProfit ? parseFloat(takeProfit) : undefined,
      mode: executionMode,
    });

    setIsSubmitting(false);

    if (res.status === "SUCCESS" && res.result) {
      setFeedback({
        status: "SUCCESS",
        message: res.result.message || "Order intent executed successfully",
      });
      if (onOrderSuccess) onOrderSuccess(res.result);
      setTimeout(() => {
        onClose();
        setFeedback(null);
      }, 2000);
    } else {
      setFeedback({
        status: "ERROR",
        message: res.message || "Order intent submission failed",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#0B132B] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden font-mono text-xs text-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#080C14]">
          <div className="flex items-center gap-2.5">
            <div
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                normalizedSide === "BUY"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-red-500/20 text-red-400 border border-red-500/40"
              }`}
            >
              {normalizedSide === "BUY" ? "LONG / BUY" : "SHORT / SELL"}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{contract.displayName || contract.symbol}</h3>
              <span className="text-[10px] text-slate-400">
                {contract.canonical_symbol || contract.symbol} • {contract.contract_type}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">
          {/* Institutional Provenance & Routing Integrity */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px]">
            <div>
              <span className="text-[9px] text-slate-500 uppercase block">Data Provider</span>
              <strong className="text-slate-200 truncate block">{contract.provider || "Official Feed"}</strong>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase block">Execution Broker</span>
              <strong className="text-cyan-400 truncate block">{contract.execution_broker || "PAPER_SIM"}</strong>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase block">Exchange / Env</span>
              <strong className="text-white block">{contract.exchange} • <span className="text-emerald-400">{executionMode}</span></strong>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase block">Mark / Index</span>
              <strong className="text-slate-200 block">
                {contract.mark_price != null ? `${currSymbol}${contract.mark_price.toLocaleString()}` : "—"}
              </strong>
            </div>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                feedback.status === "SUCCESS"
                  ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                  : "bg-red-950/80 border-red-500/50 text-red-300"
              }`}
            >
              {feedback.status === "SUCCESS" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Order Type & Price Controls */}
          <div className="space-y-3 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white uppercase">Order Parameters</span>
              <div className="flex items-center gap-1 bg-[#080C14] p-0.5 rounded-lg border border-slate-800">
                {(["MARKET", "LIMIT"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                      orderType === t ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Quantity ({contract.underlying})</label>
                <input
                  type="number"
                  step="0.001"
                  min={contract.min_qty || 0.001}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(contract.min_qty || 0.001, parseFloat(e.target.value) || 0))}
                  className="w-full bg-[#080C14] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              {orderType === "LIMIT" && (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Limit Price ({currSymbol})</label>
                  <input
                    type="number"
                    step="0.1"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#080C14] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}
            </div>

            {/* Leverage & Margin Mode */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Leverage: <strong className="text-cyan-300">{leverage}x</strong></span>
                <div className="flex items-center gap-1">
                  {(["ISOLATED", "CROSS"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMarginMode(m)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold border transition ${
                        marginMode === m
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                          : "bg-slate-950 text-slate-500 border-slate-800"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min="1"
                max={contract.max_leverage || 100}
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Risk & Notional Calculation Summary */}
          <div className="p-3.5 bg-[#080C14] rounded-xl border border-slate-800 space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Estimated Notional:</span>
              <span className="text-white font-bold">{currSymbol}{estimatedNotional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Required Margin:</span>
              <span className="text-cyan-300 font-bold">{currSymbol}{requiredMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Estimated Fee (Taker):</span>
              <span className="text-slate-300">{currSymbol}{estimatedFee.toFixed(2)}</span>
            </div>
            {liqPrice && (
              <div className="flex justify-between pt-1 border-t border-slate-800/80">
                <span className="text-red-400">Est. Liquidation Price:</span>
                <span className="text-red-400 font-bold">{currSymbol}{liqPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-[#080C14] flex items-center justify-between gap-3">
          <div className="text-[10px] text-slate-400">
            Mode: <strong className="text-emerald-400">{executionMode}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleExecute}
              disabled={isSubmitting || !isContractConnected}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-50 ${
                normalizedSide === "BUY"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
                  : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white"
              }`}
            >
              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>
                Confirm {normalizedSide} ({leverage}x)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
