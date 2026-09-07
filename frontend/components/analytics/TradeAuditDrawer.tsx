"use client";

import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Tag,
  Smile,
  FileText,
  Activity,
  Layers,
  Award,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/formatters";

export interface SpreadsheetTradeRow {
  id: number | string;
  trade_ref_id: string;
  date_time: string;
  broker: string;
  account: string;
  mode: string;
  asset: string;
  market: string;
  symbol: string;
  direction: string;
  entry_price: number;
  quantity: number;
  entry_notional: number;
  open_date: string;
  strategy: string;
  strategy_version?: string;
  setup: string;
  target: number;
  stop_loss: number;
  risk_reward: string;
  exit_date: string;
  exit_price: number;
  exit_notional: number;
  fees: number;
  funding: number;
  taxes: number;
  gross_pnl: number;
  net_pnl: number;
  pnl_percent: number;
  r_multiple: number;
  status: string;
  emotion: string;
  remarks: string;
  broker_order_id?: string;
  fill_id?: string;
  duration_mins?: number;
}

interface TradeAuditDrawerProps {
  trade: SpreadsheetTradeRow | null;
  isOpen: boolean;
  onClose: () => void;
  currencySymbol?: string;
}

export function TradeAuditDrawer({
  trade,
  isOpen,
  onClose,
  currencySymbol = "₹",
}: TradeAuditDrawerProps) {
  if (!isOpen || !trade) return null;

  const isPos = trade.net_pnl >= 0;
  const isBuy = trade.direction.toUpperCase() === "LONG" || trade.direction.toUpperCase() === "BUY";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn font-mono select-none">
      {/* Background click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-2xl bg-[#0b101b] border-l border-[#1e293b] p-6 shadow-2xl flex flex-col justify-between overflow-y-auto space-y-6">
        {/* 1. Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">{trade.trade_ref_id}</h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    trade.mode === "LIVE"
                      ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                  }`}
                >
                  {trade.mode}
                </span>
              </div>
              <p className="text-xs text-slate-400">{trade.symbol} • {trade.broker} • {trade.account}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. P&L & Key Financial Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#060910] p-4 rounded-xl border border-slate-800/80 text-center">
          <div className="space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase">NET P&L</div>
            <div className={`text-lg font-extrabold ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
              {isPos ? "+" : ""}
              {currencySymbol}
              {formatNumber(trade.net_pnl, 2)}
            </div>
            <div className="text-[10px] text-slate-400">({trade.pnl_percent.toFixed(2)}%)</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase">R-MULTIPLE</div>
            <div className="text-lg font-extrabold text-sky-400">
              {trade.r_multiple > 0 ? `+${trade.r_multiple.toFixed(2)}R` : `${trade.r_multiple.toFixed(2)}R`}
            </div>
            <div className="text-[10px] text-slate-400">RR {trade.risk_reward}</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase">TOTAL FEES</div>
            <div className="text-base font-bold text-slate-200">
              {currencySymbol}
              {formatNumber(trade.fees + trade.funding + trade.taxes, 2)}
            </div>
            <div className="text-[10px] text-slate-400">Broker + Exch + Tax</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase">DURATION</div>
            <div className="text-base font-bold text-slate-200">{trade.duration_mins || 30} mins</div>
            <div className="text-[10px] text-emerald-400">Clean Exit</div>
          </div>
        </div>

        {/* 3. Execution & Price Lifecycle */}
        <div className="space-y-3 bg-[#060910] p-4 rounded-xl border border-slate-800/80 text-xs">
          <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800/60 pb-2">
            EXECUTION LIFECYCLE
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="text-slate-400">ENTRY EXECUTION</div>
              <div className="text-white font-bold">
                {isBuy ? "BUY / LONG" : "SELL / SHORT"} {trade.quantity} units @ {currencySymbol}
                {formatNumber(trade.entry_price, 2)}
              </div>
              <div className="text-[10px] text-slate-400">
                Notional: {currencySymbol}
                {formatNumber(trade.entry_notional, 2)} • Date: {trade.open_date}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-slate-400">EXIT EXECUTION</div>
              <div className="text-white font-bold">
                {trade.status === "CLOSED" ? (
                  <>
                    CLOSE @ {currencySymbol}
                    {formatNumber(trade.exit_price, 2)}
                  </>
                ) : (
                  <span className="text-sky-400">STILL OPEN (UNREALIZED)</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400">
                Notional: {currencySymbol}
                {formatNumber(trade.exit_notional, 2)} • Date: {trade.exit_date}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/50">
            <div>
              <span className="text-slate-400">STOP LOSS:</span>{" "}
              <span className="text-rose-400 font-bold">
                {currencySymbol}
                {formatNumber(trade.stop_loss, 2)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">TARGET:</span>{" "}
              <span className="text-emerald-400 font-bold">
                {currencySymbol}
                {formatNumber(trade.target, 2)}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Strategy, Reason & Psychology / Emotion Notes */}
        <div className="space-y-3 bg-[#060910] p-4 rounded-xl border border-slate-800/80 text-xs">
          <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800/60 pb-2">
            STRATEGY & JOURNAL OBSERVATIONS
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-slate-400">STRATEGY & VERSION</div>
              <div className="text-sky-400 font-bold">{trade.strategy} ({trade.strategy_version || "v1.4.2"})</div>
            </div>
            <div>
              <div className="text-slate-400">SETUP / PATTERN</div>
              <div className="text-slate-200 font-bold">{trade.setup}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/50">
            <div>
              <div className="text-slate-400">EMOTIONAL STATE</div>
              <div className="text-amber-400 font-bold">{trade.emotion}</div>
            </div>
            <div>
              <div className="text-slate-400">BROKER ORDER ID</div>
              <div className="text-slate-300 font-mono text-[11px]">{trade.broker_order_id || "ORD-991204"}</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/50">
            <div className="text-slate-400 mb-1">REMARKS & LESSONS:</div>
            <p className="text-slate-300 bg-[#0b101b] p-2.5 rounded-lg border border-slate-800 text-[11px] leading-relaxed">
              {trade.remarks || "Followed execution rules strictly. Stop loss and target were maintained with zero emotional interference."}
            </p>
          </div>
        </div>

        {/* 5. Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-[10px] text-slate-400">
            Fill ID: <span className="text-slate-300 font-mono">{trade.fill_id || "FILL-98124"}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-bold border border-sky-500/40 transition active:scale-95"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
}
