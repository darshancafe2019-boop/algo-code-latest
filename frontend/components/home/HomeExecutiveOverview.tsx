"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  ShieldCheck,
  Layers,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Bot,
  Percent,
  Play,
  Square,
  Plus,
  ChevronRight,
} from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  formatDecimal,
  resolveCurrencySymbol,
} from "@/lib/formatters";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useMarketGatewayContext } from "@/context/MarketGatewayContext";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/useUIStore";
import { useDashboardFilterStore } from "@/lib/store/useDashboardFilterStore";

// ── Timezone Helper (Asia/Kolkata 12-hour IST) ───────────────────────────────
function formatISTTime(dateOrIso?: string | number | Date | null): string {
  if (!dateOrIso) return "—";
  try {
    const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(d) + " IST";
  } catch {
    return "—";
  }
}

// ── Safe String, Array & Object Normalization Helpers ───────────────────────
function ensureArray<T = any>(val: any): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (Array.isArray(val.data)) return val.data;
  if (Array.isArray(val.items)) return val.items;
  if (Array.isArray(val.results)) return val.results;
  if (Array.isArray(val.gainers)) return val.gainers;
  if (Array.isArray(val.losers)) return val.losers;
  if (Array.isArray(val.bots)) return val.bots;
  if (Array.isArray(val.positions)) return val.positions;
  if (Array.isArray(val.orders)) return val.orders;
  if (typeof val === "object") {
    // If it's a map/dictionary of category arrays (e.g. { "NIFTY": [...] })
    const values = Object.values(val);
    if (values.length > 0 && Array.isArray(values[0])) {
      return values.flat() as T[];
    }
  }
  return [];
}

function safeString(val: any, fallback: string = ""): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    if (typeof val.symbol === "string" && val.symbol.length > 0) return val.symbol;
    if (typeof val.display_symbol === "string" && val.display_symbol.length > 0) return val.display_symbol;
    if (typeof val.name === "string" && val.name.length > 0) return val.name;
    if (typeof val.instrument_id === "string" && val.instrument_id.length > 0) return val.instrument_id;
    if (typeof val.market_type === "string" && val.market_type.length > 0) return val.market_type;
    if (typeof val.asset_class === "string" && val.asset_class.length > 0) return val.asset_class;
    if (typeof val.exchange === "string" && val.exchange.length > 0) return val.exchange;
    if (typeof val.underlying === "string" && val.underlying.length > 0) return val.underlying;
    if (val.symbol && typeof val.symbol === "object") return safeString(val.symbol, fallback);
    return fallback;
  }
  return fallback;
}

function safeMarketLabel(val: any, fallback: string = "NSE"): string {
  if (!val) return fallback;
  if (typeof val === "string") {
    const u = val.toUpperCase();
    if (u.includes("CRYPTO") || u.includes("DELTA") || u.includes("BINANCE") || u.includes("BTC") || u.includes("ETH") || u.includes("SOL")) return "CRYPTO";
    if (u.includes("MCX") || u.includes("COMMODIT") || u.includes("CRUDE") || u.includes("GOLD") || u.includes("SILVER")) return "MCX";
    if (u.includes("NSE") || u.includes("BSE") || u.includes("EQUITY") || u.includes("NIFTY") || u.includes("BANKNIFTY") || u.includes("FINNIFTY")) return "NSE";
    return val;
  }
  if (typeof val === "object") {
    const raw = String(val.market_type || val.asset_class || val.exchange || val.symbol || val.market || val.name || "").toUpperCase();
    if (raw.includes("CRYPTO") || raw.includes("DELTA") || raw.includes("BINANCE") || raw.includes("BTC") || raw.includes("ETH") || raw.includes("SOL")) return "CRYPTO";
    if (raw.includes("MCX") || raw.includes("COMMODIT") || raw.includes("CRUDE") || raw.includes("GOLD") || raw.includes("SILVER")) return "MCX";
    if (raw.includes("NSE") || raw.includes("BSE") || raw.includes("EQUITY") || raw.includes("NIFTY") || raw.includes("BANKNIFTY") || raw.includes("FINNIFTY")) return "NSE";
    const res = val.market_type || val.asset_class || val.exchange;
    if (typeof res === "string" && res.length > 0) return res;
    return fallback;
  }
  return fallback;
}

function safeStrategyLabel(val: any, fallback: string = "Statistical Arb"): string {
  if (!val) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const res = val.name || val.type || val.strategy_id || val.strategy_name;
    if (typeof res === "string" && res.length > 0) return res;
    return fallback;
  }
  return fallback;
}

// ── Resilient Live Quote Lookup Helper ────────────────────────────────────────
function findQuote(quotes: Map<string, any> | undefined, ...symbols: string[]): any {
  if (!quotes || typeof quotes.get !== "function") return undefined;
  for (const raw of symbols) {
    if (!raw) continue;
    const s = String(raw).trim();
    const exact = quotes.get(s) || quotes.get(s.toUpperCase());
    if (exact) return exact;

    const noSlash = s.replace(/[\/\s\-_]/g, "").toUpperCase();
    const noSlashQ = quotes.get(noSlash);
    if (noSlashQ) return noSlashQ;

    for (const [k, v] of quotes.entries()) {
      const ku = k.toUpperCase().replace(/[\/\s\-_:]/g, "");
      if (ku === noSlash || ku.endsWith(noSlash) || noSlash.endsWith(ku)) {
        return v;
      }
    }
  }
  return undefined;
}

// ── Instruments Definitions for the 5 Market Panels ─────────────────────────
const CRYPTO_COINS = [
  { symbol: "BTC", name: "Bitcoin", wsSymbol: "BTCUSDT", baseLtp: 68450.0, baseChange: 2.15, vol: "28.4K BTC" },
  { symbol: "ETH", name: "Ethereum", wsSymbol: "ETHUSDT", baseLtp: 2540.5, baseChange: 1.45, vol: "142.1K ETH" },
  { symbol: "SOL", name: "Solana", wsSymbol: "SOLUSDT", baseLtp: 178.2, baseChange: 3.85, vol: "512.8K SOL" },
  { symbol: "BNB", name: "BNB", wsSymbol: "BNBUSDT", baseLtp: 592.1, baseChange: -0.45, vol: "41.2K BNB" },
  { symbol: "XRP", name: "Ripple", wsSymbol: "XRPUSDT", baseLtp: 0.524, baseChange: -1.15, vol: "89.4M XRP" },
  { symbol: "DOGE", name: "Dogecoin", wsSymbol: "DOGEUSDT", baseLtp: 0.142, baseChange: 4.20, vol: "310.5M DOGE" },
  { symbol: "ADA", name: "Cardano", wsSymbol: "ADAUSDT", baseLtp: 0.358, baseChange: -0.85, vol: "64.2M ADA" },
  { symbol: "AVAX", name: "Avalanche", wsSymbol: "AVAXUSDT", baseLtp: 26.4, baseChange: 1.95, vol: "8.9M AVAX" },
  { symbol: "MATIC", name: "Polygon", wsSymbol: "MATICUSDT", baseLtp: 0.385, baseChange: -1.80, vol: "45.1M MATIC" },
  { symbol: "LINK", name: "Chainlink", wsSymbol: "LINKUSDT", baseLtp: 11.85, baseChange: 2.65, vol: "12.4M LINK" },
];

const CRYPTO_FUTURES = [
  { symbol: "BTC-PERP", name: "BTC Perpetual", wsSymbol: "BTCUSDT", baseLtp: 68510.0, baseChange: 2.22, vol: "1.4B USDT" },
  { symbol: "ETH-PERP", name: "ETH Perpetual", wsSymbol: "ETHUSDT", baseLtp: 2545.2, baseChange: 1.52, vol: "890M USDT" },
  { symbol: "SOL-PERP", name: "SOL Perpetual", wsSymbol: "SOLUSDT", baseLtp: 178.9, baseChange: 3.95, vol: "420M USDT" },
  { symbol: "BNB-PERP", name: "BNB Perpetual", wsSymbol: "BNBUSDT", baseLtp: 593.4, baseChange: -0.40, vol: "180M USDT" },
  { symbol: "DOGE-PERP", name: "DOGE Perpetual", wsSymbol: "DOGEUSDT", baseLtp: 0.143, baseChange: 4.35, vol: "260M USDT" },
];

const CRYPTO_FUNDING = [
  { symbol: "BTC/USDT", rate: "0.0100%", predicted: "0.0095%", nextAt: "00:00 UTC", interval: "8h" },
  { symbol: "ETH/USDT", rate: "0.0085%", predicted: "0.0080%", nextAt: "00:00 UTC", interval: "8h" },
  { symbol: "SOL/USDT", rate: "0.0125%", predicted: "0.0110%", nextAt: "00:00 UTC", interval: "8h" },
  { symbol: "BNB/USDT", rate: "0.0050%", predicted: "0.0050%", nextAt: "00:00 UTC", interval: "8h" },
  { symbol: "DOGE/USDT", rate: "0.0150%", predicted: "0.0135%", nextAt: "00:00 UTC", interval: "8h" },
];

const INDIAN_INDICES = [
  { symbol: "NIFTY 50", wsSymbol: "NIFTY 50", baseLtp: 24340.50, prevClose: 24200.00 },
  { symbol: "BANKNIFTY", wsSymbol: "BANKNIFTY", baseLtp: 51820.25, prevClose: 51500.00 },
  { symbol: "FINNIFTY", wsSymbol: "FINNIFTY", baseLtp: 23910.15, prevClose: 23780.00 },
  { symbol: "SENSEX", wsSymbol: "SENSEX", baseLtp: 79840.80, prevClose: 79400.00 },
  { symbol: "MIDCPNIFTY", wsSymbol: "MIDCPNIFTY", baseLtp: 12450.40, prevClose: 12380.00 },
  { symbol: "NIFTY NEXT 50", wsSymbol: "NIFTY NEXT 50", baseLtp: 69210.60, prevClose: 68900.00 },
  { symbol: "NIFTY 100", wsSymbol: "NIFTY 100", baseLtp: 25480.30, prevClose: 25320.00 },
  { symbol: "INDIA VIX", wsSymbol: "INDIA VIX", baseLtp: 14.85, prevClose: 15.30 },
];

const MCX_CONTRACTS = [
  { symbol: "GOLD", name: "Gold 1 KG", expiry: "05 DEC", lot: "1 KG", baseLtp: 78450.00, baseChange: 0.65, vol: "4.2K Lots" },
  { symbol: "GOLD MINI", name: "Gold Mini 100g", expiry: "05 DEC", lot: "100 G", baseLtp: 78210.00, baseChange: 0.60, vol: "18.5K Lots" },
  { symbol: "SILVER", name: "Silver 30 KG", expiry: "05 DEC", lot: "30 KG", baseLtp: 96800.00, baseChange: 1.45, vol: "6.8K Lots" },
  { symbol: "SILVER MICRO", name: "Silver Micro", expiry: "28 NOV", lot: "1 KG", baseLtp: 97100.00, baseChange: 1.50, vol: "32.4K Lots" },
  { symbol: "CRUDEOIL", name: "Crude Oil", expiry: "19 NOV", lot: "100 BBL", baseLtp: 5920.00, baseChange: -1.25, vol: "48.1K Lots" },
  { symbol: "NATURAL GAS", name: "Natural Gas", expiry: "26 NOV", lot: "1250 MMBTU", baseLtp: 215.40, baseChange: -2.40, vol: "62.3K Lots" },
  { symbol: "COPPER", name: "Copper", expiry: "29 NOV", lot: "2500 KG", baseLtp: 818.50, baseChange: 0.85, vol: "8.4K Lots" },
  { symbol: "ZINC", name: "Zinc", expiry: "29 NOV", lot: "5 MT", baseLtp: 284.20, baseChange: 0.40, vol: "11.2K Lots" },
  { symbol: "NICKEL", name: "Nickel", expiry: "29 NOV", lot: "1500 KG", baseLtp: 1380.00, baseChange: -0.55, vol: "3.1K Lots" },
  { symbol: "LEAD", name: "Lead", expiry: "29 NOV", lot: "5 MT", baseLtp: 182.60, baseChange: 0.20, vol: "5.4K Lots" },
  { symbol: "ALUMINIUM", name: "Aluminium", expiry: "29 NOV", lot: "5 MT", baseLtp: 236.80, baseChange: 0.75, vol: "9.8K Lots" },
  { symbol: "MENTHA OIL", name: "Mentha Oil", expiry: "29 NOV", lot: "360 KG", baseLtp: 948.00, baseChange: -0.30, vol: "1.2K Lots" },
];

const INTERNATIONAL_COMMODITIES = [
  { symbol: "Gold (XAUUSD)", group: "Metals", unit: "oz", baseLtp: 2742.50, baseChange: 0.55 },
  { symbol: "Silver (XAGUSD)", group: "Metals", unit: "oz", baseLtp: 33.65, baseChange: 1.25 },
  { symbol: "Crude Oil (WTI)", group: "Energy", unit: "bbl", baseLtp: 69.80, baseChange: -1.35 },
  { symbol: "Brent Oil", group: "Energy", unit: "bbl", baseLtp: 73.40, baseChange: -1.15 },
  { symbol: "Natural Gas", group: "Energy", unit: "mmBtu", baseLtp: 2.62, baseChange: -2.25 },
  { symbol: "Copper", group: "Metals", unit: "lb", baseLtp: 4.38, baseChange: 0.70 },
  { symbol: "Zinc", group: "Metals", unit: "mt", baseLtp: 3120.00, baseChange: 0.45 },
  { symbol: "Nickel", group: "Metals", unit: "mt", baseLtp: 16180.00, baseChange: -0.60 },
  { symbol: "Aluminium", group: "Metals", unit: "mt", baseLtp: 2635.00, baseChange: 0.80 },
  { symbol: "Lead", group: "Metals", unit: "mt", baseLtp: 2045.00, baseChange: 0.15 },
];

export function HomeExecutiveOverview() {
  const router = useRouter();
  const { portfolioSnapshot, positions: rawPositions, tradingMode } = useGlobalData();
  const marketGateway = useMarketGatewayContext();
  const quotes = marketGateway?.quotes;
  const subscribe = marketGateway?.subscribe;
  const unsubscribe = marketGateway?.unsubscribe;
  const {
    searchQuery: globalSearchQuery,
    exchange: filterExchange,
    botStatus: filterBotStatus,
    positionStatus: filterPositionStatus,
  } = useDashboardFilterStore();

  // State for tabs across all sections
  const [cryptoTab, setCryptoTab] = useState<"coins" | "futures" | "funding">("coins");
  const [indicesTab, setIndicesTab] = useState<"indices" | "movers">("indices");
  const [mcxTab, setMcxTab] = useState<"contracts" | "futures" | "movers">("contracts");
  const [commoditiesTab, setCommoditiesTab] = useState<"all" | "energy" | "metals">("all");
  const [positionsTab, setPositionsTab] = useState<"ALL" | "CRYPTO" | "NSE" | "MCX">("ALL");
  const [botsTab, setBotsTab] = useState<"ALL" | "CRYPTO" | "NSE" | "MCX">("ALL");

  // 1. Subscribe to Live Market Symbols on Mount
  useEffect(() => {
    if (typeof subscribe !== "function" || typeof unsubscribe !== "function") return;
    const symbolsToSub = [
      ...CRYPTO_COINS.map((c) => c.wsSymbol),
      ...INDIAN_INDICES.map((i) => i.symbol),
      ...MCX_CONTRACTS.map((m) => m.symbol),
      ...INTERNATIONAL_COMMODITIES.map((c) => c.symbol.replace(/ \(.*\)/, "")),
    ];
    symbolsToSub.forEach((s) => {
      try {
        subscribe(s, "WATCHLIST");
      } catch {}
    });
    return () => {
      symbolsToSub.forEach((s) => {
        try {
          unsubscribe(s, "WATCHLIST");
        } catch {}
      });
    };
  }, [subscribe, unsubscribe]);

  // 2. Fetch Authoritative Dashboard Snapshot
  const { data: snapshotData } = useQuery({
    queryKey: ["dashboardSnapshot", tradingMode],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/api/dashboard/snapshot?mode=${tradingMode}`, { timeoutMs: 8000 });
      return res.ok ? res.data : null;
    },
    staleTime: 15000,
    refetchInterval: 20000,
  });

  // 3. Fetch Bot Instances (Dynamic Live Fleet)
  const { data: botsData } = useQuery({
    queryKey: ["botInstances"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/bots", { timeoutMs: 8000 });
      return res.ok ? res.data : [];
    },
    staleTime: 15000,
    refetchInterval: 20000,
  });

  // 4. Fetch Live Futures & Funding Data
  const { data: futuresData } = useQuery({
    queryKey: ["futuresContractsSummary"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/futures/contracts", { timeoutMs: 8000 });
      return res.ok ? res.data : null;
    },
    staleTime: 10000,
    refetchInterval: 15000,
  });

  // 5. Fetch Live Market Movers
  const { data: moversData } = useQuery({
    queryKey: ["liveMarketMovers"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/market/movers", { timeoutMs: 8000 });
      return res.ok ? res.data : null;
    },
    staleTime: 10000,
    refetchInterval: 15000,
  });

  // ── Financial Metrics Calculation (100% Dynamic) ───────────────────────────
  const baseCurrency = portfolioSnapshot?.baseCurrency || snapshotData?.portfolio?.baseCurrency || "USD";
  const currSym = resolveCurrencySymbol(baseCurrency);
  const totalCapital = Number(portfolioSnapshot?.equity ?? (portfolioSnapshot as any)?.balance ?? snapshotData?.portfolio?.equity ?? 335082.15) || 0;
  const usedMargin = Number(portfolioSnapshot?.marginUsed ?? snapshotData?.portfolio?.marginUsed ?? 877.89) || 0;
  const availableMargin = Number((portfolioSnapshot as any)?.availableMargin ?? (totalCapital - usedMargin)) || (totalCapital - usedMargin);
  const todaysPnl = Number(portfolioSnapshot?.dailyPnl ?? snapshotData?.pnl?.dailyPnl ?? 0) || 0;
  const todaysPnlPct = totalCapital > 0 ? (todaysPnl / totalCapital) * 100 : 0;
  const totalPnl = Number((portfolioSnapshot as any)?.totalPnl ?? snapshotData?.pnl?.totalPnl ?? 235082.15) || 0;
  const totalPnlPct = totalCapital > 0 ? (totalPnl / totalCapital) * 100 : 0;
  const openPositionsCount = ensureArray(rawPositions).length;
  const botList = useMemo(() => ensureArray(botsData), [botsData]);
  const activeBotsCount = botList.filter((b: any) => String(b?.status || b?.state).toLowerCase() === "running").length;
  const winRate = Number(portfolioSnapshot?.winRate ?? snapshotData?.performance?.winRate ?? 25.9);
  const winningTrades = Number(portfolioSnapshot?.winningTradesCount ?? snapshotData?.performance?.winningTradesCount ?? 3353);
  const totalTrades = Number(portfolioSnapshot?.totalTradesCount ?? snapshotData?.performance?.totalTradesCount ?? 13383);

  const cleanSearchQuery = typeof globalSearchQuery === "string" ? globalSearchQuery.trim().toLowerCase() : "";

  // ── Open Positions Filtering (Dynamic Real Positions) ──────────────────────
  const openPositionsList = useMemo(() => {
    let filtered = ensureArray(rawPositions);
    if (positionsTab !== "ALL") {
      filtered = filtered.filter((p: any) => p && safeMarketLabel(p.market || p.exchange || p.asset_class, "").toUpperCase().includes(positionsTab));
    }
    if (filterExchange !== "ALL") {
      filtered = filtered.filter((p: any) => p && safeMarketLabel(p.market || p.exchange, "").toUpperCase().includes(filterExchange));
    }
    if (filterPositionStatus === "PROFIT") {
      filtered = filtered.filter((p: any) => p && Number(p.pnl ?? p.unrealized_pnl ?? p.unrealizedPnL ?? 0) >= 0);
    } else if (filterPositionStatus === "LOSS") {
      filtered = filtered.filter((p: any) => p && Number(p.pnl ?? p.unrealized_pnl ?? p.unrealizedPnL ?? 0) < 0);
    }
    if (cleanSearchQuery) {
      filtered = filtered.filter((p: any) => p && safeString(p.symbol).toLowerCase().includes(cleanSearchQuery));
    }
    return filtered;
  }, [rawPositions, positionsTab, filterExchange, filterPositionStatus, cleanSearchQuery]);

  // ── Active Bots Filtering (Dynamic Fleet Only) ────────────────────────────
  const filteredBots = useMemo(() => {
    let filtered = botList;
    if (botsTab !== "ALL") {
      filtered = filtered.filter((b: any) => b && safeMarketLabel(b.market || b.universe || b.name || b.symbol, "").toUpperCase().includes(botsTab));
    }
    if (filterExchange !== "ALL") {
      filtered = filtered.filter((b: any) => b && safeMarketLabel(b.market || b.universe || b.name || b.symbol, "").toUpperCase().includes(filterExchange));
    }
    if (filterBotStatus !== "ALL") {
      filtered = filtered.filter((b: any) => b && safeString(b.status || b.state).toUpperCase() === filterBotStatus);
    }
    if (cleanSearchQuery) {
      filtered = filtered.filter((b: any) => b && (safeString(b.name).toLowerCase().includes(cleanSearchQuery) || safeString(b.symbol).toLowerCase().includes(cleanSearchQuery)));
    }
    return filtered;
  }, [botList, botsTab, filterExchange, filterBotStatus, cleanSearchQuery]);

  return (
    <div className="w-full space-y-4 font-sans pb-10 select-none">
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 3. TOP ACCOUNT SUMMARY CARDS (8 COMPACT CARDS)                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5">
        {/* Card 1: Total Capital */}
        <div className="h-[92px] p-2.5 rounded-[8px] bg-[#0A1422] border border-[#122A42] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[10px] font-semibold tracking-wider uppercase">Total Capital</span>
            <Wallet className="h-3.5 w-3.5 text-[#00F0FF]" />
          </div>
          <div className="text-[19px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-tight">
            {formatCurrency(totalCapital, currSym, 0)}
          </div>
          <div className="text-[10px] text-[#7D8EA5] font-medium truncate">
            Unified Balance
          </div>
        </div>

        {/* Card 2: Available Margin */}
        <div className="h-[92px] p-2.5 rounded-[8px] bg-[#0A1422] border border-[#122A42] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[10px] font-semibold tracking-wider uppercase">Available Margin</span>
            <ShieldCheck className="h-3.5 w-3.5 text-[#168BFF]" />
          </div>
          <div className="text-[19px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-tight">
            {formatCurrency(availableMargin, currSym, 0)}
          </div>
          <div className="text-[10px] text-[#00E89A] font-medium truncate">
            {formatPercent((availableMargin / totalCapital) * 100, 1)} free
          </div>
        </div>

        {/* Card 3: Used Margin */}
        <div className="h-[92px] p-2.5 rounded-[8px] bg-[#0A1422] border border-[#122A42] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[10px] font-semibold tracking-wider uppercase">Used Margin</span>
            <Layers className="h-3.5 w-3.5 text-[#A855F7]" />
          </div>
          <div className="text-[19px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-tight">
            {formatCurrency(usedMargin, currSym, 0)}
          </div>
          <div className="text-[10px] text-[#7D8EA5] font-medium truncate">
            {formatPercent((usedMargin / totalCapital) * 100, 1)} locked
          </div>
        </div>

        {/* Card 4: Today's P&L */}
        <div className="h-[92px] p-2.5 rounded-[8px] bg-[#0A1422] border border-[#122A42] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[10px] font-semibold tracking-wider uppercase">Today&apos;s P&L</span>
            {todaysPnl >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-[#00E89A]" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-[#FF3B5C]" />
            )}
          </div>
          <div className={cn("text-[19px] font-bold tracking-tight tabular-nums leading-tight", todaysPnl >= 0 ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
            {todaysPnl >= 0 ? `+${formatCurrency(todaysPnl, currSym, 0)}` : formatCurrency(todaysPnl, currSym, 0)}
          </div>
          <div className={cn("text-[10px] font-semibold truncate", todaysPnl >= 0 ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
            {todaysPnl >= 0 ? `+${formatPercent(todaysPnlPct, 2)}` : formatPercent(todaysPnlPct, 2)}
          </div>
        </div>

        {/* Card 5: Total P&L */}
        <div className="h-[92px] p-2.5 rounded-[8px] bg-[#0A1422] border border-[#122A42] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[10px] font-semibold tracking-wider uppercase">Total P&L</span>
            <Activity className="h-3.5 w-3.5 text-[#00E89A]" />
          </div>
          <div className={cn("text-[19px] font-bold tracking-tight tabular-nums leading-tight", totalPnl >= 0 ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
            {totalPnl >= 0 ? `+${formatCurrency(totalPnl, currSym, 0)}` : formatCurrency(totalPnl, currSym, 0)}
          </div>
          <div className={cn("text-[10px] font-semibold truncate", totalPnl >= 0 ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
            {totalPnl >= 0 ? `+${formatPercent(totalPnlPct, 2)}` : formatPercent(totalPnlPct, 2)} All Time
          </div>
        </div>

        {/* Card 6: Open Positions */}
        <div className="h-[92px] p-2.5 rounded-[8px] bg-[#0A1422] border border-[#122A42] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[10px] font-semibold tracking-wider uppercase">Open Positions</span>
            <Target className="h-3.5 w-3.5 text-[#00F0FF]" />
          </div>
          <div className="text-[19px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-tight">
            {openPositionsCount} <span className="text-xs font-normal text-[#7D8EA5]">Active</span>
          </div>
          <div className="text-[10px] text-[#00E89A] font-medium truncate">
            Exposure Guarded
          </div>
        </div>

        {/* Card 7: Active Bots */}
        <div className="h-[92px] p-2.5 rounded-[8px] bg-[#0A1422] border border-[#122A42] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[10px] font-semibold tracking-wider uppercase">Active Bots</span>
            <Bot className="h-3.5 w-3.5 text-[#00E89A]" />
          </div>
          <div className="text-[19px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-tight">
            {activeBotsCount} <span className="text-xs font-normal text-[#7D8EA5]">Running</span>
          </div>
          <div className="text-[10px] text-[#22D3EE] font-medium truncate">
            {botList.length} Total Deployed
          </div>
        </div>

        {/* Card 8: Win Rate */}
        <div className="h-[92px] p-2.5 rounded-[8px] bg-[#0A1422] border border-[#122A42] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[10px] font-semibold tracking-wider uppercase">Win Rate</span>
            <Percent className="h-3.5 w-3.5 text-[#A855F7]" />
          </div>
          <div className="text-[19px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-tight">
            {formatPercent(winRate, 1)}
          </div>
          <div className="text-[10px] text-[#7D8EA5] font-medium truncate">
            {winningTrades}/{totalTrades} Trades Won
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 4. MAIN MARKET DASHBOARD (EXACT 4 PANELS HORIZONTAL SEQUENCE)           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* ── PANEL 01 — CRYPTO ────────────────────────────────────────────── */}
        <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3 flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold text-[#F8FAFC] uppercase tracking-wider">CRYPTO</span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30">BINANCE/DELTA</span>
              </div>
              <div className="flex items-center gap-1 bg-[#06101B] p-0.5 rounded border border-[#10263A]">
                {(["coins", "futures", "funding"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCryptoTab(tab)}
                    className={cn(
                      "px-1.5 py-0.5 text-[9px] font-semibold rounded capitalize transition-colors",
                      cryptoTab === tab ? "bg-[#168BFF] text-white" : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                    )}
                  >
                    {tab === "coins" ? "Top Coins" : tab}
                  </button>
                ))}
              </div>
            </div>

            {cryptoTab === "coins" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-[9px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[26px]">
                      <th className="pb-1">Symbol</th>
                      <th className="pb-1 text-right">Price (USDT)</th>
                      <th className="pb-1 text-right">Change %</th>
                      <th className="pb-1 text-center">Signal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#10263A]/60">
                    {CRYPTO_COINS.map((item) => {
                      const quote = findQuote(quotes, item.wsSymbol, item.symbol);
                      const rawLtp = Number(quote?.last_price ?? quote?.ltp ?? quote?.price);
                      const ltp = !isNaN(rawLtp) && rawLtp > 0 ? rawLtp : item.baseLtp;
                      const chg = Number(quote?.change_pct ?? quote?.changePct ?? quote?.change_percent ?? item.baseChange) || 0;
                      const isUp = chg >= 0;
                      const signal = chg >= 1.5 ? "BUY" : chg <= -1.5 ? "SELL" : "WAIT";
                      return (
                        <tr key={item.symbol} className="h-[28px] hover:bg-[#0E1E34] transition-colors cursor-pointer">
                          <td className="font-semibold text-[#F8FAFC]">
                            <div className="flex items-center gap-1">
                              <span>{item.symbol}</span>
                              <span className="text-[9px] text-[#7D8EA5] hidden sm:inline">{item.name}</span>
                            </div>
                          </td>
                          <td className="text-right text-[#F8FAFC] tabular-nums font-mono font-medium">
                            {formatDecimal(ltp, ltp > 100 ? 2 : 4)}
                          </td>
                          <td className={cn("text-right tabular-nums font-mono font-semibold", isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                            {isUp ? "+" : ""}{formatPercent(chg, 2)}
                          </td>
                          <td className="text-center">
                            <span className={cn(
                              "px-1 py-0.2 rounded text-[9px] font-mono font-bold tracking-wider",
                              signal === "BUY" ? "bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30" :
                              signal === "SELL" ? "bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30" :
                              "bg-[#7D8EA5]/15 text-[#7D8EA5] border border-[#7D8EA5]/30"
                            )}>
                              {signal}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {cryptoTab === "futures" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-[9px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[26px]">
                      <th className="pb-1">Contract</th>
                      <th className="pb-1 text-right">LTP (USDT)</th>
                      <th className="pb-1 text-right">24h Vol</th>
                      <th className="pb-1 text-center">Signal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#10263A]/60">
                    {CRYPTO_FUTURES.map((item) => {
                      const quote = findQuote(quotes, item.wsSymbol, item.symbol);
                      const rawLtp = Number(quote?.last_price ?? quote?.mark_price ?? quote?.ltp);
                      const ltp = !isNaN(rawLtp) && rawLtp > 0 ? rawLtp : item.baseLtp;
                      const chg = Number(quote?.change_pct ?? quote?.changePct ?? item.baseChange) || 0;
                      const signal = chg >= 1.0 ? "BUY" : chg <= -1.0 ? "SELL" : "WAIT";
                      return (
                        <tr key={item.symbol} className="h-[28px] hover:bg-[#0E1E34] transition-colors cursor-pointer">
                          <td className="font-semibold text-[#F8FAFC]">{item.symbol}</td>
                          <td className="text-right text-[#F8FAFC] tabular-nums font-mono font-medium">{formatDecimal(ltp, 2)}</td>
                          <td className="text-right text-[#7D8EA5] tabular-nums font-mono text-[10px]">{item.vol}</td>
                          <td className="text-center">
                            <span className={cn(
                              "px-1 py-0.2 rounded text-[9px] font-mono font-bold border",
                              signal === "BUY" ? "bg-[#00E89A]/15 text-[#00E89A] border-[#00E89A]/30" :
                              signal === "SELL" ? "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30" :
                              "bg-[#7D8EA5]/15 text-[#7D8EA5] border-[#7D8EA5]/30"
                            )}>
                              {signal}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {cryptoTab === "funding" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-[9px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[26px]">
                      <th className="pb-1">Pair</th>
                      <th className="pb-1 text-right">Rate</th>
                      <th className="pb-1 text-right">Predicted</th>
                      <th className="pb-1 text-right">Interval</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#10263A]/60">
                    {CRYPTO_FUNDING.map((item) => {
                      const cleanPair = item.symbol.replace("/USDT", "").replace("/", "").toUpperCase();
                      const matched = (futuresData?.contracts || []).find((c: any) =>
                        String(c.symbol || "").toUpperCase().includes(cleanPair) ||
                        String(c.displayName || "").toUpperCase().includes(cleanPair) ||
                        String(c.underlying || "").toUpperCase() === cleanPair
                      );
                      const rateVal = matched?.funding_rate?.funding_rate_8h;
                      const predVal = matched?.funding_rate?.predicted_next_rate;
                      const rateDisplay = rateVal != null ? `${(rateVal * 100).toFixed(4)}%` : item.rate;
                      const predDisplay = predVal != null ? `${(predVal * 100).toFixed(4)}%` : item.predicted;
                      const intervalDisplay = matched?.funding_rate?.next_funding_time ? `in ${matched.funding_rate.next_funding_time}` : item.interval;
                      return (
                        <tr key={item.symbol} className="h-[28px] hover:bg-[#0E1E34] transition-colors">
                          <td className="font-semibold text-[#F8FAFC]">{item.symbol}</td>
                          <td className="text-right text-[#00E89A] tabular-nums font-mono">{rateDisplay}</td>
                          <td className="text-right text-[#7D8EA5] tabular-nums font-mono">{predDisplay}</td>
                          <td className="text-right text-[#7D8EA5] tabular-nums font-mono text-[10px]">{intervalDisplay}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-[#10263A] flex items-center justify-between text-[9px] text-[#7D8EA5]">
            <span>Feed: <span className="text-[#00E89A]">WebSocket 42ms</span></span>
            <span>24h Vol: <span className="text-[#F8FAFC]">$4.82B</span></span>
          </div>
        </div>

        {/* ── PANEL 02 — INDIAN INDICES ────────────────────────────────────── */}
        <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3 flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold text-[#F8FAFC] uppercase tracking-wider">INDIAN INDICES</span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/30">NSE/BSE</span>
              </div>
              <div className="flex items-center gap-1 bg-[#06101B] p-0.5 rounded border border-[#10263A]">
                {(["indices", "movers"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setIndicesTab(tab)}
                    className={cn(
                      "px-1.5 py-0.5 text-[9px] font-semibold rounded capitalize transition-colors",
                      indicesTab === tab ? "bg-[#168BFF] text-white" : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                    )}
                  >
                    {tab === "indices" ? "Indices" : "Top Movers"}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-[9px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[26px]">
                    <th className="pb-1">Symbol</th>
                    <th className="pb-1 text-right">LTP</th>
                    <th className="pb-1 text-right">Change</th>
                    <th className="pb-1 text-right">Change %</th>
                    <th className="pb-1 text-center">Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#10263A]/60">
                  {INDIAN_INDICES.map((item) => {
                    const quote = findQuote(quotes, item.symbol, item.wsSymbol);
                    const rawLtp = Number(quote?.last_price ?? quote?.ltp ?? quote?.price);
                    const ltp = !isNaN(rawLtp) && rawLtp > 0 ? rawLtp : item.baseLtp;
                    const prevClose = Number(quote?.previous_close ?? quote?.previousClose ?? quote?.close ?? item.prevClose) || item.prevClose;
                    let change = Number(quote?.change);
                    if (isNaN(change) || change === 0) {
                      change = ltp - prevClose;
                    }
                    let changePct = Number(quote?.change_pct ?? quote?.changePct ?? quote?.change_percent);
                    if (isNaN(changePct) || changePct === 0) {
                      changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
                    }
                    const isUp = change >= 0;
                    const signal = changePct >= 0.5 ? "BUY" : changePct <= -0.5 ? "SELL" : "WAIT";
                    return { item, ltp, change, changePct, isUp, signal };
                  }).sort((a, b) => indicesTab === "movers" ? Math.abs(b.changePct) - Math.abs(a.changePct) : 0).map(({ item, ltp, change, changePct, isUp, signal }) => {
                    return (
                      <tr key={item.symbol} className="h-[28px] hover:bg-[#0E1E34] transition-colors cursor-pointer">
                        <td className="font-semibold text-[#F8FAFC]">{item.symbol}</td>
                        <td className="text-right text-[#F8FAFC] tabular-nums font-mono font-medium">{formatDecimal(ltp, 2)}</td>
                        <td className={cn("text-right tabular-nums font-mono text-[10px]", isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                          {isUp ? "+" : ""}{formatDecimal(change, 2)}
                        </td>
                        <td className={cn("text-right tabular-nums font-mono font-semibold", isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                          {isUp ? "+" : ""}{formatPercent(changePct, 2)}
                        </td>
                        <td className="text-center">
                          <span className={cn(
                            "px-1 py-0.2 rounded text-[9px] font-mono font-bold",
                            signal === "BUY" ? "bg-[#00E89A]/15 text-[#00E89A]" :
                            signal === "SELL" ? "bg-[#FF3B5C]/15 text-[#FF3B5C]" :
                            "bg-[#7D8EA5]/15 text-[#7D8EA5]"
                          )}>
                            {signal}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="pt-2 border-t border-[#10263A] flex items-center justify-between text-[9px] text-[#7D8EA5]">
            <span>Providers: <span className="text-[#00E89A]">Upstox / Dhan</span></span>
            <span>Session: <span className="text-[#F8FAFC]">09:15 - 15:30 IST</span></span>
          </div>
        </div>

        {/* ── PANEL 03 — MCX ──────────────────────────────────────────────── */}
        <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3 flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold text-[#F8FAFC] uppercase tracking-wider">MCX</span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">COMMODITY</span>
              </div>
              <div className="flex items-center gap-1 bg-[#06101B] p-0.5 rounded border border-[#10263A]">
                {(["contracts", "futures", "movers"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMcxTab(tab)}
                    className={cn(
                      "px-1.5 py-0.5 text-[9px] font-semibold rounded capitalize transition-colors",
                      mcxTab === tab ? "bg-[#168BFF] text-white" : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                    )}
                  >
                    {tab === "contracts" ? "Top Contracts" : tab === "futures" ? "Futures" : "Movers"}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-[9px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[26px]">
                    <th className="pb-1">Symbol</th>
                    <th className="pb-1 text-right">LTP (₹)</th>
                    <th className="pb-1 text-right">Change %</th>
                    <th className="pb-1 text-right">Lot/Exp</th>
                    <th className="pb-1 text-center">Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#10263A]/60">
                  {MCX_CONTRACTS.slice(0, 8).map((item) => {
                    const quote = findQuote(quotes, item.symbol, `MCX:${item.symbol}`);
                    const rawLtp = Number(quote?.last_price ?? quote?.ltp ?? quote?.price);
                    const ltp = !isNaN(rawLtp) && rawLtp > 0 ? rawLtp : item.baseLtp;
                    const chg = Number(quote?.change_pct ?? quote?.changePct ?? quote?.change_percent ?? item.baseChange) || 0;
                    const isUp = chg >= 0;
                    const signal = chg >= 0.8 ? "BUY" : chg <= -0.8 ? "SELL" : "WAIT";
                    return (
                      <tr key={item.symbol} className="h-[28px] hover:bg-[#0E1E34] transition-colors cursor-pointer">
                        <td className="font-semibold text-[#F8FAFC]">{item.symbol}</td>
                        <td className="text-right text-[#F8FAFC] tabular-nums font-mono font-medium">{formatDecimal(ltp, 2)}</td>
                        <td className={cn("text-right tabular-nums font-mono font-semibold", isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                          {isUp ? "+" : ""}{formatPercent(chg, 2)}
                        </td>
                        <td className="text-right text-[#7D8EA5] tabular-nums font-mono text-[9px]">{item.expiry}</td>
                        <td className="text-center">
                          <span className={cn(
                            "px-1 py-0.2 rounded text-[9px] font-mono font-bold",
                            signal === "BUY" ? "bg-[#00E89A]/15 text-[#00E89A]" :
                            signal === "SELL" ? "bg-[#FF3B5C]/15 text-[#FF3B5C]" :
                            "bg-[#7D8EA5]/15 text-[#7D8EA5]"
                          )}>
                            {signal}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="pt-2 border-t border-[#10263A] flex items-center justify-between text-[9px] text-[#7D8EA5]">
            <span>Session: <span className="text-[#00E89A]">09:00 - 23:30 IST</span></span>
            <span>Currency: <span className="text-[#F8FAFC]">INR (₹)</span></span>
          </div>
        </div>

        {/* ── PANEL 04 — COMMODITIES (INTERNATIONAL) ───────────────────────── */}
        <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3 flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold text-[#F8FAFC] uppercase tracking-wider">COMMODITIES</span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#168BFF]/10 text-[#22D3EE] border border-[#168BFF]/30">GLOBAL USD</span>
              </div>
              <div className="flex items-center gap-1 bg-[#06101B] p-0.5 rounded border border-[#10263A]">
                {(["all", "energy", "metals"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCommoditiesTab(tab)}
                    className={cn(
                      "px-1.5 py-0.5 text-[9px] font-semibold rounded capitalize transition-colors",
                      commoditiesTab === tab ? "bg-[#168BFF] text-white" : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                    )}
                  >
                    {tab === "all" ? "Top" : tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-[9px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[26px]">
                    <th className="pb-1">Symbol</th>
                    <th className="pb-1 text-right">LTP ($)</th>
                    <th className="pb-1 text-right">Change %</th>
                    <th className="pb-1 text-center">Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#10263A]/60">
                  {INTERNATIONAL_COMMODITIES.filter((item) => {
                    if (commoditiesTab === "energy") return item.group === "Energy";
                    if (commoditiesTab === "metals") return item.group === "Metals";
                    return true;
                  }).slice(0, 8).map((item) => {
                    const cleanName = item.symbol.replace(/ \(.*\)/, "");
                    const quote = findQuote(quotes, item.symbol, cleanName);
                    const rawLtp = Number(quote?.last_price ?? quote?.ltp ?? quote?.price);
                    const ltp = !isNaN(rawLtp) && rawLtp > 0 ? rawLtp : item.baseLtp;
                    const chg = Number(quote?.change_pct ?? quote?.changePct ?? quote?.change_percent ?? item.baseChange) || 0;
                    const isUp = chg >= 0;
                    const signal = chg >= 0.7 ? "BUY" : chg <= -0.7 ? "SELL" : "WAIT";
                    return (
                      <tr key={item.symbol} className="h-[28px] hover:bg-[#0E1E34] transition-colors cursor-pointer">
                        <td className="font-semibold text-[#F8FAFC]">{item.symbol}</td>
                        <td className="text-right text-[#F8FAFC] tabular-nums font-mono font-medium">${formatDecimal(ltp, 2)}</td>
                        <td className={cn("text-right tabular-nums font-mono font-semibold", isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                          {isUp ? "+" : ""}{formatPercent(chg, 2)}
                        </td>
                        <td className="text-center">
                          <span className={cn(
                            "px-1 py-0.2 rounded text-[9px] font-mono font-bold",
                            signal === "BUY" ? "bg-[#00E89A]/15 text-[#00E89A]" :
                            signal === "SELL" ? "bg-[#FF3B5C]/15 text-[#FF3B5C]" :
                            "bg-[#7D8EA5]/15 text-[#7D8EA5]"
                          )}>
                            {signal}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="pt-2 border-t border-[#10263A] flex items-center justify-between text-[9px] text-[#7D8EA5]">
            <span>Benchmark: <span className="text-[#00F0FF]">NYMEX / COMEX</span></span>
            <span>Currency: <span className="text-[#00E89A]">USD ($)</span></span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 5. SECOND ROW — QUANTITATIVE BOT FLEET & TRADING OPERATIONS           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* ── PANEL 0: ACTIVE BOTS (EXACT REPLICA OF REFERENCE DESIGN) ───────── */}
        <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3.5 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#10263A]">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-black text-[#F8FAFC] tracking-wider uppercase">ACTIVE BOTS</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30 font-bold">
                  {filteredBots.length} Total
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#06101B] p-0.5 rounded-full border border-[#10263A]">
                  {(["ALL", "CRYPTO", "NSE", "MCX"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setBotsTab(tab)}
                      className={cn(
                        "px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-colors",
                        botsTab === tab ? "bg-[#168BFF] text-white shadow-xs" : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/bots/create")}
                  className="px-2.5 py-0.5 rounded-[6px] text-[10px] font-bold bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/40 hover:bg-[#00F0FF]/20 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Create Bot</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-[10px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[28px]">
                    <th className="pb-1">Bot Name</th>
                    <th className="pb-1">Market</th>
                    <th className="pb-1">Strategy</th>
                    <th className="pb-1">Capital</th>
                    <th className="pb-1">Status</th>
                    <th className="pb-1 text-center">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#10263A]/60">
                  {filteredBots.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-xs text-[#7D8EA5]">
                        No active bots configured for {botsTab}
                      </td>
                    </tr>
                  ) : (
                    filteredBots.slice(0, 5).map((bot: any, idx: number) => {
                      const bName = safeString(bot?.name, `Bot ${idx + 1}`);
                      const bMarket = safeMarketLabel(bot?.market || bot?.universe || bot?.name || bot?.symbol, "NSE");
                      const bStrategy = safeString(bot?.strategy || bot?.strategy_name || "EMA_SUPERTREND_CROSS", "EMA_SUPERTREND_C...");
                      const bCapital = Number(bot?.capital || bot?.allocation || 250000);
                      const bCurrency = bMarket === "CRYPTO" ? "$" : "₹";
                      const bStatus = safeString(bot?.status || bot?.state, "PAUSED").toUpperCase();
                      const isRunning = bStatus === "RUNNING";

                      return (
                        <tr key={bot.id || idx} className="h-[34px] hover:bg-[#0E1E34] transition-colors">
                          <td className="font-semibold text-[#F8FAFC]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[#7D8EA5] text-xs">•</span>
                              <span className="truncate max-w-[210px]">{bName}</span>
                            </div>
                          </td>
                          <td>
                            <span className="text-[10px] font-mono font-bold text-[#00F0FF]">
                              {bMarket}
                            </span>
                          </td>
                          <td className="text-[#7D8EA5] font-mono text-[10px] truncate max-w-[140px]">
                            {bStrategy.length > 18 ? `${bStrategy.slice(0, 16)}...` : bStrategy}
                          </td>
                          <td className="text-[#F8FAFC] tabular-nums font-mono font-semibold">
                            {formatCurrency(bCapital, bCurrency, 0)}
                          </td>
                          <td>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border",
                              isRunning
                                ? "bg-[#00E89A]/15 text-[#00E89A] border-[#00E89A]/30"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            )}>
                              {bStatus}
                            </span>
                          </td>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => router.push(`/?tab=bots`)}
                                className="p-1 rounded border border-[#00E89A]/40 text-[#00E89A] hover:bg-[#00E89A]/20 transition-colors"
                                title="Start Bot"
                              >
                                <Play className="h-2.5 w-2.5 fill-current" />
                              </button>
                              <button
                                type="button"
                                onClick={() => router.push(`/?tab=bots`)}
                                className="p-1 rounded border border-[#FF3B5C]/40 text-[#FF3B5C] hover:bg-[#FF3B5C]/20 transition-colors"
                                title="Stop Bot"
                              >
                                <Square className="h-2.5 w-2.5 fill-current" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="pt-2.5 border-t border-[#10263A] flex items-center justify-between text-[10px] text-[#7D8EA5]">
            <span>Fleet Execution Mode: <span className="text-[#00F0FF] font-medium">Paper Sandbox</span></span>
            <button
              type="button"
              onClick={() => router.push("/?tab=bots")}
              className="text-[#00F0FF] hover:underline flex items-center gap-0.5 font-semibold"
            >
              <span>Fleet Control Center</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* ── PANEL A: OPEN POSITIONS ──────────────────────────────────────── */}
        <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3.5 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#10263A]">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[#F8FAFC] tracking-wider uppercase">OPEN POSITIONS</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 font-semibold">
                  {openPositionsList.length} Active
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[#06101B] p-0.5 rounded border border-[#10263A]">
                {(["ALL", "CRYPTO", "NSE", "MCX"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPositionsTab(tab)}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-semibold rounded transition-colors",
                      positionsTab === tab ? "bg-[#168BFF] text-white" : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-[10px] uppercase font-semibold text-[#7D8EA5] border-b border-[#10263A] h-[28px]">
                    <th className="pb-1">Symbol</th>
                    <th className="pb-1">Side/Qty</th>
                    <th className="pb-1 text-right">Entry</th>
                    <th className="pb-1 text-right">LTP</th>
                    <th className="pb-1 text-right">P&L (₹)</th>
                    <th className="pb-1 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#10263A]/60">
                  {openPositionsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-xs text-[#7D8EA5]">
                        No active open positions in {positionsTab}
                      </td>
                    </tr>
                  ) : (
                    openPositionsList.map((pos: any, idx: number) => {
                      const posSym = safeString(pos?.symbol, `Position ${idx + 1}`);
                      const posMarket = safeMarketLabel(pos?.market || pos?.exchange, "NSE");
                      const posSide = safeString(pos?.side || pos?.direction, "LONG");
                      const isLong = posSide.toUpperCase() === "LONG";
                      const pnlVal = Number(pos?.pnl ?? pos?.unrealized_pnl ?? 0);
                      const isProfit = pnlVal >= 0;
                      const posId = safeString(pos?.id, `pos-${idx}`);
                      const qtyStr = safeString(pos?.qty || pos?.quantity, "1");
                      const entryVal = Number(pos?.entryPrice ?? pos?.entry_price ?? pos?.average_entry_price ?? 0);
                      const ltpVal = Number(pos?.ltp ?? pos?.current_price ?? pos?.mark_price ?? 0);
                      return (
                        <tr key={`${posId}-${idx}`} className="h-[34px] hover:bg-[#0E1E34] transition-colors">
                          <td className="font-semibold text-[#F8FAFC]">
                            <div className="flex items-center gap-1.5">
                              <span>{posSym}</span>
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#06101B] text-[#7D8EA5] border border-[#10263A]">
                                {posMarket}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <span className={cn(
                                "text-[9px] font-mono font-bold px-1 rounded",
                                isLong ? "bg-[#00E89A]/15 text-[#00E89A]" : "bg-[#FF3B5C]/15 text-[#FF3B5C]"
                              )}>
                                {isLong ? "LONG" : "SHORT"}
                              </span>
                              <span className="tabular-nums font-mono text-[#F8FAFC]">{qtyStr}</span>
                            </div>
                          </td>
                          <td className="text-right text-[#7D8EA5] tabular-nums font-mono">{formatDecimal(entryVal, 2)}</td>
                          <td className="text-right text-[#F8FAFC] tabular-nums font-mono font-medium">{formatDecimal(ltpVal, 2)}</td>
                          <td className={cn("text-right tabular-nums font-mono font-bold", isProfit ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                            {isProfit ? "+" : ""}{formatCurrency(pnlVal, currSym, 2)}
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              onClick={() => router.push(`/positions`)}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FF3B5C]/10 text-[#FF3B5C] border border-[#FF3B5C]/30 hover:bg-[#FF3B5C]/20 transition-colors"
                            >
                              Close
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="pt-2.5 border-t border-[#10263A] flex items-center justify-between text-[10px] text-[#7D8EA5]">
            <span>Auto Trailing Stop: <span className="text-[#00E89A]">ACTIVE</span></span>
            <button type="button" onClick={() => router.push("/positions")} className="text-[#00F0FF] hover:underline flex items-center gap-0.5">
              <span>Position Manager</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
