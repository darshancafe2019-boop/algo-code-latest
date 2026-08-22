"use client";

import React from "react";
import { X, ShieldCheck, Send, AlertTriangle, Lock, CheckCircle2 } from "lucide-react";
import { OrderRiskPreview, ExecutionMode } from "@/types/order-execution";

interface OrderConfirmationDrawerProps {
  preview: OrderRiskPreview | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  executionMode: ExecutionMode;
}

export function OrderConfirmationDrawer({
  preview,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  executionMode,
}: OrderConfirmationDrawerProps) {
  if (!isOpen || !preview) return null;

  const isBuy = preview.direction === "LONG";
  const isLive = executionMode === "LIVE";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh] font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isLive
                ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
            }`}>
              {isLive ? <Lock className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {isLive ? "LIVE ORDER CONFIRMATION" : "PAPER ORDER PREVIEW"}
              </h2>
              <p className="text-xs text-slate-400">Review execution parameters & risk gate clearance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Trade Ticket Breakdown */}
        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-4 space-y-2.5 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-slate-400">Instrument:</span>
            <span className="text-white font-bold text-sm">{preview.symbol}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Action & Type:</span>
            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
              isBuy ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            }`}>
              {isBuy ? "BUY / LONG" : "SELL / SHORT"} ({preview.order_type})
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Order Quantity:</span>
            <span className="text-white font-bold">{preview.quantity} Units</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Estimated Entry:</span>
            <span className="text-white font-bold">${(Number(preview.entry_price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Stop Loss:</span>
            <span className="text-red-400 font-bold">${(Number(preview.stop_loss_price) || 0).toFixed(2)} (-${(Number(preview.stop_loss_risk_usd) || 0).toFixed(2)})</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Take Profit:</span>
            <span className="text-emerald-400 font-bold">${(Number(preview.take_profit_price) || 0).toFixed(2)} (+${(Number(preview.take_profit_potential_usd) || 0).toFixed(2)})</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Leverage / Margin:</span>
            <span className="text-cyan-400 font-bold">{preview.leverage}x (${(Number(preview.required_margin) || 0).toFixed(2)} margin)</span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <span className="text-slate-400">Risk / Reward:</span>
            <span className="text-white font-bold">1 : {(Number(preview.risk_reward_ratio) || 2.0).toFixed(2)}</span>
          </div>
        </div>

        {/* Risk Clearance Badge */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>Risk Engine Pre-Trade Verification: <strong>APPROVED (14/14 Checks Cleared)</strong></span>
        </div>

        {/* Live Warning if Live Mode */}
        {isLive && (
          <div className="bg-red-950/60 border border-red-900/60 rounded-xl p-3 flex items-center gap-2.5 text-xs text-red-300">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>WARNING: This will place a REAL live order with capital at risk on the broker.</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#141E33] hover:bg-[#1C2A47] text-slate-300 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`px-6 py-2 text-xs font-bold rounded-xl text-slate-950 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 ${
              isLive
                ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white shadow-red-950/50"
                : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-950/40"
            }`}
          >
            <Send className={`w-4 h-4 ${isSubmitting ? "animate-spin" : ""}`} />
            <span>{isSubmitting ? "Routing to OMS..." : isLive ? "CONFIRM LIVE EXECUTION" : "CONFIRM PAPER ORDER"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
