"use client";

import React from "react";
import { X, Shield, Activity, Radio, AlertTriangle } from "lucide-react";
import { OptionContractQuote } from "@/types/option-chain";
import { getExpiryDisplay } from "@/lib/expiry-utils";
import { SimpleOptionOrderTicket } from "./SimpleOptionOrderTicket";

interface SelectedOptionInspectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  strike: number | null;
  optionType: "CE" | "PE" | null;
  quote: OptionContractQuote | null;
  underlying: string;
  expiry: string;
  spotPrice: number;
  currency?: string;
  onExecuteOrder?: (side: "BUY" | "SELL", lots: number) => void;
}

export function SelectedOptionInspectionDrawer({
  isOpen,
  onClose,
  strike,
  optionType,
  quote,
  underlying,
  expiry,
  spotPrice,
  currency = "₹",
  onExecuteOrder,
}: SelectedOptionInspectionDrawerProps) {
  if (!isOpen || !strike || !optionType || !quote) return null;

  const isCall = optionType === "CE";
  const intrinsic = isCall ? Math.max(0, spotPrice - strike) : Math.max(0, strike - spotPrice);
  const timeValue = Math.max(0, (quote.ltp || 0) - intrinsic);

  const providerName = quote.provider || (quote as any).sourceProvider || "DHAN";
  const brokerAccount = quote.brokerAccountAlias || quote.brokerAccountId || "Primary Account";
  const environment = quote.environment || "PAPER";
  const instrumentId = quote.instrumentId || quote.symbol || `${providerName}_${underlying}_${strike}_${optionType}`;
  const contractKey = quote.contractKey || `${providerName}:${brokerAccount}:${environment}:${quote.exchange || "NSE"}:OPTIONS:${underlying}:${expiry}:${strike}:${optionType}:${instrumentId}`;
  const isStale = quote.freshnessStatus === "STALE" || (quote.dataAgeMs && quote.dataAgeMs > 8000);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[94vh] font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${
                isCall
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              }`}
            >
              {optionType}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {underlying} {currency}{strike.toLocaleString()} {isCall ? "CALL (CE)" : "PUT (PE)"}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  SOURCE: {providerName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Expiry: {getExpiryDisplay(expiry)} • Env: {environment}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 8-Tier Hierarchical Metadata Box */}
        <div className="bg-[#080D17] border border-slate-800 rounded-xl p-3 text-[10px] space-y-1 text-slate-400">
          <div className="text-slate-300 font-bold uppercase tracking-wider text-[9px] mb-1 flex items-center gap-1">
            <Shield className="w-3 h-3 text-cyan-400" />
            Institutional Provenance & Hierarchy
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div>Broker Account: <span className="text-slate-200 font-bold">{brokerAccount}</span></div>
            <div>Environment: <span className={environment === "LIVE" ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>{environment}</span></div>
            <div>Exchange / Segment: <span className="text-slate-200 font-bold">{quote.exchange || "NSE"} / {quote.segment || "OPTIONS"}</span></div>
            <div>Data Feed: <span className="text-slate-200 font-bold">{quote.dataFeed || "REST"} ({quote.latencyMs || 24}ms)</span></div>
            <div className="col-span-2">Instrument ID: <span className="text-cyan-400 font-bold">{instrumentId}</span></div>
            <div className="col-span-2 truncate">Contract Key: <span className="text-slate-400 font-mono text-[9px]">{contractKey}</span></div>
          </div>
        </div>

        {/* Pricing & Liquidity Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3">
            <div className="text-[10px] text-slate-400 uppercase">Last Traded Price (LTP)</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {currency}{quote.ltp?.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Bid: {currency}{quote.bid?.toFixed(1)} • Ask: {currency}{quote.ask?.toFixed(1)}
            </div>
          </div>

          <div className="bg-[#141E33] border border-[#1E293B] rounded-xl p-3">
            <div className="text-[10px] text-slate-400 uppercase">Implied Volatility (IV)</div>
            <div className="text-lg font-bold text-purple-400 mt-0.5 flex items-center gap-1">
              <span>{quote.iv ? `${quote.iv.toFixed(1)}%` : "—"}</span>
              {quote.greeks_source === "CALCULATED" && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-normal">
                  CALC
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              OI: {quote.open_interest ? `${((quote.open_interest || 0) / 1000).toFixed(1)}k` : "—"} contracts
            </div>
          </div>
        </div>

        {/* Intrinsic vs Time Value Breakdown */}
        <div className="bg-[#080D17] border border-slate-800 rounded-xl p-2.5 text-xs space-y-1">
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Intrinsic Value:</span>
            <span className="text-white font-bold">{currency}{intrinsic.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Time / Extrinsic Value:</span>
            <span className="text-amber-400 font-bold">{currency}{timeValue.toFixed(2)}</span>
          </div>
        </div>

        {/* Black-Scholes Greeks Suite */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
            <span>Analytical Greeks</span>
            <span className="text-slate-500 font-normal">
              Provenance: {quote.greeks_source === "PROVIDER" ? "Broker Native" : "Black-Scholes Calculated"}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-[#141E33] border border-slate-800 rounded-lg p-2">
              <div className="text-[9px] text-slate-400">DELTA (Δ)</div>
              <div className="font-bold text-cyan-400 mt-0.5">{quote.delta !== undefined && quote.delta !== null ? quote.delta.toFixed(2) : "—"}</div>
            </div>
            <div className="bg-[#141E33] border border-slate-800 rounded-lg p-2">
              <div className="text-[9px] text-slate-400">GAMMA (Γ)</div>
              <div className="font-bold text-emerald-400 mt-0.5">{quote.gamma !== undefined && quote.gamma !== null ? quote.gamma.toFixed(4) : "—"}</div>
            </div>
            <div className="bg-[#141E33] border border-slate-800 rounded-lg p-2">
              <div className="text-[9px] text-slate-400">THETA (θ)</div>
              <div className="font-bold text-rose-400 mt-0.5">{quote.theta !== undefined && quote.theta !== null ? `${quote.theta.toFixed(1)}/d` : "—"}</div>
            </div>
            <div className="bg-[#141E33] border border-slate-800 rounded-lg p-2">
              <div className="text-[9px] text-slate-400">VEGA (ν)</div>
              <div className="font-bold text-purple-400 mt-0.5">{quote.vega !== undefined && quote.vega !== null ? quote.vega.toFixed(1) : "—"}</div>
            </div>
          </div>
        </div>

        {/* Embedded Unified 1-Click Order Ticket */}
        <div className="pt-2">
          <SimpleOptionOrderTicket
            underlying={underlying}
            expiry={expiry}
            strike={strike}
            optionType={optionType}
            premium={quote.ltp || 0}
            currencySymbol={currency}
            provider={providerName}
            brokerAccountId={brokerAccount}
            instrumentId={instrumentId}
            contractKey={contractKey}
            onOrderSuccess={() => {
              setTimeout(() => {
                onClose();
              }, 1500);
            }}
          />
        </div>
      </div>
    </div>
  );
}

