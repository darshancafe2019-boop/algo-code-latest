/**
 * Hook for Live Quote Stream & Stock Deep-Dive
 * ============================================
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { globalStockStreamClient } from "../api/stocks-stream";
import {
  fetchStockDetail,
  fetchStockFundamentals,
  fetchStockAnalysis,
} from "../api/stocks-api";
import { StockQuoteRow } from "../types/stocks";

export function useStockStream() {
  const [liveTicks, setLiveTicks] = useState<Record<string, Partial<StockQuoteRow>>>({});

  useEffect(() => {
    const unsub = globalStockStreamClient.subscribe((quotes) => {
      const map: Record<string, Partial<StockQuoteRow>> = {};
      for (const q of quotes) {
        map[q.instrument_id] = q;
      }
      setLiveTicks((prev) => ({ ...prev, ...map }));
    });
    return () => unsub();
  }, []);

  return { liveTicks };
}

export function useStockDetails(instrumentId: string | null, symbol: string | null) {
  const isEnabled = !!instrumentId && !!symbol;

  const detailQuery = useQuery({
    queryKey: ["stockDetail", instrumentId],
    queryFn: () => fetchStockDetail(instrumentId!),
    enabled: isEnabled,
    staleTime: 60000,
  });

  const fundamentalsQuery = useQuery({
    queryKey: ["stockFundamentals", instrumentId],
    queryFn: () => fetchStockFundamentals(instrumentId!),
    enabled: isEnabled,
    staleTime: 300000,
  });

  const analysisQuery = useQuery({
    queryKey: ["stockAnalysis", instrumentId, "1d"],
    queryFn: () => fetchStockAnalysis(instrumentId!, "1d"),
    enabled: isEnabled,
    staleTime: 15000,
  });

  return {
    instrument: detailQuery.data?.data,
    fundamentals: fundamentalsQuery.data?.data,
    analysis: analysisQuery.data?.data,
    isLoading: detailQuery.isLoading || analysisQuery.isLoading,
  };
}
