"use client";

import { formatNumber, formatMoney } from "@/lib/formatters";
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
        throw new Error(`Futures service returned status ${res.status}`);
      }
      return res.json();
    },
    refetchInterval: 8000,
  });

  const contracts = futuresData?.contracts || [];

  return (
    <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-2xl p-4 sm:p-5 shadow-xl select-none font-sans space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#122033] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border border-[#00E890]/40">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Futures & Perpetual Contracts
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#07101A] text-cyan-300 font-mono font-bold border border-[#122033]">
                {symbol}
              </span>
            </div>
            <p className="text-[11px] text-[#7C8CA3]">
              Term structure, basis spread, annualized cost of carry, and perpetual funding rate tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Futures Table */}
      <div className="bg-[#07101A] border border-[#122033] rounded-2xl overflow-hidden shadow-inner">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0A130F] text-[#52627A] text-[10px] uppercase tracking-wider border-b border-[#122033]">
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
            <tbody className="divide-y divide-[#122033]/60 text-slate-200">
              {contracts.map((c, idx) => (
                <tr key={idx} className="hover:bg-[rgba(37,99,235,0.18)]/30 transition-colors">
                  <td className="py-3 px-3 font-bold text-white">
                    <span>{c.display_symbol || c.canonical_symbol}</span>
                    <span className="text-[10px] text-[#52627A] block">{c.instrument_type}</span>
                  </td>
                  <td className="py-3 px-3 text-cyan-300">{c.exchange}</td>
                  <td className="py-3 px-3 text-right font-bold text-white">
                    {formatMoney(c.last_price, "$")}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-[#22D3EE]">
                    +${c.basis?.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right text-purple-300 font-bold">
                    {c.annualized_basis_pct ? `${c.annualized_basis_pct.toFixed(2)}%` : "—"}
                  </td>
                  <td className="py-3 px-3 text-center text-amber-400">
                    {c.funding_rate !== undefined ? `${(c.funding_rate * 100).toFixed(4)}%` : "N/A"}
                  </td>
                  <td className="py-3 px-3 text-right text-cyan-300">
                    {formatNumber(c.open_interest)}
                  </td>
                  <td className="py-3 px-3 text-right text-[#7C8CA3]">
                    {formatNumber(c.volume_24h)}
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
