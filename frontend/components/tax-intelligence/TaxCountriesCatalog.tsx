"use client";

import React, { useState } from "react";
import { Globe, Search, ShieldCheck, ExternalLink, CheckCircle2 } from "lucide-react";
import { CountryCoverageItem } from "@/types/tax";

interface TaxCountriesCatalogProps {
  countries: CountryCoverageItem[];
}

export function TaxCountriesCatalog({ countries }: TaxCountriesCatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FULLY SUPPORTED":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            FULLY SUPPORTED
          </span>
        );
      case "PARTIALLY SUPPORTED":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            PARTIALLY SUPPORTED
          </span>
        );
      case "BETA":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            BETA COVERAGE
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {status}
          </span>
        );
    }
  };

  const filtered = countries.filter((c) => {
    const matchesSearch =
      c.country_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.country_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.official_source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "ALL" || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md">
        <div className="relative flex-1 sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search country, authority, statutory act..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {["ALL", "FULLY SUPPORTED", "PARTIALLY SUPPORTED", "BETA"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                filterStatus === st
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Country Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((country) => (
          <div
            key={country.country_code}
            className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between backdrop-blur-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold font-mono text-indigo-400">
                    {country.country_code}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 font-sans">
                      {country.country_name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Verified: {country.rule_last_verified}
                    </span>
                  </div>
                </div>
                {getStatusBadge(country.status)}
              </div>

              <div className="space-y-2.5 my-3 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">
                    Supported Tax Types:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {country.tax_types_supported.map((tt, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
                      >
                        {tt}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">
                    Statutory Citations:
                  </span>
                  <ul className="mt-1 space-y-1">
                    {country.statutory_citations.map((cite, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-slate-300 flex items-center gap-1.5"
                      >
                        <span className="w-1 h-1 rounded-full bg-indigo-400" />
                        {cite}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 mt-3 text-[11px] text-slate-400 font-mono">
              <span className="text-slate-500 block text-[10px] uppercase">
                Official Authority:
              </span>
              <span className="text-slate-300 line-clamp-1">
                {country.official_source}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
