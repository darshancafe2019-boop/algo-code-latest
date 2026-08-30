"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldCheck,
  Percent,
  Sparkles,
  Sliders,
  Flame,
  Info,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { OptionChainResponse, StrikeRow } from "@/types/crypto-derivatives";
import { useCryptoRealtime } from "@/hooks/useCryptoRealtime";
import { normalizeExpiriesList } from "@/lib/expiry-utils";
import { RawExpiryItem } from "@/types/option-chain";
import { apiClient } from "@/lib/apiClient";

interface Props {
  initialUnderlying?: string;
}

export function CryptoOptionChainTerminal({ initialUnderlying = "BTC" }: Props) {
  const [underlying, setUnderlying] = useState<string>(initialUnderlying);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [strikeRange, setStrikeRange] = useState<number>(20);
  const [viewMode, setViewMode] = useState<"standard" | "greeks">("standard");

  const { connectionStatus } = useCryptoRealtime();

  // 1. Fetch Expiries
  const { data: expiriesData } = useQuery<{
    status: string;
    expiries: RawExpiryItem[];
  }>({
    queryKey: ["cryptoExpiries", underlying],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/api/crypto/options/expiries?underlying=${underlying}`, { timeoutMs: 5000 });
      if (!res.ok || !res.data) return { status: "success", expiries: [] };
      return res.data;
    },
    staleTime: 60000,
    retry: 1,
  });

  const normalizedExpiries = React.useMemo(() => {
    const raw = Array.isArray(expiriesData?.expiries) ? expiriesData.expiries : [];
    return normalizeExpiriesList(raw, underlying);
  }, [expiriesData?.expiries, underlying]);

  // Update selected expiry default
  React.useEffect(() => {
    if (normalizedExpiries.length > 0) {
      const exists = normalizedExpiries.some((e) => e.value === selectedExpiry);
      if (!selectedExpiry || !exists) {
        setSelectedExpiry(normalizedExpiries[0].value);
      }
    }
  }, [normalizedExpiries, selectedExpiry]);

  // 2. Fetch Option Chain
  const { data, isLoading, error, refetch, isFetching } = useQuery<OptionChainResponse>({
    queryKey: ["cryptoOptionChain", underlying, selectedExpiry, strikeRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        underlying,
        strike_range: strikeRange.toString(),
      });
      if (selectedExpiry) params.append("expiry", selectedExpiry);

      const res = await apiClient.get<any>(`/api/crypto/options/chain?${params.toString()}`, { timeoutMs: 6000 });
      if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch option chain");
      return res.data;
    },
    refetchInterval: () => (apiClient.isOffline() ? false : 6000),
    staleTime: 4000,
    retry: 1,
  });

  const strikes = Array.isArray(data?.strikes) ? data.strikes : [];
  const spotPrice = data?.spot_price || 0;
  const atmStrike = data?.atm_strike || 0;
  const maxPain = data?.max_pain || 0;
  const pcr = data?.pcr || { pcr_oi: 1.0, pcr_volume: 1.0, total_call_oi: 0, total_put_oi: 0 };
  const expectedMove = data?.expected_move || 0;
  const expectedMovePct = data?.expected_move_pct || 0;
  const highlights = data?.highlights || { max_call_oi_strike: 0, max_put_oi_strike: 0 };

  const underlyings = [
    { id: "BTC", name: "Bitcoin (BTC)" },
    { id: "ETH", name: "Ethereum (ETH)" },
    { id: "SOL", name: "Solana (SOL)" },
  ];

  return (
    <div className="flex flex-col gap-5 text-slate-100 font-sans pb-12">
      {/* Top Header & Controls */}
      <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Layers className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Crypto Option Chain
              <span className="text-xs px-2 py-0.5 rounded font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {underlying} DERIVATIVES
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Live CALL | STRIKE | PUT Matrix • ATM & Max OI Badges • Black-Scholes Greeks • PCR & Max Pain
            </p>
          </div>
        </div>

        {/* Global Controls & Provenance */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Underlying Picker */}
          <div className="flex items-center bg-[#0B101B] p-1 rounded-lg border border-slate-800">
            {underlyings.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  setUnderlying(u.id);
                  setSelectedExpiry("");
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  underlying === u.id
                    ? "bg-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {u.id}
              </button>
            ))}
          </div>

          {/* Expiry Selector */}
          <div className="flex items-center gap-2 bg-[#0B101B] px-3 py-1.5 rounded-lg border border-slate-800">
            <Calendar className="w-4 h-4 text-purple-400" />
            <select
              value={selectedExpiry}
              onChange={(e) => setSelectedExpiry(e.target.value)}
              className="bg-transparent text-xs font-mono text-white focus:outline-none cursor-pointer"
            >
              {normalizedExpiries && normalizedExpiries.length > 0 ? (
                normalizedExpiries.map((opt) => (
                  <option key={opt.key} value={opt.value} className="bg-[#131B2A] text-white">
                    {opt.label}
                  </option>
                ))
              ) : (
                <option value="" className="bg-[#131B2A] text-slate-400">
                  Syncing Expiries...
                </option>
              )}
            </select>
          </div>

          {/* Strike Range Selector */}
          <div className="flex items-center gap-1 bg-[#0B101B] p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 px-1 text-[11px]">Strikes:</span>
            {[10, 20, 30].map((count) => (
              <button
                key={count}
                onClick={() => setStrikeRange(count)}
                className={`px-2 py-0.5 rounded font-mono font-medium ${
                  strikeRange === count ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {count}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#0B101B] p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode("standard")}
              className={`px-2.5 py-1 rounded font-medium ${
                viewMode === "standard" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => setViewMode("greeks")}
              className={`px-2.5 py-1 rounded font-medium ${
                viewMode === "greeks" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Greeks
            </button>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-[#1E293B] hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="Refresh Option Chain"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-purple-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-3 shadow-md">
          <span className="text-[11px] text-slate-400 block mb-0.5">Spot Price</span>
          <span className="text-base font-bold font-mono text-white">
            ${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-emerald-400 block font-mono">Live Index</span>
        </div>

        <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-3 shadow-md">
          <span className="text-[11px] text-slate-400 block mb-0.5">ATM Strike</span>
          <span className="text-base font-bold font-mono text-amber-300">
            ${atmStrike.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">Center Node</span>
        </div>

        <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-3 shadow-md">
          <span className="text-[11px] text-slate-400 block mb-0.5">Max Pain Strike</span>
          <span className="text-base font-bold font-mono text-purple-300">
            ${maxPain.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">Options Expiry Gravity</span>
        </div>

        <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-3 shadow-md">
          <span className="text-[11px] text-slate-400 block mb-0.5">Expected Move</span>
          <span className="text-base font-bold font-mono text-blue-400">
            ±${expectedMove.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">±{expectedMovePct}% of Spot</span>
        </div>

        <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-3 shadow-md">
          <span className="text-[11px] text-slate-400 block mb-0.5">Put-Call Ratio (PCR)</span>
          <span className="text-base font-bold font-mono text-emerald-400">
            {pcr.pcr_oi}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">
            {pcr.pcr_oi > 1.2 ? "Bullish Bias" : pcr.pcr_oi < 0.8 ? "Bearish Bias" : "Neutral"}
          </span>
        </div>

        <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-3 shadow-md">
          <span className="text-[11px] text-slate-400 block mb-0.5">Max Open Interest</span>
          <span className="text-xs font-bold font-mono text-white block">
            C: ${highlights.max_call_oi_strike}
          </span>
          <span className="text-xs font-bold font-mono text-white block">
            P: ${highlights.max_put_oi_strike}
          </span>
        </div>
      </div>

      {/* Main Option Chain Table */}
      <div className="bg-[#131B2A] border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-7 h-7 animate-spin text-purple-400" />
            <span className="text-xs">Loading live option chain from CCXT Deribit...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-rose-400 text-xs">
            Failed to load option chain for {underlying}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                {/* Master Call / Strike / Put Header */}
                <tr className="border-b border-slate-800 text-xs font-bold tracking-wider uppercase text-center bg-[#0B101B]">
                  <th colSpan={viewMode === "standard" ? 6 : 6} className="py-2 text-blue-400 bg-blue-500/10 border-r border-slate-800">
                    CALLS (CE)
                  </th>
                  <th colSpan={2} className="py-2 text-amber-300 bg-amber-500/10 border-r border-slate-800">
                    STRIKE
                  </th>
                  <th colSpan={viewMode === "standard" ? 6 : 6} className="py-2 text-rose-400 bg-rose-500/10">
                    PUTS (PE)
                  </th>
                </tr>

                {/* Sub-Column Headers */}
                <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px] bg-[#0E1524]">
                  {viewMode === "standard" ? (
                    <>
                      <th className="py-2 px-2.5 text-right">OI</th>
                      <th className="py-2 px-2.5 text-right">Volume</th>
                      <th className="py-2 px-2.5 text-right">IV (%)</th>
                      <th className="py-2 px-2.5 text-right">Bid</th>
                      <th className="py-2 px-2.5 text-right">Ask</th>
                      <th className="py-2 px-2.5 text-right text-blue-300 border-r border-slate-800">LTP ($)</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2 px-2.5 text-right">Delta</th>
                      <th className="py-2 px-2.5 text-right">Gamma</th>
                      <th className="py-2 px-2.5 text-right">Theta</th>
                      <th className="py-2 px-2.5 text-right">Vega</th>
                      <th className="py-2 px-2.5 text-right">IV (%)</th>
                      <th className="py-2 px-2.5 text-right text-blue-300 border-r border-slate-800">LTP ($)</th>
                    </>
                  )}

                  <th className="py-2 px-3 text-center text-white font-bold bg-[#141E30]">Strike</th>
                  <th className="py-2 px-2 text-center text-slate-400 border-r border-slate-800 bg-[#141E30]">Moneyness</th>

                  {viewMode === "standard" ? (
                    <>
                      <th className="py-2 px-2.5 text-left text-rose-300">LTP ($)</th>
                      <th className="py-2 px-2.5 text-left">Bid</th>
                      <th className="py-2 px-2.5 text-left">Ask</th>
                      <th className="py-2 px-2.5 text-left">IV (%)</th>
                      <th className="py-2 px-2.5 text-left">Volume</th>
                      <th className="py-2 px-2.5 text-left">OI</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2 px-2.5 text-left text-rose-300">LTP ($)</th>
                      <th className="py-2 px-2.5 text-left">IV (%)</th>
                      <th className="py-2 px-2.5 text-left">Delta</th>
                      <th className="py-2 px-2.5 text-left">Gamma</th>
                      <th className="py-2 px-2.5 text-left">Theta</th>
                      <th className="py-2 px-2.5 text-left">Vega</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {strikes.map((row) => {
                  const isAtm = row.is_atm;
                  const c = row.call;
                  const p = row.put;

                  return (
                    <tr
                      key={row.strike}
                      className={`transition-colors ${
                        isAtm ? "bg-amber-500/10 font-semibold" : "hover:bg-slate-800/30"
                      }`}
                    >
                      {/* CALL DATA */}
                      {viewMode === "standard" ? (
                        <>
                          <td className="py-2 px-2.5 text-right text-slate-300">
                            {c?.is_highest_oi && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 mr-1">MAX</span>
                            )}
                            {c?.open_interest || 0}
                          </td>
                          <td className="py-2 px-2.5 text-right text-slate-400">{c?.volume || 0}</td>
                          <td className="py-2 px-2.5 text-right text-purple-300">{c?.iv || 0}%</td>
                          <td className="py-2 px-2.5 text-right text-slate-300">${c?.bid || 0}</td>
                          <td className="py-2 px-2.5 text-right text-slate-300">${c?.ask || 0}</td>
                          <td className="py-2 px-2.5 text-right font-bold text-blue-400 border-r border-slate-800">
                            ${c?.ltp || 0}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-2.5 text-right text-emerald-400">{c?.delta || 0}</td>
                          <td className="py-2 px-2.5 text-right text-slate-300">{c?.gamma || 0}</td>
                          <td className="py-2 px-2.5 text-right text-rose-400">{c?.theta || 0}</td>
                          <td className="py-2 px-2.5 text-right text-blue-300">{c?.vega || 0}</td>
                          <td className="py-2 px-2.5 text-right text-purple-300">{c?.iv || 0}%</td>
                          <td className="py-2 px-2.5 text-right font-bold text-blue-400 border-r border-slate-800">
                            ${c?.ltp || 0}
                          </td>
                        </>
                      )}

                      {/* STRIKE CENTER */}
                      <td className={`py-2 px-3 text-center font-bold ${isAtm ? "text-amber-300 bg-amber-500/20" : "text-white bg-[#111927]"}`}>
                        ${row.strike.toLocaleString()}
                      </td>
                      <td className={`py-2 px-2 text-center text-[10px] font-sans border-r border-slate-800 ${isAtm ? "text-amber-300 bg-amber-500/20 font-bold" : "text-slate-400 bg-[#111927]"}`}>
                        {isAtm ? "ATM" : row.strike < spotPrice ? "ITM / OTM" : "OTM / ITM"}
                      </td>

                      {/* PUT DATA */}
                      {viewMode === "standard" ? (
                        <>
                          <td className="py-2 px-2.5 text-left font-bold text-rose-400">
                            ${p?.ltp || 0}
                          </td>
                          <td className="py-2 px-2.5 text-left text-slate-300">${p?.bid || 0}</td>
                          <td className="py-2 px-2.5 text-left text-slate-300">${p?.ask || 0}</td>
                          <td className="py-2 px-2.5 text-left text-purple-300">{p?.iv || 0}%</td>
                          <td className="py-2 px-2.5 text-left text-slate-400">{p?.volume || 0}</td>
                          <td className="py-2 px-2.5 text-left text-slate-300">
                            {p?.open_interest || 0}
                            {p?.is_highest_oi && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 ml-1">MAX</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-2.5 text-left font-bold text-rose-400">
                            ${p?.ltp || 0}
                          </td>
                          <td className="py-2 px-2.5 text-left text-purple-300">{p?.iv || 0}%</td>
                          <td className="py-2 px-2.5 text-left text-emerald-400">{p?.delta || 0}</td>
                          <td className="py-2 px-2.5 text-left text-slate-300">{p?.gamma || 0}</td>
                          <td className="py-2 px-2.5 text-left text-rose-400">{p?.theta || 0}</td>
                          <td className="py-2 px-2.5 text-left text-blue-300">{p?.vega || 0}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
