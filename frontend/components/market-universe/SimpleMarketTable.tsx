"use client";

import React, { useState, useEffect, memo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  Zap,
  TrendingUp,
  ExternalLink,
  Layers,
} from "lucide-react";
import { MarketInstrument } from "@/types/market-universe";
import { formatPrice, formatPercent, formatVolume, formatQuantity, formatNumber, formatMoney } from "@/lib/formatters";
import { useMarketGatewayContext } from "@/context/MarketGatewayContext";
import { useSymbolQuote } from "@/lib/market-data/market-feed-store";
import { getMarketRowStatus, normalizeProvider } from "@/lib/market-data/row-status";

interface SimpleMarketTableProps {
  instruments: MarketInstrument[];
  selectedInstrument: MarketInstrument | null;
  onSelectInstrument?: (inst: MarketInstrument) => void;
  onToggleWatchlist?: (inst: MarketInstrument) => void;
  watchlistSymbols?: Set<string>;
  activeCategory?: string;
  density?: "compact" | "comfortable";
  showColumnSettings?: boolean;
  onCloseColumnSettings?: () => void;
  onOpenOptions?: (underlying: string, exchange?: string, provider?: string) => void;
  onOpenTrade?: (inst: MarketInstrument) => void;
}

export const COMPREHENSIVE_OPTION_UNDERLYINGS = new Set([
  // Major Indian Indices
  "NIFTY",
  "NIFTY50",
  "NIFTY 50",
  "BANKNIFTY",
  "FINNIFTY",
  "MIDCPNIFTY",
  "SENSEX",
  "BANKEX",
  // Top F&O Stocks (NSE / Dhan)
  "RELIANCE",
  "TCS",
  "INFY",
  "HDFCBANK",
  "ICICIBANK",
  "SBIN",
  "BHARTIARTL",
  "ITC",
  "KOTAKBANK",
  "LT",
  "AXISBANK",
  "TATAMOTORS",
  "BAJFINANCE",
  "MARUTI",
  "SUNPHARMA",
  "ASIANPAINT",
  "TITAN",
  "HCLTECH",
  "WIPRO",
  "NTPC",
  "ONGC",
  "POWERGRID",
  "TATACONSUM",
  "ULTRACEMCO",
  "JSWSTEEL",
  "TATASTEEL",
  "COALINDIA",
  "ADANIENT",
  "ADANIPORTS",
  "HINDALCO",
  "TECHM",
  "DRREDDY",
  "CIPLA",
  "DIVISLAB",
  "EICHERMOT",
  "GRASIM",
  "HEROMOTOCO",
  "HINDUNILVR",
  "INDUSINDBK",
  "NESTLEIND",
  "SBILIFE",
  "HDFCLIFE",
  "BAJAJFINSV",
  "BPCL",
  "APOLLOHOSP",
  "BRITANNIA",
  "M&M",
  "VEDL",
  "DLF",
  "PIDILITIND",
  "SIEMENS",
  "HAL",
  "BEL",
  "ZOMATO",
  // Crypto Derivatives (Delta / Binance / Deribit)
  "BTC",
  "BTCUSDT",
  "ETH",
  "ETHUSDT",
  "SOL",
  "SOLUSDT",
  "XRP",
  "XRPUSDT",
  "BNB",
  "BNBUSDT",
  "DOGE",
  "DOGEUSDT",
]);

export function resolveOptionUnderlying(inst: MarketInstrument): {
  hasOptions: boolean;
  cleanUnderlying: string;
  exchange: string;
  provider: string;
} {
  const sym = (inst.canonical_symbol || inst.provider_symbol || inst.symbol || "").toUpperCase();
  const rawClean = sym
    .replace(/^BINANCE:/, "")
    .replace(/^NSE:/, "")
    .replace(/^BSE:/, "")
    .replace(/^MCX:/, "")
    .replace(/^DELTA:/, "")
    .replace(/^OANDA:/, "")
    .split("/")[0]
    .split("-")[0]
    .split(" ")[0]
    .replace(/USDT$/, "")
    .replace(/USD$/, "")
    .trim();

  const explicitOptions =
    (inst as any).has_options === true ||
    inst.asset_class === "OPTIONS" ||
    (Array.isArray((inst as any).derivative_types) && (inst as any).derivative_types.includes("OPTIONS"));

  const isMatched =
    COMPREHENSIVE_OPTION_UNDERLYINGS.has(rawClean) ||
    COMPREHENSIVE_OPTION_UNDERLYINGS.has(sym) ||
    COMPREHENSIVE_OPTION_UNDERLYINGS.has((inst.symbol || "").toUpperCase()) ||
    COMPREHENSIVE_OPTION_UNDERLYINGS.has(((inst as any).underlying || "").toUpperCase());

  const hasOptions = explicitOptions || isMatched;
  const cleanUnderlying = ((inst as any).underlying || rawClean || sym).toUpperCase();
  const isCrypto = ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE"].includes(cleanUnderlying);
  const exchange = inst.exchange || (isCrypto ? "DELTA" : "NSE");
  const provider = isCrypto ? "DELTA_INDIA" : "DHAN";

  return {
    hasOptions,
    cleanUnderlying,
    exchange,
    provider,
  };
}

export function SimpleMarketTable({
  instruments = [],
  selectedInstrument,
  onSelectInstrument,
  onToggleWatchlist,
  watchlistSymbols = new Set(),
  activeCategory = "ALL",
  density = "compact",
  showColumnSettings = false,
  onCloseColumnSettings,
  onOpenOptions,
  onOpenTrade,
}: SimpleMarketTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<string>("volume_24h");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [hiddenCols, setHiddenCols] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("markets_hidden_cols_v4");
      if (saved) setHiddenCols(JSON.parse(saved));
    } catch {}
  }, []);

  const toggleColumnVisibility = (colId: string) => {
    const next = { ...hiddenCols, [colId]: !hiddenCols[colId] };
    setHiddenCols(next);
    try {
      localStorage.setItem("markets_hidden_cols_v4", JSON.stringify(next));
    } catch {}
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Sort comparator
  const sortedInstruments = [...instruments].sort((a, b) => {
    const rowA = a as unknown as Record<string, any>;
    const rowB = b as unknown as Record<string, any>;
    const valA = rowA[sortField] ?? 0;
    const valB = rowB[sortField] ?? 0;
    if (typeof valA === "string" && typeof valB === "string") {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    const numA = typeof valA === "number" ? valA : (typeof valA === "boolean" ? (valA ? 1 : 0) : 0);
    const numB = typeof valB === "number" ? valB : (typeof valB === "boolean" ? (valB ? 1 : 0) : 0);
    return sortAsc ? numA - numB : numB - numA;
  });

  const renderSortHeader = (label: string, field: string, align: "left" | "right" | "center" = "left") => {
    const isSorted = sortField === field;
    return (
      <button
        type="button"
        className={`flex items-center gap-1.5 cursor-pointer select-none transition-colors group/header ${
          align === "right" ? "justify-end ml-auto" : align === "center" ? "justify-center mx-auto" : "justify-start"
        } ${isSorted ? "text-cyan-400 font-black" : "hover:text-cyan-300 text-slate-200"}`}
        onClick={() => handleSort(field)}
      >
        <span>{label}</span>
        {isSorted ? (
          sortAsc ? (
            <ArrowUp className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40 group-hover/header:opacity-100 shrink-0 text-slate-400" />
        )}
      </button>
    );
  };

  const cat = activeCategory.toUpperCase();

  const handleLaunchOptionChain = (sym: string, exchange?: string, provider?: string) => {
    const cleanSym = sym.split(" ")[0].split("-")[0].replace("/", "").toUpperCase();
    if (onOpenOptions) {
      onOpenOptions(cleanSym, exchange, provider);
    } else {
      const params = new URLSearchParams({ underlying: cleanSym });
      if (exchange) params.append("exchange", exchange);
      if (provider) params.append("provider", provider);
      router.push(`/trading/options?${params.toString()}`);
    }
  };

  const handleLaunchTrade = (inst: MarketInstrument) => {
    if (onOpenTrade) {
      onOpenTrade(inst);
    } else {
      router.push(`/trading/options?underlying=${encodeURIComponent(inst.canonical_symbol || inst.symbol || "NIFTY")}`);
    }
  };

  return (
    <div className="space-y-3.5 font-sans select-none w-full min-w-0">
      {/* Column Customizer Panel */}
      {showColumnSettings && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#080E20] border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-[13px] font-mono text-cyan-400 font-bold">
            <span>CUSTOMIZE ACTIVE COLUMNS ({cat}):</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[13px] font-mono">
            {["volume", "bid_ask", "high_low", "trend", "oi"].map((c) => (
              <label key={c} className="flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white font-medium">
                <input
                  type="checkbox"
                  checked={!hiddenCols[c]}
                  onChange={() => toggleColumnVisibility(c)}
                  className="accent-cyan-400 rounded w-4 h-4"
                />
                <span className="capitalize">{c.replace("_", " ")}</span>
              </label>
            ))}
          </div>

          {onCloseColumnSettings && (
            <button
              onClick={onCloseColumnSettings}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
            >
              Done
            </button>
          )}
        </div>
      )}

      {/* Main Full-Width Dynamic Table Container */}
      <div className="w-full bg-[#0B132B]/90 border border-slate-800/90 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto custom-scrollbar max-h-[750px] w-full">
          <table className="w-full text-left border-collapse text-xs font-mono">
            {/* Sticky Table Header with Dedicated OPTIONS Column */}
            <thead className="sticky top-0 z-20 bg-[#080E20] border-b border-slate-800/90 text-[13.5px] sm:text-[14px] text-slate-200 uppercase font-bold tracking-wider">
              <tr>
                {/* Watchlist Star Column */}
                <th className="py-3.5 px-3 w-12 text-center text-slate-400 font-bold">★</th>

                {/* DYNAMIC COLUMNS BY ASSET CLASS */}
                {cat === "STOCKS" ? (
                  <>
                    <th className="py-3.5 px-4 min-w-[240px]">{renderSortHeader("Symbol / Name", "canonical_symbol")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[130px]">{renderSortHeader("Price (LTP)", "last_price", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("24H Change %", "change_pct_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Open", "open", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("High", "high_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Low", "low_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Volume", "volume_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[130px]">Bid / Ask</th>
                    <th className="py-3.5 px-4 text-center min-w-[100px]">{renderSortHeader("Status", "data_status", "center")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Options</th>
                    <th className="py-3.5 px-5 text-right min-w-[100px]">Action</th>
                  </>
                ) : cat === "FUTURES" ? (
                  <>
                    <th className="py-3.5 px-4 min-w-[180px]">{renderSortHeader("Underlying", "canonical_symbol")}</th>
                    <th className="py-3.5 px-4 min-w-[180px]">{renderSortHeader("Contract", "display_symbol")}</th>
                    <th className="py-3.5 px-4 min-w-[110px]">{renderSortHeader("Expiry", "expiry")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[130px]">{renderSortHeader("Price (LTP)", "last_price", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Change %", "change_pct_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[130px]">Bid / Ask</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Volume", "volume_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("OI", "open_interest", "right")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[90px]">Lot Size</th>
                    <th className="py-3.5 px-4 text-center min-w-[100px]">{renderSortHeader("Status", "data_status", "center")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Options</th>
                    <th className="py-3.5 px-5 text-right min-w-[100px]">Action</th>
                  </>
                ) : cat === "OPTIONS" ? (
                  <>
                    <th className="py-3.5 px-4 min-w-[180px]">{renderSortHeader("Underlying", "canonical_symbol")}</th>
                    <th className="py-3.5 px-4 min-w-[110px]">{renderSortHeader("Expiry", "expiry")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Strike", "strike", "right")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[80px]">Type</th>
                    <th className="py-3.5 px-4 text-right min-w-[130px]">{renderSortHeader("Price (LTP)", "last_price", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Change %", "change_pct_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[130px]">Bid / Ask</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Volume", "volume_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("OI", "open_interest", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[90px]">{renderSortHeader("IV", "implied_volatility", "right")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[100px]">{renderSortHeader("Status", "data_status", "center")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Options</th>
                    <th className="py-3.5 px-5 text-right min-w-[100px]">Action</th>
                  </>
                ) : cat === "CRYPTO" ? (
                  <>
                    <th className="py-3.5 px-4 min-w-[240px]">{renderSortHeader("Pair", "canonical_symbol")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[130px]">{renderSortHeader("Price (LTP)", "last_price", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("24H %", "change_pct_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("24H High", "high_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("24H Low", "low_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Volume", "volume_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[130px]">Bid / Ask</th>
                    <th className="py-3.5 px-4 text-right min-w-[100px]">{renderSortHeader("Funding", "funding_rate", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("OI", "open_interest", "right")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[100px]">{renderSortHeader("Status", "data_status", "center")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Options</th>
                    <th className="py-3.5 px-5 text-right min-w-[100px]">Action</th>
                  </>
                ) : cat === "FOREX" ? (
                  <>
                    <th className="py-3.5 px-4 min-w-[220px]">{renderSortHeader("Currency Pair", "canonical_symbol")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Bid", "bid", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Ask", "ask", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[130px]">{renderSortHeader("Mid Rate", "last_price", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Change %", "change_pct_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Day High", "high_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Day Low", "low_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[100px]">{renderSortHeader("Status", "data_status", "center")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Options</th>
                    <th className="py-3.5 px-5 text-right min-w-[100px]">Action</th>
                  </>
                ) : cat === "INDICES" ? (
                  <>
                    <th className="py-3.5 px-4 min-w-[240px]">{renderSortHeader("Index Name", "canonical_symbol")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[130px]">{renderSortHeader("Price (LTP)", "last_price", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Change", "change_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Change %", "change_pct_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Open", "open", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("High", "high_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Low", "low_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[100px]">{renderSortHeader("Status", "data_status", "center")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Options</th>
                    <th className="py-3.5 px-5 text-right min-w-[100px]">Action</th>
                  </>
                ) : (
                  /* ALL / DEFAULT UNIVERSAL FULL-WIDTH COLUMNS */
                  <>
                    <th className="py-3.5 px-4 min-w-[260px]">{renderSortHeader("Instrument", "canonical_symbol")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[100px]">{renderSortHeader("Asset", "asset_class", "center")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[130px]">{renderSortHeader("Price (LTP)", "last_price", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Change %", "change_pct_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">{renderSortHeader("Volume", "volume_24h", "right")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[110px]">{renderSortHeader("Market", "exchange", "center")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[110px]">Trend</th>
                    <th className="py-3.5 px-4 text-center min-w-[100px]">{renderSortHeader("Status", "data_status", "center")}</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Options</th>
                    <th className="py-3.5 px-5 text-right min-w-[100px]">Action</th>
                  </>
                )}
              </tr>
            </thead>

            {/* Table Body Rows */}
            <tbody className="divide-y divide-slate-800/60">
              {sortedInstruments.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500 font-mono">
                    <p className="text-sm">No instruments match your current filters.</p>
                    <p className="text-xs text-slate-600 mt-1">Try switching category tabs or resetting filters.</p>
                  </td>
                </tr>
              ) : (
                sortedInstruments.map((inst) => {
                  const isSelected =
                    selectedInstrument?.canonical_symbol === inst.canonical_symbol ||
                    selectedInstrument?.instrument_id === inst.instrument_id;
                  const isStar =
                    watchlistSymbols.has(inst.canonical_symbol) ||
                    watchlistSymbols.has(inst.instrument_id) ||
                    watchlistSymbols.has(inst.symbol || "");

                  return (
                    <MemoizedMarketRow
                      key={inst.instrument_id || inst.canonical_symbol || inst.symbol}
                      instrument={inst}
                      isSelected={isSelected}
                      isStar={isStar}
                      category={cat}
                      density={density}
                      onSelect={() => onSelectInstrument?.(inst)}
                      onToggleWatchlist={() => onToggleWatchlist?.(inst)}
                      onLaunchOptionChain={() => {
                        const opt = resolveOptionUnderlying(inst);
                        handleLaunchOptionChain(opt.cleanUnderlying, opt.exchange, opt.provider);
                      }}
                      onLaunchTrade={() => handleLaunchTrade(inst)}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface MarketRowProps {
  instrument: MarketInstrument;
  isSelected: boolean;
  isStar: boolean;
  category: string;
  density: "compact" | "comfortable";
  onSelect: () => void;
  onToggleWatchlist: () => void;
  onLaunchOptionChain: () => void;
  onLaunchTrade: () => void;
}

const MemoizedMarketRow = memo(function MarketRow({
  instrument,
  isSelected,
  isStar,
  category,
  density,
  onSelect,
  onToggleWatchlist,
  onLaunchOptionChain,
  onLaunchTrade,
}: MarketRowProps) {
  const { getQuote, connectionStatus, providerHealth } = useMarketGatewayContext();
  const sym = instrument.canonical_symbol || instrument.provider_symbol || instrument.symbol || "UNKNOWN";
  const name = instrument.company_name || instrument.name || sym;
  const currSymbol = instrument.currency === "INR" ? "₹" : "$";

  // Reactive subscription to real-time live ticks for this instrument
  const liveTick = useSymbolQuote(sym);

  // Derive authoritative raw quote from reactive tick or gateway context cache
  const rawQuote = liveTick ? {
    symbol: liveTick.symbol,
    exchange: liveTick.exchange,
    provider: liveTick.provider,
    last_price: liveTick.lastPrice,
    bid: liveTick.bid,
    ask: liveTick.ask,
    volume: liveTick.volume,
    high: liveTick.high,
    low: liveTick.low,
    open: liveTick.open,
    close: liveTick.close,
    change: liveTick.change,
    change_pct: liveTick.changePercent,
    is_stale: liveTick.isStale,
    age_seconds: (liveTick.ageMs || 0) / 1000,
    event_timestamp: liveTick.eventTimestamp,
    received_timestamp: liveTick.receivedTimestamp,
    status: liveTick.status,
  } : (
    getQuote(sym) ||
    (instrument.canonical_symbol ? getQuote(instrument.canonical_symbol) : null) ||
    (instrument.symbol ? getQuote(instrument.symbol) : null)
  );

  // Derive active healthy providers from gateway
  const healthyProvidersSet = React.useMemo(() => {
    const set = new Set<string>();
    if (providerHealth && providerHealth.length > 0) {
      providerHealth.forEach((p) => {
        const s = (p.status || "").toUpperCase();
        if (["LIVE", "UP", "ACTIVE", "READY", "AUTHENTICATED", "PUBLIC_FEED", "CONNECTED", "DELAYED"].includes(s)) {
          const norm = normalizeProvider(p.provider_id);
          if (norm) set.add(norm.toUpperCase());
        }
      });
    }
    return set;
  }, [providerHealth]);

  const rowStatus = getMarketRowStatus({
    instrument,
    rawQuote,
    healthyProviders: healthyProvidersSet,
    connectionStatus,
  });

  const liveQuote = rawQuote;
  const hasLivePrice = liveQuote != null && liveQuote.last_price != null && liveQuote.last_price > 0;
  const price = hasLivePrice ? liveQuote.last_price : instrument.last_price;
  
  // Calculate dynamic change and % based on validated previous close
  const prevClose = (liveQuote as any)?.previous_close || liveQuote?.close || liveQuote?.open || (instrument as any).previous_close || (price && liveQuote?.change_pct ? price / (1 + liveQuote.change_pct / 100) : price);
  const changePct = liveQuote?.change_pct != null 
    ? liveQuote.change_pct 
    : (prevClose && prevClose > 0 && price ? ((price - prevClose) / prevClose) * 100 : (instrument.change_pct_24h ?? instrument.change_24h ?? 0));
  const isPositive = changePct >= 0;
  const pyClass = density === "compact" ? "py-2.5" : "py-3.5";

  const bid = liveQuote?.bid != null && liveQuote.bid > 0 ? liveQuote.bid : instrument.bid;
  const ask = liveQuote?.ask != null && liveQuote.ask > 0 ? liveQuote.ask : instrument.ask;
  const volume = liveQuote?.volume != null && liveQuote.volume > 0 ? liveQuote.volume : instrument.volume_24h;
  const high24h = liveQuote?.high ?? instrument.high_24h;
  const low24h = liveQuote?.low ?? instrument.low_24h;
  const openPrice = liveQuote?.open ?? (instrument as any).open;

  const dataAgeSec = liveQuote?.age_seconds ?? 999;
  const isStaleFeed = rowStatus.isStale;
  const isLiveFeed = rowStatus.isLive;
  const flash = liveTick?.flashDirection;

  // Truthful provider status badge
  const statusBadge =
    rowStatus.state === "closed" ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-bold bg-slate-800/90 text-slate-300 border border-slate-700 whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
        {rowStatus.label}
      </span>
    ) : rowStatus.state === "live" ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)] whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        {rowStatus.label}
      </span>
    ) : rowStatus.state === "stale" ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
        {rowStatus.label}
      </span>
    ) : rowStatus.state === "reconnecting" ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 animate-pulse whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
        {rowStatus.label}
      </span>
    ) : rowStatus.state === "connected" ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/40 whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
        {rowStatus.label}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-bold bg-slate-800/80 text-slate-400 border border-slate-700/80 whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
        {rowStatus.label || "NO LIVE PROVIDER"}
      </span>
    );

  // Trend determination based on calculated change
  const trend =
    changePct > 0.05
      ? { label: "↑ Bullish", color: "text-emerald-400" }
      : changePct < -0.05
      ? { label: "↓ Bearish", color: "text-rose-400" }
      : { label: "→ Neutral", color: "text-slate-400" };

  const optInfo = resolveOptionUnderlying(instrument);

  // Dedicated Options Button / Badge
  const optionsCell = (
    <td className="px-4 text-center">
      {optInfo.hasOptions ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLaunchOptionChain();
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 text-[12.5px] font-bold transition shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          title="Open live option chain"
        >
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span>⌁ Chain</span>
        </button>
      ) : (
        <span
          className="text-[12px] text-slate-500 font-medium select-none cursor-default"
          title="No supported options available for this instrument"
        >
          — No Options —
        </span>
      )}
    </td>
  );

  // Dedicated Action / Trade Button
  const actionCell = (
    <td className="px-5 text-right">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onLaunchTrade();
        }}
        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[12.5px] font-bold transition shadow-sm hover:scale-[1.02] active:scale-[0.98] ml-auto"
        title="Trade Instrument"
      >
        <Zap className="w-3.5 h-3.5 text-cyan-400" />
        <span>Trade</span>
      </button>
    </td>
  );

  return (
    <tr
      className={`transition-all ${pyClass} hover:bg-slate-900/70 border-b border-slate-800/60 text-slate-200`}
    >
      {/* Star button */}
      <td
        className="px-3 text-center"
        onClick={(e) => {
          e.stopPropagation();
          onToggleWatchlist();
        }}
      >
        <Star
          className={`w-4 h-4 mx-auto transition-transform hover:scale-125 cursor-pointer ${
            isStar ? "text-amber-400 fill-amber-400" : "text-slate-600 hover:text-slate-400"
          }`}
        />
      </td>

      {/* DYNAMIC ROW RENDERING BY CATEGORY */}
      {category === "STOCKS" ? (
        <>
          <td className="px-4 py-3">
            <div className="font-bold text-[15px] text-white tracking-wide">{sym}</div>
            <div className="text-[12px] text-slate-400 font-normal truncate max-w-[260px]">{name}</div>
          </td>
          <td className="px-4 text-right font-mono font-bold text-[15.5px] text-white tracking-tight">{formatPrice(price, currSymbol)}</td>
          <td className={`px-4 text-right font-mono font-bold text-[14.5px] ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-4 text-right font-mono text-[13.5px] text-slate-300">{formatPrice(openPrice, currSymbol)}</td>
          <td className="px-4 text-right font-mono text-[13.5px] text-slate-300">{formatPrice(high24h, currSymbol)}</td>
          <td className="px-4 text-right font-mono text-[13.5px] text-slate-300">{formatPrice(low24h, currSymbol)}</td>
          <td className="px-4 text-right font-mono font-medium text-[14px] text-slate-200">{formatVolume(volume)}</td>
          <td className="px-4 text-center font-mono text-[12.5px] text-slate-300">
            {formatPrice(bid, currSymbol, undefined, "—")} / {formatPrice(ask, currSymbol, undefined, "—")}
          </td>
          <td className="px-4 text-center" title={`Data age: ${Math.round(dataAgeSec * 1000)}ms`}>{statusBadge}</td>
          {optionsCell}
          {actionCell}
        </>
      ) : category === "FUTURES" ? (
        <>
          <td className="px-4 py-3 font-bold text-[15px] text-cyan-300">{sym.split("-")[0] || sym}</td>
          <td className="px-4 font-mono font-bold text-[13.5px] text-white">{sym}</td>
          <td className="px-4 text-[13px] text-slate-300">{instrument.expiry || "Near Month"}</td>
          <td className="px-4 text-right font-mono font-bold text-[15.5px] text-white tracking-tight">{formatPrice(price, currSymbol)}</td>
          <td className={`px-4 text-right font-mono font-bold text-[14.5px] ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-4 text-center font-mono text-[12.5px] text-slate-300">
            {formatPrice(bid, currSymbol, undefined, "—")} / {formatPrice(ask, currSymbol, undefined, "—")}
          </td>
          <td className="px-4 text-right font-mono font-medium text-[14px] text-slate-200">{formatVolume(volume)}</td>
          <td className="px-4 text-right font-mono font-medium text-[13.5px] text-slate-200">{instrument.open_interest ? formatQuantity(instrument.open_interest) : "—"}</td>
          <td className="px-4 text-center text-slate-200 font-bold text-[13px]">{instrument.lot_size || 1}</td>
          <td className="px-4 text-center" title={`Data age: ${Math.round(dataAgeSec * 1000)}ms`}>{statusBadge}</td>
          {optionsCell}
          {actionCell}
        </>
      ) : category === "OPTIONS" ? (
        <>
          <td className="px-4 py-3 font-bold text-[15px] text-cyan-300">{sym.split(" ")[0] || sym.split("-")[0] || sym}</td>
          <td className="px-4 text-[13px] text-slate-300">{instrument.expiry || "Weekly"}</td>
          <td className="px-4 text-right font-mono font-bold text-[15px] text-white">{formatPrice(instrument.strike)}</td>
          <td className="px-4 text-center">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-black ${
                (instrument.option_type || sym).includes("CE") || (instrument.option_type || sym).includes("-C")
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}
            >
              {(instrument.option_type || sym).includes("PE") || (instrument.option_type || sym).includes("-P") ? "PE" : "CE"}
            </span>
          </td>
          <td className="px-4 text-right font-mono font-bold text-[15.5px] text-white tracking-tight">{formatPrice(price, currSymbol)}</td>
          <td className={`px-4 text-right font-mono font-bold text-[14.5px] ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-4 text-center font-mono text-[12.5px] text-slate-300">
            {formatPrice(bid, currSymbol, undefined, "—")} / {formatPrice(ask, currSymbol, undefined, "—")}
          </td>
          <td className="px-4 text-right font-mono font-medium text-[14px] text-slate-200">{formatVolume(volume)}</td>
          <td className="px-4 text-right font-mono font-medium text-[13.5px] text-slate-200">{instrument.open_interest ? formatQuantity(instrument.open_interest) : "—"}</td>
          <td className="px-4 text-right font-mono font-bold text-[13px] text-amber-400">{instrument.implied_volatility ? `${instrument.implied_volatility.toFixed(1)}%` : "—"}</td>
          <td className="px-4 text-center" title={`Data age: ${Math.round(dataAgeSec * 1000)}ms`}>{statusBadge}</td>
          {optionsCell}
          {actionCell}
        </>
      ) : category === "CRYPTO" ? (
        <>
          <td className="px-4 py-3">
            <div className="font-bold text-[15px] text-white tracking-wide">{sym}</div>
            <div className="text-[12px] text-slate-400 font-normal truncate max-w-[260px]">{name}</div>
          </td>
          <td className="px-4 text-right font-mono font-bold text-[15.5px] text-white tracking-tight">{formatPrice(price, currSymbol)}</td>
          <td className={`px-4 text-right font-mono font-bold text-[14.5px] ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-4 text-right font-mono text-[13.5px] text-slate-300">{formatPrice(high24h, currSymbol)}</td>
          <td className="px-4 text-right font-mono text-[13.5px] text-slate-300">{formatPrice(low24h, currSymbol)}</td>
          <td className="px-4 text-right font-mono font-medium text-[14px] text-slate-200">{formatVolume(volume)}</td>
          <td className="px-4 text-center font-mono text-[12.5px] text-slate-300">
            {formatPrice(bid, currSymbol, undefined, "—")} / {formatPrice(ask, currSymbol, undefined, "—")}
          </td>
          <td className="px-4 text-right font-mono font-bold text-[13px] text-emerald-400">
            {instrument.funding_rate != null ? `${(instrument.funding_rate * 100).toFixed(4)}%` : "—"}
          </td>
          <td className="px-4 text-right font-mono font-medium text-[13.5px] text-slate-200">{instrument.open_interest ? formatQuantity(instrument.open_interest) : "—"}</td>
          <td className="px-4 text-center" title={`Data age: ${Math.round(dataAgeSec * 1000)}ms`}>{statusBadge}</td>
          {optionsCell}
          {actionCell}
        </>
      ) : category === "FOREX" ? (
        <>
          <td className="px-4 py-3 font-bold text-[15px] text-cyan-300">{sym}</td>
          <td className="px-4 text-right font-mono font-bold text-[14.5px] text-emerald-400">{formatPrice(bid, "", 4)}</td>
          <td className="px-4 text-right font-mono font-bold text-[14.5px] text-rose-400">{formatPrice(ask, "", 4)}</td>
          <td className="px-4 text-right font-mono font-bold text-[15.5px] text-white tracking-tight">{formatPrice(price, "", 4)}</td>
          <td className={`px-4 text-right font-mono font-bold text-[14.5px] ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-4 text-right font-mono font-medium text-[13.5px] text-slate-300">{formatPrice(high24h, "", 4)}</td>
          <td className="px-4 text-right font-mono font-medium text-[13.5px] text-slate-300">{formatPrice(low24h, "", 4)}</td>
          <td className="px-4 text-center" title={`Data age: ${Math.round(dataAgeSec * 1000)}ms`}>{statusBadge}</td>
          {optionsCell}
          {actionCell}
        </>
      ) : category === "INDICES" ? (
        <>
          <td className="px-4 py-3">
            <div className="font-bold text-[15px] text-white tracking-wide">{sym}</div>
            <div className="text-[12px] text-slate-400 font-normal truncate max-w-[260px]">{name}</div>
          </td>
          <td className="px-4 text-right font-mono font-bold text-[15.5px] text-white tracking-tight">{formatPrice(price, currSymbol)}</td>
          <td className={`px-4 text-right font-mono font-bold text-[14.5px] ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPrice(instrument.change_24h ?? 0, currSymbol, undefined, "—")}
          </td>
          <td className={`px-4 text-right font-mono font-bold text-[14.5px] ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-4 text-right font-mono font-medium text-[13.5px] text-slate-300">{formatPrice(openPrice, currSymbol)}</td>
          <td className="px-4 text-right font-mono font-medium text-[13.5px] text-slate-300">{formatPrice(high24h, currSymbol)}</td>
          <td className="px-4 text-right font-mono font-medium text-[13.5px] text-slate-300">{formatPrice(low24h, currSymbol)}</td>
          <td className="px-4 text-center" title={`Data age: ${Math.round(dataAgeSec * 1000)}ms`}>{statusBadge}</td>
          {optionsCell}
          {actionCell}
        </>
      ) : category === "FUNDS" ? (
        <>
          <td className="px-3">
            <div className="font-bold text-cyan-300">{sym}</div>
            <div className="text-[10px] text-slate-400">{name}</div>
          </td>
          <td className="px-3 text-right font-bold text-white">{formatPrice(price, currSymbol)}</td>
          <td className={`px-3 text-right font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-3 text-center text-slate-300">Equity Index Fund</td>
          <td className="px-3 text-center text-slate-400">{instrument.data_source || "GLOBAL"}</td>
          <td className="px-3 text-center">{statusBadge}</td>
        </>
      ) : category === "BONDS" ? (
        <>
          <td className="px-3 font-bold text-cyan-300">{sym}</td>
          <td className="px-3 text-right font-bold text-emerald-400">{price ? `${price.toFixed(3)}%` : "4.250%"}</td>
          <td className="px-3 text-right font-bold text-white">{formatPrice(price, "$")}</td>
          <td className={`px-3 text-right font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-3 text-center text-slate-300">10 Years</td>
          <td className="px-3 text-center text-slate-400">{instrument.data_source || "TREASURY"}</td>
          <td className="px-3 text-center">{statusBadge}</td>
        </>
      ) : category === "ECONOMY" ? (
        <>
          <td className="px-4 py-3 font-bold text-[15px] text-cyan-300">{sym}</td>
          <td className="px-4 text-right font-mono font-bold text-[15.5px] text-white tracking-tight">{formatNumber(price, 2)}</td>
          <td className="px-4 text-right font-mono font-medium text-[13.5px] text-slate-300">{formatNumber(high24h, 2)}</td>
          <td className={`px-4 text-right font-mono font-bold text-[14.5px] ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-4 text-center font-medium text-[13.5px] text-slate-300">Monthly</td>
          <td className="px-4 text-center font-medium text-[13.5px] text-slate-300">{instrument.country || "Global"}</td>
          <td className="px-4 text-center font-medium text-[13.5px] text-slate-400">{instrument.data_source || "FRED / MOSPI"}</td>
          <td className="px-4 text-center" title={`Data age: ${Math.round(dataAgeSec * 1000)}ms`}>{statusBadge}</td>
          {optionsCell}
          {actionCell}
        </>
      ) : (
        /* ALL / DEFAULT UNIVERSAL COLUMNS */
        <>
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[15px] text-white tracking-wide">{sym}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                {instrument.exchange || "GLOBAL"}
              </span>
            </div>
            <div className="text-[12px] text-slate-400 font-normal truncate max-w-[260px] mt-0.5">{name}</div>
          </td>
          <td className="px-4 text-center">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {instrument.asset_class || "CRYPTO"}
            </span>
          </td>
          <td className="px-4 text-right font-mono font-bold text-[15.5px] text-white tracking-tight">{formatPrice(price, currSymbol)}</td>
          <td className={`px-4 text-right font-mono font-bold text-[14.5px] ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPercent(changePct, 2, true)}
          </td>
          <td className="px-4 text-right font-mono font-medium text-[14px] text-slate-200">{formatVolume(volume)}</td>
          <td className="px-4 text-center font-medium text-[13.5px] text-slate-300">{instrument.exchange || "BINANCE"}</td>
          <td className={`px-4 text-center font-medium text-[14px] ${trend.color}`} title="Trend calculated from EMA alignment & momentum">
            {trend.label}
          </td>
          <td className="px-4 text-center" title={`Provider: ${instrument.data_source || 'FEED'} • Age: ${Math.round(dataAgeSec * 1000)}ms`}>
            {statusBadge}
          </td>
          {optionsCell}
          {actionCell}
        </>
      )}
    </tr>
  );
});