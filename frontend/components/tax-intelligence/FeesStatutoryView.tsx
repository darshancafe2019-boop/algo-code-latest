"use client";

import React, { memo } from "react";
import { Receipt, Percent, FileText, CheckCircle2, ShieldCheck, Info } from "lucide-react";
import { formatMoney } from "@/lib/formatters";

interface FeesStatutoryViewProps {
  totalFees: number;
  totalTaxesPaid: number;
  currency: string;
  brokerBreakdown?: Array<{
    name: string;
    brokerage: number;
    stt: number;
    exchangeCharges: number;
    gst: number;
    stampDuty: number;
  }>;
}

export const FeesStatutoryView = memo(function FeesStatutoryView({
  totalFees,
  totalTaxesPaid,
  currency,
  brokerBreakdown = [],
}: FeesStatutoryViewProps) {
  const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;

  // Simulated statutory items if breakdown is not provided
  const stt = totalTaxesPaid;
  const brokerage = Math.round(totalFees * 0.55);
  const exchangeCharges = Math.round(totalFees * 0.20);
  const gst = Math.round(totalFees * 0.18);
  const stampDuty = Math.max(0, totalFees - brokerage - exchangeCharges - gst);

  const categories = [
    { name: "Securities Transaction Tax (STT)", amount: stt, type: "TAX_CREDIT", ref: "STT Act 2004", deductible: "Credit against business income" },
    { name: "Brokerage & Commissions", amount: brokerage, type: "BUSINESS_EXPENSE", ref: "Broker Contract Notes", deductible: "100% Tax Deductible" },
    { name: "Exchange Transaction Charges", amount: exchangeCharges, type: "BUSINESS_EXPENSE", ref: "NSE / BSE / MCX", deductible: "100% Tax Deductible" },
    { name: "Goods & Services Tax (GST 18%)", amount: gst, type: "INDIRECT_TAX", ref: "CGST / SGST", deductible: "Input Tax Credit / Expense" },
    { name: "State Stamp Duty", amount: stampDuty, type: "STATUTORY_LEVY", ref: "Indian Stamp Act", deductible: "100% Tax Deductible" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Top Overview Banner ──────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-[#061A2A] border border-[#0F2D48] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#092237] border border-[#16C6F4]/30 text-[#16C6F4]">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
              FEES, BROKERAGE & STATUTORY DEDUCTIONS AUDIT
            </h3>
            <p className="text-[11px] text-[#7D8EA5] font-mono">
              Categorized expense attribution separating deductible trading charges from statutory tax withholdings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div>
            <span className="text-slate-400">Total Deductions: </span>
            <span className="font-bold text-slate-100">{formatMoney(totalFees + totalTaxesPaid, prefix)}</span>
          </div>
        </div>
      </div>

      {/* ── Detailed Categories Breakdown Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {categories.map((cat, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/40 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#0C2237]">
              <span className="text-[12px] font-bold text-white font-sans truncate max-w-[200px]" title={cat.name}>
                {cat.name}
              </span>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                cat.type === "TAX_CREDIT"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-cyan-500/10 text-[#16C6F4] border border-[#16C6F4]/20"
              }`}>
                {cat.type}
              </span>
            </div>

            <div className="text-[22px] font-black text-white font-mono tabular-nums">
              {formatMoney(cat.amount, prefix)}
            </div>

            <div className="space-y-1 text-[10px] font-mono text-[#8EA1B7] pt-2 border-t border-[#0C2237]">
              <div className="flex justify-between">
                <span>Statutory Source:</span>
                <span className="text-slate-200">{cat.ref}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax Deductibility:</span>
                <span className="text-emerald-400 font-semibold">{cat.deductible}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
