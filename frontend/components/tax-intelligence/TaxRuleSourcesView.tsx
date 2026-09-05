"use client";

import React, { useState } from "react";
import { BookOpen, Search, ShieldCheck, ExternalLink, Scale } from "lucide-react";
import { TaxRuleSourceItem } from "@/types/tax";

interface TaxRuleSourcesViewProps {
  sources: TaxRuleSourceItem[];
}

export function TaxRuleSourcesView({ sources }: TaxRuleSourcesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = sources.filter(
    (s) =>
      s.rule_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.jurisdiction.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.source_authority.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rate_summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-sans tracking-wide">
              OFFICIAL STATUTORY TAX RULE REGISTRY & PROVENANCE
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Traceable legislative authority hierarchy with strict historical effective-date versioning
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search statutory rule ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 font-mono"
          />
        </div>
      </div>

      {/* Authority Hierarchy Banner */}
      <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs font-mono text-slate-300">
        <span className="font-bold text-indigo-400 block mb-1 font-sans">
          GOVERNMENT LEGISLATIVE AUTHORITY HIERARCHY:
        </span>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-indigo-500/30 text-indigo-300 font-semibold">1. Primary Acts / Legislation</span>
          <span>&gt;</span>
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">2. Tax Authority Regulations (CBDT / IRS / HMRC)</span>
          <span>&gt;</span>
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">3. Bilateral Tax Treaties (DTAA)</span>
          <span>&gt;</span>
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">4. Official Exchange Fee Schedules</span>
        </div>
      </div>

      {/* Rules Table */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px]">
                <th className="py-3 px-4 font-medium">Jurisdiction / Rule ID</th>
                <th className="py-3 px-4 font-medium">Tax Year / Effective Dates</th>
                <th className="py-3 px-4 font-medium">Statutory Rate & Calculation Summary</th>
                <th className="py-3 px-4 font-medium">Official Authority & Source</th>
                <th className="py-3 px-4 font-medium">Version</th>
                <th className="py-3 px-4 font-medium text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((rule) => (
                <tr
                  key={rule.rule_id}
                  className="hover:bg-slate-800/30 transition-colors duration-150"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-200">
                        {rule.jurisdiction}
                      </span>
                      <span className="font-bold text-slate-100 font-sans">
                        {rule.rule_id}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase">
                      {rule.tax_type}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="text-slate-200">{rule.tax_year}</div>
                    <div className="text-[10px] text-slate-500">
                      {rule.effective_from} → {rule.effective_until === "2099-12-31" ? "Active" : rule.effective_until}
                    </div>
                  </td>

                  <td className="py-3 px-4 max-w-xs">
                    <p className="text-slate-200 font-sans text-xs leading-relaxed">
                      {rule.rate_summary}
                    </p>
                    <span className="text-[10px] text-indigo-400 mt-1 block">
                      Method: {rule.calculation_method}
                    </span>
                  </td>

                  <td className="py-3 px-4 max-w-xs">
                    <span className="text-slate-300 font-sans block line-clamp-1">
                      {rule.source_authority}
                    </span>
                    <a
                      href={rule.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-0.5"
                    >
                      <ExternalLink className="w-3 h-3" /> Official Gazette / URL
                    </a>
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                      {rule.rule_version}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      ✓ {rule.verification_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
