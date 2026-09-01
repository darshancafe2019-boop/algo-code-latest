"use client";

import React, { useState } from "react";
import {
  Search,
  X,
  Sparkles,
  TrendingUp,
  Layers,
  Zap,
  Globe2,
  Shield,
  Activity,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useUIStore } from "@/lib/store/useUIStore";
import { useActiveBot } from "@/context/ActiveBotContext";

interface MarketItem {
  symbol: string;
  displayName: string;
  category: "CRYPTO_OPTIONS" | "CRYPTO_SPOT" | "INDIAN_EQUITIES" | "US_EQUITIES" | "FOREX_COMMODITIES";
  tag: string;
  exchange: string;
  defaultTimeframe: string;
  refPrice: string;
  changePct: string;
  isPopular?: boolean;
}

const MARKET_PRESETS: MarketItem[] = [
  // ⚡ Crypto Options
  { symbol: "BTC-OPTIONS", displayName: "BTC Bitcoin Options Chain", category: "CRYPTO_OPTIONS", tag: "Options", exchange: "Delta / Deribit", defaultTimeframe: "5m", refPrice: "$78,500", changePct: "+2.4%", isPopular: true },
  { symbol: "ETH-OPTIONS", displayName: "ETH Ethereum Options Chain", category: "CRYPTO_OPTIONS", tag: "Options", exchange: "Delta / Deribit", defaultTimeframe: "5m", refPrice: "$3,480", changePct: "+1.8%", isPopular: true },
  { symbol: "SOL-OPTIONS", displayName: "SOL Solana Options Chain", category: "CRYPTO_OPTIONS", tag: "Options", exchange: "Delta / Deribit", defaultTimeframe: "5m", refPrice: "$188", changePct: "+4.2%" },

  // 🪙 Crypto Spot & Futures
  { symbol: "BTC/USDT", displayName: "Bitcoin / Tether Spot", category: "CRYPTO_SPOT", tag: "Crypto", exchange: "Binance Spot", defaultTimeframe: "5m", refPrice: "$78,520", changePct: "+2.5%", isPopular: true },
  { symbol: "ETH/USDT", displayName: "Ethereum / Tether Spot", category: "CRYPTO_SPOT", tag: "Crypto", exchange: "Binance Spot", defaultTimeframe: "5m", refPrice: "$3,482", changePct: "+1.9%", isPopular: true },
  { symbol: "SOL/USDT", displayName: "Solana / Tether Spot", category: "CRYPTO_SPOT", tag: "Crypto", exchange: "Binance Spot", defaultTimeframe: "5m", refPrice: "$188.4", changePct: "+4.1%" },
  { symbol: "BTC/USDT:USDT", displayName: "BTC Perpetual Futures", category: "CRYPTO_SPOT", tag: "Perp", exchange: "Binance Futures", defaultTimeframe: "5m", refPrice: "$78,540", changePct: "+2.6%" },

  // 🇮🇳 Indian Equities & Indices
  { symbol: "NIFTY", displayName: "NIFTY 50 Benchmark Index", category: "INDIAN_EQUITIES", tag: "Index F&O", exchange: "NSE / Upstox", defaultTimeframe: "15m", refPrice: "24,850", changePct: "+0.65%", isPopular: true },
  { symbol: "BANKNIFTY", displayName: "Nifty Bank Index", category: "INDIAN_EQUITIES", tag: "Index F&O", exchange: "NSE / Upstox", defaultTimeframe: "15m", refPrice: "51,200", changePct: "+0.82%", isPopular: true },
  { symbol: "RELIANCE", displayName: "Reliance Industries Ltd", category: "INDIAN_EQUITIES", tag: "Equity", exchange: "NSE / BSE", defaultTimeframe: "15m", refPrice: "₹3,010", changePct: "+1.12%" },
  { symbol: "TCS", displayName: "Tata Consultancy Services", category: "INDIAN_EQUITIES", tag: "Equity", exchange: "NSE / BSE", defaultTimeframe: "15m", refPrice: "₹4,220", changePct: "+0.45%" },
  { symbol: "INFY", displayName: "Infosys Ltd", category: "INDIAN_EQUITIES", tag: "Equity", exchange: "NSE / BSE", defaultTimeframe: "15m", refPrice: "₹1,880", changePct: "+0.90%" },

  // 🇺🇸 US Tech & Benchmark ETFs
  { symbol: "AAPL", displayName: "Apple Inc.", category: "US_EQUITIES", tag: "US Tech", exchange: "NASDAQ / Alpha Vantage", defaultTimeframe: "1d", refPrice: "$316.85", changePct: "+1.35%", isPopular: true },
  { symbol: "MSFT", displayName: "Microsoft Corp.", category: "US_EQUITIES", tag: "US Tech", exchange: "NASDAQ / Alpha Vantage", defaultTimeframe: "1d", refPrice: "$418.20", changePct: "+0.88%" },
  { symbol: "NVDA", displayName: "NVIDIA Corp.", category: "US_EQUITIES", tag: "AI / Tech", exchange: "NASDAQ / Alpha Vantage", defaultTimeframe: "1d", refPrice: "$128.40", changePct: "+3.45%", isPopular: true },
  { symbol: "SPY", displayName: "SPDR S&P 500 ETF Trust", category: "US_EQUITIES", tag: "US Index", exchange: "NYSE / Alpha Vantage", defaultTimeframe: "1d", refPrice: "$562.80", changePct: "+0.52%" },
  { symbol: "QQQ", displayName: "Invesco QQQ Trust (Nasdaq 100)", category: "US_EQUITIES", tag: "US Tech ETF", exchange: "NASDAQ / Alpha Vantage", defaultTimeframe: "1d", refPrice: "$478.40", changePct: "+0.95%" },

  // 💱 Forex & Commodities
  { symbol: "EURUSD", displayName: "Euro / US Dollar", category: "FOREX_COMMODITIES", tag: "Forex", exchange: "Alpha Vantage FX", defaultTimeframe: "15m", refPrice: "1.0850", changePct: "+0.15%" },
  { symbol: "GBPUSD", displayName: "British Pound / US Dollar", category: "FOREX_COMMODITIES", tag: "Forex", exchange: "Alpha Vantage FX", defaultTimeframe: "15m", refPrice: "1.2950", changePct: "+0.22%" },
  { symbol: "XAU/USD", displayName: "Gold Spot / US Dollar", category: "FOREX_COMMODITIES", tag: "Metals", exchange: "Global Spot", defaultTimeframe: "15m", refPrice: "$2,510", changePct: "+0.75%" },
];

export function QuickMarketSwitcherModal() {
  const { isMarketSwitcherOpen, setMarketSwitcherOpen, setActiveSymbol, setActiveTimeframe, setAICopilotOpen } = useUIStore();
  const { activeSymbol, setActiveSymbol: setContextSymbol, setActiveTimeframe: setContextTimeframe } = useActiveBot();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  if (!isMarketSwitcherOpen) return null;

  const categories = [
    { id: "ALL", label: "All Markets" },
    { id: "CRYPTO_OPTIONS", label: "⚡ Crypto Options" },
    { id: "CRYPTO_SPOT", label: "🪙 Crypto Spot" },
    { id: "INDIAN_EQUITIES", label: "🇮🇳 Indian Equities/F&O" },
    { id: "US_EQUITIES", label: "🇺🇸 US Tech (Alpha Vantage)" },
    { id: "FOREX_COMMODITIES", label: "💱 Forex & Gold" },
  ];

  const filtered = MARKET_PRESETS.filter((item) => {
    const matchesCat = selectedCategory === "ALL" || item.category === selectedCategory;
    const matchesSearch =
      search === "" ||
      item.symbol.toLowerCase().includes(search.toLowerCase()) ||
      item.displayName.toLowerCase().includes(search.toLowerCase()) ||
      item.tag.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleSelectMarket = (item: MarketItem) => {
    setActiveSymbol(item.symbol);
    setActiveTimeframe(item.defaultTimeframe);
    if (setContextSymbol) setContextSymbol(item.symbol);
    if (setContextTimeframe) setContextTimeframe(item.defaultTimeframe);
    setMarketSwitcherOpen(false);
  };

  const handleOpenAICopilotForSymbol = (e: React.MouseEvent, item: MarketItem) => {
    e.stopPropagation();
    setActiveSymbol(item.symbol);
    setActiveTimeframe(item.defaultTimeframe);
    if (setContextSymbol) setContextSymbol(item.symbol);
    if (setContextTimeframe) setContextTimeframe(item.defaultTimeframe);
    setMarketSwitcherOpen(false);
    setAICopilotOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300 font-sans text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                Select Active Market Universe
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Switch instantly across Crypto Options, Spots, Indian F&amp;O, and US Equities.
              </p>
            </div>
          </div>
          <button
            onClick={() => setMarketSwitcherOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search any market (e.g. BTC-OPTIONS, NIFTY, AAPL, EURUSD, SOL)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 text-xs focus:outline-none focus:border-cyan-500/80 font-mono transition"
            autoFocus
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition border ${
                selectedCategory === cat.id
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Market List */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1 no-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-mono">
              No matching markets found for &quot;{search}&quot;.
            </div>
          ) : (
            filtered.map((item) => {
              const isActive = activeSymbol === item.symbol;
              return (
                <div
                  key={item.symbol}
                  onClick={() => handleSelectMarket(item)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer group ${
                    isActive
                      ? "bg-cyan-950/40 border-cyan-500/50 text-white shadow-md"
                      : "bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400 font-mono font-bold text-xs">
                      {item.symbol.includes("OPTIONS") ? "OPT" : item.symbol.substring(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-100 group-hover:text-cyan-300 transition">
                          {item.symbol}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          {item.tag}
                        </span>
                        {isActive && (
                          <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                        {item.displayName} • <span className="text-slate-500">{item.exchange}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-slate-200">{item.refPrice}</div>
                      <div className="text-[10px] font-mono text-emerald-400 font-semibold">{item.changePct}</div>
                    </div>

                    {/* AI Copilot Quick Trigger */}
                    <button
                      onClick={(e) => handleOpenAICopilotForSymbol(e, item)}
                      title={`Run AI Market Copilot on ${item.symbol}`}
                      className="p-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
          <span>Tip: Click any asset to switch the active terminal workspace.</span>
          <button
            onClick={() => {
              setMarketSwitcherOpen(false);
              setAICopilotOpen(true);
            }}
            className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-bold transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Universal AI Copilot (⌘J)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
