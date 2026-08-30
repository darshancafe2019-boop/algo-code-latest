"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Layers, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { NormalizedOptionChainResponse } from "@/lib/upstox/types";
import { normalizeExpiriesList } from "@/lib/expiry-utils";
import { apiClient } from "@/lib/apiClient";

const UNDERLYINGS = [
  { key: "NSE_INDEX|Nifty 50", symbol: "NIFTY", name: "Nifty 50" },
  { key: "NSE_INDEX|Nifty Bank", symbol: "BANKNIFTY", name: "Bank Nifty" },
  { key: "NSE_INDEX|Nifty Fin Service", symbol: "FINNIFTY", name: "Fin Nifty" },
];

export function UpstoxOptionChainViewer() {
  const [selectedUnderlying, setSelectedUnderlying] = useState("NIFTY");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");

  const { data, isLoading, isError, error, refetch } = useQuery<NormalizedOptionChainResponse>({
    queryKey: ["upstoxOptionChain", selectedUnderlying, selectedExpiry],
    queryFn: async () => {
      const expiryQuery = selectedExpiry ? `&expiry=${encodeURIComponent(selectedExpiry)}` : "";
      const res = await apiClient.get<any>(`/api/upstox/options/chain?underlying=${encodeURIComponent(selectedUnderlying)}${expiryQuery}`, { timeoutMs: 6000 });
      if (!res.ok || !res.data) {
        throw new Error(res.error?.message || "Failed to fetch option chain");
      }
      return res.data.data || res.data;
    },
    refetchInterval: () => (apiClient.isOffline() ? false : 6000),
    staleTime: 4000,
    retry: 1,
  });

  const normalizedExpiries = React.useMemo(() => {
    const availableExpiries = data?.availableExpiries || [];
    return normalizeExpiriesList(availableExpiries, selectedUnderlying);
  }, [data?.availableExpiries, selectedUnderlying]);
  const strikes = data?.strikes || [];
  const currentExpiry = data?.expiry || selectedExpiry;

  return (
    <div className="bg-[#0B132B]/90 border border-slate-800 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl font-mono text-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              UPSTOX REAL-TIME OPTION CHAIN
            </h3>
            <span className="text-[11px] text-slate-400 font-sans">
              Live Greeks, Implied Volatility &amp; Open Interest Distribution
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Underlying Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1">
            {UNDERLYINGS.map((u) => (
              <button
                key={u.symbol}
                onClick={() => {
                  setSelectedUnderlying(u.symbol);
                  setSelectedExpiry("");
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  selectedUnderlying === u.symbol
                    ? "bg-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {u.symbol}
              </button>
            ))}
          </div>

          {/* Expiry Selector */}
          {normalizedExpiries.length > 0 && (
            <select
              value={currentExpiry}
              onChange={(e) => setSelectedExpiry(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-purple-500"
            >
              {normalizedExpiries.map((opt) => (
                <option key={opt.key} value={opt.value}>
                  Expiry: {opt.label}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 transition"
            title="Refresh Option Chain"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Spot Price Telemetry */}
      {data && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Underlying Spot</span>
              <div className="text-sm font-extrabold text-white">
                ₹{data.underlyingLtp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase">ATM Strike</span>
              <div className="text-sm font-extrabold text-purple-400">{data.atmStrike}</div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>Updated: {new Date(data.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {/* Option Chain Table */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-500 font-mono text-xs">
          Loading option chain data from Upstox...
        </div>
      ) : isError ? (
        <div className="p-6 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 space-y-1">
          <div className="font-bold">Option Chain Unavailable</div>
          <div className="text-xs font-sans text-slate-400">
            {(error as any)?.message || "Authentication token or active session required."}
          </div>
        </div>
      ) : strikes.length === 0 ? (
        <div className="py-12 text-center text-slate-500 font-mono text-xs">
          No strikes returned for this expiry.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-[11px] text-right font-mono">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                {/* Calls Header */}
                <th className="py-2.5 px-2 text-center text-emerald-400 font-bold bg-emerald-950/20 border-r border-slate-800" colSpan={5}>
                  CALL OPTIONS (CE)
                </th>
                {/* Strike Header */}
                <th className="py-2.5 px-3 text-center text-slate-200 font-bold bg-slate-800 border-r border-slate-800">
                  STRIKE
                </th>
                {/* Puts Header */}
                <th className="py-2.5 px-2 text-center text-rose-400 font-bold bg-rose-950/20" colSpan={5}>
                  PUT OPTIONS (PE)
                </th>
              </tr>
              <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 text-[10px]">
                <th className="py-2 px-2 text-left">Delta</th>
                <th className="py-2 px-2">IV</th>
                <th className="py-2 px-2">OI</th>
                <th className="py-2 px-2">Vol</th>
                <th className="py-2 px-2 border-r border-slate-800 text-emerald-400">LTP</th>

                <th className="py-2 px-3 text-center bg-slate-800/80 text-white font-bold border-r border-slate-800">
                  ATM
                </th>

                <th className="py-2 px-2 text-rose-400 text-left">LTP</th>
                <th className="py-2 px-2">Vol</th>
                <th className="py-2 px-2">OI</th>
                <th className="py-2 px-2">IV</th>
                <th className="py-2 px-2 text-right">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {strikes.slice(0, 30).map((s) => (
                <tr
                  key={s.strike}
                  className={`transition-colors ${
                    s.isAtm
                      ? "bg-purple-500/10 font-bold border-y-2 border-purple-500/50"
                      : "hover:bg-slate-800/40"
                  }`}
                >
                  {/* Calls */}
                  <td className="py-1.5 px-2 text-left text-slate-400">
                    {s.call.delta !== null ? s.call.delta.toFixed(2) : "-"}
                  </td>
                  <td className="py-1.5 px-2 text-slate-400">
                    {s.call.iv !== null ? `${s.call.iv.toFixed(1)}%` : "-"}
                  </td>
                  <td className="py-1.5 px-2 text-slate-300">
                    {s.call.oi !== null ? s.call.oi.toLocaleString("en-IN") : "-"}
                  </td>
                  <td className="py-1.5 px-2 text-slate-400">
                    {s.call.volume !== null ? s.call.volume.toLocaleString("en-IN") : "-"}
                  </td>
                  <td className="py-1.5 px-2 font-bold text-emerald-400 border-r border-slate-800">
                    {s.call.ltp !== null ? `₹${s.call.ltp.toFixed(2)}` : "-"}
                  </td>

                  {/* Strike Column */}
                  <td
                    className={`py-1.5 px-3 text-center border-r border-slate-800 font-bold ${
                      s.isAtm ? "bg-purple-600 text-white" : "bg-slate-900/90 text-white"
                    }`}
                  >
                    {s.strike}
                  </td>

                  {/* Puts */}
                  <td className="py-1.5 px-2 font-bold text-rose-400 text-left">
                    {s.put.ltp !== null ? `₹${s.put.ltp.toFixed(2)}` : "-"}
                  </td>
                  <td className="py-1.5 px-2 text-slate-400">
                    {s.put.volume !== null ? s.put.volume.toLocaleString("en-IN") : "-"}
                  </td>
                  <td className="py-1.5 px-2 text-slate-300">
                    {s.put.oi !== null ? s.put.oi.toLocaleString("en-IN") : "-"}
                  </td>
                  <td className="py-1.5 px-2 text-slate-400">
                    {s.put.iv !== null ? `${s.put.iv.toFixed(1)}%` : "-"}
                  </td>
                  <td className="py-1.5 px-2 text-right text-slate-400">
                    {s.put.delta !== null ? s.put.delta.toFixed(2) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
