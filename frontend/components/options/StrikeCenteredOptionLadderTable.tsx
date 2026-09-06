"use client";

import React from "react";
import { OptionStrikeRow, Moneyness, OptionContractQuote } from "@/types/option-chain";
import { TrendingUp, TrendingDown, Target, Zap, Plus, Shield, Radio, Activity, HelpCircle } from "lucide-react";

interface StrikeCenteredOptionLadderTableProps {
  strikes: OptionStrikeRow[];
  spotPrice: number;
  currency?: string;
  sourceName?: string;
  brokerAccountAlias?: string;
  environment?: "PAPER" | "LIVE";
  dataFeed?: "REST" | "WEBSOCKET";
  freshnessStatus?: string;
  dataAgeMs?: number;
  latencyMs?: number;
  filterMoneyness?: "ALL" | "ITM" | "ATM" | "OTM";
  freshOnly?: boolean;
  onSelectOption: (strike: number, type: "CE" | "PE", quote: any) => void;
  onAddStrategyLeg?: (strike: number, type: "CE" | "PE", action: "BUY" | "SELL", ltp: number) => void;
}

function renderValueOrDash(val: any, formatFn?: (v: number) => string, tooltip?: string) {
  if (val === undefined || val === null || val === "" || (typeof val === "number" && isNaN(val))) {
    return (
      <span className="text-slate-500 cursor-help" title={tooltip || "Not provided by this source."}>
        —
      </span>
    );
  }
  if (typeof val === "number" && formatFn) {
    return formatFn(val);
  }
  return String(val);
}

export const StrikeCenteredOptionLadderTable = React.memo(function StrikeCenteredOptionLadderTable({
  strikes,
  spotPrice,
  currency = "₹",
  sourceName = "Dhan",
  brokerAccountAlias = "Primary Account",
  environment = "PAPER",
  dataFeed = "REST",
  freshnessStatus = "CONNECTED",
  dataAgeMs = 0,
  latencyMs = 24,
  filterMoneyness = "ALL",
  freshOnly = false,
  onSelectOption,
  onAddStrategyLeg,
}: StrikeCenteredOptionLadderTableProps) {
  const departmentName = React.useMemo(() => {
    const s = sourceName.toUpperCase();
    if (s.includes("DHAN")) return "Department 1: Dhan Options (Indian Derivatives)";
    if (s.includes("DELTA")) return "Department 2: Delta Exchange (Crypto Options)";
    return "Department 3: Paper Simulator (Analytical)";
  }, [sourceName]);

  if (!strikes || strikes.length === 0) {
    return (
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400 font-mono text-xs space-y-2">
        <div className="text-sm font-bold text-white">NO OPTION STRIKES AVAILABLE FOR {sourceName.toUpperCase()}</div>
        <p>Connecting to {sourceName} market data feed to synchronize derivative contracts...</p>
      </div>
    );
  }

  // Filter strikes according to moneyness & freshness
  const filteredStrikes = strikes.filter((row) => {
    const ce = row.ce || (row as any).call;
    const pe = row.pe || (row as any).put;

    if (freshOnly) {
      if (ce?.freshnessStatus === "STALE" || pe?.freshnessStatus === "STALE") {
        return false;
      }
    }

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

  const isStale = freshnessStatus === "STALE" || dataAgeMs > 8000;

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden font-mono text-[11px] mb-6">
      {/* Source Header Banner */}
      <div className="bg-[#141E33] border-b border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block animate-pulse" />
              {departmentName}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              Account: {brokerAccountAlias}
            </span>
          </div>

          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              environment === "LIVE"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            }`}
          >
            {environment === "LIVE" ? "LIVE" : "PAPER"}
          </span>

          <span className="text-slate-400 text-[10px] flex items-center gap-1">
            <Radio className="w-3 h-3 text-cyan-400" />
            Feed: <span className="font-bold text-slate-200">{dataFeed}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <span>Status:</span>
            <span
              className={`font-bold px-1.5 py-0.2 rounded ${
                isStale
                  ? "bg-amber-500/20 text-amber-300"
                  : freshnessStatus === "CONNECTED" || freshnessStatus === "LIVE"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-rose-500/20 text-rose-300"
              }`}
            >
              {freshnessStatus}
            </span>
          </div>

          <div className="hidden sm:inline">
            Data Age: <span className="text-slate-200 font-bold">{Math.round(dataAgeMs / 100) / 10}s</span>
          </div>

          <div>
            Latency: <span className="text-cyan-400 font-bold">{latencyMs}ms</span>
          </div>

          <div className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
            {filteredStrikes.length} Contracts
          </div>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[700px]">
        <table className="w-full border-collapse select-none">
          {/* Main Headings */}
          <thead className="sticky top-0 z-20 bg-[#101827] border-b border-slate-700 text-slate-300">
            {/* Top Level Category Banner */}
            <tr className="border-b border-slate-800 text-center font-bold uppercase tracking-wider text-[10px]">
              <th colSpan={10} className="py-1.5 bg-rose-950/30 text-rose-300 border-r border-slate-700">
                CALL OPTIONS (CE) — {sourceName.toUpperCase()}
              </th>
              <th className="py-1.5 bg-slate-900 text-cyan-400 border-r border-slate-700 w-28">
                STRIKE
              </th>
              <th colSpan={10} className="py-1.5 bg-emerald-950/30 text-emerald-300">
                PUT OPTIONS (PE) — {sourceName.toUpperCase()}
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
              <th className="p-2 text-center">Moneyness</th>
              <th className="p-2 text-center border-r border-slate-700">Trade</th>

              {/* Center Strike Column */}
              <th className="p-2 text-center font-extrabold text-white bg-slate-900 border-r border-slate-700">
                STRIKE
              </th>

              {/* Puts Side */}
              <th className="p-2 text-center">Trade</th>
              <th className="p-2 text-center">Moneyness</th>
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
            {filteredStrikes.map((row) => {
              const isATM = row.is_atm;
              const ce: OptionContractQuote = row.ce || (row as any).call;
              const pe: OptionContractQuote = row.pe || (row as any).put;

              const ceITM = ce?.moneyness === "ITM" || (ce?.strike ? ce.strike < spotPrice : row.strike < spotPrice);
              const peITM = pe?.moneyness === "ITM" || (pe?.strike ? pe.strike > spotPrice : row.strike > spotPrice);

              const ceLtp = ce?.ltp ?? ce?.markPrice ?? 0;
              const peLtp = pe?.ltp ?? pe?.markPrice ?? 0;
              const ceBid = ce?.bid ?? 0;
              const ceAsk = ce?.ask ?? 0;
              const peBid = pe?.bid ?? 0;
              const peAsk = pe?.ask ?? 0;
              const ceOI = ce?.open_interest ?? 0;
              const peOI = pe?.open_interest ?? 0;
              const ceIV = ce?.iv ?? 0;
              const peIV = pe?.iv ?? 0;
              const ceVol = ce?.volume ?? 0;
              const peVol = pe?.volume ?? 0;

              const isCeCalc = ce?.greeks_source === "CALCULATED";
              const isPeCalc = pe?.greeks_source === "CALCULATED";

              const rowKey = ce?.contractKey || pe?.contractKey || `${sourceName}_${row.strike}`;

              return (
                <tr
                  key={rowKey}
                  className={`hover:bg-[#142342]/70 transition-colors ${
                    isATM ? "bg-amber-500/10 font-semibold" : ""
                  }`}
                >
                  {/* CE Columns */}
                  <td className={`p-2 text-right text-slate-300 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {ceOI > 0 ? (ceOI >= 1000 ? `${(ceOI / 1000).toFixed(1)}k` : ceOI.toLocaleString()) : renderValueOrDash(null)}
                  </td>
                  <td className={`p-2 text-right text-slate-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {ceVol > 0 ? ceVol.toLocaleString() : renderValueOrDash(null)}
                  </td>
                  <td className={`p-2 text-right text-slate-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {ceIV > 0 ? (
                      <span className="flex items-center justify-end gap-0.5">
                        <span>{ceIV.toFixed(1)}%</span>
                        {isCeCalc && (
                          <span className="text-[8px] text-cyan-500/80 font-mono" title="Calculated via Black-Scholes">
                            (C)
                          </span>
                        )}
                      </span>
                    ) : (
                      renderValueOrDash(null)
                    )}
                  </td>
                  <td className={`p-2 text-right text-cyan-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {ce?.delta !== undefined && ce?.delta !== null ? (
                      <span title={isCeCalc ? "Derived Black-Scholes Greek (Calculated)" : "Broker Official Greek"}>
                        {ce.delta.toFixed(2)}
                      </span>
                    ) : (
                      renderValueOrDash(null)
                    )}
                  </td>
                  <td className={`p-2 text-right text-rose-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {ce?.theta !== undefined && ce?.theta !== null ? ce.theta.toFixed(1) : renderValueOrDash(null)}
                  </td>
                  <td className={`p-2 text-right text-purple-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {ce?.vega !== undefined && ce?.vega !== null ? ce.vega.toFixed(1) : renderValueOrDash(null)}
                  </td>
                  <td className={`p-2 text-right text-[10px] text-slate-400 ${ceITM ? "bg-rose-950/20" : ""}`}>
                    {ceBid > 0 || ceAsk > 0 ? (
                      `${currency}${ceBid.toFixed(1)} / ${currency}${ceAsk.toFixed(1)}`
                    ) : (
                      renderValueOrDash(null)
                    )}
                  </td>
                  <td
                    onClick={() => onSelectOption(row.strike, "CE", ce)}
                    className={`p-2 text-right font-bold text-white cursor-pointer hover:underline ${
                      ceITM ? "bg-rose-950/30 text-rose-300" : ""
                    }`}
                    title={`Click to inspect ${sourceName} CE contract ${ce?.instrumentId || ""}`}
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
                          title="Add Long Call Leg"
                        >
                          B
                        </button>
                        <button
                          onClick={() => onAddStrategyLeg(row.strike, "CE", "SELL", ceLtp)}
                          className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[9px] font-bold"
                          title="Add Short Call Leg"
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
                          title="Add Long Put Leg"
                        >
                          B
                        </button>
                        <button
                          onClick={() => onAddStrategyLeg(row.strike, "PE", "SELL", peLtp)}
                          className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[9px] font-bold"
                          title="Add Short Put Leg"
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
                    title={`Click to inspect ${sourceName} PE contract ${pe?.instrumentId || ""}`}
                  >
                    {currency}{peLtp.toFixed(2)}
                  </td>
                  <td className={`p-2 text-left text-[10px] text-slate-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {peBid > 0 || peAsk > 0 ? (
                      `${currency}${peBid.toFixed(1)} / ${currency}${peAsk.toFixed(1)}`
                    ) : (
                      renderValueOrDash(null)
                    )}
                  </td>
                  <td className={`p-2 text-left text-purple-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {pe?.vega !== undefined && pe?.vega !== null ? pe.vega.toFixed(1) : renderValueOrDash(null)}
                  </td>
                  <td className={`p-2 text-left text-rose-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {pe?.theta !== undefined && pe?.theta !== null ? pe.theta.toFixed(1) : renderValueOrDash(null)}
                  </td>
                  <td className={`p-2 text-left text-cyan-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {pe?.delta !== undefined && pe?.delta !== null ? (
                      <span title={isPeCalc ? "Derived Black-Scholes Greek (Calculated)" : "Broker Official Greek"}>
                        {pe.delta.toFixed(2)}
                      </span>
                    ) : (
                      renderValueOrDash(null)
                    )}
                  </td>
                  <td className={`p-2 text-left text-slate-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {peIV > 0 ? (
                      <span className="flex items-center gap-0.5">
                        <span>{peIV.toFixed(1)}%</span>
                        {isPeCalc && (
                          <span className="text-[8px] text-cyan-500/80 font-mono" title="Calculated via Black-Scholes">
                            (C)
                          </span>
                        )}
                      </span>
                    ) : (
                      renderValueOrDash(null)
                    )}
                  </td>
                  <td className={`p-2 text-left text-slate-400 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {peVol > 0 ? peVol.toLocaleString() : renderValueOrDash(null)}
                  </td>
                  <td className={`p-2 text-left text-slate-300 ${peITM ? "bg-emerald-950/20" : ""}`}>
                    {peOI > 0 ? (peOI >= 1000 ? `${(peOI / 1000).toFixed(1)}k` : peOI.toLocaleString()) : renderValueOrDash(null)}
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
