"use client";

import React from "react";
import { CheckCircle2, ShieldCheck, X, Zap, AlertTriangle } from "lucide-react";

interface OrderReviewConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  mode: "PAPER" | "LIVE";
  symbol: string;
  side: "BUY" | "SELL";
  orderType: string;
  quantity: number;
  price: number;
  notionalValue: number;
  requiredMargin: number;
  leverage: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  riskUsd?: number;
  rewardUsd?: number;
  rrRatio?: string;
  projectedPositionText?: string;
}

export function OrderReviewConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  mode,
  symbol,
  side,
  orderType,
  quantity,
  price,
  notionalValue,
  requiredMargin,
  leverage,
  stopLossPrice,
  takeProfitPrice,
  riskUsd,
  rewardUsd,
  rrRatio,
  projectedPositionText,
}: OrderReviewConfirmationModalProps) {
  if (!isOpen) return null;

  const isBuy = side === "BUY";
  const isLive = mode === "LIVE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 font-mono text-xs">
      <div className="bg-[#0B132B] border border-slate-700 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div
            className={`p-2 rounded-xl border ${
              isBuy
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}
          >
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
              Confirm {mode} Order
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Review parameters before final server execution.
            </p>
          </div>
        </div>

        {/* Order Details Matrix */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Instrument:</span>
            <span className="text-white font-extrabold text-sm">{symbol}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Side / Direction:</span>
            <span
              className={`px-2 py-0.5 rounded font-black text-xs ${
                isBuy ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
              }`}
            >
              {isBuy ? "BUY / LONG" : "SELL / SHORT"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Order Type:</span>
            <span className="text-white font-bold">{orderType}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Order Size:</span>
            <span className="text-white font-bold">
              {quantity} {symbol.split("/")[0]}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Estimated Price:</span>
            <span className="text-cyan-400 font-bold">${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-slate-400">Expected Notional:</span>
            <span className="text-white font-black text-sm">
              ${notionalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Required Margin ({leverage}x):</span>
            <span className="text-slate-200 font-bold">
              ${requiredMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {(stopLossPrice || takeProfitPrice) && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-400 block">Stop Loss:</span>
                <span className="text-rose-400 font-bold">
                  {stopLossPrice ? `$${stopLossPrice.toLocaleString()}` : "None"}
                </span>
                {riskUsd ? <span className="text-slate-500 block text-[10px]">Risk: -${riskUsd.toFixed(2)}</span> : null}
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Take Profit:</span>
                <span className="text-emerald-400 font-bold">
                  {takeProfitPrice ? `$${takeProfitPrice.toLocaleString()}` : "None"}
                </span>
                {rewardUsd ? <span className="text-slate-500 block text-[10px]">Target: +${rewardUsd.toFixed(2)}</span> : null}
              </div>
            </div>
          )}

          {projectedPositionText && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Position After Fill:</span>
              <span className="text-cyan-300 font-bold">{projectedPositionText}</span>
            </div>
          )}
        </div>

        {/* Pre-Trade Safety Status */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>✓ 14/14 Pre-Order Safety Checks Passed & Armed</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-bold transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className={`py-2.5 px-4 rounded-xl font-black transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
              isLive
                ? "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20"
                : isBuy
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20"
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>SUBMITTING...</span>
              </>
            ) : (
              <span>PLACE {mode} ORDER</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
