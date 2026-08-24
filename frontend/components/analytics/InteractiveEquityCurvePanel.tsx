"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  LineChart,
  BarChart3,
  Calendar,
  Layers,
  Download,
  Maximize2,
  Minimize2,
  Info,
  Sliders,
  ChevronDown,
  PieChart,
  ShieldCheck,
  Zap,
  Activity,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  Code,
  Printer,
  X,
  Radio,
  Clock,
  Globe,
  SlidersHorizontal,
  Flame,
} from "lucide-react";
import {
  DailyProfitabilityResponse,
  DailyProfitabilityBar,
  DailyProfitabilitySummary,
  ContributionItem,
  ChartMetricType,
  ChartViewMode,
} from "@/types/pnl-analytics";
import { formatNumber, formatPrice, formatPercent, formatPnL, toNumeric } from "@/lib/formatters";
import { useGlobalData } from "@/context/GlobalDataContext";
import { apiClient } from "@/lib/apiClient";
import { DailyProfitabilityBarChart } from "./DailyProfitabilityBarChart";
import { DayAnalysisDrawer } from "./DayAnalysisDrawer";

interface InteractiveEquityCurvePanelProps {
  initialRange?: string;
  onSelectDateAcrossPage?: (date: string | null) => void;
}

const METRIC_OPTIONS: Array<{ id: ChartMetricType; label: string; desc: string }> = [
  { id: "NET_PNL", label: "Net P&L", desc: "Authoritative daily net profit & loss after fees" },
  { id: "RETURN_PCT", label: "Return %", desc: "Daily percentage return relative to opening equity" },
  { id: "GROSS_PNL", label: "Gross P&L", desc: "Trading P&L before commissions and fees" },
  { id: "REALIZED_PNL", label: "Realized P&L", desc: "P&L from closed position executions" },
  { id: "UNREALIZED_CHANGE", label: "Unrealized Change", desc: "Mark-to-market valuation change" },
  { id: "FEES", label: "Fees & Funding", desc: "Exchange execution fees and funding rates" },
  { id: "DRAWDOWN", label: "Drawdown", desc: "Dollar distance from peak High Water Mark" },
  { id: "TRADES", label: "Trades Count", desc: "Volume of executed trades per day" },
];

const VIEW_MODE_OPTIONS: Array<{ id: ChartViewMode; label: string }> = [
  { id: "DAILY_BARS", label: "Daily Bars" },
  { id: "WEEKLY_BARS", label: "Weekly Bars" },
  { id: "MONTHLY_BARS", label: "Monthly Bars" },
  { id: "EQUITY_AND_DAILY", label: "Equity + Daily P&L" },
  { id: "CUMULATIVE_EQUITY", label: "Cumulative Equity" },
  { id: "DRAWDOWN", label: "Drawdown Underwater" },
];

const TIMEZONE_OPTIONS = [
  { id: "UTC", label: "UTC (Universal)" },
  { id: "Asia/Kolkata", label: "IST (Asia/Kolkata)" },
  { id: "America/New_York", label: "EST / EDT (New York)" },
  { id: "Europe/London", label: "GMT / BST (London)" },
  { id: "Asia/Tokyo", label: "JST (Tokyo)" },
  { id: "Asia/Singapore", label: "SGT (Singapore)" },
];

export function InteractiveEquityCurvePanel({
  initialRange = "ALL",
  onSelectDateAcrossPage,
}: InteractiveEquityCurvePanelProps) {
  const { portfolioSnapshot, tradingMode } = useGlobalData();

  // Primary State Controls
  const [timeRange, setTimeRange] = useState<string>(initialRange);
  const [metric, setMetric] = useState<ChartMetricType>("NET_PNL");
  const [viewMode, setViewMode] = useState<ChartViewMode>("DAILY_BARS");
  const [timezoneName, setTimezoneName] = useState<string>("UTC");

  // Filters
  const [selectedBot, setSelectedBot] = useState<string>("ALL");
  const [selectedStrategy, setSelectedStrategy] = useState<string>("ALL");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("ALL");
  const [selectedAssetClass, setSelectedAssetClass] = useState<string>("ALL");

  // Selection & Drilldown
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Overlay Toggles
  const [showHwm, setShowHwm] = useState<boolean>(true);
  const [showEquityOverlay, setShowEquityOverlay] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Dropdown UI States
  const [showMetricMenu, setShowMetricMenu] = useState<boolean>(false);
  const [showViewMenu, setShowViewMenu] = useState<boolean>(false);
  const [showTimezoneMenu, setShowTimezoneMenu] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [showFilterMenu, setShowFilterMenu] = useState<boolean>(false);
  const [contributionTab, setContributionTab] = useState<"bot" | "strategy" | "symbol" | "asset">("bot");

  const panelRef = useRef<HTMLDivElement>(null);

  // Map viewMode to backend aggregation
  const aggregation = useMemo(() => {
    if (viewMode === "WEEKLY_BARS") return "weekly";
    if (viewMode === "MONTHLY_BARS") return "monthly";
    return "daily";
  }, [viewMode]);

  // 1. Fetch Authoritative Daily Performance Bars & Metrics from Backend
  const { data: responseData, isLoading, isFetching, error, refetch } = useQuery<DailyProfitabilityResponse>({
    queryKey: [
      "dailyProfitabilityBars",
      tradingMode,
      timeRange,
      aggregation,
      metric,
      timezoneName,
      selectedBot,
      selectedStrategy,
      selectedSymbol,
      selectedAssetClass,
      selectedDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        mode: tradingMode,
        range: timeRange,
        aggregation,
        metric,
        timezone: timezoneName,
        bot_id: selectedBot,
        strategy_id: selectedStrategy,
        symbol: selectedSymbol,
        asset_class: selectedAssetClass,
      });
      if (selectedDate) {
        params.append("selected_date", selectedDate);
      }
      const res = await apiClient.get<DailyProfitabilityResponse>(
        `/api/portfolio/performance/bars?${params.toString()}`,
        { timeoutMs: 8000 }
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error?.message || "Failed to load profitability bars");
      }
      return res.data;
    },
    staleTime: 5000,
    refetchInterval: 10000,
    placeholderData: (prev) => prev,
  });

  const bars = useMemo(() => responseData?.bars || [], [responseData?.bars]);
  const allAvailableDates = useMemo(() => bars.map((b) => b.date), [bars]);

  const summary: DailyProfitabilitySummary = responseData?.summary || {
    totalNetPnl: portfolioSnapshot?.netPnl ?? 0.0,
    totalGrossPnl: portfolioSnapshot?.grossRealizedPnl ?? 0.0,
    totalFees: portfolioSnapshot?.fees ?? 0.0,
    totalFunding: portfolioSnapshot?.funding ?? 0.0,
    startingEquity: portfolioSnapshot?.startingBalance ?? 50000.0,
    currentEquity: portfolioSnapshot?.equity ?? 50000.0,
    profitableDays: 0,
    losingDays: 0,
    flatDays: 0,
    dailyWinRate: 0.0,
    bestDay: 0.0,
    worstDay: 0.0,
    avgProfitableDay: 0.0,
    avgLosingDay: 0.0,
    profitFactor: 1.0,
    currentStreak: "0",
    highWaterMark: portfolioSnapshot?.equity ?? 50000.0,
    maxDrawdownPct: portfolioSnapshot?.maxDrawdownPct ?? 0.0,
    reconciliationStatus: "RECONCILED",
  };

  // Synchronized Contributions: Selected day overrides if active, otherwise full period
  const activeContributions = useMemo(() => {
    if (selectedDate && responseData?.selectedDayContributions) {
      return responseData.selectedDayContributions;
    }
    return responseData?.contributions || {
      by_bot: [],
      by_strategy: [],
      by_symbol: [],
      by_asset_class: [],
    };
  }, [selectedDate, responseData?.selectedDayContributions, responseData?.contributions]);

  // Handle Bar Click -> Select Date & Open Drawer
  const handleSelectBar = useCallback(
    (date: string | null) => {
      setSelectedDate(date);
      onSelectDateAcrossPage?.(date);
      if (date) {
        setIsDrawerOpen(true);
      }
    },
    [onSelectDateAcrossPage]
  );

  // Clear Active Filters
  const handleResetFilters = useCallback(() => {
    setSelectedBot("ALL");
    setSelectedStrategy("ALL");
    setSelectedSymbol("ALL");
    setSelectedAssetClass("ALL");
    setSelectedDate(null);
    onSelectDateAcrossPage?.(null);
  }, [onSelectDateAcrossPage]);

  const hasActiveFilters =
    selectedBot !== "ALL" ||
    selectedStrategy !== "ALL" ||
    selectedSymbol !== "ALL" ||
    selectedAssetClass !== "ALL" ||
    selectedDate !== null;

  // Multi-Format Exports
  const exportCSV = useCallback(() => {
    const headers = [
      "Date",
      "DisplayDate",
      "DayOfWeek",
      "OpeningEquity",
      "ClosingEquity",
      "NetPnL",
      "ReturnPct",
      "GrossPnL",
      "RealizedPnL",
      "UnrealizedChange",
      "Fees",
      "Commissions",
      "Funding",
      "Deposits",
      "Withdrawals",
      "NetCashFlow",
      "HighWaterMark",
      "DrawdownPct",
      "TradesCount",
      "Wins",
      "Losses",
      "WinRate",
      "Status",
      "ReconciliationStatus",
    ];

    const rows = bars.map((b) => [
      b.date,
      `"${b.displayDate}"`,
      b.dayOfWeek,
      b.openingEquity,
      b.closingEquity,
      b.netPnl,
      b.returnPct,
      b.grossPnl,
      b.realizedPnl,
      b.unrealizedChange,
      b.fees,
      b.commissions,
      b.funding,
      b.deposits,
      b.withdrawals,
      b.netExternalCashFlow,
      b.highWaterMark,
      b.drawdownPct,
      b.trades,
      b.wins,
      b.losses,
      b.winRate,
      b.status,
      b.reconciliationStatus,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `quantos_daily_profitability_${tradingMode}_${timeRange}_${timezoneName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  }, [bars, tradingMode, timeRange, timezoneName]);

  const exportJSON = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(responseData, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `quantos_daily_profitability_${tradingMode}_${timeRange}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  }, [responseData, tradingMode, timeRange]);

  const exportPNG = useCallback(() => {
    if (!panelRef.current) return;
    const svgEl = panelRef.current.querySelector("svg");
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = svgEl.clientWidth || 900;
    canvas.height = svgEl.clientHeight || 300;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "#080D18";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const imgUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `quantos_daily_bars_${tradingMode}_${timeRange}.png`;
        link.href = imgUrl;
        link.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    setShowExportMenu(false);
  }, [tradingMode, timeRange]);

  const printReport = useCallback(() => {
    window.print();
    setShowExportMenu(false);
  }, []);

  return (
    <div
      ref={panelRef}
      className={`bg-[#080D18] border border-[#1E293B] rounded-2xl shadow-xl p-4 sm:p-6 font-mono space-y-4 transition-all ${
        isFullscreen ? "fixed inset-0 z-50 overflow-y-auto rounded-none p-6" : ""
      }`}
    >
      {/* 1. Header Bar: Title, Mode, Metric & View Dropdowns, Range Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
        {/* Title & Live Badge */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Daily Profitability Intelligence</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-bold text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {tradingMode}
              </span>
              {summary.reconciliationStatus === "UNRECONCILED" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-400 animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  UNRECONCILED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Zero-centered daily P&L bars • Dual-formula reconciliation • Multi-metric overlays
            </p>
          </div>
        </div>

        {/* Action Controls Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMetricMenu(!showMetricMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B111E] border border-[#1E293B] text-xs font-semibold text-slate-200 hover:border-cyan-500/50 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>{METRIC_OPTIONS.find((m) => m.id === metric)?.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showMetricMenu && (
              <div className="absolute right-0 mt-1 w-56 bg-[#0B111E] border border-[#1E293B] rounded-xl shadow-2xl p-1 z-30 space-y-0.5 text-xs">
                {METRIC_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setMetric(opt.id);
                      setShowMetricMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex flex-col ${
                      metric === opt.id ? "bg-cyan-500/20 text-cyan-400 font-bold" : "text-slate-300 hover:bg-[#1E293B]"
                    }`}
                  >
                    <span className="text-xs">{opt.label}</span>
                    <span className="text-[10px] text-slate-500">{opt.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chart View Mode Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowViewMenu(!showViewMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B111E] border border-[#1E293B] text-xs font-semibold text-slate-200 hover:border-cyan-500/50 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>{VIEW_MODE_OPTIONS.find((v) => v.id === viewMode)?.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showViewMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-[#0B111E] border border-[#1E293B] rounded-xl shadow-2xl p-1 z-30 space-y-0.5 text-xs">
                {VIEW_MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setViewMode(opt.id);
                      setShowViewMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      viewMode === opt.id ? "bg-cyan-500/20 text-cyan-400 font-bold" : "text-slate-300 hover:bg-[#1E293B]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timezone Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTimezoneMenu(!showTimezoneMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0B111E] border border-[#1E293B] text-xs font-semibold text-slate-300 hover:border-cyan-500/50 transition-colors"
              title="Select timezone for trading day grouping"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">{timezoneName.split("/")[1] || timezoneName}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showTimezoneMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-[#0B111E] border border-[#1E293B] rounded-xl shadow-2xl p-1 z-30 space-y-0.5 text-xs">
                {TIMEZONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTimezoneName(opt.id);
                      setShowTimezoneMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      timezoneName === opt.id ? "bg-cyan-500/20 text-cyan-400 font-bold" : "text-slate-300 hover:bg-[#1E293B]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-1.5 rounded-lg bg-[#0B111E] border border-[#1E293B] text-slate-400 hover:text-white transition-colors"
              title="Export chart and daily data"
            >
              <Download className="w-4 h-4" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-[#0B111E] border border-[#1E293B] rounded-xl shadow-2xl p-1 z-30 space-y-0.5 text-xs">
                <button
                  type="button"
                  onClick={exportCSV}
                  className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-[#1E293B] flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={exportPNG}
                  className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-[#1E293B] flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Export PNG</span>
                </button>
                <button
                  type="button"
                  onClick={exportJSON}
                  className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-[#1E293B] flex items-center gap-2"
                >
                  <Code className="w-3.5 h-3.5 text-amber-400" />
                  <span>Export JSON</span>
                </button>
                <button
                  type="button"
                  onClick={printReport}
                  className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-[#1E293B] flex items-center gap-2 border-t border-[#1E293B]/50"
                >
                  <Printer className="w-3.5 h-3.5 text-purple-400" />
                  <span>Print Report</span>
                </button>
              </div>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-[#0B111E] border border-[#1E293B] text-slate-400 hover:text-white transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Time Range Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center bg-[#050811] border border-[#1E293B] rounded-xl p-1 gap-1 text-xs">
          {["7D", "30D", "90D", "6M", "YTD", "1Y", "ALL"].map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                timeRange === range
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-900/30"
                  : "text-slate-400 hover:text-white hover:bg-[#1E293B]/60"
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Refresh & Last Updated Indicator */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          {isFetching && <span className="text-cyan-400 animate-pulse font-semibold">Updating live...</span>}
          <span>Freshness: <span className="text-emerald-400 font-semibold">{responseData?.freshness || "LIVE"}</span></span>
          <button
            type="button"
            onClick={() => refetch()}
            className="p-1 text-slate-400 hover:text-white hover:bg-[#1E293B] rounded transition-colors"
            title="Refresh authoritative bars"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 3. Active Filters Bar & Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 bg-[#050811] border border-[#1E293B] rounded-xl px-3 py-2 text-xs">
          <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-cyan-400" /> Active Filters:
          </span>

          {selectedDate && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold text-xs">
              Selected Day: {selectedDate}
              <button
                type="button"
                onClick={() => handleSelectBar(null)}
                className="hover:text-white text-cyan-400 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedBot !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300 font-semibold text-xs">
              Bot: {selectedBot}
              <button type="button" onClick={() => setSelectedBot("ALL")} className="hover:text-white ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedStrategy !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-300 font-semibold text-xs">
              Strategy: {selectedStrategy}
              <button type="button" onClick={() => setSelectedStrategy("ALL")} className="hover:text-white ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedSymbol !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-xs">
              Symbol: {selectedSymbol}
              <button type="button" onClick={() => setSelectedSymbol("ALL")} className="hover:text-white ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-[10px] text-red-400 hover:text-red-300 font-semibold underline ml-auto"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* 4. Main Chart Canvas Area */}
      <div className="bg-[#050811] border border-[#1E293B] rounded-xl p-3 sm:p-4">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs gap-2 animate-pulse">
            <Zap className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>Calculating authoritative daily profitability bars...</span>
          </div>
        ) : error ? (
          <div className="h-64 flex flex-col items-center justify-center text-red-400 text-xs gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Failed to load daily performance data.</span>
          </div>
        ) : (
          <DailyProfitabilityBarChart
            bars={bars}
            metric={metric}
            viewMode={viewMode}
            selectedDate={selectedDate}
            onSelectDate={handleSelectBar}
            currency="$"
            tradingMode={tradingMode}
            showHwmOverlay={showHwm}
            showEquityOverlay={showEquityOverlay}
            startingEquity={summary.startingEquity}
          />
        )}
      </div>

      {/* 5. Chart Panel Summary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 font-mono">
        <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-2.5 space-y-0.5">
          <div className="text-[9px] text-slate-400 uppercase">Period Net P&L</div>
          <div className={`text-sm font-bold ${summary.totalNetPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatPnL(summary.totalNetPnl, "$", 2).formatted}
          </div>
        </div>

        <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-2.5 space-y-0.5">
          <div className="text-[9px] text-slate-400 uppercase">Profitable Days</div>
          <div className="text-sm font-bold text-emerald-400">{summary.profitableDays}</div>
        </div>

        <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-2.5 space-y-0.5">
          <div className="text-[9px] text-slate-400 uppercase">Losing Days</div>
          <div className="text-sm font-bold text-red-400">{summary.losingDays}</div>
        </div>

        <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-2.5 space-y-0.5">
          <div className="text-[9px] text-slate-400 uppercase">Flat Days</div>
          <div className="text-sm font-bold text-slate-400">{summary.flatDays}</div>
        </div>

        <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-2.5 space-y-0.5">
          <div className="text-[9px] text-slate-400 uppercase">Daily Win Rate</div>
          <div className={`text-sm font-bold ${summary.dailyWinRate >= 50 ? "text-emerald-400" : "text-amber-400"}`}>
            {formatPercent(summary.dailyWinRate, 1)}
          </div>
        </div>

        <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-2.5 space-y-0.5">
          <div className="text-[9px] text-slate-400 uppercase">Best Day</div>
          <div className="text-sm font-bold text-emerald-400">+{formatPrice(summary.bestDay, "$", 2)}</div>
        </div>

        <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-2.5 space-y-0.5">
          <div className="text-[9px] text-slate-400 uppercase">Worst Day</div>
          <div className="text-sm font-bold text-red-400">{formatPrice(summary.worstDay, "$", 2)}</div>
        </div>

        <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-2.5 space-y-0.5">
          <div className="text-[9px] text-slate-400 uppercase">Profit Factor</div>
          <div className="text-sm font-bold text-white">{summary.profitFactor.toFixed(2)}</div>
        </div>

        <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-2.5 space-y-0.5">
          <div className="text-[9px] text-slate-400 uppercase">Current Streak</div>
          <div className="text-sm font-bold text-cyan-400 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" />
            <span>{summary.currentStreak}</span>
          </div>
        </div>

        <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-2.5 space-y-0.5">
          <div className="text-[9px] text-slate-400 uppercase">Max Drawdown</div>
          <div className="text-sm font-bold text-red-400">
            {summary.maxDrawdownPct > 0 ? `-${formatPercent(summary.maxDrawdownPct, 2)}` : "0.00%"}
          </div>
        </div>
      </div>

      {/* 6. Synchronized Performance Contribution Section */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E293B] pb-3">
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Performance Contribution Breakdown</span>
              {selectedDate && (
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] text-cyan-400 font-semibold">
                  Filtered to: {selectedDate}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {selectedDate
                ? `Showing P&L contribution exclusively for executions on ${selectedDate}`
                : "Aggregated across all trading days in the active range"}
            </p>
          </div>

          {/* Contribution Tabs */}
          <div className="flex items-center bg-[#050811] border border-[#1E293B] rounded-lg p-0.5 text-xs">
            {(["bot", "strategy", "symbol", "asset"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setContributionTab(tab)}
                className={`px-3 py-1 rounded-md uppercase text-[10px] font-bold transition-colors ${
                  contributionTab === tab ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Contribution Cards Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(() => {
            const list: ContributionItem[] =
              contributionTab === "bot"
                ? activeContributions.by_bot
                : contributionTab === "strategy"
                ? activeContributions.by_strategy
                : contributionTab === "symbol"
                ? activeContributions.by_symbol
                : activeContributions.by_asset_class;

            if (!list || list.length === 0) {
              return (
                <div className="col-span-full py-6 text-center text-slate-500 text-xs">
                  No contribution records found for this selection.
                </div>
              );
            }

            return list.map((item, idx) => {
              const winRate = item.trades > 0 ? (item.wins / item.trades) * 100 : 0;
              const isWin = item.pnl >= 0;
              return (
                <div key={idx} className="bg-[#050811] border border-[#1E293B] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs truncate max-w-[140px]">{item.name}</span>
                    <span className={`text-xs font-extrabold ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                      {formatPnL(item.pnl, "$").formatted}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{item.trades} trade{item.trades === 1 ? "" : "s"}</span>
                    <span className={winRate >= 50 ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                      {formatPercent(winRate, 0)} Win Rate
                    </span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* 7. Click-to-Analyze Day Drilldown Drawer */}
      <DayAnalysisDrawer
        date={selectedDate}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectDate={(newDate) => {
          setSelectedDate(newDate);
          onSelectDateAcrossPage?.(newDate);
        }}
        allAvailableDates={allAvailableDates}
        mode={tradingMode}
        timezone={timezoneName}
        currency="$"
      />
    </div>
  );
}
