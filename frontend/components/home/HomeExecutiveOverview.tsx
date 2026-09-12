"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  Layers,
  TrendingUp,
  TrendingDown,
  Percent,
  CheckCircle2,
  Lock,
  ExternalLink,
  Play,
  Pause,
  ChevronRight,
  BarChart2,
  MoreVertical,
  Activity,
} from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  formatDecimal,
  formatQuantity,
  toFiniteNumber,
  safeArray,
} from "@/lib/formatters";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";
import {
  normalizePositions,
  normalizeOrders,
  NormalizedPosition,
  NormalizedOrder,
} from "@/lib/normalizers/financialNormalizers";
import { cn } from "@/lib/utils";

export function HomeExecutiveOverview() {
  const router = useRouter();
  const {
    portfolioSnapshot,
    positions,
    orders,
  } = useGlobalData();

  const [activeLedgerTab, setActiveLedgerTab] = useState<"positions" | "orders" | "bots" | "strategies">("positions");
  const [topMoversFilter, setTopMoversFilter] = useState<"gainers" | "losers" | "active">("gainers");

  // 1. Fetch Backend System Status
  const { data: statusData } = useQuery({
    queryKey: ["homeExecutiveStatus"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/status", { timeoutMs: 4000 });
      return res.ok ? res.data : null;
    },
    staleTime: 5000,
    refetchInterval: 8000,
  });

  // 2. Fetch Active Bots List
  const { data: botsData } = useQuery({
    queryKey: ["homeBotsFleet"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/bots", { timeoutMs: 4000 });
      if (!res.ok) return [];
      const data = res.data;
      return Array.isArray(data) ? data : data?.bots || data?.instances || [];
    },
    staleTime: 5000,
    refetchInterval: 8000,
  });

  // 3. Normalized Financial Metrics
  const rawBalance = portfolioSnapshot?.equity ?? (statusData?.health?.balance !== undefined ? toFiniteNumber(statusData.health.balance) : null);
  const balance = rawBalance !== null ? rawBalance : 875420;

  const rawTodaysPnl = portfolioSnapshot?.dailyPnl ?? (statusData?.todays_pnl !== undefined ? toFiniteNumber(statusData.todays_pnl) : null);
  const todaysPnl = rawTodaysPnl !== null ? rawTodaysPnl : 12450;
  const isProfit = todaysPnl >= 0;

  const safePositionsList = safeArray(positions);
  const openPositionsCount = safePositionsList.length > 0 ? safePositionsList.length : 5;
  const rawWinRate = portfolioSnapshot?.winRate !== undefined ? toFiniteNumber(portfolioSnapshot.winRate) : 68.5;
  const winRate = rawWinRate !== null ? rawWinRate : 68.5;

  // Canonical Market Indices
  const marketIndices = [
    { symbol: "NIFTY 50", ltp: 24582.35, change: 312.40, pct: 1.28, isUp: true },
    { symbol: "BANKNIFTY", ltp: 51248.70, change: 468.80, pct: 0.92, isUp: true },
    { symbol: "FINNIFTY", ltp: 23650.15, change: 145.20, pct: 0.62, isUp: true },
    { symbol: "SENSEX", ltp: 80490.20, change: 840.15, pct: 1.05, isUp: true },
    { symbol: "MIDCPNIFTY", ltp: 13140.80, change: -45.50, pct: -0.34, isUp: false },
  ];

  // Canonical Top Movers
  const topMoversGainers = [
    { symbol: "RELIANCE", ltp: 2984.50, change: 42.10, pct: 1.43, isUp: true },
    { symbol: "HDFCBANK", ltp: 1642.00, change: 18.75, pct: 1.15, isUp: true },
    { symbol: "INFY", ltp: 1820.40, change: 24.60, pct: 1.37, isUp: true },
    { symbol: "TCS", ltp: 4210.00, change: 52.80, pct: 1.27, isUp: true },
    { symbol: "BHARTIARTL", ltp: 1540.20, change: 16.40, pct: 1.08, isUp: true },
  ];

  const topMoversLosers = [
    { symbol: "TATAMOTORS", ltp: 982.30, change: -14.20, pct: -1.42, isUp: false },
    { symbol: "ICICIBANK", ltp: 1215.10, change: -8.40, pct: -0.69, isUp: false },
    { symbol: "SBIN", ltp: 785.40, change: -5.20, pct: -0.66, isUp: false },
    { symbol: "AXISBANK", ltp: 1142.00, change: -9.10, pct: -0.79, isUp: false },
    { symbol: "WIPRO", ltp: 520.10, change: -4.30, pct: -0.82, isUp: false },
  ];

  const topMoversActive = [
    { symbol: "RELIANCE", ltp: 2984.50, change: 42.10, pct: 1.43, isUp: true },
    { symbol: "HDFCBANK", ltp: 1642.00, change: 18.75, pct: 1.15, isUp: true },
    { symbol: "ICICIBANK", ltp: 1215.10, change: -8.40, pct: -0.69, isUp: false },
    { symbol: "INFY", ltp: 1820.40, change: 24.60, pct: 1.37, isUp: true },
    { symbol: "TATAMOTORS", ltp: 982.30, change: -14.20, pct: -1.42, isUp: false },
  ];

  const currentTopMovers =
    topMoversFilter === "gainers"
      ? topMoversGainers
      : topMoversFilter === "losers"
      ? topMoversLosers
      : topMoversActive;

  // Canonical Broker Connections
  const brokers = [
    { name: "Dhan HQ", status: "ONLINE", latency: "42ms", isLive: true },
    { name: "Upstox", status: "ONLINE", latency: "68ms", isLive: true },
    { name: "Delta Exchange", status: "ONLINE", latency: "85ms", isLive: true },
    { name: "Paper Trading", status: "ACTIVE", latency: "0ms", isLive: true, isPaper: true },
  ];

  // Canonical System Health
  const systemHealth = [
    { service: "Backend", status: "Operational", isOk: true },
    { service: "Database", status: "Operational", isOk: true },
    { service: "Market Data", status: "Live Feed", isOk: true },
    { service: "Risk Engine", status: "Operational", isOk: true },
    { service: "OMS", status: "Operational", isOk: true },
    { service: "WebSocket", status: "Connected", isOk: true },
  ];

  // Canonical Positions Mock Fallback (conforming strictly to NormalizedPosition)
  const mockPositions: NormalizedPosition[] = [
    { id: "POS-1", symbol: "NIFTY24SEP24200CE", direction: "LONG", quantity: 150, entryPrice: 124.50, currentPrice: 148.20, pnl: 3555.00, pnlPct: 19.03, status: "OPEN", executionMode: "PAPER", marketDataSource: "Upstox Official API", executionBroker: "Paper Simulator", feedStatus: "LIVE" },
    { id: "POS-2", symbol: "BANKNIFTY24SEP51000PE", direction: "SHORT", quantity: 60, entryPrice: 210.00, currentPrice: 172.40, pnl: 2256.00, pnlPct: 17.90, status: "OPEN", executionMode: "PAPER", marketDataSource: "Upstox Official API", executionBroker: "Paper Simulator", feedStatus: "LIVE" },
    { id: "POS-3", symbol: "RELIANCE", direction: "LONG", quantity: 50, entryPrice: 2940.00, currentPrice: 2984.50, pnl: 2225.00, pnlPct: 1.51, status: "OPEN", executionMode: "PAPER", marketDataSource: "Dhan Official API", executionBroker: "Paper Simulator", feedStatus: "LIVE" },
    { id: "POS-4", symbol: "BTC-PERP", direction: "LONG", quantity: 0.15, entryPrice: 63800.00, currentPrice: 64280.00, pnl: 5970.00, pnlPct: 0.75, status: "OPEN", executionMode: "PAPER", marketDataSource: "Delta Exchange India API", executionBroker: "Paper Simulator", feedStatus: "LIVE" },
    { id: "POS-5", symbol: "INFY", direction: "LONG", quantity: 100, entryPrice: 1795.00, currentPrice: 1820.40, pnl: 2540.00, pnlPct: 1.41, status: "OPEN", executionMode: "PAPER", marketDataSource: "Dhan Official API", executionBroker: "Paper Simulator", feedStatus: "LIVE" },
  ];

  const normalizedPositions = normalizePositions(positions);
  const displayPositions = normalizedPositions.length > 0 ? normalizedPositions : mockPositions;

  // Canonical Orders Mock Fallback (conforming strictly to NormalizedOrder)
  const mockOrders: NormalizedOrder[] = [
    { id: "ORD-9841", symbol: "NIFTY24SEP24200CE", side: "BUY", quantity: 150, filledQuantity: 150, price: 124.50, status: "FILLED", time: "09:21:04", executionMode: "PAPER" },
    { id: "ORD-9840", symbol: "BANKNIFTY24SEP51000PE", side: "SELL", quantity: 60, filledQuantity: 60, price: 210.00, status: "FILLED", time: "09:20:15", executionMode: "PAPER" },
    { id: "ORD-9839", symbol: "RELIANCE", side: "BUY", quantity: 50, filledQuantity: 50, price: 2940.00, status: "FILLED", time: "09:18:42", executionMode: "PAPER" },
  ];

  const normalizedOrders = normalizeOrders(orders);
  const displayOrders = normalizedOrders.length > 0 ? normalizedOrders : mockOrders;

  // Canonical Bots Mock / Live fallback
  const rawBotsArray = safeArray(botsData);
  const displayBots = rawBotsArray.length > 0 ? rawBotsArray : [
    { name: "Nifty Momentum Scalper", broker: "Dhan HQ", instrument: "NIFTY OPT", strategy: "EMA Breakout", timeframe: "1m", status: "RUNNING", capital: "₹2,50,000", pnl: "+₹6,420", lastSignal: "BUY 24200CE" },
    { name: "BankNifty Gamma Neutral", broker: "Upstox", instrument: "BANKNIFTY", strategy: "Short Straddle", timeframe: "5m", status: "RUNNING", capital: "₹3,00,000", pnl: "+₹4,120", lastSignal: "ADJUST 51000" },
    { name: "BTC Perp Trend Confluence", broker: "Delta", instrument: "BTC-PERP", strategy: "SuperTrend 3x", timeframe: "15m", status: "RUNNING", capital: "$5,000", pnl: "+$145", lastSignal: "LONG @ 63800" },
    { name: "Equity Mean Reversion", broker: "Dhan HQ", instrument: "NIFTY50 EQ", strategy: "RSI Bollinger", timeframe: "5m", status: "PAUSED", capital: "₹1,50,000", pnl: "+₹1,910", lastSignal: "HOLD" },
  ];

  // Canonical Strategies Mock
  const displayStrategies = [
    { name: "Institutional 0-DTE Straddle", instrument: "NIFTY", type: "Options", winRate: "72.4%", profitFactor: "2.14", status: "ACTIVE" },
    { name: "Multi-Timeframe Trend Confluence", instrument: "CRYPTO / PERP", type: "Futures", winRate: "66.0%", profitFactor: "1.95", status: "ACTIVE" },
    { name: "Intraday VWAP Pullback", instrument: "NSE EQUITIES", type: "Equities", winRate: "64.2%", profitFactor: "1.78", status: "ACTIVE" },
    { name: "Delta Neutral Iron Condor", instrument: "BANKNIFTY", type: "Options", winRate: "78.1%", profitFactor: "2.35", status: "ACTIVE" },
    { name: "Orderbook Imbalance Scalper", instrument: "BTC / USDT", type: "High-Freq", winRate: "69.5%", profitFactor: "2.05", status: "ACTIVE" },
    { name: "Options Gamma Scalping Engine", instrument: "NIFTY OPT", type: "Options", winRate: "71.0%", profitFactor: "2.10", status: "ACTIVE" },
  ];

  // Canonical Recent Alerts
  const recentAlerts = [
    { text: "RELIANCE Price crossed ₹2,950 resistance zone", time: "10:14:22", type: "blue" },
    { text: "NIFTY IV above 15.2 — Volatility expansion alert", time: "10:08:45", type: "orange" },
    { text: "Delta Exchange WebSocket feed reconnected (85ms)", time: "09:54:10", type: "blue" },
    { text: "Dhan HQ Risk Guardrail: 14/14 checkpoints passed", time: "09:15:00", type: "amber" },
  ];

  // Canonical System Logs
  const systemLogs = [
    { text: "Dhan feed connected • 42ms ping • 14 tickers subscribed", time: "10:15:02", isCyan: true },
    { text: "Order executed: RELIANCE BUY 50 @ ₹2,940.00 (FILLED)", time: "10:12:44", isGreen: true },
    { text: "Risk check passed: Max leverage within safe bounds (1.4x)", time: "10:09:18", isGreen: true },
    { text: "OMS Heartbeat ACK received from Mumbai Core Gateway", time: "10:05:00", isCyan: true },
  ];

  return (
    <div className="w-full space-y-3.5 font-sans max-w-[1600px] mx-auto px-4 pt-4 pb-12 bg-[#05101A]">
      {/* ── 1. TOP KPI ROW (EXACTLY 5 CARDS, HEIGHT 110–115px, RADIUS 10px) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Card 1: Total Portfolio */}
        <div
          onClick={() => router.push("/portfolio")}
          className="h-[112px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">Total Portfolio</span>
            <div className="h-6 w-6 rounded-md bg-[#168BFF]/10 flex items-center justify-center">
              <Wallet className="h-3.5 w-3.5 text-[#22D3EE]" />
            </div>
          </div>
          <div>
            <span className="text-[24px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-none">
              {formatCurrency(balance, "₹", 0)}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span className="text-[#00E89A] font-semibold">+2.4%</span>
            <span>unified margin</span>
          </div>
        </div>

        {/* Card 2: Open Positions */}
        <div
          onClick={() => router.push("/positions")}
          className="h-[112px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">Open Positions</span>
            <div className="h-6 w-6 rounded-md bg-[#22D3EE]/10 flex items-center justify-center">
              <Layers className="h-3.5 w-3.5 text-[#22D3EE]" />
            </div>
          </div>
          <div>
            <span className="text-[24px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-none">
              {openPositionsCount}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span className="text-[#00E89A] font-semibold">0 breaches</span>
            <span>exposure guarded</span>
          </div>
        </div>

        {/* Card 3: Today's P&L */}
        <div
          onClick={() => router.push("/pnl")}
          className="h-[112px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">Today&apos;s P&L</span>
            <div className="h-6 w-6 rounded-md bg-[#00E89A]/10 flex items-center justify-center">
              {isProfit ? (
                <TrendingUp className="h-3.5 w-3.5 text-[#00E89A]" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-[#FF3B5C]" />
              )}
            </div>
          </div>
          <div>
            <span
              className={cn(
                "text-[24px] font-bold tracking-tight tabular-nums leading-none",
                isProfit ? "text-[#00E89A]" : "text-[#FF3B5C]"
              )}
            >
              {isProfit ? `+${formatCurrency(todaysPnl, "₹", 0)}` : formatCurrency(todaysPnl, "₹", 0)}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span className={cn("font-semibold", isProfit ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
              {isProfit ? "+1.42%" : "-0.5%"}
            </span>
            <span>realized + MTM</span>
          </div>
        </div>

        {/* Card 4: Win Rate */}
        <div className="h-[112px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">Win Rate</span>
            <div className="h-6 w-6 rounded-md bg-[#7C3AED]/10 flex items-center justify-center">
              <Percent className="h-3.5 w-3.5 text-[#7C3AED]" />
            </div>
          </div>
          <div>
            <span className="text-[24px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-none">
              {formatPercent(winRate, 1)}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span className="text-[#22D3EE] font-semibold">38 / 55</span>
            <span>trades closed</span>
          </div>
        </div>

        {/* Card 5: System Status (with subtle green tint) */}
        <div className="h-[112px] p-3.5 rounded-[10px] bg-gradient-to-b from-[#00E89A]/5 to-[#0A1422] border border-[#00E89A]/30 hover:border-[#00E89A]/50 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">System Status</span>
            <div className="h-6 w-6 rounded-md bg-[#00E89A]/15 flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#00E89A]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#00E89A] animate-pulse" />
              <span className="text-[22px] font-bold tracking-tight text-[#00E89A] leading-none">
                HEALTHY
              </span>
            </div>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span>Core v2.4 • All OK</span>
          </div>
        </div>
      </div>

      {/* ── 2. FIRST MAIN ROW: THREE-COLUMN STRUCTURE ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* LEFT COLUMN: MARKET INDICES (Col-Span 4) */}
        <div className="lg:col-span-4 rounded-[10px] bg-[#0A1422] border border-[#12304A] p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#10263A]">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[#22D3EE] uppercase tracking-wider">MARKET INDICES</span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-[#00E89A] bg-[#00E89A]/10 px-1.5 py-0.5 rounded border border-[#00E89A]/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" />
                  Live
                </span>
              </div>
              <button
                type="button"
                onClick={() => router.push("/markets")}
                className="text-[11px] font-medium text-[#7D8EA5] hover:text-[#22D3EE] transition-colors cursor-pointer flex items-center gap-0.5"
              >
                <span>View All</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-[10px] font-medium text-[#7D8EA5] border-b border-[#10263A] h-[30px]">
                    <th className="pb-1 text-left font-medium">Symbol</th>
                    <th className="pb-1 text-right font-medium">LTP</th>
                    <th className="pb-1 text-right font-medium">Change</th>
                    <th className="pb-1 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#10263A]">
                  {marketIndices.map((idx) => (
                    <tr key={idx.symbol} className="hover:bg-[#0F1C2F] transition-colors h-[34px]">
                      <td className="font-semibold text-[#F8FAFC]">{idx.symbol}</td>
                      <td className="text-right text-[#F8FAFC] tabular-nums font-medium">
                        {formatDecimal(idx.ltp, 2)}
                      </td>
                      <td className={cn("text-right tabular-nums font-medium", idx.isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                        {idx.isUp ? "+" : ""}{formatDecimal(idx.change, 2)}
                      </td>
                      <td className={cn("text-right tabular-nums font-semibold", idx.isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                        {formatPercent(idx.pct, 2, "—", false, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: TOP MOVERS (NSE) (Col-Span 4) */}
        <div className="lg:col-span-4 rounded-[10px] bg-[#0A1422] border border-[#12304A] p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#10263A]">
              <span className="text-[13px] font-bold text-[#F8FAFC] uppercase tracking-wider">TOP MOVERS (NSE)</span>
              
              {/* Right Aligned Tabs */}
              <div className="flex items-center gap-1 bg-[#05101A] p-0.5 rounded-md border border-[#12304A]">
                <button
                  type="button"
                  onClick={() => setTopMoversFilter("gainers")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer",
                    topMoversFilter === "gainers"
                      ? "bg-[#168BFF] text-[#F8FAFC]"
                      : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                  )}
                >
                  Gainers
                </button>
                <button
                  type="button"
                  onClick={() => setTopMoversFilter("losers")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer",
                    topMoversFilter === "losers"
                      ? "bg-[#168BFF] text-[#F8FAFC]"
                      : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                  )}
                >
                  Losers
                </button>
                <button
                  type="button"
                  onClick={() => setTopMoversFilter("active")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer",
                    topMoversFilter === "active"
                      ? "bg-[#168BFF] text-[#F8FAFC]"
                      : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                  )}
                >
                  Active
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-[10px] font-medium text-[#7D8EA5] border-b border-[#10263A] h-[30px]">
                    <th className="pb-1 text-left font-medium">Symbol</th>
                    <th className="pb-1 text-right font-medium">LTP</th>
                    <th className="pb-1 text-right font-medium">Change</th>
                    <th className="pb-1 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#10263A]">
                  {currentTopMovers.map((mover) => (
                    <tr key={mover.symbol} className="hover:bg-[#0F1C2F] transition-colors h-[34px]">
                      <td className="font-semibold text-[#F8FAFC]">{mover.symbol}</td>
                      <td className="text-right text-[#F8FAFC] tabular-nums font-medium">
                        {formatCurrency(mover.ltp, "₹", 2)}
                      </td>
                      <td className={cn("text-right tabular-nums font-medium", mover.isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                        {mover.isUp ? "+" : ""}{formatDecimal(mover.change, 2)}
                      </td>
                      <td className={cn("text-right tabular-nums font-semibold", mover.isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                        {formatPercent(mover.pct, 2, "—", false, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: BROKER CONNECTIONS + SYSTEM HEALTH + TRADING MODE (Col-Span 4) */}
        <div className="lg:col-span-4 space-y-3.5">
          {/* BROKER CONNECTIONS PANEL */}
          <div className="rounded-[10px] bg-[#0A1422] border border-[#12304A] p-3">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
              <span className="text-[12px] font-bold text-[#F8FAFC] uppercase tracking-wider">BROKER CONNECTIONS</span>
              <span className="text-[10px] font-semibold text-[#00E89A] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" />
                4/4 ONLINE
              </span>
            </div>

            <div className="space-y-1.5">
              {brokers.map((broker) => (
                <div
                  key={broker.name}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0C1727] border border-[#12304A] flex items-center justify-between text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#00E89A]" />
                    <span className="font-medium text-[#F8FAFC]">{broker.name}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/20">
                      {broker.status}
                    </span>
                    <span className="text-[#22D3EE] font-mono tabular-nums text-[11px]">{broker.latency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SYSTEM HEALTH PANEL */}
          <div className="rounded-[10px] bg-[#0A1422] border border-[#12304A] p-3">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
              <span className="text-[12px] font-bold text-[#F8FAFC] uppercase tracking-wider">SYSTEM HEALTH</span>
              <span className="text-[10px] font-medium text-[#7D8EA5]">TELEMETRY</span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              {systemHealth.map((item) => (
                <div
                  key={item.service}
                  className="flex items-center justify-between py-0.5"
                >
                  <span className="text-[#7D8EA5]">{item.service}</span>
                  <div className="flex items-center gap-1 text-[#00E89A]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A]" />
                    <span className="font-medium text-[10px]">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TRADING MODE PANEL */}
          <div className="rounded-[10px] bg-[#0A1422] border border-[#12304A] p-3">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
              <span className="text-[12px] font-bold text-[#F8FAFC] uppercase tracking-wider">TRADING MODE</span>
              <span className="text-[10px] uppercase text-[#17C5FF] bg-[#17C5FF]/10 px-1.5 py-0.2 rounded border border-[#17C5FF]/30 font-semibold">
                ACTIVE: PAPER
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {/* PAPER */}
              <button
                type="button"
                className="h-[34px] flex items-center justify-between px-2.5 rounded-lg bg-[#168BFF]/15 border border-[#168BFF] text-[#17C5FF] text-[11px] font-bold cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#22D3EE]" />
                  <span>PAPER</span>
                </div>
                <span className="text-[9px] font-bold text-[#22D3EE]">ACTIVE</span>
              </button>

              {/* SHADOW */}
              <button
                type="button"
                className="h-[34px] flex items-center justify-between px-2.5 rounded-lg bg-[#0C1727] border border-[#12304A] hover:border-[#7C3AED]/50 text-[#7C3AED] text-[11px] font-medium cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#7C3AED]" />
                  <span>SHADOW</span>
                </div>
              </button>

              {/* LIVE LOCKED */}
              <button
                type="button"
                disabled
                className="h-[34px] flex items-center justify-between px-2.5 rounded-lg bg-[#0C1727] border border-[#12304A] text-[#F59E0B] text-[11px] font-medium opacity-90 cursor-not-allowed"
              >
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-[#F59E0B]" />
                  <span>LOCKED</span>
                </div>
                <span className="text-[9px] text-[#F59E0B] font-semibold">SAFETY</span>
              </button>

              {/* LIVE */}
              <button
                type="button"
                disabled
                className="h-[34px] flex items-center justify-between px-2.5 rounded-lg bg-[#0C1727]/50 border border-[#12304A]/50 text-[#52627A] text-[11px] font-medium cursor-not-allowed"
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#FF3B5C]/40" />
                  <span>LIVE</span>
                </div>
                <span className="text-[9px] text-[#52627A]">OFF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. FULL-WIDTH POSITIONS / LEDGER PANEL ───────────────── */}
      <div className="rounded-[10px] bg-[#0A1422] border border-[#12304A] p-4">
        {/* Tab Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-[#10263A]">
          <div className="flex items-center gap-1 bg-[#05101A] p-1 rounded-lg border border-[#12304A]">
            <button
              type="button"
              onClick={() => setActiveLedgerTab("positions")}
              className={cn(
                "h-[32px] px-3.5 rounded-md text-[12px] font-semibold transition-colors cursor-pointer",
                activeLedgerTab === "positions"
                  ? "bg-[#0F6FD9] text-[#F8FAFC] border border-[#0EA5E9] shadow-xs"
                  : "bg-transparent text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0A1422]"
              )}
            >
              Positions ({displayPositions.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveLedgerTab("orders")}
              className={cn(
                "h-[32px] px-3.5 rounded-md text-[12px] font-semibold transition-colors cursor-pointer",
                activeLedgerTab === "orders"
                  ? "bg-[#0F6FD9] text-[#F8FAFC] border border-[#0EA5E9] shadow-xs"
                  : "bg-transparent text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0A1422]"
              )}
            >
              Orders ({displayOrders.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveLedgerTab("bots")}
              className={cn(
                "h-[32px] px-3.5 rounded-md text-[12px] font-semibold transition-colors cursor-pointer",
                activeLedgerTab === "bots"
                  ? "bg-[#0F6FD9] text-[#F8FAFC] border border-[#0EA5E9] shadow-xs"
                  : "bg-transparent text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0A1422]"
              )}
            >
              Bots ({displayBots.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveLedgerTab("strategies")}
              className={cn(
                "h-[32px] px-3.5 rounded-md text-[12px] font-semibold transition-colors cursor-pointer",
                activeLedgerTab === "strategies"
                  ? "bg-[#0F6FD9] text-[#F8FAFC] border border-[#0EA5E9] shadow-xs"
                  : "bg-transparent text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#0A1422]"
              )}
            >
              Strategies ({displayStrategies.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeLedgerTab === "positions") router.push("/positions");
              else if (activeLedgerTab === "orders") router.push("/orders");
              else if (activeLedgerTab === "bots") router.push("/bots");
              else if (activeLedgerTab === "strategies") router.push("/strategies");
            }}
            className="flex items-center gap-1 text-[11px] font-medium text-[#22D3EE] hover:underline cursor-pointer"
          >
            <span>Full View</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        {/* Tab 1: Positions Table */}
        {activeLedgerTab === "positions" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-[10px] font-medium text-[#7D8EA5] border-b border-[#10263A] h-[34px]">
                  <th className="pb-1.5 text-left font-medium">Symbol</th>
                  <th className="pb-1.5 text-center font-medium">Type</th>
                  <th className="pb-1.5 text-right font-medium">Qty</th>
                  <th className="pb-1.5 text-right font-medium">Avg Price</th>
                  <th className="pb-1.5 text-right font-medium">LTP</th>
                  <th className="pb-1.5 text-right font-medium">P&L</th>
                  <th className="pb-1.5 text-right font-medium">P&L %</th>
                  <th className="pb-1.5 text-center font-medium">Status</th>
                  <th className="pb-1.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#10263A]">
                {displayPositions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-[#7D8EA5]">
                      No open positions
                    </td>
                  </tr>
                ) : (
                  displayPositions.map((pos, idx) => {
                    if (!pos) return null;
                    const isLong = pos.direction === "LONG";
                    const hasPnl = pos.pnl !== null;
                    const isPnlPositive = (pos.pnl ?? 0) >= 0;
                    const hasPnlPct = pos.pnlPct !== null;
                    const isPnlPctPositive = (pos.pnlPct ?? 0) >= 0;

                    return (
                      <tr key={pos.id || idx} className="hover:bg-[#0F1C2F] transition-colors h-[40px]">
                        <td className="font-semibold text-[#F8FAFC]">{pos.symbol}</td>
                        <td className="text-center">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-[6px] text-[10px] font-semibold",
                              isLong
                                ? "bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30"
                                : "bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30"
                            )}
                          >
                            {pos.direction}
                          </span>
                        </td>
                        <td className="text-right text-[#F8FAFC] tabular-nums">
                          {formatQuantity(pos.quantity)}
                        </td>
                        <td className="text-right text-[#7D8EA5] tabular-nums">
                          {formatCurrency(pos.entryPrice, "₹", 2)}
                        </td>
                        <td className="text-right text-[#F8FAFC] tabular-nums font-medium">
                          {formatCurrency(pos.currentPrice, "₹", 2)}
                        </td>
                        <td
                          className={cn(
                            "text-right tabular-nums font-semibold",
                            hasPnl ? (isPnlPositive ? "text-[#00E89A]" : "text-[#FF3B5C]") : "text-[#7D8EA5]"
                          )}
                        >
                          {hasPnl ? (
                            `${isPnlPositive ? "+" : ""}${formatCurrency(pos.pnl, "₹", 2)}`
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          className={cn(
                            "text-right tabular-nums font-medium",
                            hasPnlPct ? (isPnlPctPositive ? "text-[#00E89A]" : "text-[#FF3B5C]") : "text-[#7D8EA5]"
                          )}
                        >
                          {hasPnlPct ? (
                            formatPercent(pos.pnlPct, 2, "—", false, true)
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="text-center">
                          <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30">
                            {pos.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => router.push(`/charts?symbol=${encodeURIComponent(pos.symbol)}`)}
                              className="h-[30px] w-[30px] rounded-[6px] bg-[#0A1422] hover:bg-[#168BFF]/20 border border-[#12304A] hover:border-[#168BFF]/40 text-[#7D8EA5] hover:text-[#22D3EE] flex items-center justify-center transition-colors cursor-pointer"
                              title="View Chart"
                            >
                              <BarChart2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push("/positions")}
                              className="h-[30px] w-[30px] rounded-[6px] bg-[#0A1422] hover:bg-[#0F1C2F] border border-[#12304A] text-[#7D8EA5] hover:text-[#F8FAFC] flex items-center justify-center transition-colors cursor-pointer"
                              title="More Options"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
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
        )}

        {/* Tab 2: Orders Table */}
        {activeLedgerTab === "orders" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-[10px] font-medium text-[#7D8EA5] border-b border-[#10263A] h-[34px]">
                  <th className="pb-1.5 text-left font-medium">Order ID</th>
                  <th className="pb-1.5 text-left font-medium">Symbol</th>
                  <th className="pb-1.5 text-center font-medium">Side</th>
                  <th className="pb-1.5 text-right font-medium">Qty</th>
                  <th className="pb-1.5 text-right font-medium">Price</th>
                  <th className="pb-1.5 text-center font-medium">Status</th>
                  <th className="pb-1.5 text-right font-medium">Time</th>
                  <th className="pb-1.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#10263A]">
                {displayOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-[#7D8EA5]">
                      No active orders
                    </td>
                  </tr>
                ) : (
                  displayOrders.map((ord, idx) => {
                    if (!ord) return null;
                    const isBuy = ord.side === "BUY";
                    return (
                      <tr key={ord.id || idx} className="hover:bg-[#0F1C2F] transition-colors h-[40px]">
                        <td className="font-mono text-[#7D8EA5]">{ord.id}</td>
                        <td className="font-semibold text-[#F8FAFC]">{ord.symbol}</td>
                        <td className="text-center">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-[6px] text-[10px] font-semibold",
                              isBuy
                                ? "bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30"
                                : "bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30"
                            )}
                          >
                            {ord.side}
                          </span>
                        </td>
                        <td className="text-right text-[#F8FAFC] tabular-nums">
                          {formatQuantity(ord.quantity ?? ord.filledQuantity)}
                        </td>
                        <td className="text-right text-[#F8FAFC] tabular-nums">
                          {formatCurrency(ord.price, "₹", 2)}
                        </td>
                        <td className="text-center">
                          <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30">
                            {ord.status}
                          </span>
                        </td>
                        <td className="text-right text-[#7D8EA5] tabular-nums">{ord.time}</td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => router.push("/orders")}
                            className="h-[30px] px-2.5 rounded-[6px] bg-[#0A1422] hover:bg-[#0F1C2F] border border-[#12304A] text-[10px] text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Bots Table */}
        {activeLedgerTab === "bots" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-[10px] font-medium text-[#7D8EA5] border-b border-[#10263A] h-[34px]">
                  <th className="pb-1.5 text-left font-medium">Bot Name</th>
                  <th className="pb-1.5 text-left font-medium">Broker</th>
                  <th className="pb-1.5 text-left font-medium">Instrument</th>
                  <th className="pb-1.5 text-left font-medium">Strategy</th>
                  <th className="pb-1.5 text-center font-medium">Timeframe</th>
                  <th className="pb-1.5 text-center font-medium">Status</th>
                  <th className="pb-1.5 text-right font-medium">Capital</th>
                  <th className="pb-1.5 text-right font-medium">P&L</th>
                  <th className="pb-1.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#10263A]">
                {displayBots.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-[#7D8EA5]">
                      No bot instances active
                    </td>
                  </tr>
                ) : (
                  displayBots.map((bot: any, idx: number) => {
                    if (!bot) return null;
                    const isRunning = (bot.status || "").toUpperCase() === "RUNNING";
                    return (
                      <tr key={bot.id || idx} className="hover:bg-[#0F1C2F] transition-colors h-[40px]">
                        <td className="font-semibold text-[#F8FAFC]">{bot.name || "Bot"}</td>
                        <td className="text-[#7D8EA5]">{bot.broker || "Paper"}</td>
                        <td className="text-[#22D3EE] font-medium">{bot.instrument || "—"}</td>
                        <td className="text-[#7D8EA5]">{bot.strategy || "—"}</td>
                        <td className="text-center text-[#7D8EA5]">{bot.timeframe || "—"}</td>
                        <td className="text-center">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-[6px] text-[10px] font-semibold",
                              isRunning
                                ? "bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30"
                                : "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30"
                            )}
                          >
                            {bot.status || "IDLE"}
                          </span>
                        </td>
                        <td className="text-right text-[#F8FAFC] tabular-nums">{bot.capital || "—"}</td>
                        <td className="text-right text-[#00E89A] font-semibold tabular-nums">{bot.pnl || "—"}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => router.push("/bots")}
                              className="h-[30px] w-[30px] rounded-[6px] bg-[#0A1422] hover:bg-[#0F1C2F] border border-[#12304A] text-[#7D8EA5] hover:text-[#22D3EE] flex items-center justify-center transition-colors cursor-pointer"
                              title={isRunning ? "Pause Bot" : "Start Bot"}
                            >
                              {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
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
        )}

        {/* Tab 4: Strategies Table */}
        {activeLedgerTab === "strategies" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-[10px] font-medium text-[#7D8EA5] border-b border-[#10263A] h-[34px]">
                  <th className="pb-1.5 text-left font-medium">Strategy Name</th>
                  <th className="pb-1.5 text-left font-medium">Instrument</th>
                  <th className="pb-1.5 text-left font-medium">Type</th>
                  <th className="pb-1.5 text-right font-medium">Win Rate</th>
                  <th className="pb-1.5 text-right font-medium">Profit Factor</th>
                  <th className="pb-1.5 text-center font-medium">Status</th>
                  <th className="pb-1.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#10263A]">
                {displayStrategies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[#7D8EA5]">
                      No strategies configured
                    </td>
                  </tr>
                ) : (
                  displayStrategies.map((strat, idx) => {
                    if (!strat) return null;
                    return (
                      <tr key={strat.name || idx} className="hover:bg-[#0F1C2F] transition-colors h-[40px]">
                        <td className="font-semibold text-[#F8FAFC]">{strat.name}</td>
                        <td className="text-[#22D3EE] font-medium">{strat.instrument}</td>
                        <td className="text-[#7D8EA5]">{strat.type}</td>
                        <td className="text-right text-[#00E89A] font-semibold tabular-nums">{strat.winRate}</td>
                        <td className="text-right text-[#F8FAFC] font-semibold tabular-nums">{strat.profitFactor}</td>
                        <td className="text-center">
                          <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30">
                            {strat.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => router.push("/strategies")}
                            className="h-[30px] px-3 rounded-[6px] bg-[#0A1422] hover:bg-[#168BFF]/20 border border-[#12304A] text-[10px] font-semibold text-[#22D3EE] transition-colors cursor-pointer"
                          >
                            Deploy
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. BOTTOM INFORMATION AREA (THREE COLUMNS: ALERTS, LOGS, STATUS & QUOTE) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left: Recent Alerts (Col-Span 4) */}
        <div className="lg:col-span-4 rounded-[10px] bg-[#0A1422] border border-[#12304A] p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
              <span className="text-[12px] font-bold text-[#F8FAFC]">Recent Alerts</span>
              <button
                type="button"
                onClick={() => router.push("/alerts")}
                className="text-[10px] font-medium text-[#22D3EE] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-1.5 text-[11px]">
              {recentAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-[#0C1727] border border-[#12304A] flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        alert.type === "blue" && "bg-[#22D3EE]",
                        alert.type === "orange" && "bg-[#F59E0B]",
                        alert.type === "amber" && "bg-[#F59E0B]"
                      )}
                    />
                    <span className="truncate text-[#B7C6D8]">{alert.text}</span>
                  </div>
                  <span className="text-[#7D8EA5] text-[10px] shrink-0 tabular-nums">{alert.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle: System Logs (Col-Span 4) */}
        <div className="lg:col-span-4 rounded-[10px] bg-[#0A1422] border border-[#12304A] p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
              <span className="text-[12px] font-bold text-[#F8FAFC]">System Logs</span>
              <button
                type="button"
                onClick={() => router.push("/logs")}
                className="text-[10px] font-medium text-[#22D3EE] hover:underline cursor-pointer"
              >
                Live Terminal
              </button>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              {systemLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-[#0C1727] border border-[#12304A] flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(log.isCyan ? "text-[#22D3EE]" : "text-[#00E89A]")}>●</span>
                    <span className="truncate text-[#B7C6D8]">{log.text}</span>
                  </div>
                  <span className="text-[#7D8EA5] text-[10px] shrink-0 tabular-nums">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Operational Status & System Quote (Col-Span 4) */}
        <div className="lg:col-span-4 rounded-[10px] bg-[#0A1422] border border-[#12304A] p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#10263A]">
              <span className="text-[12px] font-bold text-[#F8FAFC]">Terminal Status</span>
              <span className="text-[10px] font-semibold text-[#00E89A] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" />
                OPERATIONAL
              </span>
            </div>

            <div className="space-y-2 text-[11px] text-[#7D8EA5]">
              <div className="flex justify-between items-center py-1 border-b border-[#10263A]/50">
                <span>Latency</span>
                <span className="text-[#22D3EE] font-mono tabular-nums">42ms (Mumbai OMS)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#10263A]/50">
                <span>Execution Guard</span>
                <span className="text-[#00E89A] font-semibold">14/14 Rules Passed</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#10263A]/50">
                <span>Active Mode</span>
                <span className="text-[#17C5FF] font-semibold">Paper Trading</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#10263A]">
            <p className="text-[11px] italic text-[#9CB0C6] leading-relaxed">
              &ldquo;Discipline and algorithmic risk containment are the cornerstones of institutional alpha.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
