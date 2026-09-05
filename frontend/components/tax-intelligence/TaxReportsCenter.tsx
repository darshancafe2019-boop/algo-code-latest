"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { TaxOverviewPayload } from "@/types/tax";

interface TaxReportsCenterProps {
  overviewData: TaxOverviewPayload;
  currency: string;
}

export function TaxReportsCenter({ overviewData, currency }: TaxReportsCenterProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadCSV = (reportType: string) => {
    setDownloading(reportType);

    let csvContent = "";
    let filename = `QuantOS_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (reportType === "ANNUAL_TAX_SUMMARY") {
      csvContent = `Metric,Amount (${currency}),Classification,Statutory Source\n`;
      csvContent += `Gross Realized Gains,${overviewData.command_center.realized_taxable_gains},Confirmed,IT Act Section 111A/112A\n`;
      csvContent += `Allowable Losses,${overviewData.command_center.realized_losses},Confirmed,IT Act Section 70/71\n`;
      csvContent += `Net Capital Gains,${overviewData.command_center.net_realized_pl},Confirmed,IT Act 1961\n`;
      csvContent += `Estimated Tax Liability,${overviewData.command_center.estimated_tax_liability},Estimate,Finance Act 2024\n`;
      csvContent += `Transaction Taxes Paid (STT),${overviewData.command_center.transaction_taxes_paid},Confirmed,STT Act 2004\n`;
      csvContent += `Taxes Withheld (TDS),${overviewData.command_center.taxes_already_withheld},Confirmed,Section 194S / DTAA\n`;
      csvContent += `Suggested Tax Reserve,${overviewData.command_center.tax_reserve},Estimate,Quant.OS Advisory\n`;
    } else if (reportType === "TAX_LOT_SCHEDULE") {
      csvContent = `Symbol,Quantity,Cost Basis,Holding Period Days,Classification,Broker\n`;
      overviewData.analyzed_positions.forEach((p) => {
        csvContent += `${p.symbol},${p.quantity},${p.total_cost_basis},${p.holding_period_days},${p.current_classification_if_sold},${p.broker}\n`;
      });
    } else if (reportType === "JURISDICTION_EXPOSURE") {
      csvContent = `Country,Relationship,Tax Type,Estimated Liability,Paid,Next Deadline\n`;
      overviewData.global_tax_exposure.forEach((g) => {
        csvContent += `${g.country_name},${g.relationship},${g.tax_type},${g.estimated_liability},${g.paid_withheld},${g.next_deadline}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setDownloading(null), 800);
  };

  const reports = [
    {
      id: "ANNUAL_TAX_SUMMARY",
      title: "Annual Capital Gains & Trading Tax Summary",
      desc: "Complete audit statement with gross gains, allowable losses, business derivative income, STT, and withholding credits.",
      category: "AUDIT_SUMMARY",
    },
    {
      id: "TAX_LOT_SCHEDULE",
      title: "Comprehensive Tax Lot & Holding-Period Schedule",
      desc: "Granular inventory of acquisition lots, remaining quantities, cost bases, holding periods, and long-term qualification dates.",
      category: "LOT_INVENTORY",
    },
    {
      id: "JURISDICTION_EXPOSURE",
      title: "Multi-Jurisdiction Exposure & Treaty Relief Report",
      desc: "Country-by-country breakdown of tax nexus, double taxation relief (DTAA), foreign tax withholding, and local statutory deadlines.",
      category: "INTERNATIONAL_TAX",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-sans tracking-wide">
              INSTITUTIONAL TAX REPORTING CENTER
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Export comprehensive tax summaries, lot schedules, and audit ledgers for certified accounting review
            </p>
          </div>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          CSV Export Supported
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reports.map((rpt) => (
          <div
            key={rpt.id}
            className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all duration-200 backdrop-blur-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {rpt.category}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-100 font-sans mt-1">
                {rpt.title}
              </h4>

              <p className="text-xs text-slate-400 font-sans mt-2 leading-relaxed">
                {rpt.desc}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4">
              <button
                onClick={() => downloadCSV(rpt.id)}
                disabled={downloading === rpt.id}
                className="w-full py-2 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                {downloading === rpt.id ? "Generating CSV..." : "Download CSV Report"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
