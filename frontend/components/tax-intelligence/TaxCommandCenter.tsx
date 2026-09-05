"use client";

import React from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  PiggyBank,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { TaxCommandCenterSummary, TaxConfidenceLevel } from "@/types/tax";

interface TaxCommandCenterProps {
  summary: TaxCommandCenterSummary;
  currency: string;
}

export function TaxCommandCenter({ summary, currency }: TaxCommandCenterProps) {
  const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "—";
    const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
    return `${prefix}${Math.abs(val).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getConfidenceBadge = (confidence: TaxConfidenceLevel) => {
    switch (confidence) {
      case "CONFIRMED INPUTS":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">CONFIRMED</span>;
      case "HIGH-CONFIDENCE ESTIMATE":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">HIGH-CONFIDENCE ESTIMATE</span>;
      case "ESTIMATE":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">ESTIMATE</span>;
      case "INFORMATION REQUIRED":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">INFORMATION REQUIRED</span>;
      case "PROFESSIONAL REVIEW RECOMMENDED":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">REVIEW RECOMMENDED</span>;
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">{confidence}</span>;
    }
  };

  const cards = [
    {
      title: "Estimated Tax Liability",
      value: formatCurrency(summary.estimated_tax_liability),
      subtext: "Current fiscal year projected",
      icon: DollarSign,
      iconColor: "text-amber-400",
      accent: "border-amber-500/20 bg-amber-500/5",
      type: "ESTIMATED",
    },
    {
      title: "Realized Taxable Gains",
      value: formatCurrency(summary.realized_taxable_gains),
      subtext: "Total net realized profits",
      icon: TrendingUp,
      iconColor: "text-emerald-400",
      accent: "border-emerald-500/20 bg-emerald-500/5",
      type: "CONFIRMED",
    },
    {
      title: "Realized Losses",
      value: summary.realized_losses > 0 ? `-${formatCurrency(summary.realized_losses)}` : formatCurrency(0),
      subtext: "Available for set-off",
      icon: TrendingDown,
      iconColor: "text-rose-400",
      accent: "border-rose-500/20 bg-rose-500/5",
      type: "CONFIRMED",
    },
    {
      title: "Unrealized Tax Exposure",
      value: formatCurrency(summary.unrealized_tax_exposure),
      subtext: "Tax impact if closed today",
      icon: Clock,
      iconColor: "text-blue-400",
      accent: "border-blue-500/20 bg-blue-500/5",
      type: "ESTIMATED",
    },
    {
      title: "Taxes Already Withheld",
      value: formatCurrency(summary.taxes_already_withheld),
      subtext: "TDS / Foreign withholding",
      icon: Receipt,
      iconColor: "text-teal-400",
      accent: "border-teal-500/20 bg-teal-500/5",
      type: "CONFIRMED",
    },
    {
      title: "Transaction Taxes Paid",
      value: formatCurrency(summary.transaction_taxes_paid),
      subtext: "STT / SDRT / Stamp Duty",
      icon: CheckCircle2,
      iconColor: "text-indigo-400",
      accent: "border-indigo-500/20 bg-indigo-500/5",
      type: "CONFIRMED",
    },
    {
      title: "Upcoming Tax Payments",
      value: formatCurrency(summary.upcoming_tax_payments),
      subtext: "Next advance tax milestone",
      icon: AlertTriangle,
      iconColor: "text-amber-400",
      accent: "border-amber-500/20 bg-amber-500/5",
      type: "ESTIMATED",
    },
    {
      title: "Tax-Loss Opportunities",
      value: formatCurrency(summary.tax_loss_opportunities),
      subtext: "Holding-period optimization",
      icon: PiggyBank,
      iconColor: "text-emerald-400",
      accent: "border-emerald-500/20 bg-emerald-500/5",
      type: "ESTIMATED",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-100 font-sans tracking-wide">
                TAX COMMAND CENTER
              </h2>
              {getConfidenceBadge(summary.confidence)}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Multi-jurisdiction trade recognition & statutory liability engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Tax Reserve:</span>
            <span className="text-xs font-semibold text-amber-400 font-mono">
              {formatCurrency(summary.tax_reserve)}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Compliance:</span>
            <span
              className={`text-xs font-semibold font-mono ${
                summary.compliance_status === "COMPLIANT"
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            >
              {summary.compliance_status}
            </span>
          </div>
        </div>
      </div>

      {/* Overview Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all duration-200 hover:border-slate-700 bg-slate-900/80 backdrop-blur-sm ${card.accent}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400 font-sans">
                  {card.title}
                </span>
                <div className={`p-1.5 rounded-md bg-slate-950/60 ${card.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-lg sm:text-xl font-bold font-mono tracking-tight text-slate-100">
                  {card.value}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-400 border border-slate-800">
                  {card.type}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 font-mono mt-1.5 truncate">
                {card.subtext}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
