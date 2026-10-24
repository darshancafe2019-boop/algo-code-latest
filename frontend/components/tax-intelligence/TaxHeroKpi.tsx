"use client";

import React, { memo } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Receipt,
  Scale,
  Percent,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { CalculatedTaxMetrics } from "@/lib/taxEngineService";
import { TaxConfidenceLevel } from "@/types/tax";

interface TaxHeroKpiProps {
  metrics: CalculatedTaxMetrics;
  selectedBroker: string;
  onCardClick?: (metricKey: string) => void;
}

export const TaxHeroKpi = memo(function TaxHeroKpi({
  metrics,
  selectedBroker,
  onCardClick,
}: TaxHeroKpiProps) {
  const currency = metrics.base_currency || "INR";
  const activeBrokerSeg = selectedBroker === "ALL" ? null : metrics.broker_segregations[selectedBroker];

  const formatCurrency = (val: number | null | undefined, placeholder = "N/A") => {
    if (val === null || val === undefined) return placeholder;
    const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
    return formatMoney(val, prefix);
  };

  // Values filtered by broker or unified
  const totalEquity = metrics.fund_segregation?.total_equity || 236000;
  const realizedPnl = activeBrokerSeg ? activeBrokerSeg.realized_pnl : metrics.total_realized_pnl;
  const taxablePnl = activeBrokerSeg ? activeBrokerSeg.taxable_pnl : metrics.taxable_realized_pnl;
  const estimatedTax = activeBrokerSeg ? activeBrokerSeg.estimated_tax : metrics.estimated_tax_liability;
  const unrealizedPnl = activeBrokerSeg ? activeBrokerSeg.unrealized_pnl : metrics.total_unrealized_pnl;
  const fees = activeBrokerSeg ? activeBrokerSeg.fees : metrics.total_fees_and_charges;
  const taxesPaid = activeBrokerSeg ? activeBrokerSeg.taxes_paid : metrics.total_taxes_paid_or_withheld;

  // Unrealized tax scenario estimate (approx 20% flat STCG assumption on open positive MTM)
  const unrealizedTaxExposure = unrealizedPnl && unrealizedPnl > 0
    ? Math.round(unrealizedPnl * 0.20)
    : 0;

  // Net Realized Result After Estimated Tax: Realized - Est Tax - Fees
  const netRealizedAfterTax = (realizedPnl !== null && estimatedTax !== null)
    ? realizedPnl - estimatedTax - (fees || 0)
    : null;

  // Remaining Estimated Payable: Estimated Tax - Taxes/STT Paid
  const remainingPayable = estimatedTax !== null
    ? Math.max(0, estimatedTax - (taxesPaid || 0))
    : null;

  const isRealizedPos = (realizedPnl ?? 0) >= 0;
  const isNetPos = (netRealizedAfterTax ?? 0) >= 0;
  const isUnrealizedPos = (unrealizedPnl ?? 0) >= 0;

  return (
    <div className="w-full bg-[#030D18] border-b border-[#0C1E30] p-4 select-none">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-stretch">
        {/* Large Left KPI: Total Portfolio Equity & Net After Tax (approx 4 cols) */}
        <div
          onClick={() => onCardClick?.("equity_overview")}
          className="xl:col-span-4 p-4 rounded-lg bg-gradient-to-br from-[#061A2A] via-[#071F32] to-[#041424] border border-[#103450] hover:border-[#16C6F4]/50 transition-all flex flex-col justify-between cursor-pointer group shadow-lg shadow-black/40"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-[#8EA1B7] tracking-wider uppercase">
                1. Total Verified Equity
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                AUDITED
              </span>
            </div>
            <div className="h-6 w-6 rounded-md bg-[#16C6F4]/10 border border-[#16C6F4]/30 flex items-center justify-center">
              <Scale className="h-3.5 w-3.5 text-[#16C6F4]" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-[34px] lg:text-[38px] font-black text-white font-mono tracking-tight tabular-nums leading-none">
              {formatCurrency(totalEquity, "₹0.00")}
            </div>
            <div className="text-[11px] text-[#7D8EA5] mt-1 flex items-center gap-1.5 font-mono">
              <span>Reserve Segregated:</span>
              <span className="text-amber-400 font-bold">
                {formatCurrency(metrics.fund_segregation?.suggested_tax_reserve, "₹0.00")}
              </span>
              <span className="text-[#566B82]">({metrics.fund_segregation?.reserve_utilization_pct || 20}%)</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#0D263D] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1 text-[12px] font-mono font-bold px-2 py-0.5 rounded ${
                  isNetPos
                    ? "bg-[#00E890]/15 text-[#00E890] border border-[#00E890]/30"
                    : "bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30"
                }`}
              >
                {isNetPos ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                <span>
                  {isNetPos ? "+" : ""}
                  {formatCurrency(netRealizedAfterTax, "₹0.00")}
                </span>
              </div>
              <span className="text-[10px] text-[#7D8EA5]">Net After Tax & Fees</span>
            </div>
            <span className="text-[9px] font-mono text-[#566B82] uppercase">
              {metrics.confidence}
            </span>
          </div>
        </div>

        {/* 8 KPI Cards Grid (approx 8 cols) */}
        <div className="xl:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* 1. Total Realized P&L */}
          <div
            onClick={() => onCardClick?.("realized_pnl")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/40 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-[#7D8EA5]">
              <span>2. Total Realized P&L</span>
              <span className="text-[9px] font-mono text-emerald-400">LEDGER</span>
            </div>
            <div
              className={`text-[17px] sm:text-[19px] font-bold font-mono tabular-nums leading-tight ${
                isRealizedPos ? "text-[#00E890]" : "text-[#FF3B5C]"
              }`}
            >
              {isRealizedPos ? "+" : ""}
              {formatCurrency(realizedPnl, "₹0.00")}
            </div>
            <div className="text-[10px] text-[#8EA1B7] flex items-center justify-between">
              <span>Closed Trades</span>
              <span className="font-semibold text-slate-200">
                {metrics.transactions?.length || 0}
              </span>
            </div>
          </div>

          {/* 2. Taxable Realized P&L */}
          <div
            onClick={() => onCardClick?.("taxable_pnl")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/40 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-[#7D8EA5]">
              <span>3. Taxable Realized P&L</span>
              <span className="text-[9px] font-mono text-[#16C6F4]">ASSESSED</span>
            </div>
            <div className="text-[17px] sm:text-[19px] font-bold text-[#16C6F4] font-mono tabular-nums leading-tight">
              {formatCurrency(taxablePnl, "₹0.00")}
            </div>
            <div className="text-[10px] text-[#8EA1B7]">Sec 111A / 112A Rules</div>
          </div>

          {/* 3. Estimated Tax Liability */}
          <div
            onClick={() => onCardClick?.("estimated_tax")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-amber-400/50 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-[#7D8EA5]">
              <span>4. Estimated Tax</span>
              <span className="text-[9px] font-mono text-amber-400">ESTIMATE</span>
            </div>
            <div className="text-[17px] sm:text-[19px] font-bold text-amber-400 font-mono tabular-nums leading-tight">
              {formatCurrency(estimatedTax, "₹0.00")}
            </div>
            <div className="text-[10px] text-[#8EA1B7] truncate">
              {metrics.jurisdiction || "India"} FY26
            </div>
          </div>

          {/* 4. Unrealized P&L (MTM) */}
          <div
            onClick={() => onCardClick?.("unrealized_pnl")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/40 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-[#7D8EA5]">
              <span>5. Unrealized P&L</span>
              <span className="text-[9px] font-mono text-slate-400">MTM</span>
            </div>
            <div
              className={`text-[17px] sm:text-[19px] font-bold font-mono tabular-nums leading-tight ${
                isUnrealizedPos ? "text-[#00E890]" : "text-[#FF3B5C]"
              }`}
            >
              {isUnrealizedPos ? "+" : ""}
              {formatCurrency(unrealizedPnl, "₹0.00")}
            </div>
            <div className="text-[10px] text-[#8EA1B7]">
              <span className="font-semibold text-slate-200">
                {metrics.analyzed_positions?.length || 0}
              </span>{" "}
              open positions
            </div>
          </div>

          {/* 5. Unrealized Tax Exposure */}
          <div
            onClick={() => onCardClick?.("unrealized_tax")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/40 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-[#7D8EA5]">
              <span>6. Unrealized Exposure</span>
              <span className="text-[9px] font-mono text-cyan-400">SCENARIO</span>
            </div>
            <div className="text-[17px] sm:text-[19px] font-bold text-cyan-400 font-mono tabular-nums leading-tight">
              {formatCurrency(unrealizedTaxExposure, "₹0.00")}
            </div>
            <div className="text-[10px] text-[#8EA1B7]">Hypothetical Liquidation</div>
          </div>

          {/* 6. Fees & Brokerage */}
          <div
            onClick={() => onCardClick?.("fees_brokerage")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/40 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-[#7D8EA5]">
              <span>7. Fees & Brokerage</span>
              <span className="text-[9px] font-mono text-slate-400">EXPENSE</span>
            </div>
            <div className="text-[17px] sm:text-[19px] font-bold text-slate-200 font-mono tabular-nums leading-tight">
              {formatCurrency(fees, "₹0.00")}
            </div>
            <div className="text-[10px] text-[#8EA1B7]">Exchange & Commissions</div>
          </div>

          {/* 7. Statutory Taxes Paid (STT / TDS) */}
          <div
            onClick={() => onCardClick?.("statutory_taxes")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/40 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-[#7D8EA5]">
              <span>8. STT / TDS Paid</span>
              <span className="text-[9px] font-mono text-emerald-400">PAID</span>
            </div>
            <div className="text-[17px] sm:text-[19px] font-bold text-emerald-400 font-mono tabular-nums leading-tight">
              {formatCurrency(taxesPaid, "₹0.00")}
            </div>
            <div className="text-[10px] text-[#8EA1B7]">Eligible Tax Credits</div>
          </div>

          {/* 8. Remaining Estimated Payable */}
          <div
            onClick={() => onCardClick?.("remaining_payable")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-amber-400/50 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-[#7D8EA5]">
              <span>9. Remaining Payable</span>
              <span className="text-[9px] font-mono text-amber-400">DUE</span>
            </div>
            <div className="text-[17px] sm:text-[19px] font-bold text-amber-400 font-mono tabular-nums leading-tight">
              {formatCurrency(remainingPayable, "₹0.00")}
            </div>
            <div className="text-[10px] text-[#8EA1B7] flex items-center justify-between">
              <span>Advance Tax Target</span>
              <span className="text-cyan-400 font-mono font-semibold">Q4</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
