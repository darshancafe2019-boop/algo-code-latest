"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Activity,
  Zap,
  Layers,
  ChevronRight,
  Info,
  Sparkles,
} from "lucide-react";
import {
  ConfirmationMatrixItem,
  TradeSetupAnalysis,
  TradeAnalysisInstrument,
} from "./TradeAnalysisTypes";

interface TradeAnalysisConfirmationMatrixProps {
  instrument: TradeAnalysisInstrument;
  setupAnalysis: TradeSetupAnalysis;
}

export function TradeAnalysisConfirmationMatrix({
  instrument,
  setupAnalysis,
}: TradeAnalysisConfirmationMatrixProps) {
  const [selectedItem, setSelectedItem] = useState<ConfirmationMatrixItem | null>(null);

  const isBullish = setupAnalysis.state === "BULLISH";
  const isBearish = setupAnalysis.state === "BEARISH";

  return (
    <div className="p-4 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-xl space-y-3 font-mono text-xs select-none">
      {/* ── 1. Header with Transparent Score ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#12304A] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">Institutional Trade Confirmation Matrix</h4>
            <p className="text-[10px] text-slate-400 font-sans">
              9-Factor objective multi-asset quantitative alignment check
            </p>
          </div>
        </div>

        {/* State Badge & Score */}
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1 rounded-xl font-extrabold text-xs border flex items-center gap-1.5 ${
              isBullish
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20"
                : isBearish
                ? "bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/20"
                : "bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-sm"
            }`}
          >
            <span>SETUP: {setupAnalysis.state}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-[#06101B] border border-[#12304A] text-[11px] font-bold text-white">
            Score: <span className="text-cyan-300">{setupAnalysis.score}</span> / {setupAnalysis.totalCriteria} (
            {setupAnalysis.confidencePct}%)
          </div>
        </div>
      </div>

      {/* ── 2. 9-Item Matrix Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {setupAnalysis.confirmations.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
            className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
              item.passed
                ? "bg-[#06101B] border-emerald-500/30 hover:border-emerald-500/60"
                : "bg-[#06101B]/50 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {item.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
              )}
              <div className="min-w-0">
                <span className="text-white font-bold text-[11px] block truncate">{item.title}</span>
                <span className="text-[9px] text-slate-400 block truncate font-sans">
                  {item.valueDisplay}
                </span>
              </div>
            </div>

            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                item.passed
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  : "bg-slate-900 text-slate-500 border border-slate-800"
              }`}
            >
              {item.passed ? "PASS" : "WAIT"}
            </span>
          </div>
        ))}
      </div>

      {/* ── 3. Selected Item Deep-Dive Evidence Card (Collapsible) ── */}
      {selectedItem && (
        <div className="p-3 bg-[#081220] border border-cyan-500/40 rounded-xl space-y-1.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>Factor Evidence: {selectedItem.title}</span>
            </span>
            <span className="text-slate-400 text-[10px]">Target: {selectedItem.targetSeries}</span>
          </div>
          <p className="text-[11px] text-slate-200 font-sans">{selectedItem.description}</p>
          <div className="p-2 rounded-lg bg-[#06101B] border border-[#12304A] text-[10px] text-slate-300">
            <span className="text-slate-500 block text-[9px] uppercase">Telemetry Grounding:</span>
            <strong className="text-cyan-200">{selectedItem.evidence}</strong>
          </div>
        </div>
      )}

      {/* ── 4. Objective Summary Note ── */}
      <div className="p-2.5 rounded-xl bg-[#06101B] border border-[#12304A] flex items-center justify-between text-[10px] text-slate-400 font-sans">
        <span>{setupAnalysis.summary}</span>
        <span className="text-slate-500 text-[9px] font-mono">Objective Model • No Predictions</span>
      </div>
    </div>
  );
}
