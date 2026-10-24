"use client";

import React, { memo } from "react";
import { Calendar, Clock, CheckCircle2, AlertTriangle, ShieldCheck, ExternalLink } from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { QuarterlyAdvanceTaxInstallment } from "@/lib/taxEngineService";

interface AdvanceTaxScheduleViewProps {
  installments: QuarterlyAdvanceTaxInstallment[];
  totalEstimatedLiability: number;
  currency: string;
}

export const AdvanceTaxScheduleView = memo(function AdvanceTaxScheduleView({
  installments,
  totalEstimatedLiability,
  currency,
}: AdvanceTaxScheduleViewProps) {
  const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;

  return (
    <div className="space-y-4">
      {/* ── Top Overview Banner ──────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-[#061A2A] border border-[#0F2D48] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#092237] border border-[#16C6F4]/30 text-[#16C6F4]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
              ADVANCE TAX STATUTORY PAYMENT SCHEDULE (INCOME TAX ACT SEC 208-211)
            </h3>
            <p className="text-[11px] text-[#7D8EA5] font-mono">
              Mandatory advance tax compliance installments to avoid Section 234B & 234C interest penalties
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-slate-400">Total Annual Liability:</span>
          <span className="font-bold text-amber-400 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">
            {formatMoney(totalEstimatedLiability, prefix)}
          </span>
        </div>
      </div>

      {/* ── 4 Quarterly Installments Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {installments.map((inst) => {
          const isPaid = inst.status === "PAID";
          const isApproaching = inst.status === "APPROACHING";

          return (
            <div
              key={inst.quarter}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                isPaid
                  ? "bg-[#061F1A] border-[#00E890]/30 shadow-sm"
                  : isApproaching
                  ? "bg-[#0F1E2E] border-[#16C6F4]/50 shadow-md ring-1 ring-[#16C6F4]/30"
                  : "bg-[#061A2A] border-[#0F2D48]"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#0C2237]">
                <div className="flex items-center gap-1.5">
                  <span className="h-6 w-6 rounded bg-[#092237] border border-[#133A5C] text-[#16C6F4] font-mono font-bold text-[11px] flex items-center justify-center">
                    {inst.quarter}
                  </span>
                  <span className="text-[12px] font-bold text-white font-sans">
                    {inst.label}
                  </span>
                </div>
                {isPaid ? (
                  <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-[#00E890] px-2 py-0.5 rounded bg-[#00E890]/10 border border-[#00E890]/30">
                    <CheckCircle2 className="w-3 h-3" />
                    PAID
                  </span>
                ) : (
                  <span className="text-[9px] font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                    {inst.days_remaining}d LEFT
                  </span>
                )}
              </div>

              {/* Installment Body */}
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-[#7D8EA5]">Statutory Due Date:</span>
                  <span className="font-semibold text-slate-200">{inst.statutory_due_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D8EA5]">Cumulative Target:</span>
                  <span className="font-bold text-[#16C6F4]">{inst.cumulative_target_pct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D8EA5]">Quarter Payable:</span>
                  <span className="font-bold text-amber-400 tabular-nums">
                    {formatMoney(inst.quarter_payable_amount, prefix)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D8EA5]">Cumulative Target:</span>
                  <span className="text-slate-300 tabular-nums">
                    {formatMoney(inst.cumulative_tax_target, prefix)}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-[#0C2237] flex items-center justify-between text-[10px] font-mono text-[#7D8EA5]">
                <span>Status</span>
                <span className={isPaid ? "text-[#00E890] font-bold" : "text-amber-300 font-semibold"}>
                  {inst.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
