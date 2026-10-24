"use client";

import React, { memo } from "react";
import { Search, RefreshCw, Scale, Globe2, ShieldCheck, Zap } from "lucide-react";

interface TaxTopHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedJurisdiction: string;
  onJurisdictionChange: (jurisdiction: string) => void;
  selectedFinancialYear: string;
  onFinancialYearChange: (fy: string) => void;
  baseCurrency: string;
  taxRegime: string;
  onTaxRegimeChange: (regime: string) => void;
  lastUpdated: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  connectedBrokersCount: number;
  totalBrokersCount: number;
  dataFreshness: "LIVE" | "UPDATING" | "STALE" | "DISCONNECTED" | "ERROR";
}

export const TaxTopHeader = memo(function TaxTopHeader({
  searchQuery,
  onSearchChange,
  selectedJurisdiction,
  onJurisdictionChange,
  selectedFinancialYear,
  onFinancialYearChange,
  baseCurrency,
  taxRegime,
  onTaxRegimeChange,
  lastUpdated,
  isRefreshing = false,
  onRefresh,
  connectedBrokersCount = 0,
  totalBrokersCount = 5,
  dataFreshness = "LIVE",
}: TaxTopHeaderProps) {
  const isLive = dataFreshness === "LIVE";

  return (
    <header className="w-full bg-[#04111C] border-b border-[#0D2438] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none shrink-0">
      {/* LEFT: Branding + Search Field */}
      <div className="flex items-center gap-3 flex-1 min-w-[320px] max-w-[620px]">
        {/* Brand Badge */}
        <div className="flex items-center gap-2 pr-3 border-r border-[#0D2438] shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-[#0F3858] to-[#16C6F4]/30 border border-[#16C6F4]/40 flex items-center justify-center text-[#16C6F4] shadow-sm">
            <Scale className="h-4 w-4" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[13px] font-black tracking-wider text-white font-sans">
                QUANT.OS
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#16C6F4]/10 text-[#16C6F4] border border-[#16C6F4]/20">
                TAX DESK v2.5
              </span>
            </div>
            <span className="text-[9px] text-[#7D8EA5] font-mono tracking-tight block mt-0.5">
              INSTITUTIONAL TAX ENGINE
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7D8EA5] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tax lots, symbols, brokers, rules (e.g. DHAN, NIFTY, 111A, STT...)"
            className="w-full h-8 pl-8 pr-4 rounded-lg bg-[#071D2D]/80 border border-[#10304C] text-[11px] text-slate-100 placeholder-[#566B82] focus:outline-none focus:border-[#16C6F4] focus:ring-1 focus:ring-[#16C6F4]/30 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-[#7D8EA5] hover:text-white"
            >
              ESC
            </button>
          )}
        </div>
      </div>

      {/* RIGHT: Telemetry, Jurisdictions, FY, Base Currency & Sync Controls */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Jurisdiction Selector */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#061828] border border-[#0F304E] text-[11px] font-mono">
          <Globe2 className="h-3.5 w-3.5 text-[#16C6F4]" />
          <select
            value={selectedJurisdiction}
            onChange={(e) => onJurisdictionChange(e.target.value)}
            className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer text-[11px]"
            title="Tax Jurisdiction"
          >
            <option value="IN" className="bg-[#061828] text-slate-200">IN • India (IT Act 1961)</option>
            <option value="US" className="bg-[#061828] text-slate-200">US • United States (IRS 1099-B)</option>
            <option value="UK" className="bg-[#061828] text-slate-200">GB • United Kingdom (HMRC CGT)</option>
            <option value="SG" className="bg-[#061828] text-slate-200">SG • Singapore (IRAS Exempt/Biz)</option>
            <option value="AE" className="bg-[#061828] text-slate-200">AE • UAE Corporate Tax 9%</option>
          </select>
        </div>

        {/* Financial Year Selector */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#061828] border border-[#0F304E] text-[11px] font-mono">
          <span className="text-[#7D8EA5]">FY:</span>
          <select
            value={selectedFinancialYear}
            onChange={(e) => onFinancialYearChange(e.target.value)}
            className="bg-transparent text-[#16C6F4] font-bold focus:outline-none cursor-pointer text-[11px]"
            title="Financial Reporting Period"
          >
            <option value="2025-26" className="bg-[#061828] text-slate-200">2025-26 (Current)</option>
            <option value="2024-25" className="bg-[#061828] text-slate-200">2024-25 (Prior)</option>
            <option value="2023-24" className="bg-[#061828] text-slate-200">2023-24 (Audited)</option>
          </select>
        </div>

        {/* Tax Regime Selector */}
        <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#061828] border border-[#0F304E] text-[11px] font-mono">
          <span className="text-[#7D8EA5]">REGIME:</span>
          <select
            value={taxRegime}
            onChange={(e) => onTaxRegimeChange(e.target.value)}
            className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer text-[11px]"
            title="Applicable Tax Regime"
          >
            <option value="NEW" className="bg-[#061828] text-slate-200">Section 115BAC (New)</option>
            <option value="OLD" className="bg-[#061828] text-slate-200">Standard (Old)</option>
            <option value="CORPORATE" className="bg-[#061828] text-slate-200">Corporate (Sec 115BAA)</option>
          </select>
        </div>

        {/* Currency Badge */}
        <div className="px-2.5 py-1 rounded-lg bg-[#061828] border border-[#0F304E] text-[11px] font-mono font-bold text-slate-300">
          <span className="text-[#7D8EA5] font-normal mr-1">CURR:</span>
          {baseCurrency}
        </div>

        {/* Live Broker Connection Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#061828] border border-[#0F304E] text-[11px] font-mono">
          <span
            className={`h-2 w-2 rounded-full ${
              isLive
                ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                : "bg-amber-400"
            }`}
          />
          <span className="text-slate-300 font-semibold">FEED: {dataFreshness}</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-400 font-bold">
            {connectedBrokersCount}/{totalBrokersCount} BROKERS
          </span>
        </div>

        {/* Last Sync Timestamp */}
        <div className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#061828] border border-[#0F304E] text-[10px] font-mono text-[#7D8EA5]">
          <span>SYNC:</span>
          <span className="text-slate-200 font-semibold">{lastUpdated || "Live"}</span>
        </div>

        {/* Refresh Trigger */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title="Recalculate & Synchronize Live Tax Intelligence"
            disabled={isRefreshing}
            className="h-8 w-8 rounded-lg bg-[#071F32] hover:bg-[#0C2D48] border border-[#133A5C] flex items-center justify-center text-[#16C6F4] hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>
    </header>
  );
});
