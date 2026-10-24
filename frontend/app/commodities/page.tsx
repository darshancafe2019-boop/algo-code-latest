"use client";

import React, { Suspense, useState } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Flame, RefreshCw, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Layers, ShieldCheck } from "lucide-react";
import { formatCurrency, formatPercent, formatDecimal } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface CommodityContract {
  symbol: string;
  name: string;
  category: "Energy" | "Precious Metals" | "Base Metals" | "Agri";
  expiry: string;
  ltp: number;
  change: number;
  pct: number;
  volume: number;
  openInterest: number;
  unit: string;
  currency: string;
  exchange: "MCX" | "COMEX" | "NYMEX";
  isLive: boolean;
}

const COMMODITIES_DATA: CommodityContract[] = [
  { symbol: "GOLD-24OCT", name: "Gold Standard (1kg)", category: "Precious Metals", expiry: "05-DEC-2026", ltp: 78240, change: 320, pct: 0.41, volume: 14820, openInterest: 8450, unit: "10 grams", currency: "INR", exchange: "MCX", isLive: true },
  { symbol: "SILVER-24DEC", name: "Silver Standard (30kg)", category: "Precious Metals", expiry: "05-DEC-2026", ltp: 97450, change: 1120, pct: 1.16, volume: 22400, openInterest: 11200, unit: "1 kg", currency: "INR", exchange: "MCX", isLive: true },
  { symbol: "CRUDEOIL-24NOV", name: "Crude Oil (100 BBL)", category: "Energy", expiry: "19-NOV-2026", ltp: 5980, change: -45, pct: -0.75, volume: 48920, openInterest: 14320, unit: "1 Barrel", currency: "INR", exchange: "MCX", isLive: true },
  { symbol: "NATURALGAS-24OCT", name: "Natural Gas (1250 mmBtu)", category: "Energy", expiry: "28-OCT-2026", ltp: 218.40, change: 3.20, pct: 1.49, volume: 62100, openInterest: 18900, unit: "1 mmBtu", currency: "INR", exchange: "MCX", isLive: true },
  { symbol: "COPPER-24NOV", name: "Copper (2.5 MT)", category: "Base Metals", expiry: "30-NOV-2026", ltp: 842.15, change: 4.80, pct: 0.57, volume: 12450, openInterest: 6420, unit: "1 kg", currency: "INR", exchange: "MCX", isLive: true },
  { symbol: "ZINC-24NOV", name: "Zinc (5 MT)", category: "Base Metals", expiry: "30-NOV-2026", ltp: 284.60, change: -1.25, pct: -0.44, volume: 8940, openInterest: 4210, unit: "1 kg", currency: "INR", exchange: "MCX", isLive: true },
  { symbol: "XAUUSD", name: "Gold Spot COMEX", category: "Precious Metals", expiry: "Continuous", ltp: 2734.50, change: 12.80, pct: 0.47, volume: 84200, openInterest: 412000, unit: "1 Troy Oz", currency: "USD", exchange: "COMEX", isLive: true },
  { symbol: "CL=F", name: "WTI Crude Oil NYMEX", category: "Energy", expiry: "Continuous", ltp: 71.24, change: -0.54, pct: -0.75, volume: 194000, openInterest: 310000, unit: "1 Barrel", currency: "USD", exchange: "NYMEX", isLive: true },
];

export function McxCommoditiesTerminal() {
  const [selectedCat, setSelectedCat] = useState<string>("ALL");

  const filtered = selectedCat === "ALL"
    ? COMMODITIES_DATA
    : COMMODITIES_DATA.filter((c) => c.category.toUpperCase() === selectedCat.toUpperCase());

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 max-w-[1750px] mx-auto min-w-0 font-sans text-slate-100 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-white tracking-wide">
                MCX & GLOBAL COMMODITIES TERMINAL
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/30 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" />
                MCX / COMEX STREAM
              </span>
            </div>
            <p className="text-xs text-[#7D8EA5]">
              Real-time futures contracts, physical specifications, contract delivery units & open interest metrics
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1.5 bg-[#05101A] p-1 rounded-xl border border-[#10263A] w-fit">
        {["ALL", "Energy", "Precious Metals", "Base Metals"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer",
              selectedCat.toUpperCase() === cat.toUpperCase()
                ? "bg-[#168BFF] text-white shadow-sm"
                : "text-[#7D8EA5] hover:text-white hover:bg-[#0A1422]"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-[#0A1422] border border-[#12304A] overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#10263A] bg-[#05101A] text-[#7D8EA5] font-mono h-10">
              <th className="px-4 py-2">Contract Symbol</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Exchange</th>
              <th className="px-4 py-2">Expiry</th>
              <th className="px-4 py-2 text-right">LTP</th>
              <th className="px-4 py-2 text-right">Change</th>
              <th className="px-4 py-2 text-right">% Change</th>
              <th className="px-4 py-2 text-right">Volume</th>
              <th className="px-4 py-2 text-right">Open Interest</th>
              <th className="px-4 py-2">Delivery Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#10263A]">
            {filtered.map((item) => {
              const isUp = item.pct >= 0;
              const currSign = item.currency === "INR" ? "₹" : "$";
              return (
                <tr key={item.symbol} className="hover:bg-[#0F1C2F] transition h-11">
                  <td className="px-4 py-2 font-bold text-white flex items-center gap-2">
                    <span>{item.symbol}</span>
                    <span className="text-[10px] text-[#7D8EA5] font-normal hidden sm:inline">({item.name})</span>
                  </td>
                  <td className="px-4 py-2 text-[#7D8EA5]">{item.category}</td>
                  <td className="px-4 py-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#071322] border border-[#12304A] text-[10px] font-mono text-[#22D3EE]">
                      {item.exchange}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-[#7D8EA5] text-[11px]">{item.expiry}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-white">
                    {formatCurrency(item.ltp, currSign, 2)}
                  </td>
                  <td className={cn("px-4 py-2 text-right font-mono font-medium", isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                    {isUp ? "+" : ""}{formatDecimal(item.change, 2)}
                  </td>
                  <td className={cn("px-4 py-2 text-right font-mono font-bold", isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                    {isUp ? "+" : ""}{item.pct.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[#7D8EA5]">
                    {item.volume.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-slate-300">
                    {item.openInterest.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-[11px] text-[#7D8EA5]">{item.unit}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CommoditiesPage() {
  return (
    <DirectPageLayout activeTab="commodities">
      <Suspense fallback={<div className="p-8 text-center font-mono text-slate-400">Loading Commodities Terminal...</div>}>
        <McxCommoditiesTerminal />
      </Suspense>
    </DirectPageLayout>
  );
}
