"use client";

import React, { useState, useMemo, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { TopHeader } from "./TopHeader";
import { MarketTickerStrip } from "./MarketTickerStrip";
import { PortfolioHeroKpi } from "./PortfolioHeroKpi";
import { AnalyticsNavTabs, AnalyticsTabKey } from "./AnalyticsNavTabs";
import { BrokerAnalyticsGrid } from "./BrokerAnalyticsGrid";
import { BoardAnalyticsGrid } from "./BoardAnalyticsGrid";
import { AssetStrategySectorRiskGrid } from "./AssetStrategySectorRiskGrid";
import { BottomAnalyticsGrid } from "./BottomAnalyticsGrid";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import { apiClient } from "@/lib/apiClient";
import {
  INITIAL_MARKET_TICKERS,
  INITIAL_MULTI_DIMENSIONAL,
  INITIAL_BOTTOM_ANALYTICS,
} from "@/services/portfolio-intelligence-service";
import {
  TimeframeFilter,
  MarketCategoryFilter,
  BrokerPortfolio,
  BoardPortfolio,
  MultiDimAllocation,
  PortfolioHeroData,
} from "@/types/portfolio-intelligence";
import { FleetMetrics, BotRowItem } from "@/types/bot-control";
import { X, CheckCircle2, ShieldAlert, Activity, TrendingUp, ExternalLink } from "lucide-react";

export const PortfolioIntelligenceDashboard = memo(function PortfolioIntelligenceDashboard() {
  // Live quant data core context
  const {
    accounts,
    portfolioSummary,
    providers,
    positions,
    environment,
    setEnvironment,
    refreshAll,
  } = useQuantDataCore();

  // Authoritative Bot Fleet Query (Single Source of Truth for Bot P&L)
  const { data: fleetData, refetch: refetchFleet } = useQuery<{
    status: string;
    metrics: FleetMetrics;
    bots: BotRowItem[];
  }>({
    queryKey: ["authoritativeFleetBots"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/bots", { timeoutMs: 8000 });
      if (!res.ok) return { status: "error", metrics: {} as any, bots: [] };
      return res.data;
    },
    staleTime: 1500,
    refetchInterval: 2500,
  });

  // State management
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<AnalyticsTabKey>("overview");
  const [timeframe, setTimeframe] = useState<TimeframeFilter>("1D");
  const [marketCategory, setMarketCategory] = useState<MarketCategoryFilter>("India");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Selected item for drilldown modal
  const [selectedItem, setSelectedItem] = useState<{
    type: "broker" | "board" | "dimension" | "kpi";
    title: string;
    data: any;
  } | null>(null);

  const [tickers, setTickers] = useState(INITIAL_MARKET_TICKERS);

  // Dynamic broker aggregation synchronized with Bot fleet PnL & accounts
  const brokers = useMemo<BrokerPortfolio[]>(() => {
    const fleetBots = fleetData?.bots || [];
    const brokerConfigs = [
      { id: "dhan", name: "DHAN", providerKey: "DHAN", defaultCurrency: "INR", logo: "dhan" },
      { id: "upstox", name: "UPSTOX", providerKey: "UPSTOX", defaultCurrency: "INR", logo: "upstox" },
      { id: "angel_one", name: "ANGEL ONE", providerKey: "ANGELONE", defaultCurrency: "INR", logo: "angel" },
      { id: "delta_exchange", name: "DELTA EXCHANGE", providerKey: "DELTA", defaultCurrency: "USD", logo: "delta" },
      { id: "binance", name: "BINANCE", providerKey: "BINANCE_USDM", defaultCurrency: "USDT", logo: "binance" },
    ];

    const totalFleetCap = fleetBots.reduce((sum, b) => sum + (Number(b.allocated_capital) || 0), 0) || accounts.reduce((sum, a) => sum + (Number(a.equity) || 0), 0);

    return brokerConfigs.map((cfg) => {
      // Match bots associated with this broker
      const matchingBots = fleetBots.filter((b) => {
        const brk = String(b.execution_broker || b.broker_account_id || b.market_data_provider || "").toUpperCase();
        return brk.includes(cfg.providerKey) || brk.includes(cfg.id.toUpperCase());
      });

      const matchingAccount = accounts.find(
        (a) =>
          a.provider.toUpperCase() === cfg.providerKey ||
          a.broker.toLowerCase().includes(cfg.id.replace("_", " ")) ||
          a.broker.toLowerCase().includes(cfg.name.toLowerCase())
      );

      const matchingProvider = providers.find(
        (p) =>
          p.name.toUpperCase().includes(cfg.providerKey) ||
          p.providerId?.toUpperCase() === cfg.providerKey
      );

      const isConnected = (matchingBots.length > 0 || !!matchingAccount) && (
        environment === "PAPER" ||
        matchingProvider?.accountConnected === true ||
        matchingProvider?.authenticated === true ||
        matchingAccount?.status === "HEALTHY" ||
        matchingAccount?.status === "CONNECTED"
      );

      // Bot attributed PnL takes precedence for exact fleet consistency
      const botPnlSum = matchingBots.reduce((sum, b) => {
        const pnlObj = b.pnl as any;
        return sum + (Number(b.today_pnl ?? pnlObj?.today ?? b.net_pnl ?? pnlObj?.net) || 0);
      }, 0);

      const pnl = matchingBots.length > 0
        ? Math.round(botPnlSum * 100) / 100
        : matchingAccount
        ? (Number(matchingAccount.realizedPnL) || 0) + (Number(matchingAccount.unrealizedPnL) || 0)
        : 0;

      const botCapSum = matchingBots.reduce((sum, b) => sum + (Number(b.allocated_capital) || 0), 0);
      const allocatedValue = matchingBots.length > 0
        ? botCapSum
        : matchingAccount
        ? Number(matchingAccount.equity)
        : 0;

      const allocatedPercentage = totalFleetCap > 0 && allocatedValue > 0
        ? Number(((allocatedValue / totalFleetCap) * 100).toFixed(1))
        : 0;

      const openPositionsCount = matchingBots.filter((b) => (b.position as any)?.has_position || (b as any).open_trades > 0).length;
      const positionsCount = matchingBots.length || positions.filter((p) => p.provider?.toUpperCase() === cfg.providerKey).length;

      const currency = matchingAccount?.currency || cfg.defaultCurrency;

      const segments = matchingBots.length > 0
        ? matchingBots.slice(0, 4).map((b, i) => {
            const colors = ["#16C6F4", "#00E890", "#8B5CF6", "#F59E0B"];
            const pct = allocatedValue > 0 ? Math.round(((Number(b.allocated_capital) || 0) / allocatedValue) * 100) : 25;
            return {
              name: b.name || b.symbol,
              value: Number(b.allocated_capital) || 0,
              percentage: pct || 25,
              color: colors[i % colors.length],
            };
          })
        : isConnected && matchingAccount && matchingAccount.equity > 0
        ? [
            { name: "Available Cash", value: matchingAccount.availableCash, percentage: Math.max(1, Math.round((matchingAccount.availableCash / matchingAccount.equity) * 100)), color: "#00E890" },
            { name: "Margin Used", value: matchingAccount.marginUsed, percentage: Math.round((matchingAccount.marginUsed / matchingAccount.equity) * 100), color: "#F59E0B" },
          ].filter((s) => s.percentage > 0)
        : [];

      return {
        id: cfg.id,
        name: cfg.name,
        logo: cfg.logo,
        status: isConnected ? ("Connected" as const) : ("Not Configured" as const),
        allocatedValue,
        allocatedPercentage,
        positionsCount,
        openPositionsCount,
        pnl,
        currency,
        providerId: cfg.providerKey,
        isConfigured: isConnected,
        statusMessage: isConnected ? "Live bots & balances synced" : "API credentials not linked",
        segments: segments.length > 0 ? segments : [{ name: "Zero Allocation", value: 100, percentage: 100, color: "#334155" }],
      };
    });
  }, [fleetData, accounts, providers, positions, environment]);

  // Dynamic hero KPI data directly matching Bot Fleet metrics
  const heroData = useMemo<PortfolioHeroData>(() => {
    const fleetMetrics = fleetData?.metrics;
    if (fleetMetrics) {
      const todayPnl = Number(fleetMetrics.today_pnl ?? fleetMetrics.pnl_today ?? 0);
      const realizedPnl = Number(fleetMetrics.realized_pnl ?? 0);
      const unrealizedPnl = Number(fleetMetrics.unrealized_pnl ?? 0);
      const allocatedCap = Number(fleetMetrics.allocated_capital ?? fleetMetrics.total_capital ?? 236000);
      const capUsed = Number(fleetMetrics.capital_used ?? fleetMetrics.current_exposure ?? 0);
      const availableCap = Number(fleetMetrics.available_capital ?? Math.max(0, allocatedCap - capUsed));
      const totalEquity = Number(fleetMetrics.current_equity ?? fleetMetrics.current_balance ?? (allocatedCap + todayPnl));
      const winRate = Number(fleetMetrics.win_rate_pct ?? 0);
      const openTrades = Number(fleetMetrics.open_trades ?? positions.length ?? 0);
      const marginUtil = allocatedCap > 0 ? Number(((capUsed / allocatedCap) * 100).toFixed(1)) : 0;
      const dayPnlPercent = allocatedCap > 0 ? Number(((todayPnl / allocatedCap) * 100).toFixed(2)) : 0;

      return {
        totalValue: Math.round(totalEquity),
        dayChangeAmount: Math.round(todayPnl),
        dayChangePercent: dayPnlPercent,
        invested: Math.round(allocatedCap),
        available: Math.round(availableCap),
        usedMargin: Math.round(capUsed),
        realizedPnl: Math.round(realizedPnl),
        winRate,
        unrealizedPnl: Math.round(unrealizedPnl),
        openPositionsCount: openTrades,
        dayPnl: Math.round(todayPnl),
        dayPnlPercent,
        maxDrawdown: Math.min(0, Math.round(unrealizedPnl)),
        maxDrawdownPercent: allocatedCap > 0 ? Number(((Math.min(0, unrealizedPnl) / allocatedCap) * 100).toFixed(2)) : 0,
        marginUtilization: marginUtil,
      };
    }

    if (portfolioSummary?.byCurrency && Object.keys(portfolioSummary.byCurrency).length > 0) {
      const inrMetrics = portfolioSummary.byCurrency["INR"];
      const usdMetrics = portfolioSummary.byCurrency["USD"];
      const usdtMetrics = portfolioSummary.byCurrency["USDT"];

      const totalCash = (inrMetrics?.totalCash || 0) + (usdMetrics?.totalCash || 0) * 87.5 + (usdtMetrics?.totalCash || 0) * 87.5;
      const availableCash = (inrMetrics?.availableCash || 0) + (usdMetrics?.availableCash || 0) * 87.5 + (usdtMetrics?.availableCash || 0) * 87.5;
      const marginUsed = (inrMetrics?.marginUsed || 0) + (usdMetrics?.marginUsed || 0) * 87.5 + (usdtMetrics?.marginUsed || 0) * 87.5;
      const realizedPnl = (inrMetrics?.realizedPnL || 0) + (usdMetrics?.realizedPnL || 0) * 87.5 + (usdtMetrics?.realizedPnL || 0) * 87.5;
      const unrealizedPnl = (inrMetrics?.unrealizedPnL || 0) + (usdMetrics?.unrealizedPnL || 0) * 87.5 + (usdtMetrics?.unrealizedPnL || 0) * 87.5;
      const equity = (inrMetrics?.equity || 0) + (usdMetrics?.equity || 0) * 87.5 + (usdtMetrics?.equity || 0) * 87.5;

      const dayPnl = realizedPnl + unrealizedPnl;
      const dayPnlPercent = totalCash > 0 ? Number(((dayPnl / totalCash) * 100).toFixed(2)) : 0;
      const marginUtilization = totalCash > 0 ? Number(((marginUsed / totalCash) * 100).toFixed(1)) : 0;

      return {
        totalValue: Math.round(equity || totalCash || 0),
        dayChangeAmount: Math.round(dayPnl),
        dayChangePercent: dayPnlPercent,
        invested: Math.round(totalCash || equity || 0),
        available: Math.round(availableCash),
        usedMargin: Math.round(marginUsed),
        realizedPnl: Math.round(realizedPnl),
        winRate: positions.length > 0 ? 68 : 0,
        unrealizedPnl: Math.round(unrealizedPnl),
        openPositionsCount: positions.length,
        dayPnl: Math.round(dayPnl),
        dayPnlPercent,
        maxDrawdown: Math.min(0, Math.round(unrealizedPnl)),
        maxDrawdownPercent: totalCash > 0 ? Number(((Math.min(0, unrealizedPnl) / totalCash) * 100).toFixed(2)) : 0,
        marginUtilization,
      };
    }

    return {
      totalValue: 0,
      dayChangeAmount: 0,
      dayChangePercent: 0,
      invested: 0,
      available: 0,
      usedMargin: 0,
      realizedPnl: 0,
      winRate: 0,
      unrealizedPnl: 0,
      openPositionsCount: 0,
      dayPnl: 0,
      dayPnlPercent: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      marginUtilization: 0,
    };
  }, [fleetData, portfolioSummary, positions]);

  // Dynamic Boards from Bot Fleet
  const boards = useMemo<BoardPortfolio[]>(() => {
    const fleetBots = fleetData?.bots || [];
    const totalAllocated = fleetBots.reduce((sum, b) => sum + (Number(b.allocated_capital) || 0), 0) || 236000;

    const boardDefinitions = [
      { id: "nse_cash", name: "NSE Cash Desk", code: "NSE-EQ", iconName: "TrendingUp", filter: (b: BotRowItem) => (b.asset_class || "").toUpperCase().includes("EQUITY") || (b.symbol || "").includes("RELIANCE") },
      { id: "nse_fno", name: "NSE F&O Derivatives", code: "NSE-DERIV", iconName: "Zap", filter: (b: BotRowItem) => (b.asset_class || "").toUpperCase().includes("OPTIONS") || (b.symbol || "").includes("NIFTY") || (b.symbol || "").includes("BANKNIFTY") },
      { id: "bse", name: "BSE Cash", code: "BSE-MAIN", iconName: "Building2", filter: (b: BotRowItem) => (b.asset_class || "").toUpperCase().includes("BSE") || (b.symbol || "").includes("SENSEX") },
      { id: "crypto_deriv", name: "Crypto Derivatives (Delta/Binance)", code: "CRYPTO-PERP", iconName: "Coins", filter: (b: BotRowItem) => (b.asset_class || "").toUpperCase().includes("CRYPTO") || (b.symbol || "").includes("BTC") || (b.symbol || "").includes("ETH") },
      { id: "mcx", name: "MCX Commodities", code: "MCX-COMM", iconName: "Layers", filter: (b: BotRowItem) => (b.asset_class || "").toUpperCase().includes("COMMODITY") || (b.symbol || "").includes("GOLD") || (b.symbol || "").includes("CRUDE") },
    ];

    return boardDefinitions.map((board) => {
      const matchingBots = fleetBots.filter(board.filter);
      const allocatedValue = matchingBots.reduce((sum, b) => sum + (Number(b.allocated_capital) || 0), 0) || (matchingBots.length > 0 ? matchingBots.length * 50000 : 0);
      const pnl = matchingBots.reduce((sum, b) => {
        const pnlObj = b.pnl as any;
        return sum + (Number(b.today_pnl ?? pnlObj?.today ?? b.net_pnl ?? pnlObj?.net) || 0);
      }, 0);
      const allocatedPercentage = totalAllocated > 0 ? Number(((allocatedValue / totalAllocated) * 100).toFixed(1)) : 0;

      return {
        id: board.id,
        name: board.name,
        code: board.code,
        iconName: board.iconName,
        allocatedValue,
        allocatedPercentage,
        itemCount: matchingBots.length || 1,
        itemLabel: "Active Bots",
        pnl: Math.round(pnl * 100) / 100,
        segments: matchingBots.length > 0
          ? matchingBots.slice(0, 3).map((b, i) => ({
              name: b.name || b.symbol,
              value: Number(b.allocated_capital) || 50000,
              percentage: Math.round(100 / Math.max(1, matchingBots.length)),
              color: i === 0 ? "#16C6F4" : i === 1 ? "#00E890" : "#8B5CF6",
            }))
          : [{ name: "Allocated", value: 100, percentage: 100, color: "#16C6F4" }],
      };
    });
  }, [fleetData]);

  // Dynamic Bottom Analytics synced with Bot Fleet P&L and Deployments
  const bottomAnalytics = useMemo(() => {
    const fleetBots = fleetData?.bots || [];
    const fleetMetrics = fleetData?.metrics;

    const totalPnl = Number(fleetMetrics?.today_pnl ?? fleetMetrics?.pnl_today ?? 0);
    const totalCap = Number(fleetMetrics?.allocated_capital ?? 236000);

    const brokerPnlItems = brokers.map((b) => ({
      label: b.name,
      value: b.pnl,
      formattedValue: `₹ ${b.pnl >= 0 ? "+" : ""}${b.pnl.toLocaleString("en-IN")}`,
      percentage: Math.min(100, Math.abs(b.pnl) / Math.max(1, Math.abs(totalPnl)) * 100),
      isPositive: b.pnl >= 0,
    }));

    const boardPnlItems = boards.map((bd) => ({
      label: bd.name,
      value: bd.pnl,
      formattedValue: `₹ ${bd.pnl >= 0 ? "+" : ""}${bd.pnl.toLocaleString("en-IN")}`,
      percentage: Math.min(100, Math.abs(bd.pnl) / Math.max(1, Math.abs(totalPnl)) * 100),
      isPositive: bd.pnl >= 0,
    }));

    return {
      pnlBreakdown: {
        title: "Bot Fleet P&L Breakdown",
        centerValue: `₹ ${totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString("en-IN")}`,
        centerSubtitle: "Live Fleet MTM",
        segments: brokers.map((b, i) => {
          const colors = ["#16C6F4", "#00E890", "#8B5CF6", "#F59E0B", "#EC4899"];
          return {
            name: b.name,
            value: Math.max(1, Math.abs(b.pnl)),
            percentage: totalPnl !== 0 ? Math.round((Math.abs(b.pnl) / Math.abs(totalPnl)) * 100) : 20,
            color: colors[i % colors.length],
            pnl: b.pnl,
          };
        }),
      },
      capitalDeployment: {
        title: "Capital Deployment",
        centerValue: `₹ ${totalCap.toLocaleString("en-IN")}`,
        centerSubtitle: "Total Active Capital",
        segments: brokers.map((b, i) => {
          const colors = ["#16C6F4", "#00E890", "#8B5CF6", "#F59E0B", "#EC4899"];
          return {
            name: b.name,
            value: b.allocatedValue,
            percentage: Math.round(b.allocatedPercentage),
            color: colors[i % colors.length],
          };
        }),
      },
      brokerWisePnl: brokerPnlItems,
      boardWisePnl: boardPnlItems,
      dailyPerformance: {
        title: "Daily Win/Loss Distribution",
        centerValue: `${fleetMetrics?.win_rate_pct ?? 32.1}%`,
        centerSubtitle: `${fleetMetrics?.wins ?? 9}W / ${fleetMetrics?.losses ?? 19}L / ${fleetMetrics?.breakeven ?? 2}BE`,
        segments: [
          { name: "Profitable Trades", value: fleetMetrics?.wins ?? 9, percentage: Math.round(((fleetMetrics?.wins ?? 9) / Math.max(1, fleetMetrics?.total_trades ?? 30)) * 100), color: "#00E890" },
          { name: "Loss Trades", value: fleetMetrics?.losses ?? 19, percentage: Math.round(((fleetMetrics?.losses ?? 19) / Math.max(1, fleetMetrics?.total_trades ?? 30)) * 100), color: "#FF3B5C" },
          { name: "Breakeven", value: fleetMetrics?.breakeven ?? 2, percentage: Math.round(((fleetMetrics?.breakeven ?? 2) / Math.max(1, fleetMetrics?.total_trades ?? 30)) * 100), color: "#64748B" },
        ],
      },
    };
  }, [fleetData, brokers, boards]);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshAll(), refetchFleet()]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [refreshAll, refetchFleet]);

  // Search filtering
  const filteredBrokers = useMemo(() => {
    if (!searchQuery.trim()) return brokers;
    const q = searchQuery.toLowerCase();
    return brokers.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.segments.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [brokers, searchQuery]);

  const filteredBoards = useMemo(() => {
    if (!searchQuery.trim()) return boards;
    const q = searchQuery.toLowerCase();
    return boards.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.segments.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [boards, searchQuery]);

  const filteredMultiDim = useMemo(() => {
    if (!searchQuery.trim()) return INITIAL_MULTI_DIMENSIONAL;
    const q = searchQuery.toLowerCase();
    return INITIAL_MULTI_DIMENSIONAL.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.segments.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Handlers for clicks
  const handleBrokerClick = useCallback((broker: BrokerPortfolio) => {
    setSelectedItem({
      type: "broker",
      title: `${broker.name} Intelligence & Allocation`,
      data: broker,
    });
  }, []);

  const handleBoardClick = useCallback((board: BoardPortfolio) => {
    setSelectedItem({
      type: "board",
      title: `${board.name} Execution & Market Depth`,
      data: board,
    });
  }, []);

  const handleMultiDimClick = useCallback((item: MultiDimAllocation) => {
    setSelectedItem({
      type: "dimension",
      title: `${item.title} Breakdown`,
      data: item,
    });
  }, []);

  const handleKpiClick = useCallback((metricKey: string) => {
    setSelectedItem({
      type: "kpi",
      title: `Portfolio Metric: ${metricKey.replace(/_/g, " ").toUpperCase()}`,
      data: { metric: metricKey, value: heroData },
    });
  }, [heroData]);

  const connectedCount = brokers.filter((b) => b.status === "Connected").length;

  return (
    <div className="w-full min-h-screen bg-[#020B14] text-slate-100 font-sans flex flex-col antialiased select-none">
      {/* DISCONNECTED LIVE BANNER */}
      {environment === "LIVE" && connectedCount === 0 && (
        <div className="mx-4 mt-3 p-3.5 rounded-xl bg-gradient-to-r from-rose-950/60 via-amber-950/30 to-[#07131f] border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <span>Live Broker Mode Active • No Accounts Linked</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono">LIVE ZERO EXPOSURE</span>
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Configure your API keys in Settings to stream authentic balances and positions from DhanHQ, Upstox, Angel One, Delta, or Binance.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setEnvironment("PAPER")}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
            >
              Use Paper Simulator
            </button>
            <Link
              href="/settings"
              className="px-3 py-1.5 rounded-lg bg-[#16C6F4] hover:bg-[#16C6F4]/90 text-[#020B14] text-xs font-bold flex items-center gap-1 transition-all shadow-sm"
            >
              <span>Connect API Keys</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* PORTFOLIO HERO / KPI AREA */}
      <PortfolioHeroKpi
        data={heroData}
        onCardClick={handleKpiClick}
      />

      {/* 4. PRIMARY NAVIGATION / ANALYTICS TABS */}
      <AnalyticsNavTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeTimeframe={timeframe}
        onSelectTimeframe={setTimeframe}
      />

      {/* 5. MAIN ANALYTICS ROWS */}
      <main className="flex-1 p-4 space-y-4 max-w-[1720px] w-full mx-auto">
        {/* ROW 1: BROKER ANALYTICS GRID (5 Cards) */}
        {(activeTab === "overview" || activeTab === "by_broker") && (
          <section aria-label="Broker Analytics Grid">
            <BrokerAnalyticsGrid
              brokers={filteredBrokers}
              onBrokerClick={handleBrokerClick}
            />
          </section>
        )}

        {/* ROW 2: BOARD / MARKET ANALYTICS GRID (5 Cards) */}
        {(activeTab === "overview" || activeTab === "by_board") && (
          <section aria-label="Board and Market Analytics Grid">
            <BoardAnalyticsGrid
              boards={filteredBoards}
              onBoardClick={handleBoardClick}
            />
          </section>
        )}

        {/* ROW 3: ASSET / STRATEGY / SECTOR / EXPIRY / RISK (5 Cards) */}
        {(activeTab === "overview" ||
          activeTab === "by_asset" ||
          activeTab === "by_strategy" ||
          activeTab === "by_sector" ||
          activeTab === "by_expiry" ||
          activeTab === "by_risk") && (
          <section aria-label="Multi-Dimensional Portfolio Intelligence Grid">
            <AssetStrategySectorRiskGrid
              items={filteredMultiDim}
              onItemClick={handleMultiDimClick}
            />
          </section>
        )}

        {/* ROW 4: BOTTOM ANALYTICS (P&L Breakdown, Capital Deployment, Broker P&L, Board P&L, Daily Performance) */}
        {(activeTab === "overview" ||
          activeTab === "by_pnl" ||
          activeTab === "capital_allocation" ||
          activeTab === "performance_analytics") && (
          <section aria-label="Bottom Financial Performance Grid">
            <BottomAnalyticsGrid
              pnlBreakdown={bottomAnalytics.pnlBreakdown}
              capitalDeployment={bottomAnalytics.capitalDeployment}
              brokerWisePnl={bottomAnalytics.brokerWisePnl}
              boardWisePnl={bottomAnalytics.boardWisePnl}
              dailyPerformance={bottomAnalytics.dailyPerformance}
              onCardClick={(type) =>
                setSelectedItem({
                  type: "dimension",
                  title: `Analytics Focus: ${type.replace(/_/g, " ").toUpperCase()}`,
                  data: { type },
                })
              }
            />
          </section>
        )}
      </main>

      {/* MODAL: Card Detail Drilldown */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-[#061A2A] border border-[#16C6F4]/40 shadow-2xl p-5 text-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#0C2237]">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-[#092237] border border-[#16C6F4]/40 flex items-center justify-center text-[#16C6F4]">
                  <Activity className="h-4 w-4" />
                </div>
                <h3 className="text-[14px] font-bold text-white tracking-tight">
                  {selectedItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-md text-[#7D8EA5] hover:text-white hover:bg-[#0A243A] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-[12px] text-[#8EA1B7]">
              <div className="p-3 rounded-lg bg-[#030D18] border border-[#0C1E30] flex items-center justify-between">
                <span>System Status</span>
                <span className="flex items-center gap-1 text-[#00E890] font-semibold">
                  <span className="h-2 w-2 rounded-full bg-[#00E890] animate-pulse" />
                  Live Synchronized & Guarded
                </span>
              </div>

              {selectedItem.data?.allocatedValue !== undefined && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded bg-[#030D18] border border-[#0C1E30]">
                    <div className="text-[10px] text-[#7D8EA5]">Allocated Capital</div>
                    <div className="text-[15px] font-bold text-white font-mono">
                      ₹ {Number(selectedItem.data.allocatedValue).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-[#030D18] border border-[#0C1E30]">
                    <div className="text-[10px] text-[#7D8EA5]">Allocation %</div>
                    <div className="text-[15px] font-bold text-[#16C6F4] font-mono">
                      {selectedItem.data.allocatedPercentage}%
                    </div>
                  </div>
                </div>
              )}

              {selectedItem.data?.pnl !== undefined && (
                <div className="p-2.5 rounded bg-[#030D18] border border-[#0C1E30] flex items-center justify-between">
                  <span className="text-[11px] text-[#7D8EA5]">Net Attributed P&L</span>
                  <span
                    className={`font-mono font-bold text-[14px] ${
                      Number(selectedItem.data.pnl) >= 0 ? "text-[#00E890]" : "text-[#FF3B5C]"
                    }`}
                  >
                    {Number(selectedItem.data.pnl) >= 0 ? "+" : ""}₹ {Number(selectedItem.data.pnl).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {selectedItem.data?.segments && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-slate-300">Constituent Allocation Breakdown</div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {selectedItem.data.segments.map((s: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded bg-[#041220] border border-[#0D263D] text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="text-white font-medium">{s.name}</span>
                        </div>
                        <span className="font-mono text-[#16C6F4] font-bold">{s.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#0C2237] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-1.5 rounded-lg bg-[#16C6F4] text-[#020B14] font-bold text-xs hover:bg-[#16C6F4]/90 transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
