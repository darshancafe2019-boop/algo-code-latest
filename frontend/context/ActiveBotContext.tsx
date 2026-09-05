"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

export interface BotInstance {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  strategy: string;
  allocated_capital: number;
  execution_mode: "PAPER" | "LIVE" | "TEST";
  status: "RUNNING" | "PAUSED" | "STOPPED" | "ERROR" | "HALTED";
  risk_profile?: string;
  created_at?: string;
  last_heartbeat?: string;
}

interface ActiveBotContextType {
  activeBot: BotInstance | null;
  bots: BotInstance[];
  isLoadingBots: boolean;
  isStale: boolean;
  activeSymbol: string;
  activeTimeframe: string;
  activeStrategy: string;
  setActiveBotId: (id: string) => void;
  setActiveSymbol: (symbol: string) => void;
  setActiveTimeframe: (timeframe: string) => void;
  setActiveStrategy: (strategy: string) => void;
  refreshBots: () => void;
}

const ActiveBotContext = createContext<ActiveBotContextType | undefined>(undefined);

export function ActiveBotProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [activeBotId, setActiveBotIdState] = useState<string | null>(null);
  const [activeSymbol, setActiveSymbolState] = useState<string>("BTC/USDT");
  const [activeTimeframe, setActiveTimeframeState] = useState<string>("15m");
  const [activeStrategy, setActiveStrategyState] = useState<string>("EMA_MACD_VP");

  // Hydrate from localStorage once on client mount
  useEffect(() => {
    try {
      const savedBotId = localStorage.getItem("active_bot_id");
      if (savedBotId) setActiveBotIdState(savedBotId);

      const savedSymbol = localStorage.getItem("active_symbol");
      if (savedSymbol) setActiveSymbolState(savedSymbol);

      const savedTimeframe = localStorage.getItem("active_timeframe");
      if (savedTimeframe) setActiveTimeframeState(savedTimeframe);

      const savedStrategy = localStorage.getItem("active_strategy");
      if (savedStrategy) setActiveStrategyState(savedStrategy);
    } catch (e) {
      console.warn("Could not read from localStorage:", e);
    }
  }, []);

  const {
    data: botsData,
    isLoading: isLoadingBots,
    refetch: refreshBots,
    isPlaceholderData,
    error,
  } = useQuery({
    queryKey: ["botsList"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/bots", { timeoutMs: 6000 });
      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to fetch bots");
      }
      const json = res.data || {};
      const list = json.bots || json.data || (Array.isArray(json) ? json : []);
      return (Array.isArray(list) ? list : []) as BotInstance[];
    },
    enabled: !!isAuthenticated,
    staleTime: 6000,
    refetchInterval: isAuthenticated ? 10000 : false,
    placeholderData: (prev) => prev, // Never replace valid data with empty/zero on transient network error
  });

  const bots: BotInstance[] = Array.isArray(botsData) ? botsData : [];

  // Default active bot resolution
  const activeBot = bots.length > 0 ? (bots.find((b) => b && b.id === activeBotId) || bots[0]) : null;

  useEffect(() => {
    if (activeBot) {
      if (!activeBotId || activeBot.id !== activeBotId) {
        setActiveBotIdState(activeBot.id);
        if (typeof window !== "undefined") {
          localStorage.setItem("active_bot_id", activeBot.id);
        }
      }
      if (activeBot.symbol && activeBot.symbol !== activeSymbol) {
        setActiveSymbolState(activeBot.symbol);
      }
      if (activeBot.timeframe && activeBot.timeframe !== activeTimeframe) {
        setActiveTimeframeState(activeBot.timeframe);
      }
      if (activeBot.strategy && activeBot.strategy !== activeStrategy) {
        setActiveStrategyState(activeBot.strategy);
      }
    }
  }, [activeBot, activeBotId, activeSymbol, activeTimeframe, activeStrategy]);

  const setActiveBotId = useCallback((id: string) => {
    setActiveBotIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("active_bot_id", id);
    }
    const found = Array.isArray(bots) ? bots.find((b) => b && b.id === id) : undefined;
    if (found) {
      setActiveSymbolState(found.symbol);
      setActiveTimeframeState(found.timeframe);
      setActiveStrategyState(found.strategy);
      if (typeof window !== "undefined") {
        localStorage.setItem("active_symbol", found.symbol);
        localStorage.setItem("active_timeframe", found.timeframe);
        localStorage.setItem("active_strategy", found.strategy);
      }
    }
  }, [bots]);

  const setActiveSymbol = useCallback((symbol: string) => {
    setActiveSymbolState(symbol);
    if (typeof window !== "undefined") {
      localStorage.setItem("active_symbol", symbol);
    }
  }, []);

  const setActiveTimeframe = useCallback((timeframe: string) => {
    setActiveTimeframeState(timeframe);
    if (typeof window !== "undefined") {
      localStorage.setItem("active_timeframe", timeframe);
    }
  }, []);

  const setActiveStrategy = useCallback((strategy: string) => {
    setActiveStrategyState(strategy);
    if (typeof window !== "undefined") {
      localStorage.setItem("active_strategy", strategy);
    }
  }, []);

  const isStale = isPlaceholderData || !!error;

  const value: ActiveBotContextType = React.useMemo(() => ({
    activeBot,
    bots,
    isLoadingBots,
    isStale,
    activeSymbol,
    activeTimeframe,
    activeStrategy,
    setActiveBotId,
    setActiveSymbol,
    setActiveTimeframe,
    setActiveStrategy,
    refreshBots,
  }), [
    activeBot,
    bots,
    isLoadingBots,
    isStale,
    activeSymbol,
    activeTimeframe,
    activeStrategy,
    setActiveBotId,
    setActiveSymbol,
    setActiveTimeframe,
    setActiveStrategy,
    refreshBots,
  ]);

  return (
    <ActiveBotContext.Provider value={value}>
      {children}
    </ActiveBotContext.Provider>
  );
}

export function useActiveBot() {
  const context = useContext(ActiveBotContext);
  if (!context) {
    throw new Error("useActiveBot must be used within an ActiveBotProvider");
  }
  return context;
}
