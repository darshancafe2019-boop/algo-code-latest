"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Zap,
  Layers,
  Shield,
  Activity,
  Key,
  Lock,
  AlertTriangle,
  Radio,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Code,
} from "lucide-react";
import { CanonicalFuturesContract } from "../types/futures";
import { useFuturesStore } from "../state/futures-store";
import { useUIStore } from "@/lib/store/useUIStore";

interface FuturesTableProps {
  contracts: CanonicalFuturesContract[];
  isLoading: boolean;
}

export function FuturesTable({ contracts, isLoading }: FuturesTableProps) {
  const {
    selectedContract,
    setSelectedContract,
    setDetailsDrawerOpen,
    setOrderReviewOpen,
    savedContractKeys,
    toggleSaveContract,
  } = useFuturesStore();

  const { setAICopilotOpen, setActiveSymbol } = useUIStore();
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  const handleRowClick = (contract: CanonicalFuturesContract) => {
    setSelectedContract(contract);
    setDetailsDrawerOpen(true);
  };

  const handleTradeClick = (e: React.MouseEvent, contract: CanonicalFuturesContract, side: "BUY" | "SELL") => {
    e.stopPropagation();
    const isConnected = contract.status === "CONNECTED" || contract.status === "LIVE";
    if (!isConnected) return;
    setSelectedContract(contract);
    setOrderReviewOpen(true, contract, side);
  };

  const toggleRowDetails = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    setExpandedRowKey((prev) => (prev === key ? null : key));
  };

  const renderStatusBadge = (c: CanonicalFuturesContract) => {
    switch (c.status) {
      case "CONNECTED":
      case "LIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/50 shadow-sm font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        );
      case "TOKEN_EXPIRED":
      case "AUTH_REQUIRED":
        return (
          <span
            title={c.error_details || "Broker API access token expired or required"}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-950/70 text-amber-400 border border-amber-800/50 cursor-help font-mono"
          >
            <Key className="w-2.5 h-2.5 text-amber-400" />
            {c.status === "TOKEN_EXPIRED" ? "TOKEN EXPIRED" : "AUTH REQUIRED"}
          </span>
        );
      case "NOT_CONFIGURED":
        return (
          <span
            title={c.error_details || "Provider adapter not configured with environment credentials"}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-900 text-slate-400 border border-slate-700/60 cursor-help font-mono"
          >
            <Lock className="w-2.5 h-2.5 text-slate-500" />
            NOT CONFIGURED
          </span>
        );
      case "STALE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-orange-950/70 text-orange-400 border border-orange-800/50 font-mono">
            <AlertTriangle className="w-2.5 h-2.5 text-orange-400" />
            STALE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-950/70 text-rose-400 border border-rose-800/50 font-mono">
            DISCONNECTED
          </span>
        );
    }
  };

  if (isLoading && contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#0E1524] border border-[#1E293B] rounded-2xl">
        <Activity className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-xs font-mono text-slate-400">Streaming multi-venue futures books and live quotes...</p>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-16 bg-[#0E1524] border border-[#1E293B] rounded-2xl text-slate-500 font-mono text-xs">
        No futures contracts found matching your current source and segment filters.
      </div>
    );
  }

  return (
    <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left font-mono text-xs text-slate-300 border-collapse">
          <thead className="bg-[#080C14]/90 border-b border-[#1E293B] text-[10px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-3.5 px-3 text-center w-8">★</th>
              <th className="py-3.5 px-3">Contract / Symbol</th>
              <th className="py-3.5 px-3">Data Provider</th>
              <th className="py-3.5 px-2 text-center">Exchange</th>
              <th className="py-3.5 px-3">Broker & Env</th>
              <th className="py-3.5 px-3 text-right">Mark Price</th>
              <th className="py-3.5 px-3 text-right">Index Price</th>
              <th className="py-3.5 px-2 text-right">Basis %</th>
              <th className="py-3.5 px-3 text-right">8h Funding</th>
              <th className="py-3.5 px-3 text-right">Funding APR</th>
              <th className="py-3.5 px-3 text-right">24h Change</th>
              <th className="py-3.5 px-3 text-right">24h Volume</th>
              <th className="py-3.5 px-3 text-right">Open Interest</th>
              <th className="py-3.5 px-2 text-right">Latency</th>
              <th className="py-3.5 px-3 text-center">Status</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#141D2E] text-slate-300">
            {contracts.map((c) => {
              const rowKey = c.instrument_key || `${c.market_data_provider || c.provider}-${c.symbol}`;
              const isSelected = selectedContract?.symbol === c.symbol && selectedContract?.market_data_provider === c.market_data_provider;
              const isConnected = c.status === "CONNECTED" || c.status === "LIVE";
              const isPositive = (c.change_24h_pct ?? 0) >= 0;
              const basisPct = c.basis?.basis_percentage;
              const apr = c.funding_rate?.funding_rate_annualized;
              const isIndian = c.exchange === "NSE" || c.currency === "INR";
              const currSymbol = isIndian ? "₹" : "$";
              const isSaved = savedContractKeys.includes(c.symbol) || savedContractKeys.includes(c.instrument_key || "");
              const isRowExpanded = expandedRowKey === rowKey;

              return (
                <React.Fragment key={rowKey}>
                  <tr
                    onClick={() => handleRowClick(c)}
                    className={`cursor-pointer transition-all hover:bg-[#121927]/70 group ${
                      isSelected ? "bg-cyan-950/40 border-l-2 border-cyan-400" : ""
                    }`}
                  >
                    {/* Star / Save */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaveContract(c.symbol);
                        }}
                        className="text-slate-600 hover:text-amber-400 transition"
                        title={isSaved ? "Saved" : "Save Contract"}
                      >
                        <Star className={`w-3.5 h-3.5 ${isSaved ? "text-amber-400 fill-amber-400" : ""}`} />
                      </button>
                    </td>

                    {/* 1. Contract / Symbol + Asset Type */}
                    <td className="py-3.5 px-3">
                      <div>
                        <div className="font-bold text-white text-xs group-hover:text-cyan-300 transition flex items-center gap-1.5">
                          <span>{c.displayName || c.symbol}</span>
                          <button
                            onClick={(e) => toggleRowDetails(e, rowKey)}
                            className="text-slate-500 hover:text-cyan-400 transition"
                            title="Toggle Data Details"
                          >
                            {isRowExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-[#080C14] border border-slate-700/60 text-slate-300 font-mono text-[9px]">
                            {c.asset_type || (c.contract_type === "PERPETUAL" ? "PERP" : "FUT")}
                          </span>
                          <span>•</span>
                          <span>{c.max_leverage}x Lev</span>
                          {c.expiry_date && (
                            <>
                              <span>•</span>
                              <span className="text-slate-400">{c.expiry_date}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Provider / Source (Truthful Label) */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-200 text-[11px] truncate max-w-[140px]">
                        {c.provider || c.market_data_provider || "Market Provider"}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        {c.feed_type || "WEBSOCKET"}
                      </div>
                    </td>

                    {/* 3. Exchange */}
                    <td className="py-3.5 px-2 text-center">
                      <span className="text-cyan-400 font-bold text-[11px]">
                        {c.exchange || c.venue}
                      </span>
                    </td>

                    {/* 4. Broker & Environment */}
                    <td className="py-3.5 px-3">
                      <div className="text-slate-300 text-[10px] truncate max-w-[120px]">
                        {c.execution_broker || c.broker_account_alias || "Broker Direct"}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-emerald-950/70 border border-emerald-800/40 text-emerald-400 text-[9px] font-bold font-mono">
                          {c.environment || "PAPER"}
                        </span>
                      </div>
                    </td>

                    {/* 5. Mark Price (Null Safe) */}
                    <td className="py-3.5 px-3 text-right font-bold text-white">
                      {isConnected && c.mark_price != null
                        ? `${currSymbol}${c.mark_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </td>

                    {/* 6. Index Price (Null Safe) */}
                    <td className="py-3.5 px-3 text-right text-slate-400">
                      {isConnected && c.index_price != null
                        ? `${currSymbol}${c.index_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </td>

                    {/* 7. Basis % */}
                    <td className="py-3.5 px-2 text-right">
                      {isConnected && basisPct != null ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            basisPct > 0
                              ? "bg-emerald-950/70 text-emerald-400 border border-emerald-500/30"
                              : "bg-red-950/70 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {basisPct > 0 ? `+${basisPct.toFixed(2)}%` : `${basisPct.toFixed(2)}%`}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* 8. 8h Funding Rate */}
                    <td className="py-3.5 px-3 text-right">
                      {isConnected && c.funding_rate?.funding_rate_8h != null ? (
                        <span className="text-slate-300 text-[11px]">
                          {(c.funding_rate.funding_rate_8h * 100).toFixed(4)}%
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* 9. Funding APR */}
                    <td className="py-3.5 px-3 text-right">
                      {isConnected && apr != null ? (
                        <span className="font-bold text-cyan-400 text-[11px]">
                          {apr > 0 ? `+${apr.toFixed(2)}%` : `${apr.toFixed(2)}%`}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* 10. 24h Change */}
                    <td className="py-3.5 px-3 text-right font-bold">
                      {isConnected && c.change_24h_pct != null ? (
                        <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
                          {isPositive ? `+${c.change_24h_pct.toFixed(2)}%` : `${c.change_24h_pct.toFixed(2)}%`}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* 11. 24h Volume */}
                    <td className="py-3.5 px-3 text-right text-slate-300">
                      {isConnected && c.volume_24h_usd != null && c.volume_24h_usd > 0 ? (
                        `$${(c.volume_24h_usd / 1e6).toFixed(1)}M`
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* 12. Open Interest */}
                    <td className="py-3.5 px-3 text-right text-slate-300">
                      {isConnected && c.open_interest_usd != null && c.open_interest_usd > 0 ? (
                        `$${(c.open_interest_usd / 1e6).toFixed(1)}M`
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* 13. Latency / Data Age */}
                    <td className="py-3.5 px-2 text-right">
                      {isConnected && (c.latency_ms ?? 0) > 0 ? (
                        <span
                          className={`font-bold ${
                            (c.latency_ms ?? 0) < 30
                              ? "text-emerald-400"
                              : (c.latency_ms ?? 0) < 60
                              ? "text-cyan-400"
                              : "text-amber-400"
                          }`}
                        >
                          {(c.latency_ms ?? 24).toFixed(0)} ms
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* 14. Status Badge */}
                    <td className="py-3.5 px-3 text-center">
                      {renderStatusBadge(c)}
                    </td>

                    {/* 15. Actions (Strictly disabled if disconnected/auth required) */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => handleTradeClick(e, c, "BUY")}
                          disabled={!isConnected}
                          className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-30 disabled:hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition active:scale-95"
                          title={isConnected ? "Open Long Order Preview" : "Disabled while data unavailable"}
                        >
                          Long
                        </button>
                        <button
                          onClick={(e) => handleTradeClick(e, c, "SELL")}
                          disabled={!isConnected}
                          className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 disabled:opacity-30 disabled:hover:bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold transition active:scale-95"
                          title={isConnected ? "Open Short Order Preview" : "Disabled while data unavailable"}
                        >
                          Short
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSymbol(c.symbol);
                            setAICopilotOpen(true);
                          }}
                          title="AI Strategy Copilot"
                          className="p-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Data Details Row */}
                  {isRowExpanded && (
                    <tr className="bg-[#080C14]/95 border-b border-cyan-950/60 font-mono text-[11px]">
                      <td colSpan={16} className="p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 bg-[#0B132B]/80 p-3.5 rounded-xl border border-slate-800">
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase block">Canonical Symbol</span>
                            <strong className="text-white text-xs truncate block">{c.canonical_symbol || c.symbol}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase block">Provider Symbol / ID</span>
                            <strong className="text-slate-300 text-xs truncate block">{c.provider_instrument_id || c.symbol}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase block">Contract Multiplier / Lot</span>
                            <strong className="text-cyan-300 text-xs block">{c.contract_multiplier || 1}x • Lot: {c.lot_size || 1}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase block">Settlement & Margin</span>
                            <strong className="text-slate-300 text-xs block">{c.settlement_type || "CASH"} • {c.margin_currency || "USD"}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase block">Last Update Age</span>
                            <strong className="text-emerald-400 text-xs block">
                              {c.data_age_ms != null ? `${c.data_age_ms.toFixed(0)} ms ago` : "—"}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase block">Error / Diagnosis</span>
                            <strong className="text-amber-400 text-xs truncate block">
                              {c.error_details || "No Errors"}
                            </strong>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
