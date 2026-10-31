import { create } from "zustand";

export interface DashboardFilterState {
  isFilterOpen: boolean;
  searchQuery: string;
  instantApply: boolean;

  // 1. Market Filters
  exchange: "ALL" | "NSE" | "BSE" | "MCX" | "CRYPTO";
  segment: "ALL" | "EQUITY" | "FUTURES" | "OPTIONS";
  instrumentType: "ALL" | "SPOT" | "FUTURE" | "OPTION" | "INDEX";
  symbolQuery: string;
  optionType: "ALL" | "CE" | "PE";
  expiry: string;

  // 2. Scanner Filters
  scannerCategory: "ALL" | "gainers" | "losers" | "volume" | "oi_gainers" | "breakout" | "momentum";
  minPctMove: number;

  // 3. Technical Filters
  technicalConfluence: "ALL" | "EMA_BULLISH" | "EMA_BEARISH" | "RSI_OVERSOLD" | "RSI_OVERBOUGHT" | "VWAP_ABOVE" | "MACD_CROSS";

  // 4. Trading Filters
  tradingMode: "PAPER" | "LIVE";
  botStatus: "ALL" | "RUNNING" | "PAUSED" | "STOPPED";
  positionStatus: "ALL" | "PROFIT" | "LOSS";

  // Actions
  setFilterOpen: (open: boolean) => void;
  toggleFilterOpen: () => void;
  setSearchQuery: (query: string) => void;
  setInstantApply: (val: boolean) => void;
  setExchange: (ex: "ALL" | "NSE" | "BSE" | "MCX" | "CRYPTO") => void;
  setSegment: (seg: "ALL" | "EQUITY" | "FUTURES" | "OPTIONS") => void;
  setScannerCategory: (cat: "ALL" | "gainers" | "losers" | "volume" | "oi_gainers" | "breakout" | "momentum") => void;
  setMinPctMove: (pct: number) => void;
  setOptionType: (opt: "ALL" | "CE" | "PE") => void;
  setTechnicalConfluence: (tech: "ALL" | "EMA_BULLISH" | "EMA_BEARISH" | "RSI_OVERSOLD" | "RSI_OVERBOUGHT" | "VWAP_ABOVE" | "MACD_CROSS") => void;
  setBotStatus: (st: "ALL" | "RUNNING" | "PAUSED" | "STOPPED") => void;
  setPositionStatus: (st: "ALL" | "PROFIT" | "LOSS") => void;
  applyPreset: (preset: "MOMENTUM" | "BREAKOUT" | "REVERSION" | "OPTIONS_FLOW") => void;
  resetFilters: () => void;
  getActiveFiltersCount: () => number;
}

const DEFAULT_FILTERS = {
  isFilterOpen: false,
  searchQuery: "",
  instantApply: true,
  exchange: "ALL" as const,
  segment: "ALL" as const,
  instrumentType: "ALL" as const,
  symbolQuery: "",
  optionType: "ALL" as const,
  expiry: "",
  scannerCategory: "ALL" as const,
  minPctMove: 3.0,
  technicalConfluence: "ALL" as const,
  tradingMode: "PAPER" as const,
  botStatus: "ALL" as const,
  positionStatus: "ALL" as const,
};

export const useDashboardFilterStore = create<DashboardFilterState>((set, get) => ({
  ...DEFAULT_FILTERS,

  setFilterOpen: (open) => set({ isFilterOpen: open }),
  toggleFilterOpen: () => set((state) => ({ isFilterOpen: !state.isFilterOpen })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setInstantApply: (instantApply) => set({ instantApply }),
  setExchange: (exchange) => set({ exchange }),
  setSegment: (segment) => set({ segment }),
  setScannerCategory: (scannerCategory) => set({ scannerCategory }),
  setMinPctMove: (minPctMove) => set({ minPctMove }),
  setOptionType: (optionType) => set({ optionType }),
  setTechnicalConfluence: (technicalConfluence) => set({ technicalConfluence }),
  setBotStatus: (botStatus) => set({ botStatus }),
  setPositionStatus: (positionStatus) => set({ positionStatus }),

  applyPreset: (preset) => {
    if (preset === "MOMENTUM") {
      set({
        scannerCategory: "momentum",
        minPctMove: 3.0,
        technicalConfluence: "EMA_BULLISH",
      });
    } else if (preset === "BREAKOUT") {
      set({
        scannerCategory: "breakout",
        minPctMove: 2.5,
        technicalConfluence: "VWAP_ABOVE",
      });
    } else if (preset === "REVERSION") {
      set({
        scannerCategory: "losers",
        minPctMove: 3.0,
        technicalConfluence: "RSI_OVERSOLD",
      });
    } else if (preset === "OPTIONS_FLOW") {
      set({
        segment: "OPTIONS",
        scannerCategory: "oi_gainers",
        optionType: "CE",
      });
    }
  },

  resetFilters: () =>
    set({
      searchQuery: "",
      exchange: "ALL",
      segment: "ALL",
      instrumentType: "ALL",
      symbolQuery: "",
      optionType: "ALL",
      expiry: "",
      scannerCategory: "ALL",
      minPctMove: 3.0,
      technicalConfluence: "ALL",
      botStatus: "ALL",
      positionStatus: "ALL",
    }),

  getActiveFiltersCount: () => {
    const s = get();
    let count = 0;
    if (s.exchange !== "ALL") count++;
    if (s.segment !== "ALL") count++;
    if (s.instrumentType !== "ALL") count++;
    if (s.optionType !== "ALL") count++;
    if (s.scannerCategory !== "ALL") count++;
    if (s.technicalConfluence !== "ALL") count++;
    if (s.botStatus !== "ALL") count++;
    if (s.positionStatus !== "ALL") count++;
    if (s.searchQuery.trim().length > 0) count++;
    return count;
  },
}));

