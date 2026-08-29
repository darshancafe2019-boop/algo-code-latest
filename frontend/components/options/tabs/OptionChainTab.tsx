"use client";

import React, { useState } from "react";
import { BarChart2, Plus, ArrowUpRight, ArrowDownRight, Layers, Zap } from "lucide-react";

export interface OptionChainTabProps {
  underlying: string;
  spotPrice: number;
  currencySymbol: string;
  onAddLegToBuilder?: (leg: any) => void;
}

export function OptionChainTab({
  underlying = "NIFTY",
  spotPrice = 24800,
  currencySymbol = "₹",
  onAddLegToBuilder,
}: OptionChainTabProps) {
  const [selectedExpiry, setSelectedExpiry] = useState("28-SEP-2026");

  const step = spotPrice > 10000 ? 50 : 10;
  const atm = Math.round(spotPrice / step) * step;
  const maxPain = atm;
  const pcr = 1.18;

  const offsets = [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8];

  const ladder = offsets.map((offset) => {
    const k = atm + offset * step;
    const isCallItm = k < spotPrice;
    const isPutItm = k > spotPrice;
    const isAtm = offset === 0;

    const callPrem = Math.max(10, (spotPrice - k > 0 ? spotPrice - k : 0) + spotPrice * 0.015 * Math.exp(-Math.abs(offset) * 0.25));
    const putPrem = Math.max(10, (k - spotPrice > 0 ? k - spotPrice : 0) + spotPrice * 0.015 * Math.exp(-Math.abs(offset) * 0.25));

    return {
      strike: k,
      isAtm,
      call: {
        isItm: isCallItm,
        ltp: Math.round(callPrem * 10) / 10,
        bid: Math.round(callPrem * 0.98 * 10) / 10,
        ask: Math.round(callPrem * 1.02 * 10) / 10,
        delta: Math.round((0.50 - offset * 0.06) * 100) / 100,
        gamma: 0.0012,
        theta: -14.2,
        iv: 14.8 + Math.abs(offset) * 0.3,
        oi: 125000 - Math.abs(offset) * 8000,
        volume: 48000 - Math.abs(offset) * 3500,
      },
      put: {
        isItm: isPutItm,
        ltp: Math.round(putPrem * 10) / 10,
        bid: Math.round(putPrem * 0.98 * 10) / 10,
        ask: Math.round(putPrem * 1.02 * 10) / 10,
        delta: Math.round((-0.50 - offset * 0.06) * 100) / 100,
        gamma: 0.0012,
        theta: -14.2,
        iv: 15.4 + Math.abs(offset) * 0.3,
        oi: 142000 - Math.abs(offset) * 9000,
        volume: 56000 - Math.abs(offset) * 4000,
      },
    };
  });

  return (
    <div className="space-y-4">
      {/* Chain Top Bar Metrics */}
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Underlying:</span>
            <span className="text-white font-extrabold text-sm">{underlying}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Spot:</span>
            <span className="text-cyan-400 font-extrabold text-sm">
              {currencySymbol}{spotPrice.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[11px]">Max Pain:</span>
            <span className="text-amber-400 font-extrabold">{currencySymbol}{maxPain}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[11px]">PCR (OI):</span>
            <span className="text-emerald-400 font-extrabold">{pcr}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Expiry:</span>
          <select
            value={selectedExpiry}
            onChange={(e) => setSelectedExpiry(e.target.value)}
            className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 font-bold"
          >
            <option value="28-SEP-2026">28-SEP-2026 (Monthly)</option>
            <option value="05-OCT-2026">05-OCT-2026 (Weekly)</option>
            <option value="12-OCT-2026">12-OCT-2026 (Weekly)</option>
            <option value="29-OCT-2026">29-OCT-2026 (Monthly)</option>
          </select>
        </div>
      </div>

      {/* Strike Ladder Table */}
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl font-mono text-xs overflow-x-auto">
        <table className="w-full text-center border-collapse">
          <thead>
            {/* Super Header */}
            <tr className="border-b border-slate-800 text-[11px] font-black">
              <th colSpan={6} className="py-1.5 px-2 bg-emerald-950/20 text-emerald-400 border-r border-slate-800">
                CALL OPTIONS (CE)
              </th>
              <th className="py-1.5 px-3 bg-slate-900 text-cyan-400 border-r border-slate-800">
                STRIKE
              </th>
              <th colSpan={6} className="py-1.5 px-2 bg-rose-950/20 text-rose-400">
                PUT OPTIONS (PE)
              </th>
            </tr>
            {/* Column Headers */}
            <tr className="border-b border-slate-800 text-[10px] text-slate-400">
              <th className="py-2 px-1 text-left">Action</th>
              <th className="py-2 px-2 text-right">OI</th>
              <th className="py-2 px-2 text-right">IV%</th>
              <th className="py-2 px-2 text-right">&Delta;</th>
              <th className="py-2 px-2 text-right">Bid</th>
              <th className="py-2 px-2 text-right border-r border-slate-800">Ask</th>

              <th className="py-2 px-3 bg-slate-900/60 text-white font-extrabold border-r border-slate-800">
                Strike
              </th>

              <th className="py-2 px-2 text-left">Bid</th>
              <th className="py-2 px-2 text-left">Ask</th>
              <th className="py-2 px-2 text-left">&Delta;</th>
              <th className="py-2 px-2 text-left">IV%</th>
              <th className="py-2 px-2 text-left">OI</th>
              <th className="py-2 px-1 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {ladder.map((row) => (
              <tr
                key={row.strike}
                className={`hover:bg-slate-900/80 transition ${
                  row.isAtm ? "bg-cyan-950/30 font-bold border-y border-cyan-500/40" : ""
                }`}
              >
                {/* Call Actions */}
                <td className="py-2 px-1 text-left">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        onAddLegToBuilder?.({
                          action: "BUY",
                          option_type: "CALL",
                          strike: row.strike,
                          expiry: selectedExpiry,
                          premium: row.call.ask,
                          quantity: 1,
                          delta: row.call.delta,
                        })
                      }
                      className="px-1.5 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]"
                      title="Buy Call"
                    >
                      +B
                    </button>
                    <button
                      onClick={() =>
                        onAddLegToBuilder?.({
                          action: "SELL",
                          option_type: "CALL",
                          strike: row.strike,
                          expiry: selectedExpiry,
                          premium: row.call.bid,
                          quantity: 1,
                          delta: row.call.delta,
                        })
                      }
                      className="px-1.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-400 font-bold text-[10px]"
                      title="Sell Call"
                    >
                      +S
                    </button>
                  </div>
                </td>
                <td className={`py-2 px-2 text-right ${row.call.isItm ? "bg-emerald-950/15 text-slate-200" : "text-slate-400"}`}>
                  {row.call.oi.toLocaleString()}
                </td>
                <td className={`py-2 px-2 text-right ${row.call.isItm ? "bg-emerald-950/15 text-slate-300" : "text-slate-400"}`}>
                  {row.call.iv}%
                </td>
                <td className={`py-2 px-2 text-right ${row.call.isItm ? "bg-emerald-950/15 text-cyan-300" : "text-slate-400"}`}>
                  {row.call.delta}
                </td>
                <td className={`py-2 px-2 text-right ${row.call.isItm ? "bg-emerald-950/15" : ""} text-emerald-400 font-bold`}>
                  {row.call.bid}
                </td>
                <td className={`py-2 px-2 text-right border-r border-slate-800 ${row.call.isItm ? "bg-emerald-950/15" : ""} text-rose-400 font-bold`}>
                  {row.call.ask}
                </td>

                {/* Strike Center Column */}
                <td className="py-2 px-3 bg-slate-900 font-extrabold text-white border-r border-slate-800">
                  {row.isAtm && <span className="text-cyan-400 mr-1 text-[10px]">ATM</span>}
                  {row.strike}
                </td>

                {/* Put Columns */}
                <td className={`py-2 px-2 text-left ${row.put.isItm ? "bg-rose-950/15" : ""} text-emerald-400 font-bold`}>
                  {row.put.bid}
                </td>
                <td className={`py-2 px-2 text-left ${row.put.isItm ? "bg-rose-950/15" : ""} text-rose-400 font-bold`}>
                  {row.put.ask}
                </td>
                <td className={`py-2 px-2 text-left ${row.put.isItm ? "bg-rose-950/15 text-cyan-300" : "text-slate-400"}`}>
                  {row.put.delta}
                </td>
                <td className={`py-2 px-2 text-left ${row.put.isItm ? "bg-rose-950/15 text-slate-300" : "text-slate-400"}`}>
                  {row.put.iv}%
                </td>
                <td className={`py-2 px-2 text-left ${row.put.isItm ? "bg-rose-950/15 text-slate-200" : "text-slate-400"}`}>
                  {row.put.oi.toLocaleString()}
                </td>
                <td className="py-2 px-1 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() =>
                        onAddLegToBuilder?.({
                          action: "BUY",
                          option_type: "PUT",
                          strike: row.strike,
                          expiry: selectedExpiry,
                          premium: row.put.ask,
                          quantity: 1,
                          delta: row.put.delta,
                        })
                      }
                      className="px-1.5 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]"
                      title="Buy Put"
                    >
                      +B
                    </button>
                    <button
                      onClick={() =>
                        onAddLegToBuilder?.({
                          action: "SELL",
                          option_type: "PUT",
                          strike: row.strike,
                          expiry: selectedExpiry,
                          premium: row.put.bid,
                          quantity: 1,
                          delta: row.put.delta,
                        })
                      }
                      className="px-1.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-400 font-bold text-[10px]"
                      title="Sell Put"
                    >
                      +S
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
