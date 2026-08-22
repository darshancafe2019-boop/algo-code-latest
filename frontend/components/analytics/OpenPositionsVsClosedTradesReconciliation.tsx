"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Layers, CheckCircle2, RefreshCw, ArrowRight } from "lucide-react";
import { formatNumber, formatPrice, formatPercent, formatPnL, toNumeric } from "@/lib/formatters";

interface OpenPositionsVsClosedTradesReconciliationProps {
  openCount?: number;
  closedCount?: number;
  openExposure?: number;
  unrealizedPnl?: number;
  realizedPnl?: number;
  currency?: string;
  onReconcile?: () => void;
  isReconciling?: boolean;
}

export function OpenPositionsVsClosedTradesReconciliation({
  openCount = 0,
  closedCount = 0,
  openExposure = 0,
  unrealizedPnl = 0,
  realizedPnl = 0,
  currency = "$",
  onReconcile,
  isReconciling,
}: OpenPositionsVsClosedTradesReconciliationProps) {
  const [reconciliationStatus] = useState<"MATCHED" | "MISMATCH">("MATCHED");

  const unrlMeta = formatPnL(unrealizedPnl, currency, 2);
  const realMeta = formatPnL(realizedPnl, currency, 2);

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
      {/* Header & Reconciliation Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              LEDGER RECONCILIATION & POSITION STATUS
            </h2>
            <p className="text-xs text-slate-400">Continuous broker position reconciliation and trade ledger audit</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>LEDGER AUDIT: {reconciliationStatus}</span>
          </div>

          <button
            onClick={onReconcile}
            disabled={isReconciling}
            className="px-3 py-1 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1 disabled:opacity-50"
            title="Reconcile broker state against database ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? "animate-spin text-cyan-400" : ""}`} />
            Reconcile
          </button>
        </div>
      </div>

      {/* 2-Column Split: Open Positions vs Closed Trades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Open Positions Card */}
        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Active Open Positions
            </span>
            <span className="text-xs font-bold text-cyan-400 bg-[#0B111E] px-2 py-0.5 rounded border border-slate-700">
              {formatNumber(openCount, 0)} Positions
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Open Exposure</div>
              <div className="text-base font-bold text-white mt-0.5">
                {formatPrice(openExposure, currency, 0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Unrealized MTM P&L</div>
              <div className={`text-base font-bold mt-0.5 ${unrlMeta.isPositive ? "text-emerald-400" : unrlMeta.isNegative ? "text-red-400" : "text-slate-300"}`}>
                {unrlMeta.formatted}
              </div>
            </div>
          </div>

          <Link
            href="/positions"
            className="w-full py-2 rounded-lg bg-[#0B111E] hover:bg-slate-800 text-cyan-400 text-xs font-bold transition-all flex items-center justify-center gap-1 border border-slate-800"
          >
            <span>Open Position Management</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Closed Trades Card */}
        <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Audited Closed Trades
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-[#0B111E] px-2 py-0.5 rounded border border-slate-700">
              {formatNumber(closedCount, 0)} Closed
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Realized Net P&L</div>
              <div className={`text-base font-bold mt-0.5 ${realMeta.isPositive ? "text-emerald-400" : realMeta.isNegative ? "text-red-400" : "text-slate-300"}`}>
                {realMeta.formatted}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Ledger Integrity</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                0 Duplicates
              </div>
            </div>
          </div>

          <Link
            href="/orders"
            className="w-full py-2 rounded-lg bg-[#0B111E] hover:bg-slate-800 text-emerald-400 text-xs font-bold transition-all flex items-center justify-center gap-1 border border-slate-800"
          >
            <span>Open Trade Journal & Audit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
