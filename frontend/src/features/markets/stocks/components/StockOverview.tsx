"use client";

import React from "react";
import { StockQuoteRow, StockInstrument } from "../types/stocks";
import { formatStockCurrency, formatStockPercent, formatStockVolume, formatStockMarketCap, formatRelativeVolume } from "../utils/formatting";

interface StockOverviewProps {
  quote: StockQuoteRow;
  instrument?: StockInstrument;
}

export const StockOverview: React.FC<StockOverviewProps> = ({ quote, instrument }) => {
  const curr = quote.currency || "INR";

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* 24H Price Summary Card */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Price Action &amp; OHLC</span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Open</span>
            <span className="text-slate-200 font-bold">{formatStockCurrency(quote.open_price, curr)}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Prev Close</span>
            <span className="text-slate-200 font-bold">{formatStockCurrency(quote.previous_close, curr)}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">24h High</span>
            <span className="text-emerald-400 font-bold">{formatStockCurrency(quote.high_price, curr)}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">24h Low</span>
            <span className="text-rose-400 font-bold">{formatStockCurrency(quote.low_price, curr)}</span>
          </div>
        </div>
      </div>

      {/* 52-Week Range */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
        <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase">
          <span>52-Week Low</span>
          <span>52-Week Range</span>
          <span>52-Week High</span>
        </div>
        <div className="flex items-center justify-between font-bold text-xs">
          <span className="text-rose-400">{formatStockCurrency(quote.low_52w, curr)}</span>
          <span className="text-emerald-400">{formatStockCurrency(quote.high_52w, curr)}</span>
        </div>
        {quote.high_52w && quote.low_52w && (
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-cyan-400 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    ((quote.last_price - quote.low_52w) / (quote.high_52w - quote.low_52w)) * 100
                  )
                )}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Volume & Turnover */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Trading Liquidity</span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Share Volume</span>
            <span className="text-white font-bold">{formatStockVolume(quote.volume_shares)}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Relative Volume</span>
            <span className="text-cyan-300 font-bold">{formatRelativeVolume(quote.relative_volume)}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Turnover (Quote)</span>
            <span className="text-slate-200 font-bold">{quote.turnover ? formatStockMarketCap(quote.turnover, curr) : "—"}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">VWAP</span>
            <span className="text-slate-200 font-bold">{formatStockCurrency(quote.vwap, curr)}</span>
          </div>
        </div>
      </div>

      {/* Classification Details */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Corporate Profile</span>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between py-0.5 border-b border-slate-800/50">
            <span className="text-slate-500">Sector</span>
            <span className="text-slate-200">{quote.sector || instrument?.sector || "—"}</span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-slate-800/50">
            <span className="text-slate-500">Industry</span>
            <span className="text-slate-200">{quote.industry || instrument?.industry || "—"}</span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-slate-800/50">
            <span className="text-slate-500">ISIN</span>
            <span className="text-cyan-400 font-mono">{quote.isin || instrument?.isin || "—"}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">F&amp;O Derivatives</span>
            <span className="text-slate-200">{quote.is_fno_enabled ? "Enabled" : "Not Active"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
