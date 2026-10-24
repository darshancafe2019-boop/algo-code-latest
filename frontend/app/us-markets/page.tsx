"use client";

import React, { Suspense, useState } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Landmark, RefreshCw, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Layers, DollarSign } from "lucide-react";
import { formatCurrency, formatPercent, formatDecimal } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface UsStockItem {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  pct: number;
  volume: number;
  peRatio: number;
  week52High: number;
  week52Low: number;
}

const US_INDEXES = [
  { symbol: "^GSPC", name: "S&P 500", price: 5815.26, change: 24.12, pct: 0.42 },
  { symbol: "^NDX", name: "Nasdaq-100", price: 20384.50, change: 112.40, pct: 0.55 },
  { symbol: "^DJI", name: "Dow Jones", price: 42863.86, change: -48.20, pct: -0.11 },
  { symbol: "^RUT", name: "Russell 2000", price: 2262.15, change: 14.80, pct: 0.66 },
];

const US_EQUITIES: UsStockItem[] = [
  { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Semiconductors", price: 141.54, change: 3.12, pct: 2.25, volume: 48920100, peRatio: 64.2, week52High: 144.42, week52Low: 39.23 },
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", price: 231.41, change: 0.85, pct: 0.37, volume: 38200100, peRatio: 34.8, week52High: 237.23, week52Low: 164.08 },
  { symbol: "MSFT", name: "Microsoft Corp.", sector: "Technology", price: 428.15, change: 1.95, pct: 0.46, volume: 18200400, peRatio: 36.1, week52High: 468.35, week52Low: 327.00 },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Cyclical", price: 186.40, change: -1.20, pct: -0.64, volume: 29400200, peRatio: 43.5, week52High: 201.20, week52Low: 118.35 },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Communication", price: 166.80, change: 1.40, pct: 0.85, volume: 21400100, peRatio: 23.9, week52High: 191.75, week52Low: 120.21 },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Automotive", price: 217.97, change: -4.30, pct: -1.93, volume: 62100400, peRatio: 62.4, week52High: 271.00, week52Low: 138.80 },
  { symbol: "META", name: "Meta Platforms", sector: "Communication", price: 584.34, change: 5.60, pct: 0.97, volume: 14200800, peRatio: 28.6, week52High: 602.95, week52Low: 279.40 },
];

export function UsMarketsTerminal() {
  const [sectorFilter, setSectorFilter] = useState<string>("ALL");

  const filteredStocks = sectorFilter === "ALL"
    ? US_EQUITIES
    : US_EQUITIES.filter((s) => s.sector.toUpperCase() === sectorFilter.toUpperCase());

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 max-w-[1750px] mx-auto min-w-0 font-sans text-slate-100 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-white tracking-wide">
                US INDICES & EQUITIES DESK
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/30 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" />
                NYSE / NASDAQ FEED
              </span>
            </div>
            <p className="text-xs text-[#7D8EA5]">
              Authoritative US Indices, Mega-cap Tech, 52-Week Ranges, Sector Breadth & Multi-Asset Valuation
            </p>
          </div>
        </div>
      </div>

      {/* Index Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {US_INDEXES.map((idx) => {
          const isUp = idx.pct >= 0;
          return (
            <div key={idx.symbol} className="rounded-xl bg-[#0A1422] border border-[#12304A] p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#7D8EA5] font-mono">
                <span>{idx.name}</span>
                <span className="text-[10px] text-[#22D3EE]">{idx.symbol}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold font-mono text-white">{formatDecimal(idx.price, 2)}</span>
                <span className={cn("text-xs font-mono font-bold flex items-center gap-0.5", isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                  {isUp ? "+" : ""}{idx.pct.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sector Filter & Stock Screener */}
      <div className="flex items-center gap-1.5 bg-[#05101A] p-1 rounded-xl border border-[#10263A] w-fit">
        {["ALL", "Technology", "Semiconductors", "Communication", "Consumer Cyclical"].map((sec) => (
          <button
            key={sec}
            onClick={() => setSectorFilter(sec)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer",
              sectorFilter.toUpperCase() === sec.toUpperCase()
                ? "bg-[#168BFF] text-white shadow-sm"
                : "text-[#7D8EA5] hover:text-white hover:bg-[#0A1422]"
            )}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-[#0A1422] border border-[#12304A] overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#10263A] bg-[#05101A] text-[#7D8EA5] font-mono h-10">
              <th className="px-4 py-2">Symbol</th>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Sector</th>
              <th className="px-4 py-2 text-right">Price</th>
              <th className="px-4 py-2 text-right">Change</th>
              <th className="px-4 py-2 text-right">% Change</th>
              <th className="px-4 py-2 text-right">Volume</th>
              <th className="px-4 py-2 text-right">P/E</th>
              <th className="px-4 py-2 text-right">52W Range</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#10263A]">
            {filteredStocks.map((stock) => {
              const isUp = stock.pct >= 0;
              return (
                <tr key={stock.symbol} className="hover:bg-[#0F1C2F] transition h-11">
                  <td className="px-4 py-2 font-bold text-white font-mono">{stock.symbol}</td>
                  <td className="px-4 py-2 text-slate-300">{stock.name}</td>
                  <td className="px-4 py-2 text-[#7D8EA5]">{stock.sector}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-white">${formatDecimal(stock.price, 2)}</td>
                  <td className={cn("px-4 py-2 text-right font-mono", isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                    {isUp ? "+" : ""}{formatDecimal(stock.change, 2)}
                  </td>
                  <td className={cn("px-4 py-2 text-right font-mono font-bold", isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                    {isUp ? "+" : ""}{stock.pct.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[#7D8EA5]">{stock.volume.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-300">{stock.peRatio.toFixed(1)}</td>
                  <td className="px-4 py-2 text-right font-mono text-[11px] text-[#7D8EA5]">
                    ${stock.week52Low.toFixed(0)} - ${stock.week52High.toFixed(0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function UsMarketsPage() {
  return (
    <DirectPageLayout activeTab="us-markets">
      <Suspense fallback={<div className="p-8 text-center font-mono text-slate-400">Loading US Markets Desk...</div>}>
        <UsMarketsTerminal />
      </Suspense>
    </DirectPageLayout>
  );
}
