import { create } from "zustand";
import { BotConfig, BotSnapshot } from "@/types/bot";
import { CanonicalOrder } from "@/types/order";
import { CanonicalPosition } from "@/types/position";

interface BotStoreState {
  bots: BotConfig[];
  selectedBotId: string | null;
  activeSnapshot: BotSnapshot | null;
  allOrders: CanonicalOrder[];
  allPositions: CanonicalPosition[];
  globalKillSwitch: string;
  wsConnected: boolean;
  
  setBots: (bots: BotConfig[]) => void;
  setSelectedBotId: (id: string | null) => void;
  setActiveSnapshot: (snapshot: BotSnapshot | null) => void;
  setAllOrders: (orders: CanonicalOrder[]) => void;
  setAllPositions: (positions: CanonicalPosition[]) => void;
  setGlobalKillSwitch: (status: string) => void;
  setWsConnected: (connected: boolean) => void;
  updateBotInList: (bot: BotConfig) => void;
}

export const useBotStore = create<BotStoreState>((set) => ({
  bots: [],
  selectedBotId: null,
  activeSnapshot: null,
  allOrders: [],
  allPositions: [],
  globalKillSwitch: "ARMED",
  wsConnected: false,

  setBots: (bots) => set({ bots }),
  setSelectedBotId: (selectedBotId) => set({ selectedBotId }),
  setActiveSnapshot: (activeSnapshot) => set({ activeSnapshot }),
  setAllOrders: (allOrders) => set({ allOrders }),
  setAllPositions: (allPositions) => set({ allPositions }),
  setGlobalKillSwitch: (globalKillSwitch) => set({ globalKillSwitch }),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  updateBotInList: (updatedBot) =>
    set((state) => ({
      bots: state.bots.map((b) => (b.id === updatedBot.id ? updatedBot : b)),
    })),
}));
