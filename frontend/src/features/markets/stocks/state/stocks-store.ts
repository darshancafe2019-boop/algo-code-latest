/**
 * Stocks Feature State Management
 * ===============================
 * Zustand store managing filters, selected instrument, drawer state, and visible columns.
 */

import { create } from "zustand";
import { StockFilterState, StockQuoteRow } from "../types/stocks";
import { DEFAULT_STOCK_FILTERS } from "../utils/filter-serialization";

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean;
}

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "favorite", label: "Fav", visible: true, required: true },
  { id: "symbol", label: "Symbol & Company", visible: true, required: true },
  { id: "exchange", label: "Exchange", visible: true },
  { id: "price", label: "Price", visible: true, required: true },
  { id: "change_pct", label: "24h %", visible: true, required: true },
  { id: "volume", label: "Volume", visible: true },
  { id: "relative_volume", label: "Rel Vol", visible: true },
  { id: "market_cap", label: "Market Cap", visible: true },
  { id: "pe_ratio", label: "P/E", visible: false },
  { id: "rsi", label: "RSI(14)", visible: false },
  { id: "trend", label: "Trend", visible: true },
  { id: "status", label: "Status", visible: true },
];

interface StocksStore {
  filters: StockFilterState;
  selectedStock: StockQuoteRow | null;
  isFilterDrawerOpen: boolean;
  isColumnManagerOpen: boolean;
  columns: ColumnConfig[];
  favorites: Set<string>;
  activePreset: string | null;

  // Actions
  setFilters: (filters: Partial<StockFilterState>) => void;
  resetFilters: () => void;
  setSelectedStock: (stock: StockQuoteRow | null) => void;
  setFilterDrawerOpen: (open: boolean) => void;
  setColumnManagerOpen: (open: boolean) => void;
  toggleColumn: (columnId: string) => void;
  setFavorites: (ids: string[]) => void;
  toggleFavoriteLocal: (instrumentId: string) => void;
  setActivePreset: (presetId: string | null) => void;
}

export const useStocksStore = create<StocksStore>((set) => ({
  filters: { ...DEFAULT_STOCK_FILTERS },
  selectedStock: null,
  isFilterDrawerOpen: false,
  isColumnManagerOpen: false,
  columns: [...DEFAULT_COLUMNS],
  favorites: new Set<string>(),
  activePreset: null,

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters, page: newFilters.page ?? 1 },
    })),

  resetFilters: () =>
    set({
      filters: { ...DEFAULT_STOCK_FILTERS },
      activePreset: null,
    }),

  setSelectedStock: (stock) => set({ selectedStock: stock }),
  setFilterDrawerOpen: (open) => set({ isFilterDrawerOpen: open }),
  setColumnManagerOpen: (open) => set({ isColumnManagerOpen: open }),

  toggleColumn: (colId) =>
    set((state) => ({
      columns: state.columns.map((c) =>
        c.id === colId && !c.required ? { ...c, visible: !c.visible } : c
      ),
    })),

  setFavorites: (ids) => set({ favorites: new Set(ids) }),

  toggleFavoriteLocal: (instrumentId) =>
    set((state) => {
      const next = new Set(state.favorites);
      if (next.has(instrumentId)) {
        next.delete(instrumentId);
      } else {
        next.add(instrumentId);
      }
      return { favorites: next };
    }),

  setActivePreset: (presetId) => set({ activePreset: presetId }),
}));
