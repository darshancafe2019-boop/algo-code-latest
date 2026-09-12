"use client";

import React, { useState } from "react";
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
  Radio,
  Layers,
  Sparkles,
} from "lucide-react";
import { TaxConfidenceLevel } from "@/types/tax";
import { CalculatedTaxMetrics } from "@/lib/taxEngineService";

interface TaxCommandCenterProps {
  metrics: CalculatedTaxMetrics;
  selectedBroker: string;
  onSelectBroker: (broker: string) => void;
}

export function TaxCommandCenter({
  metrics,
  selectedBroker,
  onSelectBroker,
}: TaxCommandCenterProps) {
  const currency = metrics.base_currency || "INR";

  const formatCurrency = (val: number | null | undefined, placeholder = "N/A") => {
    if (val === null || val === undefined) return placeholder;
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
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">{confidence}</span>;
    }
  };

  const activeBrokerSeg = selectedBroker === "ALL" ? null : metrics.broker_segregations[selectedBroker];

  // Derive cards dynamically based on active broker filter
  const displayedEstimatedTax = activeBrokerSeg ? activeBrokerSeg.estimated_tax : metrics.estimated_tax_liability;
  const displayedTaxablePnl = activeBrokerSeg ? activeBrokerSeg.taxable_pnl : metrics.taxable_realized_pnl;
  const displayedRealizedPnl = activeBrokerSeg ? activeBrokerSeg.realized_pnl : metrics.total_realized_pnl;
  const displayedUnrealizedPnl = activeBrokerSeg ? activeBrokerSeg.unrealized_pnl : metrics.total_unrealized_pnl;
  const displayedFees = activeBrokerSeg ? activeBrokerSeg.fees : metrics.total_fees_and_charges;
  const displayedTaxesPaid = activeBrokerSeg ? activeBrokerSeg.taxes_paid : metrics.total_taxes_paid_or_withheld;
  const displayedNet = displayedRealizedPnl !== null && displayedEstimatedTax !== null
    ? displayedRealizedPnl - displayedEstimatedTax - (displayedFees || 0)
    : null;

  const cards = [
    {
      title: "Estimated Tax Liability",
      value: formatCurrency(displayedEstimatedTax, "Waiting for live trades"),
      subtext: selectedBroker === "ALL" ? "Combined statutory estimate" : `Filtered: ${selectedBroker}`,
      icon: DollarSign,
      iconColor: "text-amber-400",
      accent: "border-amber-500/20 bg-amber-500/5",
      type: "ESTIMATED",
      source: "Derived from tax rules",
    },
    {
      title: "Taxable Realized P&L",
      value: formatCurrency(displayedTaxablePnl, "Waiting for closed trades"),
      subtext: "Gross taxable gains subject to rules",
      icon: TrendingUp,
      iconColor: "text-emerald-400",
      accent: "border-emerald-500/20 bg-emerald-500/5",
      type: "REAL-TIME",
      source: "Calculated by Tax Engine",
    },
    {
      title: "Total Realized P&L",
      value: displayedRealizedPnl !== null ? (displayedRealizedPnl < 0 ? `-${formatCurrency(Math.abs(displayedRealizedPnl))}` : formatCurrency(displayedRealizedPnl)) : "N/A",
      subtext: "Executed closed trade profit/loss",
      icon: TrendingDown,
      iconColor: displayedRealizedPnl !== null && displayedRealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400",
      accent: displayedRealizedPnl !== null && displayedRealizedPnl >= 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5",
      type: "CONFIRMED",
      source: selectedBroker === "ALL" ? "Aggregated Brokers" : `Source: ${selectedBroker}`,
    },
    {
      title: "Net After Estimated Tax",
      value: formatCurrency(displayedNet, "N/A"),
      subtext: "Realized P&L minus estimated tax & fees",
      icon: PiggyBank,
      iconColor: "text-cyan-400",
      accent: "border-cyan-500/20 bg-cyan-500/5",
      type: "ESTIMATED",
      source: "Calculated by Tax Engine",
    },
    {
      title: "Unrealized Tax Exposure",
      value: formatCurrency(displayedUnrealizedPnl, "N/A"),
      subtext: "Open positions unrealized P&L",
      icon: Clock,
      iconColor: "text-blue-400",
      accent: "border-blue-500/20 bg-blue-500/5",
      type: "LIVE",
      source: "Live Position Stream",
    },
    {
      title: "Fees & Brokerage",
      value: formatCurrency(displayedFees, "₹0.00"),
      subtext: "Broker commissions separated",
      icon: Receipt,
      iconColor: "text-teal-400",
      accent: "border-teal-500/20 bg-teal-500/5",
      type: "CONFIRMED",
      source: "Source: Execution Gateway",
    },
    {
      title: "STT / Withholding Paid",
      value: formatCurrency(displayedTaxesPaid, "₹0.00"),
      subtext: "Transaction taxes & TDS deducted",
      icon: CheckCircle2,
      iconColor: "text-indigo-400",
      accent: "border-indigo-500/20 bg-indigo-500/5",
      type: "CONFIRMED",
      source: "Exchange Statutory Ledger",
    },
    {
      title: "Remaining Payable Estimate",
      value: formatCurrency(metrics.remaining_estimated_payable, "N/A"),
      subtext: "Estimated liability minus taxes paid",
      icon: AlertTriangle,
      iconColor: "text-amber-400",
      accent: "border-amber-500/20 bg-amber-500/5",
      type: "ESTIMATED",
      source: "Calculated by Tax Engine",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Controls Strip: Jurisdiction / Year / Status / Broker Filter */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-100 font-sans tracking-wide">
                TAX COMMAND CENTER
              </h2>
              {getConfidenceBadge(metrics.confidence)}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Statutory Jurisdiction: <span className="text-slate-200 font-semibold">{metrics.jurisdiction}</span> ({metrics.current_tax_year})
            </p>
          </div>
        </div>

        {/* Broker Segregation Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-mono mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Broker:
          </span>
          {["ALL", "Dhan", "Upstox", "Delta Exchange", "Paper Simulator"].map((b) => (
            <button
              key={b}
              onClick={() => onSelectBroker(b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                selectedBroker === b
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border border-indigo-500"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
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

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                <span className="truncate">{card.subtext}</span>
                <span className="text-indigo-400/80 shrink-0 ml-1">{card.source}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
