"use client";

import React, { useState } from "react";
import { X, Star, ExternalLink, LineChart } from "lucide-react";
import { StockQuoteRow } from "../types/stocks";
import { useStocksStore } from "../state/stocks-store";
import { useStockDetails } from "../hooks/use-stock-details";
import { formatStockCurrency, formatStockPercent } from "../utils/formatting";
import { StockOverview } from "./StockOverview";
import { StockAnalysis } from "./StockAnalysis";
import { StockFundamentals } from "./StockFundamentals";
import { StockTechnicals } from "./StockTechnicals";
import { StockDataQuality } from "./StockDataQuality";
import { toggleFavoriteStock } from "../api/stocks-api";
import { useRouter } from "next/navigation";

interface StockDetailsDrawerProps {
  stock: StockQuoteRow;
  onClose: () => void;
}

type TabType = "OVERVIEW" | "ANALYSIS" | "FUNDAMENTALS" | "TECHNICALS" | "QUALITY";

export const StockDetailsDrawer: React.FC<StockDetailsDrawerProps> = ({ stock, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>("OVERVIEW");
  const { favorites, toggleFavoriteLocal } = useStocksStore();
  const router = useRouter();

  const isFav = favorites.has(stock.instrument_id);
  const { instrument, fundamentals, analysis, isLoading } = useStockDetails(
    stock.instrument_id,
    stock.symbol
  );

  const changePct = stock.change_pct ?? 0;
  const isPositive = changePct >= 0;

  const handleToggleFavorite = async () => {
    toggleFavoriteLocal(stock.instrument_id);
    try {
      await toggleFavoriteStock(stock.instrument_id, stock.symbol, stock.exchange);
    } catch {
      toggleFavoriteLocal(stock.instrument_id);
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: "OVERVIEW", label: "Overview" },
    { id: "ANALYSIS", label: "Analysis" },
    { id: "FUNDAMENTALS", label: "Fundamentals" },
    { id: "TECHNICALS", label: "Technicals" },
    { id: "QUALITY", label: "Data Quality" },
  ];

  return (
    <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0 bg-slate-950/95 border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-mono select-none backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-200 z-30">
      {/* 1. Header Banner */}
      <div className="p-4 bg-slate-900/80 border-b border-slate-800 space-y-3 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-white tracking-tight truncate">
                {stock.symbol}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {stock.exchange}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                EQUITY
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[280px]">
              {stock.company_name}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleToggleFavorite}
              className={`p-1.5 rounded-lg border transition ${
                isFav
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              title={isFav ? "Remove from Favorites" : "Add to Favorites"}
            >
              <Star className={`w-3.5 h-3.5 ${isFav ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Price & Change Strip */}
        <div className="flex items-baseline justify-between pt-1">
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              {formatStockCurrency(stock.last_price, stock.currency)}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs font-bold">
              <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                {formatStockPercent(stock.change_pct)}
              </span>
              {stock.change_abs && (
                <span className="text-[11px] text-slate-500 font-normal">
                  ({formatStockCurrency(stock.change_abs, stock.currency)})
                </span>
              )}
            </div>
          </div>

          <div className="text-right space-y-1">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              {stock.provider.toUpperCase()} FEED
            </span>
            <div className="text-[10px] text-slate-500">
              {stock.market_status} Session
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-slate-950 px-2 overflow-x-auto custom-scrollbar shrink-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-3 text-xs font-bold whitespace-nowrap transition border-b-2 ${
                isActive
                  ? "text-cyan-400 border-cyan-400 bg-cyan-500/5"
                  : "text-slate-400 border-transparent hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. Tab Body (Scrollable) */}
      <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
        {activeTab === "OVERVIEW" && <StockOverview quote={stock} instrument={instrument} />}
        {activeTab === "ANALYSIS" && <StockAnalysis analysis={analysis} />}
        {activeTab === "FUNDAMENTALS" && <StockFundamentals fundamentals={fundamentals} />}
        {activeTab === "TECHNICALS" && <StockTechnicals technicals={undefined} lastPrice={stock.last_price} />}
        {activeTab === "QUALITY" && <StockDataQuality quote={stock} />}
      </div>

      {/* 4. Action Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60 shrink-0">
        <button
          onClick={() => router.push(`/charts?symbol=${encodeURIComponent(stock.symbol)}`)}
          className="w-full py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold text-xs transition border border-cyan-500/30 flex items-center justify-center gap-2"
        >
          <LineChart className="w-3.5 h-3.5" />
          <span>Launch Pro Interactive Chart</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </button>
      </div>
    </div>
  );
};
