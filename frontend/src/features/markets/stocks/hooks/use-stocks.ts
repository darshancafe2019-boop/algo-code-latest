/**
 * React Query Hook for Stock Screener
 * ===================================
 */

import { useQuery } from "@tanstack/react-query";
import { fetchStocks, fetchFavorites } from "../api/stocks-api";
import { useStocksStore } from "../state/stocks-store";
import { useMarketGatewayContext } from "@/context/MarketGatewayContext";
import { useEffect } from "react";

export function useStocks() {
  const { filters, setFavorites } = useStocksStore();
  const { connectionStatus } = useMarketGatewayContext();

  const isWsConnected = connectionStatus === "CONNECTED" || connectionStatus === "LIVE";
  // When WebSocket is not connected, poll /api/market-data/stocks every 5s
  const pollInterval = isWsConnected ? false : 5000;

  const query = useQuery({
    queryKey: ["stocksList", filters],
    queryFn: () => fetchStocks(filters),
    staleTime: isWsConnected ? 15000 : 4000,
    refetchInterval: pollInterval,
  });

  const favoritesQuery = useQuery({
    queryKey: ["stockFavorites"],
    queryFn: fetchFavorites,
    staleTime: 30000,
  });

  useEffect(() => {
    if (favoritesQuery.data?.data) {
      setFavorites(favoritesQuery.data.data);
    }
  }, [favoritesQuery.data, setFavorites]);

  return {
    stocks: query.data?.data || [],
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isWsConnected,
    isPolling: !isWsConnected,
    connectionStatus,
  };
}
