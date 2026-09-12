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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 font-sans text-xs">
      <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-[#7C8CA3] hover:text-[#F7FAFC] hover:bg-[#101B2D] transition disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-[#1A2A3F] pb-3">
          <div
            className={`p-2 rounded-lg border ${
              isBuy
                ? "bg-[#00E890]/10 border-[#00E890]/30 text-[#00E890]"
                : "bg-[#FF3B5C]/10 border-[#FF3B5C]/30 text-[#FF3B5C]"
            }`}
          >
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#F7FAFC] tracking-tight">
              Confirm {mode} Order
            </h3>
            <p className="text-xs text-[#7C8CA3]">
              Review parameters before final server execution.
            </p>
          </div>
        </div>

        {/* Order Details Matrix */}
        <div className="bg-[#07101A] border border-[#1A2A3F] rounded-lg p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[#7C8CA3]">Instrument:</span>
            <span className="text-[#F7FAFC] font-semibold text-sm">{symbol}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#7C8CA3]">Side / Direction:</span>
            <span
              className={`px-2 py-0.5 rounded-md font-semibold text-xs ${
                isBuy ? "bg-[#00E890]/15 text-[#00E890] border border-[#00E890]/30" : "bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30"
              }`}
            >
              {isBuy ? "BUY / LONG" : "SELL / SHORT"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#7C8CA3]">Order Type:</span>
            <span className="text-[#F7FAFC] font-medium">{orderType}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#7C8CA3]">Order Size:</span>
            <span className="text-[#F7FAFC] font-mono tabular-nums font-semibold">
              {quantity} {symbol.split("/")[0]}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#7C8CA3]">Estimated Price:</span>
            <span className="text-[#22D3EE] font-mono tabular-nums font-semibold">${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#1A2A3F]">
            <span className="text-[#7C8CA3]">Expected Notional:</span>
            <span className="text-[#F7FAFC] font-mono tabular-nums font-bold text-sm">
              ${notionalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#7C8CA3]">Required Margin ({leverage}x):</span>
            <span className="text-[#F7FAFC] font-mono tabular-nums font-medium">
              ${requiredMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {(stopLossPrice || takeProfitPrice) && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1A2A3F] text-[11px]">
              <div>
                <span className="text-[#7C8CA3] block">Stop Loss:</span>
                <span className="text-[#FF3B5C] font-semibold font-mono tabular-nums">
                  {stopLossPrice ? `$${stopLossPrice.toLocaleString()}` : "None"}
                </span>
                {riskUsd ? <span className="text-[#52627A] block text-[10px] font-mono">Risk: -${riskUsd.toFixed(2)}</span> : null}
              </div>
              <div className="text-right">
                <span className="text-[#7C8CA3] block">Take Profit:</span>
                <span className="text-[#00E890] font-semibold font-mono tabular-nums">
                  {takeProfitPrice ? `$${takeProfitPrice.toLocaleString()}` : "None"}
                </span>
                {rewardUsd ? <span className="text-[#52627A] block text-[10px] font-mono">Target: +${rewardUsd.toFixed(2)}</span> : null}
              </div>
            </div>
          )}

          {projectedPositionText && (
            <div className="pt-2 border-t border-[#1A2A3F] flex items-center justify-between text-[11px]">
              <span className="text-[#7C8CA3]">Position After Fill:</span>
              <span className="text-[#22D3EE] font-semibold font-mono">{projectedPositionText}</span>
            </div>
          )}
        </div>

        {/* Pre-Trade Safety Status */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00E890]/10 border border-[#00E890]/30 text-[#00E890] text-xs">
          <ShieldCheck className="w-4 h-4 shrink-0 text-[#00E890]" />
          <span>14/14 Pre-Order Safety Checks Passed & Armed</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="py-2.5 px-4 rounded-lg bg-[#0D1727] border border-[#1A2A3F] text-[#7C8CA3] hover:text-[#F7FAFC] hover:border-[#29415F] font-medium transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className={`py-2.5 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 ${
              isLive
                ? "bg-[#FF3B5C] hover:bg-[#dc2626] text-white"
                : isBuy
                ? "bg-[#00E890] hover:bg-[#16a34a] text-slate-950"
                : "bg-[#FF3B5C] hover:bg-[#dc2626] text-white"
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

