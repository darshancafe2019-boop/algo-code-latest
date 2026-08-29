"use client";

import React, { useState, useEffect } from "react";
import {
  PairAnalysisResult,
  PairOptionStructureResult,
  OptionSubstitutionType,
  OptionOverlayType,
} from "@/types/pairs-trading";
import {
  Shield,
  Layers,
  Activity,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Send,
  Zap,
  TrendingUp,
  Percent
} from "lucide-react";

export interface PairOptionsTabProps {
  selectedPair?: PairAnalysisResult | null;
  currencySymbol?: string;
  onExecutePairStructure?: (structure: PairOptionStructureResult) => void;
}

export function PairOptionsTab({
  selectedPair,
  currencySymbol = "₹",
  onExecutePairStructure,
}: PairOptionsTabProps) {
  const [structureType, setStructureType] = useState<string>("DEEP_ITM_CALL_PROXY");
  const [allocatedCapital, setAllocatedCapital] = useState<number>(25000);
  const [otmPct, setOtmPct] = useState<number>(0.03);
  const [dteDays, setDteDays] = useState<number>(30);
  const [result, setResult] = useState<PairOptionStructureResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const pairId = selectedPair?.pair_id || "HDFCBANK_ICICIBANK";

  const fetchStructure = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/options/pairs/option-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair_id: pairId,
          structure_type: structureType,
          allocated_capital: allocatedCapital,
          otm_pct: otmPct,
          dte_days: dteDays,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data.structure);
      }
    } catch (err) {
      console.error("Structure build failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [pairId, structureType, allocatedCapital, otmPct, dteDays]);

  useEffect(() => {
    fetchStructure();
  }, [fetchStructure]);

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Structure Type Ribbon & Configuration Bar */}
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-slate-200 uppercase text-xs">
              Pair Strategy with Options: Overlays &amp; Proxies
            </h3>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">Target Pair:</span>
            <span className="text-white font-extrabold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              {selectedPair ? `${selectedPair.symbol_a} / ${selectedPair.symbol_b}` : "HDFCBANK / ICICIBANK"}
            </span>
          </div>
        </div>

        {/* Structure Selector Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
          <span className="text-slate-400 text-[11px] mr-1">Structure:</span>

          {/* Overlays */}
          <button
            onClick={() => setStructureType("PROTECTIVE_PUT_LONG_LEG")}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              structureType === "PROTECTIVE_PUT_LONG_LEG"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Protective Put Overlay
          </button>

          <button
            onClick={() => setStructureType("PROTECTIVE_CALL_SHORT_LEG")}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              structureType === "PROTECTIVE_CALL_SHORT_LEG"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Protective Call Overlay
          </button>

          {/* Proxies */}
          <button
            onClick={() => setStructureType("DEEP_ITM_CALL_PROXY")}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              structureType === "DEEP_ITM_CALL_PROXY"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Deep-ITM Call Proxy (Long Leg)
          </button>

          <button
            onClick={() => setStructureType("DEEP_ITM_PUT_PROXY")}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              structureType === "DEEP_ITM_PUT_PROXY"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Deep-ITM Put Proxy (Short Leg)
          </button>

          <button
            onClick={() => setStructureType("BULL_CALL_SPREAD_PROXY")}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              structureType === "BULL_CALL_SPREAD_PROXY"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Bull Call Spread Proxy
          </button>

          <button
            onClick={() => setStructureType("DUAL_SPREAD_PROXIES")}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              structureType === "DUAL_SPREAD_PROXIES"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Dual Spread Proxies (Both Legs)
          </button>
        </div>
      </div>

      {/* Comparative Analysis & Legs Grid */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 5 Cols: Comparative Matrix & Strategy Legs */}
          <div className="lg:col-span-5 space-y-4">
            {/* Direct vs Option Comparison Card */}
            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <h4 className="text-white font-bold uppercase text-xs flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-cyan-400" />
                Underlying vs Option Comparison
              </h4>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Direct Underlying Capital</div>
                  <div className="font-extrabold text-sm text-slate-200">
                    {currencySymbol}{result.capital_required_direct.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-rose-400 font-bold">Undefined Tail Risk</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/30">
                  <div className="text-[10px] text-cyan-400">Option Structure Capital</div>
                  <div className="font-extrabold text-sm text-cyan-300">
                    {currencySymbol}{result.capital_required_options.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold">
                    {result.capital_savings_pct >= 0
                      ? `${result.capital_savings_pct}% Capital Saved`
                      : "Defined Tail Cap"}
                  </div>
                </div>
              </div>

              {/* Greek Summary */}
              <div className="grid grid-cols-4 gap-1.5 text-center pt-2 border-t border-slate-800">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400">&Delta; Delta</div>
                  <div className="font-bold text-white text-xs">{result.net_delta}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400">&Gamma; Gamma</div>
                  <div className="font-bold text-white text-xs">{result.net_gamma}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400">&Theta; Theta/day</div>
                  <div className="font-bold text-rose-400 text-xs">
                    {currencySymbol}{result.net_theta_daily}
                  </div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400">&Nu; Vega</div>
                  <div className="font-bold text-indigo-400 text-xs">{result.net_vega}</div>
                </div>
              </div>

              {/* Recommendation Notes */}
              {result.recommendation_notes?.length > 0 && (
                <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-300 text-[11px] space-y-1">
                  {result.recommendation_notes.map((note, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => onExecutePairStructure?.(result)}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Deploy Option-Enhanced Pair Trade</span>
              </button>
            </div>

            {/* Configured Legs List */}
            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
              <h4 className="text-slate-200 font-bold uppercase text-xs mb-2">
                Structure Legs ({result.legs?.length || 0})
              </h4>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {result.legs?.map((leg, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                          leg.action === "BUY"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-950 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {leg.action}
                      </span>
                      <span className="font-bold text-white">{leg.instrument_symbol}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-cyan-300 font-bold">
                        {currencySymbol}{leg.premium}
                      </div>
                      <div className="text-[10px] text-slate-400">Qty: {leg.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 7 Cols: Scenario Divergence Simulation Grid */}
          <div className="lg:col-span-7 bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl overflow-x-auto">
            <h4 className="text-white font-bold uppercase text-xs mb-3 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Pair Divergence Simulation: Underlying vs Option Structure
            </h4>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2 px-3">Divergence (%)</th>
                  <th className="py-2 px-3">Price {result.symbol_a}</th>
                  <th className="py-2 px-3">Price {result.symbol_b}</th>
                  <th className="py-2 px-3 text-right">Direct P&L</th>
                  <th className="py-2 px-3 text-right">Option Struct P&L</th>
                  <th className="py-2 px-3 text-right">Relative Benefit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {result.scenario_table?.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-900/60 transition">
                    <td className="py-2.5 px-3 text-slate-300 font-bold">
                      {row.underlying_shift_pct > 0
                        ? `+${row.underlying_shift_pct}%`
                        : `${row.underlying_shift_pct}%`}
                    </td>
                    <td className="py-2.5 px-3 text-white font-bold">
                      {currencySymbol}{row.simulated_price_a}
                    </td>
                    <td className="py-2.5 px-3 text-white font-bold">
                      {currencySymbol}{row.simulated_price_b}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        row.pnl_direct_underlying >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {row.pnl_direct_underlying >= 0 ? "+" : ""}
                      {currencySymbol}{row.pnl_direct_underlying.toLocaleString()}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-extrabold ${
                        row.pnl_option_structure >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {row.pnl_option_structure >= 0 ? "+" : ""}
                      {currencySymbol}{row.pnl_option_structure.toLocaleString()}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-extrabold ${
                        row.relative_benefit >= 0 ? "text-cyan-400" : "text-amber-400"
                      }`}
                    >
                      {row.relative_benefit >= 0 ? "+" : ""}
                      {currencySymbol}{row.relative_benefit.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
