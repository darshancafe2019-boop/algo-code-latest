"use client";

import React, { useState, useMemo } from "react";
import { CanonicalFuturesContract } from "../types/futures";
import { useFuturesStore } from "../state/futures-store";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Star,
  BookOpen,
  Info,
  ArrowUpDown,
  Lock,
  Radio,
  ExternalLink,
} from "lucide-react";

interface SimpleFuturesTableProps {
  contracts: CanonicalFuturesContract[];
  isLoading: boolean;
  selectedContractKey?: string | null;
  onSelectContract: (contract: CanonicalFuturesContract) => void;
  onTrade?: (e: React.MouseEvent, contract: CanonicalFuturesContract, side: "BUY" | "SELL") => void;
  onOpenBook?: (e: React.MouseEvent, contract: CanonicalFuturesContract) => void;
}

type SortField = "symbol" | "price" | "bid" | "ask" | "change" | "oi" | "funding" | "volume" | "expiry";
type SortOrder = "asc" | "desc";

function formatPrice(val: number | null | undefined, currency: string = "$"): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return `${currency}${val.toLocaleString(undefined, {
    minimumFractionDigits: val >= 100 ? 2 : (val >= 1 ? 3 : 4),
    maximumFractionDigits: val >= 100 ? 2 : (val >= 1 ? 3 : 4),
  })}`;
}

function formatVolume(val: number | null | undefined, currency: string = "$"): string {
  if (val === null || val === undefined || isNaN(val) || val === 0) return "—";
  if (currency === "₹") {
    if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)}Cr`;
    if (val >= 100_000) return `₹${(val / 100_000).toFixed(1)}L`;
  }
  if (val >= 1e9) return `${currency}${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `${currency}${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `${currency}${(val / 1e3).toFixed(0)}K`;
  return `${currency}${val.toLocaleString()}`;
}

export function SimpleFuturesTable({
  contracts,
  isLoading,
  selectedContractKey,
  onSelectContract,
  onTrade,
  onOpenBook,
}: SimpleFuturesTableProps) {
  const { savedContractKeys, toggleSaveContract, setOrderReviewOpen, setDetailsDrawerOpen, setSelectedContract } = useFuturesStore();
  
  const [sortField, setSortField] = useState<SortField>("volume");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedContracts = useMemo(() => {
    return [...contracts].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case "symbol":
          valA = a.displayName || a.symbol;
          valB = b.displayName || b.symbol;
          return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case "price":
          valA = a.last_price ?? a.mark_price ?? 0;
          valB = b.last_price ?? b.mark_price ?? 0;
          break;
        case "bid":
          valA = a.bid ?? 0;
          valB = b.bid ?? 0;
          break;
        case "ask":
          valA = a.ask ?? 0;
          valB = b.ask ?? 0;
          break;
        case "change":
          valA = a.change_24h_pct ?? 0;
          valB = b.change_24h_pct ?? 0;
          break;
        case "oi":
          valA = a.open_interest_usd ?? 0;
          valB = b.open_interest_usd ?? 0;
          break;
        case "funding":
          valA = a.funding_rate?.funding_rate_annualized ?? (a.funding_rate?.funding_rate_8h ? a.funding_rate.funding_rate_8h * 1000 : 0);
          valB = b.funding_rate?.funding_rate_annualized ?? (b.funding_rate?.funding_rate_8h ? b.funding_rate.funding_rate_8h * 1000 : 0);
          break;
        case "volume":
          valA = a.volume_24h_usd ?? 0;
          valB = b.volume_24h_usd ?? 0;
          break;
        case "expiry":
          valA = a.expiry_date || "9999-99-99";
          valB = b.expiry_date || "9999-99-99";
          return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        default:
          return 0;
      }

      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [contracts, sortField, sortOrder]);

  if (isLoading && contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#080E1C] border border-slate-800 rounded-2xl font-mono text-xs text-slate-400">
        <Activity className="w-6 h-6 animate-spin text-cyan-400 mb-2.5" />
        <p>Connecting to live multi-broker futures market data feeds...</p>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="p-12 text-center bg-[#080E1C] border border-slate-800 rounded-2xl font-mono text-xs text-slate-500 space-y-1">
        <div className="font-bold text-slate-400">No futures contracts found</div>
        <p>Try searching for a different contract (e.g. BTC, ETH, NIFTY, BANKNIFTY, SOL) or switch provider filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#080E1C] border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs select-none">
      {/* Desktop & Tablet Table */}
      <div className="hidden md:block overflow-x-auto max-h-[720px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        <table className="w-full border-collapse">
          {/* Table Header with Sort Triggers */}
          <thead className="sticky top-0 z-20 bg-[#0C1428] border-b border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <tr>
              <th className="p-3 text-center w-8">★</th>
              <th
                onClick={() => handleSort("symbol")}
                className="p-3 text-left cursor-pointer hover:text-white transition group"
              >
                <div className="flex items-center gap-1">
                  <span>CONTRACT</span>
                  <ArrowUpDown className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                </div>
              </th>
              <th className="p-3 text-left">SOURCE</th>
              <th
                onClick={() => handleSort("price")}
                className="p-3 text-right cursor-pointer hover:text-white transition group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>PRICE</span>
                  <ArrowUpDown className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                </div>
              </th>
              <th
                onClick={() => handleSort("bid")}
                className="p-3 text-right cursor-pointer hover:text-white transition group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>BID</span>
                  <ArrowUpDown className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                </div>
              </th>
              <th
                onClick={() => handleSort("ask")}
                className="p-3 text-right cursor-pointer hover:text-white transition group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>ASK</span>
                  <ArrowUpDown className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                </div>
              </th>
              <th
                onClick={() => handleSort("change")}
                className="p-3 text-right cursor-pointer hover:text-white transition group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>24H %</span>
                  <ArrowUpDown className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                </div>
              </th>
              <th
                onClick={() => handleSort("oi")}
                className="p-3 text-right cursor-pointer hover:text-white transition group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>OPEN INTEREST</span>
                  <ArrowUpDown className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                </div>
              </th>
              <th
                onClick={() => handleSort("funding")}
                className="p-3 text-right cursor-pointer hover:text-white transition group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>FUNDING</span>
                  <ArrowUpDown className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                </div>
              </th>
              <th
                onClick={() => handleSort("volume")}
                className="p-3 text-right cursor-pointer hover:text-white transition group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>VOLUME</span>
                  <ArrowUpDown className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                </div>
              </th>
              <th className="p-3 text-center min-w-[170px]">ACTION</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/60">
            {sortedContracts.map((c) => {
              const contractKey = c.instrument_key || c.symbol;
              const isSelected = selectedContractKey === contractKey;
              const isSaved = savedContractKeys.includes(c.symbol) || savedContractKeys.includes(c.displayName);
              const isIndian = c.exchange === "NSE" || c.currency === "INR";
              const currency = isIndian ? "₹" : "$";

              const changePct = c.change_24h_pct ?? 0;
              const isPositive = changePct >= 0;

              const fundingApr =
                c.funding_rate?.funding_rate_annualized ??
                (c.funding_rate?.funding_rate_8h != null ? c.funding_rate.funding_rate_8h * 3 * 365 * 100 : null);

              const isConnected = c.status === "CONNECTED" || c.status === "LIVE";
              const isDataOnly = !isConnected || c.status === "NOT_CONFIGURED" || c.status === "AUTH_REQUIRED" || c.status === "TOKEN_EXPIRED";

              const providerShort = (c.market_data_provider || c.provider || c.venue || "SIM")
                .replace("BINANCE_USDM", "BINANCE USD-M")
                .replace("BINANCE_COINM", "BINANCE COIN-M")
                .replace("DELTA_INDIA", "DELTA")
                .replace("_NSE", "")
                .replace("_API", "");

              return (
                <tr
                  key={contractKey}
                  onClick={() => onSelectContract(c)}
                  className={`cursor-pointer transition-colors group ${
                    isSelected
                      ? "bg-cyan-500/15 ring-1 ring-cyan-500/40"
                      : "hover:bg-slate-850 hover:bg-slate-800/50"
                  }`}
                >
                  {/* STAR FAVORITE */}
                  <td
                    className="p-3 text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSaveContract(c.symbol);
                    }}
                  >
                    <button type="button" className="text-slate-600 hover:text-amber-400 transition">
                      <Star className={`w-3.5 h-3.5 ${isSaved ? "text-amber-400 fill-amber-400" : ""}`} />
                    </button>
                  </td>

                  {/* CONTRACT */}
                  <td className="p-3 text-left">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-bold text-white text-xs group-hover:text-cyan-300 transition flex items-center gap-1.5">
                          <span>{c.displayName || c.symbol}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800/90 text-slate-300 font-semibold border border-slate-700/50">
                            {c.contract_type === "PERPETUAL" ? "PERP" : c.contract_type === "INDEX_FUTURES" ? "INDEX FUT" : "FUT"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <span>{c.underlying}</span>
                          {c.expiry_date && <span>• Exp: {c.expiry_date}</span>}
                          {c.max_leverage && <span className="text-cyan-400/80">• {c.max_leverage}x</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* SOURCE */}
                  <td className="p-3 text-left">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                      {providerShort}
                    </span>
                  </td>

                  {/* PRICE (LTP) */}
                  <td className="p-3 text-right font-bold text-white text-xs">
                    {c.last_price != null ? (
                      formatPrice(c.last_price, currency)
                    ) : (
                      <span className="text-slate-500 font-normal">—</span>
                    )}
                  </td>

                  {/* BID */}
                  <td className="p-3 text-right text-emerald-400 font-semibold text-xs">
                    {c.bid != null ? formatPrice(c.bid, currency) : <span className="text-slate-600">—</span>}
                  </td>

                  {/* ASK */}
                  <td className="p-3 text-right text-rose-400 font-semibold text-xs">
                    {c.ask != null ? formatPrice(c.ask, currency) : <span className="text-slate-600">—</span>}
                  </td>

                  {/* 24H CHANGE */}
                  <td className="p-3 text-right">
                    {c.change_24h_pct != null ? (
                      <span
                        className={`font-bold inline-flex items-center gap-0.5 ${
                          isPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {changePct.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* OPEN INTEREST */}
                  <td className="p-3 text-right text-slate-300 font-medium">
                    {c.open_interest_usd != null ? (
                      formatVolume(c.open_interest_usd, currency)
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* FUNDING */}
                  <td className="p-3 text-right">
                    {fundingApr != null ? (
                      <span
                        className={`font-semibold ${
                          fundingApr >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {fundingApr >= 0 ? "+" : ""}
                        {fundingApr.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* VOLUME */}
                  <td className="p-3 text-right text-slate-300 font-semibold">
                    {c.volume_24h_usd != null ? formatVolume(c.volume_24h_usd, currency) : "—"}
                  </td>

                  {/* ACTIONS: COMPACT [BUY] [SELL] */}
                  <td
                    className="p-3 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isDataOnly ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700/80 text-slate-400 text-[10px] font-bold">
                          DATA ONLY
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            if (onOpenBook) onOpenBook(e, c);
                            else onSelectContract(c);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700"
                          title="Open Order Book"
                        >
                          BOOK
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            if (onTrade) onTrade(e, c, "BUY");
                            else {
                              setSelectedContract(c);
                              setOrderReviewOpen(true, c, "BUY");
                            }
                          }}
                          className="px-2.5 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 text-[11px] font-bold font-mono transition shadow-sm active:scale-95"
                        >
                          BUY
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            if (onTrade) onTrade(e, c, "SELL");
                            else {
                              setSelectedContract(c);
                              setOrderReviewOpen(true, c, "SELL");
                            }
                          }}
                          className="px-2.5 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/50 text-[11px] font-bold font-mono transition shadow-sm active:scale-95"
                        >
                          SELL
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            if (onOpenBook) onOpenBook(e, c);
                            else onSelectContract(c);
                          }}
                          className="hidden lg:inline-flex px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-bold transition"
                          title="View Live Order Book"
                        >
                          BOOK
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile High-Density Cards View (<768px) with Direct BUY / SELL */}
      <div className="block md:hidden divide-y divide-slate-800">
        {sortedContracts.map((c) => {
          const contractKey = c.instrument_key || c.symbol;
          const isSelected = selectedContractKey === contractKey;
          const isSaved = savedContractKeys.includes(c.symbol) || savedContractKeys.includes(c.displayName);
          const isIndian = c.exchange === "NSE" || c.currency === "INR";
          const currency = isIndian ? "₹" : "$";
          const changePct = c.change_24h_pct ?? 0;
          const isPositive = changePct >= 0;
          const isConnected = c.status === "CONNECTED" || c.status === "LIVE";
          const isDataOnly = !isConnected || c.status === "NOT_CONFIGURED" || c.status === "AUTH_REQUIRED" || c.status === "TOKEN_EXPIRED";

          const fundingApr =
            c.funding_rate?.funding_rate_annualized ??
            (c.funding_rate?.funding_rate_8h != null ? c.funding_rate.funding_rate_8h * 3 * 365 * 100 : null);

          return (
            <div
              key={contractKey}
              onClick={() => onSelectContract(c)}
              className={`p-3 space-y-2.5 cursor-pointer transition ${
                isSelected ? "bg-cyan-500/15 ring-1 ring-cyan-500/30" : "hover:bg-slate-850 active:bg-slate-800"
              }`}
            >
              {/* Row 1: Symbol + Star + Price */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSaveContract(c.symbol);
                    }}
                    className="text-slate-600 hover:text-amber-400"
                  >
                    <Star className={`w-3.5 h-3.5 ${isSaved ? "text-amber-400 fill-amber-400" : ""}`} />
                  </button>
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>{c.displayName || c.symbol}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-semibold border border-slate-700">
                        {c.contract_type === "PERPETUAL" ? "PERP" : "FUT"}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {c.market_data_provider || c.provider} • {c.underlying}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-white text-xs">
                    {c.last_price != null ? formatPrice(c.last_price, currency) : "N/A"}
                  </div>
                  <div className={`text-[10px] font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                    {isPositive ? "+" : ""}
                    {changePct.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Row 2: Bid / Ask / Funding */}
              <div className="grid grid-cols-3 gap-1 p-2 bg-slate-900/80 rounded-lg border border-slate-800 text-[10px]">
                <div>
                  <span className="text-slate-500 block">Bid</span>
                  <span className="text-emerald-400 font-bold">{c.bid != null ? formatPrice(c.bid, currency) : "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Ask</span>
                  <span className="text-rose-400 font-bold">{c.ask != null ? formatPrice(c.ask, currency) : "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Funding</span>
                  <span className={fundingApr != null && fundingApr >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {fundingApr != null ? `${fundingApr.toFixed(2)}%` : "—"}
                  </span>
                </div>
              </div>

              {/* Row 3: Action Buttons */}
              <div
                className="flex items-center gap-2 pt-1 border-t border-slate-800/60"
                onClick={(e) => e.stopPropagation()}
              >
                {isDataOnly ? (
                  <div className="w-full flex items-center justify-between text-[10px] text-slate-500">
                    <span>Data Only Feed</span>
                    <button
                      type="button"
                      onClick={() => onSelectContract(c)}
                      className="px-3 py-1 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700"
                    >
                      View Details
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        if (onTrade) onTrade(e, c, "BUY");
                        else {
                          setSelectedContract(c);
                          setOrderReviewOpen(true, c, "BUY");
                        }
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 text-xs font-bold font-mono transition text-center"
                    >
                      BUY / LONG
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        if (onTrade) onTrade(e, c, "SELL");
                        else {
                          setSelectedContract(c);
                          setOrderReviewOpen(true, c, "SELL");
                        }
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-rose-500/20 active:bg-rose-500/30 text-rose-400 border border-rose-500/50 text-xs font-bold font-mono transition text-center"
                    >
                      SELL / SHORT
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
