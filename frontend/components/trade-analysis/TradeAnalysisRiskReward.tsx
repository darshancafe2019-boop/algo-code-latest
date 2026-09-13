"use client";

import React, { useMemo } from "react";
import {
  ShieldAlert,
  Target,
  Scale,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Percent,
  DollarSign,
} from "lucide-react";
import { RiskRewardCalculation } from "./TradeAnalysisTypes";
import { cn } from "@/lib/utils";

interface TradeAnalysisRiskRewardProps {
  side: "BUY" | "SELL";
  currentLtp: number;
  lotSize: number;
  lots: number;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  onChangeEntry: (val: number) => void;
  onChangeStopLoss: (val: number) => void;
  onChangeTarget: (val: number) => void;
  isLiveMarketFresh: boolean;
}

export function TradeAnalysisRiskReward({
  side,
  currentLtp,
  lotSize,
  lots,
  entryPrice,
  stopLoss,
  targetPrice,
  onChangeEntry,
  onChangeStopLoss,
  onChangeTarget,
  isLiveMarketFresh,
}: TradeAnalysisRiskRewardProps) {
  const calculation: RiskRewardCalculation = useMemo(() => {
    const totalQuantity = Math.max(1, lots * (lotSize || 1));
    const effectiveEntry = entryPrice > 0 ? entryPrice : currentLtp || 100;

    let riskPerUnit = 0;
    let rewardPerUnit = 0;
    let isStopLossValid = false;
    let isTargetValid = false;

    if (side === "BUY") {
      riskPerUnit = Math.max(0, effectiveEntry - stopLoss);
      rewardPerUnit = Math.max(0, targetPrice - effectiveEntry);
      isStopLossValid = stopLoss > 0 && stopLoss < effectiveEntry;
      isTargetValid = targetPrice > effectiveEntry;
    } else {
      riskPerUnit = Math.max(0, stopLoss - effectiveEntry);
      rewardPerUnit = Math.max(0, effectiveEntry - targetPrice);
      isStopLossValid = stopLoss > effectiveEntry;
      isTargetValid = targetPrice > 0 && targetPrice < effectiveEntry;
    }

    const riskRewardRatio =
      riskPerUnit > 0 ? Number((rewardPerUnit / riskPerUnit).toFixed(2)) : 0;
    const totalEstimatedPremium = totalQuantity * effectiveEntry;
    const totalCapitalAtRisk = totalQuantity * riskPerUnit;
    const totalPotentialProfit = totalQuantity * rewardPerUnit;

    return {
      entryPrice: effectiveEntry,
      stopLoss,
      targetPrice,
      riskPerUnit,
      rewardPerUnit,
      riskRewardRatio,
      lotSize: lotSize || 1,
      lots,
      totalQuantity,
      totalEstimatedPremium,
      totalCapitalAtRisk,
      totalPotentialProfit,
      isStopLossValid,
      isTargetValid,
    };
  }, [side, currentLtp, lotSize, lots, entryPrice, stopLoss, targetPrice]);

  // Pre-Trade Checklist Items
  const checklist = useMemo(() => {
    return [
      { id: "live_data", label: "Live data available & connected", passed: currentLtp > 0 },
      { id: "freshness", label: "Market data fresh (latency < 2s)", passed: isLiveMarketFresh },
      { id: "quantity", label: `Valid quantity (${calculation.totalQuantity} units / ${lots} lot${lots > 1 ? "s" : ""})`, passed: calculation.totalQuantity > 0 },
      { id: "stop_loss", label: `Stop Loss defined (${calculation.isStopLossValid ? `₹${stopLoss}` : "Invalid / Missing"})`, passed: calculation.isStopLossValid },
      { id: "target", label: `Target defined (${calculation.isTargetValid ? `₹${targetPrice}` : "Invalid / Missing"})`, passed: calculation.isTargetValid },
      { id: "risk_reward", label: `Risk/Reward Ratio (R:R 1:${calculation.riskRewardRatio})`, passed: calculation.riskRewardRatio >= 1.2 },
    ];
  }, [currentLtp, isLiveMarketFresh, calculation, stopLoss, targetPrice, lots]);

  const allPassed = checklist.every((c) => c.passed);

  // Quick percentage presets for SL and TP
  const applySlPct = (pct: number) => {
    const base = calculation.entryPrice;
    const newSl = side === "BUY" ? Number((base * (1 - pct / 100)).toFixed(2)) : Number((base * (1 + pct / 100)).toFixed(2));
    onChangeStopLoss(newSl);
  };

  const applyTpPct = (pct: number) => {
    const base = calculation.entryPrice;
    const newTp = side === "BUY" ? Number((base * (1 + pct / 100)).toFixed(2)) : Number((base * (1 - pct / 100)).toFixed(2));
    onChangeTarget(newTp);
  };

  return (
    <div className="p-4 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-xl space-y-4 font-mono text-xs select-none">
      {/* ── 1. Header ── */}
      <div className="flex items-center justify-between border-b border-[#12304A] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">Option Risk / Reward Engine</h4>
            <p className="text-[10px] text-slate-400 font-sans">
              Lot-size aware capital protection and target profit modeling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 uppercase">Calculated R:R:</span>
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-lg font-extrabold text-xs border",
              calculation.riskRewardRatio >= 2.0
                ? "bg-emerald-950 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20"
                : calculation.riskRewardRatio >= 1.2
                ? "bg-cyan-950 text-cyan-300 border-cyan-500/40"
                : "bg-rose-950 text-rose-300 border-rose-500/40"
            )}
          >
            1 : {calculation.riskRewardRatio}
          </span>
        </div>
      </div>

      {/* ── 2. Inputs: Entry, Stop Loss, Target ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Entry Price Input */}
        <div className="p-3 bg-[#06101B] border border-[#12304A] rounded-xl space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>Planned Entry (₹)</span>
            <button
              type="button"
              onClick={() => onChangeEntry(currentLtp)}
              className="text-cyan-400 hover:underline"
            >
              Use LTP
            </button>
          </div>
          <input
            type="number"
            step="0.05"
            value={entryPrice}
            onChange={(e) => onChangeEntry(parseFloat(e.target.value) || 0)}
            className="w-full bg-[#0A1422] border border-[#12304A] focus:border-cyan-500 rounded-lg p-2 text-white font-bold text-sm outline-none"
          />
        </div>

        {/* Stop Loss Input */}
        <div className="p-3 bg-[#06101B] border border-[#12304A] rounded-xl space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span className="text-rose-400 font-bold">Stop Loss (₹)</span>
            <div className="flex gap-1 text-[9px]">
              {[10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applySlPct(pct)}
                  className="px-1 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  -{pct}%
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            step="0.05"
            value={stopLoss}
            onChange={(e) => onChangeStopLoss(parseFloat(e.target.value) || 0)}
            className="w-full bg-[#0A1422] border border-[#12304A] focus:border-rose-500 rounded-lg p-2 text-rose-300 font-bold text-sm outline-none"
          />
        </div>

        {/* Target Price Input */}
        <div className="p-3 bg-[#06101B] border border-[#12304A] rounded-xl space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span className="text-emerald-400 font-bold">Target Profit (₹)</span>
            <div className="flex gap-1 text-[9px]">
              {[20, 30, 50].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyTpPct(pct)}
                  className="px-1 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            step="0.05"
            value={targetPrice}
            onChange={(e) => onChangeTarget(parseFloat(e.target.value) || 0)}
            className="w-full bg-[#0A1422] border border-[#12304A] focus:border-emerald-500 rounded-lg p-2 text-emerald-300 font-bold text-sm outline-none"
          />
        </div>
      </div>

      {/* ── 3. Option-Specific Financial Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
        <div className="p-2.5 rounded-xl bg-[#06101B] border border-[#12304A]">
          <span className="text-slate-500 block">Total Premium Value</span>
          <strong className="text-white text-xs block truncate mt-0.5">
            ₹{calculation.totalEstimatedPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
        </div>

        <div className="p-2.5 rounded-xl bg-[#06101B] border border-[#12304A]">
          <span className="text-slate-500 block">Risk Per Unit</span>
          <strong className="text-rose-400 text-xs block truncate mt-0.5">
            ₹{calculation.riskPerUnit.toFixed(2)}
          </strong>
        </div>

        <div className="p-2.5 rounded-xl bg-[#06101B] border border-[#12304A]">
          <span className="text-slate-500 block">Max Planned Loss</span>
          <strong className="text-rose-400 text-xs block truncate mt-0.5">
            -₹{calculation.totalCapitalAtRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
        </div>

        <div className="p-2.5 rounded-xl bg-[#06101B] border border-[#12304A]">
          <span className="text-slate-500 block">Potential Reward</span>
          <strong className="text-emerald-400 text-xs block truncate mt-0.5">
            +₹{calculation.totalPotentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
        </div>
      </div>

      {/* ── 4. Pre-Flight Checklist ── */}
      <div className="p-3 bg-[#081220] border border-[#12304A] rounded-xl space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-slate-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pre-Execution Checklist</span>
          </span>
          <span
            className={cn(
              "px-2 py-0.2 rounded font-bold text-[10px]",
              allPassed ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-amber-950 text-amber-300 border border-amber-800"
            )}
          >
            {allPassed ? "READY FOR REVIEW" : "REVIEW REQUIREMENTS"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className={item.passed ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {item.passed ? "[✓]" : "[✕]"}
              </span>
              <span className={item.passed ? "text-slate-300" : "text-slate-500"}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
