"use client";

import React from "react";
import { Calculator, TrendingUp, PiggyBank, ShieldCheck, ArrowRight } from "lucide-react";
import { TaxCommandCenterSummary } from "@/types/tax";

interface TaxPlannerViewProps {
  summary: TaxCommandCenterSummary;
  currency: string;
}

export function TaxPlannerView({ summary, currency }: TaxPlannerViewProps) {
  const formatCurrency = (val: number) => {
    const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
    return `${prefix}${Math.abs(val).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-sans tracking-wide">
              ANNUAL TAX PLANNER & CASH FLOW PROJECTIONS
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Realized gains, loss harvesting capacity, and capital reserve segregation
            </p>
          </div>
        </div>

        <div className="text-right font-mono">
          <span className="text-xs text-slate-500 block">Current Fiscal Year</span>
          <span className="text-xs font-bold text-slate-200">FY 2025-26</span>
        </div>
      </div>

      {/* Tax Planning Waterfall Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-sans">Realized Tax Base</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Gross Realized Gains:</span>
              <span className="text-slate-100 font-semibold">{formatCurrency(summary.realized_taxable_gains)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Allowable Set-Off Losses:</span>
              <span className="text-rose-400">-{formatCurrency(summary.realized_losses)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between font-bold">
              <span className="text-slate-200">Net Taxable Amount:</span>
              <span className="text-emerald-400">{formatCurrency(summary.net_realized_pl)}</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-sans">Tax Obligations</span>
            <PiggyBank className="w-4 h-4 text-amber-400" />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Estimated Total Tax:</span>
              <span className="text-amber-400 font-semibold">{formatCurrency(summary.estimated_tax_liability)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Prepaid / Withheld:</span>
              <span className="text-teal-400">-{formatCurrency(summary.taxes_already_withheld)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between font-bold">
              <span className="text-slate-200">Remaining Balance:</span>
              <span className="text-amber-400 font-bold">{formatCurrency(Math.max(0, summary.estimated_tax_liability - summary.taxes_already_withheld))}</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-sans">Suggested Tax Reserve</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Recommended Reserve:</span>
              <span className="text-indigo-400 font-bold text-sm">{formatCurrency(summary.tax_reserve)}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
              Segregated from trading margin to guarantee seamless payment of advance tax installments without liquidating live positions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
