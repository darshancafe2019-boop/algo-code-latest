"use client";

import React from "react";
import { Globe, ArrowUpRight, ShieldCheck, AlertCircle } from "lucide-react";
import { GlobalTaxExposureItem, TaxConfidenceLevel } from "@/types/tax";

interface GlobalTaxExposureTableProps {
  exposures: GlobalTaxExposureItem[];
  currency: string;
}

export function GlobalTaxExposureTable({
  exposures,
  currency,
}: GlobalTaxExposureTableProps) {
  const formatCurrency = (val: number) => {
    const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
    return `${prefix}${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getConfidenceBadge = (confidence: TaxConfidenceLevel) => {
    switch (confidence) {
      case "CONFIRMED INPUTS":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">CONFIRMED</span>;
      case "HIGH-CONFIDENCE ESTIMATE":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">HIGH-CONFIDENCE</span>;
      case "ESTIMATE":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">ESTIMATE</span>;
      case "INFORMATION REQUIRED":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">INFO REQUIRED</span>;
      case "PROFESSIONAL REVIEW RECOMMENDED":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">REVIEW</span>;
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">{confidence}</span>;
    }
  };

  const getRelationshipBadge = (rel: string) => {
    switch (rel) {
      case "tax_residence":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">TAX RESIDENCE</span>;
      case "source":
      case "issuer":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">SOURCE / ISSUER</span>;
      case "exchange":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">EXCHANGE</span>;
      case "citizenship":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">CITIZENSHIP</span>;
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">{rel}</span>;
    }
  };

  return (
    <div className="rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm overflow-hidden backdrop-blur-md">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <Globe className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-100 font-sans tracking-wide">
            GLOBAL TAX EXPOSURE & JURISDICTION NEXUS
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {exposures.length} Recognized Jurisdictions
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-mono text-[11px]">
              <th className="py-3 px-4 font-medium">Jurisdiction</th>
              <th className="py-3 px-4 font-medium">Nexus Relationship</th>
              <th className="py-3 px-4 font-medium">Tax Type</th>
              <th className="py-3 px-4 font-medium text-right">Estimated Liability</th>
              <th className="py-3 px-4 font-medium text-right">Paid / Withheld</th>
              <th className="py-3 px-4 font-medium text-right">Remaining Estimate</th>
              <th className="py-3 px-4 font-medium">Next Deadline</th>
              <th className="py-3 px-4 font-medium">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {exposures.map((item, idx) => (
              <tr
                key={idx}
                className="hover:bg-slate-800/30 transition-colors duration-150"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100 font-sans">
                      {item.country_name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {item.country_code}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5 line-clamp-1">
                    {item.explanation}
                  </p>
                </td>
                <td className="py-3 px-4">
                  {getRelationshipBadge(item.relationship)}
                </td>
                <td className="py-3 px-4 text-slate-300 font-sans">
                  {item.tax_type}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-slate-100">
                  {formatCurrency(item.estimated_liability)}
                </td>
                <td className="py-3 px-4 text-right text-teal-400">
                  {formatCurrency(item.paid_withheld)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-amber-400">
                  {formatCurrency(item.remaining_estimate)}
                </td>
                <td className="py-3 px-4 text-slate-300">
                  {item.next_deadline}
                </td>
                <td className="py-3 px-4">
                  {getConfidenceBadge(item.confidence)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
