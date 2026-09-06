"use client";

import React, { useState } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  Lock,
  X,
  Zap,
  Activity,
  ArrowRight,
  TrendingUp,
  Scale,
} from "lucide-react";

export interface OptionOrderIntentRequest {
  canonical_id: string;
  symbol: string;
  underlying: string;
  expiry: string;
  strike: number;
  option_type: "CE" | "PE" | "CALL" | "PUT";
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  market_data_provider: string;
  execution_broker: string;
  mode: "PAPER" | "SHADOW" | "LIVE";
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  iv?: number;
}

interface OrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OptionOrderIntentRequest | null;
  onConfirm: (order: OptionOrderIntentRequest) => Promise<void>;
}

export function OrderReviewModal({
  isOpen,
  onClose,
  order,
  onConfirm,
}: OrderReviewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const notional = (order.price || 0) * (order.quantity || 1);
  const isShort = order.side === "SELL";
  // Margin estimate: for long options it's premium paid; for short options it's approx 12% underlying notional + premium
  const underlyingApprox = order.strike || 22500;
  const estimatedMargin = isShort
    ? Math.round(underlyingApprox * order.quantity * 0.12 + notional)
    : Math.round(notional);

  const isLive = order.mode === "LIVE";
  const isPaper = order.mode === "PAPER";
  const isShadow = order.mode === "SHADOW";

  const handleExecute = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onConfirm(order);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit options order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 font-sans">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isLive ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-sky-500/20 text-sky-400 border border-sky-500/40"}`}>
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold font-mono tracking-wide text-slate-100 flex items-center gap-2">
                ORDER RISK REVIEW & INTENT
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isLive ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                  isShadow ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                  "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}>
                  {order.mode}
                </span>
              </div>
              <div className="text-xs text-slate-400">Institutional pre-trade margin & Greeks check</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Contract Headline Badge */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-mono">INSTRUMENT</div>
              <div className="text-base font-bold font-mono text-sky-300 flex items-center gap-2">
                {order.symbol || `${order.underlying} ${order.strike} ${order.option_type}`}
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${order.side === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                  {order.side}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Expiry: {order.expiry || "Current"} • Strike: {order.strike}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">EST. PRICE</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                ₹{order.price.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Sourcing & Routing Matrix */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">MARKET DATA SOURCE</span>
              <span className="font-bold text-sky-400">{order.market_data_provider}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">EXECUTION BROKER</span>
              <span className="font-bold text-slate-200">{order.execution_broker}</span>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Order Quantity</span>
              <span className="font-bold text-slate-200">{order.quantity} Units</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Total Premium / Notional</span>
              <span className="font-bold text-slate-100">₹{notional.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Estimated Required Margin</span>
              <span className="font-bold text-amber-400">₹{estimatedMargin.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {order.delta !== undefined && (
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Greeks (Δ / Γ / Θ / Vega)</span>
                <span className="font-bold text-sky-400">
                  {order.delta?.toFixed(2) || "—"} / {order.gamma?.toFixed(4) || "—"} / {order.theta?.toFixed(1) || "—"} / {order.vega?.toFixed(1) || "—"}
                </span>
              </div>
            )}
          </div>

          {/* Warning Alert for Live or Short Options */}
          {isShort && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <span className="font-bold">Short Option Risk:</span> Writing uncovered options carries theoretically unbounded loss and elevated margin requirements.
              </div>
            </div>
          )}

          {isLive && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
              <Lock className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold">Live Execution Mode:</span> This will dispatch an actual order to {order.execution_broker}. Ensure account margin and live risk limits are reconciled.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs font-mono text-rose-300">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleExecute}
            disabled={isSubmitting}
            className={`px-5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 shadow-lg transition ${
              order.side === "BUY"
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
            }`}
          >
            {isSubmitting ? (
              <>
                <Activity className="h-4 w-4 animate-spin" />
                Submitting Intent...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirm & Route {order.side} ({order.mode})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
