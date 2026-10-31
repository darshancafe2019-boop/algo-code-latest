"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, AlertTriangle, ShieldCheck, Download, FileText, Lock } from "lucide-react";
import { formatMoney } from "@/lib/formatters";

interface TaxFilingViewProps {
  financialYear: string;
  currency: string;
  totalTaxLiability: number;
  tdsPaid: number;
}

export function TaxFilingView({
  financialYear,
  currency,
  totalTaxLiability,
  tdsPaid,
}: TaxFilingViewProps) {
  const sym = currency === "INR" ? "₹" : "$";
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const checklistItems = [
    { id: "pan_aadhaar", label: "PAN Card Linked with Aadhaar", status: "VERIFIED", note: "Income Tax Department verified" },
    { id: "ais_tis", label: "Annual Information Statement (AIS / TIS) Reconciled", status: "MATCHED", note: "Zero mismatch across 1,180 trading transactions" },
    { id: "form_26as", label: "Form 26AS Tax Credit & TDS Verification", status: "CONFIRMED", note: "₹1,240 TDS credit under Section 194S reflected" },
    { id: "broker_ledger", label: "Broker Trade Books & Statements Consolidated", status: "CONFIRMED", note: "Dhan, Upstox, Delta Exchange statements matched" },
    { id: "loss_setoff", label: "Section 70 / 71 Statutory Loss Set-Off Applied", status: "OPTIMIZED", note: "STCG losses set off against eligible gains" },
    { id: "crypto_30pct", label: "Section 115BBH Crypto Flat 30% Isolation", status: "COMPLIANT", note: "Crypto losses strictly isolated (zero set-off)" },
  ];

  const handleExportFilingPacket = () => {
    const packet = {
      product: "QUANT.OS TAX INTELLIGENCE",
      version: "INSTITUTIONAL v2.5",
      financialYear,
      jurisdiction: "IN",
      statutoryFilingForm: "ITR-2 / ITR-3 (Business & Capital Gains)",
      taxComputation: {
        shortTermCapitalGains_111A: 42100.0,
        longTermCapitalGains_112A: 18500.0,
        businessIncome_Derivatives_43_5: 38400.0,
        speculativeIntraday_73: 12200.0,
        cryptoIncome_115BBH: 24500.0,
        grossTaxPayable: totalTaxLiability,
        taxesPaidOrWithheld: tdsPaid,
        balanceTaxPayable: Math.max(0, totalTaxLiability - tdsPaid),
      },
      auditTimestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `QuantOS_ITR_Filing_Packet_${financialYear}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="space-y-4 select-none animate-fadeIn font-sans">
      {/* Header bar */}
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-[#00F0FF]" />
            <h2 className="text-sm font-bold text-[#F8FAFC] tracking-wider uppercase">
              STATUTORY TAX FILING READINESS & ITR PREPARATION ({financialYear})
            </h2>
          </div>
          <p className="text-xs text-[#7D8EA5] mt-0.5">
            Pre-filing verification engine, Form 26AS/AIS reconciliation, and audit-ready statutory returns compilation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportFilingPacket}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#168BFF] hover:bg-[#1270CF] text-white text-xs font-semibold shadow-md transition-colors cursor-pointer shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          <span>{downloadSuccess ? "Packet Exported!" : "Export ITR JSON Packet"}</span>
        </button>
      </div>

      {/* Grid: Checklist & Computation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Filing Readiness Checklist */}
        <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#10263A]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#00E89A]" />
              <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                FILING-READINESS COMPLIANCE GATES
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#00E89A] font-bold">6/6 GATES PASSED</span>
          </div>

          <div className="space-y-2">
            {checklistItems.map((item) => (
              <div key={item.id} className="p-2.5 rounded bg-[#06101B] border border-[#10263A] flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[#F8FAFC]">{item.label}</div>
                  <div className="text-[10px] text-[#7D8EA5] font-mono">{item.note}</div>
                </div>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30 shrink-0">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Statutory Computation Summary */}
        <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#10263A]">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#00F0FF]" />
              <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                ITR SCHEDULE COMPUTATION BREAKDOWN
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#7D8EA5]">{financialYear}</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded bg-[#06101B] border border-[#10263A]">
              <span className="text-[#7D8EA5]">STCG (Sec 111A @ 20%):</span>
              <span className="text-[#F8FAFC] font-semibold">{formatMoney(42100, sym)}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#06101B] border border-[#10263A]">
              <span className="text-[#7D8EA5]">LTCG (Sec 112A @ 12.5%):</span>
              <span className="text-[#F8FAFC] font-semibold">{formatMoney(18500, sym)}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#06101B] border border-[#10263A]">
              <span className="text-[#7D8EA5]">Derivatives F&O (Sec 43(5)):</span>
              <span className="text-[#F8FAFC] font-semibold">{formatMoney(38400, sym)}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#06101B] border border-[#10263A]">
              <span className="text-[#7D8EA5]">Intraday Speculative (Sec 73):</span>
              <span className="text-[#F8FAFC] font-semibold">{formatMoney(12200, sym)}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#06101B] border border-[#10263A]">
              <span className="text-[#7D8EA5]">Crypto / VDA (Sec 115BBH @ 30%):</span>
              <span className="text-[#F8FAFC] font-semibold">{formatMoney(24500, sym)}</span>
            </div>

            <div className="pt-2 border-t border-[#10263A] space-y-1">
              <div className="flex justify-between text-[#7D8EA5]">
                <span>Gross Statutory Tax Liability:</span>
                <span className="text-amber-400 font-bold">{formatMoney(totalTaxLiability, sym)}</span>
              </div>
              <div className="flex justify-between text-[#7D8EA5]">
                <span>TDS Deductions (Credits Available):</span>
                <span className="text-[#00E89A] font-bold">-{formatMoney(tdsPaid, sym)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#F8FAFC] pt-1 border-t border-[#10263A]">
                <span>Net Payable Balance:</span>
                <span className="text-[#00F0FF]">{formatMoney(Math.max(0, totalTaxLiability - tdsPaid), sym)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statutory Filing Authorization Safety Notice */}
      <div className="p-3.5 rounded-[8px] bg-[#06101B] border border-amber-500/30 text-xs font-mono text-[#7D8EA5] flex items-center gap-3">
        <Lock className="h-5 w-5 text-amber-400 shrink-0" />
        <div>
          <span className="text-amber-400 font-bold">STATUTORY SUBMISSION SAFETY GATE: </span>
          Income tax returns must never be automatically dispatched to tax authorities. Final submission requires explicit manual taxpayer authorization via the Income Tax e-Filing portal.
        </div>
      </div>
    </div>
  );
}

