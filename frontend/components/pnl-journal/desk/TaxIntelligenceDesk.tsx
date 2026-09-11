"use client";

import React, { useState, useMemo } from "react";
import {
  Scale,
  Calculator,
  AlertTriangle,
  CheckCircle,
  FileText,
  HelpCircle,
  TrendingUp,
  Percent,
} from "lucide-react";
import { TradeRecord, PnlSummary } from "@/types/pnl-journal";

interface TaxIntelligenceDeskProps {
  trades: TradeRecord[];
  summary: PnlSummary;
  currencySymbol?: string;
}

export const TaxIntelligenceDesk: React.FC<TaxIntelligenceDeskProps> = ({
  trades,
  summary,
  currencySymbol = "₹",
}) => {
  const [financialYear, setFinancialYear] = useState<"FY2425" | "FY2526">("FY2425");
  const [assumedTaxSlab, setAssumedTaxSlab] = useState<number>(30); // 30% slab by default

  // Tax calculations
  const taxData = useMemo(() => {
    // 1. Intraday Equity (Speculative Business Income)
    const intradayEquityTrades = trades.filter((t) => t.assetClass === "EQUITY");
    const speculativeProfit = intradayEquityTrades.reduce((acc, t) => acc + t.netPnl, 0);

    // 2. F&O (Non-Speculative Business Income - Section 43(5))
    const fnoTrades = trades.filter((t) => t.assetClass === "OPTIONS" || t.assetClass === "FUTURES");
    const fnoNetPnl = fnoTrades.reduce((acc, t) => acc + t.netPnl, 0);

    // 3. Crypto / VDA (Section 115BBH - 30% flat tax on gains, no loss setoff allowed)
    const cryptoTrades = trades.filter((t) => t.assetClass === "CRYPTO");
    const cryptoGains = cryptoTrades
      .filter((t) => t.netPnl > 0)
      .reduce((acc, t) => acc + t.netPnl, 0);
    const cryptoLosses = cryptoTrades
      .filter((t) => t.netPnl < 0)
      .reduce((acc, t) => acc + Math.abs(t.netPnl), 0);
    const cryptoTaxPayable = cryptoGains * 0.30;

    // 4. Section 44AB Turnover Calculation
    // For F&O: Absolute profit + Absolute loss + Sale premium
    let section44abTurnover = 0;
    fnoTrades.forEach((t) => {
      section44abTurnover += Math.abs(t.grossPnl);
    });
    intradayEquityTrades.forEach((t) => {
      section44abTurnover += Math.abs(t.grossPnl);
    });

    const isAuditRequired = section44abTurnover > 100000000; // 10 Cr digital threshold

    // Estimated Business Tax
    const totalBusinessIncome = Math.max(0, speculativeProfit + fnoNetPnl);
    const estimatedBusinessTax = totalBusinessIncome * (assumedTaxSlab / 100);
    const totalEstimatedTax = estimatedBusinessTax + cryptoTaxPayable;

    // Advance Tax Installments
    const q1Due = totalEstimatedTax * 0.15; // 15% Jun 15
    const q2Due = totalEstimatedTax * 0.45; // 45% Sep 15
    const q3Due = totalEstimatedTax * 0.75; // 75% Dec 15
    const q4Due = totalEstimatedTax * 1.00; // 100% Mar 15

    return {
      speculativeProfit,
      fnoNetPnl,
      cryptoGains,
      cryptoLosses,
      cryptoTaxPayable,
      section44abTurnover,
      isAuditRequired,
      totalBusinessIncome,
      estimatedBusinessTax,
      totalEstimatedTax,
      advanceTax: { q1Due, q2Due, q3Due, q4Due },
    };
  }, [trades, assumedTaxSlab]);

  const formatMoney = (val: number) => {
    return `${val < 0 ? "-" : ""}${currencySymbol}${Math.abs(val).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-md flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Indian Income Tax Intelligence & Section 44AB Audit Desk
            </h3>
            <p className="text-[11px] text-slate-400">
              Tax computation according to Section 43(5), Section 44AB & VDA Section 115BBH rules
            </p>
          </div>
        </div>

        {/* Financial Year & Slab Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setFinancialYear("FY2425")}
              className={`px-2.5 py-1 rounded ${
                financialYear === "FY2425" ? "bg-purple-600 text-white font-bold" : "text-slate-400"
              }`}
            >
              FY 2024-25 (AY 2025-26)
            </button>
            <button
              type="button"
              onClick={() => setFinancialYear("FY2526")}
              className={`px-2.5 py-1 rounded ${
                financialYear === "FY2526" ? "bg-purple-600 text-white font-bold" : "text-slate-400"
              }`}
            >
              FY 2025-26 (AY 2026-27)
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono">
            <span className="text-slate-400">Tax Slab:</span>
            <select
              value={assumedTaxSlab}
              onChange={(e) => setAssumedTaxSlab(Number(e.target.value))}
              className="bg-transparent text-slate-200 font-bold focus:outline-none"
            >
              <option value={30} className="bg-slate-900">30% (Highest Slab)</option>
              <option value={20} className="bg-slate-900">20%</option>
              <option value={15} className="bg-slate-900">15%</option>
              <option value={0} className="bg-slate-900">0% (Nil)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tax Buckets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
        {/* Bucket 1: Non-Speculative F&O */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase">Non-Speculative (F&O)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              Sec 43(5)
            </span>
          </div>
          <div className={`text-lg font-bold ${
            taxData.fnoNetPnl >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}>
            {formatMoney(taxData.fnoNetPnl)}
          </div>
          <p className="text-[11px] text-slate-400 font-sans">
            Taxed as normal business income at slab rates. Expenses (brokerage, subscriptions, depreciation) can be offset.
          </p>
        </div>

        {/* Bucket 2: Speculative Intraday */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase">Speculative (Equity Day)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
              Sec 73
            </span>
          </div>
          <div className={`text-lg font-bold ${
            taxData.speculativeProfit >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}>
            {formatMoney(taxData.speculativeProfit)}
          </div>
          <p className="text-[11px] text-slate-400 font-sans">
            Speculative losses can ONLY be set off against speculative profits. Cannot offset F&O or STCG gains.
          </p>
        </div>

        {/* Bucket 3: Crypto / VDA Section 115BBH */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase">Virtual Digital Assets</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
              Sec 115BBH (30%)
            </span>
          </div>
          <div className="text-lg font-bold text-purple-400">
            {currencySymbol}{taxData.cryptoTaxPayable.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono flex justify-between">
            <span>Gains: {currencySymbol}{taxData.cryptoGains.toFixed(2)}</span>
            <span className="text-rose-400">Loss: {currencySymbol}{taxData.cryptoLosses.toFixed(2)} (No Offset)</span>
          </div>
        </div>
      </div>

      {/* Section 44AB Turnover & Audit Check */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200 uppercase">
              Section 44AB Tax Audit Turnover
            </span>
          </div>
          <div className="text-base font-bold text-cyan-300">
            {currencySymbol}{taxData.section44abTurnover.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 font-sans">
            Calculated as sum of absolute profits & losses across all derivative contracts.
          </p>
        </div>

        {/* Audit Status Badge */}
        <div className="flex items-center gap-3">
          {taxData.isAuditRequired ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <div className="font-bold">TAX AUDIT REQUIRED</div>
                <div className="text-[10px] text-rose-400">Turnover exceeds ₹10 Cr limit</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="font-bold">NO AUDIT MANDATED</div>
                <div className="text-[10px] text-emerald-400">Turnover within ₹10 Cr digital threshold</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advance Tax Quarterly Schedule */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Quarterly Advance Tax Schedule (Estimated: {currencySymbol}{taxData.totalEstimatedTax.toFixed(2)})
          </h4>
          <span className="text-[10px] text-slate-500">Sec 208 / 234C</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-slate-500 text-[10px]">Q1 (By Jun 15) • 15%</div>
            <div className="font-bold text-slate-200 mt-1">{currencySymbol}{taxData.advanceTax.q1Due.toFixed(2)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-slate-500 text-[10px]">Q2 (By Sep 15) • 45%</div>
            <div className="font-bold text-slate-200 mt-1">{currencySymbol}{taxData.advanceTax.q2Due.toFixed(2)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-slate-500 text-[10px]">Q3 (By Dec 15) • 75%</div>
            <div className="font-bold text-slate-200 mt-1">{currencySymbol}{taxData.advanceTax.q3Due.toFixed(2)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-slate-500 text-[10px]">Q4 (By Mar 15) • 100%</div>
            <div className="font-bold text-slate-200 mt-1">{currencySymbol}{taxData.advanceTax.q4Due.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
