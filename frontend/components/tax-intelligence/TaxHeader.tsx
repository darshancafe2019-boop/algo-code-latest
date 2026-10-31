"use client";

import React, { useState, useEffect } from "react";
import { Scale, RefreshCw, Globe, Calendar, DollarSign, Clock } from "lucide-react";

interface TaxHeaderProps {
  jurisdiction: string;
  onJurisdictionChange: (j: string) => void;
  financialYear: string;
  onFinancialYearChange: (fy: string) => void;
  currency: string;
  onCurrencyChange: (c: string) => void;
  onSync: () => void;
  isLoading: boolean;
}

export function TaxHeader({
  jurisdiction,
  onJurisdictionChange,
  financialYear,
  onFinancialYearChange,
  currency,
  onCurrencyChange,
  onSync,
  isLoading,
}: TaxHeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now) + " IST";
      setCurrentTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-4 shadow-lg select-none">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Branding & Subtitle */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-11 w-11 rounded-[6px] bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center shrink-0">
            <Scale className="h-6 w-6 text-[#00F0FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-[#F8FAFC]">
                QUANT.OS TAX INTELLIGENCE
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold bg-[#168BFF]/15 text-[#00F0FF] border border-[#168BFF]/30">
                INSTITUTIONAL v2.5
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" />
                LIVE STREAM
              </span>
            </div>
            <p className="text-xs text-[#7D8EA5] mt-1 font-sans">
              Multi-jurisdiction trade recognition, broker segregation and statutory tax liability engine.
            </p>
          </div>
        </div>

        {/* Right: Selectors, IST Timestamp & Sync */}
        <div className="flex items-center gap-2.5 flex-wrap lg:flex-nowrap">
          {/* Jurisdiction Selector */}
          <div className="flex items-center gap-1.5 bg-[#06101B] border border-[#122A42] rounded-[6px] px-2.5 py-1.5 text-xs text-[#F8FAFC]">
            <Globe className="h-3.5 w-3.5 text-[#00F0FF]" />
            <select
              value={jurisdiction}
              onChange={(e) => onJurisdictionChange(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="IN" className="bg-[#0A1422] text-[#F8FAFC]">India (IN)</option>
              <option value="US" className="bg-[#0A1422] text-[#F8FAFC]">United States (US)</option>
              <option value="UK" className="bg-[#0A1422] text-[#F8FAFC]">United Kingdom (UK)</option>
              <option value="SG" className="bg-[#0A1422] text-[#F8FAFC]">Singapore (SG)</option>
            </select>
          </div>

          {/* Financial Year Selector */}
          <div className="flex items-center gap-1.5 bg-[#06101B] border border-[#122A42] rounded-[6px] px-2.5 py-1.5 text-xs text-[#F8FAFC]">
            <Calendar className="h-3.5 w-3.5 text-amber-400" />
            <select
              value={financialYear}
              onChange={(e) => onFinancialYearChange(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="FY 2025-26" className="bg-[#0A1422] text-[#F8FAFC]">FY 2025–26</option>
              <option value="FY 2024-25" className="bg-[#0A1422] text-[#F8FAFC]">FY 2024–25</option>
              <option value="FY 2023-24" className="bg-[#0A1422] text-[#F8FAFC]">FY 2023–24</option>
            </select>
          </div>

          {/* Base Currency Selector */}
          <div className="flex items-center gap-1 bg-[#06101B] border border-[#122A42] rounded-[6px] px-2 py-1.5 text-xs text-[#F8FAFC]">
            <DollarSign className="h-3.5 w-3.5 text-[#00E89A]" />
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="INR" className="bg-[#0A1422] text-[#F8FAFC]">INR (₹)</option>
              <option value="USD" className="bg-[#0A1422] text-[#F8FAFC]">USD ($)</option>
            </select>
          </div>

          {/* Live Indian IST Clock */}
          <div className="flex items-center gap-1.5 bg-[#06101B] border border-[#122A42] rounded-[6px] px-2.5 py-1.5 text-[11px] font-mono text-[#7D8EA5]">
            <Clock className="h-3 w-3 text-[#22D3EE]" />
            <span className="text-[#F8FAFC] font-semibold">{currentTime || "Loading IST..."}</span>
          </div>

          {/* Sync Button */}
          <button
            type="button"
            onClick={onSync}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-[6px] bg-[#168BFF] hover:bg-[#1270D0] text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Synchronize Tax Engine with Central Ledger"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-white" : ""}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>
    </div>
  );
}

