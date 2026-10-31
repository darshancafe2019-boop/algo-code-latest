"use client";

import React from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Receipt,
  Scale,
  Activity,
  Layers,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface TaxKpiMetrics {
  estimatedTaxLiability: number;
  taxableRealizedPnl: number;
  totalRealizedPnl: number;
  netAfterEstimatedTax: number;
  unrealizedTaxExposure: number;
  feesAndBrokerage: number;
  sttTdsPaid: number;
  remainingPayableEstimate: number;
}

interface TaxKpiCardsProps {
  metrics: TaxKpiMetrics;
  currency: string;
  selectedBroker: string;
}

export function TaxKpiCards({ metrics, currency, selectedBroker }: TaxKpiCardsProps) {
  const sym = currency === "INR" ? "₹" : "$";

  const cards = [
    // ── ROW 1 ──────────────────────────────────────────────────────────────
    {
      id: "est-liability",
      title: "ESTIMATED TAX LIABILITY",
      value: formatMoney(metrics.estimatedTaxLiability, sym),
      isProfit: false,
      badge: "ESTIMATED",
      badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: DollarSign,
      iconColor: "text-amber-400",
      description: "Statutory tax rules Section 111A / 112A / 115BBH",
      source: selectedBroker === "ALL" ? "Multi-Broker Consolidated" : `Source: ${selectedBroker}`,
    },
    {
      id: "taxable-pnl",
      title: "TAXABLE REALIZED P&L",
      value: formatMoney(metrics.taxableRealizedPnl, sym),
      isProfit: metrics.taxableRealizedPnl >= 0,
      badge: "ACTIVE ENGINE",
      badgeColor: "bg-[#168BFF]/15 text-[#00F0FF] border-[#168BFF]/30",
      icon: TrendingUp,
      iconColor: "text-[#00F0FF]",
      description: "Gross taxable gains net of eligible statutory loss set-offs",
      source: "Real-Time Tax Engine",
    },
    {
      id: "total-realized",
      title: "TOTAL REALIZED P&L",
      value: formatMoney(metrics.totalRealizedPnl, sym),
      isProfit: metrics.totalRealizedPnl >= 0,
      badge: "CONFIRMED",
      badgeColor: metrics.totalRealizedPnl >= 0 ? "bg-[#00E89A]/15 text-[#00E89A] border-[#00E89A]/30" : "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30",
      icon: metrics.totalRealizedPnl >= 0 ? TrendingUp : TrendingDown,
      iconColor: metrics.totalRealizedPnl >= 0 ? "text-[#00E89A]" : "text-[#FF3B5C]",
      description: "Confirmed closed-trade ledger profit / loss",
      source: "Portfolio Central Ledger",
    },
    {
      id: "net-after-tax",
      title: "NET AFTER ESTIMATED TAX",
      value: formatMoney(metrics.netAfterEstimatedTax, sym),
      isProfit: metrics.netAfterEstimatedTax >= 0,
      badge: "NET CAPITAL YIELD",
      badgeColor: metrics.netAfterEstimatedTax >= 0 ? "bg-[#00E89A]/15 text-[#00E89A] border-[#00E89A]/30" : "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30",
      icon: ShieldCheck,
      iconColor: "text-[#00E89A]",
      description: "Realized return after estimated tax & transaction charges",
      source: "Post-Tax Capital Yield",
    },

    // ── ROW 2 ──────────────────────────────────────────────────────────────
    {
      id: "unrealized-exposure",
      title: "UNREALIZED TAX EXPOSURE",
      value: formatMoney(metrics.unrealizedTaxExposure, sym),
      isProfit: metrics.unrealizedTaxExposure >= 0,
      badge: "MTM PENDING",
      badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      icon: Activity,
      iconColor: "text-purple-400",
      description: "Open positions potential tax liability on liquidation",
      source: "Mark-to-Market Feed",
    },
    {
      id: "fees-brokerage",
      title: "FEES & BROKERAGE",
      value: formatMoney(metrics.feesAndBrokerage, sym),
      isProfit: false,
      badge: "DEDUCTIBLE / STT",
      badgeColor: "bg-slate-500/15 text-slate-300 border-slate-500/30",
      icon: Receipt,
      iconColor: "text-[#7D8EA5]",
      description: "Exchange turnover fees, GST & broker commissions",
      source: "Reconciled Contract Notes",
    },
    {
      id: "stt-tds-paid",
      title: "STT / TDS PAID",
      value: formatMoney(metrics.sttTdsPaid, sym),
      isProfit: true,
      badge: "WITHHELD",
      badgeColor: "bg-[#00E89A]/15 text-[#00E89A] border-[#00E89A]/30",
      icon: CheckCircle2,
      iconColor: "text-[#00E89A]",
      description: "Securities Transaction Tax & Section 194S TDS credits",
      source: "Form 26AS & Broker Fills",
    },
    {
      id: "remaining-payable",
      title: "REMAINING PAYABLE ESTIMATE",
      value: formatMoney(metrics.remainingPayableEstimate, sym),
      isProfit: false,
      badge: "DUE ADVANCE TAX",
      badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: Scale,
      iconColor: "text-amber-400",
      description: "Estimated net tax payable after advance tax & TDS credits",
      source: "Section 211 Installment Engine",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 select-none">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3.5 hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between min-h-[115px] shadow-sm"
          >
            {/* Header: Title, Icon & Badge */}
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold text-[#7D8EA5] uppercase tracking-wider truncate">
                {card.title}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={cn("text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold", card.badgeColor)}>
                  {card.badge}
                </span>
                <Icon className={cn("h-3.5 w-3.5", card.iconColor)} />
              </div>
            </div>

            {/* Numerical Value */}
            <div className="my-1.5">
              <span className={cn("text-xl font-bold font-mono tracking-tight", card.iconColor)}>
                {card.value}
              </span>
            </div>

            {/* Subtext / Reference Footer */}
            <div className="pt-1.5 border-t border-[#10263A] flex items-center justify-between text-[10px] text-[#7D8EA5] leading-tight">
              <span className="truncate max-w-[170px]">{card.description}</span>
              <span className="font-mono text-[9px] text-[#22D3EE] shrink-0">{card.source}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

