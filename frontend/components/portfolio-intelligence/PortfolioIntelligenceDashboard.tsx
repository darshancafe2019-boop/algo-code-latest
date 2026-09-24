"use client";

import React, { useState, useMemo, useEffect, useCallback, memo } from "react";
import { TopHeader } from "./TopHeader";
import { MarketTickerStrip } from "./MarketTickerStrip";
import { PortfolioHeroKpi } from "./PortfolioHeroKpi";
import { AnalyticsNavTabs, AnalyticsTabKey } from "./AnalyticsNavTabs";
import { BrokerAnalyticsGrid } from "./BrokerAnalyticsGrid";
import { BoardAnalyticsGrid } from "./BoardAnalyticsGrid";
import { AssetStrategySectorRiskGrid } from "./AssetStrategySectorRiskGrid";
import { BottomAnalyticsGrid } from "./BottomAnalyticsGrid";
import {
  INITIAL_HERO_DATA,
  INITIAL_MARKET_TICKERS,
  INITIAL_BROKERS,
  INITIAL_BOARDS,
  INITIAL_MULTI_DIMENSIONAL,
  INITIAL_BOTTOM_ANALYTICS,
  getScaledHeroData,
} from "@/services/portfolio-intelligence-service";
import {
  TimeframeFilter,
  MarketCategoryFilter,
  BrokerPortfolio,
  BoardPortfolio,
  MultiDimAllocation,
} from "@/types/portfolio-intelligence";
import { X, CheckCircle2, Shield, Activity, TrendingUp } from "lucide-react";

export const PortfolioIntelligenceDashboard = memo(function PortfolioIntelligenceDashboard() {
  // State management
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<AnalyticsTabKey>("overview");
  const [timeframe, setTimeframe] = useState<TimeframeFilter>("1D");
  const [marketCategory, setMarketCategory] = useState<MarketCategoryFilter>("India");
  const [isLiveStream, setIsLiveStream] = useState<boolean>(true);

  // Selected item for drilldown modal
  const [selectedItem, setSelectedItem] = useState<{
    type: "broker" | "board" | "dimension" | "kpi";
    title: string;
    data: any;
  } | null>(null);

  // Live real-time tick updates simulation
  const [heroData, setHeroData] = useState(INITIAL_HERO_DATA);
  const [tickers, setTickers] = useState(INITIAL_MARKET_TICKERS);
  const [brokers, setBrokers] = useState(INITIAL_BROKERS);
  const [boards, setBoards] = useState(INITIAL_BOARDS);

  // Update hero data on timeframe change
  useEffect(() => {
    setHeroData(getScaledHeroData(timeframe));
  }, [timeframe]);

  // Subtle real-time tick pulse
  useEffect(() => {
    if (!isLiveStream) return;

    const interval = setInterval(() => {
      // Subtle micro-fluctuations in tickers
      setTickers((prev) =>
        prev.map((t) => {
          if (Math.random() > 0.6) {
            const delta = (Math.random() - 0.48) * 0.1;
            const newPct = +(t.changePct + delta).toFixed(2);
            return {
              ...t,
              changePct: newPct,
              isPositive: newPct >= 0,
            };
          }
          return t;
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, [isLiveStream]);

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

  return (
    <div className="w-full min-h-screen bg-[#020B14] text-slate-100 font-sans flex flex-col antialiased select-none">
      {/* 1. TOP HEADER */}
      <TopHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isLive={isLiveStream}
        onToggleLive={() => setIsLiveStream((prev) => !prev)}
      />

      {/* 2. MARKET TICKER STRIP */}
      <MarketTickerStrip
        tickers={tickers}
        activeCategory={marketCategory}
        onSelectCategory={setMarketCategory}
        onSymbolClick={(sym) => setSearchQuery(sym)}
      />

      {/* 3. PORTFOLIO HERO / KPI AREA */}
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
              pnlBreakdown={INITIAL_BOTTOM_ANALYTICS.pnlBreakdown}
              capitalDeployment={INITIAL_BOTTOM_ANALYTICS.capitalDeployment}
              brokerWisePnl={INITIAL_BOTTOM_ANALYTICS.brokerWisePnl}
              boardWisePnl={INITIAL_BOTTOM_ANALYTICS.boardWisePnl}
              dailyPerformance={INITIAL_BOTTOM_ANALYTICS.dailyPerformance}
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

              {selectedItem.data?.allocatedValue && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded bg-[#030D18] border border-[#0C1E30]">
                    <div className="text-[10px] text-[#7D8EA5]">Allocated Capital</div>
                    <div className="text-[15px] font-bold text-white font-mono">
                      ₹ {selectedItem.data.allocatedValue.toLocaleString("en-IN")}
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

              {selectedItem.data?.segments && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-slate-300">Constituent Segments</div>
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
