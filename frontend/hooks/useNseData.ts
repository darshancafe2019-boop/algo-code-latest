"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchNseQuote,
  fetchNseOptionChain,
  fetchNseMarketSummary,
  fetchNseDerivatives,
  fetchNseFiiDii,
  fetchNseHolidays,
  fetchNseCorporateActions,
  fetchNsePreMarket,
  fetchNseValuation,
  fetchNseOiQuadrants,
  fetchNseInsiderTrading,
  fetchNseResultsCalendar,
  fetchNseEtfs,
  fetchNseBotSignals,
  fetchNseCandles,
  fetchNseMasterSearch,
  executeNseTrade,
} from "@/lib/nseClient";
import { NseTradeExecutionPayload } from "@/types/nse";

export function useNseMarketSummary() {
  return useQuery({
    queryKey: ["nseMarketSummary"],
    queryFn: fetchNseMarketSummary,
    refetchInterval: 6000,
    staleTime: 4000,
  });
}

export function useNseQuote(symbol: string = "NIFTY") {
  return useQuery({
    queryKey: ["nseQuote", symbol],
    queryFn: () => fetchNseQuote(symbol),
    refetchInterval: 4000,
    staleTime: 2000,
    enabled: !!symbol,
  });
}

export function useNseOptionChain(symbol: string = "NIFTY", expiry: string = "", strikeCount: number = 20) {
  return useQuery({
    queryKey: ["nseOptionChain", symbol, expiry, strikeCount],
    queryFn: () => fetchNseOptionChain(symbol, expiry, strikeCount),
    refetchInterval: 5000,
    staleTime: 3000,
    enabled: !!symbol,
  });
}

export function useNseCandles(
  symbol: string = "NIFTY 50",
  exchange: "NSE" | "NFO" = "NSE",
  interval: string = "1d",
  days: number = 7,
  indicators: boolean = true
) {
  return useQuery({
    queryKey: ["nseCandles", symbol, exchange, interval, days, indicators],
    queryFn: () => fetchNseCandles(symbol, exchange, interval, days, indicators),
    refetchInterval: interval.includes("m") ? 5000 : 30000,
    staleTime: interval.includes("m") ? 3000 : 15000,
    enabled: !!symbol,
  });
}

export function useNseMasterSearch(query: string = "NIFTY", exchange: "NSE" | "NFO" = "NSE", match: boolean = false) {
  return useQuery({
    queryKey: ["nseMasterSearch", query, exchange, match],
    queryFn: () => fetchNseMasterSearch(query, exchange, match),
    staleTime: 60000,
    enabled: query.length >= 2,
  });
}

export function useNseDerivatives() {
  return useQuery({
    queryKey: ["nseDerivatives"],
    queryFn: fetchNseDerivatives,
    refetchInterval: 10000,
    staleTime: 6000,
  });
}

export function useNseOiQuadrants() {
  return useQuery({
    queryKey: ["nseOiQuadrants"],
    queryFn: fetchNseOiQuadrants,
    refetchInterval: 10000,
    staleTime: 6000,
  });
}

export function useNseValuation() {
  return useQuery({
    queryKey: ["nseValuation"],
    queryFn: fetchNseValuation,
    staleTime: 300000,
  });
}

export function useNsePreMarket(category: string = "All") {
  return useQuery({
    queryKey: ["nsePreMarket", category],
    queryFn: () => fetchNsePreMarket(category),
    refetchInterval: 15000,
    staleTime: 10000,
  });
}

export function useNseFiiDii() {
  return useQuery({
    queryKey: ["nseFiiDii"],
    queryFn: fetchNseFiiDii,
    refetchInterval: 30000,
    staleTime: 20000,
  });
}

export function useNseHolidays() {
  return useQuery({
    queryKey: ["nseHolidays"],
    queryFn: fetchNseHolidays,
    staleTime: 3600000,
  });
}

export function useNseCorporateActions() {
  return useQuery({
    queryKey: ["nseCorporateActions"],
    queryFn: fetchNseCorporateActions,
    staleTime: 60000,
  });
}

export function useNseInsiderTrading() {
  return useQuery({
    queryKey: ["nseInsiderTrading"],
    queryFn: fetchNseInsiderTrading,
    staleTime: 60000,
  });
}

export function useNseResultsCalendar() {
  return useQuery({
    queryKey: ["nseResultsCalendar"],
    queryFn: fetchNseResultsCalendar,
    staleTime: 60000,
  });
}

export function useNseEtfs() {
  return useQuery({
    queryKey: ["nseEtfs"],
    queryFn: fetchNseEtfs,
    staleTime: 60000,
  });
}

export function useNseBotSignals(symbol: string = "NIFTY") {
  return useQuery({
    queryKey: ["nseBotSignals", symbol],
    queryFn: () => fetchNseBotSignals(symbol),
    refetchInterval: 5000,
    staleTime: 3000,
    enabled: !!symbol,
  });
}

export function useNseTradeExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: NseTradeExecutionPayload) => executeNseTrade(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["portfolioSnapshot"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["trades"] });
    },
  });
}
