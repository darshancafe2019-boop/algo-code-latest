"use client";

import React from "react";
import { FileText, CheckCircle2, AlertCircle, Clock, ShieldCheck } from "lucide-react";
import { TaxDocumentChecklistItem } from "@/types/tax";

interface TaxDocumentsChecklistProps {
  documents: TaxDocumentChecklistItem[];
}

export function TaxDocumentsChecklist({ documents }: TaxDocumentsChecklistProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> VERIFIED
          </span>
        );
      case "RECEIVED":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> RECEIVED
          </span>
        );
      case "REQUIRED":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Clock className="w-3 h-3" /> REQUIRED
          </span>
        );
      case "MISSING":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> MISSING
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-sans tracking-wide">
              TAX COMPLIANCE DOCUMENTATION TRACKER
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Broker annual statements, contract notes, Form 1042-S, and Tax Residency Certificates
            </p>
          </div>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          {documents.filter((d) => d.status === "VERIFIED" || d.status === "RECEIVED").length} / {documents.length} Completed
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all duration-200 backdrop-blur-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-sans">
                    {doc.title}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {doc.category} • {doc.country_code} ({doc.tax_year})
                  </span>
                </div>
                {getStatusBadge(doc.status)}
              </div>

              <p className="text-xs text-slate-300 font-sans my-2 leading-relaxed">
                {doc.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 mt-2 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Due: {doc.due_date || "Annual Return"}</span>
              <span className="text-[10px] text-indigo-400">{doc.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
