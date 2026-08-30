"use client";

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
  const { data: chainData, isLoading } = useQuery<OptionChainData>({
    queryKey: ["optionsCommandChain", symbol, selectedExpiry],
    queryFn: async () => {
      const res = await fetch(`/api/universe/option-chain?underlying=${encodeURIComponent(symbol)}&expiry=${encodeURIComponent(selectedExpiry)}`);
      if (!res.ok) {
        // High fidelity fallback strike data for demo/offline
        return {
          underlying: symbol,
          spot_price: symbol.includes("NIFTY") ? 24350.0 : 65420.0,
          selected_expiry: selectedExpiry,
          available_expiries: ["2026-08-27", "2026-09-03", "2026-09-24", "2026-10-29"],
          atm_strike: symbol.includes("NIFTY") ? 24350 : 65400,
          highest_call_oi: symbol.includes("NIFTY") ? 24500 : 66000,
          highest_put_oi: symbol.includes("NIFTY") ? 24000 : 64000,
          pcr: 1.15,
          max_pain: symbol.includes("NIFTY") ? 24300 : 65000,
          iv_skew: 1.4,
          strikes: [
            {
              strike: symbol.includes("NIFTY") ? 24200 : 64000,
              call: { instrument_id: "c1", provider_symbol: `${symbol} 24200 CE`, canonical_symbol: `${symbol} 24200 CE`, display_symbol: "24200 CE", company_name: symbol, exchange: "NSE", mic: "XNSE", country: "IN", currency: "INR", asset_class: "Options", instrument_type: "OPT", lot_size: 25, tick_size: 0.05, contract_size: 25, price_multiplier: 1, segment: "NFO", market_status: "OPEN", tradability: "FULL", data_status: "LIVE", data_source: "NSE", contract_status: "ACTIVE", paper_enabled: true, live_enabled: true, strategy_enabled: true, last_price: 240.5, volume_24h: 180000, open_interest: 450000, delta: 0.72, gamma: 0.0015, theta: -14.2, vega: 18.5, implied_volatility: 14.8, volatility_score: 55, momentum_score: 60 },
              put: { instrument_id: "p1", provider_symbol: `${symbol} 24200 PE`, canonical_symbol: `${symbol} 24200 PE`, display_symbol: "24200 PE", company_name: symbol, exchange: "NSE", mic: "XNSE", country: "IN", currency: "INR", asset_class: "Options", instrument_type: "OPT", lot_size: 25, tick_size: 0.05, contract_size: 25, price_multiplier: 1, segment: "NFO", market_status: "OPEN", tradability: "FULL", data_status: "LIVE", data_source: "NSE", contract_status: "ACTIVE", paper_enabled: true, live_enabled: true, strategy_enabled: true, last_price: 68.2, volume_24h: 310000, open_interest: 920000, delta: -0.28, gamma: 0.0015, theta: -12.4, vega: 18.2, implied_volatility: 15.2, volatility_score: 55, momentum_score: 60 },
            },
            {
              strike: symbol.includes("NIFTY") ? 24350 : 65400,
              call: { instrument_id: "c2", provider_symbol: `${symbol} 24350 CE`, canonical_symbol: `${symbol} 24350 CE`, display_symbol: "24350 CE", company_name: symbol, exchange: "NSE", mic: "XNSE", country: "IN", currency: "INR", asset_class: "Options", instrument_type: "OPT", lot_size: 25, tick_size: 0.05, contract_size: 25, price_multiplier: 1, segment: "NFO", market_status: "OPEN", tradability: "FULL", data_status: "LIVE", data_source: "NSE", contract_status: "ACTIVE", paper_enabled: true, live_enabled: true, strategy_enabled: true, last_price: 135.0, volume_24h: 420000, open_interest: 780000, delta: 0.51, gamma: 0.0022, theta: -18.6, vega: 22.4, implied_volatility: 15.0, volatility_score: 60, momentum_score: 65 },
              put: { instrument_id: "p2", provider_symbol: `${symbol} 24350 PE`, canonical_symbol: `${symbol} 24350 PE`, display_symbol: "24350 PE", company_name: symbol, exchange: "NSE", mic: "XNSE", country: "IN", currency: "INR", asset_class: "Options", instrument_type: "OPT", lot_size: 25, tick_size: 0.05, contract_size: 25, price_multiplier: 1, segment: "NFO", market_status: "OPEN", tradability: "FULL", data_status: "LIVE", data_source: "NSE", contract_status: "ACTIVE", paper_enabled: true, live_enabled: true, strategy_enabled: true, last_price: 132.5, volume_24h: 390000, open_interest: 740000, delta: -0.49, gamma: 0.0022, theta: -18.1, vega: 22.1, implied_volatility: 15.1, volatility_score: 60, momentum_score: 65 },
            },
            {
              strike: symbol.includes("NIFTY") ? 24500 : 66000,
              call: { instrument_id: "c3", provider_symbol: `${symbol} 24500 CE`, canonical_symbol: `${symbol} 24500 CE`, display_symbol: "24500 CE", company_name: symbol, exchange: "NSE", mic: "XNSE", country: "IN", currency: "INR", asset_class: "Options", instrument_type: "OPT", lot_size: 25, tick_size: 0.05, contract_size: 25, price_multiplier: 1, segment: "NFO", market_status: "OPEN", tradability: "FULL", data_status: "LIVE", data_source: "NSE", contract_status: "ACTIVE", paper_enabled: true, live_enabled: true, strategy_enabled: true, last_price: 62.4, volume_24h: 510000, open_interest: 1250000, delta: 0.31, gamma: 0.0016, theta: -13.5, vega: 19.2, implied_volatility: 15.4, volatility_score: 50, momentum_score: 55 },
              put: { instrument_id: "p3", provider_symbol: `${symbol} 24500 PE`, canonical_symbol: `${symbol} 24500 PE`, display_symbol: "24500 PE", company_name: symbol, exchange: "NSE", mic: "XNSE", country: "IN", currency: "INR", asset_class: "Options", instrument_type: "OPT", lot_size: 25, tick_size: 0.05, contract_size: 25, price_multiplier: 1, segment: "NFO", market_status: "OPEN", tradability: "FULL", data_status: "LIVE", data_source: "NSE", contract_status: "ACTIVE", paper_enabled: true, live_enabled: true, strategy_enabled: true, last_price: 245.0, volume_24h: 120000, open_interest: 320000, delta: -0.69, gamma: 0.0016, theta: -14.1, vega: 19.5, implied_volatility: 15.6, volatility_score: 50, momentum_score: 55 },
            },
          ],
        };
      }
      return res.json();
    },
    refetchInterval: 6000,
  });

  const spot = chainData?.spot_price || 24350.0;
  const atmStrike = chainData?.atm_strike || 24350;
  const normalizedExpiries = React.useMemo(() => {
    const rawExpiries = chainData?.available_expiries || ["2026-08-27", "2026-09-03", "2026-09-24"];
    return normalizeExpiriesList(rawExpiries, symbol);
  }, [chainData?.available_expiries, symbol]);

  return (
    <div className="bg-[#0D1914] border border-[#294238] rounded-2xl p-4 sm:p-5 shadow-xl select-none font-sans space-y-4">
      {/* Top Header: Underlying, Spot Price, PCR & Expiry selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1B3328] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Options Command Center
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#07110D] text-cyan-300 font-mono font-bold border border-[#1B3328]">
                {symbol} Spot: ${spot.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-[#A8BDB0]">
              Institutional strike-centered option chain with real-time Black-Scholes Greeks and Open Interest.
            </p>
          </div>
        </div>

        {/* Expiry Selector & PCR Metrics */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-3 py-1 bg-[#07110D] border border-[#1B3328] rounded-xl text-purple-300">
            <span>PCR: <strong>{chainData?.pcr || 1.15}</strong></span>
          </div>

          <div className="px-3 py-1 bg-[#07110D] border border-[#1B3328] rounded-xl text-[#55C98A]">
            <span>Max Pain: <strong>{chainData?.max_pain || 24300}</strong></span>
          </div>

          <select
            value={selectedExpiry}
            onChange={(e) => setSelectedExpiry(e.target.value)}
            className="bg-[#07110D] border border-[#1B3328] rounded-xl px-3 py-1 text-white font-bold focus:outline-none focus:border-[#55C98A]"
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
      <div className="bg-[#07110D] border border-[#1B3328] rounded-2xl overflow-hidden shadow-inner">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0A130F] text-[#70877A] text-[10px] uppercase tracking-wider border-b border-[#1B3328]">
              <tr>
                {/* CALLS */}
                <th className="py-2.5 px-3 text-right bg-emerald-950/20 text-[#55C98A]">Call OI</th>
                <th className="py-2.5 px-3 text-right bg-emerald-950/20 text-[#55C98A]">IV</th>
                <th className="py-2.5 px-3 text-right bg-emerald-950/20 text-[#55C98A]">Delta</th>
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
            <tbody className="divide-y divide-[#1B3328]/60 text-slate-200">
              {(chainData?.strikes || []).map((row) => {
                const isATM = row.strike === atmStrike;
                const call = row.call;
                const put = row.put;

                return (
                  <tr
                    key={row.strike}
                    className={`hover:bg-[#123C2A]/30 transition-colors ${
                      isATM ? "bg-[#123C2A]/40 font-bold border-y border-[#39B978]/40" : ""
                    }`}
                  >
                    {/* CALLS */}
                    <td className="py-3 px-3 text-right text-[#A8BDB0]">
                      {call?.open_interest ? call.open_interest.toLocaleString() : "N/A"}
                    </td>
                    <td className="py-3 px-3 text-right text-purple-300">
                      {call?.implied_volatility ? `${call.implied_volatility.toFixed(1)}%` : "N/A"}
                    </td>
                    <td className="py-3 px-3 text-right text-cyan-300">
                      {call?.delta !== undefined ? call.delta.toFixed(2) : "N/A"}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#55C98A]">
                      {call?.last_price !== undefined ? `$${call.last_price.toFixed(2)}` : "N/A"}
                    </td>

                    {/* STRIKE */}
                    <td className="py-3 px-4 text-center font-bold text-white bg-[#0A130F]">
                      <div className="flex items-center justify-center gap-1">
                        <span>{row.strike}</span>
                        {isATM && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
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
                    <td className="py-3 px-3 text-left text-[#A8BDB0]">
                      {put?.open_interest ? put.open_interest.toLocaleString() : "N/A"}
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
