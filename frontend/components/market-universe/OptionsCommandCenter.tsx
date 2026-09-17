"use client";

import { formatMoney, formatNumber, formatPrice, formatQuantity, formatVolume } from "@/lib/formatters";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Shield,
  Clock,
  Sparkles,
  Percent,
  Calendar,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { OptionChainData } from "@/types/market-universe";
import { normalizeExpiriesList } from "@/lib/expiry-utils";

interface OptionsCommandCenterProps {
  underlyingSymbol: string;
}

export function OptionsCommandCenter({ underlyingSymbol }: OptionsCommandCenterProps) {
  const symbol = underlyingSymbol || "NIFTY";
  const [selectedExpiry, setSelectedExpiry] = useState<string>("2026-08-27");

  // Fetch Option Chain data (`GET /api/universe/option-chain`)
  const { data: chainData, isLoading, error } = useQuery<OptionChainData>({
    queryKey: ["optionsCommandChain", symbol, selectedExpiry],
    queryFn: async () => {
      const res = await fetch(`/api/universe/option-chain?underlying=${encodeURIComponent(symbol)}&expiry=${encodeURIComponent(selectedExpiry)}`);
      if (!res.ok) {
        throw new Error(`Option chain service returned status ${res.status}`);
      }
      return res.json();
    },
    refetchInterval: 6000,
  });

  const spot = chainData?.spot_price ?? 0;
  const atmStrike = chainData?.atm_strike ?? 0;
  const normalizedExpiries = React.useMemo(() => {
    const rawExpiries = chainData?.available_expiries || [];
    return normalizeExpiriesList(rawExpiries, symbol);
  }, [chainData?.available_expiries, symbol]);

  return (
    <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-2xl p-4 sm:p-5 shadow-xl select-none font-sans space-y-4">
      {/* Top Header: Underlying, Spot Price, PCR & Expiry selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#122033] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border border-[#00E890]/40">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Options Command Center
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#07101A] text-cyan-300 font-mono font-bold border border-[#122033]">
                {symbol} Spot: {spot > 0 ? formatMoney(spot, "$") : "—"}
              </span>
            </div>
            <p className="text-[11px] text-[#7C8CA3]">
              Institutional strike-centered option chain with real-time Black-Scholes Greeks and Open Interest.
            </p>
          </div>
        </div>

        {/* Expiry Selector & PCR Metrics */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-3 py-1 bg-[#07101A] border border-[#122033] rounded-xl text-purple-300">
            <span>PCR: <strong>{chainData?.pcr !== undefined && chainData?.pcr !== null ? chainData.pcr.toFixed(2) : "—"}</strong></span>
          </div>

          <div className="px-3 py-1 bg-[#07101A] border border-[#122033] rounded-xl text-[#22D3EE]">
            <span>Max Pain: <strong>{chainData?.max_pain !== undefined && chainData?.max_pain !== null ? chainData.max_pain : "—"}</strong></span>
          </div>

          <select
            value={selectedExpiry}
            onChange={(e) => setSelectedExpiry(e.target.value)}
            className="bg-[#07101A] border border-[#122033] rounded-xl px-3 py-1 text-white font-bold focus:outline-none focus:border-[#22D3EE]"
          >
            {normalizedExpiries.map((opt) => (
              <option key={opt.key} value={opt.value}>
                Exp: {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Option Chain Table: CALLS | STRIKE | PUTS */}
      <div className="bg-[#07101A] border border-[#122033] rounded-2xl overflow-hidden shadow-inner">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0A130F] text-[#52627A] text-[10px] uppercase tracking-wider border-b border-[#122033]">
              <tr>
                {/* CALLS */}
                <th className="py-2.5 px-3 text-right bg-emerald-950/20 text-[#22D3EE]">Call OI</th>
                <th className="py-2.5 px-3 text-right bg-emerald-950/20 text-[#22D3EE]">IV</th>
                <th className="py-2.5 px-3 text-right bg-emerald-950/20 text-[#22D3EE]">Delta</th>
                <th className="py-2.5 px-3 text-right bg-emerald-950/20 text-white font-bold">Call LTP</th>

                {/* STRIKE */}
                <th className="py-2.5 px-4 text-center bg-[#121E18] text-cyan-300 font-bold">STRIKE</th>

                {/* PUTS */}
                <th className="py-2.5 px-3 text-left bg-rose-950/20 text-white font-bold">Put LTP</th>
                <th className="py-2.5 px-3 text-left bg-rose-950/20 text-red-400">Delta</th>
                <th className="py-2.5 px-3 text-left bg-rose-950/20 text-red-400">IV</th>
                <th className="py-2.5 px-3 text-left bg-rose-950/20 text-red-400">Put OI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#122033]/60 text-slate-200">
              {(chainData?.strikes || []).map((row) => {
                const isATM = row.strike === atmStrike;
                const call = row.call;
                const put = row.put;

                return (
                  <tr
                    key={row.strike}
                    className={`hover:bg-[rgba(37,99,235,0.18)]/30 transition-colors ${
                      isATM ? "bg-[rgba(37,99,235,0.18)]/40 font-bold border-y border-[#00E890]/40" : ""
                    }`}
                  >
                    {/* CALLS */}
                    <td className="py-3 px-3 text-right text-[#7C8CA3]">
                      {formatVolume(call?.open_interest)}
                    </td>
                    <td className="py-3 px-3 text-right text-purple-300">
                      {call?.implied_volatility ? `${call.implied_volatility.toFixed(1)}%` : "N/A"}
                    </td>
                    <td className="py-3 px-3 text-right text-cyan-300">
                      {call?.delta !== undefined ? call.delta.toFixed(2) : "N/A"}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#22D3EE]">
                      {call?.last_price !== undefined ? `$${call.last_price.toFixed(2)}` : "N/A"}
                    </td>

                    {/* STRIKE */}
                    <td className="py-3 px-4 text-center font-bold text-white bg-[#0A130F]">
                      <div className="flex items-center justify-center gap-1">
                        <span>{row.strike}</span>
                        {isATM && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border border-[#00E890]/40">
                            ATM
                          </span>
                        )}
                      </div>
                    </td>

                    {/* PUTS */}
                    <td className="py-3 px-3 text-left font-bold text-red-400">
                      {put?.last_price !== undefined ? `$${put.last_price.toFixed(2)}` : "N/A"}
                    </td>
                    <td className="py-3 px-3 text-left text-cyan-300">
                      {put?.delta !== undefined ? put.delta.toFixed(2) : "N/A"}
                    </td>
                    <td className="py-3 px-3 text-left text-purple-300">
                      {put?.implied_volatility ? `${put.implied_volatility.toFixed(1)}%` : "N/A"}
                    </td>
                    <td className="py-3 px-3 text-left text-[#7C8CA3]">
                      {formatVolume(put?.open_interest)}
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
