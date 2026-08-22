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
              const ceITM = row.ce?.moneyness === "ITM" || row.strike < spotPrice;
              const peITM = row.pe?.moneyness === "ITM" || row.strike > spotPrice;

              return (
                <tr
                  key={row.strike}
                  className={`hover:bg-[#142342]/70 transition-colors ${
                    isATM ? "bg-amber-500/10 font-semibold" : ""
                  }`}
                >
                  {/* CE Columns */}
                  <td className={`p-2 text-right text-slate-300 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {((row.ce?.open_interest || 0) / 1000).toFixed(1)}k
                  </td>
                  <td className={`p-2 text-right text-slate-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {(row.ce?.volume || 0).toLocaleString()}
                  </td>
                  <td className={`p-2 text-right text-slate-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {row.ce?.iv ? `${row.ce.iv.toFixed(1)}%` : "N/A"}
                  </td>
                  <td className={`p-2 text-right text-cyan-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {row.ce?.delta ? row.ce.delta.toFixed(2) : "N/A"}
                  </td>
                  <td className={`p-2 text-right text-rose-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {row.ce?.theta ? row.ce.theta.toFixed(1) : "N/A"}
                  </td>
                  <td className={`p-2 text-right text-purple-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {row.ce?.vega ? row.ce.vega.toFixed(1) : "N/A"}
                  </td>
                  <td className={`p-2 text-right text-[10px] text-slate-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {currency}{row.ce?.bid?.toFixed(1)} / {currency}{row.ce?.ask?.toFixed(1)}
                  </td>
                  <td
                    onClick={() => onSelectOption(row.strike, "CE", row.ce)}
                    className={`p-2 text-right font-bold text-white cursor-pointer hover:underline ${
                      ceITM ? "bg-rose-950/30 text-rose-300" : ""
                    }`}
                  >
                    {currency}{row.ce?.ltp?.toFixed(2)}
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
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onAddStrategyLeg?.(row.strike, "CE", "BUY", row.ce?.ltp || 0)}
                        className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px]"
                        title="Buy Call"
                      >
                        B
                      </button>
                      <button
                        onClick={() => onAddStrategyLeg?.(row.strike, "CE", "SELL", row.ce?.ltp || 0)}
                        className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[9px]"
                        title="Sell Call"
                      >
                        S
                      </button>
                    </div>
                  </td>

                  {/* Center Strike Column */}
                  <td
                    className={`p-2 text-center font-extrabold border-r border-slate-700 tracking-tight ${
                      isATM
                        ? "bg-amber-500 text-slate-950 shadow-md scale-105"
                        : "bg-[#0B111E] text-white"
                    }`}
                  >
                    {row.strike.toLocaleString()}
                  </td>

                  {/* PE Columns */}
                  <td className={`p-2 text-center ${peITM ? "bg-emerald-950/20" : ""}`}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onAddStrategyLeg?.(row.strike, "PE", "BUY", row.pe?.ltp || 0)}
                        className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px]"
                        title="Buy Put"
                      >
                        B
                      </button>
                      <button
                        onClick={() => onAddStrategyLeg?.(row.strike, "PE", "SELL", row.pe?.ltp || 0)}
                        className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[9px]"
                        title="Sell Put"
                      >
                        S
                      </button>
                    </div>
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
                    onClick={() => onSelectOption(row.strike, "PE", row.pe)}
                    className={`p-2 text-left font-bold text-white cursor-pointer hover:underline ${
                      peITM ? "bg-emerald-950/30 text-emerald-300" : ""
                    }`}
                  >
                    {currency}{row.pe?.ltp?.toFixed(2)}
                  </td>
                  <td className={`p-2 text-left text-[10px] text-slate-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {currency}{row.pe?.bid?.toFixed(1)} / {currency}{row.pe?.ask?.toFixed(1)}
                  </td>
                  <td className={`p-2 text-left text-purple-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {row.pe?.vega ? row.pe.vega.toFixed(1) : "N/A"}
                  </td>
                  <td className={`p-2 text-left text-rose-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {row.pe?.theta ? row.pe.theta.toFixed(1) : "N/A"}
                  </td>
                  <td className={`p-2 text-left text-cyan-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {row.pe?.delta ? row.pe.delta.toFixed(2) : "N/A"}
                  </td>
                  <td className={`p-2 text-left text-slate-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {row.pe?.iv ? `${row.pe.iv.toFixed(1)}%` : "N/A"}
                  </td>
                  <td className={`p-2 text-left text-slate-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {(row.pe?.volume || 0).toLocaleString()}
                  </td>
                  <td className={`p-2 text-left text-slate-300 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {((row.pe?.open_interest || 0) / 1000).toFixed(1)}k
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
