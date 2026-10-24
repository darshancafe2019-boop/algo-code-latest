"use client";

import React, { memo } from "react";
import { Calendar } from "lucide-react";
import { TimeframeFilter } from "@/types/portfolio-intelligence";

export type TaxAnalyticsTabKey =
  | "overview"
  | "broker_ledger"
  | "realized_taxable"
  | "unrealized_mtm"
  | "capital_segregation"
  | "asset_class"
  | "advance_tax_schedule"
  | "fees_statutory"
  | "reports_reconciliation"
  | "audit_quality";

interface TaxNavTabsProps {
  activeTab: TaxAnalyticsTabKey;
  onSelectTab: (tab: TaxAnalyticsTabKey) => void;
  activeTimeframe: TimeframeFilter;
  onSelectTimeframe: (tf: TimeframeFilter) => void;
}

const TABS: { id: TaxAnalyticsTabKey; label: string }[] = [
  { id: "overview", label: "Tax Overview" },
  { id: "broker_ledger", label: "Broker Accounts & Tax Ledger" },
  { id: "realized_taxable", label: "Realized P&L & Taxable Events" },
  { id: "unrealized_mtm", label: "Unrealized Tax Exposure" },
  { id: "capital_segregation", label: "Capital & Reserve Segregation" },
  { id: "asset_class", label: "Asset Class Breakdown" },
  { id: "advance_tax_schedule", label: "Advance Tax Schedule" },
  { id: "fees_statutory", label: "Fees, Brokerage & Statutory Deductions" },
  { id: "reports_reconciliation", label: "Tax Reports & Reconciliation" },
  { id: "audit_quality", label: "Audit Trail & Data Quality" },
];

const TIMEFRAMES: TimeframeFilter[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

export const TaxNavTabs = memo(function TaxNavTabs({
  activeTab,
  onSelectTab,
  activeTimeframe,
  onSelectTimeframe,
}: TaxNavTabsProps) {
  return (
    <div className="w-full h-12 bg-[#020B14] border-b border-[#0C1E30] px-4 flex items-center justify-between gap-3 select-none overflow-hidden shrink-0">
      {/* Scrollable Analytics Perspective Tabs */}
      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-[#16C6F4] text-[#020B14] font-bold shadow-md shadow-[#16C6F4]/20 border border-[#16C6F4]"
                  : "bg-[#061A2A] text-[#8EA1B7] hover:text-white hover:bg-[#0A273F] border border-[#0D263D]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Right Side: Timeframe Pill Switcher & Calendar */}
      <div className="flex items-center gap-1.5 shrink-0 pl-3 border-l border-[#0C1E30]">
        <div className="flex items-center bg-[#061A2A] p-0.5 rounded-md border border-[#0D263D]">
          {TIMEFRAMES.map((tf) => {
            const isActive = activeTimeframe === tf;
            return (
              <button
                key={tf}
                type="button"
                onClick={() => onSelectTimeframe(tf)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#16C6F4] text-[#020B14] font-bold shadow-sm"
                    : "text-[#7D8EA5] hover:text-white"
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>

        {/* Calendar / Period Selector Button */}
        <button
          type="button"
          className="p-1.5 rounded-md bg-[#061A2A] border border-[#0D263D] text-[#8EA1B7] hover:text-[#16C6F4] hover:border-[#16C6F4]/40 transition-colors cursor-pointer"
          title="Custom Financial Period / Assessment Year Range"
        >
          <Calendar className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});
