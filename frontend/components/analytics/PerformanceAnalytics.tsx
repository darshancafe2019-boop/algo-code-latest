"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";
import {
  formatMoney,
  formatPnL,
  formatPercent,
  formatNumber,
  formatPrice,
} from "@/lib/formatters";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Award,
  BarChart3,
  LineChart,
  ShieldCheck,
  FileText,
  Sliders,
  RefreshCw,
  Zap,
  Globe,
  DollarSign,
  PieChart,
  Landmark,
  Scale,
} from "lucide-react";

import { JournalFilterBar, JournalFilterState, CURRENCY_OPTIONS } from "./JournalFilterBar";
import { TradeSummaryPanel } from "./TradeSummaryPanel";
import { PerformanceTopCenterSection } from "./PerformanceTopCenterSection";
import { PerformanceAnalyticsSectionB } from "./PerformanceAnalyticsSectionB";
import { SpreadsheetTradeLedgerTable } from "./SpreadsheetTradeLedgerTable";

import { DailyProfitabilityBarChart } from "./DailyProfitabilityBarChart";
import { PnLCalendarHeatmap } from "./PnLCalendarHeatmap";
import { PnLDistributionHistogram } from "./PnLDistributionHistogram";
import { MultiDimensionAttributionMatrix } from "./MultiDimensionAttributionMatrix";
import { InteractiveEquityCurvePanel } from "./InteractiveEquityCurvePanel";
import { InstitutionalCapitalSegregationTab } from "./InstitutionalCapitalSegregationTab";
import { DayAnalysisDrawer } from "./DayAnalysisDrawer";
import { PnLStatementExporter } from "./PnLStatementExporter";
import { DailyProfitabilityBar } from "@/types/pnl-analytics";

export function PerformanceAnalytics() {
  const queryClient = useQueryClient();
  const {
    portfolioSnapshot,
    positions,
    riskSummary,
    tradingMode,
    isLive,
    isStale,
    reconciliationStatus,
    refreshAll,
    setTradingMode,
  } = useGlobalData();

  // Active View Switcher
  const [activeView, setActiveView] = useState<string>("JOURNAL");
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [isExporterOpen, setIsExporterOpen] = useState<boolean>(false);

  // Filter State
  const [filters, setFilters] = useState<JournalFilterState>({
    period: "ALL",
    broker: "ALL",
    account: "ALL",
    mode: "ALL",
    asset: "ALL",
    market: "ALL",
    strategy: "ALL",
    setup: "ALL",
    direction: "ALL",
    currency: "INR",
  });

  const handleChangeFilter = <K extends keyof JournalFilterState>(key: K, value: JournalFilterState[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      period: "ALL",
      broker: "ALL",
      account: "ALL",
      mode: "ALL",
      asset: "ALL",
      market: "ALL",
      strategy: "ALL",
      setup: "ALL",
      direction: "ALL",
      currency: "INR",
    });
  };

  // Currency symbol resolution
  const currencySymbol = useMemo(() => {
    const c = CURRENCY_OPTIONS.find((opt) => opt.id === filters.currency);
    return c ? c.symbol : "₹";
  }, [filters.currency]);

  // 1. Fetch Authoritative Multi-Broker Dashboard Payload
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
    refetch: refetchDashboard,
    isFetching: isFetchingDashboard,
  } = useQuery({
    queryKey: ["pnlDashboardPayload", filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        mode: filters.mode,
        broker: filters.broker,
        account: filters.account,
        period: filters.period,
        asset: filters.asset,
        market: filters.market,
        strategy: filters.strategy,
        setup: filters.setup,
        direction: filters.direction,
        currency: filters.currency,
        limit: "100",
      });

      const res = await apiClient.get<any>(`/api/portfolio/pnl/dashboard?${params.toString()}`, {
        timeoutMs: 8000,
      });
      if (!res.ok || !res.data) return null;
      return res.data;
    },
    staleTime: 5000,
    refetchInterval: 10000,
  });

  // 2. Fetch Authoritative Daily Profitability Bars (for Calendar / Secondary Views)
  const {
    data: barsData,
    isLoading: isLoadingBars,
    refetch: refetchBars,
  } = useQuery<{ status: string; bars: DailyProfitabilityBar[] }>({
    queryKey: ["profitabilityBars", filters.mode, filters.period, filters.strategy],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; bars: DailyProfitabilityBar[] }>(
        `/api/portfolio/performance/bars?mode=${filters.mode}&range=${filters.period}&timezone=UTC&strategy_id=${filters.strategy}`,
        { timeoutMs: 6000 }
      );
      if (!res.ok || !res.data) return { status: "success", bars: [] };
      return res.data;
    },
    staleTime: 5000,
  });

  const handleRefreshAll = () => {
    refetchDashboard();
    refetchBars();
    refreshAll();
  };

  const handleExportCsv = () => {
    if (typeof window !== "undefined") {
      window.open(`/api/trades/export-csv?mode=${filters.mode}&period=${filters.period}`, "_blank");
    }
  };

  // Safe destructuring of dashboard data
  const summary = dashboardData?.trade_summary || {};
  const instruments = dashboardData?.instrument_performance || [];
  const openPositions = dashboardData?.open_positions || [];
  const openPositionsBreakdown = dashboardData?.open_positions_breakdown || {
    total_open: openPositions.length,
    options: 0,
    futures: 0,
    equities: 0,
    crypto: 0,
    forex: 0,
    commodities: 0,
    long_count: 0,
    short_count: 0,
  };
  const strategies = dashboardData?.strategy_performance || [];
  const markets = dashboardData?.market_performance || [];
  const distributions = dashboardData?.trade_distribution || [];
  const brokers = dashboardData?.multi_broker_performance || [];
  const emotions = dashboardData?.emotion_stats || [];
  const trades = dashboardData?.trades || [];

  const availableBarDates = useMemo(() => {
    return barsData?.bars?.map((b) => b.date) || [];
  }, [barsData?.bars]);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1900px] mx-auto min-w-0 font-sans">
      {/* 1. TOP FILTER BAR */}
      <JournalFilterBar
        filters={filters}
        onChangeFilter={handleChangeFilter}
        onResetFilters={handleResetFilters}
        onRefresh={handleRefreshAll}
        isFetching={isFetchingDashboard}
        onExportCsv={handleExportCsv}
        activeView={activeView}
        onChangeView={setActiveView}
      />

      {/* 2. PRIMARY VIEW: SPREADSHEET TRADING JOURNAL DASHBOARD */}
      {activeView === "JOURNAL" && (
        <div className="space-y-4 animate-fadeIn">
          {/* SECTION A: TOP SUMMARY (LEFT PANEL + TOP CENTER PERFORMANCE CARDS) */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
            {/* Left Panel: Trade Summary */}
            <div className="xl:col-span-1">
              <TradeSummaryPanel
                summary={summary}
                currencySymbol={currencySymbol}
              />
            </div>

            {/* Center / Right: Performance Analytics Cards */}
            <div className="xl:col-span-2">
              <PerformanceTopCenterSection
                instruments={instruments}
                openPositionsBreakdown={openPositionsBreakdown}
                strategies={strategies}
                winCount={summary.winning_trades}
                lossCount={summary.losing_trades}
                breakevenCount={summary.breakeven_trades}
                winRate={summary.win_rate}
                avgWin={summary.avg_win}
                avgLoss={summary.avg_loss}
                avgWinPct={summary.avg_win_pct}
                avgLossPct={summary.avg_loss_pct}
                maxGain={summary.max_gain}
                maxLoss={summary.max_loss}
                avgWinDurationMins={summary.avg_win_duration_mins}
                avgLossDurationMins={summary.avg_loss_duration_mins}
                currencySymbol={currencySymbol}
              />
            </div>
          </div>

          {/* SECTION B: PERFORMANCE ANALYTICS (MARKETS, DISTRIBUTION, BROKERS, EMOTIONS) */}
          <PerformanceAnalyticsSectionB
            markets={markets}
            distributions={distributions}
            strategies={strategies}
            brokers={brokers}
            emotions={emotions}
            currencySymbol={currencySymbol}
          />

          {/* SECTION C: SPREADSHEET TRADE LEDGER TABLE */}
          <SpreadsheetTradeLedgerTable
            trades={trades}
            openPositions={openPositions}
            currencySymbol={currencySymbol}
            isFetching={isFetchingDashboard}
          />
        </div>
      )}

      {/* 3. SECONDARY VIEW: INTERACTIVE EQUITY CURVE */}
      {activeView === "EQUITY_CURVE" && (
        <div className="space-y-4 animate-fadeIn">
          <InteractiveEquityCurvePanel
            initialRange={filters.period}
            onSelectDateAcrossPage={(dayStr) => setSelectedDayDate(dayStr)}
          />
        </div>
      )}

      {/* 4. SECONDARY VIEW: CALENDAR HEATMAP */}
      {activeView === "CALENDAR_HEATMAP" && (
        <div className="space-y-4 animate-fadeIn">
          <PnLCalendarHeatmap
            bars={barsData?.bars || []}
            currency={currencySymbol}
            currencyRate={1.0}
            selectedDate={selectedDayDate}
            onSelectDate={(dayStr) => setSelectedDayDate(dayStr)}
            tradingMode={filters.mode === "LIVE" ? "LIVE" : "PAPER"}
          />
          <DailyProfitabilityBarChart
            bars={barsData?.bars || []}
            currency={currencySymbol}
            selectedDate={selectedDayDate}
            onSelectDate={(dayStr) => setSelectedDayDate(dayStr)}
            tradingMode={filters.mode === "LIVE" ? "LIVE" : "PAPER"}
          />
        </div>
      )}

      {/* 5. SECONDARY VIEW: ATTRIBUTION MATRIX */}
      {activeView === "ATTRIBUTION" && (
        <div className="space-y-4 animate-fadeIn">
          <MultiDimensionAttributionMatrix
            botsData={[]}
            strategiesData={strategies}
            currency={currencySymbol}
            currencyRate={1.0}
          />
          <PnLDistributionHistogram
            trades={trades}
            currency={currencySymbol}
            currencyRate={1.0}
          />
        </div>
      )}

      {/* 6. SECONDARY VIEW: INSTITUTIONAL CAPITAL SEGREGATION */}
      {activeView === "CAPITAL_SEGREGATION" && (
        <div className="space-y-4 animate-fadeIn">
          <InstitutionalCapitalSegregationTab />
        </div>
      )}

      {/* Day Details Drawer (if user clicks on specific day in calendar/equity) */}
      <DayAnalysisDrawer
        date={selectedDayDate}
        isOpen={Boolean(selectedDayDate)}
        onClose={() => setSelectedDayDate(null)}
        onSelectDate={(dayStr) => setSelectedDayDate(dayStr)}
        allAvailableDates={availableBarDates}
        mode={filters.mode === "LIVE" ? "LIVE" : "PAPER"}
        timezone="UTC"
        currency={currencySymbol}
      />

      {/* PnL Statement Exporter Modal */}
      <PnLStatementExporter
        isOpen={isExporterOpen}
        onClose={() => setIsExporterOpen(false)}
        summary={{
          equity: summary.current_balance || 100000,
          cashBalance: summary.total_capital || 100000,
          netPnl: summary.net_pnl || 0,
          realizedPnl: summary.gross_pnl || 0,
          unrealizedPnl: 0,
          fees: summary.fees || 0,
          winRate: summary.win_rate || 0,
          profitFactor: summary.profit_factor || 1.0,
          totalTrades: summary.total_trades || 0,
          winningTrades: summary.winning_trades || 0,
          losingTrades: summary.losing_trades || 0,
          maxDrawdownPct: 2.85,
        }}
        trades={trades}
        timeframe={filters.period}
        currency={currencySymbol}
        currencyRate={1.0}
      />
    </div>
  );
}
