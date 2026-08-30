"use client";

import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { StockQuoteRow } from "../types/stocks";
import { useStocksStore, ColumnConfig } from "../state/stocks-store";
import { StockRow } from "./StockRow";
import { EmptyErrorStates } from "./EmptyErrorStates";
import { toggleFavoriteStock } from "../api/stocks-api";

interface StocksTableProps {
  stocks: StockQuoteRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  isError: boolean;
  onRefresh?: () => void;
}

export const StocksTable: React.FC<StocksTableProps> = ({
  stocks,
  total,
  page,
  pageSize,
  isLoading,
  isError,
  onRefresh,
}) => {
  const {
    filters,
    setFilters,
    columns,
    selectedStock,
    setSelectedStock,
    toggleFavoriteLocal,
  } = useStocksStore();

  const handleSort = (columnId: string) => {
    if (filters.sort_by === columnId) {
      setFilters({
        sort_direction: filters.sort_direction === "asc" ? "desc" : "asc",
        page: 1,
      });
    } else {
      setFilters({ sort_by: columnId, sort_direction: "desc", page: 1 });
    }
  };

  const handleToggleFavorite = async (stock: StockQuoteRow) => {
    toggleFavoriteLocal(stock.instrument_id);
    try {
      await toggleFavoriteStock(stock.instrument_id, stock.symbol, stock.exchange);
    } catch {
      // Revert if error
      toggleFavoriteLocal(stock.instrument_id);
    }
  };

  const renderSortIcon = (columnId: string) => {
    if (filters.sort_by !== columnId) {
      return <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-slate-400 ml-1 inline" />;
    }
    return filters.sort_direction === "asc" ? (
      <ArrowUp className="w-3 h-3 text-cyan-400 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-cyan-400 ml-1 inline" />
    );
  };

  const colVisible = (id: string) => columns.find((c) => c.id === id)?.visible !== false;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-3">
      {/* Table Surface */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            {/* Header */}
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 font-mono text-[11px] uppercase tracking-wider text-slate-400 select-none">
                {colVisible("favorite") && <th className="py-3 px-3 text-center w-10">★</th>}
                {colVisible("symbol") && (
                  <th className="py-3 px-3 cursor-pointer group" onClick={() => handleSort("symbol")}>
                    <span>Symbol</span>
                    {renderSortIcon("symbol")}
                  </th>
                )}
                {colVisible("exchange") && (
                  <th className="py-3 px-3 cursor-pointer group" onClick={() => handleSort("exchange")}>
                    <span>Exchange</span>
                    {renderSortIcon("exchange")}
                  </th>
                )}
                {colVisible("price") && (
                  <th className="py-3 px-3 text-right cursor-pointer group" onClick={() => handleSort("last_price")}>
                    <span>Price</span>
                    {renderSortIcon("last_price")}
                  </th>
                )}
                {colVisible("change_pct") && (
                  <th className="py-3 px-3 text-right cursor-pointer group" onClick={() => handleSort("change_pct")}>
                    <span>24h %</span>
                    {renderSortIcon("change_pct")}
                  </th>
                )}
                {colVisible("volume") && (
                  <th className="py-3 px-3 text-right cursor-pointer group" onClick={() => handleSort("volume_shares")}>
                    <span>Volume</span>
                    {renderSortIcon("volume_shares")}
                  </th>
                )}
                {colVisible("relative_volume") && (
                  <th className="py-3 px-3 text-right cursor-pointer group" onClick={() => handleSort("relative_volume")}>
                    <span>Rel Vol</span>
                    {renderSortIcon("relative_volume")}
                  </th>
                )}
                {colVisible("market_cap") && <th className="py-3 px-3 text-right">Market Cap</th>}
                {colVisible("pe_ratio") && (
                  <th className="py-3 px-3 text-right cursor-pointer group" onClick={() => handleSort("pe_ratio")}>
                    <span>P/E</span>
                    {renderSortIcon("pe_ratio")}
                  </th>
                )}
                {colVisible("rsi") && (
                  <th className="py-3 px-3 text-right cursor-pointer group" onClick={() => handleSort("rsi_14")}>
                    <span>RSI</span>
                    {renderSortIcon("rsi_14")}
                  </th>
                )}
                {colVisible("trend") && (
                  <th className="py-3 px-3 text-center cursor-pointer group" onClick={() => handleSort("overall_score")}>
                    <span>Trend</span>
                    {renderSortIcon("overall_score")}
                  </th>
                )}
                {colVisible("status") && <th className="py-3 px-3 text-center">Status</th>}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {isLoading ? (
                // Loading Skeleton Rows
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-slate-800/40 animate-pulse">
                    <td className="py-4 px-3" colSpan={columns.filter((c) => c.visible).length}>
                      <div className="h-4 bg-slate-800/50 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={columns.filter((c) => c.visible).length} className="p-4">
                    <EmptyErrorStates type="error" onRetry={onRefresh} />
                  </td>
                </tr>
              ) : stocks.length === 0 ? (
                <tr>
                  <td colSpan={columns.filter((c) => c.visible).length} className="p-4">
                    <EmptyErrorStates type="no_results" />
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => (
                  <StockRow
                    key={stock.instrument_id}
                    stock={stock}
                    columns={columns}
                    isSelected={selectedStock?.instrument_id === stock.instrument_id}
                    onSelect={setSelectedStock}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!isLoading && total > 0 && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-xs text-slate-400">
            <div>
              Showing <span className="text-white font-bold">{Math.min(total, (page - 1) * pageSize + 1)}</span> to{" "}
              <span className="text-white font-bold">{Math.min(total, page * pageSize)}</span> of{" "}
              <span className="text-cyan-400 font-bold">{total.toLocaleString()}</span> stocks
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setFilters({ page: page - 1 })}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 font-bold text-white">
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setFilters({ page: page + 1 })}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
