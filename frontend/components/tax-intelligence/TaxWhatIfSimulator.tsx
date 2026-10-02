"use client";

import React, { useState, memo } from "react";
import { formatMoney } from "@/lib/formatters";
import {
  Sparkles,
  Play,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  DollarSign,
  TrendingUp,
  Percent,
} from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";
import { classifyAssetClass } from "@/lib/taxEngineService";

interface TaxWhatIfSimulatorProps {
  currency: string;
}

export const TaxWhatIfSimulator = memo(function TaxWhatIfSimulator({
  currency,
}: TaxWhatIfSimulatorProps) {
  const { positions } = useGlobalData();

  const [selectedPosId, setSelectedPosId] = useState<string>("CUSTOM");
  const [symbol, setSymbol] = useState("NIFTY 24500 CE");
  const [quantity, setQuantity] = useState(50);
  const [costPrice, setCostPrice] = useState(140);
  const [targetPrice, setTargetPrice] = useState(195);
  const [daysInFuture, setDaysInFuture] = useState(45);
  const [taxRatePct, setTaxRatePct] = useState(20);

  const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
  const formatVal = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "—";
    return formatMoney(val, prefix);
  };

  const handleSelectPosition = (posId: string) => {
    setSelectedPosId(posId);
    if (posId === "CUSTOM") return;
    const found = positions.find((p) => (p.id || p.symbol) === posId);
    if (found) {
      setSymbol(found.symbol);
      setQuantity(Math.abs(found.quantity || 1));
      setCostPrice(found.entry_price || 100);
      setTargetPrice(found.current_price || found.entry_price || 100);
      const isCrypto = classifyAssetClass(found.symbol) === "crypto";
      setTaxRatePct(isCrypto ? 30 : 20);
    }
  };

  // Instant Mathematical Simulation Calculations
  const grossValue = quantity * targetPrice;
  const totalCost = quantity * costPrice;
  const simulatedPnl = grossValue - totalCost;
  const sttFees = Math.round(grossValue * 0.001 * 100) / 100;
  const isLtcgEligible = daysInFuture >= 365;
  const effectiveRate = isLtcgEligible ? 12.5 : taxRatePct;
  const simulatedTax = simulatedPnl > 0 ? Math.round(simulatedPnl * (effectiveRate / 100) * 100) / 100 : 0;
  const netResult = simulatedPnl - simulatedTax - sttFees;

  // Comparison: Sell Now vs Sell at LTCG
  const taxIfSoldToday = simulatedPnl > 0 ? Math.round(simulatedPnl * (taxRatePct / 100) * 100) / 100 : 0;
  const taxIfHeldLtcg = simulatedPnl > 0 ? Math.round(simulatedPnl * 0.125 * 100) / 100 : 0;
  const ltcgSavings = Math.max(0, taxIfSoldToday - taxIfHeldLtcg);

  return (
    <div className="space-y-5 font-mono">
      {/* ── Header ───────────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 font-sans tracking-wide">
              TAX WHAT-IF SCENARIO & HOLDING PERIOD SIMULATOR
            </h3>
            <p className="text-xs text-slate-400">
              Interactive sandbox modeling tax consequences, square-off timing, and LTCG tax transitions
            </p>
          </div>
        </div>

        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
          LIVE POSITION LINKED
        </span>
      </div>

      {/* ── Interactive Simulation Controls ───────────────────────────────────────── */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-200 font-sans">
              SELECT POSITION OR CONFIGURE SCENARIO
            </span>
          </div>

          {positions.length > 0 && (
            <select
              value={selectedPosId}
              onChange={(e) => handleSelectPosition(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="CUSTOM">Custom Scenario</option>
              {positions.map((p) => (
                <option key={p.id || p.symbol} value={p.id || p.symbol}>
                  {p.symbol} (Qty: {p.quantity} @ {formatVal(p.entry_price)})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="text-slate-400 text-[11px] block mb-1">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-400 text-[11px] block mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-400 text-[11px] block mb-1">Cost Basis / Unit</label>
            <input
              type="number"
              value={costPrice}
              onChange={(e) => setCostPrice(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-400 text-[11px] block mb-1">Target Sell Price</label>
            <input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-400 text-[11px] block mb-1">Holding Days (Slider: {daysInFuture}d)</label>
            <input
              type="range"
              min="0"
              max="400"
              step="5"
              value={daysInFuture}
              onChange={(e) => setDaysInFuture(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ── Visual Comparison Results ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Gross Outcome */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <span className="text-[11px] text-slate-400 block font-sans">Simulated Realized P&L</span>
          <div className={`text-xl font-bold ${simulatedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatVal(simulatedPnl)}
          </div>
          <div className="text-[10px] text-slate-500">
            Gross Value: {formatVal(grossValue)} | Cost: {formatVal(totalCost)}
          </div>
        </div>

        {/* Card 2: Estimated Tax */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-slate-400 font-sans">Tax Consequence</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {effectiveRate}% {isLtcgEligible ? "LTCG" : "STCG"}
            </span>
          </div>
          <div className="text-xl font-bold text-amber-400">
            {formatVal(simulatedTax)}
          </div>
          <div className="text-[10px] text-slate-500">
            STT/Turnover Tax: {formatVal(sttFees)}
          </div>
        </div>

        {/* Card 3: Net After Tax */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 bg-indigo-950/20 space-y-2">
          <span className="text-[11px] text-indigo-300 block font-sans font-bold">Net Post-Tax Profit</span>
          <div className="text-xl font-bold text-cyan-300">
            {formatVal(netResult)}
          </div>
          <div className="text-[10px] text-indigo-300">
            Effective Retention: {grossValue > 0 ? ((netResult / Math.max(1, simulatedPnl)) * 100).toFixed(1) : 0}% of gain
          </div>
        </div>
      </div>

      {/* ── Visual Bar: Sell Today vs Wait for LTCG ───────────────────────────────── */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200 font-sans">
              HOLDING DURATION TAX IMPACT COMPARISON
            </span>
          </div>
          <span className="text-xs font-bold text-emerald-400">
            Potential LTCG Alpha Savings: {formatVal(ltcgSavings)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Sell Today (STCG 20%):</span>
              <span className="text-amber-400 font-bold">{formatVal(taxIfSoldToday)}</span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
              <div style={{ width: "100%" }} className="h-full bg-amber-500 rounded-full" />
            </div>
            <div className="text-[10px] text-slate-500">Subject to standard short-term rates</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 bg-emerald-950/10 space-y-2">
            <div className="flex justify-between">
              <span className="text-emerald-300">Hold Past 365 Days (LTCG 12.5%):</span>
              <span className="text-emerald-400 font-bold">{formatVal(taxIfHeldLtcg)}</span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
              <div style={{ width: `${(12.5 / 20) * 100}%` }} className="h-full bg-emerald-400 rounded-full" />
            </div>
            <div className="text-[10px] text-emerald-400">Saves {formatVal(ltcgSavings)} in statutory tax</div>
          </div>
        </div>
      </div>
    </div>
  );
});
