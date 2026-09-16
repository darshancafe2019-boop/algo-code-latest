"use client";

import { formatMoney } from "@/lib/formatters";
import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Zap,
  ArrowRight,
  Clock,
  Radio,
  BarChart3,
  Percent,
} from "lucide-react";
import { CryptoMarketOverviewItem } from "@/types/crypto-derivatives";
import { cn } from "@/lib/utils";

interface CryptoOverviewTabProps {
  markets: CryptoMarketOverviewItem[];
  selectedUnderlying: string;
  onSelectUnderlying: (u: string) => void;
  onNavigateTab: (tab: "FUTURES" | "OPTIONS" | "STRATEGIES") => void;
  onOpenTradeDrawer: (contract: any, side: "BUY" | "SELL") => void;
  isLoading: boolean;
}

export const CryptoOverviewTab: React.FC<CryptoOverviewTabProps> = ({
  markets,
  selectedUnderlying,
  onSelectUnderlying,
  onNavigateTab,
  onOpenTradeDrawer,
  isLoading,
}) => {
  // If no markets yet, show primary standard assets (BTC, ETH, SOL)
  const displayList = markets.length > 0 ? markets : [
    {
      underlying: "BTC",
      display_name: "BTC / Tether",
      spot_price: 64250.0,
      futures_price: 64268.0,
      mark_price: 64268.0,
      basis: 18.0,
      basis_pct: 0.028,
      funding_rate_pct: 0.01,
      funding_countdown: "02:14:32",
      open_interest: 1840000000.0,
      change_24h: 2.45,
      active_expiries_count: 8,
      nearest_expiry: "27-SEP-2026",
    },
    {
      underlying: "ETH",
      display_name: "ETH / Tether",
      spot_price: 3450.0,
      futures_price: 3452.5,
      mark_price: 3452.5,
      basis: 2.5,
      basis_pct: 0.072,
      funding_rate_pct: 0.008,
      funding_countdown: "02:14:32",
      open_interest: 890000000.0,
      change_24h: 3.12,
      active_expiries_count: 6,
      nearest_expiry: "27-SEP-2026",
    },
    {
      underlying: "SOL",
      display_name: "SOL / Tether",
      spot_price: 152.4,
      futures_price: 152.8,
      mark_price: 152.8,
      basis: 0.4,
      basis_pct: 0.26,
      funding_rate_pct: 0.012,
      funding_countdown: "02:14:32",
      open_interest: 420000000.0,
      change_24h: 5.8,
      active_expiries_count: 4,
      nearest_expiry: "27-SEP-2026",
    },
  ];

  return (
    <div className="space-y-4 select-none">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayList.map((m) => {
          const isSelected = selectedUnderlying === m.underlying;
          const isBullish = m.change_24h >= 0;

          return (
            <div
              key={m.underlying}
              onClick={() => onSelectUnderlying(m.underlying)}
              className={cn(
                "bg-[#050e1d]/95 border rounded-2xl p-4 shadow-lg transition-all cursor-pointer flex flex-col justify-between group",
                isSelected
                  ? "border-[#00D4FF] bg-[#07192f] shadow-md shadow-[#00D4FF]/10"
                  : "border-[#12365a] hover:border-[#1a4a7a] hover:bg-[#07192e]"
              )}
            >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#0d2847]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-lg text-white group-hover:text-[#00D4FF] transition-colors">
                      {m.underlying}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">/ USDT</span>
                  </div>

                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 border",
                      isBullish
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    )}
                  >
                    {isBullish ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {m.change_24h > 0 ? `+${m.change_24h}%` : `${m.change_24h}%`}
                  </span>
                </div>

                {/* Spot vs Perp Price Grid */}
                <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-[#040f1f] border border-[#0d2847]">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">SPOT PRICE</span>
                    <div className="text-sm font-extrabold text-white font-mono mt-0.5">
                      {formatMoney(m.spot_price, "$")}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">PERPETUAL LTP</span>
                    <div className="text-sm font-extrabold text-[#00D4FF] font-mono mt-0.5">
                      {formatMoney(m.futures_price, "$")}
                    </div>
                  </div>
                </div>

                {/* Metrics Matrix */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mb-3">
                  <div className="bg-[#07192f] p-2 rounded-lg border border-[#103456]">
                    <span className="text-slate-500 text-[10px] block">FUNDING (8H)</span>
                    <span className="text-emerald-400 font-bold">
                      +{m.funding_rate_pct.toFixed(3)}%
                    </span>
                    <span className="text-slate-400 text-[10px] block mt-0.5">
                      Next: {m.funding_countdown}
                    </span>
                  </div>

                  <div className="bg-[#07192f] p-2 rounded-lg border border-[#103456]">
                    <span className="text-slate-500 text-[10px] block">OPEN INTEREST</span>
                    <span className="text-slate-200 font-bold">
                      ${(m.open_interest / 1e6).toFixed(1)}M
                    </span>
                    <span className="text-cyan-300 text-[10px] block mt-0.5">
                      {m.active_expiries_count} Expiries
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Strip */}
              <div className="pt-2 border-t border-[#0d2847] flex items-center justify-between gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTradeDrawer({ symbol: `${m.underlying}-PERP`, underlying: m.underlying, ltp: m.futures_price }, "BUY");
                  }}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] font-mono transition-all text-center shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  TRADE
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectUnderlying(m.underlying);
                    onNavigateTab("FUTURES");
                  }}
                  className="py-1.5 px-2.5 rounded-lg bg-[#07192f] hover:bg-[#0c284a] text-slate-200 border border-[#143e69] font-semibold text-[11px] transition-all cursor-pointer"
                >
                  FUTURES
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectUnderlying(m.underlying);
                    onNavigateTab("OPTIONS");
                  }}
                  className="py-1.5 px-2.5 rounded-lg bg-[#07192f] hover:bg-[#0c284a] text-[#00D4FF] border border-[#143e69] font-semibold text-[11px] transition-all cursor-pointer"
                >
                  OPTIONS
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
