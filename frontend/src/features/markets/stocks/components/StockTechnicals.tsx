"use client";

import React from "react";
import { StockTechnicals as IStockTechnicals } from "../types/stocks";

interface StockTechnicalsProps {
  technicals?: IStockTechnicals;
  lastPrice?: number;
}

export const StockTechnicals: React.FC<StockTechnicalsProps> = ({ technicals, lastPrice }) => {
  if (!technicals) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs">
        Technical indicator matrix is currently unavailable.
      </div>
    );
  }

  const formatNum = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Momentum & Oscillators */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Oscillators</span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">RSI (14)</span>
            <span
              className={`font-bold ${
                (technicals.rsi_14 ?? 50) >= 70
                  ? "text-rose-400"
                  : (technicals.rsi_14 ?? 50) <= 30
                  ? "text-emerald-400"
                  : "text-white"
              }`}
            >
              {formatNum(technicals.rsi_14)}
            </span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">MACD Histogram</span>
            <span
              className={`font-bold ${
                (technicals.macd_hist ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatNum(technicals.macd_hist)}
            </span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">ATR (14)</span>
            <span className="text-slate-200 font-bold">{formatNum(technicals.atr_14)}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">ATR Volatility %</span>
            <span className="text-slate-200 font-bold">{formatNum(technicals.atr_pct)}%</span>
          </div>
        </div>
      </div>

      {/* Moving Averages */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Moving Averages</span>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between py-0.5 border-b border-slate-800/50">
            <span className="text-slate-500">EMA 20</span>
            <span className="text-slate-200 font-bold">{formatNum(technicals.ema_20)}</span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-slate-800/50">
            <span className="text-slate-500">EMA 50</span>
            <span className="text-slate-200 font-bold">{formatNum(technicals.ema_50)}</span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-slate-800/50">
            <span className="text-slate-500">EMA 200</span>
            <span className="text-slate-200 font-bold">{formatNum(technicals.ema_200)}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">VWAP</span>
            <span className="text-cyan-400 font-bold">{formatNum(technicals.vwap)}</span>
          </div>
        </div>
      </div>

      {/* Support & Resistance Pivot Levels */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Floor Trader Pivots</span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Resistance 2 (R2)</span>
            <span className="text-rose-400 font-bold">{formatNum(technicals.resistance_2)}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Resistance 1 (R1)</span>
            <span className="text-rose-300 font-bold">{formatNum(technicals.resistance_1)}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Pivot Point (PP)</span>
            <span className="text-white font-bold">{formatNum(technicals.pivot_level)}</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Support 1 (S1)</span>
            <span className="text-emerald-300 font-bold">{formatNum(technicals.support_1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
