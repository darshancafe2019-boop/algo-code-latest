"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Calendar,
  Layers,
  AlertTriangle,
  Smile,
  Activity,
  Code,
  Sparkles,
} from "lucide-react";
import { JournalHeader } from "./JournalHeader";
import { JournalKPIStrip } from "./JournalKPIStrip";
import { JournalOpenPositions } from "./JournalOpenPositions";
import { JournalTradeExplorer } from "./JournalTradeExplorer";
import { JournalTradeCalendar } from "./JournalTradeCalendar";
import { JournalMistakeAnalysis } from "./JournalMistakeAnalysis";
import { JournalBehavioralAnalytics } from "./JournalBehavioralAnalytics";
import { JournalStrategyIntelligence } from "./JournalStrategyIntelligence";
import { JournalExecutionQuality } from "./JournalExecutionQuality";
import { JournalPlaybooks } from "./JournalPlaybooks";
import { JournalReviewModal } from "./JournalReviewModal";
import { TradeDetailDrawer } from "./TradeDetailDrawer";
import {
  TradeJournalRecord,
  TradeReview,
  PlaybookRecord,
} from "@/types/trade-journal";

type ActiveJournalTab =
  | "explorer"
  | "calendar"
  | "strategies"
  | "mistakes"
  | "behavioral"
  | "execution"
  | "playbooks";

export function TradeJournal() {
  const queryClient = useQueryClient();

  // Active View Tab
  const [activeTab, setActiveTab] = useState<ActiveJournalTab>("explorer");

  // Header & Filter State
  const [timeframe, setTimeframe] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [directionFilter, setDirectionFilter] = useState("ALL");
  const [strategyFilter, setStrategyFilter] = useState("ALL");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("ALL");
  const [emotionFilter, setEmotionFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modal & Drawer State
  const [selectedTradeForReview, setSelectedTradeForReview] = useState<TradeJournalRecord | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedTradeForDrawer, setSelectedTradeForDrawer] = useState<TradeJournalRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 1. Fetch Paginated Trades
  const {
    data: tradesData,
    isLoading: isLoadingTrades,
    isRefetching: isRefetchingTrades,
    refetch: refetchTrades,
  } = useQuery({
    queryKey: [
      "journalTrades",
      timeframe,
      searchQuery,
      statusFilter,
      directionFilter,
      strategyFilter,
      reviewStatusFilter,
      emotionFilter,
      currentPage,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeframe,
        query: searchQuery,
        status: statusFilter,
        direction: directionFilter,
        strategy: strategyFilter,
        review_status: reviewStatusFilter,
        emotion: emotionFilter,
        page: String(currentPage),
        limit: "50",
      });
      const res = await fetch(`/api/journal/trades?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch journal trades");
      return res.json();
    },
    refetchInterval: 6000,
  });

  // 2. Fetch KPI Analytics
  const { data: analyticsData, refetch: refetchAnalytics } = useQuery({
    queryKey: ["journalAnalytics"],
    queryFn: async () => {
      const res = await fetch("/api/journal/analytics");
      if (!res.ok) return { kpis: null };
      return res.json();
    },
    refetchInterval: 6000,
  });

  // 3. Fetch Calendar Data
  const { data: calendarData, refetch: refetchCalendar } = useQuery({
    queryKey: ["journalCalendar"],
    queryFn: async () => {
      const res = await fetch("/api/journal/calendar");
      if (!res.ok) return { calendar: { days: [], monthly_summary: {}, total_active_days: 0 } };
      return res.json();
    },
    refetchInterval: 10000,
  });

  // 4. Fetch Mistake Intelligence
  const { data: mistakesData, refetch: refetchMistakes } = useQuery({
    queryKey: ["journalMistakes"],
    queryFn: async () => {
      const res = await fetch("/api/journal/mistakes");
      if (!res.ok) return { mistakes: [] };
      return res.json();
    },
    refetchInterval: 10000,
  });

  // 5. Fetch Behavioral Intelligence
  const { data: emotionsData, refetch: refetchEmotions } = useQuery({
    queryKey: ["journalEmotions"],
    queryFn: async () => {
      const res = await fetch("/api/journal/emotions");
      if (!res.ok) return { emotions: [] };
      return res.json();
    },
    refetchInterval: 10000,
  });

  // 6. Fetch Strategy Intelligence
  const { data: strategiesData, refetch: refetchStrategies } = useQuery({
    queryKey: ["journalStrategies"],
    queryFn: async () => {
      const res = await fetch("/api/journal/strategies");
      if (!res.ok) return { strategies: [] };
      return res.json();
    },
    refetchInterval: 10000,
  });

  // 7. Fetch Execution Quality
  const { data: execQualityData, refetch: refetchExecQuality } = useQuery({
    queryKey: ["journalExecQuality"],
    queryFn: async () => {
      const res = await fetch("/api/journal/execution-quality");
      if (!res.ok) return { execution_quality: null };
      return res.json();
    },
    refetchInterval: 10000,
  });

  // 8. Fetch Playbooks
  const { data: playbooksData, refetch: refetchPlaybooks } = useQuery({
    queryKey: ["journalPlaybooks"],
    queryFn: async () => {
      const res = await fetch("/api/journal/playbooks");
      if (!res.ok) return { playbooks: [] };
      return res.json();
    },
  });

  // Save Review Mutation
  const saveReviewMutation = useMutation({
    mutationFn: async ({
      tradeId,
      review,
    }: {
      tradeId: number;
      review: Partial<TradeReview>;
    }) => {
      const res = await fetch(`/api/trade-journal/review/${tradeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review),
      });
      if (!res.ok) throw new Error("Failed to save review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journalTrades"] });
      queryClient.invalidateQueries({ queryKey: ["journalAnalytics"] });
      queryClient.invalidateQueries({ queryKey: ["journalMistakes"] });
      queryClient.invalidateQueries({ queryKey: ["journalEmotions"] });
    },
  });

  // Save Playbook Mutation
  const savePlaybookMutation = useMutation({
    mutationFn: async (playbook: Partial<PlaybookRecord>) => {
      const res = await fetch("/api/journal/playbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(playbook),
      });
      if (!res.ok) throw new Error("Failed to save playbook");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journalPlaybooks"] });
    },
  });

  const handleRefreshAll = () => {
    refetchTrades();
    refetchAnalytics();
    refetchCalendar();
    refetchMistakes();
    refetchEmotions();
    refetchStrategies();
    refetchExecQuality();
    refetchPlaybooks();
  };

  const handleOpenReviewModal = (trade: TradeJournalRecord) => {
    setSelectedTradeForReview(trade);
    setIsReviewModalOpen(true);
  };

  const handleOpenTradeDrawer = (trade: TradeJournalRecord) => {
    setSelectedTradeForDrawer(trade);
    setIsDrawerOpen(true);
  };

  const handleSaveReview = (
    tradeId: number,
    review: Partial<TradeReview>,
    isNext: boolean = false
  ) => {
    saveReviewMutation.mutate(
      { tradeId, review },
      {
        onSuccess: () => {
          if (isNext && tradesData?.trades) {
            const list: TradeJournalRecord[] = tradesData.trades;
            const currentIndex = list.findIndex((t) => t.id === tradeId);
            const nextUnreviewed = list
              .slice(currentIndex + 1)
              .find((t) => !t.is_reviewed && !t.review);

            if (nextUnreviewed) {
              setSelectedTradeForReview(nextUnreviewed);
              return;
            }
          }
          setIsReviewModalOpen(false);
          setSelectedTradeForReview(null);
        },
      }
    );
  };

  const handleExportCsv = () => {
    window.open("/api/trades/export-csv", "_blank");
  };

  const handleExportJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(tradesData?.trades || [], null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trade_journal_${timeframe}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const pendingCount = (tradesData?.trades || []).filter(
    (t: TradeJournalRecord) => !t.is_reviewed && !t.review
  ).length;

  const tabs: { id: ActiveJournalTab; label: string; icon: any }[] = [
    { id: "explorer", label: "Trade Explorer", icon: Layers },
    { id: "calendar", label: "Calendar Heatmap", icon: Calendar },
    { id: "strategies", label: "Strategy Intelligence", icon: Code },
    { id: "mistakes", label: "Mistake Intelligence", icon: AlertTriangle },
    { id: "behavioral", label: "Behavioral Analytics", icon: Smile },
    { id: "execution", label: "Execution & MAE/MFE", icon: Activity },
    { id: "playbooks", label: "Playbooks Library", icon: BookOpen },
  ];

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto pb-16 px-2 sm:px-4 select-none font-sans">
      {/* 1. Header Strip */}
      <JournalHeader
        timeframe={timeframe}
        onChangeTimeframe={(tf) => {
          setTimeframe(tf);
          setCurrentPage(1);
        }}
        isRefreshing={isRefetchingTrades}
        onRefresh={handleRefreshAll}
        onOpenQuickReview={() => {
          const firstPending = (tradesData?.trades || []).find(
            (t: TradeJournalRecord) => !t.is_reviewed && !t.review
          );
          if (firstPending) {
            handleOpenReviewModal(firstPending);
          } else if (tradesData?.trades?.[0]) {
            handleOpenReviewModal(tradesData.trades[0]);
          }
        }}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        pendingReviewsCount={pendingCount}
      />

      {/* 2. Executive 8-Card Trading KPI Strip */}
      <JournalKPIStrip kpis={analyticsData?.kpis} />

      {/* 3. Live Open Positions Panel */}
      <JournalOpenPositions
        positions={tradesData?.open_positions || []}
        onSelectTrade={handleOpenTradeDrawer}
      />

      {/* 4. Navigation Hub Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar p-1.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-md text-xs font-mono font-semibold">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] font-bold shadow-md"
                  : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-elevated)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. Tab Content Views */}
      {activeTab === "explorer" && (
        <JournalTradeExplorer
          trades={tradesData?.trades || []}
          onOpenReviewModal={handleOpenReviewModal}
          onOpenTradeDrawer={handleOpenTradeDrawer}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          statusFilter={statusFilter}
          onStatusChange={(s) => {
            setStatusFilter(s);
            setCurrentPage(1);
          }}
          directionFilter={directionFilter}
          onDirectionChange={(d) => {
            setDirectionFilter(d);
            setCurrentPage(1);
          }}
          strategyFilter={strategyFilter}
          onStrategyChange={(st) => {
            setStrategyFilter(st);
            setCurrentPage(1);
          }}
          reviewStatusFilter={reviewStatusFilter}
          onReviewStatusChange={(rs) => {
            setReviewStatusFilter(rs);
            setCurrentPage(1);
          }}
          emotionFilter={emotionFilter}
          onEmotionChange={(em) => {
            setEmotionFilter(em);
            setCurrentPage(1);
          }}
          currentPage={currentPage}
          totalPages={tradesData?.total_pages || 1}
          onPageChange={setCurrentPage}
          totalCount={tradesData?.total_count || 0}
        />
      )}

      {activeTab === "calendar" && (
        <JournalTradeCalendar
          days={calendarData?.calendar?.days || []}
          onSelectDate={(dateStr) => {
            setSearchQuery(dateStr);
            setActiveTab("explorer");
          }}
        />
      )}

      {activeTab === "strategies" && (
        <JournalStrategyIntelligence
          strategies={strategiesData?.strategies || []}
        />
      )}

      {activeTab === "mistakes" && (
        <JournalMistakeAnalysis mistakes={mistakesData?.mistakes || []} />
      )}

      {activeTab === "behavioral" && (
        <JournalBehavioralAnalytics emotions={emotionsData?.emotions || []} />
      )}

      {activeTab === "execution" && (
        <JournalExecutionQuality
          data={execQualityData?.execution_quality}
        />
      )}

      {activeTab === "playbooks" && (
        <JournalPlaybooks
          playbooks={playbooksData?.playbooks || []}
          onSavePlaybook={(pb) => savePlaybookMutation.mutate(pb)}
        />
      )}

      {/* 6. Review Modal with Quick Review ("Save & Next") */}
      <JournalReviewModal
        trade={selectedTradeForReview}
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedTradeForReview(null);
        }}
        onSaveReview={handleSaveReview}
        isSubmitting={saveReviewMutation.isPending}
      />

      {/* 7. Forensic Trade Workstation Drawer */}
      <TradeDetailDrawer
        trade={selectedTradeForDrawer}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTradeForDrawer(null);
        }}
      />
    </div>
  );
}
