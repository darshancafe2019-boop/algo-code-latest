"use client";

import React, { useState } from "react";
import {
  X,
  Activity,
  Layers,
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  DollarSign,
  Percent,
  Sliders,
  Send,
  BarChart2,
  Radio,
} from "lucide-react";
import { MarketInstrument } from "@/types/market-universe";
import { WatchlistStarButton } from "@/components/watchlists/WatchlistStarButton";

interface InstrumentDetailDrawerProps {
  instrument: MarketInstrument | null;
  isOpen: boolean;
  onClose: () => void;
}

export type InstrumentDrawerTab =
  | "overview"
  | "chart"
  | "technical"
  | "options"
  | "futures"
  | "orderflow"
  | "oi"
  | "news"
  | "signals"
  | "risk"
  | "orders";

export function InstrumentDetailDrawer({
  instrument,
  isOpen,
  onClose,
}: InstrumentDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<InstrumentDrawerTab>("overview");

  if (!isOpen || !instrument) return null;

  const sym = instrument.canonical_symbol || instrument.symbol || "UNKNOWN";
  const currSymbol = instrument.currency === "INR" ? "₹" : "$";
  const isPositive = (instrument.change_24h || 0) >= 0;

  const tabs: Array<{ id: InstrumentDrawerTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "chart", label: "Chart/Data" },
    { id: "technical", label: "Technical" },
    { id: "options", label: "Options" },
    { id: "futures", label: "Futures" },
    { id: "orderflow", label: "Order Flow" },
    { id: "oi", label: "Open Interest" },
    { id: "news", label: "News" },
    { id: "signals", label: "Signals" },
    { id: "risk", label: "Risk" },
    { id: "orders", label: "Orders" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn select-none font-sans">
      <div className="bg-[#0D1914] border-l border-[#294238] w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#1B3328] bg-[#0A130F] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border bg-emerald-950 text-[#55C98A] border-emerald-800 font-bold text-xs font-mono uppercase">
              {instrument.exchange || "VENUE"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  {sym}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
                  {instrument.asset_class}
                </span>
              </div>
              <p className="text-xs text-[#A8BDB0]">
                {instrument.company_name || "Canonical Asset"} • Lot: {instrument.lot_size} • Tick: {instrument.tick_size}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <WatchlistStarButton instrument={instrument} size="md" showLabel={true} />
            <button onClick={onClose} className="text-[#A8BDB0] hover:text-white p-1" title="Close Drawer">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 11-Tab Navigation Strip */}
        <div className="bg-[#07110D] border-b border-[#1B3328] px-3 py-2 flex items-center gap-1 overflow-x-auto custom-scrollbar text-xs font-mono">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                activeTab === tab.id
                  ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-sm"
                  : "text-[#A8BDB0] hover:text-white hover:bg-[#0D1914]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Drawer Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar text-xs font-mono">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#07110D] border border-[#1B3328] space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-[#70877A] text-[10px] uppercase font-bold">Last Traded Price</span>
                  <div className="text-right">
                    <span className="text-xl font-bold text-white block">
                      {instrument.last_price ? `${currSymbol}${instrument.last_price.toLocaleString()}` : "N/A"}
                    </span>
                    <span className={`text-xs font-bold ${isPositive ? "text-[#55C98A]" : "text-red-400"}`}>
                      {isPositive ? "+" : ""}{(instrument.change_24h || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#1B3328] text-[11px]">
                  <div>
                    <span className="text-[#70877A] block">24H High</span>
                    <span className="text-white font-bold">{instrument.high_24h ? `${currSymbol}${instrument.high_24h.toFixed(2)}` : "—"}</span>
                  </div>
                  <div>
                    <span className="text-[#70877A] block">24H Low</span>
                    <span className="text-white font-bold">{instrument.low_24h ? `${currSymbol}${instrument.low_24h.toFixed(2)}` : "—"}</span>
                  </div>
                  <div>
                    <span className="text-[#70877A] block">24H Volume</span>
                    <span className="text-cyan-300 font-bold">{instrument.volume_24h ? instrument.volume_24h.toLocaleString() : "—"}</span>
                  </div>
                  <div>
                    <span className="text-[#70877A] block">Open Interest</span>
                    <span className="text-purple-300 font-bold">{instrument.open_interest ? instrument.open_interest.toLocaleString() : "—"}</span>
                  </div>
                  <div>
                    <span className="text-[#70877A] block">Data Source</span>
                    <span className="text-amber-400 font-bold">{instrument.data_source || "Official API"}</span>
                  </div>
                  <div>
                    <span className="text-[#70877A] block">Data Status</span>
                    <span className="text-[#55C98A] font-bold">{instrument.data_status || "LIVE"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TECHNICAL */}
          {activeTab === "technical" && (
            <div className="space-y-3 animate-fadeIn">
              <div className="p-3.5 rounded-xl bg-[#07110D] border border-[#1B3328] space-y-2">
                <span className="text-[10px] text-[#70877A] font-bold uppercase block">Technical Indicators Snapshot</span>
                <div className="space-y-1.5 text-[11px] text-[#A8BDB0]">
                  <p>• EMA Alignment: EMA 9 &gt; EMA 21 &gt; EMA 200 (Bullish Structure)</p>
                  <p>• RSI (14): 58.5 (Bullish Expansion Zone)</p>
                  <p>• ATR Volatility: 480.00 pts</p>
                  <p>• ADX Trend Strength: 28.4 (Strong Trend)</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: RISK */}
          {activeTab === "risk" && (
            <div className="space-y-3 animate-fadeIn">
              <div className="p-3.5 rounded-xl bg-[#07110D] border border-[#1B3328] space-y-2">
                <span className="text-[10px] text-[#70877A] font-bold uppercase block">Instrument Risk Controls</span>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>Max Position: <strong className="text-white">100 Lots</strong></div>
                  <div>Max Drawdown Gate: <strong className="text-red-400">5.0%</strong></div>
                  <div>Concentration Cap: <strong className="text-cyan-300">40.0%</strong></div>
                  <div>Paper Tradable: <strong className="text-[#55C98A]">ENABLED</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
