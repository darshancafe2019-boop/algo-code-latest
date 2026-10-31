"use client";

import React from "react";
import { Calculator, CheckCircle2, AlertTriangle, ShieldCheck, BookOpen, Layers } from "lucide-react";

export function TaxCalculationEngineView() {
  const rules = [
    {
      section: "Section 111A",
      head: "Short-Term Capital Gains (STCG)",
      scope: "Listed Equities & Equity Mutual Funds held <= 12 months",
      rate: "20.0%",
      effectiveDate: "Finance Act 2024 (23 July 2024 onwards)",
      setOff: "Can be set off against STCG and LTCG only; carry forward up to 8 assessment years",
      status: "ACTIVE",
    },
    {
      section: "Section 112A",
      head: "Long-Term Capital Gains (LTCG)",
      scope: "Listed Equities held > 12 months (Exemption limit: ₹1,25,000)",
      rate: "12.5%",
      effectiveDate: "Finance Act 2024 (23 July 2024 onwards)",
      setOff: "Can be set off against LTCG only; cannot set off against STCG or business income",
      status: "ACTIVE",
    },
    {
      section: "Section 43(5) & Section 28",
      head: "Non-Speculative Business Income",
      scope: "Equity Futures & Options (F&O) and Commodity Derivatives (MCX)",
      rate: "Applicable Slab Rates",
      effectiveDate: "Income Tax Act 1961",
      setOff: "Business expenses and STT deductible; set off against any income except salary",
      status: "ACTIVE",
    },
    {
      section: "Section 73",
      head: "Speculative Business Income",
      scope: "Intraday Equity Cash Trades (Squared off without delivery)",
      rate: "Applicable Slab Rates",
      effectiveDate: "Income Tax Act 1961",
      setOff: "Losses can ONLY be set off against speculative business profits; 4 years carry forward",
      status: "ACTIVE",
    },
    {
      section: "Section 115BBH",
      head: "Virtual Digital Assets (VDA / Crypto)",
      scope: "Crypto Spot, Futures, and Derivatives (Delta Exchange, Binance)",
      rate: "Flat 30.0% + 4% Cess",
      effectiveDate: "Finance Act 2022 onwards",
      setOff: "STRICT ZERO SET-OFF: Crypto losses cannot be set off against ANY income (including crypto gains)",
      status: "ISOLATED",
    },
    {
      section: "Section 194S",
      head: "TDS on Virtual Digital Assets",
      scope: "Transfer of VDA exceeding ₹50,000/year (or ₹10,000 for specified persons)",
      rate: "1.0% Withholding",
      effectiveDate: "Finance Act 2022 onwards",
      setOff: "Eligible for credit against total tax liability; recorded in Form 26AS",
      status: "CREDIT RECORDED",
    },
  ];

  return (
    <div className="space-y-4 select-none animate-fadeIn">
      {/* Title */}
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-4 shadow-md flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-[#00F0FF]" />
            <h2 className="text-sm font-bold text-[#F8FAFC] tracking-wider uppercase">
              STATUTORY TAX RULE ENGINE & LOSS SET-OFF MATRIX
            </h2>
          </div>
          <p className="text-xs text-[#7D8EA5] mt-0.5">
            Finance Act 2024 codified statutory provisions, holding period classifications, and non-contamination set-off rules.
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-[#00E89A] px-2.5 py-1 rounded bg-[#00E89A]/10 border border-[#00E89A]/30">
          6 Statutory Heads Configured
        </span>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {rules.map((r) => (
          <div key={r.section} className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3.5 flex flex-col justify-between shadow-sm hover:border-[#168BFF]/40 transition-colors">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
                <div>
                  <span className="text-[10px] font-mono text-[#00F0FF] font-bold block">{r.section}</span>
                  <span className="text-sm font-bold text-[#F8FAFC]">{r.head}</span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {r.rate}
                </span>
              </div>
              <p className="text-xs text-[#7D8EA5] mb-2">{r.scope}</p>
              <div className="text-[11px] font-mono bg-[#06101B] p-2.5 rounded border border-[#122A42] text-slate-300">
                <span className="text-[#22D3EE] font-bold block mb-0.5">Set-Off & Loss Restriction:</span>
                {r.setOff}
              </div>
            </div>
            <div className="pt-2 mt-2 border-t border-[#10263A] flex items-center justify-between text-[10px] text-[#7D8EA5]">
              <span>Legislation: <span className="text-[#F8FAFC]">{r.effectiveDate}</span></span>
              <span className="font-mono text-[#00E89A] font-bold">{r.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

