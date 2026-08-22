"use client";

import React, { useState } from "react";
import { Search, ChevronDown, Check, TrendingUp, TrendingDown, Layers, Coins } from "lucide-react";
import { MarketInstrument } from "@/types/market-universe";

interface InstrumentSearchSelectorProps {
  selectedSymbol: string;
  onSelectInstrument: (symbol: string, price: number, assetClass: string, exchange: string) => void;
  currentPrice: number;
  priceChange24h?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  bidPrice?: number;
  askPrice?: number;
}

export function InstrumentSearchSelector({
  selectedSymbol,
  onSelectInstrument,
  currentPrice,
  priceChange24h = 2.45,
  high24h,
  low24h,
  volume24h,
  bidPrice,
  askPrice,
}: InstrumentSearchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const canonicalUniverse: { symbol: string; name: string; assetClass: string; exchange: string; price: number }[] = [
    { symbol: "BTC/USDT", name: "Bitcoin Perpetual", assetClass: "Crypto", exchange: "CCXT Binance", price: 65240.0 },
    { symbol: "ETH/USDT", name: "Ethereum Perpetual", assetClass: "Crypto", exchange: "CCXT Binance", price: 3480.5 },
    { symbol: "SOL/USDT", name: "Solana Spot/Perp", assetClass: "Crypto", exchange: "CCXT Binance", price: 178.2 },
    { symbol: "NIFTY 50", name: "NSE NIFTY 50 Index", assetClass: "Indian Index", exchange: "NSE", price: 24350.0 },
    { symbol: "BANKNIFTY", name: "NSE Nifty Bank Index", assetClass: "Indian Index", exchange: "NSE", price: 51200.0 },
    { symbol: "RELIANCE.NS", name: "Reliance Industries", assetClass: "Stocks", exchange: "NSE", price: 2940.0 },
    { symbol: "TCS.NS", name: "Tata Consultancy Services", assetClass: "Stocks", exchange: "NSE", price: 4210.0 },
    { symbol: "S&P 500", name: "S&P 500 Global Index", assetClass: "Global Indices", exchange: "Yahoo", price: 5648.4 },
    { symbol: "NASDAQ 100", name: "Nasdaq 100 Tech", assetClass: "Global Indices", exchange: "Yahoo", price: 19820.0 },
    { symbol: "EUR/USD", name: "Euro / US Dollar", assetClass: "Forex", exchange: "OANDA", price: 1.0895 },
    { symbol: "GOLD (XAU/USD)", name: "Gold Spot", assetClass: "Commodities", exchange: "MCX / Global", price: 2485.6 },
    { symbol: "CRUDE OIL", name: "WTI Crude Oil", assetClass: "Commodities", exchange: "MCX / NYMEX", price: 78.4 },
  ];

  const filtered = canonicalUniverse.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q) || item.assetClass.toLowerCase().includes(q);
  });

  const isPositive = priceChange24h >= 0;
  const isINR = selectedSymbol.includes("NIFTY") || selectedSymbol.includes(".NS") || selectedSymbol.includes(".BO");
  const currencySymbol = isINR ? "₹" : "$";

  return (
    <div className="bg-[#141E33] border border-[#1E293B] rounded-2xl p-4 space-y-3 relative">
      {/* Top Bar: Selector trigger and live price */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0B111E] border border-slate-700 hover:border-cyan-500 text-white text-sm font-bold font-mono transition-all"
          >
            <Coins className="w-4 h-4 text-cyan-400" />
            <span>{selectedSymbol}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-[#0B111E] border border-slate-700 rounded-xl shadow-2xl z-50 p-3 space-y-2 max-h-80 overflow-y-auto">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search symbol, underlying, index..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-[#141E33] border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
              </div>

              <div className="space-y-1 divide-y divide-slate-800/60">
                {filtered.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => {
                      onSelectInstrument(item.symbol, item.price, item.assetClass, item.exchange);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition-colors ${
                      item.symbol === selectedSymbol ? "bg-[#142342] text-cyan-400" : "hover:bg-[#141E33] text-slate-200"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold font-mono">{item.symbol}</div>
                      <div className="text-[10px] text-slate-400">{item.name} • {item.exchange}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-white">
                        {item.symbol.includes("NIFTY") || item.symbol.includes(".NS") ? "₹" : "$"}{item.price.toLocaleString()}
                      </div>
                      <div className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {item.assetClass}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Quote Strip */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Last Traded Price</div>
            <div className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>{currencySymbol}{(Number(currentPrice) || 64500).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={`text-xs font-semibold flex items-center ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? "+" : ""}{(Number(priceChange24h) || 0).toFixed(2)}%
              </span>
            </div>
          </div>

          {bidPrice !== undefined && askPrice !== undefined && (
            <div className="hidden sm:block border-l border-slate-700 pl-4">
              <div className="text-[10px] text-slate-400 uppercase">Bid / Ask Spread</div>
              <div className="text-xs font-bold text-slate-300">
                <span className="text-emerald-400">{currencySymbol}{(Number(bidPrice) || 0).toFixed(2)}</span> / <span className="text-red-400">{currencySymbol}{(Number(askPrice) || 0).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
