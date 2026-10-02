"use client";

import React, { memo } from "react";
import { formatMoney } from "@/lib/formatters";
import {
  Calculator,
  TrendingUp,
  PiggyBank,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Calendar,
  Layers,
  ArrowDownRight,
  TrendingDown,
} from "lucide-react";
import { TaxCommandCenterSummary } from "@/types/tax";
import { useGlobalData } from "@/context/GlobalDataContext";

interface TaxPlannerViewProps {
  summary: TaxCommandCenterSummary;
  currency: string;
}

export const TaxPlannerView = memo(function TaxPlannerView({
  summary,
  currency,
}: TaxPlannerViewProps) {
  const { positions } = useGlobalData();

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "₹0.00";
    const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
    return formatMoney(Math.abs(val), prefix);
  };

  const grossGains = summary.realized_taxable_gains || 0;
  const losses = summary.realized_losses || 0;
  const netTaxable = summary.net_realized_pl || Math.max(0, grossGains - losses);
  const totalTax = summary.estimated_tax_liability || 0;
  const paidWithheld = summary.taxes_already_withheld || 0;
  const remaining = Math.max(0, totalTax - paidWithheld);
  const netProfit = Math.max(0, netTaxable - totalTax);

  // Find actual losing open positions for loss harvesting
  const harvestablePositions = (positions || []).filter((p) => (p.unrealized_pnl || 0) < 0);
  const totalHarvestableLosses = harvestablePositions.reduce((acc, p) => acc + Math.abs(p.unrealized_pnl || 0), 0);
  const potentialTaxSavedByHarvesting = totalHarvestableLosses * 0.20;

  return (
    <div className="space-y-5 font-mono">
      {/* ── Header ───────────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 font-sans tracking-wide">
              ANNUAL TAX PLANNER & CASH FLOW WATERFALL
            </h3>
            <p className="text-xs text-slate-400">
              Multi-tier taxable gain allocation, advance installment scheduling & tax-loss harvesting
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 block">Fiscal Year</span>
          <span className="text-xs font-bold text-indigo-400">FY 2025-26 (AY 2026-27)</span>
        </div>
      </div>

      {/* ── Visual Waterfall Progression Bar ──────────────────────────────────────── */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 font-sans tracking-wide">
            CAPITAL FLOW & TAX WATERFALL
          </span>
          <span className="text-[10px] text-slate-400">
            Live Reconciliation Active
          </span>
        </div>

        {/* Waterfall Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Step 1: Gross Gains */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-sans">1. Gross Realized Gains</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base font-bold text-slate-100">{formatCurrency(grossGains)}</div>
            <div className="text-[10px] text-slate-500">From executed sell fills</div>
          </div>

          {/* Step 2: Set-off Losses */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-sans">2. Allowable Losses</span>
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-base font-bold text-rose-400">-{formatCurrency(losses)}</div>
            <div className="text-[10px] text-slate-500">Set-off under Sec 70/71</div>
          </div>

          {/* Step 3: Tax Liability */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-sans">3. Estimated Total Tax</span>
              <PiggyBank className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-base font-bold text-amber-400">-{formatCurrency(totalTax)}</div>
            <div className="text-[10px] text-slate-500">Paid: {formatCurrency(paidWithheld)}</div>
          </div>

          {/* Step 4: Net Retained Yield */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/30 bg-indigo-950/20 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-sans font-bold text-indigo-300">4. Net Retained Yield</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-base font-bold text-emerald-400">{formatCurrency(netProfit)}</div>
            <div className="text-[10px] text-indigo-300">Distributable Post-Tax</div>
          </div>
        </div>
      </div>

      {/* ── Tax-Loss Harvesting Opportunity Optimizer ─────────────────────────────── */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200 font-sans tracking-wide">
              TAX LOSS HARVESTING (TLH) CAPABILITY
            </span>
          </div>
          <span className="text-xs text-emerald-400 font-bold">
            Potential Tax Offset: {formatCurrency(potentialTaxSavedByHarvesting)}
          </span>
        </div>

        {harvestablePositions.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs text-center">
            No open loss positions found. Your active portfolio is profitable with zero harvestable capital losses.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400 font-sans">
              Liquidating unrealized losses allows offset against short-term capital gains, reducing advance tax liability.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {harvestablePositions.map((pos) => (
                <div key={pos.id || pos.symbol} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200 font-sans">{pos.symbol}</span>
                    <span className="text-rose-400 font-bold">{formatCurrency(pos.unrealized_pnl)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Qty: {pos.quantity}</span>
                    <span className="text-emerald-400">Offset: {formatCurrency(Math.abs(pos.unrealized_pnl || 0) * 0.20)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
