"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Shield,
  Layers,
  RefreshCw,
  Zap,
  TrendingUp,
  Info,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";

export function OptionsFlowView() {
  const [underlying, setUnderlying] = useState("NIFTY");
  const [source, setSource] = useState("DHAN");

  const { data, isLoading, isFetching, refetch } = useQuery<any>({
    queryKey: ["optionsFlow", underlying, source],
    queryFn: async () => {
      const params = new URLSearchParams({
        underlying,
        provider: source,
      });
      const res = await apiClient.get<any>(`/api/options/flow?${params.toString()}`);
      if (!res.ok || !res.data) throw new Error("Failed to load options flow analytics");
      return res.data.data || res.data;
    },
    staleTime: 5000,
  });

  const strikes = data?.strikes || [];
  const spotPrice = data?.spot_price || 22500.0;
  const totalCallOi = data?.total_call_oi || 0;
  const totalPutOi = data?.total_put_oi || 0;
  const pcr = data?.pcr_oi || 1.0;
  const maxCallOiStrike = data?.max_call_oi_strike || 0;
  const maxPutOiStrike = data?.max_put_oi_strike || 0;
  const maxPain = data?.max_pain || 0;

  return (
    <div className="space-y-5 text-slate-100 font-sans">
      {/* Top Header Controls Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
              OPEN INTEREST & INSTITUTIONAL MARKET FLOW
            </h1>
            <p className="text-xs text-slate-400">
              Source-attributed Open Interest distribution, PCR, and strike concentration
            </p>
          </div>
        </div>

        {/* Source & Underlying Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={underlying}
            onChange={(e) => {
              const val = e.target.value;
              setUnderlying(val);
              if (["BTC", "ETH", "SOL"].includes(val)) {
                setSource("DELTA_INDIA");
              } else {
                setSource("DHAN");
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-200 outline-none focus:border-purple-500"
          >
            <option value="NIFTY">NIFTY 50 (NSE)</option>
            <option value="BANKNIFTY">BANKNIFTY (NSE)</option>
            <option value="FINNIFTY">FINNIFTY (NSE)</option>
            <option value="RELIANCE">RELIANCE (NSE)</option>
            <option value="BTC">BTC (Crypto)</option>
            <option value="ETH">ETH (Crypto)</option>
          </select>

          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-purple-400 outline-none focus:border-purple-500"
          >
            {["BTC", "ETH", "SOL"].includes(underlying) ? (
              <>
                <option value="DELTA_INDIA">Delta Exchange India</option>
                <option value="BINANCE">Binance Options</option>
              </>
            ) : (
              <>
                <option value="DHAN">Dhan HQ API v2</option>
                <option value="UPSTOX">Upstox API v2/v3</option>
              </>
            )}
          </select>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Flow Data"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-purple-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 4 Flow Telemetry Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase block">PUT / CALL RATIO (PCR)</span>
          <div className={`text-xl font-bold mt-1 ${pcr >= 1.0 ? "text-emerald-400" : "text-amber-400"}`}>
            {pcr ? pcr.toFixed(2) : "—"}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {pcr >= 1.2 ? "Bullish Positioning" : pcr <= 0.8 ? "Bearish Positioning" : "Neutral Range"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase block">HIGHEST CALL OI (RESISTANCE)</span>
          <div className="text-xl font-bold text-rose-400 mt-1">{maxCallOiStrike || "—"}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Major Ceiling Strike</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase block">HIGHEST PUT OI (SUPPORT)</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{maxPutOiStrike || "—"}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Major Floor Strike</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase block">MAX PAIN LEVEL</span>
          <div className="text-xl font-bold text-sky-400 mt-1">{maxPain || "—"}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Theoretical Expiry Anchor</span>
        </div>
      </div>

      {/* OI Distribution Ladder Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-400" />
            STRIKE OPEN INTEREST & VOLUME BREAKDOWN
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Total Calls: <span className="text-emerald-400 font-bold">{totalCallOi.toLocaleString()}</span> | Total Puts: <span className="text-rose-400 font-bold">{totalPutOi.toLocaleString()}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3 text-right text-emerald-400">Call OI</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Call OI Δ</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Call Vol</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">LTP</th>

                <th className="py-2.5 px-4 text-center bg-slate-900 text-purple-300 font-bold border-x border-slate-800">
                  STRIKE
                </th>

                <th className="py-2.5 px-3 text-left text-rose-400">LTP</th>
                <th className="py-2.5 px-3 text-left text-rose-400">Put Vol</th>
                <th className="py-2.5 px-3 text-left text-rose-400">Put OI Δ</th>
                <th className="py-2.5 px-3 text-left text-rose-400">Put OI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {strikes.map((r: any) => {
                const isMaxCall = r.strike === maxCallOiStrike;
                const isMaxPut = r.strike === maxPutOiStrike;

                return (
                  <tr
                    key={r.strike}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      r.is_atm ? "bg-purple-500/10 font-bold" : ""
                    }`}
                  >
                    {/* Call Metrics */}
                    <td className="py-2 px-3 text-right text-slate-200 font-bold">
                      <div className="flex items-center justify-end gap-1.5">
                        {isMaxCall && (
                          <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            RES
                          </span>
                        )}
                        <span>{r.call_oi ? r.call_oi.toLocaleString() : "—"}</span>
                      </div>
                    </td>
                    <td className={`py-2 px-3 text-right ${r.call_oi_change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {r.call_oi_change !== undefined ? `${r.call_oi_change >= 0 ? "+" : ""}${r.call_oi_change.toLocaleString()}` : "—"}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">{r.call_volume ? r.call_volume.toLocaleString() : "—"}</td>
                    <td className="py-2 px-3 text-right text-slate-300 font-bold">₹{r.call_ltp ? r.call_ltp.toFixed(2) : "—"}</td>

                    {/* Center Strike */}
                    <td className="py-2 px-4 text-center bg-slate-900/90 font-bold text-slate-100 border-x border-slate-800">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{r.strike}</span>
                        {r.is_atm && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-purple-500/30 text-purple-300 border border-purple-400/40">
                            ATM
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Put Metrics */}
                    <td className="py-2 px-3 text-left text-slate-300 font-bold">₹{r.put_ltp ? r.put_ltp.toFixed(2) : "—"}</td>
                    <td className="py-2 px-3 text-left text-slate-400">{r.put_volume ? r.put_volume.toLocaleString() : "—"}</td>
                    <td className={`py-2 px-3 text-left ${r.put_oi_change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {r.put_oi_change !== undefined ? `${r.put_oi_change >= 0 ? "+" : ""}${r.put_oi_change.toLocaleString()}` : "—"}
                    </td>
                    <td className="py-2 px-3 text-left text-slate-200 font-bold">
                      <div className="flex items-center justify-start gap-1.5">
                        <span>{r.put_oi ? r.put_oi.toLocaleString() : "—"}</span>
                        {isMaxPut && (
                          <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            SUP
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
