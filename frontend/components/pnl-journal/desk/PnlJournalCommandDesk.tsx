"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Clock,
  Target,
  Scale,
  Coins,
  ArrowRightLeft,
  ShieldAlert,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  PnlFilterState,
  TradeRecord,
  PnlJournalDashboardPayload,
  CapitalEvent,
} from "@/types/pnl-journal";
import { PnlJournalHeader } from "./PnlJournalHeader";
import { PnlGlobalFilterBar } from "./PnlGlobalFilterBar";
import { PnlSummaryKpiCards } from "./PnlSummaryKpiCards";
import { AccountingBalanceStrip } from "./AccountingBalanceStrip";
import { InteractiveEquityDrawdownChart } from "./InteractiveEquityDrawdownChart";
import { PnlCalendarHeatmap } from "./PnlCalendarHeatmap";
import { TemporalPerformanceMatrix } from "./TemporalPerformanceMatrix";
import { MultiDimensionAttributionDesk } from "./MultiDimensionAttributionDesk";
import { PnlWaterfallChart } from "./PnlWaterfallChart";
import { TradeJournalTableDesk } from "./TradeJournalTableDesk";
import { TradeDetailInspectionDrawer } from "./TradeDetailInspectionDrawer";
import { TaxIntelligenceDesk } from "./TaxIntelligenceDesk";
import { CapitalLedgerDesk } from "./CapitalLedgerDesk";
import { BrokerReconciliationDesk } from "./BrokerReconciliationDesk";
import { RiskDeskView } from "./RiskDeskView";
import { PnlReportExporterModal } from "./PnlReportExporterModal";

type WorkspaceTab =
  | "OVERVIEW"
  | "JOURNAL"
  | "CALENDAR"
  | "TEMPORAL"
  | "ATTRIBUTION"
  | "TAX"
  | "LEDGER"
  | "RECONCILIATION"
  | "RISK";

const INITIAL_FILTERS: PnlFilterState = {
  period: "ALL",
  broker: "ALL",
  mode: "ALL",
  assetClass: "ALL",
  strategy: "ALL",
  direction: "ALL",
  searchQuery: "",
  currency: "INR",
};

interface PnlJournalCommandDeskProps {
  initialTab?: WorkspaceTab;
}

export const PnlJournalCommandDesk: React.FC<PnlJournalCommandDeskProps> = ({
  initialTab = "OVERVIEW",
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [filters, setFilters] = useState<PnlFilterState>(INITIAL_FILTERS);
  const [data, setData] = useState<PnlJournalDashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState<TradeRecord | null>(null);
  const [isExporterOpen, setIsExporterOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>("");

  const currencySymbol = filters.currency === "USD" ? "$" : "₹";

  // Fetch P&L Dashboard Data from authoritative Next.js API route
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        broker: filters.broker,
        mode: filters.mode,
        period: filters.period,
        asset: filters.assetClass,
        strategy: filters.strategy,
        direction: filters.direction,
        currency: filters.currency,
      });

      const res = await fetch(`/api/pnl/accounting?${params.toString()}`, {
        cache: "no-store",
      });

      if (res.ok) {
        const payload: PnlJournalDashboardPayload = await res.json();
        setData(payload);
      }
    } catch (err) {
      console.error("Failed to load P&L accounting payload:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Triggering Rebuild
  const handleRecalculate = async () => {
    try {
      setIsLoading(true);
      await fetch("/api/pnl/rebuild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broker: filters.broker, mode: filters.mode, resetCache: true }),
      });
      await fetchData();
    } catch (err) {
      console.error("Failed to rebuild ledger:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter trades based on search and selected calendar date
  const filteredTrades = useMemo(() => {
    if (!data?.trades) return [];
    let list = data.trades;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.strategy.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    if (selectedCalendarDate) {
      list = list.filter((t) =>
        (t.exitTimestamp || t.entryTimestamp).startsWith(selectedCalendarDate)
      );
    }

    return list;
  }, [data?.trades, filters.searchQuery, selectedCalendarDate]);

  // Available strategies for dropdown
  const availableStrategies = useMemo(() => {
    if (!data?.trades) return [];
    const set = new Set<string>();
    data.trades.forEach((t) => {
      if (t.strategy) set.add(t.strategy);
    });
    return Array.from(set);
  }, [data?.trades]);

  const handleFilterChange = (updates: Partial<PnlFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setSelectedCalendarDate("");
  };

  const handleSaveNotes = (tradeId: string, notes: string, tags: string[]) => {
    if (!data) return;
    const updatedTrades = data.trades.map((t) =>
      t.id === tradeId ? { ...t, notes, tags } : t
    );
    setData({ ...data, trades: updatedTrades });
  };

  const handleAddCapitalEvent = (evt: Partial<CapitalEvent>) => {
    if (!data) return;
    const newEvent: CapitalEvent = {
      id: `cap-${Date.now()}`,
      timestamp: new Date().toISOString(),
      broker: evt.broker || "DHAN",
      type: evt.type || "DEPOSIT",
      amount: evt.amount || 0,
      currency: evt.currency || "INR",
      reference: evt.reference || "MANUAL_ENTRY",
      status: "SETTLED",
    };
    setData({ ...data, capitalEvents: [newEvent, ...data.capitalEvents] });
  };

  const tabs: { id: WorkspaceTab; label: string; icon: any }[] = [
    { id: "OVERVIEW", label: "Desk Overview", icon: LayoutDashboard },
    { id: "JOURNAL", label: "Trade Journal", icon: BookOpen },
    { id: "CALENDAR", label: "P&L Calendar", icon: Calendar },
    { id: "TEMPORAL", label: "Temporal Matrix", icon: Clock },
    { id: "ATTRIBUTION", label: "Attribution", icon: Target },
    { id: "TAX", label: "Tax Intelligence", icon: Scale },
    { id: "LEDGER", label: "Capital Ledger", icon: Coins },
    { id: "RECONCILIATION", label: "Reconciliation", icon: ArrowRightLeft },
    { id: "RISK", label: "Risk & Exposure", icon: ShieldAlert },
  ];

  return (
    <div className="space-y-4 font-sans max-w-[1850px] mx-auto min-w-0 pb-12">
      {/* 1. Header */}
      <PnlJournalHeader
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={handleRecalculate}
        onOpenExporter={() => setIsExporterOpen(true)}
        isLoading={isLoading}
        lastUpdated={data?.metadata?.serverTimestamp}
        engineVersion={data?.metadata?.calculationEngine || "FIFO_AUTHORITATIVE_V2"}
      />

      {/* 2. Global Filter Bar */}
      <PnlGlobalFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        availableStrategies={availableStrategies}
      />

      {/* 3. Real-Time Accounting Balance Strip */}
      {data?.balances && (
        <AccountingBalanceStrip
          balances={data.balances}
          currencySymbol={currencySymbol}
        />
      )}

      {/* 4. Top KPI Metric Cards */}
      {data?.summary && (
        <PnlSummaryKpiCards
          summary={data.summary}
          currencySymbol={currencySymbol}
        />
      )}

      {/* 5. Navigation Tab Bar */}
      <div className="flex items-center gap-1 overflow-x-auto bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl shadow-lg no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-950/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 6. Active Tab Content Views */}
      <div className="space-y-4">
        {activeTab === "OVERVIEW" && data && (
          <div className="space-y-4">
            <InteractiveEquityDrawdownChart
              equityCurve={data.equityCurve}
              currencySymbol={currencySymbol}
            />
            <PnlWaterfallChart
              summary={data.summary}
              currencySymbol={currencySymbol}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PnlCalendarHeatmap
                records={data.calendarRecords}
                currencySymbol={currencySymbol}
                onSelectDate={(d) => {
                  setSelectedCalendarDate(d);
                  setActiveTab("JOURNAL");
                }}
                selectedDate={selectedCalendarDate}
              />
              <TemporalPerformanceMatrix
                trades={data.trades}
                currencySymbol={currencySymbol}
              />
            </div>
            <TradeJournalTableDesk
              trades={filteredTrades}
              onSelectTrade={(t) => setSelectedTrade(t)}
              currencySymbol={currencySymbol}
            />
          </div>
        )}

        {activeTab === "JOURNAL" && data && (
          <div className="space-y-4">
            {selectedCalendarDate && (
              <div className="flex items-center justify-between bg-cyan-950/60 border border-cyan-800/80 rounded-xl px-4 py-2 text-xs font-mono text-cyan-300">
                <span>Filtered to Date: <strong>{selectedCalendarDate}</strong></span>
                <button
                  type="button"
                  onClick={() => setSelectedCalendarDate("")}
                  className="underline hover:text-white"
                >
                  Clear Date Filter
                </button>
              </div>
            )}
            <TradeJournalTableDesk
              trades={filteredTrades}
              onSelectTrade={(t) => setSelectedTrade(t)}
              currencySymbol={currencySymbol}
            />
          </div>
        )}

        {activeTab === "CALENDAR" && data && (
          <PnlCalendarHeatmap
            records={data.calendarRecords}
            currencySymbol={currencySymbol}
            onSelectDate={(d) => {
              setSelectedCalendarDate(d);
              setActiveTab("JOURNAL");
            }}
            selectedDate={selectedCalendarDate}
          />
        )}

        {activeTab === "TEMPORAL" && data && (
          <TemporalPerformanceMatrix
            trades={data.trades}
            currencySymbol={currencySymbol}
          />
        )}

        {activeTab === "ATTRIBUTION" && data && (
          <MultiDimensionAttributionDesk
            strategyPerformance={data.strategyPerformance}
            instrumentPerformance={data.instrumentPerformance}
            assetClassPerformance={data.assetClassPerformance}
            currencySymbol={currencySymbol}
            onSelectFilter={(type, val) => {
              if (type === "strategy") handleFilterChange({ strategy: val });
              if (type === "asset") handleFilterChange({ assetClass: val as any });
              if (type === "symbol") handleFilterChange({ searchQuery: val });
              setActiveTab("JOURNAL");
            }}
          />
        )}

        {activeTab === "TAX" && data && (
          <TaxIntelligenceDesk
            trades={data.trades}
            summary={data.summary}
            currencySymbol={currencySymbol}
          />
        )}

        {activeTab === "LEDGER" && data && (
          <CapitalLedgerDesk
            events={data.capitalEvents}
            currencySymbol={currencySymbol}
            onAddEvent={handleAddCapitalEvent}
          />
        )}

        {activeTab === "RECONCILIATION" && data && (
          <BrokerReconciliationDesk
            reconciliations={data.reconciliations}
            currencySymbol={currencySymbol}
            onTriggerReconciliation={async (b) => {
              await handleRecalculate();
            }}
          />
        )}

        {activeTab === "RISK" && data && (
          <RiskDeskView
            summary={data.summary}
            positions={data.positions}
            currencySymbol={currencySymbol}
          />
        )}
      </div>

      {/* 7. Slide-Over Trade Inspection Drawer */}
      <TradeDetailInspectionDrawer
        trade={selectedTrade}
        onClose={() => setSelectedTrade(null)}
        onSaveNotes={handleSaveNotes}
        currencySymbol={currencySymbol}
      />

      {/* 8. P&L Report Exporter Modal */}
      {data && (
        <PnlReportExporterModal
          isOpen={isExporterOpen}
          onClose={() => setIsExporterOpen(false)}
          trades={data.trades}
          summary={data.summary}
          calendarRecords={data.calendarRecords}
          capitalEvents={data.capitalEvents}
        />
      )}
    </div>
  );
};
