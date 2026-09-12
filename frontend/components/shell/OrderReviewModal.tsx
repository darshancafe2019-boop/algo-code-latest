"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Shield, X, ArrowRight } from "lucide-react";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { DataAge } from "@/components/ui/DataAge";

export interface OrderIntentData {
  symbol: string;
  side: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT" | "SL" | "SL-M";
  quantity: number;
  price?: number;
  triggerPrice?: number;
  broker: string;
  account?: string;
  tradingMode?: "PAPER" | "SHADOW" | "LIVE";
  estimatedMargin?: number;
  estimatedFee?: number;
  productType?: "CNC" | "MIS" | "NRML" | "MARGIN";
  dataTimestamp?: number;
}

interface OrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  order: OrderIntentData | null;
  isSubmitting?: boolean;
}

export function OrderReviewModal({
  isOpen,
  onClose,
  onConfirm,
  order,
  isSubmitting = false,
}: OrderReviewModalProps) {
  const [confirmedLiveArm, setConfirmedLiveArm] = useState(false);

  if (!isOpen || !order) return null;

  const isLive = order.tradingMode === "LIVE";
  const isBuy = order.side === "BUY";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-[#0E1624] border border-[#213047] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col font-sans">
        {/* Header */}
        <div className="px-4 py-3 bg-[#0A101C] border-b border-[#213047] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#22C7E8]" />
            <h3 className="text-sm font-bold font-mono text-[#F4F7FA] uppercase tracking-wider">
              Order Execution Review
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#7C8CA3] hover:text-white rounded hover:bg-[#121C2C] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Order Details Body */}
        <div className="p-4 space-y-3 font-mono text-xs">
          {/* Main Action Banner */}
          <div
            className={cn(
              "p-3 rounded-lg border flex items-center justify-between",
              isBuy
                ? "bg-[#22C983]/10 border-[#22C983]/30 text-[#22C983]"
                : "bg-[#F2556A]/10 border-[#F2556A]/30 text-[#F2556A]"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{order.side}</span>
              <span className="text-white font-bold">{order.symbol}</span>
            </div>
            <span className="text-xs bg-[#101827] px-2 py-0.5 rounded border border-current font-bold">
              {order.orderType}
            </span>
          </div>

          {/* Telemetry Grid */}
          <div className="rounded-lg bg-[#0A101C] border border-[#213047] p-3 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[#52627A] block text-[10px]">BROKER / SOURCE:</span>
              <ProviderBadge provider={order.broker} size="sm" className="mt-0.5" />
            </div>
            <div>
              <span className="text-[#52627A] block text-[10px]">TRADING MODE:</span>
              <ModeBadge mode={order.tradingMode || "PAPER"} size="sm" className="mt-0.5" />
            </div>
            <div>
              <span className="text-[#52627A] block text-[10px]">QUANTITY:</span>
              <span className="text-[#F4F7FA] font-bold tabular-nums">{order.quantity}</span>
            </div>
            <div>
              <span className="text-[#52627A] block text-[10px]">PRICE:</span>
              <span className="text-[#F4F7FA] font-bold tabular-nums">
                {order.orderType === "MARKET" ? "MARKET (LTP)" : `₹${order.price?.toLocaleString()}`}
              </span>
            </div>
            {order.estimatedMargin !== undefined && (
              <div>
                <span className="text-[#52627A] block text-[10px]">EST. MARGIN:</span>
                <span className="text-[#F4F7FA] tabular-nums">₹{order.estimatedMargin.toLocaleString()}</span>
              </div>
            )}
            {order.estimatedFee !== undefined && (
              <div>
                <span className="text-[#52627A] block text-[10px]">EST. FEES:</span>
                <span className="text-[#F4F7FA] tabular-nums">₹{order.estimatedFee.toLocaleString()}</span>
              </div>
            )}
            <div className="col-span-2 pt-1 border-t border-[#213047]/60 flex items-center justify-between text-[10px]">
              <span className="text-[#52627A]">FEED FRESHNESS:</span>
              <DataAge timestamp={order.dataTimestamp || Date.now()} />
            </div>
          </div>

          {/* Live Trading Warning Checkbox */}
          {isLive && (
            <div className="p-2.5 rounded-lg border border-[#F2556A]/40 bg-[#F2556A]/10 space-y-2">
              <div className="flex items-center gap-1.5 text-[#F2556A] font-bold text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>LIVE REAL CAPITAL ORDER CONFIRMATION</span>
              </div>
              <label className="flex items-start gap-2 text-[10px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmedLiveArm}
                  onChange={(e) => setConfirmedLiveArm(e.target.checked)}
                  className="mt-0.5 rounded border-[#213047] bg-[#101827] text-[#F2556A] focus:ring-0"
                />
                <span>I confirm real live automated order submission to {order.broker.toUpperCase()}.</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0A101C] border-t border-[#213047] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3 py-1.5 rounded-md border border-[#213047] text-xs font-mono text-[#7C8CA3] hover:text-white hover:bg-[#121C2C] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || (isLive && !confirmedLiveArm)}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md",
              isLive
                ? "bg-[#F2556A] text-white hover:bg-[#F2556A]/90 disabled:opacity-40"
                : isBuy
                ? "bg-[#22C983] text-slate-950 hover:bg-[#22C983]/90 disabled:opacity-40"
                : "bg-[#F2556A] text-white hover:bg-[#F2556A]/90 disabled:opacity-40"
            )}
          >
            {isSubmitting ? (
              <>
                <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                <span>Routing...</span>
              </>
            ) : (
              <>
                <span>Submit {order.side}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
