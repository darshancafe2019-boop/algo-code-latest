"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Shield,
  Zap,
  Sliders,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Percent,
  Compass,
} from "lucide-react";
import {
  TradeAnalysisInstrument,
  UnderlyingMarketData,
  FuturesMarketData,
  OptionChainMacroStats,
  CallPutComparisonData,
} from "./TradeAnalysisTypes";

interface TradeAnalysisUnderlyingFuturesPanelProps {
  instrument: TradeAnalysisInstrument;
  underlyingData: UnderlyingMarketData;
  futuresData: FuturesMarketData;
  chainStats: OptionChainMacroStats;
  callPutComparison: CallPutComparisonData;
}

export function TradeAnalysisUnderlyingFuturesPanel({
  instrument,
  underlyingData,
  futuresData,
  chainStats,
  callPutComparison,
}: TradeAnalysisUnderlyingFuturesPanelProps) {
  const [showFullComparison, setShowFullComparison] = useState(false);
  const [showMacroChain, setShowMacroChain] = useState(false);

  const isCall = instrument.optionType === "CE";
  const strike = instrument.strike || 25000;
  const spotPrice = underlyingData.spotPrice || 24856;

  // Dynamic ATM / ITM / OTM calculation
  const calculatedMoneyness =
    Math.abs(spotPrice - strike) < 25
      ? "ATM"
      : isCall
      ? spotPrice > strike
        ? "ITM"
        : "OTM"
      : spotPrice < strike
      ? "ITM"
      : "OTM";

  return (
    <div className="space-y-3 font-mono text-xs select-none">
      {/* ── 1. Top 3-Card Multi-Asset Summary Bar ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* Card 1: UNDERLYING SPOT */}
        <div className="p-3 bg-[#081220] border border-[#12304A] rounded-xl space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              UNDERLYING SPOT
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-800">
              {underlyingData.symbol || instrument.underlying}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold text-white tracking-tight">
              ₹{underlyingData.spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span
              className={`text-[11px] font-bold flex items-center gap-0.5 ${
                underlyingData.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {underlyingData.changePct >= 0 ? "+" : ""}
              {underlyingData.changePct.toFixed(2)}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-[#12304A] text-[9px] text-slate-400">
            <div>
              <span className="block text-slate-500">Day High</span>
              <strong className="text-slate-200">₹{underlyingData.dayHigh.toLocaleString()}</strong>
            </div>
            <div>
              <span className="block text-slate-500">Day Low</span>
              <strong className="text-slate-200">₹{underlyingData.dayLow.toLocaleString()}</strong>
            </div>
            <div>
              <span className="block text-slate-500">VWAP</span>
              <strong className="text-amber-300">₹{(underlyingData.vwap || underlyingData.spotPrice).toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Card 2: FUTURES CONFIRMATION & BASIS */}
        <div className="p-3 bg-[#081220] border border-[#12304A] rounded-xl space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              FUTURES CONFIRMATION
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                futuresData.basis >= 0
                  ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                  : "bg-rose-950 text-rose-300 border-rose-800"
              }`}
            >
              {futuresData.regime}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold text-white tracking-tight">
              ₹{futuresData.ltp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] font-bold text-cyan-300">
              Basis: {futuresData.basis >= 0 ? "+" : ""}
              {futuresData.basis.toFixed(2)} pts
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-[#12304A] text-[9px] text-slate-400">
            <div>
              <span className="block text-slate-500">Futures OI</span>
              <strong className="text-slate-200">{(futuresData.openInterest / 1000).toFixed(1)}k</strong>
            </div>
            <div>
              <span className="block text-slate-500">OI Change</span>
              <strong className={futuresData.oiChangePct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {futuresData.oiChangePct >= 0 ? "+" : ""}
                {futuresData.oiChangePct.toFixed(1)}%
              </strong>
            </div>
            <div>
              <span className="block text-slate-500">Volume</span>
              <strong className="text-slate-200">{(futuresData.volume / 1000).toFixed(1)}k</strong>
            </div>
          </div>
        </div>

        {/* Card 3: OPTION CHAIN & MONEYNESS */}
        <div className="p-3 bg-[#081220] border border-[#12304A] rounded-xl space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              CHAIN PCR & MONEYNESS
            </span>
            <span
              className={`text-[9px] px-2 py-0.2 rounded font-extrabold border ${
                calculatedMoneyness === "ITM"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : calculatedMoneyness === "ATM"
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                  : "bg-purple-500/20 text-purple-300 border-purple-500/40"
              }`}
            >
              {calculatedMoneyness}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[10px] text-slate-400">Put/Call Ratio (PCR): </span>
              <strong
                className={`text-sm font-bold ${
                  chainStats.pcr > 1.0 ? "text-emerald-400" : chainStats.pcr < 0.8 ? "text-rose-400" : "text-slate-200"
                }`}
              >
                {chainStats.pcr.toFixed(2)}
              </strong>
            </div>
            <span className="text-[10px] font-bold text-amber-400">
              Max Pain: {chainStats.maxPainStrike}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-[#12304A] text-[9px] text-slate-400">
            <div>
              <span className="block text-slate-500">Major Resistance (Call OI)</span>
              <strong className="text-rose-300">{chainStats.highestCallOIStrike} CE</strong>
            </div>
            <div>
              <span className="block text-slate-500">Major Support (Put OI)</span>
              <strong className="text-emerald-300">{chainStats.highestPutOIStrike} PE</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. OI Interpretation & Buildup Classification Banner ── */}
      <div className="p-3 bg-[#06101B] border border-[#12304A] rounded-xl flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold">OI Interpretation:</span>
          <span
            className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold border ${chainStats.oiBuildup.color}`}
          >
            {chainStats.oiBuildup.type.replace("_", " ")}
          </span>
          <span className="text-[11px] text-slate-300 font-sans">{chainStats.oiBuildup.description}</span>
        </div>

        <button
          type="button"
          onClick={() => setShowFullComparison(!showFullComparison)}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1 font-bold"
        >
          <span>{showFullComparison ? "Hide Call/Put Matrix" : "View Call vs Put Comparison"}</span>
          {showFullComparison ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── 3. Call vs Put Comparison Matrix (Collapsible) ── */}
      {showFullComparison && (
        <div className="p-3.5 bg-[#0A1422] border border-[#12304A] rounded-xl space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] font-bold border-b border-[#12304A] pb-2">
            <span className="text-rose-400">CALL OPTION (CE)</span>
            <span className="text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
              STRIKE: {strike}
            </span>
            <span className="text-emerald-400">PUT OPTION (PE)</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px]">
            {/* CALL SIDE */}
            <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">LTP</span>
                <strong className="text-white text-xs">₹{callPutComparison.call.ltp.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Change</span>
                <strong
                  className={callPutComparison.call.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}
                >
                  {callPutComparison.call.changePct >= 0 ? "+" : ""}
                  {callPutComparison.call.changePct.toFixed(1)}%
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Open Interest</span>
                <strong className="text-slate-200">
                  {(callPutComparison.call.oi / 1000).toFixed(1)}k
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">IV</span>
                <strong className="text-purple-300">{(callPutComparison.call.iv * 100).toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Delta / Theta</span>
                <strong className="text-cyan-300">
                  {callPutComparison.call.delta.toFixed(2)} / {callPutComparison.call.theta.toFixed(1)}
                </strong>
              </div>
            </div>

            {/* CENTER METRIC LABELS */}
            <div className="p-2.5 rounded-lg bg-[#06101B] border border-[#12304A] space-y-1.5 text-center text-slate-400">
              <div className="text-slate-500 uppercase text-[9px]">Last Traded Price</div>
              <div className="text-slate-500 uppercase text-[9px]">24h Price Change</div>
              <div className="text-slate-500 uppercase text-[9px]">Total Open Interest</div>
              <div className="text-slate-500 uppercase text-[9px]">Implied Volatility</div>
              <div className="text-slate-500 uppercase text-[9px]">Analytical Greeks</div>
            </div>

            {/* PUT SIDE */}
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-1.5">
              <div className="flex justify-between">
                <strong className="text-white text-xs">₹{callPutComparison.put.ltp.toFixed(2)}</strong>
                <span className="text-slate-400">LTP</span>
              </div>
              <div className="flex justify-between">
                <strong
                  className={callPutComparison.put.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}
                >
                  {callPutComparison.put.changePct >= 0 ? "+" : ""}
                  {callPutComparison.put.changePct.toFixed(1)}%
                </strong>
                <span className="text-slate-400">Change</span>
              </div>
              <div className="flex justify-between">
                <strong className="text-slate-200">
                  {(callPutComparison.put.oi / 1000).toFixed(1)}k
                </strong>
                <span className="text-slate-400">Open Interest</span>
              </div>
              <div className="flex justify-between">
                <strong className="text-purple-300">{(callPutComparison.put.iv * 100).toFixed(1)}%</strong>
                <span className="text-slate-400">IV</span>
              </div>
              <div className="flex justify-between">
                <strong className="text-cyan-300">
                  {callPutComparison.put.delta.toFixed(2)} / {callPutComparison.put.theta.toFixed(1)}
                </strong>
                <span className="text-slate-400">Delta / Theta</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
