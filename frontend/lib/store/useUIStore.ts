import { create } from "zustand";

interface UIState {
  activeWorkspace: string;
  activeSymbol: string;
  activeTimeframe: string;
  isMobileCommandSheetOpen: boolean;
  isOrderPlacementModalOpen: boolean;
  isCreateBotModalOpen: boolean;
  isEmergencyStopModalOpen: boolean;
  chartType: "candles" | "line" | "area";
  activeIndicators: string[];
  quickOrderSide: "BUY" | "SELL";
  interfaceMode: "SIMPLE" | "ADVANCED";
  isAICopilotOpen: boolean;
  isMarketSwitcherOpen: boolean;
  copilotTargetMarket: string;
  
  setActiveWorkspace: (workspace: string) => void;
  setActiveSymbol: (symbol: string) => void;
  setActiveTimeframe: (timeframe: string) => void;
  setMobileCommandSheetOpen: (open: boolean) => void;
  setOrderPlacementModalOpen: (open: boolean) => void;
  setCreateBotModalOpen: (open: boolean) => void;
  setEmergencyStopModalOpen: (open: boolean) => void;
  setChartType: (type: "candles" | "line" | "area") => void;
  toggleIndicator: (indicatorId: string) => void;
  setQuickOrderSide: (side: "BUY" | "SELL") => void;
  setInterfaceMode: (mode: "SIMPLE" | "ADVANCED") => void;
  toggleInterfaceMode: () => void;
  setAICopilotOpen: (open: boolean) => void;
  setMarketSwitcherOpen: (open: boolean) => void;
  setCopilotTargetMarket: (market: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeWorkspace: "home",
  activeSymbol: "BTC/USDT",
  activeTimeframe: "5m",
  isMobileCommandSheetOpen: false,
  isOrderPlacementModalOpen: false,
  isCreateBotModalOpen: false,
  isEmergencyStopModalOpen: false,
  chartType: "candles",
  activeIndicators: ["EMA_20", "RSI_14", "VOLUME_PROFILE"],
  quickOrderSide: "BUY",
  interfaceMode: "SIMPLE",
  isAICopilotOpen: false,
  isMarketSwitcherOpen: false,
  copilotTargetMarket: "ALL",

  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  setActiveSymbol: (symbol) => set({ activeSymbol: symbol.toUpperCase().trim() }),
  setActiveTimeframe: (timeframe) => set({ activeTimeframe: timeframe }),
  setMobileCommandSheetOpen: (open) => set({ isMobileCommandSheetOpen: open }),
  setOrderPlacementModalOpen: (open) => set({ isOrderPlacementModalOpen: open }),
  setCreateBotModalOpen: (open) => set({ isCreateBotModalOpen: open }),
  setEmergencyStopModalOpen: (open) => set({ isEmergencyStopModalOpen: open }),
  setChartType: (chartType) => set({ chartType }),
  toggleIndicator: (indicatorId) =>
    set((state) => ({
      activeIndicators: state.activeIndicators.includes(indicatorId)
        ? state.activeIndicators.filter((id) => id !== indicatorId)
        : [...state.activeIndicators, indicatorId],
    })),
  setQuickOrderSide: (side) => set({ quickOrderSide: side }),
  setInterfaceMode: (interfaceMode) => set({ interfaceMode }),
  toggleInterfaceMode: () =>
    set((state) => ({
      interfaceMode: state.interfaceMode === "SIMPLE" ? "ADVANCED" : "SIMPLE",
    })),
  setAICopilotOpen: (open) => set({ isAICopilotOpen: open }),
  setMarketSwitcherOpen: (open) => set({ isMarketSwitcherOpen: open }),
  setCopilotTargetMarket: (market) => set({ copilotTargetMarket: market }),
}));
