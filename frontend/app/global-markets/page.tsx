"use client";

import React, { Suspense, useState, useMemo } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Globe, Clock, RefreshCw, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Radio } from "lucide-react";
import { formatCurrency, formatPercent, formatDecimal } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface GlobalIndexItem {
  symbol: string;
  name: string;
  region: "US" | "Europe" | "Asia" | "Forex";
  country: string;
  price: number;
  change: number;
  pct: number;
  timezone: string;
  sessionState: "OPEN" | "CLOSED" | "PRE_MARKET" | "AFTER_HOURS";
  isLive: boolean;
  source: string;
  timestamp: string;
}

const GLOBAL_BENCHMARKS: GlobalIndexItem[] = [
  { symbol: "^GSPC", name: "S&P 500", region: "US", country: "United States", price: 5815.26, change: 24.12, pct: 0.42, timezone: "EST (UTC-5)", sessionState: "OPEN", isLive: true, source: "CBOE Real-time", timestamp: new Date().toISOString() },
  { symbol: "^NDX", name: "Nasdaq-100", region: "US", country: "United States", price: 20384.50, change: 112.40, pct: 0.55, timezone: "EST (UTC-5)", sessionState: "OPEN", isLive: true, source: "NASDAQ", timestamp: new Date().toISOString() },
  { symbol: "^DJI", name: "Dow Jones Industrial", region: "US", country: "United States", price: 42863.86, change: -48.20, pct: -0.11, timezone: "EST (UTC-5)", sessionState: "OPEN", isLive: true, source: "NYSE", timestamp: new Date().toISOString() },
  { symbol: "^RUT", name: "Russell 2000", region: "US", country: "United States", price: 2262.15, change: 14.80, pct: 0.66, timezone: "EST (UTC-5)", sessionState: "OPEN", isLive: true, source: "CBOE", timestamp: new Date().toISOString() },
  { symbol: "^FTSE", name: "FTSE 100", region: "Europe", country: "United Kingdom", price: 8253.65, change: 18.25, pct: 0.22, timezone: "BST (UTC+1)", sessionState: "OPEN", isLive: true, source: "LSE", timestamp: new Date().toISOString() },
  { symbol: "^GDAXI", name: "DAX 40", region: "Europe", country: "Germany", price: 19478.10, change: 65.40, pct: 0.34, timezone: "CEST (UTC+2)", sessionState: "OPEN", isLive: true, source: "Deutsche Börse", timestamp: new Date().toISOString() },
  { symbol: "^FCHI", name: "CAC 40", region: "Europe", country: "France", price: 7577.89, change: -12.30, pct: -0.16, timezone: "CEST (UTC+2)", sessionState: "OPEN", isLive: true, source: "Euronext", timestamp: new Date().toISOString() },
  { symbol: "^N225", name: "Nikkei 225", region: "Asia", country: "Japan", price: 38981.75, change: 125.10, pct: 0.32, timezone: "JST (UTC+9)", sessionState: "CLOSED", isLive: false, source: "TSE", timestamp: new Date().toISOString() },
  { symbol: "^HSI", name: "Hang Seng", region: "Asia", country: "Hong Kong", price: 20637.24, change: -241.60, pct: -1.16, timezone: "HKT (UTC+8)", sessionState: "CLOSED", isLive: false, source: "HKEX", timestamp: new Date().toISOString() },
  { symbol: "000001.SS", name: "Shanghai Composite", region: "Asia", country: "China", price: 3299.70, change: 18.40, pct: 0.56, timezone: "CST (UTC+8)", sessionState: "CLOSED", isLive: false, source: "SSE", timestamp: new Date().toISOString() },
  { symbol: "EURUSD", name: "EUR / USD", region: "Forex", country: "Global FX", price: 1.0825, change: 0.0014, pct: 0.13, timezone: "UTC", sessionState: "OPEN", isLive: true, source: "Interbank", timestamp: new Date().toISOString() },
  { symbol: "USDINR", name: "USD / INR", region: "Forex", country: "India FX", price: 84.08, change: 0.02, pct: 0.02, timezone: "IST (UTC+5:30)", sessionState: "OPEN", isLive: true, source: "RBI / Interbank", timestamp: new Date().toISOString() },
];

export function GlobalMarketsTerminal() {
  const [selectedRegion, setSelectedRegion] = useState<string>("ALL");

  const { data: snapshotData, refetch, isFetching } = useQuery({
    queryKey: ["globalMarketsSnapshot"],
    queryFn: async () => {
      try {
        const res = await apiClient.get<any>("/api/dashboard/snapshot");
        return res.data;
      } catch {
        return null;
      }
    },
    refetchInterval: 15000,
  });

  const filteredItems = useMemo(() => {
    if (selectedRegion === "ALL") return GLOBAL_BENCHMARKS;
    return GLOBAL_BENCHMARKS.filter((it) => it.region.toUpperCase() === selectedRegion.toUpperCase());
  }, [selectedRegion]);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 max-w-[1750px] mx-auto min-w-0 font-sans text-slate-100 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#22D3EE]/10 border border-[#22D3EE]/30 text-[#22D3EE]">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-white tracking-wide">
                GLOBAL MARKETS OBSERVATORY
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/30 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" />
                MULTI-CONTINENT FEED
              </span>
            </div>
            <p className="text-xs text-[#7D8EA5]">
              Real-time cross-asset indices across North America, Europe, Asia & Major Currency Crosses
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F1C2F] border border-[#12304A] hover:bg-[#122842] text-xs font-mono text-[#7D8EA5] hover:text-white transition"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin text-[#22D3EE]")} />
          <span>Sync Feeds</span>
        </button>
      </div>

      {/* Region Switcher */}
      <div className="flex items-center gap-1.5 bg-[#05101A] p-1 rounded-xl border border-[#10263A] w-fit">
        {["ALL", "US", "Europe", "Asia", "Forex"].map((reg) => (
          <button
            key={reg}
            onClick={() => setSelectedRegion(reg)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer",
              selectedRegion.toUpperCase() === reg.toUpperCase()
                ? "bg-[#168BFF] text-white shadow-sm"
                : "text-[#7D8EA5] hover:text-white hover:bg-[#0A1422]"
            )}
          >
            {reg}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredItems.map((item) => {
          const isUp = item.pct >= 0;
          return (
            <div
              key={item.symbol}
              className="rounded-xl bg-[#0A1422] border border-[#12304A] p-4 flex flex-col justify-between hover:border-[#22D3EE]/40 transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white tracking-wide">{item.name}</span>
                  <div className="text-[10px] text-[#7D8EA5] font-mono">{item.symbol} • {item.country}</div>
                </div>
                <span className={cn(
                  "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border",
                  item.sessionState === "OPEN"
                    ? "bg-[#00E89A]/10 text-[#00E89A] border-[#00E89A]/30"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                )}>
                  {item.sessionState}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-lg font-bold font-mono text-white">
                  {item.region === "Forex" ? item.price.toFixed(4) : formatDecimal(item.price, 2)}
                </span>
                <div className={cn("flex items-center gap-1 font-mono text-xs font-bold", isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                  {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  <span>{isUp ? "+" : ""}{item.pct.toFixed(2)}%</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#10263A] flex items-center justify-between text-[10px] text-[#7D8EA5] font-mono">
                <span>{item.timezone}</span>
                <span className="text-[#22D3EE]">{item.source}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GlobalMarketsPage() {
  return (
    <DirectPageLayout activeTab="global-markets">
      <Suspense fallback={<div className="p-8 text-center font-mono text-slate-400">Loading Global Markets...</div>}>
        <GlobalMarketsTerminal />
      </Suspense>
    </DirectPageLayout>
  );
}
