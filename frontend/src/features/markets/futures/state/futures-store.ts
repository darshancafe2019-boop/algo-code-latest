/**
 * Futures Universe Zustand State Store
 * ====================================
 * Manages active contract selection, leverage, margin mode, filters,
 * provider sources, saved watchlists, and order review modal state.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CanonicalFuturesContract, MarginMode } from "../types/futures";

interface FuturesStoreState {
  activeTab: "UNIVERSE" | "HEATMAP" | "BASIS" | "CALCULATOR" | "STRATEGIES" | "HEALTH" | "SAVED" | "POSITIONS";
  selectedContract: CanonicalFuturesContract | null;
  selectedVenue: string;
  selectedSource: string;
  selectedAsset: string;
  selectedExpiry: string;
  searchQuery: string;
  leverage: number;
  marginMode: MarginMode;
  executionMode: "PAPER" | "SHADOW" | "LIVE";
  isDetailsDrawerOpen: boolean;
  isOrderReviewOpen: boolean;
  orderReviewContract: CanonicalFuturesContract | null;
  orderReviewSide: "BUY" | "SELL" | "LONG" | "SHORT";
  orderSide: "BUY" | "SELL";
  savedContractKeys: string[];
  compareSymbols: string[];

  setActiveTab: (tab: FuturesStoreState["activeTab"]) => void;
  setSelectedContract: (contract: CanonicalFuturesContract | null) => void;
  setSelectedVenue: (venue: string) => void;
  setSelectedSource: (source: string) => void;
  setSelectedAsset: (asset: string) => void;
  setSelectedExpiry: (expiry: string) => void;
  setSearchQuery: (query: string) => void;
  setLeverage: (leverage: number) => void;
  setMarginMode: (mode: MarginMode) => void;
  setExecutionMode: (mode: "PAPER" | "SHADOW" | "LIVE") => void;
  setDetailsDrawerOpen: (open: boolean) => void;
  setOrderReviewOpen: (open: boolean, contract?: CanonicalFuturesContract | null, side?: "BUY" | "SELL" | "LONG" | "SHORT") => void;
  setOrderSide: (side: "BUY" | "SELL") => void;
  toggleSaveContract: (key: string) => void;
  toggleCompareSymbol: (symbol: string) => void;
}

export const useFuturesStore = create<FuturesStoreState>()(
  persist(
    (set) => ({
      activeTab: "UNIVERSE",
      selectedContract: null,
      selectedVenue: "ALL",
      selectedSource: "ALL",
      selectedAsset: "ALL",
      selectedExpiry: "ALL",
      searchQuery: "",
      leverage: 10,
      marginMode: "ISOLATED",
      executionMode: "PAPER",
      isDetailsDrawerOpen: false,
      isOrderReviewOpen: false,
      orderReviewContract: null,
      orderReviewSide: "BUY",
      orderSide: "BUY",
      savedContractKeys: ["BTC/USDT:USDT", "NIFTY-FUT", "ETH/USDT:USDT", "BANKNIFTY-FUT"],
      compareSymbols: ["BTC/USDT:USDT", "BTC-PERP"],

      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedContract: (contract) => set({ selectedContract: contract }),
      setSelectedVenue: (venue) => set({ selectedVenue: venue }),
      setSelectedSource: (selectedSource) => set({ selectedSource }),
      setSelectedAsset: (selectedAsset) => set({ selectedAsset }),
      setSelectedExpiry: (selectedExpiry) => set({ selectedExpiry }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setLeverage: (leverage) => set({ leverage }),
      setMarginMode: (marginMode) => set({ marginMode }),
      setExecutionMode: (executionMode) => set({ executionMode }),
      setDetailsDrawerOpen: (isDetailsDrawerOpen) => set({ isDetailsDrawerOpen }),
      setOrderReviewOpen: (open, contract = null, side = "BUY") =>
        set({
          isOrderReviewOpen: open,
          orderReviewContract: contract,
          orderReviewSide: side,
        }),
      setOrderSide: (orderSide) => set({ orderSide }),
      toggleSaveContract: (key) =>
        set((state) => ({
          savedContractKeys: state.savedContractKeys.includes(key)
            ? state.savedContractKeys.filter((k) => k !== key)
            : [...state.savedContractKeys, key],
        })),
      toggleCompareSymbol: (symbol) =>
        set((state) => ({
          compareSymbols: state.compareSymbols.includes(symbol)
            ? state.compareSymbols.filter((s) => s !== symbol)
            : [...state.compareSymbols, symbol],
        })),
    }),
    {
      name: "quantos_futures_store",
      partialize: (state) => ({
        savedContractKeys: state.savedContractKeys,
        selectedSource: state.selectedSource,
        selectedAsset: state.selectedAsset,
        executionMode: state.executionMode,
      }),
    }
  )
);
