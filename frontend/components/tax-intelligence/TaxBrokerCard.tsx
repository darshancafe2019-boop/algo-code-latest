"use client";

import React, { memo } from "react";
import Link from "next/link";
import { DonutChart } from "@/components/charts/DonutChart";
import { ExternalLink, ShieldCheck, ShieldAlert, Scale, Receipt, DollarSign } from "lucide-react";
import { formatMoney } from "@/lib/formatters";

export interface TaxBrokerAccountData {
  id: string;
  name: string;
  maskedAccountId: string;
  currency: string;
  status: "Connected" | "Disconnected";
  isLiveConnected: boolean;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  taxablePnl: number;
  estimatedTax: number;
  fees: number;
  taxesPaid: number; // STT / TDS
  closedTradesCount: number;
  openPositionsCount: number;
  lastSync: string;
  reconciliationStatus: "RECONCILED" | "IN_PROGRESS" | "UNVERIFIED" | "DISCONNECTED";
  statusMessage?: string;
  segments: {
    name: string;
    value: number;
    percentage: number;
    color: string;
  }[];
}

interface TaxBrokerCardProps {
  broker: TaxBrokerAccountData;
  isSelected?: boolean;
  onClick?: (broker: TaxBrokerAccountData) => void;
}

export const TaxBrokerCard = memo(function TaxBrokerCard({
  broker,
  isSelected = false,
  onClick,
}: TaxBrokerCardProps) {
  const isConnected = broker.status === "Connected";
  const isPos = broker.realizedPnl >= 0;
  const curr = broker.currency || "INR";
  const prefix = curr === "USD" ? "$" : curr === "USDT" ? "₮" : "₹";

  return (
    <div
      onClick={() => onClick?.(broker)}
      className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-sm hover:shadow-md select-none ${
        isSelected
          ? "bg-[#07243B] border-[#16C6F4] shadow-[#16C6F4]/20 shadow-md ring-1 ring-[#16C6F4]"
          : isConnected
          ? "bg-[#061A2A] border-[#0F2D48] hover:border-[#16C6F4]/50 hover:shadow-[#16C6F4]/5"
          : "bg-[#08131e]/90 border-slate-800/80 hover:border-amber-500/40"
      }`}
    >
      {/* Header: Broker Logo/Initials + Name + Live Status */}
      <div className="flex items-center justify-between pb-2 border-b border-[#0C2237]">
        <div className="flex items-center gap-2">
          {/* Logo Badge */}
          <div
            className={`h-7 w-7 rounded-lg border flex items-center justify-center font-bold text-[10px] transition-colors ${
              isConnected
                ? "bg-[#092237] border-[#133A5C] text-[#16C6F4] group-hover:border-[#16C6F4]"
                : "bg-slate-900 border-slate-700 text-slate-400"
            }`}
          >
            {broker.id === "dhan"
              ? "DH"
              : broker.id === "upstox"
              ? "UP"
              : broker.id === "angel_one"
              ? "AO"
              : broker.id === "delta_exchange"
              ? "DX"
              : broker.id === "binance"
              ? "BN"
              : "SIM"}
          </div>
          <div>
            <span className="text-[13px] font-bold text-white tracking-wide group-hover:text-[#16C6F4] transition-colors block leading-tight">
              {broker.name}
            </span>
            <span className="text-[9px] text-[#7D8EA5] font-mono">
              {broker.maskedAccountId} • {curr}
            </span>
          </div>
        </div>

        {/* Connection & Reconciliation Status Badge */}
        {isConnected ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#07241E] border border-[#00E890]/30 text-[10px] font-medium text-[#00E890]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00E890] animate-pulse" />
            <span>{broker.reconciliationStatus === "RECONCILED" ? "RECONCILED" : "LIVE"}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>DISCONNECTED</span>
          </div>
        )}
      </div>

      {/* Center: Donut Chart (Tax Capital & Segregation) or Disconnected State */}
      {isConnected ? (
        <div className="py-2 flex justify-center items-center">
          <DonutChart
            segments={broker.segments.length > 0 ? broker.segments : [{ name: "Net Retained", value: 100, percentage: 100, color: "#16C6F4" }]}
            size={120}
            thickness={15}
            centerValue={formatMoney(broker.taxablePnl, prefix)}
            centerSubtitle="Taxable P&L"
            centerValueClass="text-[11px] font-bold text-white font-mono"
            centerSubtitleClass="text-[9px] font-semibold text-[#16C6F4] font-mono uppercase"
          />
        </div>
      ) : (
        <div className="py-4 flex flex-col items-center justify-center text-center space-y-1.5">
          <div className="h-9 w-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="text-[11px] font-semibold text-slate-300">
            Gateway Not Linked
          </div>
          <div className="text-[9px] text-slate-400 max-w-[170px] leading-tight">
            {broker.statusMessage || "Link API credentials in Settings to sync tax records"}
          </div>
          <Link
            href="/settings"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#09263e] hover:bg-[#103758] border border-[#16C6F4]/40 text-[#16C6F4] text-[10px] font-bold transition-all shadow-sm mt-1"
          >
            <span>Connect API</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Segregation Legend Grid */}
      {isConnected && broker.segments.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 py-1.5 border-t border-b border-[#0C2237] text-[10px]">
          {broker.segments.map((seg, idx) => (
            <div key={idx} className="flex items-center justify-between gap-1 text-[#8EA1B7]">
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="truncate text-[10px]">{seg.name}</span>
              </div>
              <span className="font-mono text-slate-200 font-medium text-[10px]">
                {seg.percentage}%
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-1.5 border-t border-b border-slate-800 text-[10px] text-center text-slate-500 font-mono">
          {isConnected ? "Zero Segregation Breakdown" : "No active telemetry"}
        </div>
      )}

      {/* Tax Metrics Strip: Realized | Est. Tax | STT/Fees */}
      <div className="pt-2 space-y-1 text-[10px] font-mono">
        <div className="flex items-center justify-between">
          <span className="text-[#7D8EA5]">Realized P&L:</span>
          <span className={`font-bold tabular-nums ${isPos ? "text-[#00E890]" : "text-[#FF3B5C]"}`}>
            {isConnected ? `${isPos ? "+" : ""}${formatMoney(broker.realizedPnl, prefix)}` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#7D8EA5]">Est. Tax Liability:</span>
          <span className="font-bold text-amber-400 tabular-nums">
            {isConnected ? formatMoney(broker.estimatedTax, prefix) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#7D8EA5]">Fees & STT Deducted:</span>
          <span className="font-medium text-slate-300 tabular-nums">
            {isConnected ? formatMoney(broker.fees + broker.taxesPaid, prefix) : "—"}
          </span>
        </div>
      </div>

      {/* Footer Metrics: Trades | Open | Last Sync */}
      <div className="pt-2 mt-1.5 border-t border-[#0C2237] flex items-center justify-between text-[9px] font-mono text-[#7D8EA5]">
        <div>
          <span>Trades: </span>
          <span className="font-bold text-slate-200">{broker.closedTradesCount}</span>
        </div>
        <div>
          <span>Open: </span>
          <span className="font-bold text-[#16C6F4]">{broker.openPositionsCount}</span>
        </div>
        <div className="truncate max-w-[80px]" title={broker.lastSync}>
          {broker.lastSync || "Live"}
        </div>
      </div>
    </div>
  );
});
