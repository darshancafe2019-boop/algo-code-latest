"use client";

import React, { memo } from "react";
import Link from "next/link";
import { BrokerPortfolio } from "@/types/portfolio-intelligence";
import { DonutChart } from "@/components/charts/DonutChart";
import { Landmark, ArrowUpRight, ArrowDownRight, AlertCircle, ExternalLink, ShieldCheck, ShieldAlert } from "lucide-react";

interface BrokerCardProps {
  broker: BrokerPortfolio;
  onClick?: (broker: BrokerPortfolio) => void;
}

function formatBrokerCurrency(val: number, currency: string = "INR") {
  const safeVal = Number(val || 0);
  const curr = currency.toUpperCase();
  if (curr === "USD") {
    return `$ ${safeVal.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
  if (curr === "USDT") {
    return `₮ ${safeVal.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
  return `₹ ${safeVal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export const BrokerCard = memo(function BrokerCard({
  broker,
  onClick,
}: BrokerCardProps) {
  const isPos = broker.pnl >= 0;
  const isConnected = broker.status === "Connected";
  const currency = broker.currency || (broker.id === "delta_exchange" ? "USD" : broker.id === "binance" ? "USDT" : "INR");

  return (
    <div
      onClick={() => onClick?.(broker)}
      className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-sm hover:shadow-md select-none ${
        isConnected
          ? "bg-[#061A2A] border-[#0F2D48] hover:border-[#16C6F4]/50 hover:shadow-[#16C6F4]/5"
          : "bg-[#08131e]/90 border-slate-800/80 hover:border-amber-500/40"
      }`}
    >
      {/* Header: Broker Logo/Icon + Name + Status */}
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
            <span className="text-[9px] text-slate-400 font-mono">
              {currency} Segregated
            </span>
          </div>
        </div>

        {/* Connection Status Badge */}
        {isConnected ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#07241E] border border-[#00E890]/30 text-[10px] font-medium text-[#00E890]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00E890] animate-pulse" />
            <span>LIVE</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>DISCONNECTED</span>
          </div>
        )}
      </div>

      {/* Center: Donut Chart or Offline Connect Prompt */}
      {isConnected ? (
        <div className="py-2.5 flex justify-center items-center">
          <DonutChart
            segments={broker.segments.length > 0 ? broker.segments : [{ name: "Allocated", value: 100, percentage: 100, color: "#16C6F4" }]}
            size={130}
            thickness={16}
            centerValue={formatBrokerCurrency(broker.allocatedValue, currency)}
            centerSubtitle={`${broker.allocatedPercentage}%`}
            centerValueClass="text-[11px] font-bold text-white font-mono"
            centerSubtitleClass="text-[10px] font-semibold text-[#16C6F4] font-mono"
          />
        </div>
      ) : (
        <div className="py-5 flex flex-col items-center justify-center text-center space-y-2">
          <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="text-[11px] font-semibold text-slate-300">
            Account Not Linked
          </div>
          <div className="text-[10px] text-slate-400 max-w-[180px]">
            {broker.statusMessage || "Configure credentials in Settings to sync balance & trades"}
          </div>
          <Link
            href="/settings"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#09263e] hover:bg-[#103758] border border-[#16C6F4]/40 text-[#16C6F4] text-[10px] font-bold transition-all shadow-sm"
          >
            <span>Connect API</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Legend Grid */}
      {isConnected && broker.segments.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 py-2 border-t border-b border-[#0C2237] text-[10px]">
          {broker.segments.map((seg, idx) => (
            <div key={idx} className="flex items-center justify-between gap-1 text-[#8EA1B7]">
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="truncate">{seg.name}</span>
              </div>
              <span className="font-mono text-slate-200 font-medium">{seg.percentage}%</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-2 border-t border-b border-slate-800 text-[10px] text-center text-slate-400 font-mono">
          {isConnected ? "Zero Segregation Breakdown" : "No active telemetry"}
        </div>
      )}

      {/* Footer Metrics: Positions | Open | P&L */}
      <div className="pt-2 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-1 text-[#7D8EA5]">
          <span>Positions</span>
          <span className="font-semibold text-slate-200">{broker.positionsCount}</span>
        </div>
        <div className="flex items-center gap-1 text-[#7D8EA5]">
          <span>Open</span>
          <span className="font-semibold text-[#16C6F4]">{broker.openPositionsCount}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="text-[#7D8EA5] text-[10px]">P&L</span>
          <span
            className={`font-bold tabular-nums ${
              !isConnected
                ? "text-slate-500"
                : isPos
                ? "text-[#00E890]"
                : "text-[#FF3B5C]"
            }`}
          >
            {isConnected ? `${isPos ? "+" : ""}${formatBrokerCurrency(broker.pnl, currency)}` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
});
