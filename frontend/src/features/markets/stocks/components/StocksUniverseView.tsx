"use client";

import React, { useMemo } from "react";
import { useStocks } from "../hooks/use-stocks";
import { useStockFilters } from "../hooks/use-stock-filters";
import { useStocksStore } from "../state/stocks-store";
import { StocksHeader } from "./StocksHeader";
import { StocksToolbar } from "./StocksToolbar";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { StocksTable } from "./StocksTable";
import { StockDetailsDrawer } from "./StockDetailsDrawer";
import { StockFiltersDrawer } from "./StockFiltersDrawer";

export const StocksUniverseView: React.FC = () => {
  const { stocks, meta, isLoading, isError, refetch } = useStocks();
  const { filters } = useStockFilters();
  const { selectedStock, setSelectedStock } = useStocksStore();

  // Compute active non-default filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.country && filters.country !== "ALL") count++;
    if (filters.exchange && filters.exchange !== "ALL") count++;
    if (filters.sector && filters.sector !== "ALL") count++;
    if (filters.price_direction) count++;
    if (filters.min_change_pct !== undefined) count++;
    if (filters.min_relative_volume !== undefined) count++;
    if (filters.directional_bias) count++;
    if (filters.min_score !== undefined) count++;
    return count;
  }, [filters]);

  return (
    <div className="space-y-4">
      {/* 1. KPI & System Status Banner */}
      <StocksHeader
        totalCount={meta?.total || stocks.length}
        liveCount={stocks.filter((s) => s.data_quality === "LIVE").length}
        providerCount={3}
        lastUpdated={meta?.receivedTimestamp}
        isLoading={isLoading}
        onRefresh={() => refetch()}
      />

      {/* 2. Market Switcher & Controls */}
      <StocksToolbar activeFilterCount={activeFilterCount} />

      {/* 3. Active Filters Pills */}
      <ActiveFilterChips />

      {/* 4. Table & Conditional Details Drawer */}
      <div className="flex flex-col lg:flex-row items-start gap-4">
        <div className="flex-1 w-full min-w-0">
          <StocksTable
            stocks={stocks}
            total={meta?.total || stocks.length}
            page={filters.page}
            pageSize={filters.page_size}
            isLoading={isLoading}
            isError={isError}
            onRefresh={() => refetch()}
          />
        </div>

        {selectedStock && (
          <StockDetailsDrawer
            stock={selectedStock}
            onClose={() => setSelectedStock(null)}
          />
        )}
      </div>

      {/* 5. Filter Slide-out Drawer */}
      <StockFiltersDrawer totalMatching={meta?.total || stocks.length} />
    </div>
  );
};
