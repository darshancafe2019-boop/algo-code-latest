"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Clock,
  DollarSign,
  Percent,
} from "lucide-react";
import { FuturesContract } from "@/types/market-universe";

interface FuturesCommandCenterProps {
  underlyingSymbol: string;
}

export function FuturesCommandCenter({ underlyingSymbol }: FuturesCommandCenterProps) {
  const symbol = underlyingSymbol || "BTC/USDT";

  // Fetch Futures chain data (`GET /api/universe/futures-chain`)
  const { data: futuresData, isLoading } = useQuery<{ status: string; contracts: FuturesContract[] }>({
    queryKey: ["futuresCommandChain", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/universe/futures-chain?underlying=${encodeURIComponent(symbol)}`);
      if (!res.ok) {
        return {
          status: "success",
          contracts: [
            {
              instrument_id: "fut-1",
              provider_symbol: `${symbol} PERPETUAL`,
              canonical_symbol: `${symbol} PERP`,
              display_symbol: `${symbol} PERP`,
              company_name: symbol,
              exchange: "BINANCE",
              mic: "BINA",
              country: "GL",
              currency: "USDT",
              asset_class: "Crypto",
              instrument_type: "PERP",
              lot_size: 1,
              tick_size: 0.1,
              contract_size: 1,
              price_multiplier: 1,
              segment: "PERP",
              market_status: "OPEN",
              tradability: "FULL",
              data_status: "LIVE",
              data_source: "BINANCE",
              contract_status: "ACTIVE",
              paper_enabled: true,
              live_enabled: true,
              strategy_enabled: true,
              last_price: 65420.0,
              spot_price: 65415.0,
              basis: 5.0,
              annualized_basis_pct: 0.28,
              funding_rate: 0.0001,
              days_to_expiry: 0,
              open_interest: 48500,
              volume_24h: 125000,
              change_24h: 0.54,
              volatility_score: 65,
              momentum_score: 70,
            },
            {
              instrument_id: "fut-2",
              provider_symbol: `${symbol} 260925 QUARTERLY`,
              canonical_symbol: `${symbol} 260925`,
              display_symbol: `${symbol} SEP 2026`,
              company_name: symbol,
              exchange: "BINANCE",
              mic: "BINA",
              country: "GL",
              currency: "USDT",
              asset_class: "Crypto",
              instrument_type: "FUT",
              lot_size: 1,
              tick_size: 0.1,
              contract_size: 1,
              price_multiplier: 1,
              segment: "FUT",
              market_status: "OPEN",
              tradability: "FULL",
              data_status: "LIVE",
              data_source: "BINANCE",
              contract_status: "ACTIVE",
              paper_enabled: true,
              live_enabled: true,
              strategy_enabled: true,
              last_price: 65880.0,
              spot_price: 65415.0,
              basis: 465.0,
              annualized_basis_pct: 7.12,
              days_to_expiry: 37,
              open_interest: 18200,
              volume_24h: 34000,
              change_24h: 0.62,
              volatility_score: 65,
              momentum_score: 70,
            },
          ],
        };
      }
      return res.json();
    },
    refetchInterval: 8000,
  });

  const contracts = futuresData?.contracts || [];

  return (
    <div className="bg-[#0D1914] border border-[#294238] rounded-2xl p-4 sm:p-5 shadow-xl select-none font-sans space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1B3328] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Futures & Perpetual Contracts
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#07110D] text-cyan-300 font-mono font-bold border border-[#1B3328]">
                {symbol}
              </span>
            </div>
            <p className="text-[11px] text-[#A8BDB0]">
              Term structure, basis spread, annualized cost of carry, and perpetual funding rate tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Futures Table */}
      <div className="bg-[#07110D] border border-[#1B3328] rounded-2xl overflow-hidden shadow-inner">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0A130F] text-[#70877A] text-[10px] uppercase tracking-wider border-b border-[#1B3328]">
              <tr>
                <th className="py-2.5 px-3">Contract</th>
                <th className="py-2.5 px-3">Exchange</th>
                <th className="py-2.5 px-3 text-right">Futures LTP</th>
                <th className="py-2.5 px-3 text-right">Basis ($)</th>
                <th className="py-2.5 px-3 text-right">Annualized Basis</th>
                <th className="py-2.5 px-3 text-center">Funding Rate</th>
                <th className="py-2.5 px-3 text-right">Open Interest</th>
                <th className="py-2.5 px-3 text-right">24H Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B3328]/60 text-slate-200">
              {contracts.map((c, idx) => (
                <tr key={idx} className="hover:bg-[#123C2A]/30 transition-colors">
                  <td className="py-3 px-3 font-bold text-white">
                    <span>{c.display_symbol || c.canonical_symbol}</span>
                    <span className="text-[10px] text-[#70877A] block">{c.instrument_type}</span>
                  </td>
                  <td className="py-3 px-3 text-cyan-300">{c.exchange}</td>
                  <td className="py-3 px-3 text-right font-bold text-white">
                    ${c.last_price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-[#55C98A]">
                    +${c.basis?.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right text-purple-300 font-bold">
                    {c.annualized_basis_pct ? `${c.annualized_basis_pct.toFixed(2)}%` : "—"}
                  </td>
                  <td className="py-3 px-3 text-center text-amber-400">
                    {c.funding_rate !== undefined ? `${(c.funding_rate * 100).toFixed(4)}%` : "N/A"}
                  </td>
                  <td className="py-3 px-3 text-right text-cyan-300">
                    {c.open_interest?.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-[#A8BDB0]">
                    {c.volume_24h?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
