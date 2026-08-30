"use client";

import React from "react";
import { OptionStrikeRow, Moneyness } from "@/types/option-chain";
import { TrendingUp, TrendingDown, Target, Zap, Plus } from "lucide-react";

interface StrikeCenteredOptionLadderTableProps {
  strikes: OptionStrikeRow[];
  spotPrice: number;
  currency?: string;
  onSelectOption: (strike: number, type: "CE" | "PE", quote: any) => void;
  onAddStrategyLeg?: (strike: number, type: "CE" | "PE", action: "BUY" | "SELL", ltp: number) => void;
}

export function StrikeCenteredOptionLadderTable({
  strikes,
  spotPrice,
  currency = "₹",
  onSelectOption,
  onAddStrategyLeg,
}: StrikeCenteredOptionLadderTableProps) {
  if (!strikes || strikes.length === 0) {
    return (
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400 font-mono text-xs space-y-2">
        <div className="text-sm font-bold text-white">NO OPTION STRIKES DISCOVERED</div>
        <p>Connecting to Instrument Master to synchronize derivative strike contracts...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden font-mono text-[11px]">
      <div className="overflow-x-auto max-h-[700px]">
        <table className="w-full border-collapse select-none">
          {/* Main Headings */}
          <thead className="sticky top-0 z-20 bg-[#141E33] border-b border-slate-700 text-slate-300">
            {/* Top Level Category Banner */}
            <tr className="border-b border-slate-800 text-center font-bold uppercase tracking-wider text-[10px]">
              <th colSpan={10} className="py-1.5 bg-rose-950/30 text-rose-300 border-r border-slate-700">
                CALL OPTIONS (CE)
              </th>
              <th className="py-1.5 bg-slate-900 text-cyan-400 border-r border-slate-700 w-24">
                STRIKE
              </th>
              <th colSpan={10} className="py-1.5 bg-emerald-950/30 text-emerald-300">
                PUT OPTIONS (PE)
              </th>
            </tr>

            {/* Column Headers */}
            <tr className="text-[10px] text-slate-400">
              {/* Calls Side */}
              <th className="p-2 text-right">OI (k)</th>
              <th className="p-2 text-right">Volume</th>
              <th className="p-2 text-right">IV%</th>
              <th className="p-2 text-right text-cyan-400">Δ Delta</th>
              <th className="p-2 text-right text-rose-400">θ Theta</th>
              <th className="p-2 text-right text-purple-400">ν Vega</th>
              <th className="p-2 text-right">Bid / Ask</th>
              <th className="p-2 text-right font-bold text-white">LTP</th>
              <th className="p-2 text-center">Status</th>
              <th className="p-2 text-center border-r border-slate-700">Trade</th>

              {/* Center Strike Column */}
              <th className="p-2 text-center font-extrabold text-white bg-slate-900 border-r border-slate-700">
                STRIKE
              </th>

              {/* Puts Side */}
              <th className="p-2 text-center">Trade</th>
              <th className="p-2 text-center">Status</th>
              <th className="p-2 text-left font-bold text-white">LTP</th>
              <th className="p-2 text-left">Bid / Ask</th>
              <th className="p-2 text-left text-purple-400">ν Vega</th>
              <th className="p-2 text-left text-rose-400">θ Theta</th>
              <th className="p-2 text-left text-cyan-400">Δ Delta</th>
              <th className="p-2 text-left">IV%</th>
              <th className="p-2 text-left">Volume</th>
              <th className="p-2 text-left">OI (k)</th>
            </tr>
          </thead>
          {/* Table Body Rows */}
          <tbody className="divide-y divide-slate-800/60">
            {strikes.map((row) => {
              const isATM = row.is_atm;
              const ce = row.ce || (row as any).call;
              const pe = row.pe || (row as any).put;

              const ceITM = ce?.moneyness === "ITM" || (ce?.strike ? ce.strike < spotPrice : row.strike < spotPrice);
              const peITM = pe?.moneyness === "ITM" || (pe?.strike ? pe.strike > spotPrice : row.strike > spotPrice);

              const ceLtp = ce?.ltp ?? ce?.last_price ?? ce?.mark_price ?? 0;
              const peLtp = pe?.ltp ?? pe?.last_price ?? pe?.mark_price ?? 0;
              const ceBid = ce?.bid ?? ce?.best_bid ?? 0;
              const ceAsk = ce?.ask ?? ce?.best_ask ?? 0;
              const peBid = pe?.bid ?? pe?.best_bid ?? 0;
              const peAsk = pe?.ask ?? pe?.best_ask ?? 0;
              const ceOI = ce?.open_interest ?? ce?.oi ?? 0;
              const peOI = pe?.open_interest ?? pe?.oi ?? 0;
              const ceIV = ce?.iv ?? ce?.mark_iv ?? 0;
              const peIV = pe?.iv ?? pe?.mark_iv ?? 0;
              const ceVol = ce?.volume ?? ce?.volume_24h ?? 0;
              const peVol = pe?.volume ?? pe?.volume_24h ?? 0;

              return (
                <tr
                  key={row.strike}
                  className={`hover:bg-[#142342]/70 transition-colors ${
                    isATM ? "bg-amber-500/10 font-semibold" : ""
                  }`}
                >
                  {/* CE Columns */}
                  <td className={`p-2 text-right text-slate-300 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {ceOI >= 1000 ? `${(ceOI / 1000).toFixed(1)}k` : ceOI.toLocaleString()}
                  </td>
                  <td className={`p-2 text-right text-slate-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {ceVol.toLocaleString()}
                  </td>
                  <td className={`p-2 text-right text-slate-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {ceIV > 0 ? `${ceIV.toFixed(1)}%` : "N/A"}
                  </td>
                  <td className={`p-2 text-right text-cyan-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {ce?.delta !== undefined && ce?.delta !== null ? ce.delta.toFixed(2) : "N/A"}
                  </td>
                  <td className={`p-2 text-right text-rose-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {ce?.theta !== undefined && ce?.theta !== null ? ce.theta.toFixed(1) : "N/A"}
                  </td>
                  <td className={`p-2 text-right text-purple-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {ce?.vega !== undefined && ce?.vega !== null ? ce.vega.toFixed(1) : "N/A"}
                  </td>
                  <td className={`p-2 text-right text-[10px] text-slate-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {currency}{ceBid.toFixed(1)} / {currency}{ceAsk.toFixed(1)}
                  </td>
                  <td
                    onClick={() => onSelectOption(row.strike, "CE", ce)}
                    className={`p-2 text-right font-bold text-white cursor-pointer hover:underline ${
                      ceITM ? "bg-rose-950/30 text-rose-300" : ""
                    }`}
                  >
                    {currency}{ceLtp.toFixed(2)}
                  </td>
                  <td className={`p-2 text-center ${ceITM ? "bg-rose-950/20" : ""}`}>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        isATM
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : ceITM
                          ? "bg-rose-500/20 text-rose-300"
                          : "text-slate-500"
                      }`}
                    >
                      {isATM ? "ATM" : ceITM ? "ITM" : "OTM"}
                    </span>
                  </td>
                  <td className={`p-2 text-center border-r border-slate-700 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {onAddStrategyLeg && (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onAddStrategyLeg(row.strike, "CE", "BUY", ceLtp)}
                          className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[9px] font-bold"
                        >
                          B
                        </button>
                        <button
                          onClick={() => onAddStrategyLeg(row.strike, "CE", "SELL", ceLtp)}
                          className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[9px] font-bold"
                        >
                          S
                        </button>
                      </div>
                    )}
                  </td>

                  {/* STRIKE CENTER */}
                  <td
                    className={`p-2 text-center font-extrabold border-r border-slate-700 bg-slate-900 ${
                      isATM ? "text-amber-300 bg-amber-950/40" : "text-white"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {isATM && <Target className="w-3 h-3 text-amber-400 inline" />}
                      <span>{currency}{row.strike.toLocaleString()}</span>
                    </div>
                  </td>

                  {/* PE Columns */}
                  <td className={`p-2 text-center border-l border-slate-700 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {onAddStrategyLeg && (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onAddStrategyLeg(row.strike, "PE", "BUY", peLtp)}
                          className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[9px] font-bold"
                        >
                          B
                        </button>
                        <button
                          onClick={() => onAddStrategyLeg(row.strike, "PE", "SELL", peLtp)}
                          className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[9px] font-bold"
                        >
                          S
                        </button>
                      </div>
                    )}
                  </td>
                  <td className={`p-2 text-center ${peITM ? "bg-emerald-950/20" : ""}`}>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        isATM
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : peITM
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "text-slate-500"
                      }`}
                    >
                      {isATM ? "ATM" : peITM ? "ITM" : "OTM"}
                    </span>
                  </td>
                  <td
                    onClick={() => onSelectOption(row.strike, "PE", pe)}
                    className={`p-2 text-left font-bold text-white cursor-pointer hover:underline ${
                      peITM ? "bg-emerald-950/30 text-emerald-300" : ""
                    }`}
                  >
                    {currency}{peLtp.toFixed(2)}
                  </td>
                  <td className={`p-2 text-left text-[10px] text-slate-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {currency}{peBid.toFixed(1)} / {currency}{peAsk.toFixed(1)}
                  </td>
                  <td className={`p-2 text-left text-purple-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {pe?.vega !== undefined && pe?.vega !== null ? pe.vega.toFixed(1) : "N/A"}
                  </td>
                  <td className={`p-2 text-left text-rose-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {pe?.theta !== undefined && pe?.theta !== null ? pe.theta.toFixed(1) : "N/A"}
                  </td>
                  <td className={`p-2 text-left text-cyan-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {pe?.delta !== undefined && pe?.delta !== null ? pe.delta.toFixed(2) : "N/A"}
                  </td>
                  <td className={`p-2 text-left text-slate-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {peIV > 0 ? `${peIV.toFixed(1)}%` : "N/A"}
                  </td>
                  <td className={`p-2 text-left text-slate-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {peVol.toLocaleString()}
                  </td>
                  <td className={`p-2 text-left text-slate-300 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {peOI >= 1000 ? `${(peOI / 1000).toFixed(1)}k` : peOI.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
