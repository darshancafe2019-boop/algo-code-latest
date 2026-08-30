"use client";

import React from "react";
import { StockFundamentals as IStockFundamentals } from "../types/stocks";
import { formatStockMarketCap } from "../utils/formatting";

interface StockFundamentalsProps {
  fundamentals?: IStockFundamentals;
}

export const StockFundamentals: React.FC<StockFundamentalsProps> = ({ fundamentals }) => {
  if (!fundamentals) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs">
        Fundamental filings are not available for this instrument.
      </div>
    );
  }

  const formatRatio = (val: number | null | undefined, suffix: string = "") => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return `${val.toFixed(2)}${suffix}`;
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Valuation Multiples */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Valuation Multiples</span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">P/E Ratio</span>
            <span className="text-white font-bold">{formatRatio(fundamentals.pe_ratio)}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">P/B Ratio</span>
            <span className="text-white font-bold">{formatRatio(fundamentals.pb_ratio)}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">EPS (TTM)</span>
            <span className="text-emerald-400 font-bold">{formatRatio(fundamentals.eps_ttm)}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Dividend Yield</span>
            <span className="text-cyan-300 font-bold">{formatRatio(fundamentals.dividend_yield_pct, "%")}</span>
          </div>
        </div>
      </div>

      {/* Financial Health & Returns */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Profitability &amp; Health</span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Return on Equity (ROE)</span>
            <span className="text-white font-bold">{formatRatio(fundamentals.roe_pct, "%")}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Debt to Equity</span>
            <span className="text-white font-bold">{formatRatio(fundamentals.debt_to_equity)}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Operating Margin</span>
            <span className="text-slate-200 font-bold">{formatRatio(fundamentals.operating_margin_pct, "%")}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Net Margin</span>
            <span className="text-slate-200 font-bold">{formatRatio(fundamentals.net_margin_pct, "%")}</span>
          </div>
        </div>
      </div>

      {/* Ownership & Growth */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Ownership Structure</span>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between py-0.5 border-b border-slate-800/50">
            <span className="text-slate-500">Promoter / Insider Holding</span>
            <span className="text-slate-200">{formatRatio(fundamentals.promoter_holding_pct, "%")}</span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-slate-800/50">
            <span className="text-slate-500">Institutional Holding</span>
            <span className="text-slate-200">{formatRatio(fundamentals.institutional_holding_pct, "%")}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Data Source</span>
            <span className="text-cyan-400">{fundamentals.data_source}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
