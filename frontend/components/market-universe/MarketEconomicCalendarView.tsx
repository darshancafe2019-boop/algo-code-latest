"use client";

import React, { useState } from "react";
import { Calendar, Clock, Globe, ShieldAlert, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EconomicEvent {
  id: string;
  dateTime: string;
  country: string;
  flag: string;
  event: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  actual: string;
  forecast: string;
  previous: string;
}

const EVENTS: EconomicEvent[] = [
  {
    id: "e1",
    dateTime: "Friday, 31 Oct | 17:30 IST",
    country: "India",
    flag: "🇮🇳",
    event: "RBI Foreign Exchange Reserves",
    impact: "MEDIUM",
    actual: "$702.4B",
    forecast: "$700.0B",
    previous: "$698.2B",
  },
  {
    id: "e2",
    dateTime: "Monday, 03 Nov | 10:30 IST",
    country: "India",
    flag: "🇮🇳",
    event: "HSBC Manufacturing PMI (Oct)",
    impact: "HIGH",
    actual: "—",
    forecast: "56.8",
    previous: "56.5",
  },
  {
    id: "e3",
    dateTime: "Wednesday, 05 Nov | 19:30 IST",
    country: "United States",
    flag: "🇺🇸",
    event: "US FOMC Interest Rate Decision",
    impact: "HIGH",
    actual: "—",
    forecast: "4.75%",
    previous: "5.00%",
  },
  {
    id: "e4",
    dateTime: "Thursday, 06 Nov | 20:00 IST",
    country: "United States",
    flag: "🇺🇸",
    event: "EIA Crude Oil Stockpiles",
    impact: "HIGH",
    actual: "—",
    forecast: "+1.2M",
    previous: "+2.1M",
  },
  {
    id: "e5",
    dateTime: "Friday, 07 Nov | 19:00 IST",
    country: "United States",
    flag: "🇺🇸",
    event: "US Non-Farm Payrolls (Oct)",
    impact: "HIGH",
    actual: "—",
    forecast: "125K",
    previous: "254K",
  },
  {
    id: "e6",
    dateTime: "Wednesday, 12 Nov | 17:30 IST",
    country: "India",
    flag: "🇮🇳",
    event: "India CPI Inflation YoY (Oct)",
    impact: "HIGH",
    actual: "—",
    forecast: "5.10%",
    previous: "5.49%",
  },
];

export function MarketEconomicCalendarView() {
  const [filterImpact, setFilterImpact] = useState<string>("ALL");

  const filtered = EVENTS.filter((e) => {
    if (filterImpact !== "ALL" && e.impact !== filterImpact) return false;
    return true;
  });

  return (
    <div className="w-full bg-[#071426] border border-[#15304A] rounded-lg p-4 font-sans select-none space-y-4 shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#15304A] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#0878FF]/10 text-[#0878FF] border border-[#0878FF]/30">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#EAF3FF] uppercase tracking-wider">Macroeconomic Calendar & Central Bank Releases</h3>
            <span className="text-[10px] text-[#91A7C1]">Scheduled economic indicator releases, central bank decisions, and rate forecasts</span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#09182B] p-0.5 rounded border border-[#15304A]">
          {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((imp) => (
            <button
              key={imp}
              type="button"
              onClick={() => setFilterImpact(imp)}
              className={cn(
                "px-2.5 py-0.5 text-[9px] font-mono font-bold rounded transition-colors",
                filterImpact === imp ? "bg-[#0878FF] text-white" : "text-[#91A7C1] hover:text-[#EAF3FF]"
              )}
            >
              {imp} IMPACT
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] font-mono">
          <thead className="bg-[#09182B] text-[#91A7C1] text-[10px] uppercase font-bold border-b border-[#15304A]">
            <tr className="h-[30px]">
              <th className="px-3 py-1">Date & Time</th>
              <th className="px-3 py-1">Country</th>
              <th className="px-3 py-1">Event Description</th>
              <th className="px-3 py-1 text-center">Impact</th>
              <th className="px-3 py-1 text-right">Actual</th>
              <th className="px-3 py-1 text-right">Forecast</th>
              <th className="px-3 py-1 text-right">Previous</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#15304A]/60 font-sans">
            {filtered.map((item) => (
              <tr key={item.id} className="h-[36px] hover:bg-[#09182B] transition-colors">
                <td className="px-3 py-1 text-[11px] font-mono text-[#EAF3FF]">{item.dateTime}</td>
                <td className="px-3 py-1 text-[11px]">
                  <span className="mr-1.5">{item.flag}</span>
                  <span className="text-[#91A7C1] font-semibold">{item.country}</span>
                </td>
                <td className="px-3 py-1 text-[11px] font-semibold text-[#EAF3FF]">{item.event}</td>
                <td className="px-3 py-1 text-center">
                  <span className={cn(
                    "px-1.5 py-0.2 rounded text-[9px] font-mono font-bold",
                    item.impact === "HIGH" ? "bg-[#FF5268]/15 text-[#FF5268] border border-[#FF5268]/30" :
                    item.impact === "MEDIUM" ? "bg-[#F5B942]/15 text-[#F5B942] border border-[#F5B942]/30" :
                    "bg-[#91A7C1]/15 text-[#91A7C1] border border-[#91A7C1]/30"
                  )}>
                    {item.impact}
                  </span>
                </td>
                <td className="px-3 py-1 text-right font-mono font-bold text-[#00D6A0]">{item.actual}</td>
                <td className="px-3 py-1 text-right font-mono text-[#91A7C1]">{item.forecast}</td>
                <td className="px-3 py-1 text-right font-mono text-[#91A7C1]/70">{item.previous}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

