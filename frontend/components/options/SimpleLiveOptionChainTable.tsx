"use client";

import React, { useMemo } from "react";
import { OptionStrikeRow, OptionContractQuote } from "@/types/option-chain";

interface SimpleLiveOptionChainTableProps {
  strikes: OptionStrikeRow[];
  spotPrice: number;
  currency?: string;
  sourceName?: string;
  brokerAccountAlias?: string;
  environment?: "PAPER" | "LIVE";
  dataFeed?: "REST" | "WEBSOCKET" | string;
  freshnessStatus?: string;
  dataAgeMs?: number;
  latencyMs?: number;
  filterMoneyness?: "ALL" | "ITM" | "ATM" | "OTM";
  showAdvancedColumns?: boolean;
  selectedStrike?: number | null;
  selectedOptionType?: "CE" | "PE" | null;
  onSelectOption: (strike: number, type: "CE" | "PE", quote: OptionContractQuote | null) => void;
  onQuickTrade?: (strike: number, type: "CE" | "PE", side: "BUY" | "SELL", ltp: number) => void;
}

function formatVolumeOrOI(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val) || val <= 0) return "—";
  if (val >= 10_000_000) return `${(val / 10_000_000).toFixed(2)}Cr`;
  if (val >= 100_000) return `${(val / 100_000).toFixed(1)}L`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toLocaleString();
}

function formatPrice(val: number | undefined | null, symbol: string = "₹"): string {
  if (val === undefined || val === null || isNaN(val) || val <= 0) return "—";
  return `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatGreek(val: number | undefined | null, decimals: number = 2): string {
  if (val === undefined || val === null || isNaN(val) || val === 0) return "—";
  return val.toFixed(decimals);
}

export const SimpleLiveOptionChainTable = React.memo(function SimpleLiveOptionChainTable({
  strikes,
  spotPrice,
  currency = "₹",
  sourceName = "Delta Exchange",
  brokerAccountAlias = "Primary Account",
  environment = "PAPER",
  dataFeed = "WEBSOCKET",
  freshnessStatus = "LIVE",
  dataAgeMs = 0,
  latencyMs = 16,
  filterMoneyness = "ALL",
  showAdvancedColumns = false,
  selectedStrike,
  selectedOptionType,
  onSelectOption,
  onQuickTrade,
}: SimpleLiveOptionChainTableProps) {
  // Filter strikes according to moneyness
  const filteredStrikes = useMemo(() => {
    if (!strikes || strikes.length === 0) return [];
    return strikes.filter((row) => {
      const ce = row.ce || (row as any).call;
      const pe = row.pe || (row as any).put;

      if (filterMoneyness === "ALL") return true;
      if (filterMoneyness === "ATM") return row.is_atm;
      if (filterMoneyness === "ITM") {
        return (
          ce?.moneyness === "ITM" ||
          pe?.moneyness === "ITM" ||
          (ce?.strike && ce.strike < spotPrice) ||
          (pe?.strike && pe.strike > spotPrice)
        );
      }
      if (filterMoneyness === "OTM") {
        return (
          ce?.moneyness === "OTM" ||
          pe?.moneyness === "OTM" ||
          (ce?.strike && ce.strike > spotPrice) ||
          (pe?.strike && pe.strike < spotPrice)
        );
      }
      return true;
    });
  }, [strikes, filterMoneyness, spotPrice]);

  if (!strikes || strikes.length === 0) {
    return (
      <div className="bg-[#0A1020] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 font-mono text-xs space-y-2">
        <div className="text-sm font-bold text-white">CONNECTING TO {sourceName.toUpperCase()} OPTION FEED...</div>
        <p className="text-slate-500">
          Synchronizing derivative contracts for {spotPrice > 0 ? `${currency}${spotPrice.toLocaleString()}` : "underlying"}...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#080E1C] border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs select-none">
      {/* Table Container with Controlled Scroll */}
      <div className="overflow-x-auto max-h-[640px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        <table className="w-full border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-20 bg-[#0C1428] border-b border-slate-700 shadow-sm">
            {/* Top Category Split */}
            <tr className="border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-center">
              <th
                colSpan={showAdvancedColumns ? 7 : 4}
                className="py-1.5 bg-rose-950/20 text-rose-300 border-r border-slate-800"
              >
                CALLS (CE)
              </th>
              <th className="py-1.5 bg-slate-900 text-cyan-400 border-r border-slate-800 w-28 text-center font-extrabold">
                STRIKE
              </th>
              <th
                colSpan={showAdvancedColumns ? 7 : 4}
                className="py-1.5 bg-emerald-950/20 text-emerald-300"
              >
                PUTS (PE)
              </th>
            </tr>

            {/* Individual Columns */}
            <tr className="text-[10px] text-slate-400 font-semibold border-b border-slate-800">
              {/* Call Columns */}
              <th className="p-2 text-right">OI</th>
              {showAdvancedColumns && <th className="p-2 text-right">Vol</th>}
              {showAdvancedColumns && <th className="p-2 text-right">IV%</th>}
              {showAdvancedColumns && <th className="p-2 text-right text-cyan-400">Δ Delta</th>}
              <th className="p-2 text-right text-slate-400">Bid</th>
              <th className="p-2 text-right text-slate-400">Ask</th>
              <th className="p-2 text-right font-bold text-white border-r border-slate-800">LTP</th>

              {/* Center Strike Column */}
              <th className="p-2 text-center font-black text-white bg-slate-900 border-r border-slate-800">
                STRIKE
              </th>

              {/* Put Columns */}
              <th className="p-2 text-left font-bold text-white">LTP</th>
              <th className="p-2 text-left text-slate-400">Bid</th>
              <th className="p-2 text-left text-slate-400 border-r border-slate-800/60">Ask</th>
              {showAdvancedColumns && <th className="p-2 text-left text-cyan-400">Δ Delta</th>}
              {showAdvancedColumns && <th className="p-2 text-left">IV%</th>}
              {showAdvancedColumns && <th className="p-2 text-left">Vol</th>}
              <th className="p-2 text-left">OI</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/50">
            {filteredStrikes.map((row) => {
              const isATM = Boolean(row.is_atm);
              const ce = (row.ce || (row as any).call || {}) as OptionContractQuote;
              const pe = (row.pe || (row as any).put || {}) as OptionContractQuote;

              const ceITM = ce?.moneyness === "ITM" || (ce?.strike ? ce.strike < spotPrice : row.strike < spotPrice);
              const peITM = pe?.moneyness === "ITM" || (pe?.strike ? pe.strike > spotPrice : row.strike > spotPrice);

              const ceLtp = ce?.ltp ?? ce?.markPrice ?? (ce as any)?.last_price ?? (ce as any)?.mark_price ?? null;
              const peLtp = pe?.ltp ?? pe?.markPrice ?? (pe as any)?.last_price ?? (pe as any)?.mark_price ?? null;

              const ceBid = ce?.bid ?? (ce as any)?.best_bid ?? null;
              const ceAsk = ce?.ask ?? (ce as any)?.best_ask ?? null;
              const peBid = pe?.bid ?? (pe as any)?.best_bid ?? null;
              const peAsk = pe?.ask ?? (pe as any)?.best_ask ?? null;

              const ceOI = ce?.open_interest ?? (ce as any)?.oi ?? null;
              const peOI = pe?.open_interest ?? (pe as any)?.oi ?? null;
              const ceVol = ce?.volume ?? null;
              const peVol = pe?.volume ?? null;
              const ceIV = ce?.iv ?? (ce as any)?.mark_iv ?? null;
              const peIV = pe?.iv ?? (pe as any)?.mark_iv ?? null;
              const ceDelta = ce?.delta ?? null;
              const peDelta = pe?.delta ?? null;

              const isCeSelected = selectedStrike === row.strike && selectedOptionType === "CE";
              const isPeSelected = selectedStrike === row.strike && selectedOptionType === "PE";

              return (
                <tr
                  key={`${sourceName}_${row.strike}`}
                  className={`transition-colors group ${
                    isATM
                      ? "bg-amber-500/15 font-semibold ring-1 ring-amber-500/30"
                      : "hover:bg-slate-800/40"
                  }`}
                >
                  {/* CALLS: OI */}
                  <td
                    className={`p-2 text-right text-slate-300 font-mono text-[11px] ${
                      ceITM ? "bg-rose-950/15" : ""
                    }`}
                  >
                    {formatVolumeOrOI(ceOI)}
                  </td>

                  {/* CALLS: Volume (Advanced) */}
                  {showAdvancedColumns && (
                    <td
                      className={`p-2 text-right text-slate-400 font-mono text-[11px] ${
                        ceITM ? "bg-rose-950/15" : ""
                      }`}
                    >
                      {formatVolumeOrOI(ceVol)}
                    </td>
                  )}

                  {/* CALLS: IV% (Advanced) */}
                  {showAdvancedColumns && (
                    <td
                      className={`p-2 text-right text-purple-300 font-mono text-[11px] ${
                        ceITM ? "bg-rose-950/15" : ""
                      }`}
                    >
                      {ceIV !== null && ceIV > 0 ? `${ceIV.toFixed(1)}%` : "—"}
                    </td>
                  )}

                  {/* CALLS: Delta (Advanced) */}
                  {showAdvancedColumns && (
                    <td
                      className={`p-2 text-right text-cyan-400 font-mono text-[11px] ${
                        ceITM ? "bg-rose-950/15" : ""
                      }`}
                    >
                      {formatGreek(ceDelta, 2)}
                    </td>
                  )}

                  {/* CALLS: Bid */}
                  <td className={`p-2 text-right text-slate-400 font-mono text-[10px] ${ceITM ? "bg-rose-950/15" : ""}`}>
                    {formatPrice(ceBid, currency)}
                  </td>

                  {/* CALLS: Ask */}
                  <td className={`p-2 text-right text-slate-400 font-mono text-[10px] ${ceITM ? "bg-rose-950/15" : ""}`}>
                    {formatPrice(ceAsk, currency)}
                  </td>

                  {/* CALLS: LTP (Clickable) */}
                  <td
                    onClick={() => onSelectOption(row.strike, "CE", ce)}
                    className={`p-2 text-right border-r border-slate-800 cursor-pointer transition ${
                      ceITM ? "bg-rose-950/20" : ""
                    } ${
                      isCeSelected
                        ? "bg-cyan-500/30 text-cyan-200 font-black ring-1 ring-cyan-400"
                        : "group-hover:text-cyan-300 text-white font-bold"
                    }`}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-[11px]">{formatPrice(ceLtp, currency)}</span>
                    </div>
                  </td>

                  {/* CENTER: Strike */}
                  <td
                    className={`p-2 text-center font-black border-r border-slate-800 ${
                      isATM
                        ? "bg-amber-500/30 text-amber-200"
                        : "bg-slate-900/90 text-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {isATM && (
                        <span className="text-[9px] px-1 rounded bg-amber-500 text-slate-950 font-black">
                          ATM
                        </span>
                      )}
                      <span>{row.strike.toLocaleString()}</span>
                    </div>
                  </td>

                  {/* PUTS: LTP (Clickable) */}
                  <td
                    onClick={() => onSelectOption(row.strike, "PE", pe)}
                    className={`p-2 text-left cursor-pointer transition ${
                      peITM ? "bg-emerald-950/20" : ""
                    } ${
                      isPeSelected
                        ? "bg-cyan-500/30 text-cyan-200 font-black ring-1 ring-cyan-400"
                        : "group-hover:text-cyan-300 text-white font-bold"
                    }`}
                  >
                    <div className="flex items-center justify-start gap-1.5">
                      <span className="text-[11px]">{formatPrice(peLtp, currency)}</span>
                    </div>
                  </td>

                  {/* PUTS: Bid */}
                  <td className={`p-2 text-left text-slate-400 font-mono text-[10px] ${peITM ? "bg-emerald-950/15" : ""}`}>
                    {formatPrice(peBid, currency)}
                  </td>

                  {/* PUTS: Ask */}
                  <td
                    className={`p-2 text-left text-slate-400 font-mono text-[10px] border-r border-slate-800/60 ${
                      peITM ? "bg-emerald-950/15" : ""
                    }`}
                  >
                    {formatPrice(peAsk, currency)}
                  </td>

                  {/* PUTS: Delta (Advanced) */}
                  {showAdvancedColumns && (
                    <td
                      className={`p-2 text-left text-cyan-400 font-mono text-[11px] ${
                        peITM ? "bg-emerald-950/15" : ""
                      }`}
                    >
                      {formatGreek(peDelta, 2)}
                    </td>
                  )}

                  {/* PUTS: IV% (Advanced) */}
                  {showAdvancedColumns && (
                    <td
                      className={`p-2 text-left text-purple-300 font-mono text-[11px] ${
                        peITM ? "bg-emerald-950/15" : ""
                      }`}
                    >
                      {peIV !== null && peIV > 0 ? `${peIV.toFixed(1)}%` : "—"}
                    </td>
                  )}

                  {/* PUTS: Volume (Advanced) */}
                  {showAdvancedColumns && (
                    <td
                      className={`p-2 text-left text-slate-400 font-mono text-[11px] ${
                        peITM ? "bg-emerald-950/15" : ""
                      }`}
                    >
                      {formatVolumeOrOI(peVol)}
                    </td>
                  )}

                  {/* PUTS: OI */}
                  <td
                    className={`p-2 text-left text-slate-300 font-mono text-[11px] ${
                      peITM ? "bg-emerald-950/15" : ""
                    }`}
                  >
                    {formatVolumeOrOI(peOI)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
