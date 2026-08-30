/**
 * React Query Hook for Stock Screener
 * ===================================
 */

import { useQuery } from "@tanstack/react-query";
import { fetchStocks, fetchFavorites } from "../api/stocks-api";
import { useStocksStore } from "../state/stocks-store";
import { useEffect } from "react";

export function useStocks() {
  const { filters, setFavorites } = useStocksStore();

  const query = useQuery({
    queryKey: ["stocksList", filters],
    queryFn: () => fetchStocks(filters),
    staleTime: 5000,
    refetchInterval: 10000,
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
  };
}
