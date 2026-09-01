/**
 * Futures Universe Zustand State Store
 * ====================================
 * Manages active contract selection, leverage, margin mode, filters,
 * and drawer visibility.
 */

import { create } from "zustand";
import { CanonicalFuturesContract, MarginMode } from "../types/futures";

interface FuturesStoreState {
  activeTab: "UNIVERSE" | "HEATMAP" | "BASIS" | "CALCULATOR";
  selectedContract: CanonicalFuturesContract | null;
  selectedVenue: string;
  selectedCategory: string;
  searchQuery: string;
  leverage: number;
  marginMode: MarginMode;
  isDetailsDrawerOpen: boolean;
  orderSide: "BUY" | "SELL";

  setActiveTab: (tab: "UNIVERSE" | "HEATMAP" | "BASIS" | "CALCULATOR") => void;
  setSelectedContract: (contract: CanonicalFuturesContract | null) => void;
  setSelectedVenue: (venue: string) => void;
  setSelectedCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setLeverage: (leverage: number) => void;
  setMarginMode: (mode: MarginMode) => void;
  setDetailsDrawerOpen: (open: boolean) => void;
  setOrderSide: (side: "BUY" | "SELL") => void;
}

export const useFuturesStore = create<FuturesStoreState>((set) => ({
  activeTab: "UNIVERSE",
  selectedContract: null,
  selectedVenue: "ALL",
  selectedCategory: "ALL",
  searchQuery: "",
  leverage: 10,
  marginMode: "ISOLATED",
  isDetailsDrawerOpen: false,
  orderSide: "BUY",

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedContract: (contract) => set({ selectedContract: contract }),
  setSelectedVenue: (venue) => set({ selectedVenue: venue }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLeverage: (leverage) => set({ leverage }),
  setMarginMode: (marginMode) => set({ marginMode }),
  setDetailsDrawerOpen: (isDetailsDrawerOpen) => set({ isDetailsDrawerOpen }),
  setOrderSide: (orderSide) => set({ orderSide }),
}));
