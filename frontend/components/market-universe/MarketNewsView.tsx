"use client";

import React, { useState } from "react";
import { Newspaper, Search, ExternalLink, Filter, TrendingUp, TrendingDown, Clock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  timeAgo: string;
  category: "EQUITIES" | "DERIVATIVES" | "CRYPTO" | "MACRO" | "FOREX";
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  symbols: string[];
}

const NEWS_DATA: NewsItem[] = [
  {
    id: "n1",
    title: "RBI Monetary Policy Committee Maintains Repo Rate at 6.50% Amid Resilient Domestic Growth",
    summary: "Governor remarks emphasize sustained disinflation progress while monitoring food price pressures and global supply chain conditions.",
    source: "Reserve Bank of India",
    timeAgo: "18m ago",
    category: "MACRO",
    sentiment: "BULLISH",
    symbols: ["NIFTY", "BANKNIFTY"],
  },
  {
    id: "n2",
    title: "Nifty 50 Futures Open Interest Expands 8.4% as FII Inflows Resume in Banking Heavyweights",
    summary: "Derivatives volume analysis reveals aggressive buildup in out-of-the-money call strikes with Put-Call Ratio recovering to 1.18.",
    source: "NSE Market Telemetry",
    timeAgo: "42m ago",
    category: "DERIVATIVES",
    sentiment: "BULLISH",
    symbols: ["NIFTY", "HDFCBANK", "ICICIBANK"],
  },
  {
    id: "n3",
    title: "Bitcoin Crosses $64,000 Mark on Sustained Institutional ETF Inflows and Stable Funding Rates",
    summary: "Perpetual futures open interest across Binance and Delta Exchange registers fresh weekly highs with annualized funding rates consolidating near 10%.",
    source: "Binance Research / Delta Desk",
    timeAgo: "1h ago",
    category: "CRYPTO",
    sentiment: "BULLISH",
    symbols: ["BTC/USDT", "ETH/USDT"],
  },
  {
    id: "n4",
    title: "Reliance Industries Reports Strong Refining Margins and Digital Services Expansion in Q2",
    summary: "Consolidated revenue up 5.2% year-on-year with EBITDA margins expanding across retail and telecom divisions.",
    source: "Exchange Regulatory Filing",
    timeAgo: "2h ago",
    category: "EQUITIES",
    sentiment: "BULLISH",
    symbols: ["RELIANCE"],
  },
  {
    id: "n5",
    title: "Crude Oil Consolidates Below $75/bbl on OPEC+ Quota Compliance and US Inventory Builds",
    summary: "MCX crude contracts experience moderate intraday theta decay as implied volatility drops 1.4% ahead of EIA report.",
    source: "MCX Telemetry",
    timeAgo: "3h ago",
    category: "MACRO",
    sentiment: "NEUTRAL",
    symbols: ["CRUDEOIL", "NATURALGAS"],
  },
  {
    id: "n6",
    title: "USD/INR Holds Range-Bound Near 84.05 with Active Central Bank Absorption",
    summary: "Forex desk observations indicate muted offshore forward volatility with corporate dollar hedging stabilizing near key support.",
    source: "OANDA Forex Desk",
    timeAgo: "4h ago",
    category: "FOREX",
    sentiment: "NEUTRAL",
    symbols: ["USDINR", "EURINR"],
  },
];

export function MarketNewsView({ onSelectSymbol }: { onSelectSymbol?: (symbol: string) => void }) {
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const filtered = NEWS_DATA.filter((item) => {
    if (filterCategory !== "ALL" && item.category !== filterCategory) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && !item.symbols.some(s => s.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="w-full bg-[#071426] border border-[#15304A] rounded-lg p-4 font-sans select-none space-y-4 shadow-md">
      {/* Header & Category Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#15304A] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#00C9E8]/10 text-[#00C9E8] border border-[#00C9E8]/30">
            <Newspaper className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#EAF3FF] uppercase tracking-wider">Institutional News & Regulatory Disclosures</h3>
            <span className="text-[10px] text-[#91A7C1]">Verified exchange releases, macroeconomic feeds, and corporate filings</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#91A7C1]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search news..."
              className="pl-7 pr-3 py-1 text-[10px] bg-[#030B16] border border-[#15304A] rounded text-[#EAF3FF] focus:outline-none focus:border-[#00C9E8]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#09182B] p-0.5 rounded border border-[#15304A]">
            {(["ALL", "EQUITIES", "DERIVATIVES", "CRYPTO", "MACRO", "FOREX"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  "px-2 py-0.5 text-[9px] font-mono font-bold rounded transition-colors",
                  filterCategory === cat ? "bg-[#0878FF] text-white" : "text-[#91A7C1] hover:text-[#EAF3FF]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* News Feed List */}
      <div className="space-y-2.5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-lg bg-[#09182B]/60 border border-[#15304A] hover:border-[#1F4264] hover:bg-[#09182B] transition-colors"
          >
            <div className="flex items-center justify-between text-[10px] font-mono text-[#91A7C1] mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[#00C9E8] font-semibold">{item.source}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  <span>{item.timeAgo}</span>
                </span>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#15304A] text-[#EAF3FF]">
                  {item.category}
                </span>
              </div>
              <span className={cn(
                "px-1.5 py-0.2 rounded text-[9px] font-bold",
                item.sentiment === "BULLISH" ? "bg-[#00D6A0]/15 text-[#00D6A0]" :
                item.sentiment === "BEARISH" ? "bg-[#FF5268]/15 text-[#FF5268]" :
                "bg-[#91A7C1]/15 text-[#91A7C1]"
              )}>
                {item.sentiment}
              </span>
            </div>

            <div className="text-[12px] font-bold text-[#EAF3FF] leading-snug">{item.title}</div>
            <div className="text-[11px] text-[#91A7C1] mt-1 leading-relaxed">{item.summary}</div>

            {/* Affected Symbols */}
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#15304A]/60">
              <span className="text-[9px] font-mono text-[#91A7C1]/70">Symbols:</span>
              {item.symbols.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => onSelectSymbol?.(sym)}
                  className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#030B16] text-[#00C9E8] border border-[#15304A] hover:border-[#00C9E8] transition-colors cursor-pointer"
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

