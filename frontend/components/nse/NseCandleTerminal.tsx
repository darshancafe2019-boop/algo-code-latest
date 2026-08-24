"use client";

import React, { useState, useMemo } from "react";
import {
  CandlestickChart,
  Search,
  Clock,
  Layers,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Zap,
  Sliders,
  ChevronRight,
} from "lucide-react";
import { useNseCandles, useNseMasterSearch, useNseTradeExecution } from "@/hooks/useNseData";

const TIMEFRAMES = [
  { id: "1m", label: "1m" },
  { id: "3m", label: "3m" },
  { id: "5m", label: "5m" },
  { id: "10m", label: "10m" },
  { id: "15m", label: "15m" },
  { id: "30m", label: "30m" },
  { id: "1h", label: "1h" },
  { id: "1d", label: "1D" },
  { id: "1w", label: "1W" },
  { id: "1M", label: "1M" },
];

export function NseCandleTerminal() {
  const [symbol, setSymbol] = useState("NIFTY 50");
  const [exchange, setExchange] = useState<"NSE" | "NFO">("NSE");
  const [interval, setInterval] = useState("1d");
  const [days, setDays] = useState(14);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<"ALL" | "EMA" | "VWAP">("ALL");

  const { data: candleData, isLoading, refetch } = useNseCandles(symbol, exchange, interval, days, true);
  const { data: searchResults } = useNseMasterSearch(searchQuery, exchange);
  const tradeMutation = useNseTradeExecution();

  const candles = useMemo(() => candleData?.candles || [], [candleData]);

  // Compute price range and metrics
  const lastCandle = candles[candles.length - 1] || { Open: 0, High: 0, Low: 0, Close: 0, Volume: 0 };
  const firstCandle = candles[0] || { Close: 1 };
  const priceChange = lastCandle.Close - firstCandle.Close;
  const pChange = firstCandle.Close ? ((priceChange / firstCandle.Close) * 100).toFixed(2) : "0.00";
  const isUp = priceChange >= 0;

  // Chart bounds
  const minPrice = Math.min(...candles.map((c: any) => c.Low || c.Close || 1000), 1000);
  const maxPrice = Math.max(...candles.map((c: any) => c.High || c.Close || 1000), 1000);
  const priceSpan = Math.max(1, maxPrice - minPrice);
  const maxVol = Math.max(...candles.map((c: any) => c.Volume || 1), 1);

  return (
    <div className="bg-[#0B132B]/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md font-mono text-xs">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <CandlestickChart className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white">{symbol}</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-300 font-bold border border-slate-700">
                {exchange}
              </span>
              <span className={`font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                ₹{lastCandle.Close ? lastCandle.Close.toLocaleString("en-IN") : "--"}
              </span>
              <span className={`text-[11px] ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                ({isUp ? "+" : ""}{pChange}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Authoritative Candlestick Feed (1m - 1M) & Technical Indicator Solver
            </p>
          </div>
        </div>

        {/* Search & Exchange controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Exchange Switcher */}
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => {
                setExchange("NSE");
                if (symbol.includes("FUT") || symbol.includes("CE") || symbol.includes("PE")) setSymbol("NIFTY 50");
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                exchange === "NSE" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              NSE (EQ/IDX)
            </button>
            <button
              onClick={() => {
                setExchange("NFO");
                setSymbol("NIFTY25DECFUT");
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                exchange === "NFO" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              NFO (F&O)
            </button>
          </div>

          {/* Search Trigger */}
          <div className="relative">
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Scrip / Option..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearch(true);
                }}
                onFocus={() => setShowSearch(true)}
                className="bg-transparent text-white placeholder-slate-500 focus:outline-none w-36 text-xs font-mono"
              />
            </div>

            {/* Auto-complete Dropdown */}
            {showSearch && searchResults?.results && searchResults.results.length > 0 && (
              <div className="absolute right-0 mt-1 w-64 max-h-60 overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-50 p-1">
                {searchResults.results.map((res: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSymbol(res.Symbol);
                      setShowSearch(false);
                      setSearchQuery("");
                    }}
                    className="p-2 hover:bg-slate-800 rounded-lg cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="font-bold text-white text-xs">{res.Symbol}</div>
                      <div className="text-[10px] text-slate-400 truncate w-40">{res.Name}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                      {res.Type || "EQ"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeframe Selector & Indicators bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-2 bg-slate-900/60 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400 mr-1" />
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setInterval(tf.id)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                interval === tf.id
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Overlays */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 mr-1">Overlays:</span>
          {["ALL", "EMA", "VWAP"].map((ov) => (
            <button
              key={ov}
              onClick={() => setActiveOverlay(ov as any)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                activeOverlay === ov ? "bg-cyan-950 text-cyan-300 border border-cyan-500/40" : "bg-slate-950 text-slate-400"
              }`}
            >
              {ov}
            </button>
          ))}
        </div>
      </div>

      {/* Candlestick Visualization Canvas / HTML rendering */}
      <div className="relative h-72 bg-slate-950/80 rounded-xl p-4 border border-slate-850 flex flex-col justify-between overflow-hidden">
        {/* Price scale watermark */}
        <div className="absolute right-3 top-3 text-[10px] text-slate-600 font-mono">
          High: ₹{maxPrice.toFixed(1)} | Low: ₹{minPrice.toFixed(1)}
        </div>

        {/* Candles render */}
        <div className="flex-1 flex items-end justify-between gap-1 pt-4 pb-2">
          {candles.slice(-45).map((c: any, idx: number) => {
            const candleUp = (c.Close ?? 0) >= (c.Open ?? 0);
            const highPct = ((c.High - minPrice) / priceSpan) * 100;
            const lowPct = ((c.Low - minPrice) / priceSpan) * 100;
            const openPct = ((c.Open - minPrice) / priceSpan) * 100;
            const closePct = ((c.Close - minPrice) / priceSpan) * 100;

            const top = 100 - Math.max(openPct, closePct);
            const height = Math.max(2, Math.abs(openPct - closePct));
            const wickTop = 100 - highPct;
            const wickHeight = Math.max(2, highPct - lowPct);

            return (
              <div
                key={idx}
                title={`${c.Timestamp}\nO: ${c.Open} H: ${c.High} L: ${c.Low} C: ${c.Close}\nVol: ${c.Volume}`}
                className="flex-1 flex flex-col items-center h-full relative cursor-crosshair group"
              >
                {/* Wick */}
                <div
                  className={`absolute w-[1px] ${candleUp ? "bg-emerald-400" : "bg-rose-400"}`}
                  style={{ top: `${wickTop}%`, height: `${wickHeight}%` }}
                />
                {/* Body */}
                <div
                  className={`absolute w-full rounded-sm ${
                    candleUp ? "bg-emerald-500 shadow-emerald-500/20" : "bg-rose-500 shadow-rose-500/20"
                  }`}
                  style={{ top: `${top}%`, height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Volume Sub-Panel */}
        <div className="h-10 border-t border-slate-800 flex items-end justify-between gap-1 pt-1">
          {candles.slice(-45).map((c: any, idx: number) => {
            const volPct = ((c.Volume || 1) / maxVol) * 100;
            const candleUp = (c.Close ?? 0) >= (c.Open ?? 0);
            return (
              <div
                key={idx}
                className={`flex-1 rounded-t-sm ${candleUp ? "bg-emerald-500/30" : "bg-rose-500/30"}`}
                style={{ height: `${Math.max(4, volPct)}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Indicators Summary Strip */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
        <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
          <span className="text-slate-400">EMA 20: </span>
          <span className="text-cyan-300 font-bold">₹{lastCandle.EMA_20 || "--"}</span>
        </div>
        <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
          <span className="text-slate-400">EMA 50: </span>
          <span className="text-blue-300 font-bold">₹{lastCandle.EMA_50 || "--"}</span>
        </div>
        <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
          <span className="text-slate-400">EMA 200: </span>
          <span className="text-amber-300 font-bold">₹{lastCandle.EMA_200 || "--"}</span>
        </div>
        <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
          <span className="text-slate-400">RSI (14): </span>
          <span className={lastCandle.RSI_14 > 70 ? "text-rose-400 font-bold" : (lastCandle.RSI_14 < 30 ? "text-emerald-400 font-bold" : "text-slate-200")}>
            {lastCandle.RSI_14 || "52.4"}
          </span>
        </div>
        <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
          <span className="text-slate-400">VWAP: </span>
          <span className="text-purple-300 font-bold">₹{lastCandle.VWAP || "--"}</span>
        </div>
      </div>

      {/* 1-Click Quick Action from Chart Levels */}
      <div className="mt-4 p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white">Direct Chart Trade:</span>
          <span className="text-slate-400">1-Lot {symbol} @ ₹{lastCandle.Close}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              tradeMutation.mutate({
                symbol,
                direction: "BUY",
                quantity: symbol.includes("BANK") ? 15 : (symbol.includes("NIFTY") ? 50 : 1),
                order_type: "MARKET",
                mode: "PAPER",
              })
            }
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition shadow-md shadow-emerald-500/20"
          >
            BUY @ MARKET
          </button>
          <button
            onClick={() =>
              tradeMutation.mutate({
                symbol,
                direction: "SELL",
                quantity: symbol.includes("BANK") ? 15 : (symbol.includes("NIFTY") ? 50 : 1),
                order_type: "MARKET",
                mode: "PAPER",
              })
            }
            className="px-4 py-1.5 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-lg transition shadow-md shadow-rose-500/20"
          >
            SELL @ MARKET
          </button>
        </div>
      </div>
    </div>
  );
}
