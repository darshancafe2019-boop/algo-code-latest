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
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { OptionChainData, OptionStrikeRow } from "@/types/option-chain";

export function OptionsGreeksView() {
  const [underlying, setUnderlying] = useState("NIFTY");
  const [source, setSource] = useState("DHAN");
  const [strikeRange, setStrikeRange] = useState(15);

  const { data, isLoading, isFetching, refetch } = useQuery<OptionChainData>({
    queryKey: ["optionsGreeks", underlying, source, strikeRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        underlying,
        source,
        strike_count: strikeRange.toString(),
      });
      const res = await apiClient.get<any>(`/api/options/chain?${params.toString()}`);
      if (!res.ok || !res.data) throw new Error("Failed to load options Greeks");
      return res.data.data || res.data;
    },
    staleTime: 5000,
  });

  const strikes: OptionStrikeRow[] = data?.strikes || [];
  const spotPrice = data?.spot_price || 22500.0;
  const atmStrike = data?.atm_strike || 22500;
  const expiry = data?.selected_expiry || "Current Week";

  // Compute ATM IV and average call/put IVs
  const atmRow = strikes.find((s) => s.is_atm) || strikes[Math.floor(strikes.length / 2)];
  const atmIv = atmRow ? (atmRow.ce?.iv || atmRow.pe?.iv || 14.5) : 14.5;
  const avgCallIv = strikes.length > 0 ? strikes.reduce((acc, s) => acc + (s.ce?.iv || 0), 0) / strikes.length : 0;
  const avgPutIv = strikes.length > 0 ? strikes.reduce((acc, s) => acc + (s.pe?.iv || 0), 0) / strikes.length : 0;
  const ivSkew = Math.abs(avgPutIv - avgCallIv);

  return (
    <div className="space-y-5 text-slate-100 font-sans">
      {/* Top Controls Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
              OPTIONS GREEKS & VOLATILITY WORKSTATION
            </h1>
            <p className="text-xs text-slate-400">
              Analytical Black-Scholes solver & broker-sourced risk metrics
            </p>
          </div>
        </div>

        {/* Source & Underlying Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Underlying Filter */}
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
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-200 outline-none focus:border-sky-500"
          >
            <option value="NIFTY">NIFTY 50 (NSE)</option>
            <option value="BANKNIFTY">BANKNIFTY (NSE)</option>
            <option value="FINNIFTY">FINNIFTY (NSE)</option>
            <option value="RELIANCE">RELIANCE (NSE)</option>
            <option value="BTC">BTC (Crypto)</option>
            <option value="ETH">ETH (Crypto)</option>
            <option value="SOL">SOL (Crypto)</option>
          </select>

          {/* Source Dropdown */}
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-sky-400 outline-none focus:border-sky-500"
          >
            {["BTC", "ETH", "SOL"].includes(underlying) ? (
              <>
                <option value="DELTA_INDIA">Delta Exchange India (LIVE)</option>
                <option value="BINANCE">Binance European Options (LIVE)</option>
                <option value="PAPER_SIMULATOR">Paper Simulator (BS Solver)</option>
              </>
            ) : (
              <>
                <option value="DHAN">Dhan HQ API v2 (NSE)</option>
                <option value="UPSTOX">Upstox API v2/v3 (NSE)</option>
                <option value="PAPER_SIMULATOR">Paper Simulator (BS Solver)</option>
              </>
            )}
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center justify-center"
            title="Refresh Greeks"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-sky-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 4 Summary Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 font-mono">
          <span className="text-[10px] text-slate-400 tracking-wider uppercase block">UNDERLYING SPOT</span>
          <div className="text-xl font-bold text-slate-100 mt-1">₹{spotPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <span className="text-[10px] text-sky-400 mt-0.5 block">Expiry: {expiry}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 font-mono">
          <span className="text-[10px] text-slate-400 tracking-wider uppercase block">ATM IMPLIED VOLATILITY</span>
          <div className="text-xl font-bold text-sky-300 mt-1">{atmIv ? `${atmIv.toFixed(2)}%` : "—"}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Strike: {atmStrike}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 font-mono">
          <span className="text-[10px] text-slate-400 tracking-wider uppercase block">CALL / PUT IV SKEW</span>
          <div className="text-xl font-bold text-amber-300 mt-1">{ivSkew ? `${ivSkew.toFixed(2)}%` : "—"}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Call: {avgCallIv.toFixed(1)}% | Put: {avgPutIv.toFixed(1)}%</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 font-mono">
          <span className="text-[10px] text-slate-400 tracking-wider uppercase block">GREEKS SOURCING PROVENANCE</span>
          <div className="text-sm font-bold text-emerald-400 mt-1 truncate">
            {source === "DHAN" ? "Dhan Sourced" : source === "UPSTOX" ? "Upstox Sourced" : source === "DELTA_INDIA" ? "Delta Sourced" : "Quant.OS BS Solver"}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Formula: Black-Scholes European</span>
        </div>
      </div>

      {/* Greeks Matrix Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-400" />
            STRIKE-BY-STRIKE GREEKS LADDER (CALLS vs PUTS)
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Source: <span className="text-sky-400 font-bold">{source}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider">
                {/* Calls */}
                <th className="py-2.5 px-3 text-right text-emerald-400">Call IV</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Delta (Δ)</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Gamma (Γ)</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Theta (Θ)</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Vega (ν)</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">LTP</th>

                {/* Strike */}
                <th className="py-2.5 px-4 text-center bg-slate-900 text-sky-300 font-bold border-x border-slate-800">
                  STRIKE
                </th>

                {/* Puts */}
                <th className="py-2.5 px-3 text-left text-rose-400">LTP</th>
                <th className="py-2.5 px-3 text-left text-rose-400">Vega (ν)</th>
                <th className="py-2.5 px-3 text-left text-rose-400">Theta (Θ)</th>
                <th className="py-2.5 px-3 text-left text-rose-400">Gamma (Γ)</th>
                <th className="py-2.5 px-3 text-left text-rose-400">Delta (Δ)</th>
                <th className="py-2.5 px-3 text-left text-rose-400">Put IV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {strikes.map((r) => {
                const isAtm = r.is_atm;
                const isItmCall = r.strike < spotPrice;
                const isItmPut = r.strike > spotPrice;

                return (
                  <tr
                    key={r.strike}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isAtm ? "bg-sky-500/10 font-bold" : ""
                    }`}
                  >
                    {/* Call Greeks */}
                    <td className="py-2 px-3 text-right text-slate-300">{r.ce?.iv ? `${r.ce.iv.toFixed(1)}%` : "—"}</td>
                    <td className="py-2 px-3 text-right text-emerald-400 font-bold">{r.ce?.delta !== undefined ? r.ce.delta.toFixed(3) : "—"}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{r.ce?.gamma !== undefined ? r.ce.gamma.toFixed(5) : "—"}</td>
                    <td className="py-2 px-3 text-right text-rose-400/90">{r.ce?.theta !== undefined ? r.ce.theta.toFixed(2) : "—"}</td>
                    <td className="py-2 px-3 text-right text-sky-400/90">{r.ce?.vega !== undefined ? r.ce.vega.toFixed(2) : "—"}</td>
                    <td className={`py-2 px-3 text-right font-bold ${isItmCall ? "text-emerald-300" : "text-slate-300"}`}>
                      {r.ce?.ltp !== undefined && r.ce.ltp !== null ? `₹${r.ce.ltp.toFixed(2)}` : "—"}
                    </td>

                    {/* Strike Center */}
                    <td className="py-2 px-4 text-center bg-slate-900/90 font-bold text-slate-100 border-x border-slate-800">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{r.strike}</span>
                        {isAtm && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-sky-500/30 text-sky-300 border border-sky-400/40">
                            ATM
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Put Greeks */}
                    <td className={`py-2 px-3 text-left font-bold ${isItmPut ? "text-rose-300" : "text-slate-300"}`}>
                      {r.pe?.ltp !== undefined && r.pe.ltp !== null ? `₹${r.pe.ltp.toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2 px-3 text-left text-sky-400/90">{r.pe?.vega !== undefined ? r.pe.vega.toFixed(2) : "—"}</td>
                    <td className="py-2 px-3 text-left text-rose-400/90">{r.pe?.theta !== undefined ? r.pe.theta.toFixed(2) : "—"}</td>
                    <td className="py-2 px-3 text-left text-slate-400">{r.pe?.gamma !== undefined ? r.pe.gamma.toFixed(5) : "—"}</td>
                    <td className="py-2 px-3 text-left text-rose-400 font-bold">{r.pe?.delta !== undefined ? r.pe.delta.toFixed(3) : "—"}</td>
                    <td className="py-2 px-3 text-left text-slate-300">{r.pe?.iv ? `${r.pe.iv.toFixed(1)}%` : "—"}</td>
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
